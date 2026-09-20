import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  CircuitComponent,
  Wire,
  Pin,
  WirePoint,
  WireRouting,
} from '../types/circuit';
import { COMPONENT_DEFINITIONS } from '../constants/components';
import {
  getAutoPinColor,
  getAutoWireColor,
  PinDirection,
  getSmartWireSnapPoint,
} from '../utils/geometry';
import { Point, cleanAndSimplifyWaypoints } from '../utils/orthogonalRouter';
import { ContextMenuState } from '../components/menu/ContextMenu';

interface UseWireGesturesProps {
  components: CircuitComponent[];
  wires: Wire[];
  allDefs: Record<string, any>;
  resolvedWiresMap: Map<string, any>;
  getPinCoords: (compId: string, pinId: string) => WirePoint | null;
  getPinDirectionHelper: (compId: string, pinId: string) => PinDirection | undefined;
  currentWireColor: string;
  onSelectWireColor?: (color: string) => void;
  wireRouting: WireRouting;
  snapGrid: boolean;
  zoom: number;
  selectedWireId: string | null;
  onSelectWire: (id: string | null) => void;
  onSelectComponents: (ids: string[]) => void;
  onAddWire: (wire: Omit<Wire, 'id'>) => void;
  onUpdateWire?: (id: string, updates: Partial<Wire>) => void;
  onUpdateWireWaypoints?: (id: string, waypoints: WirePoint[]) => void;
  onUpdateMultiWireWaypoints?: (
    updates: { id: string; waypoints: WirePoint[]; fromPoint?: WirePoint; toPoint?: WirePoint }[]
  ) => void;
  startBranchWireRequest?: { wire: Wire; point: WirePoint; timestamp: number } | null;
  screenToWorld: (clientX: number, clientY: number) => WirePoint;
  pan: WirePoint;
  setIsPanning: (panning: boolean) => void;
  setPanStart: (start: WirePoint) => void;
  isRightMouseDownRef: React.MutableRefObject<boolean>;
  rightClickStartPosRef: React.MutableRefObject<{ x: number; y: number } | null>;
  rightClickDidDragRef: React.MutableRefObject<boolean>;
  pendingContextMenuRef: React.MutableRefObject<ContextMenuState | null>;
}

export function useWireGestures({
  components,
  wires,
  allDefs,
  resolvedWiresMap,
  getPinCoords,
  getPinDirectionHelper,
  currentWireColor,
  onSelectWireColor,
  wireRouting,
  snapGrid,
  zoom,
  selectedWireId,
  onSelectWire,
  onSelectComponents,
  onAddWire,
  onUpdateWire,
  onUpdateWireWaypoints,
  onUpdateMultiWireWaypoints,
  startBranchWireRequest,
  screenToWorld,
  pan,
  setIsPanning,
  setPanStart,
  isRightMouseDownRef,
  rightClickStartPosRef,
  rightClickDidDragRef,
  pendingContextMenuRef,
}: UseWireGesturesProps) {
  // Wire drawing state
  const [drawingWire, setDrawingWire] = useState<{
    fromComponentId?: string;
    fromPin?: Pin;
    fromWireId?: string;
    fromPoint?: WirePoint;
    currentPoint: WirePoint;
    waypoints: WirePoint[];
    color: string;
  } | null>(null);

  // Pin Hover Tooltip state
  const [hoveredPinInfo, setHoveredPinInfo] = useState<{
    component: CircuitComponent;
    pin: Pin;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Wire-to-Wire T-Junction Snap state
  const [hoveredWireSnap, setHoveredWireSnap] = useState<{
    wire: Wire;
    point: WirePoint;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Interactive Wire Endpoint Drag
  const [draggingEndpoint, setDraggingEndpoint] = useState<{
    wireId: string;
    endpoint: 'start' | 'end';
    currentPoint: WirePoint;
  } | null>(null);

  // Live Multi-Wire Synchronized Drag Waypoints & Junctions Maps
  const [liveWireWaypointsMap, setLiveWireWaypointsMap] = useState<Map<string, Point[]>>(
    new Map()
  );
  const [liveWireJunctionsMap, setLiveWireJunctionsMap] = useState<Map<string, Point[]>>(
    new Map()
  );

  // Reference to prevent accidental double-click / immediate wire creation right after finishing a wire
  const justFinishedWireRef = useRef<number>(0);

  // Handle external request to branch wire from context menu
  useEffect(() => {
    if (!startBranchWireRequest) return;
    const resolved = resolvedWiresMap.get(startBranchWireRequest.wire.id);
    const snapPoint =
      resolved && resolved.waypoints.length >= 2
        ? getSmartWireSnapPoint(
            startBranchWireRequest.point,
            resolved.waypoints,
            null,
            snapGrid
          )?.point || startBranchWireRequest.point
        : startBranchWireRequest.point;

    setDrawingWire({
      fromWireId: startBranchWireRequest.wire.id,
      fromPoint: snapPoint,
      currentPoint: snapPoint,
      waypoints: [],
      color: startBranchWireRequest.wire.color,
    });
    onSelectWire(null);
    onSelectComponents([]);
  }, [startBranchWireRequest, resolvedWiresMap, onSelectWire, onSelectComponents, snapGrid]);

  // Helper to complete wire connection between start and target pin
  const finishWireConnection = useCallback(
    (targetCompId: string, targetPin: Pin) => {
      if (!drawingWire) return;
      if (
        drawingWire.fromComponentId === targetCompId &&
        drawingWire.fromPin?.id === targetPin.id
      ) {
        return;
      }

      const fromPin = drawingWire.fromPin;
      const finalColor = fromPin
        ? getAutoWireColor(fromPin, targetPin, drawingWire.color || currentWireColor)
        : drawingWire.color || currentWireColor;

      if (onSelectWireColor) {
        onSelectWireColor(finalColor);
      }

      onAddWire({
        fromComponentId: drawingWire.fromComponentId,
        fromPinId: drawingWire.fromPin?.id,
        fromWireId: drawingWire.fromWireId,
        fromPoint: drawingWire.fromPoint,
        toComponentId: targetCompId,
        toPinId: targetPin.id,
        color: finalColor,
        routing: wireRouting,
        waypoints: drawingWire.waypoints,
      });

      justFinishedWireRef.current = Date.now();
      setDrawingWire(null);
      setHoveredPinInfo(null);
      setHoveredWireSnap(null);
    },
    [drawingWire, onAddWire, currentWireColor, wireRouting, onSelectWireColor]
  );

  // Helper to complete wire connection tapping into another wire (T-Junction)
  const finishWireToWireConnection = useCallback(
    (targetWire: Wire, tapPoint: WirePoint) => {
      if (!drawingWire) return;

      const finalColor = drawingWire.color || targetWire.color || currentWireColor;
      if (onSelectWireColor) {
        onSelectWireColor(finalColor);
      }

      onAddWire({
        fromComponentId: drawingWire.fromComponentId,
        fromPinId: drawingWire.fromPin?.id,
        fromWireId: drawingWire.fromWireId,
        fromPoint: drawingWire.fromPoint,
        toWireId: targetWire.id,
        toPoint: tapPoint,
        toComponentId: targetWire.fromComponentId || targetWire.toComponentId,
        toPinId: targetWire.fromPinId || targetWire.toPinId,
        color: finalColor,
        routing: wireRouting,
        waypoints: drawingWire.waypoints,
      });

      justFinishedWireRef.current = Date.now();
      setDrawingWire(null);
      setHoveredPinInfo(null);
      setHoveredWireSnap(null);
    },
    [drawingWire, onAddWire, currentWireColor, wireRouting, onSelectWireColor]
  );

  // Handle interactive endpoint drag start (from WireSvg) with Window Pointer Capture
  const handleStartEndpointDrag = useCallback(
    (wire: Wire, endpoint: 'start' | 'end', e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onSelectWire(wire.id);
      onSelectComponents([]);

      const resolved = resolvedWiresMap.get(wire.id);
      const initPoint =
        endpoint === 'start'
          ? resolved?.start ||
            (wire.fromComponentId && wire.fromPinId
              ? getPinCoords(wire.fromComponentId, wire.fromPinId)
              : wire.fromPoint) || { x: 0, y: 0 }
          : resolved?.end ||
            (wire.toComponentId && wire.toPinId
              ? getPinCoords(wire.toComponentId, wire.toPinId)
              : wire.toPoint) || { x: 0, y: 0 };

      const otherEndPos =
        endpoint === 'start' ? resolved?.end || null : resolved?.start || null;

      setDraggingEndpoint({
        wireId: wire.id,
        endpoint,
        currentPoint: initPoint,
      });

      let activePinTarget: { component: CircuitComponent; pin: Pin } | null = null;
      let activeWireTarget: { wire: Wire; point: WirePoint } | null = null;

      const handlePointerMove = (moveEvt: PointerEvent) => {
        const worldPos = screenToWorld(moveEvt.clientX, moveEvt.clientY);
        let snapPos = worldPos;
        let snapTarget: { component: CircuitComponent; pin: Pin } | null = null;
        let minDistance = 18;

        // 1. Check pin snapping
        for (const comp of components) {
          const def = allDefs[comp.type] || COMPONENT_DEFINITIONS[comp.type];
          if (!def) continue;

          if (
            worldPos.x < comp.x - 25 ||
            worldPos.x > comp.x + def.width + 25 ||
            worldPos.y < comp.y - 25 ||
            worldPos.y > comp.y + def.height + 25
          ) {
            continue;
          }

          for (const pin of def.pins) {
            if (
              endpoint === 'start' &&
              wire.toComponentId === comp.id &&
              wire.toPinId === pin.id
            )
              continue;
            if (
              endpoint === 'end' &&
              wire.fromComponentId === comp.id &&
              wire.fromPinId === pin.id
            )
              continue;

            const pinCoords = getPinCoords(comp.id, pin.id);
            if (!pinCoords) continue;

            const dist = Math.hypot(worldPos.x - pinCoords.x, worldPos.y - pinCoords.y);
            if (dist < minDistance) {
              minDistance = dist;
              snapPos = pinCoords;
              snapTarget = { component: comp, pin };
            }
          }
        }

        // 2. Check wire snapping (including parent wire sliding or other wires)
        let wireSnapTarget: { wire: Wire; point: WirePoint } | null = null;
        if (!snapTarget) {
          let minWireDist = 28;
          wires.forEach((w) => {
            if (w.id === wire.id) return; // Cannot snap to self

            const res = resolvedWiresMap.get(w.id);
            if (!res || res.waypoints.length < 2) return;

            const closest = getSmartWireSnapPoint(worldPos, res.waypoints, otherEndPos, snapGrid);
            if (closest && closest.distance < minWireDist) {
              minWireDist = closest.distance;
              wireSnapTarget = { wire: w, point: closest.point };
            }
          });
        }

        activePinTarget = snapTarget;
        activeWireTarget = wireSnapTarget;

        if (wireSnapTarget) {
          const snap = wireSnapTarget as { wire: Wire; point: WirePoint };
          snapPos = snap.point;
          setHoveredWireSnap({
            wire: snap.wire,
            point: snap.point,
            screenX: moveEvt.clientX,
            screenY: moveEvt.clientY,
          });
          setHoveredPinInfo(null);
        } else if (snapTarget) {
          setHoveredPinInfo({
            component: snapTarget.component,
            pin: snapTarget.pin,
            screenX: moveEvt.clientX,
            screenY: moveEvt.clientY,
          });
          setHoveredWireSnap(null);
        } else {
          setHoveredPinInfo(null);
          setHoveredWireSnap(null);
        }

        setDraggingEndpoint({
          wireId: wire.id,
          endpoint,
          currentPoint: snapPos,
        });
      };

      const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);

        if (activePinTarget && onUpdateWire) {
          if (endpoint === 'start') {
            onUpdateWire(wire.id, {
              fromComponentId: activePinTarget.component.id,
              fromPinId: activePinTarget.pin.id,
              fromWireId: undefined,
              fromPoint: undefined,
              waypoints: [],
            });
          } else {
            onUpdateWire(wire.id, {
              toComponentId: activePinTarget.component.id,
              toPinId: activePinTarget.pin.id,
              toWireId: undefined,
              toPoint: undefined,
              waypoints: [],
            });
          }
        } else if (activeWireTarget && onUpdateWire) {
          if (endpoint === 'start') {
            onUpdateWire(wire.id, {
              fromWireId: activeWireTarget.wire.id,
              fromPoint: activeWireTarget.point,
              fromComponentId: undefined,
              fromPinId: undefined,
              waypoints: [],
            });
          } else {
            onUpdateWire(wire.id, {
              toWireId: activeWireTarget.wire.id,
              toPoint: activeWireTarget.point,
              toComponentId: undefined,
              toPinId: undefined,
              waypoints: [],
            });
          }
        }

        setDraggingEndpoint(null);
        setHoveredPinInfo(null);
        setHoveredWireSnap(null);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    },
    [
      resolvedWiresMap,
      getPinCoords,
      onSelectWire,
      onSelectComponents,
      components,
      allDefs,
      wires,
      snapGrid,
      screenToWorld,
      onUpdateWire,
    ]
  );

  // Helper: BFS Traversal to collect all wire IDs in the same connected net cluster
  const getConnectedNetCluster = useCallback(
    (startWireId: string): Set<string> => {
      const cluster = new Set<string>([startWireId]);
      const queue = [startWireId];

      while (queue.length > 0) {
        const currId = queue.shift()!;
        const curr = resolvedWiresMap.get(currId);
        if (!curr) continue;

        curr.connectedWireIds.forEach((neighborId: string) => {
          if (!cluster.has(neighborId)) {
            cluster.add(neighborId);
            queue.push(neighborId);
          }
        });
      }

      return cluster;
    },
    [resolvedWiresMap]
  );

  // Helper: Shift wire vertical drop / junction X coordinate cleanly
  const shiftWireX = useCallback(
    (
      initialPts: Point[],
      initSegX: number,
      newX: number,
      startPinPos: Point | null,
      endPinPos: Point | null
    ): Point[] => {
      if (initialPts.length < 2) return initialPts;
      const pts: Point[] = [];

      for (let i = 0; i < initialPts.length; i++) {
        const curr = initialPts[i]!;
        const isAtSegX = Math.abs(curr.x - initSegX) <= 4;

        if (!isAtSegX) {
          pts.push({ ...curr });
          continue;
        }

        if (
          i === 0 &&
          startPinPos &&
          Math.abs(curr.x - startPinPos.x) <= 4 &&
          Math.abs(curr.y - startPinPos.y) <= 4
        ) {
          pts.push({ ...curr });
          if (Math.abs(newX - startPinPos.x) > 2) {
            pts.push({ x: newX, y: startPinPos.y });
          }
        } else if (
          i === initialPts.length - 1 &&
          endPinPos &&
          Math.abs(curr.x - endPinPos.x) <= 4 &&
          Math.abs(curr.y - endPinPos.y) <= 4
        ) {
          if (Math.abs(newX - endPinPos.x) > 2) {
            pts.push({ x: newX, y: endPinPos.y });
          }
          pts.push({ ...curr });
        } else {
          pts.push({ x: newX, y: curr.y });
        }
      }

      return cleanAndSimplifyWaypoints(pts);
    },
    []
  );

  // Helper: Shift wire horizontal bus Y coordinate cleanly
  const shiftWireY = useCallback(
    (
      initialPts: Point[],
      initSegY: number,
      newY: number,
      startPinPos: Point | null,
      endPinPos: Point | null
    ): Point[] => {
      if (initialPts.length < 2) return initialPts;
      const pts: Point[] = [];

      for (let i = 0; i < initialPts.length; i++) {
        const curr = initialPts[i]!;
        const isAtSegY = Math.abs(curr.y - initSegY) <= 4;

        if (!isAtSegY) {
          pts.push({ ...curr });
          continue;
        }

        if (
          i === 0 &&
          startPinPos &&
          Math.abs(curr.y - startPinPos.y) <= 4 &&
          Math.abs(curr.x - startPinPos.x) <= 4
        ) {
          pts.push({ ...curr });
          if (Math.abs(newY - startPinPos.y) > 2) {
            pts.push({ x: startPinPos.x, y: newY });
          }
        } else if (
          i === initialPts.length - 1 &&
          endPinPos &&
          Math.abs(curr.y - endPinPos.y) <= 4 &&
          Math.abs(curr.x - endPinPos.x) <= 4
        ) {
          if (Math.abs(newY - endPinPos.y) > 2) {
            pts.push({ x: endPinPos.x, y: newY });
          }
          pts.push({ ...curr });
        } else {
          pts.push({ x: curr.x, y: newY });
        }
      }

      return cleanAndSimplifyWaypoints(pts);
    },
    []
  );

  // Synchronized Segment Drag
  const handleStartSegmentDrag = useCallback(
    (wire: Wire, segIndex: number, isVertical: boolean, e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      onSelectWire(wire.id);
      onSelectComponents([]);

      const wireResolved = resolvedWiresMap.get(wire.id);
      if (!wireResolved) return;

      const initialPoints = [...wireResolved.waypoints];
      if (initialPoints.length < 2) return;

      const cluster = getConnectedNetCluster(wire.id);

      const initialWaypointsMap = new Map<string, Point[]>();
      const initialJunctionsMap = new Map<string, Point[]>();
      const initialFromPointsMap = new Map<string, Point | undefined>();
      const initialToPointsMap = new Map<string, Point | undefined>();
      resolvedWiresMap.forEach((res, wId) => {
        initialWaypointsMap.set(wId, res.waypoints.map((p: Point) => ({ ...p })));
        initialJunctionsMap.set(wId, res.junctionPoints.map((p: Point) => ({ ...p })));
        if (res.wire.fromPoint) initialFromPointsMap.set(wId, { ...res.wire.fromPoint });
        if (res.wire.toPoint) initialToPointsMap.set(wId, { ...res.wire.toPoint });
      });

      const startClientX = e.clientX;
      const startClientY = e.clientY;

      let latestWaypointsMap = new Map<string, Point[]>();
      let latestFromPointsMap = new Map<string, Point>();
      let latestToPointsMap = new Map<string, Point>();

      const handlePointerMove = (moveEvt: PointerEvent) => {
        const curZoom = zoom || 1;
        const dx = (moveEvt.clientX - startClientX) / curZoom;
        const dy = (moveEvt.clientY - startClientY) / curZoom;

        const newWaypointsMap = new Map<string, Point[]>();
        const newJunctionsMap = new Map<string, Point[]>();
        const newFromPointsMap = new Map<string, Point>();
        const newToPointsMap = new Map<string, Point>();

        if (isVertical) {
          const initSegX = initialPoints[segIndex]!.x;
          const newX = Math.round((initSegX + dx) / 4) * 4;

          cluster.forEach((cId) => {
            const res = resolvedWiresMap.get(cId);
            const initPts = initialWaypointsMap.get(cId);
            if (!res || !initPts) return;

            const startPinPos =
              res.wire.fromComponentId && res.wire.fromPinId
                ? getPinCoords(res.wire.fromComponentId, res.wire.fromPinId)
                : null;
            const endPinPos =
              res.wire.toComponentId && res.wire.toPinId
                ? getPinCoords(res.wire.toComponentId, res.wire.toPinId)
                : null;

            const shifted = shiftWireX(initPts, initSegX, newX, startPinPos, endPinPos);
            newWaypointsMap.set(cId, shifted);

            const initFrom = initialFromPointsMap.get(cId);
            if (initFrom) {
              newFromPointsMap.set(
                cId,
                Math.abs(initFrom.x - initSegX) <= 6 ? { ...initFrom, x: newX } : { ...initFrom }
              );
            }
            const initTo = initialToPointsMap.get(cId);
            if (initTo) {
              newToPointsMap.set(
                cId,
                Math.abs(initTo.x - initSegX) <= 6 ? { ...initTo, x: newX } : { ...initTo }
              );
            }
          });

          initialJunctionsMap.forEach((jps, wId) => {
            if (cluster.has(wId)) {
              const updatedJps = jps.map((jp) =>
                Math.abs(jp.x - initSegX) <= 4 ? { ...jp, x: newX } : { ...jp }
              );
              newJunctionsMap.set(wId, updatedJps);
            }
          });
        } else {
          const initSegY = initialPoints[segIndex]!.y;
          const newY = Math.round((initSegY + dy) / 4) * 4;

          cluster.forEach((cId) => {
            const res = resolvedWiresMap.get(cId);
            const initPts = initialWaypointsMap.get(cId);
            if (!res || !initPts) return;

            const startPinPos =
              res.wire.fromComponentId && res.wire.fromPinId
                ? getPinCoords(res.wire.fromComponentId, res.wire.fromPinId)
                : null;
            const endPinPos =
              res.wire.toComponentId && res.wire.toPinId
                ? getPinCoords(res.wire.toComponentId, res.wire.toPinId)
                : null;

            const shifted = shiftWireY(initPts, initSegY, newY, startPinPos, endPinPos);
            newWaypointsMap.set(cId, shifted);

            const initFrom = initialFromPointsMap.get(cId);
            if (initFrom) {
              newFromPointsMap.set(
                cId,
                Math.abs(initFrom.y - initSegY) <= 6 ? { ...initFrom, y: newY } : { ...initFrom }
              );
            }
            const initTo = initialToPointsMap.get(cId);
            if (initTo) {
              newToPointsMap.set(
                cId,
                Math.abs(initTo.y - initSegY) <= 6 ? { ...initTo, y: newY } : { ...initTo }
              );
            }
          });

          initialJunctionsMap.forEach((jps, wId) => {
            if (cluster.has(wId)) {
              const updatedJps = jps.map((jp) =>
                Math.abs(jp.y - initSegY) <= 4 ? { ...jp, y: newY } : { ...jp }
              );
              newJunctionsMap.set(wId, updatedJps);
            }
          });
        }

        latestWaypointsMap = newWaypointsMap;
        latestFromPointsMap = newFromPointsMap;
        latestToPointsMap = newToPointsMap;
        setLiveWireWaypointsMap(newWaypointsMap);
        setLiveWireJunctionsMap(newJunctionsMap);
      };

      const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);

        const updates: {
          id: string;
          waypoints: WirePoint[];
          fromPoint?: WirePoint;
          toPoint?: WirePoint;
        }[] = [];
        latestWaypointsMap.forEach((pts, wId) => {
          updates.push({
            id: wId,
            waypoints: pts,
            fromPoint: latestFromPointsMap.get(wId),
            toPoint: latestToPointsMap.get(wId),
          });
        });

        setLiveWireWaypointsMap(new Map());
        setLiveWireJunctionsMap(new Map());

        if (updates.length > 0 && onUpdateMultiWireWaypoints) {
          onUpdateMultiWireWaypoints(updates);
        } else if (updates.length > 0 && onUpdateWireWaypoints) {
          updates.forEach((u) => onUpdateWireWaypoints(u.id, u.waypoints));
        }
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    },
    [
      resolvedWiresMap,
      zoom,
      onSelectWire,
      onSelectComponents,
      onUpdateMultiWireWaypoints,
      onUpdateWireWaypoints,
      getConnectedNetCluster,
      shiftWireX,
      shiftWireY,
      getPinCoords,
    ]
  );

  // Synchronized Junction Drag
  const handleStartJunctionDrag = useCallback(
    (
      wire: Wire,
      junctionIndex: number,
      jp: Point,
      isVerticalBus: boolean,
      e: React.PointerEvent
    ) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      onSelectWire(wire.id);
      onSelectComponents([]);

      const wireResolved = resolvedWiresMap.get(wire.id);
      if (!wireResolved) return;

      const cluster = getConnectedNetCluster(wire.id);

      const initialWaypointsMap = new Map<string, Point[]>();
      const initialJunctionsMap = new Map<string, Point[]>();
      const initialFromPointsMap = new Map<string, Point | undefined>();
      const initialToPointsMap = new Map<string, Point | undefined>();
      resolvedWiresMap.forEach((res, wId) => {
        initialWaypointsMap.set(wId, res.waypoints.map((p: Point) => ({ ...p })));
        initialJunctionsMap.set(wId, res.junctionPoints.map((p: Point) => ({ ...p })));
        if (res.wire.fromPoint) initialFromPointsMap.set(wId, { ...res.wire.fromPoint });
        if (res.wire.toPoint) initialToPointsMap.set(wId, { ...res.wire.toPoint });
      });

      const startClientX = e.clientX;
      const startClientY = e.clientY;

      let latestWaypointsMap = new Map<string, Point[]>();
      let latestFromPointsMap = new Map<string, Point>();
      let latestToPointsMap = new Map<string, Point>();

      const handlePointerMove = (moveEvt: PointerEvent) => {
        const curZoom = zoom || 1;
        const dx = (moveEvt.clientX - startClientX) / curZoom;
        const dy = (moveEvt.clientY - startClientY) / curZoom;

        const newWaypointsMap = new Map<string, Point[]>();
        const newJunctionsMap = new Map<string, Point[]>();
        const newFromPointsMap = new Map<string, Point>();
        const newToPointsMap = new Map<string, Point>();

        if (!isVerticalBus) {
          const newX = Math.round((jp.x + dx) / 4) * 4;

          cluster.forEach((cId) => {
            const res = resolvedWiresMap.get(cId);
            const initPts = initialWaypointsMap.get(cId);
            if (!res || !initPts) return;

            const startPinPos =
              res.wire.fromComponentId && res.wire.fromPinId
                ? getPinCoords(res.wire.fromComponentId, res.wire.fromPinId)
                : null;
            const endPinPos =
              res.wire.toComponentId && res.wire.toPinId
                ? getPinCoords(res.wire.toComponentId, res.wire.toPinId)
                : null;

            const shifted = shiftWireX(initPts, jp.x, newX, startPinPos, endPinPos);
            newWaypointsMap.set(cId, shifted);

            const initFrom = initialFromPointsMap.get(cId);
            if (initFrom) {
              newFromPointsMap.set(
                cId,
                Math.abs(initFrom.x - jp.x) <= 6 ? { ...initFrom, x: newX } : { ...initFrom }
              );
            }
            const initTo = initialToPointsMap.get(cId);
            if (initTo) {
              newToPointsMap.set(
                cId,
                Math.abs(initTo.x - jp.x) <= 6 ? { ...initTo, x: newX } : { ...initTo }
              );
            }
          });

          initialJunctionsMap.forEach((jps, wId) => {
            if (cluster.has(wId)) {
              const updatedJps = jps.map((p) =>
                Math.hypot(p.x - jp.x, p.y - jp.y) <= 4 ? { ...p, x: newX } : { ...p }
              );
              newJunctionsMap.set(wId, updatedJps);
            }
          });
        } else {
          const newY = Math.round((jp.y + dy) / 4) * 4;

          cluster.forEach((cId) => {
            const res = resolvedWiresMap.get(cId);
            const initPts = initialWaypointsMap.get(cId);
            if (!res || !initPts) return;

            const startPinPos =
              res.wire.fromComponentId && res.wire.fromPinId
                ? getPinCoords(res.wire.fromComponentId, res.wire.fromPinId)
                : null;
            const endPinPos =
              res.wire.toComponentId && res.wire.toPinId
                ? getPinCoords(res.wire.toComponentId, res.wire.toPinId)
                : null;

            const shifted = shiftWireY(initPts, jp.y, newY, startPinPos, endPinPos);
            newWaypointsMap.set(cId, shifted);

            const initFrom = initialFromPointsMap.get(cId);
            if (initFrom) {
              newFromPointsMap.set(
                cId,
                Math.abs(initFrom.y - jp.y) <= 6 ? { ...initFrom, y: newY } : { ...initFrom }
              );
            }
            const initTo = initialToPointsMap.get(cId);
            if (initTo) {
              newToPointsMap.set(
                cId,
                Math.abs(initTo.y - jp.y) <= 6 ? { ...initTo, y: newY } : { ...initTo }
              );
            }
          });

          initialJunctionsMap.forEach((jps, wId) => {
            if (cluster.has(wId)) {
              const updatedJps = jps.map((p) =>
                Math.hypot(p.x - jp.x, p.y - jp.y) <= 4 ? { ...p, y: newY } : { ...p }
              );
              newJunctionsMap.set(wId, updatedJps);
            }
          });
        }

        latestWaypointsMap = newWaypointsMap;
        latestFromPointsMap = newFromPointsMap;
        latestToPointsMap = newToPointsMap;
        setLiveWireWaypointsMap(newWaypointsMap);
        setLiveWireJunctionsMap(newJunctionsMap);
      };

      const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);

        const updates: {
          id: string;
          waypoints: WirePoint[];
          fromPoint?: WirePoint;
          toPoint?: WirePoint;
        }[] = [];
        latestWaypointsMap.forEach((pts, wId) => {
          updates.push({
            id: wId,
            waypoints: pts,
            fromPoint: latestFromPointsMap.get(wId),
            toPoint: latestToPointsMap.get(wId),
          });
        });

        setLiveWireWaypointsMap(new Map());
        setLiveWireJunctionsMap(new Map());

        if (updates.length > 0 && onUpdateMultiWireWaypoints) {
          onUpdateMultiWireWaypoints(updates);
        } else if (updates.length > 0 && onUpdateWireWaypoints) {
          updates.forEach((u) => onUpdateWireWaypoints(u.id, u.waypoints));
        }
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    },
    [
      resolvedWiresMap,
      zoom,
      onSelectWire,
      onSelectComponents,
      onUpdateMultiWireWaypoints,
      onUpdateWireWaypoints,
      getConnectedNetCluster,
      shiftWireX,
      shiftWireY,
      getPinCoords,
    ]
  );

  // Corner Drag
  const handleStartCornerDrag = useCallback(
    (wire: Wire, pointIndex: number, e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      onSelectWire(wire.id);
      onSelectComponents([]);

      const wireResolved = resolvedWiresMap.get(wire.id);
      if (!wireResolved) return;

      const initialPoints = [...wireResolved.waypoints];
      if (initialPoints.length < 3 || pointIndex <= 0 || pointIndex >= initialPoints.length - 1)
        return;

      const startClientX = e.clientX;
      const startClientY = e.clientY;
      let latestWaypoints = initialPoints;

      const handlePointerMove = (moveEvt: PointerEvent) => {
        const curZoom = zoom || 1;
        const dx = (moveEvt.clientX - startClientX) / curZoom;
        const dy = (moveEvt.clientY - startClientY) / curZoom;

        const newX = Math.round((initialPoints[pointIndex]!.x + dx) / 4) * 4;
        const newY = Math.round((initialPoints[pointIndex]!.y + dy) / 4) * 4;

        const pts = initialPoints.map((p) => ({ ...p }));
        const isPrevH =
          Math.abs(initialPoints[pointIndex - 1]!.y - initialPoints[pointIndex]!.y) <= 2;

        if (isPrevH) {
          if (pointIndex - 1 > 0) pts[pointIndex - 1]!.y = newY;
          pts[pointIndex] = { x: newX, y: newY };
          if (pointIndex + 1 < pts.length - 1) pts[pointIndex + 1]!.x = newX;
        } else {
          if (pointIndex - 1 > 0) pts[pointIndex - 1]!.x = newX;
          pts[pointIndex] = { x: newX, y: newY };
          if (pointIndex + 1 < pts.length - 1) pts[pointIndex + 1]!.y = newY;
        }

        const cleaned = cleanAndSimplifyWaypoints(pts);
        latestWaypoints = cleaned;
        setLiveWireWaypointsMap(new Map([[wire.id, cleaned]]));
      };

      const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);

        setLiveWireWaypointsMap(new Map());
        if (onUpdateWireWaypoints) {
          onUpdateWireWaypoints(wire.id, latestWaypoints);
        }
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    },
    [resolvedWiresMap, zoom, onSelectWire, onSelectComponents, onUpdateWireWaypoints]
  );

  // Midpoint Drag
  const handleStartMidpointDrag = useCallback(
    (wire: Wire, segIndex: number, isVertical: boolean, e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      onSelectWire(wire.id);
      onSelectComponents([]);

      const wireResolved = resolvedWiresMap.get(wire.id);
      if (!wireResolved) return;

      const initialPoints = [...wireResolved.waypoints];
      if (initialPoints.length < 2 || segIndex < 0 || segIndex >= initialPoints.length - 1)
        return;

      const startClientX = e.clientX;
      const startClientY = e.clientY;
      let latestWaypoints = initialPoints;

      const handlePointerMove = (moveEvt: PointerEvent) => {
        const curZoom = zoom || 1;
        const dx = (moveEvt.clientX - startClientX) / curZoom;
        const dy = (moveEvt.clientY - startClientY) / curZoom;

        let pts: Point[];
        if (isVertical) {
          const newX = Math.round((initialPoints[segIndex]!.x + dx) / 4) * 4;
          const midY = (initialPoints[segIndex]!.y + initialPoints[segIndex + 1]!.y) / 2;
          pts = [
            ...initialPoints.slice(0, segIndex + 1),
            { x: initialPoints[segIndex]!.x, y: midY },
            { x: newX, y: midY },
            { x: newX, y: initialPoints[segIndex + 1]!.y },
            ...initialPoints.slice(segIndex + 1),
          ];
        } else {
          const newY = Math.round((initialPoints[segIndex]!.y + dy) / 4) * 4;
          const midX = (initialPoints[segIndex]!.x + initialPoints[segIndex + 1]!.x) / 2;
          pts = [
            ...initialPoints.slice(0, segIndex + 1),
            { x: midX, y: initialPoints[segIndex]!.y },
            { x: midX, y: newY },
            { x: initialPoints[segIndex + 1]!.x, y: newY },
            ...initialPoints.slice(segIndex + 1),
          ];
        }

        const cleaned = cleanAndSimplifyWaypoints(pts);
        latestWaypoints = cleaned;
        setLiveWireWaypointsMap(new Map([[wire.id, cleaned]]));
      };

      const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);

        setLiveWireWaypointsMap(new Map());
        if (onUpdateWireWaypoints) {
          onUpdateWireWaypoints(wire.id, latestWaypoints);
        }
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
      window.addEventListener('pointercancel', handlePointerUp);
    },
    [resolvedWiresMap, zoom, onSelectWire, onSelectComponents, onUpdateWireWaypoints]
  );

  // Pin Click / MouseDown
  const handlePinMouseDown = useCallback(
    (compId: string, pin: Pin, e: React.MouseEvent) => {
      if (e.button === 2) {
        isRightMouseDownRef.current = true;
        rightClickStartPosRef.current = { x: e.clientX, y: e.clientY };
        rightClickDidDragRef.current = false;
        const comp = components.find((c) => c.id === compId);
        const worldPos = screenToWorld(e.clientX, e.clientY);
        if (comp) {
          pendingContextMenuRef.current = {
            isOpen: true,
            x: e.clientX,
            y: e.clientY,
            worldX: worldPos.x,
            worldY: worldPos.y,
            targetType: 'component',
            targetComponent: comp,
            selectedComponentIds: [compId],
          };
        }
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        return;
      }
      e.stopPropagation();
      if (e.button !== 0) return;

      if (!drawingWire) {
        if (Date.now() - justFinishedWireRef.current < 250) {
          return;
        }

        const pinPos = getPinCoords(compId, pin.id);
        if (!pinPos) return;

        const autoColor = getAutoPinColor(pin);
        const activeColor = autoColor || currentWireColor;
        if (autoColor && onSelectWireColor) {
          onSelectWireColor(autoColor);
        }

        setDrawingWire({
          fromComponentId: compId,
          fromPin: pin,
          currentPoint: pinPos,
          waypoints: [],
          color: activeColor,
        });
        onSelectComponents([]);
        onSelectWire(null);
      } else {
        finishWireConnection(compId, pin);
      }
    },
    [
      drawingWire,
      getPinCoords,
      onSelectComponents,
      onSelectWire,
      finishWireConnection,
      currentWireColor,
      onSelectWireColor,
      pan,
      components,
      screenToWorld,
      setIsPanning,
      setPanStart,
      isRightMouseDownRef,
      rightClickStartPosRef,
      rightClickDidDragRef,
      pendingContextMenuRef,
    ]
  );

  // Pin MouseUp
  const handlePinMouseUp = useCallback(
    (compId: string, pin: Pin, e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.button !== 0) return;

      if (drawingWire) {
        if (drawingWire.fromComponentId !== compId || drawingWire.fromPin?.id !== pin.id) {
          finishWireConnection(compId, pin);
        }
      }
    },
    [drawingWire, finishWireConnection]
  );

  // Pin hover
  const handlePinMouseEnter = useCallback(
    (compId: string, pin: Pin, e: React.MouseEvent) => {
      const comp = components.find((c) => c.id === compId);
      if (comp) {
        setHoveredPinInfo({
          component: comp,
          pin,
          screenX: e.clientX,
          screenY: e.clientY,
        });
      }
    },
    [components]
  );

  const handlePinMouseLeave = useCallback(() => {
    setHoveredPinInfo(null);
  }, []);

  // Cancel drawing wire or endpoint dragging on Escape key, or quick wire color hotkeys (1-9, C)
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      const isInput =
        activeTag === 'input' ||
        activeTag === 'textarea' ||
        document.activeElement?.getAttribute('contenteditable') === 'true';

      if (e.key === 'Escape') {
        if (drawingWire) {
          setDrawingWire(null);
          setHoveredPinInfo(null);
          setHoveredWireSnap(null);
        }
        if (draggingEndpoint) {
          setDraggingEndpoint(null);
          setHoveredPinInfo(null);
          setHoveredWireSnap(null);
        }
        return;
      }

      // Quick Wire Color Switching (1-9 and C)
      if (!isInput && (drawingWire || selectedWireId)) {
        const colorPalette = [
          '#1e293b', // 1: Black (GND)
          '#ef4444', // 2: Red (5V / VCC)
          '#38bdf8', // 3: Sky / Signal
          '#10b981', // 4: Emerald / Green
          '#eab308', // 5: Yellow (SCL)
          '#f97316', // 6: Orange (PWM)
          '#a855f7', // 7: Purple (SDA)
          '#f8fafc', // 8: White
          '#3b82f6', // 9: Blue
        ];

        if (e.key >= '1' && e.key <= '9') {
          const idx = parseInt(e.key, 10) - 1;
          const chosenColor = colorPalette[idx];
          if (chosenColor) {
            if (onSelectWireColor) onSelectWireColor(chosenColor);
            if (drawingWire) {
              setDrawingWire((prev) => (prev ? { ...prev, color: chosenColor } : null));
            }
            if (selectedWireId && onUpdateWire) {
              onUpdateWire(selectedWireId, { color: chosenColor });
            }
          }
        } else if (e.key.toLowerCase() === 'c') {
          const cur = drawingWire?.color || currentWireColor;
          const curIdx = colorPalette.indexOf(cur);
          const nextColor = colorPalette[(curIdx + 1) % colorPalette.length]!;
          if (onSelectWireColor) onSelectWireColor(nextColor);
          if (drawingWire) {
            setDrawingWire((prev) => (prev ? { ...prev, color: nextColor } : null));
          }
          if (selectedWireId && onUpdateWire) {
            onUpdateWire(selectedWireId, { color: nextColor });
          }
        } else if (e.key.toLowerCase() === 'w') {
          // Shortcut W: Start drawing wire from hovered pin or complete wire connection
          if (!drawingWire && hoveredPinInfo) {
            e.preventDefault();
            const pinPos = getPinCoords(hoveredPinInfo.component.id, hoveredPinInfo.pin.id);
            if (pinPos) {
              const autoColor = getAutoPinColor(hoveredPinInfo.pin) || currentWireColor;
              if (onSelectWireColor) onSelectWireColor(autoColor);
              setDrawingWire({
                fromComponentId: hoveredPinInfo.component.id,
                fromPin: hoveredPinInfo.pin,
                currentPoint: pinPos,
                waypoints: [],
                color: autoColor,
              });
              onSelectComponents([]);
              onSelectWire(null);
            }
          } else if (drawingWire) {
            if (hoveredPinInfo) {
              e.preventDefault();
              finishWireConnection(hoveredPinInfo.component.id, hoveredPinInfo.pin);
            } else if (hoveredWireSnap) {
              e.preventDefault();
              finishWireToWireConnection(hoveredWireSnap.wire, hoveredWireSnap.point);
            }
          }
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [
    drawingWire,
    draggingEndpoint,
    hoveredPinInfo,
    hoveredWireSnap,
    getPinCoords,
    finishWireConnection,
    finishWireToWireConnection,
    selectedWireId,
    currentWireColor,
    onSelectWireColor,
    onSelectComponents,
    onSelectWire,
    onUpdateWire,
  ]);

  return {
    drawingWire,
    setDrawingWire,
    hoveredPinInfo,
    setHoveredPinInfo,
    hoveredWireSnap,
    setHoveredWireSnap,
    draggingEndpoint,
    setDraggingEndpoint,
    liveWireWaypointsMap,
    liveWireJunctionsMap,
    finishWireConnection,
    finishWireToWireConnection,
    handleStartEndpointDrag,
    handleStartSegmentDrag,
    handleStartJunctionDrag,
    handleStartCornerDrag,
    handleStartMidpointDrag,
    handlePinMouseDown,
    handlePinMouseUp,
    handlePinMouseEnter,
    handlePinMouseLeave,
    shiftWireX,
    shiftWireY,
    getConnectedNetCluster,
  };
}
