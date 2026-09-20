import React, { useState, useRef, useCallback } from 'react';
import { CircuitComponent, ComponentDefinition, Pin, WirePoint } from '../types/circuit';
import { COMPONENT_DEFINITIONS } from '../constants/components';
import { getPinWorldPosition, snapToGrid } from '../utils/geometry';
import { ContextMenuState } from '../components/menu/ContextMenu';

// Helper to check if a component is mounted on / inside a breadboard's area
export function isComponentOnBreadboard(
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

interface UseComponentDragProps {
  components: CircuitComponent[];
  allDefs: Record<string, any>;
  selectedComponentIds: string[];
  snapGrid: boolean;
  drawingWire: any;
  screenToWorld: (clientX: number, clientY: number) => WirePoint;
  onSelectComponents: (ids: string[]) => void;
  onSelectWire: (id: string | null) => void;
  onUpdateComponentPositions: (
    updates: { id: string; x: number; y: number }[],
    isFinal?: boolean
  ) => void;
  pan: WirePoint;
  setIsPanning: (panning: boolean) => void;
  setPanStart: (start: WirePoint) => void;
  isRightMouseDownRef: React.MutableRefObject<boolean>;
  rightClickStartPosRef: React.MutableRefObject<{ x: number; y: number } | null>;
  rightClickDidDragRef: React.MutableRefObject<boolean>;
  pendingContextMenuRef: React.MutableRefObject<ContextMenuState | null>;
}

export function useComponentDrag({
  components,
  allDefs,
  selectedComponentIds,
  snapGrid,
  drawingWire,
  screenToWorld,
  onSelectComponents,
  onSelectWire,
  onUpdateComponentPositions,
  pan,
  setIsPanning,
  setPanStart,
  isRightMouseDownRef,
  rightClickStartPosRef,
  rightClickDidDragRef,
  pendingContextMenuRef,
}: UseComponentDragProps) {
  // Multi-Dragging state for components
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<WirePoint>({ x: 0, y: 0 });
  const dragGroupInitPosRef = useRef<Map<string, WirePoint>>(new Map());
  const dragRafIdRef = useRef<number | null>(null);
  const pendingUpdatesRef = useRef<{ id: string; x: number; y: number }[] | null>(null);

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
    [
      drawingWire,
      selectedComponentIds,
      components,
      allDefs,
      onSelectComponents,
      onSelectWire,
      screenToWorld,
      pan,
      setIsPanning,
      setPanStart,
      isRightMouseDownRef,
      rightClickStartPosRef,
      rightClickDidDragRef,
      pendingContextMenuRef,
    ]
  );

  // Perform component drag movement math with breadboard docking and pin snapping
  const handleComponentDragMove = useCallback(
    (worldPos: WirePoint) => {
      if (!draggingCompId) return;

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

                if (
                  Math.abs(pCandidate.x - bbWorldX) > 16 ||
                  Math.abs(pCandidate.y - bbWorldY) > 16
                ) {
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
    },
    [
      draggingCompId,
      dragOffset,
      components,
      allDefs,
      snapGrid,
      onUpdateComponentPositions,
    ]
  );

  // Finalize component drag on mouseup
  const handleComponentDragEnd = useCallback(() => {
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
  }, [draggingCompId, onUpdateComponentPositions]);

  return {
    draggingCompId,
    dragOffset,
    handleComponentMouseDown,
    handleComponentDragMove,
    handleComponentDragEnd,
  };
}
