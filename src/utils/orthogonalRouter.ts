import { Wire, WirePoint } from '../types/circuit';

export interface Point {
  x: number;
  y: number;
}

export interface HorizontalSegment {
  wireId: string;
  y: number;
  minX: number;
  maxX: number;
}

// Global registry of active rendered horizontal segments across all wires
class LiveWireSegmentRegistry {
  private segments = new Map<string, HorizontalSegment[]>();

  public register(wireId: string, waypoints: Point[]) {
    if (!wireId) return;
    const segs = extractHorizontalSegments(wireId, waypoints);
    this.segments.set(wireId, segs);
  }

  public unregister(wireId: string) {
    this.segments.delete(wireId);
  }

  public clear() {
    this.segments.clear();
  }

  public getAllSegments(excludeWireId?: string): HorizontalSegment[] {
    const all: HorizontalSegment[] = [];
    this.segments.forEach((segs, id) => {
      if (!excludeWireId || id !== excludeWireId) {
        all.push(...segs);
      }
    });
    return all;
  }
}

export const liveWireRegistry = new LiveWireSegmentRegistry();

// Clean and simplify waypoints (ensure strict 90° orthogonality and remove collinear points)
export function cleanAndSimplifyWaypoints(rawPoints: Point[], tolerance = 3): Point[] {
  if (rawPoints.length <= 2) return rawPoints;

  // 1. Remove consecutive duplicates
  const deduped: Point[] = [rawPoints[0]!];
  for (let i = 1; i < rawPoints.length; i++) {
    const curr = rawPoints[i]!;
    const prev = deduped[deduped.length - 1]!;
    if (Math.abs(curr.x - prev.x) > tolerance || Math.abs(curr.y - prev.y) > tolerance) {
      deduped.push(curr);
    }
  }

  if (deduped.length <= 2) return deduped;

  // 2. Ensure strictly orthogonal (90°) steps
  const orthogonal: Point[] = [deduped[0]!];
  for (let i = 1; i < deduped.length; i++) {
    const prev = orthogonal[orthogonal.length - 1]!;
    const curr = deduped[i]!;

    const isH = Math.abs(prev.y - curr.y) <= 1.5;
    const isV = Math.abs(prev.x - curr.x) <= 1.5;

    if (isH) {
      orthogonal.push({ x: curr.x, y: prev.y });
    } else if (isV) {
      orthogonal.push({ x: prev.x, y: curr.y });
    } else {
      // Diagonal step: insert an orthogonal 90° corner
      orthogonal.push({ x: curr.x, y: prev.y });
      orthogonal.push(curr);
    }
  }

  // 3. Remove collinear points
  const simplified: Point[] = [orthogonal[0]!];
  for (let i = 1; i < orthogonal.length - 1; i++) {
    const prev = simplified[simplified.length - 1]!;
    const curr = orthogonal[i]!;
    const next = orthogonal[i + 1]!;

    const isCollinearH = Math.abs(prev.y - curr.y) < 1.5 && Math.abs(curr.y - next.y) < 1.5;
    const isCollinearV = Math.abs(prev.x - curr.x) < 1.5 && Math.abs(curr.x - next.x) < 1.5;

    if (!isCollinearH && !isCollinearV) {
      simplified.push(curr);
    }
  }
  simplified.push(orthogonal[orthogonal.length - 1]!);

  return simplified;
}

// Extract horizontal line segments for wire bridge collision detection
export function extractHorizontalSegments(wireId: string, waypoints: Point[]): HorizontalSegment[] {
  const clean = cleanAndSimplifyWaypoints(waypoints);
  const segments: HorizontalSegment[] = [];

  for (let i = 0; i < clean.length - 1; i++) {
    const p1 = clean[i]!;
    const p2 = clean[i + 1]!;

    if (Math.abs(p1.y - p2.y) <= 1.5) {
      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);
      if (maxX - minX >= 14) {
        segments.push({
          wireId,
          y: p1.y,
          minX,
          maxX,
        });
      }
    }
  }

  return segments;
}

// Generate rounded orthogonal path with electrical wire jump bridges (arc hops)
export function createRoundedOrthogonalPathWithJumps(
  points: Point[],
  crossSegments: HorizontalSegment[] = [],
  myWireId?: string,
  cornerRadius = 8,
  jumpRadius = 6
): { path: string; labelX: number; labelY: number } {
  const clean = cleanAndSimplifyWaypoints(points);
  if (clean.length < 2) return { path: '', labelX: 0, labelY: 0 };

  if (clean.length === 2) {
    const p1 = clean[0]!;
    const p2 = clean[1]!;
    const isV = Math.abs(p1.x - p2.x) <= 1.5;

    if (!isV || crossSegments.length === 0) {
      return {
        path: `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`,
        labelX: (p1.x + p2.x) / 2,
        labelY: (p1.y + p2.y) / 2,
      };
    }
  }

  const numSegments = clean.length - 1;

  // Precompute corner points for smooth fillet arcs
  const cornerIns: Point[] = [];
  const cornerOuts: Point[] = [];

  for (let i = 1; i < clean.length - 1; i++) {
    const prev = clean[i - 1]!;
    const curr = clean[i]!;
    const next = clean[i + 1]!;

    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const len1 = Math.hypot(v1x, v1y);

    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const len2 = Math.hypot(v2x, v2y);

    const r = Math.min(cornerRadius, len1 / 2, len2 / 2);

    if (r <= 0 || (v1x === 0 && v1y === 0) || (v2x === 0 && v2y === 0)) {
      cornerIns.push({ ...curr });
      cornerOuts.push({ ...curr });
    } else {
      cornerIns.push({
        x: curr.x - (v1x / len1) * r,
        y: curr.y - (v1y / len1) * r,
      });
      cornerOuts.push({
        x: curr.x + (v2x / len2) * r,
        y: curr.y + (v2y / len2) * r,
      });
    }
  }

  let path = `M ${clean[0]!.x} ${clean[0]!.y}`;

  for (let i = 0; i < numSegments; i++) {
    const startPoint = i === 0 ? clean[0]! : cornerOuts[i - 1]!;
    const endPoint = i === numSegments - 1 ? clean[clean.length - 1]! : cornerIns[i]!;

    const isV = Math.abs(startPoint.x - endPoint.x) <= 1.5;

    if (isV && crossSegments.length > 0) {
      const segX = startPoint.x;
      const minY = Math.min(startPoint.y, endPoint.y);
      const maxY = Math.max(startPoint.y, endPoint.y);
      const goingDown = startPoint.y < endPoint.y;

      const safeMargin = cornerRadius + jumpRadius + 2;

      // Find all intersecting horizontal segments from other wires
      const validJumps: number[] = [];
      crossSegments.forEach((cross) => {
        if (!cross.wireId || (myWireId && cross.wireId === myWireId)) return;

        // Strict geometric intersection: X falls inside horizontal span, and Y falls inside vertical span
        const isIntersectingX = segX > cross.minX + 6 && segX < cross.maxX - 6;
        const isIntersectingY = cross.y >= minY + safeMargin && cross.y <= maxY - safeMargin;

        if (isIntersectingX && isIntersectingY) {
          validJumps.push(cross.y);
        }
      });

      // Sort jumps along travel direction
      if (goingDown) {
        validJumps.sort((a, b) => a - b);
      } else {
        validJumps.sort((a, b) => b - a);
      }

      // Deduplicate nearby jump points
      const dedupedJumps: number[] = [];
      for (const y of validJumps) {
        if (
          dedupedJumps.length === 0 ||
          Math.abs(y - dedupedJumps[dedupedJumps.length - 1]!) >= 12
        ) {
          dedupedJumps.push(y);
        }
      }

      // Draw vertical segment with Line Jump Arc Bridges (Schematic / ERD Studio style)
      for (const yc of dedupedJumps) {
        const R = Math.min(jumpRadius, 6);
        if (goingDown) {
          // Downward travel: arc hops outward to the right
          path += ` L ${segX} ${yc - R} A ${R} ${R} 0 0 1 ${segX} ${yc + R}`;
        } else {
          // Upward travel: arc hops outward to the right
          path += ` L ${segX} ${yc + R} A ${R} ${R} 0 0 0 ${segX} ${yc - R}`;
        }
      }
      path += ` L ${endPoint.x} ${endPoint.y}`;
    } else {
      path += ` L ${endPoint.x} ${endPoint.y}`;
    }

    // Draw Corner Fillet if not the last segment
    if (i < numSegments - 1) {
      const currCorner = clean[i + 1]!;
      const nextOut = cornerOuts[i]!;
      if (
        Math.abs(currCorner.x - nextOut.x) > 0.5 ||
        Math.abs(currCorner.y - nextOut.y) > 0.5
      ) {
        path += ` Q ${currCorner.x} ${currCorner.y} ${nextOut.x} ${nextOut.y}`;
      } else {
        path += ` L ${nextOut.x} ${nextOut.y}`;
      }
    }
  }

  // Longest segment for centered label
  let longestSegment = { start: clean[0]!, end: clean[1]!, len: 0 };
  for (let i = 0; i < clean.length - 1; i++) {
    const p1 = clean[i]!;
    const p2 = clean[i + 1]!;
    const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (len > longestSegment.len) {
      longestSegment = { start: p1, end: p2, len };
    }
  }

  const labelX = (longestSegment.start.x + longestSegment.end.x) / 2;
  const labelY = (longestSegment.start.y + longestSegment.end.y) / 2;

  return { path, labelX, labelY };
}

// Compute default clean orthogonal route between two pins with natural exit stubs
export function computeDefaultOrthogonalWaypoints(
  source: Point,
  target: Point,
  sourceExitDir: 'up' | 'down' | 'left' | 'right' = 'up',
  targetExitDir: 'up' | 'down' | 'left' | 'right' = 'up'
): Point[] {
  const stubLen = 22;

  let sStub: Point;
  if (sourceExitDir === 'up') sStub = { x: source.x, y: source.y - stubLen };
  else if (sourceExitDir === 'down') sStub = { x: source.x, y: source.y + stubLen };
  else if (sourceExitDir === 'left') sStub = { x: source.x - stubLen, y: source.y };
  else sStub = { x: source.x + stubLen, y: source.y };

  let tStub: Point;
  if (targetExitDir === 'up') tStub = { x: target.x, y: target.y - stubLen };
  else if (targetExitDir === 'down') tStub = { x: target.x, y: target.y + stubLen };
  else if (targetExitDir === 'left') tStub = { x: target.x - stubLen, y: target.y };
  else tStub = { x: target.x + stubLen, y: target.y };

  // Calculate midpoint between stubs
  const midY = (sStub.y + tStub.y) / 2;

  return cleanAndSimplifyWaypoints([
    source,
    sStub,
    { x: sStub.x, y: midY },
    { x: tStub.x, y: midY },
    tStub,
    target,
  ]);
}

// Derive effective waypoints between two endpoints
export function getEffectiveWaypoints(
  wire: Wire,
  startPoint: WirePoint,
  endPoint: WirePoint
): Point[] {
  if (wire.waypoints && wire.waypoints.length >= 2) {
    const pts = wire.waypoints.map((p) => ({ ...p }));

    const wasStartH = Math.abs(pts[0]!.y - pts[1]!.y) <= 2;
    pts[0] = { ...startPoint };
    if (pts.length > 2) {
      if (wasStartH) {
        pts[1]!.y = startPoint.y;
      } else {
        pts[1]!.x = startPoint.x;
      }
    }

    const lastIdx = pts.length - 1;
    const wasEndH = Math.abs(pts[lastIdx]!.y - pts[lastIdx - 1]!.y) <= 2;
    pts[lastIdx] = { ...endPoint };
    if (pts.length > 2) {
      if (wasEndH) {
        pts[lastIdx - 1]!.y = endPoint.y;
      } else {
        pts[lastIdx - 1]!.x = endPoint.x;
      }
    }

    return cleanAndSimplifyWaypoints(pts);
  }

  const dx = endPoint.x - startPoint.x;
  const dy = endPoint.y - startPoint.y;

  if (Math.abs(dx) < 2 || Math.abs(dy) < 2) {
    return [startPoint, endPoint];
  }

  const midX = Math.round(((startPoint.x + endPoint.x) / 2) / 10) * 10;
  return cleanAndSimplifyWaypoints([
    startPoint,
    { x: midX, y: startPoint.y },
    { x: midX, y: endPoint.y },
    endPoint,
  ]);
}

// Returns true if Wire A has vertical segments that jump over horizontal segments of Wire B
export function doesWireJumpOver(
  waypointsA: Point[],
  waypointsB: Point[],
  cornerRadius = 8,
  jumpRadius = 6
): boolean {
  const cleanA = cleanAndSimplifyWaypoints(waypointsA);
  const segsB = extractHorizontalSegments('b', waypointsB);
  if (cleanA.length < 2 || segsB.length === 0) return false;

  const safeMargin = cornerRadius + jumpRadius + 2;

  for (let i = 0; i < cleanA.length - 1; i++) {
    const p1 = cleanA[i]!;
    const p2 = cleanA[i + 1]!;
    const isV = Math.abs(p1.x - p2.x) <= 1.5;
    if (!isV) continue;

    const segX = p1.x;
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);

    for (const cross of segsB) {
      const isIntersectingX = segX > cross.minX + 6 && segX < cross.maxX - 6;
      const isIntersectingY = cross.y >= minY + safeMargin && cross.y <= maxY - safeMargin;
      if (isIntersectingX && isIntersectingY) {
        return true;
      }
    }
  }

  return false;
}

// Sort wires so that jumping wires render on top of jumped-over wires,
// while newer wires remain on top and selected wire is on the very top.
export function sortWiresForRendering(
  wires: Wire[],
  getPinCoords: (compId: string, pinId: string) => WirePoint | null,
  selectedWireId?: string | null
): Wire[] {
  if (wires.length <= 1) return wires;

  // 1. Calculate effective waypoints for each wire
  const wireData = wires.map((w, index) => {
    const start = getPinCoords(w.fromComponentId, w.fromPinId);
    const end = getPinCoords(w.toComponentId, w.toPinId);
    const waypoints = start && end ? getEffectiveWaypoints(w, start, end) : [];
    return { wire: w, index, waypoints };
  });

  // 2. Build dependency graph:
  // If Wire A jumps over Wire B, then Wire B must be rendered BEFORE Wire A (B -> A).
  const mustRenderAfter = new Map<string, Set<string>>();
  wires.forEach((w) => mustRenderAfter.set(w.id, new Set()));

  for (let i = 0; i < wireData.length; i++) {
    for (let j = 0; j < wireData.length; j++) {
      if (i === j) continue;
      const a = wireData[i]!;
      const b = wireData[j]!;
      if (a.wire.routing === 'orthogonal' && doesWireJumpOver(a.waypoints, b.waypoints)) {
        mustRenderAfter.get(a.wire.id)?.add(b.wire.id);
      }
    }
  }

  // 3. Topological sort preserving original wire order as tie-breaker
  const visited = new Set<string>();
  const result: Wire[] = [];
  const sortedByOriginalIndex = [...wireData].sort((a, b) => a.index - b.index);

  function visit(id: string, pathStack = new Set<string>()) {
    if (visited.has(id)) return;
    if (pathStack.has(id)) {
      // Break cycles safely
      return;
    }
    pathStack.add(id);

    const prereqs = mustRenderAfter.get(id);
    if (prereqs) {
      prereqs.forEach((prereqId) => {
        if (!visited.has(prereqId)) {
          visit(prereqId, new Set(pathStack));
        }
      });
    }

    visited.add(id);
    const item = wireData.find((d) => d.wire.id === id);
    if (item) {
      result.push(item.wire);
    }
  }

  sortedByOriginalIndex.forEach((item) => {
    visit(item.wire.id);
  });

  // 4. If a wire is selected, ensure it renders on the very top of all wires
  if (selectedWireId) {
    const selIdx = result.findIndex((w) => w.id === selectedWireId);
    if (selIdx !== -1) {
      const [selected] = result.splice(selIdx, 1);
      if (selected) result.push(selected);
    }
  }

  return result;
}
