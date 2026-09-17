import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { CircuitComponent, Wire, Pin, WirePoint, WireRouting } from '../../types/circuit';
import { COMPONENT_DEFINITIONS } from '../../constants/components';
import { getAllComponentDefinitions, CUSTOM_COMPONENTS_EVENT } from '../../utils/customComponents';
import { getPinWorldPosition, generateWirePath, snapToGrid, getAutoPinColor, getAutoWireColor } from '../../utils/geometry';
import { sortWiresForRendering } from '../../utils/orthogonalRouter';
import { ComponentSvg } from './ComponentSvg';
import { WireSvg } from './WireSvg';
import { ContextMenuState } from '../menu/ContextMenu';

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
  onDeleteSelected: () => void;
  onUpdateWireWaypoints?: (id: string, waypoints: WirePoint[]) => void;
  onResetWireWaypoints?: (id: string) => void;
  zoom: number;
  pan: WirePoint;
  onZoomChange: (newZoom: number) => void;
  onPanChange: (newPan: WirePoint) => void;
  onContextMenu: (state: ContextMenuState) => void;
  onCursorMove?: (worldPos: WirePoint) => void;
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
  onSelectComponents,
  onSelectWire,
  onUpdateComponentPositions,
  onAddWire,
  onDeleteSelected,
  onUpdateWireWaypoints,
  onResetWireWaypoints,
  zoom,
  pan,
  onZoomChange,
  onPanChange,
  onContextMenu,
  onCursorMove,
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

  // Wire drawing state
  const [drawingWire, setDrawingWire] = useState<{
    fromComponentId: string;
    fromPin: Pin;
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

  // Custom Component Unified Definitions state
  const [allDefs, setAllDefs] = useState<Record<string, any>>(() => getAllComponentDefinitions());

  useEffect(() => {
    const handleUpdate = () => {
      setAllDefs(getAllComponentDefinitions());
    };
    window.addEventListener(CUSTOM_COMPONENTS_EVENT, handleUpdate);
    return () => window.removeEventListener(CUSTOM_COMPONENTS_EVENT, handleUpdate);
  }, []);

  // Incremental Pin World Coordinate Cache: Only recalculate moved components!
  const pinCacheRef = useRef<Map<string, { x: number; y: number; rot: number; def: any; pins: Map<string, WirePoint> }>>(new Map());

  const pinWorldMap = useMemo(() => {
    const fullMap = new Map<string, WirePoint>();
    const currentCache = pinCacheRef.current;
    const newCache = new Map<string, { x: number; y: number; rot: number; def: any; pins: Map<string, WirePoint> }>();

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
        // Reuse cached pins without math!
        newCache.set(comp.id, cached);
        cached.pins.forEach((pos, key) => fullMap.set(key, pos));
      } else {
        // Compute only for this specific moved component
        const compPinMap = new Map<string, WirePoint>();
        for (const pin of def.pins) {
          const pos = getPinWorldPosition(comp.x, comp.y, def.width, def.height, comp.rotation, pin);
          const key = `${comp.id}:${pin.id}`;
          compPinMap.set(key, pos);
          fullMap.set(key, pos);
        }
        newCache.set(comp.id, { x: comp.x, y: comp.y, rot: comp.rotation, def, pins: compPinMap });
      }
    }

    pinCacheRef.current = newCache;
    return fullMap;
  }, [components, allDefs]);

  // Memoized sorted components to prevent expensive array sort on every render/mousemove
  const sortedComponents = useMemo(() => {
    const getOrder = (type: string) => {
      if (
        type === 'breadboard-half' ||
        type === 'breadboard-mini' ||
        type === 'breadboard-full'
      )
        return 0;
      if (
        type === 'arduino-uno' ||
        type === 'arduino-nano' ||
        type.startsWith('esp32') ||
        type.startsWith('wemos') ||
        type === 'battery-9v'
      )
        return 1;
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

  // Reference to prevent accidental double-click / immediate wire creation right after finishing a wire
  const justFinishedWireRef = useRef<number>(0);

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
      if (drawingWire.fromComponentId === targetCompId && drawingWire.fromPin.id === targetPin.id) {
        return;
      }

      const finalColor = getAutoWireColor(
        drawingWire.fromPin,
        targetPin,
        drawingWire.color || currentWireColor
      );

      if (onSelectWireColor) {
        onSelectWireColor(finalColor);
      }

      onAddWire({
        fromComponentId: drawingWire.fromComponentId,
        fromPinId: drawingWire.fromPin.id,
        toComponentId: targetCompId,
        toPinId: targetPin.id,
        color: finalColor,
        routing: wireRouting,
        waypoints: drawingWire.waypoints,
      });

      justFinishedWireRef.current = Date.now();
      setDrawingWire(null);
      setHoveredPinInfo(null);
    },
    [drawingWire, onAddWire, currentWireColor, wireRouting, onSelectWireColor]
  );

  // Cancel drawing wire on Escape key
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawingWire) {
        setDrawingWire(null);
        setHoveredPinInfo(null);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [drawingWire]);

  // Handle Mouse Down on Canvas Background
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    // If drawing wire: Clicking on canvas adds intermediate bend waypoints
    if (drawingWire) {
      if (e.button === 0) {
        const worldPos = screenToWorld(e.clientX, e.clientY);
        setDrawingWire((prev) => (prev ? { ...prev, waypoints: [...prev.waypoints, worldPos] } : null));
      } else if (e.button === 2) {
        // Right click cancels wire drawing
        setDrawingWire(null);
        setHoveredPinInfo(null);
      }
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
          if (comp.id === drawingWire.fromComponentId && pin.id === drawingWire.fromPin.id) {
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
  const handleMouseUp = (e: React.MouseEvent) => {
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

        const isCmdOrCtrl = e.ctrlKey || e.metaKey;
        if (isCmdOrCtrl) {
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
    [drawingWire, getPinCoords, onSelectComponents, onSelectWire, finishWireConnection, currentWireColor, onSelectWireColor]
  );

  // Pin MouseUp
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

  // Component Mouse Down (Single or Multi-select with CTRL/CMD, Group Drag initiation)
  const handleComponentMouseDown = useCallback(
    (comp: CircuitComponent, e: React.MouseEvent) => {
      if (drawingWire) return;
      if (e.button !== 0) return; // only left click
      e.stopPropagation();

      const isCmdOrCtrl = e.ctrlKey || e.metaKey;

      let nextSelectedIds = selectedComponentIds;
      if (isCmdOrCtrl) {
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
      const activeToDrag = components.filter(
        (c) => nextSelectedIds.includes(c.id) && !c.locked
      );
      const dragGroup = activeToDrag.some((c) => c.id === comp.id)
        ? activeToDrag
        : [comp];

      dragGroupInitPosRef.current = new Map(dragGroup.map((c) => [c.id, { x: c.x, y: c.y }]));

      const worldPos = screenToWorld(e.clientX, e.clientY);
      setDraggingCompId(comp.id);
      setDragOffset({
        x: worldPos.x - comp.x,
        y: worldPos.y - comp.y,
      });
    },
    [drawingWire, selectedComponentIds, components, onSelectComponents, onSelectWire, screenToWorld]
  );

  // Right Click (Context Menu Trigger) on Component
  const handleComponentContextMenu = (comp: CircuitComponent, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const worldPos = screenToWorld(e.clientX, e.clientY);
    let nextSelected = selectedComponentIds;
    if (!selectedComponentIds.includes(comp.id)) {
      nextSelected = [comp.id];
      onSelectComponents(nextSelected);
    }
    onContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      worldX: worldPos.x,
      worldY: worldPos.y,
      targetType: 'component',
      targetComponent: comp,
      selectedComponentIds: nextSelected,
    });
  };

  // Right Click on Wire
  const handleWireContextMenu = (wire: Wire, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const worldPos = screenToWorld(e.clientX, e.clientY);
    onSelectWire(wire.id);
    onSelectComponents([]);
    onContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      worldX: worldPos.x,
      worldY: worldPos.y,
      targetType: 'wire',
      targetWire: wire,
    });
  };

  // Right Click on Empty Canvas
  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const worldPos = screenToWorld(e.clientX, e.clientY);
    onContextMenu({
      isOpen: true,
      x: e.clientX,
      y: e.clientY,
      worldX: worldPos.x,
      worldY: worldPos.y,
      targetType: 'canvas',
    });
  };

  // Sort wires so jumping wires are on top, newer wires on top, and selected wire on the very top
  const sortedWires = useMemo(() => {
    return sortWiresForRendering(wires, getPinCoords, selectedWireId);
  }, [wires, getPinCoords, selectedWireId]);

  return (
    <div
      ref={containerRef}
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

          {/* 2. Wires Layer */}
          <g id="wires-layer" className={drawingWire ? "pointer-events-none" : "pointer-events-auto"}>
            {sortedWires.map((wire) => {
              const start = getPinCoords(wire.fromComponentId, wire.fromPinId);
              const end = getPinCoords(wire.toComponentId, wire.toPinId);
              if (!start || !end) return null;

              return (
                <g key={wire.id} onContextMenu={(e) => handleWireContextMenu(wire, e)}>
                  <WireSvg
                    wire={wire}
                    startPoint={start}
                    endPoint={end}
                    isSelected={selectedWireId === wire.id}
                    zoom={zoom}
                    onSelect={(w, e) => {
                      e.stopPropagation();
                      onSelectWire(w.id);
                      onSelectComponents([]);
                    }}
                    onUpdateWaypoints={onUpdateWireWaypoints}
                    onResetWaypoints={onResetWireWaypoints}
                  />
                </g>
              );
            })}

            {/* In-progress Active Wire Drawing */}
            {drawingWire && (() => {
              const start = getPinCoords(drawingWire.fromComponentId, drawingWire.fromPin.id);
              if (!start) return null;
              const pathD = generateWirePath(start, drawingWire.currentPoint, wireRouting, drawingWire.waypoints);
              const previewColor = hoveredPinInfo
                ? getAutoWireColor(
                    drawingWire.fromPin,
                    hoveredPinInfo.pin,
                    drawingWire.color || currentWireColor
                  )
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
                  <circle
                    cx={drawingWire.currentPoint.x}
                    cy={drawingWire.currentPoint.y}
                    r="4"
                    fill={previewColor}
                    stroke="#020617"
                    strokeWidth="1.5"
                    className="pointer-events-none"
                  />
                </g>
              );
            })()}
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
          className="fixed z-50 pointer-events-none px-2.5 py-1.5 rounded-lg bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 shadow-xl backdrop-blur-md transform -translate-x-1/2 -translate-y-full mb-3"
          style={{
            left: hoveredPinInfo.screenX,
            top: hoveredPinInfo.screenY - 8,
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
            {drawingWire
              ? '✓ Klik / Lepas mouse untuk menyambungkan'
              : 'Klik pin untuk mulai pasang kabel'}
          </div>
        </div>
      )}

      {/* Wire Drawing Help Banner */}
      {drawingWire && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-white/95 dark:bg-slate-900/95 border border-sky-500/40 text-slate-800 dark:text-slate-200 px-4 py-2 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-fade-in">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 dark:bg-sky-400 animate-ping" />
          <div className="text-xs flex items-center gap-1.5 flex-wrap">
            <span>Menghubungkan pin</span>
            <span className="text-sky-600 dark:text-sky-400 font-mono font-bold bg-sky-500/15 px-1.5 py-0.5 rounded border border-sky-500/30">
              {drawingWire.fromPin.name}
            </span>
            {hoveredPinInfo ? (
              <>
                <span className="text-slate-400">→</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-500/30">
                  {hoveredPinInfo.component.label || hoveredPinInfo.component.name}.{hoveredPinInfo.pin.name}
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">(Klik untuk menyambungkan)</span>
              </>
            ) : (
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">(Klik pin tujuan untuk menyambungkan, atau klik kanvas untuk belokan)</span>
            )}
          </div>
          <button
            onClick={() => {
              setDrawingWire(null);
              setHoveredPinInfo(null);
            }}
            className="text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 transition-colors cursor-pointer shrink-0"
          >
            Batal (Esc)
          </button>
        </div>
      )}
    </div>
  );
};
