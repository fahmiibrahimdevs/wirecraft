import { Wire, WirePoint } from '../types/circuit';
import { PinDirection, getClosestPointOnPath } from './geometry';

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

function areHorizontalSegmentsEqual(a?: HorizontalSegment[], b?: HorizontalSegment[]): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const sa = a[i]!;
    const sb = b[i]!;
    if (sa.y !== sb.y || sa.minX !== sb.minX || sa.maxX !== sb.maxX) {
      return false;
    }
  }
  return true;
}

// Global registry of active rendered horizontal segments across all wires
class LiveWireSegmentRegistry {
  private segments = new Map<string, HorizontalSegment[]>();
  private listeners = new Set<() => void>();
  private version = 0;

  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  public getVersion = () => {
    return this.version;
  };

  public register(wireId: string, waypoints: Point[]) {
    if (!wireId) return;
    const segs = extractHorizontalSegments(wireId, waypoints);
    const prevSegs = this.segments.get(wireId);
    if (!areHorizontalSegmentsEqual(prevSegs, segs)) {
      this.segments.set(wireId, segs);
      this.version++;
      this.notify();
    }
  }

  public unregister(wireId: string) {
    if (this.segments.has(wireId)) {
      this.segments.delete(wireId);
      this.version++;
      this.notify();
    }
  }

  public clear() {
    if (this.segments.size > 0) {
      this.segments.clear();
      this.version++;
      this.notify();
    }
  }

  public notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch {}
    });
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

// Clean and simplify waypoints (ensure strict 90° orthogonality and remove collinear / redundant points)
export function cleanAndSimplifyWaypoints(rawPoints: Point[], tolerance = 2): Point[] {
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

    const isH = Math.abs(prev.y - curr.y) <= tolerance;
    const isV = Math.abs(prev.x - curr.x) <= tolerance;

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

  // 3. Remove collinear points (3+ points in a single line simplified to 2 endpoints)
  let simplified = orthogonal;
  let changed = true;
  while (changed) {
    changed = false;
    const nextList: Point[] = [simplified[0]!];

    for (let i = 1; i < simplified.length - 1; i++) {
      const prev = nextList[nextList.length - 1]!;
      const curr = simplified[i]!;
      const next = simplified[i + 1]!;

      const isCollinearH = Math.abs(prev.y - curr.y) < tolerance && Math.abs(curr.y - next.y) < tolerance;
      const isCollinearV = Math.abs(prev.x - curr.x) < tolerance && Math.abs(curr.x - next.x) < tolerance;

      if (!isCollinearH && !isCollinearV) {
        nextList.push(curr);
      } else {
        changed = true;
      }
    }
    nextList.push(simplified[simplified.length - 1]!);
    simplified = nextList;
  }

  // 4. Remove zero-length segments or duplicate points
  const result: Point[] = [simplified[0]!];
  for (let i = 1; i < simplified.length; i++) {
    const prev = result[result.length - 1]!;
    const curr = simplified[i]!;
    if (Math.hypot(curr.x - prev.x, curr.y - prev.y) > tolerance) {
      result.push(curr);
    }
  }

  return result;
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
  connectedWireIds: Set<string> = new Set(),
  cornerRadius = 8,
  jumpRadius = 6,
  junctionPoints: Point[] = []
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

    // Check if curr is a junction with another wire (must stay sharp 90° for clean T-junctions)
    const isJunction = junctionPoints.some(
      (jp) => Math.hypot(jp.x - curr.x, jp.y - curr.y) <= 8
    );

    if (isJunction) {
      cornerIns.push({ ...curr });
      cornerOuts.push({ ...curr });
      continue;
    }

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
        if (connectedWireIds.has(cross.wireId)) return; // Don't jump over connected branch wires

        // Strict geometric intersection
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

      // Draw vertical segment with Line Jump Arc Bridges
      for (const yc of dedupedJumps) {
        const R = Math.min(jumpRadius, 6);
        if (goingDown) {
          path += ` L ${segX} ${yc - R} A ${R} ${R} 0 0 1 ${segX} ${yc + R}`;
        } else {
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
  sourceExitDir: PinDirection = 'up',
  targetExitDir: PinDirection = 'up'
): Point[] {
  const isSourceV = sourceExitDir === 'up' || sourceExitDir === 'down';
  const isTargetV = targetExitDir === 'up' || targetExitDir === 'down';

  // If points are aligned and face each other, direct straight connection
  if (Math.abs(source.x - target.x) <= 2) {
    if (sourceExitDir !== targetExitDir && isSourceV && isTargetV) {
      const sourceAbove = source.y < target.y;
      if ((sourceAbove && sourceExitDir === 'down' && targetExitDir === 'up') ||
          (!sourceAbove && sourceExitDir === 'up' && targetExitDir === 'down')) {
        return [source, target];
      }
    }
  }
  if (Math.abs(source.y - target.y) <= 2) {
    if (sourceExitDir !== targetExitDir && !isSourceV && !isTargetV) {
      const sourceLeft = source.x < target.x;
      if ((sourceLeft && sourceExitDir === 'right' && targetExitDir === 'left') ||
          (!sourceLeft && sourceExitDir === 'left' && targetExitDir === 'right')) {
        return [source, target];
      }
    }
  }

  // 1. One horizontal and one vertical (natural perpendicular L-shape)
  if (isSourceV !== isTargetV) {
    if (isSourceV) {
      // Source exits vertically (e.g. pin going up), target enters horizontally
      return cleanAndSimplifyWaypoints([
        source,
        { x: source.x, y: target.y },
        target,
      ]);
    } else {
      // Source exits horizontally (e.g. wire tap going right), target enters vertically (e.g. pin)
      return cleanAndSimplifyWaypoints([
        source,
        { x: target.x, y: source.y },
        target,
      ]);
    }
  }

  // 2. Both exit vertically
  if (isSourceV && isTargetV) {
    if (sourceExitDir === targetExitDir) {
      // Both exit UP or both exit DOWN (e.g. two LEDs in a row)
      const stubLen = 18;
      const sStubY = sourceExitDir === 'up' ? source.y - stubLen : source.y + stubLen;
      const tStubY = targetExitDir === 'up' ? target.y - stubLen : target.y + stubLen;
      const busY = sourceExitDir === 'up'
        ? Math.min(sStubY, tStubY) - 10
        : Math.max(sStubY, tStubY) + 10;

      return cleanAndSimplifyWaypoints([
        source,
        { x: source.x, y: busY },
        { x: target.x, y: busY },
        target,
      ]);
    } else {
      // Opposite vertical directions (e.g. one UP, one DOWN facing each other)
      const midY = (source.y + target.y) / 2;
      return cleanAndSimplifyWaypoints([
        source,
        { x: source.x, y: midY },
        { x: target.x, y: midY },
        target,
      ]);
    }
  }

  // 3. Both exit horizontally
  if (!isSourceV && !isTargetV) {
    if (sourceExitDir === targetExitDir) {
      const stubLen = 18;
      const sStubX = sourceExitDir === 'left' ? source.x - stubLen : source.x + stubLen;
      const tStubX = targetExitDir === 'left' ? target.x - stubLen : target.x + stubLen;
      const busX = sourceExitDir === 'left'
        ? Math.min(sStubX, tStubX) - 10
        : Math.max(sStubX, tStubX) + 10;

      return cleanAndSimplifyWaypoints([
        source,
        { x: busX, y: source.y },
        { x: busX, y: target.y },
        target,
      ]);
    } else {
      const midX = (source.x + target.x) / 2;
      return cleanAndSimplifyWaypoints([
        source,
        { x: midX, y: source.y },
        { x: midX, y: target.y },
        target,
      ]);
    }
  }

  return [source, target];
}

// Derive effective waypoints between two endpoints
export function getEffectiveWaypoints(
  wire: Wire,
  startPoint: WirePoint,
  endPoint: WirePoint,
  startDir?: PinDirection,
  endDir?: PinDirection
): Point[] {
  const rawWaypoints = wire.waypoints || [];

  if (rawWaypoints.length === 0) {
    return computeDefaultOrthogonalWaypoints(
      startPoint,
      endPoint,
      startDir || 'up',
      endDir || 'up'
    );
  }

  // Intermediate single-point waypoint
  if (rawWaypoints.length === 1) {
    const pts = [
      { ...startPoint },
      { ...rawWaypoints[0]! },
      { ...endPoint },
    ];
    return cleanAndSimplifyWaypoints(pts);
  }

  // Full polyline path (length >= 2): strictly anchor start and end to current endpoints
  const pts = rawWaypoints.map((p) => ({ ...p }));
  pts[0] = { ...startPoint };
  pts[pts.length - 1] = { ...endPoint };

  return cleanAndSimplifyWaypoints(pts);
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

// Resolved Wire Endpoint data structure
export interface ResolvedWireEndpoint {
  wire: Wire;
  start: Point | null;
  end: Point | null;
  startDir?: PinDirection;
  endDir?: PinDirection;
  waypoints: Point[];
  connectedWireIds: Set<string>;
  junctionPoints: Point[];
}

/**
 * Helper to determine escape direction from a parent wire at a tap point
 */
export function getTapDirection(
  tapPoint: Point,
  parentWaypoints: Point[],
  targetPoint: Point
): PinDirection {
  let onHorizontal = false;
  let onVertical = false;

  for (let i = 0; i < parentWaypoints.length - 1; i++) {
    const p1 = parentWaypoints[i]!;
    const p2 = parentWaypoints[i + 1]!;
    if (Math.abs(p1.y - p2.y) <= 2) {
      const minX = Math.min(p1.x, p2.x);
      const maxX = Math.max(p1.x, p2.x);
      if (tapPoint.x >= minX - 2 && tapPoint.x <= maxX + 2 && Math.abs(tapPoint.y - p1.y) <= 2) {
        onHorizontal = true;
      }
    }
    if (Math.abs(p1.x - p2.x) <= 2) {
      const minY = Math.min(p1.y, p2.y);
      const maxY = Math.max(p1.y, p2.y);
      if (tapPoint.y >= minY - 2 && tapPoint.y <= maxY + 2 && Math.abs(tapPoint.x - p1.x) <= 2) {
        onVertical = true;
      }
    }
  }

  // If on horizontal segment and target is horizontally offset, exit horizontally along the bus
  if (onHorizontal && Math.abs(targetPoint.x - tapPoint.x) > 2) {
    return targetPoint.x > tapPoint.x ? 'right' : 'left';
  }

  // If on vertical segment and target is vertically offset, exit vertically along the bus
  if (onVertical && Math.abs(targetPoint.y - tapPoint.y) > 2) {
    return targetPoint.y > tapPoint.y ? 'down' : 'up';
  }

  if (onHorizontal) {
    return targetPoint.x >= tapPoint.x ? 'right' : 'left';
  }

  if (onVertical) {
    return targetPoint.y >= tapPoint.y ? 'down' : 'up';
  }

  // Geometric fallback
  if (Math.abs(targetPoint.x - tapPoint.x) >= Math.abs(targetPoint.y - tapPoint.y)) {
    return targetPoint.x >= tapPoint.x ? 'right' : 'left';
  } else {
    return targetPoint.y >= tapPoint.y ? 'down' : 'up';
  }
}

export function isPointOnOrNearPath(p: Point, pathPoints: Point[], tolerance = 3): boolean {
  const closest = getClosestPointOnPath(p, pathPoints);
  return closest !== null && closest.distance <= tolerance;
}

// Dynamically resolves start/end coordinates for both Pin connections, daisy-chained nets, and Wire-to-Wire T-junctions
export function resolveAllWireEndpoints(
  wires: Wire[],
  getPinCoords: (compId: string, pinId: string) => WirePoint | null,
  getPinDir?: (compId: string, pinId: string) => (PinDirection | undefined)
): Map<string, ResolvedWireEndpoint> {
  const result = new Map<string, ResolvedWireEndpoint>();

  // Pass 1: Initialize root wires (connected directly to component pins)
  wires.forEach((w) => {
    const start = (w.fromComponentId && w.fromPinId) ? getPinCoords(w.fromComponentId, w.fromPinId) : null;
    const end = (w.toComponentId && w.toPinId) ? getPinCoords(w.toComponentId, w.toPinId) : null;
    const startDir = (w.fromComponentId && w.fromPinId && getPinDir) ? getPinDir(w.fromComponentId, w.fromPinId) : undefined;
    const endDir = (w.toComponentId && w.toPinId && getPinDir) ? getPinDir(w.toComponentId, w.toPinId) : undefined;

    const initialStart = start || w.fromPoint || null;
    const initialEnd = end || w.toPoint || null;
    const waypoints = initialStart && initialEnd ? getEffectiveWaypoints(w, initialStart, initialEnd, startDir, endDir) : [];

    const connectedWireIds = new Set<string>();
    if (w.fromWireId) connectedWireIds.add(w.fromWireId);
    if (w.toWireId) connectedWireIds.add(w.toWireId);

    const junctionPoints: Point[] = [];

    result.set(w.id, {
      wire: w,
      start: initialStart,
      end: initialEnd,
      startDir,
      endDir,
      waypoints,
      connectedWireIds,
      junctionPoints,
    });
  });

  // Pass 2: Daisy-Chain / Shared Pin Bus Alignment
  // Group all wires connected to the same component pin
  const pinWireMap = new Map<string, { wireId: string; isStart: boolean; dir?: PinDirection; compId: string; pinId: string }[]>();

  wires.forEach((w) => {
    if (w.routing !== 'orthogonal') return;

    if (w.fromComponentId && w.fromPinId) {
      const key = `${w.fromComponentId}:${w.fromPinId}`;
      const list = pinWireMap.get(key) || [];
      list.push({ wireId: w.id, isStart: true, dir: result.get(w.id)?.startDir, compId: w.fromComponentId, pinId: w.fromPinId });
      pinWireMap.set(key, list);
    }
    if (w.toComponentId && w.toPinId) {
      const key = `${w.toComponentId}:${w.toPinId}`;
      const list = pinWireMap.get(key) || [];
      list.push({ wireId: w.id, isStart: false, dir: result.get(w.id)?.endDir, compId: w.toComponentId, pinId: w.toPinId });
      pinWireMap.set(key, list);
    }
  });

  pinWireMap.forEach((connections) => {
    if (connections.length < 2) return;

    // Connect all wires in this pin group together in the cluster graph
    connections.forEach((conn) => {
      const item = result.get(conn.wireId);
      if (!item) return;
      connections.forEach((other) => {
        if (other.wireId !== conn.wireId) {
          item.connectedWireIds.add(other.wireId);
        }
      });
    });

    // Group connections by escape direction (e.g. 'up', 'down', 'left', 'right')
    const byDir = new Map<string, typeof connections>();
    connections.forEach((conn) => {
      const dir = conn.dir || 'up';
      const list = byDir.get(dir) || [];
      list.push(conn);
      byDir.set(dir, list);
    });

    byDir.forEach((conns, dir) => {
      if (conns.length < 2) return;

      const firstConn = conns[0]!;
      const pinCoords = getPinCoords(firstConn.compId, firstConn.pinId);
      if (!pinCoords) return;

      const isVerticalDir = dir === 'up' || dir === 'down';

      // Check if any wires have custom waypoints
      const allAuto = conns.every((c) => {
        const item = result.get(c.wireId);
        return !item?.wire.waypoints || item.wire.waypoints.length === 0;
      });

      if (isVerticalDir) {
        // Collect all bus Y levels from the connected wires
        const busYLevels: number[] = [];
        conns.forEach((conn) => {
          const item = result.get(conn.wireId);
          if (item && item.waypoints.length >= 2) {
            for (let i = 0; i < item.waypoints.length - 1; i++) {
              const p1 = item.waypoints[i]!;
              const p2 = item.waypoints[i + 1]!;
              if (Math.abs(p1.y - p2.y) <= 2) {
                busYLevels.push(p1.y);
              }
            }
          }
        });

        if (busYLevels.length === 0) {
          const stub = dir === 'up' ? pinCoords.y - 28 : pinCoords.y + 28;
          busYLevels.push(stub);
        }

        const commonBusY = dir === 'up' ? Math.min(...busYLevels) : Math.max(...busYLevels);
        const junctionPoint: Point = { x: pinCoords.x, y: commonBusY };

        conns.forEach((conn, index) => {
          const item = result.get(conn.wireId);
          if (!item) return;

          if (allAuto) {
            if (!item.junctionPoints.some((p) => Math.hypot(p.x - junctionPoint.x, p.y - junctionPoint.y) < 2)) {
              item.junctionPoints.push(junctionPoint);
            }

            if (index === 0) {
              if (item.start && item.end) {
                const otherEnd = conn.isStart ? item.end : item.start;
                const isOtherEndPin = conn.isStart
                  ? (item.wire.toComponentId && item.wire.toPinId)
                  : (item.wire.fromComponentId && item.wire.fromPinId);

                if (isOtherEndPin) {
                  const pStart = conn.isStart ? pinCoords : otherEnd;
                  const pEnd = conn.isStart ? otherEnd : pinCoords;
                  item.waypoints = cleanAndSimplifyWaypoints([
                    pStart,
                    { x: pStart.x, y: commonBusY },
                    { x: pEnd.x, y: commonBusY },
                    pEnd,
                  ]);
                }
              }
            } else {
              if (conn.isStart && item.end) {
                item.start = junctionPoint;
                item.startDir = item.end.x > junctionPoint.x ? 'right' : 'left';
                item.waypoints = cleanAndSimplifyWaypoints([
                  junctionPoint,
                  { x: item.end.x, y: commonBusY },
                  item.end,
                ]);
              } else if (!conn.isStart && item.start) {
                item.end = junctionPoint;
                item.endDir = item.start.x > junctionPoint.x ? 'right' : 'left';
                item.waypoints = cleanAndSimplifyWaypoints([
                  item.start,
                  { x: item.start.x, y: commonBusY },
                  junctionPoint,
                ]);
              }
            }
          }
        });
      } else {
        // Horizontal escape directions ('left' / 'right') - vertical bus line
        const busXLevels: number[] = [];
        conns.forEach((conn) => {
          const item = result.get(conn.wireId);
          if (item && item.waypoints.length >= 2) {
            for (let i = 0; i < item.waypoints.length - 1; i++) {
              const p1 = item.waypoints[i]!;
              const p2 = item.waypoints[i + 1]!;
              if (Math.abs(p1.x - p2.x) <= 2) {
                busXLevels.push(p1.x);
              }
            }
          }
        });

        if (busXLevels.length === 0) {
          const stub = dir === 'left' ? pinCoords.x - 28 : pinCoords.x + 28;
          busXLevels.push(stub);
        }

        const commonBusX = dir === 'left' ? Math.min(...busXLevels) : Math.max(...busXLevels);
        const junctionPoint: Point = { x: commonBusX, y: pinCoords.y };

        conns.forEach((conn, index) => {
          const item = result.get(conn.wireId);
          if (!item) return;

          if (allAuto) {
            if (!item.junctionPoints.some((p) => Math.hypot(p.x - junctionPoint.x, p.y - junctionPoint.y) < 2)) {
              item.junctionPoints.push(junctionPoint);
            }

            if (index === 0) {
              if (item.start && item.end) {
                const otherEnd = conn.isStart ? item.end : item.start;
                const isOtherEndPin = conn.isStart
                  ? (item.wire.toComponentId && item.wire.toPinId)
                  : (item.wire.fromComponentId && item.wire.fromPinId);

                if (isOtherEndPin) {
                  const pStart = conn.isStart ? pinCoords : otherEnd;
                  const pEnd = conn.isStart ? otherEnd : pinCoords;
                  item.waypoints = cleanAndSimplifyWaypoints([
                    pStart,
                    { x: commonBusX, y: pStart.y },
                    { x: commonBusX, y: pEnd.y },
                    pEnd,
                  ]);
                }
              }
            } else {
              if (conn.isStart && item.end) {
                item.start = junctionPoint;
                item.startDir = item.end.y > junctionPoint.y ? 'down' : 'up';
                item.waypoints = cleanAndSimplifyWaypoints([
                  junctionPoint,
                  { x: commonBusX, y: item.end.y },
                  item.end,
                ]);
              } else if (!conn.isStart && item.start) {
                item.end = junctionPoint;
                item.endDir = item.start.y > junctionPoint.y ? 'down' : 'up';
                item.waypoints = cleanAndSimplifyWaypoints([
                  item.start,
                  { x: commonBusX, y: item.start.y },
                  junctionPoint,
                ]);
              }
            }
          }
        });
      }
    });
  });

  // Pass 3: Resolve Wire-to-Wire Taps dynamically against parent wire waypoints
  for (let pass = 0; pass < 2; pass++) {
    wires.forEach((w) => {
      if (!w.fromWireId && !w.toWireId) return;
      const current = result.get(w.id);
      if (!current) return;
      let updated = false;

      // Resolve fromWireId (Wire-tap as source)
      if (w.fromWireId) {
        const parent = result.get(w.fromWireId);
        if (parent && parent.waypoints.length >= 2 && w.fromPoint) {
          let closest = getClosestPointOnPath(w.fromPoint, parent.waypoints);
          if (closest) {
            // If near any vertex/corner of parent (e.g. bus corner), snap precisely to that corner
            for (const corner of parent.waypoints) {
              if (Math.hypot(corner.x - w.fromPoint.x, corner.y - w.fromPoint.y) <= 15) {
                closest = { point: { ...corner }, distance: 0, isVertical: false, isHorizontal: false, segmentIndex: 0 };
                break;
              }
            }

            const snapPoint = closest.point;
            current.start = snapPoint;
            const refEnd = current.end || w.toPoint || { x: snapPoint.x, y: snapPoint.y };
            current.startDir = getTapDirection(snapPoint, parent.waypoints, refEnd);
            parent.connectedWireIds.add(w.id);
            current.connectedWireIds.add(w.fromWireId);
            if (!parent.junctionPoints.some((p) => Math.hypot(p.x - snapPoint.x, p.y - snapPoint.y) < 2)) {
              parent.junctionPoints.push(snapPoint);
            }
            if (!current.junctionPoints.some((p) => Math.hypot(p.x - snapPoint.x, p.y - snapPoint.y) < 2)) {
              current.junctionPoints.push(snapPoint);
            }
            updated = true;
          }
        }
      }

      // Resolve toWireId (Wire-tap as target)
      if (w.toWireId) {
        const parent = result.get(w.toWireId);
        if (parent && parent.waypoints.length >= 2 && w.toPoint) {
          let closest = getClosestPointOnPath(w.toPoint, parent.waypoints);
          if (closest) {
            // If near any vertex/corner of parent (e.g. bus corner), snap precisely to that corner
            for (const corner of parent.waypoints) {
              if (Math.hypot(corner.x - w.toPoint.x, corner.y - w.toPoint.y) <= 15) {
                closest = { point: { ...corner }, distance: 0, isVertical: false, isHorizontal: false, segmentIndex: 0 };
                break;
              }
            }

            const snapPoint = closest.point;
            current.end = snapPoint;
            const refStart = current.start || w.fromPoint || { x: snapPoint.x, y: snapPoint.y };
            current.endDir = getTapDirection(snapPoint, parent.waypoints, refStart);
            parent.connectedWireIds.add(w.id);
            current.connectedWireIds.add(w.toWireId);
            if (!parent.junctionPoints.some((p) => Math.hypot(p.x - snapPoint.x, p.y - snapPoint.y) < 2)) {
              parent.junctionPoints.push(snapPoint);
            }
            if (!current.junctionPoints.some((p) => Math.hypot(p.x - snapPoint.x, p.y - snapPoint.y) < 2)) {
              current.junctionPoints.push(snapPoint);
            }
            updated = true;
          }
        }
      }

      if (updated && current.start && current.end) {
        current.waypoints = getEffectiveWaypoints(w, current.start, current.end, current.startDir, current.endDir);
      }
    });
  }

  // Pass 4: Dynamic Touch / Intersection Solder Dot Sweep
  // If two orthogonal wires touch at an endpoint or along a segment, link them and create solder dots
  const resolvedList = Array.from(result.values());
  for (let i = 0; i < resolvedList.length; i++) {
    for (let j = i + 1; j < resolvedList.length; j++) {
      const itemA = resolvedList[i]!;
      const itemB = resolvedList[j]!;

      if (itemA.wire.routing !== 'orthogonal' || itemB.wire.routing !== 'orthogonal') continue;

      const ptsA = itemA.waypoints;
      const ptsB = itemB.waypoints;
      if (ptsA.length < 2 || ptsB.length < 2) continue;

      // Check if start or end of B touches path A
      const startB = ptsB[0]!;
      const endB = ptsB[ptsB.length - 1]!;
      const startA = ptsA[0]!;
      const endA = ptsA[ptsA.length - 1]!;

      const touchCandidates: Point[] = [startB, endB, startA, endA];

      touchCandidates.forEach((cand) => {
        const onA = isPointOnOrNearPath(cand, ptsA, 3);
        const onB = isPointOnOrNearPath(cand, ptsB, 3);
        if (onA && onB) {
          itemA.connectedWireIds.add(itemB.wire.id);
          itemB.connectedWireIds.add(itemA.wire.id);

          if (!itemA.junctionPoints.some((p) => Math.hypot(p.x - cand.x, p.y - cand.y) < 2)) {
            itemA.junctionPoints.push({ x: cand.x, y: cand.y });
          }
          if (!itemB.junctionPoints.some((p) => Math.hypot(p.x - cand.x, p.y - cand.y) < 2)) {
            itemB.junctionPoints.push({ x: cand.x, y: cand.y });
          }
        }
      });
    }
  }

  // Final Pass: Ensure item.start, item.end, and junctionPoints are strictly synchronized with active waypoints
  const allResolved = Array.from(result.values());
  result.forEach((item) => {
    if (item.waypoints && item.waypoints.length >= 2) {
      item.start = item.waypoints[0]!;
      item.end = item.waypoints[item.waypoints.length - 1]!;

      // A junction point jp is electrically valid IF AND ONLY IF:
      // 1. It lies directly on item's own active waypoints
      // 2. AND it lies directly on at least one OTHER active wire's waypoints in the circuit
      const otherItems = allResolved.filter((other) => other.wire.id !== item.wire.id);

      item.junctionPoints = item.junctionPoints.filter((jp) => {
        const onSelf = isPointOnOrNearPath(jp, item.waypoints, 3);
        if (!onSelf) return false;
        return otherItems.some(
          (other) =>
            other.waypoints &&
            other.waypoints.length >= 2 &&
            isPointOnOrNearPath(jp, other.waypoints, 3)
        );
      });
    }
  });

  return result;
}

// Sort wires so that jumping wires render on top of jumped-over wires,
// while newer wires remain on top and selected wire is on the very top.
export function sortWiresForRendering(
  wires: Wire[],
  getPinCoords: (compId: string, pinId: string) => WirePoint | null,
  getPinDir?: (compId: string, pinId: string) => (PinDirection | undefined),
  selectedWireId?: string | null
): Wire[] {
  if (wires.length <= 1) return wires;

  const resolvedMap = resolveAllWireEndpoints(wires, getPinCoords, getPinDir);

  // 1. Calculate effective waypoints for each wire
  const wireData = wires.map((w, index) => {
    const resolved = resolvedMap.get(w.id);
    const waypoints = resolved ? resolved.waypoints : [];
    if (w.routing === 'orthogonal') {
      liveWireRegistry.register(w.id, waypoints);
    } else {
      liveWireRegistry.unregister(w.id);
    }
    return {
      wire: w,
      index,
      waypoints,
      connectedWireIds: resolved?.connectedWireIds || new Set<string>(),
    };
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
      if (a.connectedWireIds.has(b.wire.id) || b.connectedWireIds.has(a.wire.id)) {
        continue;
      }
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
