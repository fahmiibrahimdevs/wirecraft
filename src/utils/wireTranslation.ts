import { CircuitComponent, Wire } from '../types/circuit';
import { cleanAndSimplifyWaypoints } from './orthogonalRouter';

export interface ComponentPositionUpdate {
  id: string;
  x: number;
  y: number;
}

/**
 * Updates component positions and computes necessary translations for connected wires,
 * wire waypoints, and tap wire points.
 */
export function translateComponentsAndWires(
  prevComponents: CircuitComponent[],
  prevWires: Wire[],
  updates: ComponentPositionUpdate[]
): { components: CircuitComponent[]; wires: Wire[] } {
  const updateMap = new Map(updates.map((u) => [u.id, { x: u.x, y: u.y }]));
  const deltaMap = new Map<string, { dx: number; dy: number }>();

  const nextComponents = prevComponents.map((c) => {
    const target = updateMap.get(c.id);
    if (!target) return c;
    deltaMap.set(c.id, { dx: target.x - c.x, dy: target.y - c.y });
    return { ...c, x: target.x, y: target.y };
  });

  // Resolve wire movement deltas (including connected parent wires for taps)
  const wireDeltaMap = new Map<string, { dx: number; dy: number }>();

  // Pass 1: Compute direct component deltas for wires
  prevWires.forEach((w) => {
    const fromDelta = w.fromComponentId ? deltaMap.get(w.fromComponentId) : undefined;
    const toDelta = w.toComponentId ? deltaMap.get(w.toComponentId) : undefined;
    if (
      fromDelta &&
      toDelta &&
      Math.abs(fromDelta.dx - toDelta.dx) < 0.01 &&
      Math.abs(fromDelta.dy - toDelta.dy) < 0.01
    ) {
      wireDeltaMap.set(w.id, fromDelta);
    } else if (fromDelta && !toDelta && !w.toComponentId) {
      wireDeltaMap.set(w.id, fromDelta);
    } else if (toDelta && !fromDelta && !w.fromComponentId) {
      wireDeltaMap.set(w.id, toDelta);
    }
  });

  // Pass 2: Propagate deltas to tap wires whose parent wires are moving
  for (let pass = 0; pass < 3; pass++) {
    prevWires.forEach((w) => {
      if (wireDeltaMap.has(w.id)) return;
      const parentDelta =
        (w.fromWireId ? wireDeltaMap.get(w.fromWireId) : undefined) ||
        (w.toWireId ? wireDeltaMap.get(w.toWireId) : undefined);
      const compDelta =
        (w.fromComponentId ? deltaMap.get(w.fromComponentId) : undefined) ||
        (w.toComponentId ? deltaMap.get(w.toComponentId) : undefined);

      if (
        parentDelta &&
        compDelta &&
        Math.abs(parentDelta.dx - compDelta.dx) < 0.01 &&
        Math.abs(parentDelta.dy - compDelta.dy) < 0.01
      ) {
        wireDeltaMap.set(w.id, parentDelta);
      } else if (parentDelta && !w.fromComponentId && !w.toComponentId) {
        wireDeltaMap.set(w.id, parentDelta);
      }
    });
  }

  // Wire waypoint & tap point translation:
  const nextWires = prevWires.map((w) => {
    const fromDelta = w.fromComponentId
      ? deltaMap.get(w.fromComponentId)
      : (w.fromWireId ? wireDeltaMap.get(w.fromWireId) : undefined);

    const toDelta = w.toComponentId
      ? deltaMap.get(w.toComponentId)
      : (w.toWireId ? wireDeltaMap.get(w.toWireId) : undefined);

    if (!fromDelta && !toDelta) return w;

    let updatedFromPoint = w.fromPoint ? { ...w.fromPoint } : undefined;
    let updatedToPoint = w.toPoint ? { ...w.toPoint } : undefined;

    if (fromDelta && updatedFromPoint) {
      updatedFromPoint = {
        x: updatedFromPoint.x + fromDelta.dx,
        y: updatedFromPoint.y + fromDelta.dy,
      };
    }
    if (toDelta && updatedToPoint) {
      updatedToPoint = {
        x: updatedToPoint.x + toDelta.dx,
        y: updatedToPoint.y + toDelta.dy,
      };
    }

    // If wire has no custom waypoints (auto-routed)
    if (!w.waypoints || w.waypoints.length === 0) {
      return {
        ...w,
        fromPoint: updatedFromPoint,
        toPoint: updatedToPoint,
      };
    }

    // If BOTH ends move together (group drag / multi-selection / breadboard drag), translate all waypoints 1:1
    if (fromDelta && toDelta) {
      const avgDx = (fromDelta.dx + toDelta.dx) / 2;
      const avgDy = (fromDelta.dy + toDelta.dy) / 2;
      return {
        ...w,
        fromPoint: updatedFromPoint,
        toPoint: updatedToPoint,
        waypoints: w.waypoints.map((p) => ({ x: p.x + avgDx, y: p.y + avgDy })),
      };
    }

    // If only fromComponent/fromWire moved:
    if (fromDelta && !toDelta) {
      const newPts = w.waypoints.map((p) => ({ ...p }));
      newPts[0] = { x: newPts[0]!.x + fromDelta.dx, y: newPts[0]!.y + fromDelta.dy };
      return {
        ...w,
        fromPoint: updatedFromPoint,
        toPoint: updatedToPoint,
        waypoints: w.routing === 'orthogonal' ? cleanAndSimplifyWaypoints(newPts) : newPts,
      };
    }

    // If only toComponent/toWire moved:
    if (!fromDelta && toDelta) {
      const newPts = w.waypoints.map((p) => ({ ...p }));
      const lastIdx = newPts.length - 1;
      newPts[lastIdx] = { x: newPts[lastIdx]!.x + toDelta.dx, y: newPts[lastIdx]!.y + toDelta.dy };
      return {
        ...w,
        fromPoint: updatedFromPoint,
        toPoint: updatedToPoint,
        waypoints: w.routing === 'orthogonal' ? cleanAndSimplifyWaypoints(newPts) : newPts,
      };
    }

    return {
      ...w,
      fromPoint: updatedFromPoint,
      toPoint: updatedToPoint,
    };
  });

  return {
    components: nextComponents,
    wires: nextWires,
  };
}
