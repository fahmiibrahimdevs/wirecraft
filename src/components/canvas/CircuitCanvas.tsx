import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { CircuitComponent, ComponentDefinition, Wire, Pin, WirePoint, WireRouting } from '../../types/circuit';
import { COMPONENT_DEFINITIONS } from '../../constants/components';
import { getAllComponentDefinitions, CUSTOM_COMPONENTS_EVENT } from '../../utils/customComponents';
import { getPinWorldPosition, generateWirePath, snapToGrid, getAutoPinColor, getAutoWireColor, getPinDirection, PinDirection, getClosestPointOnPath, getSmartWireSnapPoint, resolveCircuitNetSignals } from '../../utils/geometry';
import { sortWiresForRendering, resolveAllWireEndpoints, Point, cleanAndSimplifyWaypoints } from '../../utils/orthogonalRouter';
import { ComponentSvg } from './ComponentSvg';
import { WireSvg } from './WireSvg';
import { ContextMenuState } from '../menu/ContextMenu';
import { Zap } from 'lucide-react';
import { detectAvailableBusConnections, generateBusWires } from '../../utils/autoBusRouter';

interface CircuitCanvasProps {
  components: CircuitComponent[];
  wires: Wire[];
  selectedComponentIds: string[];
  selectedWireId: string | null;
  currentWireColor: string;
  onSelectWireColor?: (color: string) => void;
  wireRouting: WireRouting;
  snapGrid: boolean;
  onSelectComponents: (ids: string[]) => void;
  onSelectWire: (id: string | null) => void;
  onUpdateComponentPositions: (updates: { id: string; x: number; y: number }[], isFinal?: boolean) => void;
  onAddWire: (wire: Omit<Wire, 'id'>) => void;
  onAddMultipleWires?: (wires: Omit<Wire, 'id'>[]) => void;
  onUpdateWire?: (id: string, updates: Partial<Wire>) => void;
  onDeleteSelected: () => void;
  onUpdateWireWaypoints?: (id: string, waypoints: WirePoint[]) => void;
  onUpdateMultiWireWaypoints?: (updates: { id: string; waypoints: WirePoint[]; fromPoint?: WirePoint; toPoint?: WirePoint }[]) => void;
  onResetWireWaypoints?: (id: string) => void;
  zoom: number;
  pan: WirePoint;
  showWireMarkers?: boolean;
  onZoomChange: (newZoom: number) => void;
  onPanChange: (newPan: WirePoint) => void;
  onContextMenu: (state: ContextMenuState) => void;
  onCursorMove?: (worldPos: WirePoint) => void;
  startBranchWireRequest?: { wire: Wire; point: WirePoint; timestamp: number } | null;
}

export const CircuitCanvas: React.FC<CircuitCanvasProps> = ({
  components,
  wires,
  selectedComponentIds,
  selectedWireId,
  currentWireColor,
  onSelectWireColor,
  wireRouting,
  snapGrid,
  showWireMarkers = true,
  onSelectComponents,
  onSelectWire,
  onUpdateComponentPositions,
  onAddWire,
  onAddMultipleWires,
  onUpdateWire,
  onDeleteSelected,
  onUpdateWireWaypoints,
  onUpdateMultiWireWaypoints,
  onResetWireWaypoints,
  zoom,
  pan,
  onZoomChange,
  onPanChange,
  onContextMenu,
  onCursorMove,
  startBranchWireRequest,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Multi-Dragging state for components
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<WirePoint>({ x: 0, y: 0 });
  const dragGroupInitPosRef = useRef<Map<string, WirePoint>>(new Map());
  const dragRafIdRef = useRef<number | null>(null);
  const pendingUpdatesRef = useRef<{ id: string; x: number; y: number }[] | null>(null);

  // Marquee Drag Selection Box state
  const [marqueeStart, setMarqueeStart] = useState<WirePoint | null>(null);
  const [marqueeCurrent, setMarqueeCurrent] = useState<WirePoint | null>(null);

  // Panning state for canvas
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<WirePoint>({ x: 0, y: 0 });

  // Wire drawing state (supports starting from a pin or from another wire)
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

  // Interactive Wire Endpoint Drag (Re-attaching or Sliding Junctions)
  const [draggingEndpoint, setDraggingEndpoint] = useState<{
    wireId: string;
    endpoint: 'start' | 'end';
    currentPoint: WirePoint;
  } | null>(null);

  // Live Multi-Wire Synchronized Drag Waypoints & Junctions Maps
  const [liveWireWaypointsMap, setLiveWireWaypointsMap] = useState<Map<string, Point[]>>(new Map());
  const [liveWireJunctionsMap, setLiveWireJunctionsMap] = useState<Map<string, Point[]>>(new Map());

  // Custom Component Unified Definitions state
  const [allDefs, setAllDefs] = useState<Record<string, any>>(() => getAllComponentDefinitions());

  useEffect(() => {
    const handleUpdate = () => {
      setAllDefs(getAllComponentDefinitions());
    };
    window.addEventListener(CUSTOM_COMPONENTS_EVENT, handleUpdate);
    return () => window.removeEventListener(CUSTOM_COMPONENTS_EVENT, handleUpdate);
  }, []);

  // Incremental Pin World Coordinate & Direction Cache: Only recalculate moved components!
  const pinCacheRef = useRef<Map<string, { x: number; y: number; rot: number; def: any; pins: Map<string, WirePoint>; dirs: Map<string, PinDirection> }>>(new Map());

  const { pinWorldMap, pinDirMap } = useMemo(() => {
    const fullPosMap = new Map<string, WirePoint>();
    const fullDirMap = new Map<string, PinDirection>();
    const currentCache = pinCacheRef.current;
    const newCache = new Map<string, { x: number; y: number; rot: number; def: any; pins: Map<string, WirePoint>; dirs: Map<string, PinDirection> }>();

    for (const comp of components) {
      const def = allDefs[comp.type] || COMPONENT_DEFINITIONS[comp.type];
      if (!def) continue;

      const cached = currentCache.get(comp.id);
      if (
        cached &&
        cached.x === comp.x &&
        cached.y === comp.y &&
        cached.rot === comp.rotation &&
        cached.def === def &&
        cached.pins.size === def.pins.length
      ) {
        // Reuse cached pins and directions without math!
        newCache.set(comp.id, cached);
        cached.pins.forEach((pos, key) => fullPosMap.set(key, pos));
        cached.dirs.forEach((dir, key) => fullDirMap.set(key, dir));
      } else {
        // Compute only for this specific moved component
        const compPinMap = new Map<string, WirePoint>();
        const compDirMap = new Map<string, PinDirection>();
        for (const pin of def.pins) {
          const pos = getPinWorldPosition(comp.x, comp.y, def.width, def.height, comp.rotation, pin);
          const dir = getPinDirection(def.width, def.height, comp.rotation, pin);
          const key = `${comp.id}:${pin.id}`;
          compPinMap.set(key, pos);
          compDirMap.set(key, dir);
          fullPosMap.set(key, pos);
          fullDirMap.set(key, dir);
        }
        newCache.set(comp.id, { x: comp.x, y: comp.y, rot: comp.rotation, def, pins: compPinMap, dirs: compDirMap });
      }
    }

    pinCacheRef.current = newCache;
    return { pinWorldMap: fullPosMap, pinDirMap: fullDirMap };
  }, [components, allDefs]);

  // Memoized sorted components with intelligent layer and depth sorting
  const sortedComponents = useMemo(() => {
    const getOrder = (type: string) => {
      // Layer 0: Breadboards (always background foundation)
      if (
        type === 'breadboard-half' ||
        type === 'breadboard-mini' ||
        type === 'breadboard-full' ||
        type.startsWith('breadboard')
      )
        return 0;

      // Layer 1: Dev boards and power supplies
      if (
        type === 'arduino-uno' ||
        type === 'arduino-nano' ||
        type === 'nodemcu-v1' ||
        type === 'nodemcu-ch340' ||
        type === 'ftdi-ft232rl' ||
        type === 'raspberry-pico' ||
        type.startsWith('esp32') ||
        type.startsWith('wemos') ||
        type === 'battery-9v'
      )
        return 1;

      // Layer 2: Modules, sensors, displays, switches
      if (
        type.startsWith('display-') ||
        type.startsWith('sensor-') ||
        type === 'servo' ||
        type === 'fitting-lamp' ||
        type === 'steker-switch'
      )
        return 2;

      // Layer 3: Bulky standard components (LEDs, buzzers, speakers, buttons, potentiometers)
      if (
        type === 'led' ||
        type === 'rgb-led' ||
        type === 'buzzer' ||
        type === 'speaker' ||
        type === 'potentiometer' ||
        type.startsWith('push-button')
      )
        return 3;

      // Layer 4: Passives with thin leads (Resistors, Capacitors, etc.) that should sit on top
      if (type === 'resistor' || type === 'capacitor')
        return 4;

      return 3;
    };

    return [...components].sort((a, b) => {
      const orderA = getOrder(a.type);
      const orderB = getOrder(b.type);
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      // Within the same layer: components higher up (smaller y) render in front of components below (larger y)
      // so top components remain cleanly visible without being occluded by bottom components
      if (Math.abs(a.y - b.y) > 1) {
        return b.y - a.y;
      }
      return 0;
    });
  }, [components]);

  // Transform screen client coords to canvas world coords
  const screenToWorld = useCallback(
    (clientX: number, clientY: number): WirePoint => {
      if (!containerRef.current) return { x: 0, y: 0 };
      const rect = containerRef.current.getBoundingClientRect();
      const rawX = clientX - rect.left;
      const rawY = clientY - rect.top;
      return {
        x: (rawX - pan.x) / zoom,
        y: (rawY - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  // Reference to prevent accidental double-click / immediate wire creation right after finishing a wire
  const justFinishedWireRef = useRef<number>(0);

  // References for right-click drag pan vs context menu click detection
  const rightClickStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const rightClickDidDragRef = useRef<boolean>(false);
  const isRightMouseDownRef = useRef<boolean>(false);
  const pendingContextMenuRef = useRef<ContextMenuState | null>(null);

  // Helper to trigger pending context menu on mouseup only if no drag occurred
  const handleRightClickUp = useCallback(
    (clientX: number, clientY: number) => {
      isRightMouseDownRef.current = false;
      if (!rightClickDidDragRef.current && pendingContextMenuRef.current) {
        const state = pendingContextMenuRef.current;
        state.x = clientX;
        state.y = clientY;
        onContextMenu(state);
      }
      pendingContextMenuRef.current = null;
      rightClickStartPosRef.current = null;
      rightClickDidDragRef.current = false;
    },
    [onContextMenu]
  );

  // Global capture-phase listener to prevent default browser context menu on canvas
  useEffect(() => {
    const handleCaptureContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (containerRef.current && (containerRef.current === target || containerRef.current.contains(target))) {
        e.preventDefault();
      }
    };

    window.addEventListener('contextmenu', handleCaptureContextMenu, true);
    return () => {
      window.removeEventListener('contextmenu', handleCaptureContextMenu, true);
    };
  }, []);

  // Global mouse listeners for ultra-smooth panning across window
  useEffect(() => {
    if (!isPanning) return;
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (rightClickStartPosRef.current) {
        const dist = Math.hypot(
          e.clientX - rightClickStartPosRef.current.x,
          e.clientY - rightClickStartPosRef.current.y
        );
        if (dist > 3) {
          rightClickDidDragRef.current = true;
          pendingContextMenuRef.current = null;
        }
      }
      onPanChange({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    };
    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (e.button === 2 || isRightMouseDownRef.current) {
        handleRightClickUp(e.clientX, e.clientY);
      }
      setIsPanning(false);
    };
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isPanning, panStart, onPanChange, handleRightClickUp]);

  // Helper to find pin world coordinate in O(1)
  const getPinCoords = useCallback(
    (compId: string, pinId: string): WirePoint | null => {
      return pinWorldMap.get(`${compId}:${pinId}`) || null;
    },
    [pinWorldMap]
  );

  // Helper to find pin escape direction in O(1)
  const getPinDirectionHelper = useCallback(
    (compId: string, pinId: string): PinDirection | undefined => {
      return pinDirMap.get(`${compId}:${pinId}`);
    },
    [pinDirMap]
  );

  // Dynamically resolved wire endpoints (handles both Pin connections and Wire-to-Wire T-Junctions)
  const resolvedWiresMap = useMemo(() => {
    return resolveAllWireEndpoints(wires, getPinCoords, getPinDirectionHelper);
  }, [wires, getPinCoords, getPinDirectionHelper]);

  // Propagate canonical net signal names across the entire electrical circuit
  const resolvedNetSignals = useMemo(() => {
    return resolveCircuitNetSignals(components, wires, allDefs, getPinCoords);
  }, [components, wires, allDefs, getPinCoords]);

  // Detect available smart auto-wiring protocol buses between 2 selected components
  const detectedBusOptions = useMemo(() => {
    if (selectedComponentIds.length !== 2) return [];
    const compA = components.find((c) => c.id === selectedComponentIds[0]);
    const compB = components.find((c) => c.id === selectedComponentIds[1]);
    if (!compA || !compB) return [];
    return detectAvailableBusConnections(compA, compB, allDefs, wires);
  }, [selectedComponentIds, components, allDefs, wires]);

  // Handle external request to branch wire from context menu
  useEffect(() => {
    if (!startBranchWireRequest) return;
    const resolved = resolvedWiresMap.get(startBranchWireRequest.wire.id);
    const snapPoint = (resolved && resolved.waypoints.length >= 2)
      ? (getSmartWireSnapPoint(startBranchWireRequest.point, resolved.waypoints, null, snapGrid)?.point || startBranchWireRequest.point)
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
      if (drawingWire.fromComponentId === targetCompId && drawingWire.fromPin?.id === targetPin.id) {
        return;
      }

      const fromPin = drawingWire.fromPin;
      const finalColor = fromPin
        ? getAutoWireColor(fromPin, targetPin, drawingWire.color || currentWireColor)
        : (drawingWire.color || currentWireColor);

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
          ? (resolved?.start ||
              (wire.fromComponentId && wire.fromPinId
                ? getPinCoords(wire.fromComponentId, wire.fromPinId)
                : wire.fromPoint) || { x: 0, y: 0 })
          : (resolved?.end ||
              (wire.toComponentId && wire.toPinId
                ? getPinCoords(wire.toComponentId, wire.toPinId)
                : wire.toPoint) || { x: 0, y: 0 });

      const otherEndPos =
        endpoint === 'start'
          ? (resolved?.end || null)
          : (resolved?.start || null);

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
            ) continue;
            if (
              endpoint === 'end' &&
              wire.fromComponentId === comp.id &&
              wire.fromPinId === pin.id
            ) continue;

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
        // If released in empty canvas, automatically reverts to original point (no update applied!)

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
  const getConnectedNetCluster = useCallback((startWireId: string): Set<string> => {
    const cluster = new Set<string>([startWireId]);
    const queue = [startWireId];

    while (queue.length > 0) {
      const currId = queue.shift()!;
      const curr = resolvedWiresMap.get(currId);
      if (!curr) continue;

      curr.connectedWireIds.forEach((neighborId) => {
        if (!cluster.has(neighborId)) {
          cluster.add(neighborId);
          queue.push(neighborId);
        }
      });
    }

    return cluster;
  }, [resolvedWiresMap]);

  // Helper: Shift wire vertical drop / junction X coordinate cleanly
  const shiftWireX = useCallback((
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

      if (i === 0 && startPinPos && Math.abs(curr.x - startPinPos.x) <= 4 && Math.abs(curr.y - startPinPos.y) <= 4) {
        pts.push({ ...curr });
        if (Math.abs(newX - startPinPos.x) > 2) {
          pts.push({ x: newX, y: startPinPos.y });
        }
      } else if (i === initialPts.length - 1 && endPinPos && Math.abs(curr.x - endPinPos.x) <= 4 && Math.abs(curr.y - endPinPos.y) <= 4) {
        if (Math.abs(newX - endPinPos.x) > 2) {
          pts.push({ x: newX, y: endPinPos.y });
        }
        pts.push({ ...curr });
      } else {
        pts.push({ x: newX, y: curr.y });
      }
    }

    return cleanAndSimplifyWaypoints(pts);
  }, []);

  // Helper: Shift wire horizontal bus Y coordinate cleanly
  const shiftWireY = useCallback((
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

      if (i === 0 && startPinPos && Math.abs(curr.y - startPinPos.y) <= 4 && Math.abs(curr.x - startPinPos.x) <= 4) {
        pts.push({ ...curr });
        if (Math.abs(newY - startPinPos.y) > 2) {
          pts.push({ x: startPinPos.x, y: newY });
        }
      } else if (i === initialPts.length - 1 && endPinPos && Math.abs(curr.y - endPinPos.y) <= 4 && Math.abs(curr.x - endPinPos.x) <= 4) {
        if (Math.abs(newY - endPinPos.y) > 2) {
          pts.push({ x: endPinPos.x, y: newY });
        }
        pts.push({ ...curr });
      } else {
        pts.push({ x: curr.x, y: newY });
      }
    }

    return cleanAndSimplifyWaypoints(pts);
  }, []);

  // Synchronized Segment Drag (Single or Multi-wire bus/drop line with auto-stretching and junction tracking)
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
        initialWaypointsMap.set(wId, res.waypoints.map((p) => ({ ...p })));
        initialJunctionsMap.set(wId, res.junctionPoints.map((p) => ({ ...p })));
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

            const startPinPos = (res.wire.fromComponentId && res.wire.fromPinId)
              ? getPinCoords(res.wire.fromComponentId, res.wire.fromPinId)
              : null;
            const endPinPos = (res.wire.toComponentId && res.wire.toPinId)
              ? getPinCoords(res.wire.toComponentId, res.wire.toPinId)
              : null;

            const shifted = shiftWireX(initPts, initSegX, newX, startPinPos, endPinPos);
            newWaypointsMap.set(cId, shifted);

            const initFrom = initialFromPointsMap.get(cId);
            if (initFrom) {
              newFromPointsMap.set(cId, Math.abs(initFrom.x - initSegX) <= 6 ? { ...initFrom, x: newX } : { ...initFrom });
            }
            const initTo = initialToPointsMap.get(cId);
            if (initTo) {
              newToPointsMap.set(cId, Math.abs(initTo.x - initSegX) <= 6 ? { ...initTo, x: newX } : { ...initTo });
            }
          });

          initialJunctionsMap.forEach((jps, wId) => {
            if (cluster.has(wId)) {
              const updatedJps = jps.map((jp) => (Math.abs(jp.x - initSegX) <= 4 ? { ...jp, x: newX } : { ...jp }));
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

            const startPinPos = (res.wire.fromComponentId && res.wire.fromPinId)
              ? getPinCoords(res.wire.fromComponentId, res.wire.fromPinId)
              : null;
            const endPinPos = (res.wire.toComponentId && res.wire.toPinId)
              ? getPinCoords(res.wire.toComponentId, res.wire.toPinId)
              : null;

            const shifted = shiftWireY(initPts, initSegY, newY, startPinPos, endPinPos);
            newWaypointsMap.set(cId, shifted);

            const initFrom = initialFromPointsMap.get(cId);
            if (initFrom) {
              newFromPointsMap.set(cId, Math.abs(initFrom.y - initSegY) <= 6 ? { ...initFrom, y: newY } : { ...initFrom });
            }
            const initTo = initialToPointsMap.get(cId);
            if (initTo) {
              newToPointsMap.set(cId, Math.abs(initTo.y - initSegY) <= 6 ? { ...initTo, y: newY } : { ...initTo });
            }
          });

          initialJunctionsMap.forEach((jps, wId) => {
            if (cluster.has(wId)) {
              const updatedJps = jps.map((jp) => (Math.abs(jp.y - initSegY) <= 4 ? { ...jp, y: newY } : { ...jp }));
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

        const updates: { id: string; waypoints: WirePoint[]; fromPoint?: WirePoint; toPoint?: WirePoint }[] = [];
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
    [resolvedWiresMap, zoom, onSelectWire, onSelectComponents, onUpdateMultiWireWaypoints, onUpdateWireWaypoints, getConnectedNetCluster, shiftWireX, shiftWireY, getPinCoords]
  );

  // Synchronized Junction Drag (Direct Slider along bus lines)
  const handleStartJunctionDrag = useCallback(
    (wire: Wire, junctionIndex: number, jp: Point, isVerticalBus: boolean, e: React.PointerEvent) => {
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
        initialWaypointsMap.set(wId, res.waypoints.map((p) => ({ ...p })));
        initialJunctionsMap.set(wId, res.junctionPoints.map((p) => ({ ...p })));
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

            const startPinPos = (res.wire.fromComponentId && res.wire.fromPinId)
              ? getPinCoords(res.wire.fromComponentId, res.wire.fromPinId)
              : null;
            const endPinPos = (res.wire.toComponentId && res.wire.toPinId)
              ? getPinCoords(res.wire.toComponentId, res.wire.toPinId)
              : null;

            const shifted = shiftWireX(initPts, jp.x, newX, startPinPos, endPinPos);
            newWaypointsMap.set(cId, shifted);

            const initFrom = initialFromPointsMap.get(cId);
            if (initFrom) {
              newFromPointsMap.set(cId, Math.abs(initFrom.x - jp.x) <= 6 ? { ...initFrom, x: newX } : { ...initFrom });
            }
            const initTo = initialToPointsMap.get(cId);
            if (initTo) {
              newToPointsMap.set(cId, Math.abs(initTo.x - jp.x) <= 6 ? { ...initTo, x: newX } : { ...initTo });
            }
          });

          initialJunctionsMap.forEach((jps, wId) => {
            if (cluster.has(wId)) {
              const updatedJps = jps.map((p) => (Math.hypot(p.x - jp.x, p.y - jp.y) <= 4 ? { ...p, x: newX } : { ...p }));
              newJunctionsMap.set(wId, updatedJps);
            }
          });
        } else {
          const newY = Math.round((jp.y + dy) / 4) * 4;

          cluster.forEach((cId) => {
            const res = resolvedWiresMap.get(cId);
            const initPts = initialWaypointsMap.get(cId);
            if (!res || !initPts) return;

            const startPinPos = (res.wire.fromComponentId && res.wire.fromPinId)
              ? getPinCoords(res.wire.fromComponentId, res.wire.fromPinId)
              : null;
            const endPinPos = (res.wire.toComponentId && res.wire.toPinId)
              ? getPinCoords(res.wire.toComponentId, res.wire.toPinId)
              : null;

            const shifted = shiftWireY(initPts, jp.y, newY, startPinPos, endPinPos);
            newWaypointsMap.set(cId, shifted);

            const initFrom = initialFromPointsMap.get(cId);
            if (initFrom) {
              newFromPointsMap.set(cId, Math.abs(initFrom.y - jp.y) <= 6 ? { ...initFrom, y: newY } : { ...initFrom });
            }
            const initTo = initialToPointsMap.get(cId);
            if (initTo) {
              newToPointsMap.set(cId, Math.abs(initTo.y - jp.y) <= 6 ? { ...initTo, y: newY } : { ...initTo });
            }
          });

          initialJunctionsMap.forEach((jps, wId) => {
            if (cluster.has(wId)) {
              const updatedJps = jps.map((p) => (Math.hypot(p.x - jp.x, p.y - jp.y) <= 4 ? { ...p, y: newY } : { ...p }));
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

        const updates: { id: string; waypoints: WirePoint[]; fromPoint?: WirePoint; toPoint?: WirePoint }[] = [];
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
    [resolvedWiresMap, zoom, onSelectWire, onSelectComponents, onUpdateMultiWireWaypoints, onUpdateWireWaypoints, getConnectedNetCluster, shiftWireX, shiftWireY, getPinCoords]
  );

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
      if (initialPoints.length < 3 || pointIndex <= 0 || pointIndex >= initialPoints.length - 1) return;

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
        const isPrevH = Math.abs(initialPoints[pointIndex - 1]!.y - initialPoints[pointIndex]!.y) <= 2;

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
      if (initialPoints.length < 2 || segIndex < 0 || segIndex >= initialPoints.length - 1) return;

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
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [drawingWire, draggingEndpoint, selectedWireId, currentWireColor, onSelectWireColor, onUpdateWire]);

  // Handle Mouse Down on Canvas Background
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // If drawing wire:
    if (drawingWire) {
      if (e.button === 0) {
        // If hovered on wire snap target, complete connection!
        if (hoveredWireSnap) {
          finishWireToWireConnection(hoveredWireSnap.wire, hoveredWireSnap.point);
          return;
        }
        // If hovered on pin target, complete connection!
        if (hoveredPinInfo) {
          finishWireConnection(hoveredPinInfo.component.id, hoveredPinInfo.pin);
          return;
        }
        // Else: Clicking on canvas adds intermediate bend waypoint
        const worldPos = screenToWorld(e.clientX, e.clientY);
        setDrawingWire((prev) => (prev ? { ...prev, waypoints: [...prev.waypoints, worldPos] } : null));
      } else if (e.button === 2) {
        // Right click cancels wire drawing
        setDrawingWire(null);
        setHoveredPinInfo(null);
        setHoveredWireSnap(null);
        pendingContextMenuRef.current = null;
      }
      return;
    }

    // Right click on empty canvas: Start right-click drag pan (queue context menu on mouseup if not dragged)
    if (e.button === 2) {
      isRightMouseDownRef.current = true;
      rightClickStartPosRef.current = { x: e.clientX, y: e.clientY };
      rightClickDidDragRef.current = false;
      const worldPos = screenToWorld(e.clientX, e.clientY);
      pendingContextMenuRef.current = {
        isOpen: true,
        x: e.clientX,
        y: e.clientY,
        worldX: worldPos.x,
        worldY: worldPos.y,
        targetType: 'canvas',
      };
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    // Middle click: Pan canvas
    if (e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    // Left click on empty canvas: Smooth Left-Click Drag Pan (or Marquee Box if Ctrl/Cmd/Shift is held)
    if (e.button === 0 && (e.target === containerRef.current || (e.target as HTMLElement)?.tagName === 'svg')) {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey || e.shiftKey;
      if (isCmdOrCtrl) {
        const worldPos = screenToWorld(e.clientX, e.clientY);
        setMarqueeStart(worldPos);
        setMarqueeCurrent(worldPos);
      } else {
        onSelectComponents([]);
        onSelectWire(null);
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    }
  };

  // Handle Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    const worldPos = screenToWorld(e.clientX, e.clientY);
    if (onCursorMove) {
      onCursorMove(worldPos);
    }

    // 1. If panning canvas
    if (isPanning) {
      if (rightClickStartPosRef.current) {
        const dist = Math.hypot(
          e.clientX - rightClickStartPosRef.current.x,
          e.clientY - rightClickStartPosRef.current.y
        );
        if (dist > 3) {
          rightClickDidDragRef.current = true;
          pendingContextMenuRef.current = null;
        }
      }
      onPanChange({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    // 2. If Marquee Box Selecting
    if (marqueeStart) {
      setMarqueeCurrent(worldPos);
      return;
    }

    // 3. If dragging component(s)
    if (draggingCompId) {
      let newX = worldPos.x - dragOffset.x;
      let newY = worldPos.y - dragOffset.y;

      const isBreadboardType = (t: string) =>
        t === 'breadboard-half' || t === 'breadboard-mini' || t === 'breadboard-full';
      const draggingComp = components.find((c) => c.id === draggingCompId);
      const breadboards = components.filter((c) => isBreadboardType(c.type));

      let snappedToBreadboard = false;

      // Breadboard-to-Breadboard Seamless Docking
      if (draggingComp && isBreadboardType(draggingComp.type)) {
        const thisDef = allDefs[draggingComp.type] || COMPONENT_DEFINITIONS[draggingComp.type];
        const otherBreadboards = breadboards.filter((b) => b.id !== draggingCompId);
        if (thisDef && otherBreadboards.length > 0) {
          let bestSnapDist = Infinity;
          let snapX = newX;
          let snapY = newY;
          let didSnapBB = false;

          for (const otherBB of otherBreadboards) {
            const otherDef = allDefs[otherBB.type] || COMPONENT_DEFINITIONS[otherBB.type];
            if (!otherDef) continue;

            const snapY_below = otherBB.y + otherDef.height;
            if (Math.abs(newY - snapY_below) < 28 && Math.abs(newX - otherBB.x) < 35) {
              const d = Math.hypot(newX - otherBB.x, newY - snapY_below);
              if (d < bestSnapDist) {
                bestSnapDist = d;
                snapX = otherBB.x;
                snapY = snapY_below;
                didSnapBB = true;
              }
            }

            const snapY_above = otherBB.y - thisDef.height;
            if (Math.abs(newY - snapY_above) < 28 && Math.abs(newX - otherBB.x) < 35) {
              const d = Math.hypot(newX - otherBB.x, newY - snapY_above);
              if (d < bestSnapDist) {
                bestSnapDist = d;
                snapX = otherBB.x;
                snapY = snapY_above;
                didSnapBB = true;
              }
            }

            const snapX_right = otherBB.x + otherDef.width;
            if (Math.abs(newX - snapX_right) < 28 && Math.abs(newY - otherBB.y) < 35) {
              const d = Math.hypot(newX - snapX_right, newY - otherBB.y);
              if (d < bestSnapDist) {
                bestSnapDist = d;
                snapX = snapX_right;
                snapY = otherBB.y;
                didSnapBB = true;
              }
            }

            const snapX_left = otherBB.x - thisDef.width;
            if (Math.abs(newX - snapX_left) < 28 && Math.abs(newY - otherBB.y) < 35) {
              const d = Math.hypot(newX - snapX_left, newY - otherBB.y);
              if (d < bestSnapDist) {
                bestSnapDist = d;
                snapX = snapX_left;
                snapY = otherBB.y;
                didSnapBB = true;
              }
            }
          }

          if (didSnapBB) {
            newX = snapX;
            newY = snapY;
            snappedToBreadboard = true;
          }
        }
      }

      // Fast Magnetic Snapping: Test primary pin of dragging component against breadboard grid
      if (draggingComp && !isBreadboardType(draggingComp.type) && breadboards.length > 0) {
        const def = allDefs[draggingComp.type] || COMPONENT_DEFINITIONS[draggingComp.type];
        if (def && def.pins.length > 0) {
          const refPins = def.pins.slice(0, 2);
          let bestDist = Infinity;
          let snapDx = 0;
          let snapDy = 0;

          for (const refPin of refPins) {
            const pCandidate = getPinWorldPosition(
              newX,
              newY,
              def.width,
              def.height,
              draggingComp.rotation,
              refPin
            );

            for (const bb of breadboards) {
              const bbDef = allDefs[bb.type] || COMPONENT_DEFINITIONS[bb.type];
              if (!bbDef) continue;

              if (
                pCandidate.x < bb.x - 20 ||
                pCandidate.x > bb.x + bbDef.width + 20 ||
                pCandidate.y < bb.y - 20 ||
                pCandidate.y > bb.y + bbDef.height + 20
              ) {
                continue;
              }

              for (const bbPin of bbDef.pins) {
                const bbWorldX = bb.x + bbPin.x;
                const bbWorldY = bb.y + bbPin.y;

                if (Math.abs(pCandidate.x - bbWorldX) > 16 || Math.abs(pCandidate.y - bbWorldY) > 16) {
                  continue;
                }

                const dist = Math.hypot(pCandidate.x - bbWorldX, pCandidate.y - bbWorldY);
                if (dist < bestDist) {
                  bestDist = dist;
                  snapDx = bbWorldX - pCandidate.x;
                  snapDy = bbWorldY - pCandidate.y;
                }
              }
            }
          }

          if (bestDist <= 16) {
            newX += snapDx;
            newY += snapDy;
            snappedToBreadboard = true;
          }
        }
      }

      if (!snappedToBreadboard && snapGrid) {
        newX = snapToGrid(newX, 10);
        newY = snapToGrid(newY, 10);
      }

      // Calculate multi-component movement updates
      const primaryInitPos = dragGroupInitPosRef.current.get(draggingCompId);
      const deltaX = primaryInitPos ? newX - primaryInitPos.x : 0;
      const deltaY = primaryInitPos ? newY - primaryInitPos.y : 0;

      const updates: { id: string; x: number; y: number }[] = [];
      dragGroupInitPosRef.current.forEach((initPos, cId) => {
        updates.push({
          id: cId,
          x: initPos.x + deltaX,
          y: initPos.y + deltaY,
        });
      });

      pendingUpdatesRef.current = updates;

      if (dragRafIdRef.current === null) {
        dragRafIdRef.current = requestAnimationFrame(() => {
          dragRafIdRef.current = null;
          if (pendingUpdatesRef.current) {
            onUpdateComponentPositions(pendingUpdatesRef.current, false);
          }
        });
      }
      return;
    }

    // 4. If drawing wire
    if (drawingWire) {
      let snapPos = worldPos;
      let snapTarget: { component: CircuitComponent; pin: Pin } | null = null;
      let minDistance = 16;

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
          if (comp.id === drawingWire.fromComponentId && pin.id === drawingWire.fromPin?.id) {
            continue;
          }

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

      // Check for smart wire snapping (T-junction / Wire-to-Wire tap with perpendicular alignment)
      let wireSnapTarget: { wire: Wire; point: WirePoint } | null = null;
      const refPoint = drawingWire.fromPoint ||
        (drawingWire.fromComponentId && drawingWire.fromPin ? getPinCoords(drawingWire.fromComponentId, drawingWire.fromPin.id) : null);

      if (!snapTarget) {
        let minWireDist = 24;
        wires.forEach((w) => {
          if (w.id === drawingWire.fromWireId && drawingWire.waypoints.length === 0) {
            return;
          }
          const resolved = resolvedWiresMap.get(w.id);
          if (!resolved || resolved.waypoints.length < 2) return;

          const closest = getSmartWireSnapPoint(worldPos, resolved.waypoints, refPoint, snapGrid);
          if (closest && closest.distance < minWireDist) {
            minWireDist = closest.distance;
            wireSnapTarget = { wire: w, point: closest.point };
          }
        });
      }

      if (wireSnapTarget) {
        snapPos = (wireSnapTarget as { wire: Wire; point: WirePoint }).point;
        setHoveredWireSnap({
          wire: (wireSnapTarget as { wire: Wire; point: WirePoint }).wire,
          point: (wireSnapTarget as { wire: Wire; point: WirePoint }).point,
          screenX: e.clientX,
          screenY: e.clientY,
        });
        setHoveredPinInfo(null);
      } else {
        setHoveredWireSnap(null);
      }

      setDrawingWire((prev) => (prev ? { ...prev, currentPoint: snapPos } : null));

      if (snapTarget) {
        setHoveredPinInfo({
          component: snapTarget.component,
          pin: snapTarget.pin,
          screenX: e.clientX,
          screenY: e.clientY,
        });
      } else if (!wireSnapTarget) {
        setHoveredPinInfo(null);
      }
    }
  };

  // Handle Mouse Up
  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 2 || isRightMouseDownRef.current) {
      handleRightClickUp(e.clientX, e.clientY);
    }
    if (isPanning) setIsPanning(false);

    // Finalize Marquee Selection Box
    if (marqueeStart && marqueeCurrent) {
      const minX = Math.min(marqueeStart.x, marqueeCurrent.x);
      const maxX = Math.max(marqueeStart.x, marqueeCurrent.x);
      const minY = Math.min(marqueeStart.y, marqueeCurrent.y);
      const maxY = Math.max(marqueeStart.y, marqueeCurrent.y);

      if (maxX - minX > 5 || maxY - minY > 5) {
        const hits = components.filter((c) => {
          const def = allDefs[c.type] || COMPONENT_DEFINITIONS[c.type];
          const w = def?.width || 50;
          const h = def?.height || 50;
          return !(c.x + w < minX || c.x > maxX || c.y + h < minY || c.y > maxY);
        });

        const isMultiSelectKey = e.shiftKey || e.ctrlKey || e.metaKey;
        if (isMultiSelectKey) {
          const combined = Array.from(new Set([...selectedComponentIds, ...hits.map((c) => c.id)]));
          onSelectComponents(combined);
        } else {
          onSelectComponents(hits.map((c) => c.id));
        }
      }
      setMarqueeStart(null);
      setMarqueeCurrent(null);
    }

    if (dragRafIdRef.current !== null) {
      cancelAnimationFrame(dragRafIdRef.current);
      dragRafIdRef.current = null;
    }

    if (draggingCompId) {
      if (pendingUpdatesRef.current && pendingUpdatesRef.current.length > 0) {
        onUpdateComponentPositions(pendingUpdatesRef.current, true);
      }
      pendingUpdatesRef.current = null;
      dragGroupInitPosRef.current.clear();
      setDraggingCompId(null);
    }

    // If dragging a wire and released over a snapped target pin or wire, finish connection!
    if (drawingWire) {
      if (hoveredPinInfo) {
        if (
          hoveredPinInfo.component.id !== drawingWire.fromComponentId ||
          hoveredPinInfo.pin.id !== drawingWire.fromPin?.id
        ) {
          finishWireConnection(hoveredPinInfo.component.id, hoveredPinInfo.pin);
        }
      } else if (hoveredWireSnap) {
        finishWireToWireConnection(hoveredWireSnap.wire, hoveredWireSnap.point);
      }
    }
  };

  // Handle Zoom with mouse wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.25), 3.0);

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newPan = {
      x: mouseX - (mouseX - pan.x) * (newZoom / zoom),
      y: mouseY - (mouseY - pan.y) * (newZoom / zoom),
    };

    onZoomChange(newZoom);
    onPanChange(newPan);
  };

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
        // Prevent accidental wire creation right after finishing a wire connection
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
    [drawingWire, getPinCoords, onSelectComponents, onSelectWire, finishWireConnection, currentWireColor, onSelectWireColor, pan, components, screenToWorld]
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

// Helper to check if a component is mounted on / inside a breadboard's area
function isComponentOnBreadboard(
  comp: CircuitComponent,
  cDef: ComponentDefinition | undefined,
  bb: CircuitComponent,
  bbDef: ComponentDefinition | undefined
): boolean {
  if (!bbDef) return false;
  const margin = 15;
  const bbMinX = bb.x - margin;
  const bbMaxX = bb.x + bbDef.width + margin;
  const bbMinY = bb.y - margin;
  const bbMaxY = bb.y + bbDef.height + margin;

  const width = cDef?.width || 30;
  const height = cDef?.height || 30;

  if (cDef?.pins && cDef.pins.length > 0) {
    const hasPinOnBb = cDef.pins.some((pin: Pin) => {
      const p = getPinWorldPosition(comp.x, comp.y, width, height, comp.rotation, pin);
      return p.x >= bbMinX && p.x <= bbMaxX && p.y >= bbMinY && p.y <= bbMaxY;
    });
    if (hasPinOnBb) return true;
  }

  const cx = comp.x + width / 2;
  const cy = comp.y + height / 2;
  return cx >= bbMinX && cx <= bbMaxX && cy >= bbMinY && cy <= bbMaxY;
}

  // Component Mouse Down (Single or Multi-select with CTRL/CMD, Group Drag initiation)
  const handleComponentMouseDown = useCallback(
    (comp: CircuitComponent, e: React.MouseEvent) => {
      if (drawingWire) return;
      if (e.button === 2) {
        isRightMouseDownRef.current = true;
        rightClickStartPosRef.current = { x: e.clientX, y: e.clientY };
        rightClickDidDragRef.current = false;
        const worldPos = screenToWorld(e.clientX, e.clientY);
        let nextSelected = selectedComponentIds;
        if (!selectedComponentIds.includes(comp.id)) {
          nextSelected = [comp.id];
          onSelectComponents(nextSelected);
        }
        pendingContextMenuRef.current = {
          isOpen: true,
          x: e.clientX,
          y: e.clientY,
          worldX: worldPos.x,
          worldY: worldPos.y,
          targetType: 'component',
          targetComponent: comp,
          selectedComponentIds: nextSelected,
        };
        setIsPanning(true);
        setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        return;
      }
      if (e.button !== 0) return; // only left click
      e.stopPropagation();

      const isMultiSelectKey = e.shiftKey || e.ctrlKey || e.metaKey;

      let nextSelectedIds = selectedComponentIds;
      if (isMultiSelectKey) {
        // Toggle selection
        nextSelectedIds = selectedComponentIds.includes(comp.id)
          ? selectedComponentIds.filter((id) => id !== comp.id)
          : [...selectedComponentIds, comp.id];
        onSelectComponents(nextSelectedIds);
        onSelectWire(null);
      } else {
        // If clicking on an already selected component in a group, maintain the group selection
        if (!selectedComponentIds.includes(comp.id)) {
          nextSelectedIds = [comp.id];
          onSelectComponents(nextSelectedIds);
          onSelectWire(null);
        }
      }

      // If component is locked, do NOT initiate drag
      if (comp.locked) {
        return;
      }

      // Collect all selected components that are NOT locked to drag together
      let dragGroup: CircuitComponent[] = [];
      if (comp.type.startsWith('breadboard')) {
        const bbDef = allDefs[comp.type] || COMPONENT_DEFINITIONS[comp.type];
        const mounted = bbDef
          ? components.filter((c) => {
              if (c.id === comp.id || c.type.startsWith('breadboard')) return false;
              const cDef = allDefs[c.type] || COMPONENT_DEFINITIONS[c.type];
              return isComponentOnBreadboard(c, cDef, comp, bbDef);
            })
          : [];

        const combined = new Map<string, CircuitComponent>();
        combined.set(comp.id, comp);
        mounted.forEach((c) => combined.set(c.id, c));
        if (nextSelectedIds.length > 1) {
          components.forEach((c) => {
            if (nextSelectedIds.includes(c.id) && !c.locked) {
              combined.set(c.id, c);
            }
          });
        }
        dragGroup = Array.from(combined.values());
      } else {
        const activeToDrag = components.filter(
          (c) => nextSelectedIds.includes(c.id) && !c.locked
        );
        dragGroup = activeToDrag.some((c) => c.id === comp.id)
          ? activeToDrag
          : [comp];
      }

      dragGroupInitPosRef.current = new Map(dragGroup.map((c) => [c.id, { x: c.x, y: c.y }]));

      const worldPos = screenToWorld(e.clientX, e.clientY);
      setDraggingCompId(comp.id);
      setDragOffset({
        x: worldPos.x - comp.x,
        y: worldPos.y - comp.y,
      });
    },
    [drawingWire, selectedComponentIds, components, allDefs, onSelectComponents, onSelectWire, screenToWorld, pan]
  );

  // Right Click (Context Menu Trigger) - Handled on mouseup if not dragged
  const handleComponentContextMenu = (comp: CircuitComponent, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Right Click on Wire - Handled on mouseup if not dragged
  const handleWireContextMenu = (wire: Wire, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Right Click on Empty Canvas - Handled on mouseup if not dragged
  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Sort wires so jumping wires are on top, newer wires on top, and selected wire on the very top
  const sortedWires = useMemo(() => {
    return sortWiresForRendering(wires, getPinCoords, getPinDirectionHelper, selectedWireId);
  }, [wires, getPinCoords, getPinDirectionHelper, selectedWireId]);

  return (
    <div
      ref={containerRef}
      data-canvas-container="true"
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={handleCanvasContextMenu}
      className={`relative w-full h-full bg-[#f1f5f9] dark:bg-[#020617] overflow-hidden select-none transition-colors duration-200 ${
        isPanning ? 'cursor-grabbing' : drawingWire ? 'cursor-crosshair' : 'cursor-default'
      }`}
    >
      {/* Background Dot & Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none bg-canvas-dots"
        style={{
          backgroundPosition: `${pan.x}px ${pan.y}px`,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
        }}
      />

      {/* Main Scalable SVG Layer */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ overflow: 'visible' }}
      >
        {/* Dynamic Zoom & Pan Transform Layer */}
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* 1. Components Layer */}
          <g id="components-layer" className="pointer-events-auto">
            {sortedComponents.map((comp) => (
              <g
                key={comp.id}
                onMouseDown={(e) => handleComponentMouseDown(comp, e)}
                onContextMenu={(e) => handleComponentContextMenu(comp, e)}
              >
                <ComponentSvg
                  component={comp}
                  isSelected={selectedComponentIds.includes(comp.id)}
                  isHovered={false}
                  activeWireStartPinId={
                    drawingWire?.fromComponentId === comp.id ? (drawingWire.fromPin?.id || null) : null
                  }
                  activeWireTargetPinId={
                    drawingWire && hoveredPinInfo?.component.id === comp.id
                      ? hoveredPinInfo.pin.id
                      : null
                  }
                  onPinMouseDown={handlePinMouseDown}
                  onPinMouseUp={handlePinMouseUp}
                  onPinMouseEnter={handlePinMouseEnter}
                  onPinMouseLeave={handlePinMouseLeave}
                />
              </g>
            ))}
          </g>

          {/* 2. Wires Layer */}
          <g id="wires-layer" className={drawingWire || draggingEndpoint ? "pointer-events-none" : "pointer-events-auto"}>
            {sortedWires.map((wire) => {
              const resolved = resolvedWiresMap.get(wire.id);
              let start = resolved?.start || (wire.fromComponentId && wire.fromPinId ? getPinCoords(wire.fromComponentId, wire.fromPinId) : null);
              let end = resolved?.end || (wire.toComponentId && wire.toPinId ? getPinCoords(wire.toComponentId, wire.toPinId) : null);
              const startDir = resolved?.startDir || (wire.fromComponentId && wire.fromPinId ? getPinDirectionHelper(wire.fromComponentId, wire.fromPinId) : undefined);
              const endDir = resolved?.endDir || (wire.toComponentId && wire.toPinId ? getPinDirectionHelper(wire.toComponentId, wire.toPinId) : undefined);

              if (draggingEndpoint && draggingEndpoint.wireId === wire.id) {
                if (draggingEndpoint.endpoint === 'start') {
                  start = draggingEndpoint.currentPoint;
                } else {
                  end = draggingEndpoint.currentPoint;
                }
              }

              if (!start || !end) return null;

              const fromComp = wire.fromComponentId ? components.find((c) => c.id === wire.fromComponentId) : undefined;
              const toComp = wire.toComponentId ? components.find((c) => c.id === wire.toComponentId) : undefined;
              const fromDef = fromComp ? (allDefs[fromComp.type] || COMPONENT_DEFINITIONS[fromComp.type]) : undefined;
              const toDef = toComp ? (allDefs[toComp.type] || COMPONENT_DEFINITIONS[toComp.type]) : undefined;
              const fromPin = fromDef && wire.fromPinId ? fromDef.pins.find((p: Pin) => p.id === wire.fromPinId) : undefined;
              const toPin = toDef && wire.toPinId ? toDef.pins.find((p: Pin) => p.id === wire.toPinId) : undefined;

              return (
                <g
                  key={wire.id}
                  onMouseDown={(e) => {
                    if (e.button === 2) {
                      isRightMouseDownRef.current = true;
                      rightClickStartPosRef.current = { x: e.clientX, y: e.clientY };
                      rightClickDidDragRef.current = false;
                      const worldPos = screenToWorld(e.clientX, e.clientY);
                      onSelectWire(wire.id);
                      onSelectComponents([]);
                      pendingContextMenuRef.current = {
                        isOpen: true,
                        x: e.clientX,
                        y: e.clientY,
                        worldX: worldPos.x,
                        worldY: worldPos.y,
                        targetType: 'wire',
                        targetWire: wire,
                      };
                      setIsPanning(true);
                      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
                    }
                  }}
                  onContextMenu={(e) => handleWireContextMenu(wire, e)}
                >
                  <WireSvg
                    wire={wire}
                    startPoint={start}
                    endPoint={end}
                    startDir={startDir}
                    endDir={endDir}
                    netSignalName={resolvedNetSignals.get(wire.id)}
                    resolvedWaypoints={resolved?.waypoints}
                    connectedWireIds={resolved?.connectedWireIds}
                    junctionPoints={liveWireJunctionsMap.get(wire.id) || resolved?.junctionPoints}
                    liveWaypoints={liveWireWaypointsMap.get(wire.id)}
                    isSelected={selectedWireId === wire.id}
                    zoom={zoom}
                    showWireMarkers={showWireMarkers}
                    fromPinName={fromPin?.name}
                    toPinName={toPin?.name}
                    fromCompType={fromComp?.type}
                    toCompType={toComp?.type}
                    onSelect={(w, e) => {
                      e.stopPropagation();
                      onSelectWire(w.id);
                      onSelectComponents([]);
                    }}
                    onResetWaypoints={onResetWireWaypoints}
                    onStartEndpointDrag={handleStartEndpointDrag}
                    onStartSegmentDrag={handleStartSegmentDrag}
                    onStartJunctionDrag={handleStartJunctionDrag}
                    onStartCornerDrag={handleStartCornerDrag}
                    onStartMidpointDrag={handleStartMidpointDrag}
                  />
                </g>
              );
            })}

            {/* In-progress Active Wire Drawing */}
            {drawingWire && (() => {
              const start = drawingWire.fromWireId && drawingWire.fromPoint
                ? drawingWire.fromPoint
                : (drawingWire.fromComponentId && drawingWire.fromPin
                    ? getPinCoords(drawingWire.fromComponentId, drawingWire.fromPin.id)
                    : null);
              const startDir = (drawingWire.fromComponentId && drawingWire.fromPin)
                ? getPinDirectionHelper(drawingWire.fromComponentId, drawingWire.fromPin.id)
                : undefined;
              const endDir = hoveredPinInfo
                ? getPinDirectionHelper(hoveredPinInfo.component.id, hoveredPinInfo.pin.id)
                : undefined;
              if (!start) return null;
              const pathD = generateWirePath(start, drawingWire.currentPoint, wireRouting, drawingWire.waypoints, startDir, endDir);
              const previewColor = hoveredPinInfo
                ? (drawingWire.fromPin
                    ? getAutoWireColor(
                        drawingWire.fromPin,
                        hoveredPinInfo.pin,
                        drawingWire.color || currentWireColor
                      )
                    : drawingWire.color || currentWireColor)
                : hoveredWireSnap
                ? (drawingWire.color || hoveredWireSnap.wire.color || currentWireColor)
                : drawingWire.color || currentWireColor;

              return (
                <g className="pointer-events-none">
                  <path
                    d={pathD}
                    fill="none"
                    stroke={previewColor}
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeDasharray="6 4"
                    className="animate-pulse pointer-events-none"
                  />
                  {/* Start Point Dot */}
                  <circle
                    cx={start.x}
                    cy={start.y}
                    r={drawingWire.fromWireId ? 3.8 : 3.4}
                    fill={previewColor}
                    className="pointer-events-none"
                  />
                  {/* Target Cursor / Snap Dot */}
                  <circle
                    cx={drawingWire.currentPoint.x}
                    cy={drawingWire.currentPoint.y}
                    r={hoveredWireSnap ? 3.8 : 3.4}
                    fill={previewColor}
                    className="pointer-events-none"
                  />
                </g>
              );
            })()}

            {/* Interactive Endpoint Drag Preview Dot */}
            {draggingEndpoint && (
              <g className="pointer-events-none">
                <circle
                  cx={draggingEndpoint.currentPoint.x}
                  cy={draggingEndpoint.currentPoint.y}
                  r={hoveredWireSnap || hoveredPinInfo ? 5.5 : 4}
                  fill={hoveredWireSnap ? (hoveredWireSnap.wire.color || currentWireColor) : currentWireColor}
                  className="animate-pulse pointer-events-none"
                />
              </g>
            )}
          </g>

          {/* 3. Marquee Selection Box */}
          {marqueeStart && marqueeCurrent && (
            <rect
              x={Math.min(marqueeStart.x, marqueeCurrent.x)}
              y={Math.min(marqueeStart.y, marqueeCurrent.y)}
              width={Math.abs(marqueeCurrent.x - marqueeStart.x)}
              height={Math.abs(marqueeCurrent.y - marqueeStart.y)}
              fill="rgba(56, 189, 248, 0.12)"
              stroke="#38bdf8"
              strokeWidth={1.5 / zoom}
              strokeDasharray={`${4 / zoom} ${4 / zoom}`}
              className="pointer-events-none"
            />
          )}

          {/* 4. Foreground Overlay Layer (e.g. CT Coil front arch) */}
          <g id="foreground-overlays-layer" className="pointer-events-none">
            {components
              .filter((c) => c.type === 'sensor-ct-coil')
              .map((comp) => {
                const def = allDefs[comp.type] || COMPONENT_DEFINITIONS[comp.type];
                if (!def) return null;
                return (
                  <g
                    key={`fg-${comp.id}`}
                    transform={`translate(${comp.x}, ${comp.y}) rotate(${comp.rotation || 0} ${def.width / 2} ${def.height / 2})`}
                  >
                    <image
                      href="/components/ct_coil_front.png"
                      width={def.width}
                      height={def.height}
                      preserveAspectRatio="none"
                    />
                  </g>
                );
              })}
          </g>
        </g>
      </svg>

      {/* Floating Pin Tooltip */}
      {hoveredPinInfo && (
        <div
          className="fixed z-50 pointer-events-none px-2.5 py-1.5 rounded-lg bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 shadow-xl backdrop-blur-md transform -translate-x-1/2 -translate-y-full mb-6"
          style={{
            left: hoveredPinInfo.screenX,
            top: hoveredPinInfo.screenY - 16,
          }}
        >
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-100 font-mono">
              {hoveredPinInfo.pin.name}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                hoveredPinInfo.pin.type === 'power'
                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  : hoveredPinInfo.pin.type === 'ground'
                  ? 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/30'
                  : hoveredPinInfo.pin.type === 'i2c'
                  ? 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                  : hoveredPinInfo.pin.type === 'pwm'
                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {hoveredPinInfo.pin.type}
            </span>
          </div>
          {hoveredPinInfo.pin.description && (
            <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 max-w-xs">
              {hoveredPinInfo.pin.description}
            </div>
          )}
          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {drawingWire || draggingEndpoint
              ? '✓ Lepas / Klik untuk menyambungkan'
              : 'Klik pin untuk mulai pasang kabel'}
          </div>
        </div>
      )}

      {/* Floating Wire Snap Tooltip (Elevated, Compact Pill Design) */}
      {hoveredWireSnap && !hoveredPinInfo && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-1 rounded-full bg-white/95 dark:bg-slate-900/95 border border-sky-500/50 shadow-lg backdrop-blur-md transform -translate-x-1/2 -translate-y-full mb-6 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: hoveredWireSnap.screenX,
            top: hoveredWireSnap.screenY - 16,
          }}
        >
          <span className="w-2 h-2 rounded-full bg-sky-500 inline-block shadow-sm animate-pulse shrink-0"></span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 text-[11px] font-mono whitespace-nowrap">
            Cabang Kabel
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-400 whitespace-nowrap">
            (Klik / Lepas untuk sambung)
          </span>
        </div>
      )}

      {/* Wire Drawing Help Banner */}
      {drawingWire && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-slate-900/95 border border-sky-500/40 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 dark:bg-sky-400 animate-ping" />
          <div className="text-xs flex items-center gap-1.5 flex-wrap">
            <span>{drawingWire.fromPin ? 'Menghubungkan pin' : 'Menghubungkan cabang kabel'}</span>
            {drawingWire.fromPin && (
              <span className="text-sky-600 dark:text-sky-400 font-mono font-bold bg-sky-500/15 px-1.5 py-0.5 rounded border border-sky-500/30">
                {drawingWire.fromPin.name}
              </span>
            )}
            {hoveredPinInfo ? (
              <>
                <span className="text-slate-400">→</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  {hoveredPinInfo.component.label || hoveredPinInfo.component.name}.{hoveredPinInfo.pin.name}
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">(Klik untuk menyambungkan)</span>
              </>
            ) : hoveredWireSnap ? (
              <>
                <span className="text-slate-400">→</span>
                <span className="text-sky-600 dark:text-sky-400 font-mono font-bold bg-sky-500/15 px-1.5 py-0.5 rounded border border-sky-500/30">
                  Cabang Kabel (T-Junction)
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">(Klik untuk menyambungkan)</span>
              </>
            ) : (
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">(Klik pin tujuan atau kabel lain untuk menyambungkan, atau klik kanvas untuk belokan)</span>
            )}
          </div>
          <button
            onClick={() => {
              setDrawingWire(null);
              setHoveredPinInfo(null);
              setHoveredWireSnap(null);
            }}
            className="text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
          >
            Batal (Esc)
          </button>
        </div>
      )}

      {/* Endpoint Dragging Help Banner */}
      {draggingEndpoint && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-slate-900/95 border border-sky-500/40 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 dark:bg-sky-400 animate-ping" />
          <div className="text-xs flex items-center gap-1.5 flex-wrap">
            <span>Memindahkan titik sambungan</span>
            {hoveredPinInfo ? (
              <>
                <span className="text-slate-400">→</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  {hoveredPinInfo.component.label || hoveredPinInfo.component.name}.{hoveredPinInfo.pin.name}
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">(Lepas mouse untuk sambung)</span>
              </>
            ) : hoveredWireSnap ? (
              <>
                <span className="text-slate-400">→</span>
                <span className="text-sky-600 dark:text-sky-400 font-mono font-bold bg-sky-500/15 px-1.5 py-0.5 rounded border border-sky-500/30">
                  Cabang Kabel
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">(Lepas mouse untuk sambung)</span>
              </>
            ) : (
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">(Arahkan ke pin/kabel lain, atau lepas di kanvas kosong untuk batal)</span>
            )}
          </div>
          <button
            onClick={() => {
              setDraggingEndpoint(null);
              setHoveredPinInfo(null);
              setHoveredWireSnap(null);
            }}
            className="text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
          >
            Batal (Esc)
          </button>
        </div>
      )}

      {/* Smart Auto-Wiring Floating Quick Banner when 2 compatible components are selected */}
      {!drawingWire && !draggingEndpoint && detectedBusOptions.length > 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-slate-900/95 border border-sky-500/40 text-slate-800 dark:text-slate-200 px-3.5 py-1.5 rounded-full shadow-2xl backdrop-blur-md flex items-center gap-2.5 animate-fade-in ring-4 ring-sky-500/10">
          <Zap className="w-4 h-4 text-sky-500 animate-pulse shrink-0" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Auto-Wiring:</span>
          <div className="flex items-center gap-1.5">
            {detectedBusOptions.map((bus) => (
              <button
                key={bus.id}
                onClick={(e) => {
                  e.stopPropagation();
                  const newWires = generateBusWires(bus, wires, wireRouting);
                  if (onAddMultipleWires) onAddMultipleWires(newWires);
                }}
                className="text-xs font-semibold bg-sky-500 hover:bg-sky-600 active:scale-95 text-white px-3 py-1 rounded-full shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                title={bus.description}
              >
                <span>⚡ {bus.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

