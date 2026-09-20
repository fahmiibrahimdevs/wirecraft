import React, { useState, useRef, useCallback, useEffect } from 'react';
import { WirePoint } from '../types/circuit';
import { ContextMenuState } from '../components/menu/ContextMenu';

interface UseCanvasGesturesProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  pan: WirePoint;
  zoom: number;
  onPanChange: (newPan: WirePoint) => void;
  onZoomChange: (newZoom: number) => void;
  onContextMenu: (state: ContextMenuState) => void;
}

export function useCanvasGestures({
  containerRef,
  pan,
  zoom,
  onPanChange,
  onZoomChange,
  onContextMenu,
}: UseCanvasGesturesProps) {
  // Panning state for canvas
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<WirePoint>({ x: 0, y: 0 });

  // Marquee Drag Selection Box state
  const [marqueeStart, setMarqueeStart] = useState<WirePoint | null>(null);
  const [marqueeCurrent, setMarqueeCurrent] = useState<WirePoint | null>(null);

  // References for right-click drag pan vs context menu click detection
  const rightClickStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const rightClickDidDragRef = useRef<boolean>(false);
  const isRightMouseDownRef = useRef<boolean>(false);
  const pendingContextMenuRef = useRef<ContextMenuState | null>(null);

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
    [containerRef, pan, zoom]
  );

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
      if (
        containerRef.current &&
        (containerRef.current === target || containerRef.current.contains(target))
      ) {
        e.preventDefault();
      }
    };

    window.addEventListener('contextmenu', handleCaptureContextMenu, true);
    return () => {
      window.removeEventListener('contextmenu', handleCaptureContextMenu, true);
    };
  }, [containerRef]);

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

  // Handle Zoom with mouse wheel
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
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
    },
    [containerRef, zoom, pan, onZoomChange, onPanChange]
  );

  return {
    isPanning,
    setIsPanning,
    panStart,
    setPanStart,
    marqueeStart,
    setMarqueeStart,
    marqueeCurrent,
    setMarqueeCurrent,
    screenToWorld,
    handleWheel,
    handleRightClickUp,
    isRightMouseDownRef,
    rightClickStartPosRef,
    rightClickDidDragRef,
    pendingContextMenuRef,
  };
}
