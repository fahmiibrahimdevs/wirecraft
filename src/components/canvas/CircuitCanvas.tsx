import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  CircuitComponent,
  Wire,
  Pin,
  WirePoint,
  WireRouting,
} from '../../types/circuit';
import { COMPONENT_DEFINITIONS } from '../../constants/components';
import { getAllComponentDefinitions, CUSTOM_COMPONENTS_EVENT } from '../../utils/customComponents';
import {
  getPinWorldPosition,
  generateWirePath,
  getAutoWireColor,
  getPinDirection,
  PinDirection,
  resolveCircuitNetSignals,
} from '../../utils/geometry';
import {
  sortWiresForRendering,
  resolveAllWireEndpoints,
} from '../../utils/orthogonalRouter';
import { ComponentSvg } from './ComponentSvg';
import { WireSvg } from './WireSvg';
import { CanvasFloatingTooltips } from './CanvasFloatingTooltips';
import { ContextMenuState } from '../menu/ContextMenu';
import { detectAvailableBusConnections, generateBusWires } from '../../utils/autoBusRouter';
import { useCanvasGestures } from '../../hooks/useCanvasGestures';
import { useComponentDrag } from '../../hooks/useComponentDrag';
import { useWireGestures } from '../../hooks/useWireGestures';

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
        newCache.set(comp.id, cached);
        cached.pins.forEach((pos, key) => fullPosMap.set(key, pos));
        cached.dirs.forEach((dir, key) => fullDirMap.set(key, dir));
      } else {
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

  // Layer & depth-sorted components for realistic circuit rendering
  const sortedComponents = useMemo(() => {
    const getOrder = (type: string) => {
      if (
        type === 'breadboard-half' ||
        type === 'breadboard-mini' ||
        type === 'breadboard-full' ||
        type.startsWith('breadboard')
      )
        return 0;

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

      if (
        type.startsWith('display-') ||
        type.startsWith('sensor-') ||
        type === 'servo' ||
        type === 'fitting-lamp' ||
        type === 'steker-switch'
      )
        return 2;

      if (
        type === 'led' ||
        type === 'rgb-led' ||
        type === 'buzzer' ||
        type === 'speaker' ||
        type === 'potentiometer' ||
        type.startsWith('push-button')
      )
        return 3;

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
      if (Math.abs(a.y - b.y) > 1) {
        return b.y - a.y;
      }
      return 0;
    });
  }, [components]);

  // Hook 1: Canvas Gestures (Panning, Zooming, Coordinate Transform, Context Menu)
  const gestures = useCanvasGestures({
    containerRef,
    pan,
    zoom,
    onPanChange,
    onZoomChange,
    onContextMenu,
  });

  // Hook 2: Wire Gestures (Drawing, Endpoint drag, Segment drag, T-Junction snap)
  const wireGestures = useWireGestures({
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
    screenToWorld: gestures.screenToWorld,
    pan,
    setIsPanning: gestures.setIsPanning,
    setPanStart: gestures.setPanStart,
    isRightMouseDownRef: gestures.isRightMouseDownRef,
    rightClickStartPosRef: gestures.rightClickStartPosRef,
    rightClickDidDragRef: gestures.rightClickDidDragRef,
    pendingContextMenuRef: gestures.pendingContextMenuRef,
  });

  // Hook 3: Component Dragging (Multi-select, Breadboard Docking, Magnetic Snap)
  const compDrag = useComponentDrag({
    components,
    allDefs,
    selectedComponentIds,
    snapGrid,
    drawingWire: wireGestures.drawingWire,
    screenToWorld: gestures.screenToWorld,
    onSelectComponents,
    onSelectWire,
    onUpdateComponentPositions,
    pan,
    setIsPanning: gestures.setIsPanning,
    setPanStart: gestures.setPanStart,
    isRightMouseDownRef: gestures.isRightMouseDownRef,
    rightClickStartPosRef: gestures.rightClickStartPosRef,
    rightClickDidDragRef: gestures.rightClickDidDragRef,
    pendingContextMenuRef: gestures.pendingContextMenuRef,
  });

  // Handle Mouse Down on Canvas Background
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (wireGestures.drawingWire) {
      if (e.button === 0) {
        if (wireGestures.hoveredWireSnap) {
          wireGestures.finishWireToWireConnection(
            wireGestures.hoveredWireSnap.wire,
            wireGestures.hoveredWireSnap.point
          );
          return;
        }
        if (wireGestures.hoveredPinInfo) {
          wireGestures.finishWireConnection(
            wireGestures.hoveredPinInfo.component.id,
            wireGestures.hoveredPinInfo.pin
          );
          return;
        }
        const worldPos = gestures.screenToWorld(e.clientX, e.clientY);
        wireGestures.setDrawingWire((prev) =>
          prev ? { ...prev, waypoints: [...prev.waypoints, worldPos] } : null
        );
      } else if (e.button === 2) {
        wireGestures.setDrawingWire(null);
        wireGestures.setHoveredPinInfo(null);
        wireGestures.setHoveredWireSnap(null);
        gestures.pendingContextMenuRef.current = null;
      }
      return;
    }

    if (e.button === 2) {
      gestures.isRightMouseDownRef.current = true;
      gestures.rightClickStartPosRef.current = { x: e.clientX, y: e.clientY };
      gestures.rightClickDidDragRef.current = false;
      const worldPos = gestures.screenToWorld(e.clientX, e.clientY);
      gestures.pendingContextMenuRef.current = {
        isOpen: true,
        x: e.clientX,
        y: e.clientY,
        worldX: worldPos.x,
        worldY: worldPos.y,
        targetType: 'canvas',
      };
      gestures.setIsPanning(true);
      gestures.setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (e.button === 1) {
      gestures.setIsPanning(true);
      gestures.setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      return;
    }

    if (
      e.button === 0 &&
      (e.target === containerRef.current || (e.target as HTMLElement)?.tagName === 'svg')
    ) {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey || e.shiftKey;
      if (isCmdOrCtrl) {
        const worldPos = gestures.screenToWorld(e.clientX, e.clientY);
        gestures.setMarqueeStart(worldPos);
        gestures.setMarqueeCurrent(worldPos);
      } else {
        onSelectComponents([]);
        onSelectWire(null);
        gestures.setIsPanning(true);
        gestures.setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    }
  };

  // Handle Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    const worldPos = gestures.screenToWorld(e.clientX, e.clientY);
    if (onCursorMove) {
      onCursorMove(worldPos);
    }

    if (gestures.isPanning) {
      if (gestures.rightClickStartPosRef.current) {
        const dist = Math.hypot(
          e.clientX - gestures.rightClickStartPosRef.current.x,
          e.clientY - gestures.rightClickStartPosRef.current.y
        );
        if (dist > 3) {
          gestures.rightClickDidDragRef.current = true;
          gestures.pendingContextMenuRef.current = null;
        }
      }
      onPanChange({
        x: e.clientX - gestures.panStart.x,
        y: e.clientY - gestures.panStart.y,
      });
      return;
    }

    if (gestures.marqueeStart) {
      gestures.setMarqueeCurrent(worldPos);
      return;
    }

    if (compDrag.draggingCompId) {
      compDrag.handleComponentDragMove(worldPos);
      return;
    }

    if (wireGestures.drawingWire) {
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
          if (
            comp.id === wireGestures.drawingWire.fromComponentId &&
            pin.id === wireGestures.drawingWire.fromPin?.id
          ) {
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

      let wireSnapTarget: { wire: Wire; point: WirePoint } | null = null;
      const refPoint =
        wireGestures.drawingWire.fromPoint ||
        (wireGestures.drawingWire.fromComponentId && wireGestures.drawingWire.fromPin
          ? getPinCoords(
              wireGestures.drawingWire.fromComponentId,
              wireGestures.drawingWire.fromPin.id
            )
          : null);

      if (!snapTarget) {
        let minWireDist = 24;
        wires.forEach((w) => {
          if (
            w.id === wireGestures.drawingWire?.fromWireId &&
            wireGestures.drawingWire.waypoints.length === 0
          ) {
            return;
          }
          const resolved = resolvedWiresMap.get(w.id);
          if (!resolved || resolved.waypoints.length < 2) return;

          const closest = (window as any).WireCraftGeometry
            ? (window as any).WireCraftGeometry.getSmartWireSnapPoint(worldPos, resolved.waypoints, refPoint, snapGrid)
            : undefined;

          if (closest && closest.distance < minWireDist) {
            minWireDist = closest.distance;
            wireSnapTarget = { wire: w, point: closest.point };
          }
        });
      }

      if (wireSnapTarget) {
        snapPos = (wireSnapTarget as { wire: Wire; point: WirePoint }).point;
        wireGestures.setHoveredWireSnap({
          wire: (wireSnapTarget as { wire: Wire; point: WirePoint }).wire,
          point: (wireSnapTarget as { wire: Wire; point: WirePoint }).point,
          screenX: e.clientX,
          screenY: e.clientY,
        });
        wireGestures.setHoveredPinInfo(null);
      } else {
        wireGestures.setHoveredWireSnap(null);
      }

      wireGestures.setDrawingWire((prev) => (prev ? { ...prev, currentPoint: snapPos } : null));

      if (snapTarget) {
        wireGestures.setHoveredPinInfo({
          component: snapTarget.component,
          pin: snapTarget.pin,
          screenX: e.clientX,
          screenY: e.clientY,
        });
      } else if (!wireSnapTarget) {
        wireGestures.setHoveredPinInfo(null);
      }
    }
  };

  // Handle Mouse Up
  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 2 || gestures.isRightMouseDownRef.current) {
      gestures.handleRightClickUp(e.clientX, e.clientY);
    }
    if (gestures.isPanning) gestures.setIsPanning(false);

    // Finalize Marquee Selection Box
    if (gestures.marqueeStart && gestures.marqueeCurrent) {
      const minX = Math.min(gestures.marqueeStart.x, gestures.marqueeCurrent.x);
      const maxX = Math.max(gestures.marqueeStart.x, gestures.marqueeCurrent.x);
      const minY = Math.min(gestures.marqueeStart.y, gestures.marqueeCurrent.y);
      const maxY = Math.max(gestures.marqueeStart.y, gestures.marqueeCurrent.y);

      if (maxX - minX > 5 || maxY - minY > 5) {
        const hits = components.filter((c) => {
          const def = allDefs[c.type] || COMPONENT_DEFINITIONS[c.type];
          const w = def?.width || 50;
          const h = def?.height || 50;
          return !(c.x + w < minX || c.x > maxX || c.y + h < minY || c.y > maxY);
        });

        const isMultiSelectKey = e.shiftKey || e.ctrlKey || e.metaKey;
        if (isMultiSelectKey) {
          const combined = Array.from(
            new Set([...selectedComponentIds, ...hits.map((c) => c.id)])
          );
          onSelectComponents(combined);
        } else {
          onSelectComponents(hits.map((c) => c.id));
        }
      }
      gestures.setMarqueeStart(null);
      gestures.setMarqueeCurrent(null);
    }

    compDrag.handleComponentDragEnd();

    if (wireGestures.drawingWire) {
      if (wireGestures.hoveredPinInfo) {
        if (
          wireGestures.hoveredPinInfo.component.id !== wireGestures.drawingWire.fromComponentId ||
          wireGestures.hoveredPinInfo.pin.id !== wireGestures.drawingWire.fromPin?.id
        ) {
          wireGestures.finishWireConnection(
            wireGestures.hoveredPinInfo.component.id,
            wireGestures.hoveredPinInfo.pin
          );
        }
      } else if (wireGestures.hoveredWireSnap) {
        wireGestures.finishWireToWireConnection(
          wireGestures.hoveredWireSnap.wire,
          wireGestures.hoveredWireSnap.point
        );
      }
    }
  };

  // Sort wires for layer presentation
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
      onWheel={gestures.handleWheel}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative w-full h-full bg-[#f1f5f9] dark:bg-[#020617] overflow-hidden select-none transition-colors duration-200 ${
        gestures.isPanning
          ? 'cursor-grabbing'
          : wireGestures.drawingWire
          ? 'cursor-crosshair'
          : 'cursor-default'
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
                onMouseDown={(e) => compDrag.handleComponentMouseDown(comp, e)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <ComponentSvg
                  component={comp}
                  isSelected={selectedComponentIds.includes(comp.id)}
                  isHovered={false}
                  activeWireStartPinId={
                    wireGestures.drawingWire?.fromComponentId === comp.id
                      ? wireGestures.drawingWire.fromPin?.id || null
                      : null
                  }
                  activeWireTargetPinId={
                    wireGestures.drawingWire &&
                    wireGestures.hoveredPinInfo?.component.id === comp.id
                      ? wireGestures.hoveredPinInfo.pin.id
                      : null
                  }
                  onPinMouseDown={wireGestures.handlePinMouseDown}
                  onPinMouseUp={wireGestures.handlePinMouseUp}
                  onPinMouseEnter={wireGestures.handlePinMouseEnter}
                  onPinMouseLeave={wireGestures.handlePinMouseLeave}
                />
              </g>
            ))}
          </g>

          {/* 2. Wires Layer */}
          <g
            id="wires-layer"
            className={
              wireGestures.drawingWire || wireGestures.draggingEndpoint
                ? 'pointer-events-none'
                : 'pointer-events-auto'
            }
          >
            {sortedWires.map((wire) => {
              const resolved = resolvedWiresMap.get(wire.id);
              let start =
                resolved?.start ||
                (wire.fromComponentId && wire.fromPinId
                  ? getPinCoords(wire.fromComponentId, wire.fromPinId)
                  : null);
              let end =
                resolved?.end ||
                (wire.toComponentId && wire.toPinId
                  ? getPinCoords(wire.toComponentId, wire.toPinId)
                  : null);
              const startDir =
                resolved?.startDir ||
                (wire.fromComponentId && wire.fromPinId
                  ? getPinDirectionHelper(wire.fromComponentId, wire.fromPinId)
                  : undefined);
              const endDir =
                resolved?.endDir ||
                (wire.toComponentId && wire.toPinId
                  ? getPinDirectionHelper(wire.toComponentId, wire.toPinId)
                  : undefined);

              if (
                wireGestures.draggingEndpoint &&
                wireGestures.draggingEndpoint.wireId === wire.id
              ) {
                if (wireGestures.draggingEndpoint.endpoint === 'start') {
                  start = wireGestures.draggingEndpoint.currentPoint;
                } else {
                  end = wireGestures.draggingEndpoint.currentPoint;
                }
              }

              if (!start || !end) return null;

              const fromComp = wire.fromComponentId
                ? components.find((c) => c.id === wire.fromComponentId)
                : undefined;
              const toComp = wire.toComponentId
                ? components.find((c) => c.id === wire.toComponentId)
                : undefined;
              const fromDef = fromComp
                ? allDefs[fromComp.type] || COMPONENT_DEFINITIONS[fromComp.type]
                : undefined;
              const toDef = toComp
                ? allDefs[toComp.type] || COMPONENT_DEFINITIONS[toComp.type]
                : undefined;
              const fromPin =
                fromDef && wire.fromPinId
                  ? fromDef.pins.find((p: Pin) => p.id === wire.fromPinId)
                  : undefined;
              const toPin =
                toDef && wire.toPinId
                  ? toDef.pins.find((p: Pin) => p.id === wire.toPinId)
                  : undefined;

              return (
                <g
                  key={wire.id}
                  onMouseDown={(e) => {
                    if (e.button === 2) {
                      gestures.isRightMouseDownRef.current = true;
                      gestures.rightClickStartPosRef.current = { x: e.clientX, y: e.clientY };
                      gestures.rightClickDidDragRef.current = false;
                      const worldPos = gestures.screenToWorld(e.clientX, e.clientY);
                      onSelectWire(wire.id);
                      onSelectComponents([]);
                      gestures.pendingContextMenuRef.current = {
                        isOpen: true,
                        x: e.clientX,
                        y: e.clientY,
                        worldX: worldPos.x,
                        worldY: worldPos.y,
                        targetType: 'wire',
                        targetWire: wire,
                      };
                      gestures.setIsPanning(true);
                      gestures.setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
                    }
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
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
                    junctionPoints={
                      wireGestures.liveWireJunctionsMap.get(wire.id) || resolved?.junctionPoints
                    }
                    liveWaypoints={wireGestures.liveWireWaypointsMap.get(wire.id)}
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
                    onStartEndpointDrag={wireGestures.handleStartEndpointDrag}
                    onStartSegmentDrag={wireGestures.handleStartSegmentDrag}
                    onStartJunctionDrag={wireGestures.handleStartJunctionDrag}
                    onStartCornerDrag={wireGestures.handleStartCornerDrag}
                    onStartMidpointDrag={wireGestures.handleStartMidpointDrag}
                  />
                </g>
              );
            })}

            {/* In-progress Active Wire Drawing */}
            {wireGestures.drawingWire &&
              (() => {
                const dw = wireGestures.drawingWire;
                const start =
                  dw.fromWireId && dw.fromPoint
                    ? dw.fromPoint
                    : dw.fromComponentId && dw.fromPin
                    ? getPinCoords(dw.fromComponentId, dw.fromPin.id)
                    : null;
                const startDir =
                  dw.fromComponentId && dw.fromPin
                    ? getPinDirectionHelper(dw.fromComponentId, dw.fromPin.id)
                    : undefined;
                const endDir = wireGestures.hoveredPinInfo
                  ? getPinDirectionHelper(
                      wireGestures.hoveredPinInfo.component.id,
                      wireGestures.hoveredPinInfo.pin.id
                    )
                  : undefined;
                if (!start) return null;
                const pathD = generateWirePath(
                  start,
                  dw.currentPoint,
                  wireRouting,
                  dw.waypoints,
                  startDir,
                  endDir
                );
                const previewColor = wireGestures.hoveredPinInfo
                  ? dw.fromPin
                    ? getAutoWireColor(
                        dw.fromPin,
                        wireGestures.hoveredPinInfo.pin,
                        dw.color || currentWireColor
                      )
                    : dw.color || currentWireColor
                  : wireGestures.hoveredWireSnap
                  ? dw.color || wireGestures.hoveredWireSnap.wire.color || currentWireColor
                  : dw.color || currentWireColor;

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
                    <circle
                      cx={start.x}
                      cy={start.y}
                      r={dw.fromWireId ? 3.8 : 3.4}
                      fill={previewColor}
                      className="pointer-events-none"
                    />
                    <circle
                      cx={dw.currentPoint.x}
                      cy={dw.currentPoint.y}
                      r={wireGestures.hoveredWireSnap ? 3.8 : 3.4}
                      fill={previewColor}
                      className="pointer-events-none"
                    />
                  </g>
                );
              })()}

            {/* Interactive Endpoint Drag Preview Dot */}
            {wireGestures.draggingEndpoint && (
              <g className="pointer-events-none">
                <circle
                  cx={wireGestures.draggingEndpoint.currentPoint.x}
                  cy={wireGestures.draggingEndpoint.currentPoint.y}
                  r={wireGestures.hoveredWireSnap || wireGestures.hoveredPinInfo ? 5.5 : 4}
                  fill={
                    wireGestures.hoveredWireSnap
                      ? wireGestures.hoveredWireSnap.wire.color || currentWireColor
                      : currentWireColor
                  }
                  className="animate-pulse pointer-events-none"
                />
              </g>
            )}
          </g>

          {/* 3. Marquee Selection Box */}
          {gestures.marqueeStart && gestures.marqueeCurrent && (
            <rect
              x={Math.min(gestures.marqueeStart.x, gestures.marqueeCurrent.x)}
              y={Math.min(gestures.marqueeStart.y, gestures.marqueeCurrent.y)}
              width={Math.abs(gestures.marqueeCurrent.x - gestures.marqueeStart.x)}
              height={Math.abs(gestures.marqueeCurrent.y - gestures.marqueeStart.y)}
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

      {/* Floating Tooltips, Drawing Banners, and Smart Auto-Wiring Overlays */}
      <CanvasFloatingTooltips
        hoveredPinInfo={wireGestures.hoveredPinInfo}
        hoveredWireSnap={wireGestures.hoveredWireSnap}
        drawingWire={wireGestures.drawingWire}
        draggingEndpoint={wireGestures.draggingEndpoint}
        detectedBusOptions={detectedBusOptions}
        onCancelDrawing={() => {
          wireGestures.setDrawingWire(null);
          wireGestures.setHoveredPinInfo(null);
          wireGestures.setHoveredWireSnap(null);
        }}
        onCancelEndpointDrag={() => {
          wireGestures.setDraggingEndpoint(null);
          wireGestures.setHoveredPinInfo(null);
          wireGestures.setHoveredWireSnap(null);
        }}
        onConnectBus={(bus) => {
          const newWires = generateBusWires(bus, wires, wireRouting);
          if (onAddMultipleWires) onAddMultipleWires(newWires);
        }}
      />
    </div>
  );
};
