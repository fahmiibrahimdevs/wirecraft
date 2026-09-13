import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { CircuitComponent, Wire, Pin, WirePoint, WireRouting } from '../../types/circuit';
import { COMPONENT_DEFINITIONS } from '../../constants/components';
import { getPinWorldPosition, generateWirePath, snapToGrid } from '../../utils/geometry';
import { ComponentSvg } from './ComponentSvg';
import { WireSvg } from './WireSvg';

interface CircuitCanvasProps {
  components: CircuitComponent[];
  wires: Wire[];
  selectedComponentId: string | null;
  selectedWireId: string | null;
  currentWireColor: string;
  wireRouting: WireRouting;
  snapGrid: boolean;
  onSelectComponent: (id: string | null) => void;
  onSelectWire: (id: string | null) => void;
  onUpdateComponentPosition: (id: string, x: number, y: number, isFinal?: boolean) => void;
  onAddWire: (wire: Omit<Wire, 'id'>) => void;
  onDeleteSelected: () => void;
  onUpdateWireWaypoints?: (id: string, waypoints: WirePoint[]) => void;
  onResetWireWaypoints?: (id: string) => void;
  zoom: number;
  pan: WirePoint;
  onZoomChange: (newZoom: number) => void;
  onPanChange: (newPan: WirePoint) => void;
}

export const CircuitCanvas: React.FC<CircuitCanvasProps> = ({
  components,
  wires,
  selectedComponentId,
  selectedWireId,
  currentWireColor,
  wireRouting,
  snapGrid,
  onSelectComponent,
  onSelectWire,
  onUpdateComponentPosition,
  onAddWire,
  onDeleteSelected,
  onUpdateWireWaypoints,
  onResetWireWaypoints,
  zoom,
  pan,
  onZoomChange,
  onPanChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Dragging state for components
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<WirePoint>({ x: 0, y: 0 });
  const dragInitialPosRef = useRef<WirePoint | null>(null);
  const dragRafIdRef = useRef<number | null>(null);
  const pendingDragPosRef = useRef<{ id: string; x: number; y: number } | null>(null);

  // Panning state for canvas
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<WirePoint>({ x: 0, y: 0 });

  // Wire drawing state
  const [drawingWire, setDrawingWire] = useState<{
    fromComponentId: string;
    fromPin: Pin;
    currentPoint: WirePoint;
    waypoints: WirePoint[];
  } | null>(null);

  // Pin Hover Tooltip state
  const [hoveredPinInfo, setHoveredPinInfo] = useState<{
    component: CircuitComponent;
    pin: Pin;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Memoized pin world coordinate map: O(1) instant lookup for all wires and hit-testing
  const pinWorldMap = useMemo(() => {
    const map = new Map<string, WirePoint>();
    for (const comp of components) {
      const def = COMPONENT_DEFINITIONS[comp.type];
      if (!def) continue;
      for (const pin of def.pins) {
        const pos = getPinWorldPosition(comp.x, comp.y, def.width, def.height, comp.rotation, pin);
        map.set(`${comp.id}:${pin.id}`, pos);
      }
    }
    return map;
  }, [components]);

  // Memoized sorted components to prevent expensive array sort on every render/mousemove
  const sortedComponents = useMemo(() => {
    const getOrder = (type: string) => {
      if (
        type === 'breadboard-half' ||
        type === 'breadboard-mini' ||
        type === 'breadboard-full'
      )
        return 0;
      if (type === 'arduino-uno' || type === 'esp32' || type === 'battery-9v') return 1;
      return 2; // leds, resistors, sensors, buttons, etc.
    };
    return [...components].sort((a, b) => getOrder(a.type) - getOrder(b.type));
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

  // Helper to find pin world coordinate in O(1)
  const getPinCoords = useCallback(
    (compId: string, pinId: string): WirePoint | null => {
      return pinWorldMap.get(`${compId}:${pinId}`) || null;
    },
    [pinWorldMap]
  );

  // Helper to complete wire connection between start pin and target pin
  const finishWireConnection = useCallback(
    (targetCompId: string, targetPin: Pin) => {
      if (!drawingWire) return;
      // Cannot connect to exact same pin
      if (drawingWire.fromComponentId === targetCompId && drawingWire.fromPin.id === targetPin.id) {
        return;
      }

      onAddWire({
        fromComponentId: drawingWire.fromComponentId,
        fromPinId: drawingWire.fromPin.id,
        toComponentId: targetCompId,
        toPinId: targetPin.id,
        color: currentWireColor,
        routing: wireRouting,
        waypoints: drawingWire.waypoints,
      });

      setDrawingWire(null);
      setHoveredPinInfo(null);
    },
    [drawingWire, onAddWire, currentWireColor, wireRouting]
  );

  // Handle Mouse Down on Canvas (Pan or Deselect)
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // If drawing wire
    if (drawingWire) {
      if (e.button === 0) {
        // If snapped near a target pin when clicked, finish connection directly!
        if (
          hoveredPinInfo &&
          (hoveredPinInfo.component.id !== drawingWire.fromComponentId ||
            hoveredPinInfo.pin.id !== drawingWire.fromPin.id)
        ) {
          finishWireConnection(hoveredPinInfo.component.id, hoveredPinInfo.pin);
          return;
        }

        // Otherwise clicking canvas adds a waypoint
        const worldPos = screenToWorld(e.clientX, e.clientY);
        setDrawingWire((prev) => (prev ? { ...prev, waypoints: [...prev.waypoints, worldPos] } : null));
      } else if (e.button === 2) {
        // Right click cancels wire drawing
        setDrawingWire(null);
        setHoveredPinInfo(null);
      }
      return;
    }

    // Middle click or Space/Left click on empty background
    if (e.button === 1 || (e.button === 0 && e.target === containerRef.current)) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      onSelectComponent(null);
      onSelectWire(null);
    }
  };

  // Handle Mouse Move
  const handleMouseMove = (e: React.MouseEvent) => {
    // 1. If panning canvas
    if (isPanning) {
      onPanChange({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    // 2. If dragging component
    if (draggingCompId) {
      const worldPos = screenToWorld(e.clientX, e.clientY);
      let newX = worldPos.x - dragOffset.x;
      let newY = worldPos.y - dragOffset.y;

      const isBreadboardType = (t: string) =>
        t === 'breadboard-half' || t === 'breadboard-mini' || t === 'breadboard-full';
      const draggingComp = components.find((c) => c.id === draggingCompId);
      const breadboards = components.filter((c) => isBreadboardType(c.type));

      let snappedToBreadboard = false;

      // Smart Magnetic Breadboard Snapping:
      // Snap Pin 1 directly to the nearest breadboard hole with spatial culling
      if (draggingComp && !isBreadboardType(draggingComp.type) && breadboards.length > 0) {
        const def = COMPONENT_DEFINITIONS[draggingComp.type];
        if (def && def.pins.length > 0) {
          const p1Candidate = getPinWorldPosition(
            newX,
            newY,
            def.width,
            def.height,
            draggingComp.rotation,
            def.pins[0]
          );

          let closestDist = Infinity;
          let bestDx = 0;
          let bestDy = 0;

          for (const bb of breadboards) {
            const bbDef = COMPONENT_DEFINITIONS[bb.type];
            if (!bbDef) continue;

            // Spatial Bounding Box Culling:
            // Skip breadboard entirely if cursor is more than 35px outside the board
            if (
              p1Candidate.x < bb.x - 35 ||
              p1Candidate.x > bb.x + bbDef.width + 35 ||
              p1Candidate.y < bb.y - 35 ||
              p1Candidate.y > bb.y + bbDef.height + 35
            ) {
              continue;
            }

            for (const bbPin of bbDef.pins) {
              const bbWorldX = bb.x + bbPin.x;
              const bbWorldY = bb.y + bbPin.y;

              // Fast Manhattan pre-filter before sqrt
              if (Math.abs(p1Candidate.x - bbWorldX) > 22 || Math.abs(p1Candidate.y - bbWorldY) > 22) {
                continue;
              }

              const dist = Math.hypot(p1Candidate.x - bbWorldX, p1Candidate.y - bbWorldY);
              if (dist < closestDist) {
                closestDist = dist;
                bestDx = bbWorldX - p1Candidate.x;
                bestDy = bbWorldY - p1Candidate.y;
              }
            }
          }

          // Magnetic snap threshold: 18px
          if (closestDist <= 18) {
            newX += bestDx;
            newY += bestDy;
            snappedToBreadboard = true;
          }
        }
      }

      if (!snappedToBreadboard && snapGrid) {
        newX = snapToGrid(newX, 10);
        newY = snapToGrid(newY, 10);
      }

      // Throttled position update with requestAnimationFrame for butter-smooth 60-144fps
      pendingDragPosRef.current = { id: draggingCompId, x: newX, y: newY };
      if (dragRafIdRef.current === null) {
        dragRafIdRef.current = requestAnimationFrame(() => {
          dragRafIdRef.current = null;
          if (pendingDragPosRef.current) {
            onUpdateComponentPosition(
              pendingDragPosRef.current.id,
              pendingDragPosRef.current.x,
              pendingDragPosRef.current.y,
              false
            );
          }
        });
      }
      return;
    }

    // 3. If drawing wire
    if (drawingWire) {
      const worldPos = screenToWorld(e.clientX, e.clientY);

      // Smart proximity magnetic snap to nearest valid target pin (threshold: 16 world px)
      let snapPos = worldPos;
      let snapTarget: { component: CircuitComponent; pin: Pin } | null = null;
      let minDistance = 16;

      for (const comp of components) {
        const def = COMPONENT_DEFINITIONS[comp.type];
        if (!def) continue;

        // Quick bounding box check before looping pins
        if (
          worldPos.x < comp.x - 25 ||
          worldPos.x > comp.x + def.width + 25 ||
          worldPos.y < comp.y - 25 ||
          worldPos.y > comp.y + def.height + 25
        ) {
          continue;
        }

        for (const pin of def.pins) {
          if (comp.id === drawingWire.fromComponentId && pin.id === drawingWire.fromPin.id) {
            continue;
          }

          const pinWorld = pinWorldMap.get(`${comp.id}:${pin.id}`);
          if (!pinWorld) continue;

          // Quick distance pre-filter
          if (Math.abs(worldPos.x - pinWorld.x) > minDistance || Math.abs(worldPos.y - pinWorld.y) > minDistance) {
            continue;
          }

          const dist = Math.hypot(worldPos.x - pinWorld.x, worldPos.y - pinWorld.y);
          if (dist < minDistance) {
            minDistance = dist;
            snapPos = pinWorld;
            snapTarget = { component: comp, pin };
          }
        }
      }

      setDrawingWire((prev) => (prev ? { ...prev, currentPoint: snapPos } : null));

      if (snapTarget) {
        setHoveredPinInfo({
          component: snapTarget.component,
          pin: snapTarget.pin,
          screenX: e.clientX,
          screenY: e.clientY,
        });
      } else {
        setHoveredPinInfo(null);
      }
    }
  };

  // Handle Mouse Up
  const handleMouseUp = () => {
    if (isPanning) setIsPanning(false);

    if (dragRafIdRef.current !== null) {
      cancelAnimationFrame(dragRafIdRef.current);
      dragRafIdRef.current = null;
    }

    if (draggingCompId) {
      const finalX = pendingDragPosRef.current ? pendingDragPosRef.current.x : null;
      const finalY = pendingDragPosRef.current ? pendingDragPosRef.current.y : null;
      const currentComp = components.find((c) => c.id === draggingCompId);

      const targetX = finalX ?? currentComp?.x;
      const targetY = finalY ?? currentComp?.y;

      if (
        targetX !== undefined &&
        targetY !== undefined &&
        dragInitialPosRef.current &&
        (targetX !== dragInitialPosRef.current.x || targetY !== dragInitialPosRef.current.y)
      ) {
        onUpdateComponentPosition(draggingCompId, targetX, targetY, true);
      }

      pendingDragPosRef.current = null;
      dragInitialPosRef.current = null;
      setDraggingCompId(null);
    }

    // If dragging a wire and released over a snapped target pin, finish connection!
    if (drawingWire && hoveredPinInfo) {
      if (
        hoveredPinInfo.component.id !== drawingWire.fromComponentId ||
        hoveredPinInfo.pin.id !== drawingWire.fromPin.id
      ) {
        finishWireConnection(hoveredPinInfo.component.id, hoveredPinInfo.pin);
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

    // Zoom centered on cursor
    const newPan = {
      x: mouseX - (mouseX - pan.x) * (newZoom / zoom),
      y: mouseY - (mouseY - pan.y) * (newZoom / zoom),
    };

    onZoomChange(newZoom);
    onPanChange(newPan);
  };

  // Pin Click / MouseDown (Supports Click-Click connection)
  const handlePinMouseDown = useCallback(
    (compId: string, pin: Pin, e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.button !== 0) return;

      if (!drawingWire) {
        // Start drawing wire
        const pinPos = getPinCoords(compId, pin.id);
        if (!pinPos) return;

        setDrawingWire({
          fromComponentId: compId,
          fromPin: pin,
          currentPoint: pinPos,
          waypoints: [],
        });
        onSelectComponent(null);
        onSelectWire(null);
      } else {
        // Finish wire connection on click!
        finishWireConnection(compId, pin);
      }
    },
    [drawingWire, getPinCoords, onSelectComponent, onSelectWire, finishWireConnection]
  );

  // Pin MouseUp (Supports Drag-and-Drop connection: click & drag from Pin A, release on Pin B)
  const handlePinMouseUp = useCallback(
    (compId: string, pin: Pin, e: React.MouseEvent) => {
      e.stopPropagation();
      if (e.button !== 0) return;

      if (drawingWire) {
        if (drawingWire.fromComponentId !== compId || drawingWire.fromPin.id !== pin.id) {
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

  // Component Drag Start
  const handleComponentMouseDown = useCallback(
    (comp: CircuitComponent, e: React.MouseEvent) => {
      if (drawingWire) return; // don't drag if wire drawing is active
      e.stopPropagation();

      onSelectComponent(comp.id);
      onSelectWire(null);

      const worldPos = screenToWorld(e.clientX, e.clientY);
      dragInitialPosRef.current = { x: comp.x, y: comp.y };
      setDraggingCompId(comp.id);
      setDragOffset({
        x: worldPos.x - comp.x,
        y: worldPos.y - comp.y,
      });
    },
    [drawingWire, onSelectComponent, onSelectWire, screenToWorld]
  );

  // Keyboard Shortcuts (Delete, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeTag = (document.activeElement?.tagName || '').toLowerCase();
        if (activeTag === 'input' || activeTag === 'textarea') return;
        onDeleteSelected();
      } else if (e.key === 'Escape') {
        setDrawingWire(null);
        onSelectComponent(null);
        onSelectWire(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDeleteSelected, onSelectComponent, onSelectWire]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
      className={`relative w-full h-full bg-[#020617] overflow-hidden select-none ${
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
        <g
          transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
          style={{ willChange: isPanning || draggingCompId ? 'transform' : 'auto' }}
        >
          {/* 1. Components Layer (Breadboards at base, then MCUs, then mounted components) */}
          <g id="components-layer" className="pointer-events-auto">
            {sortedComponents.map((comp) => (
              <g
                key={comp.id}
                onMouseDown={(e) => handleComponentMouseDown(comp, e)}
              >
                  <ComponentSvg
                    component={comp}
                    isSelected={selectedComponentId === comp.id}
                    isHovered={false}
                    activeWireStartPinId={
                      drawingWire?.fromComponentId === comp.id ? drawingWire.fromPin.id : null
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

          {/* 2. Wires Layer (Jumper wires ALWAYS render ON TOP of breadboard & boards!) */}
          <g id="wires-layer" className={drawingWire ? "pointer-events-none" : "pointer-events-auto"}>
            {wires.map((wire) => {
              const start = getPinCoords(wire.fromComponentId, wire.fromPinId);
              const end = getPinCoords(wire.toComponentId, wire.toPinId);
              if (!start || !end) return null;

              return (
                <WireSvg
                  key={wire.id}
                  wire={wire}
                  startPoint={start}
                  endPoint={end}
                  isSelected={selectedWireId === wire.id}
                  zoom={zoom}
                  onSelect={(w, e) => {
                    e.stopPropagation();
                    onSelectWire(w.id);
                    onSelectComponent(null);
                  }}
                  onUpdateWaypoints={onUpdateWireWaypoints}
                  onResetWaypoints={onResetWireWaypoints}
                />
              );
            })}

            {/* In-progress Active Wire Drawing */}
            {drawingWire && (() => {
              const start = getPinCoords(drawingWire.fromComponentId, drawingWire.fromPin.id);
              if (!start) return null;
              const pathD = generateWirePath(start, drawingWire.currentPoint, wireRouting, drawingWire.waypoints);

              return (
                <g className="pointer-events-none">
                  {/* Outer wire guide */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={currentWireColor}
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeDasharray="6 4"
                    className="animate-pulse pointer-events-none"
                  />
                  {/* Current point cursor eyelet */}
                  <circle
                    cx={drawingWire.currentPoint.x}
                    cy={drawingWire.currentPoint.y}
                    r="4"
                    fill={currentWireColor}
                    stroke="#020617"
                    strokeWidth="1.5"
                    className="pointer-events-none"
                  />
                </g>
              );
            })()}
          </g>
        </g>
      </svg>

      {/* Floating Pin Tooltip */}
      {hoveredPinInfo && (
        <div
          className="fixed z-50 pointer-events-none px-2.5 py-1.5 rounded-lg bg-slate-900/95 border border-slate-700 shadow-xl backdrop-blur-md transform -translate-x-1/2 -translate-y-full mb-3"
          style={{
            left: hoveredPinInfo.screenX,
            top: hoveredPinInfo.screenY - 8,
          }}
        >
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-100 font-mono">
              {hoveredPinInfo.pin.name}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase font-semibold ${
                hoveredPinInfo.pin.type === 'power'
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : hoveredPinInfo.pin.type === 'ground'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : hoveredPinInfo.pin.type === 'i2c'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : hoveredPinInfo.pin.type === 'pwm'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {hoveredPinInfo.pin.type}
            </span>
          </div>
          {hoveredPinInfo.pin.description && (
            <div className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
              {hoveredPinInfo.pin.description}
            </div>
          )}
          <div className="text-[10px] text-slate-400 mt-1 font-medium">
            {drawingWire
              ? '✓ Klik / Lepas mouse untuk menyambungkan'
              : 'Klik pin untuk mulai pasang kabel'}
          </div>
        </div>
      )}

      {/* Wire Drawing Help Banner */}
      {drawingWire && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-sky-500/40 text-slate-200 px-4 py-2 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-ping" />
          <div className="text-xs">
            Menghubungkan <span className="text-sky-400 font-mono font-medium">{drawingWire.fromPin.name}</span>: Klik pin target untuk menyambungkan, atau klik canvas untuk belokan.
          </div>
          <button
            onClick={() => setDrawingWire(null)}
            className="text-[11px] bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-slate-300 transition-colors"
          >
            Batal (Esc)
          </button>
        </div>
      )}
    </div>
  );
};
