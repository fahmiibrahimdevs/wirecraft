import React, { useState, useEffect, useMemo } from 'react';
import { Wire, WirePoint } from '../../types/circuit';
import {
  Point,
  liveWireRegistry,
  cleanAndSimplifyWaypoints,
  getEffectiveWaypoints,
  createRoundedOrthogonalPathWithJumps,
} from '../../utils/orthogonalRouter';
import { generateWirePath } from '../../utils/geometry';

interface WireSvgProps {
  wire: Wire;
  startPoint: WirePoint;
  endPoint: WirePoint;
  isSelected: boolean;
  zoom?: number;
  onSelect: (wire: Wire, e: React.MouseEvent) => void;
  onUpdateWaypoints?: (wireId: string, newWaypoints: WirePoint[]) => void;
  onResetWaypoints?: (wireId: string) => void;
}

type DragState =
  | {
      type: 'segment';
      segIndex: number;
      isVertical: boolean;
      startScreenX: number;
      startScreenY: number;
      initialPoints: Point[];
    }
  | {
      type: 'corner';
      pointIndex: number;
      startScreenX: number;
      startScreenY: number;
      initialPoints: Point[];
    }
  | {
      type: 'midpoint';
      segIndex: number;
      isVertical: boolean;
      startScreenX: number;
      startScreenY: number;
      initialPoints: Point[];
    }
  | null;

const WireSvgComponent: React.FC<WireSvgProps> = ({
  wire,
  startPoint,
  endPoint,
  isSelected,
  zoom = 1,
  onSelect,
  onUpdateWaypoints,
  onResetWaypoints,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [dragState, setDragState] = useState<DragState>(null);
  const [livePoints, setLivePoints] = useState<Point[] | null>(null);

  // Derive initial/effective waypoints
  const waypoints = useMemo(() => {
    const basePoints: Point[] = livePoints
      ? livePoints
      : getEffectiveWaypoints(wire, startPoint, endPoint);

    return wire.routing === 'orthogonal'
      ? cleanAndSimplifyWaypoints(basePoints)
      : [startPoint, ...(wire.waypoints || []), endPoint];
  }, [livePoints, wire, startPoint, endPoint]);

  // Register horizontal segments for electrical jump collision detection
  useEffect(() => {
    if (wire.routing === 'orthogonal') {
      liveWireRegistry.register(wire.id, waypoints);
    }
    return () => {
      liveWireRegistry.unregister(wire.id);
    };
  }, [wire.id, wire.routing, waypoints]);

  // Compute SVG Path
  let pathD = '';
  if (wire.routing === 'orthogonal') {
    const crossSegments = liveWireRegistry.getAllSegments(wire.id);
    const ortho = createRoundedOrthogonalPathWithJumps(waypoints, crossSegments, wire.id, 8, 6);
    pathD = ortho.path;
  } else {
    pathD = generateWirePath(startPoint, endPoint, wire.routing, wire.waypoints);
  }

  // Pointer Drag Handlers (Uses delta movement with zoom factor: absolutely zero jumping)
  const handleStartSegmentDrag = (segIndex: number, isVertical: boolean, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    setDragState({
      type: 'segment',
      segIndex,
      isVertical,
      startScreenX: e.clientX,
      startScreenY: e.clientY,
      initialPoints: waypoints.map((p) => ({ ...p })),
    });
  };

  const handleStartCornerDrag = (pointIndex: number, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    setDragState({
      type: 'corner',
      pointIndex,
      startScreenX: e.clientX,
      startScreenY: e.clientY,
      initialPoints: waypoints.map((p) => ({ ...p })),
    });
  };

  const handleStartMidpointDrag = (segIndex: number, isVertical: boolean, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    setDragState({
      type: 'midpoint',
      segIndex,
      isVertical,
      startScreenX: e.clientX,
      startScreenY: e.clientY,
      initialPoints: waypoints.map((p) => ({ ...p })),
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState) return;
    e.stopPropagation();
    e.preventDefault();

    const currentZoom = zoom || 1;
    const dx = (e.clientX - dragState.startScreenX) / currentZoom;
    const dy = (e.clientY - dragState.startScreenY) / currentZoom;

    let pts = dragState.initialPoints.map((p) => ({ ...p }));

    if (dragState.type === 'segment') {
      const idx = dragState.segIndex;
      const isV = dragState.isVertical;

      if (isV) {
        // Vertical segment moves horizontally by dx
        const newX = Math.round((dragState.initialPoints[idx]!.x + dx) / 4) * 4;
        if (idx === 0) {
          // First segment connected to startPoint
          pts = [
            startPoint,
            { x: newX, y: startPoint.y },
            { x: newX, y: dragState.initialPoints[1]?.y ?? endPoint.y },
            ...dragState.initialPoints.slice(2),
          ];
        } else if (idx === dragState.initialPoints.length - 2) {
          // Last segment connected to endPoint
          pts = [
            ...dragState.initialPoints.slice(0, idx),
            { x: newX, y: dragState.initialPoints[idx]!.y },
            { x: newX, y: endPoint.y },
            endPoint,
          ];
        } else {
          // Intermediate vertical segment: clean parallel shift
          pts[idx]!.x = newX;
          pts[idx + 1]!.x = newX;
        }
      } else {
        // Horizontal segment moves vertically by dy
        const newY = Math.round((dragState.initialPoints[idx]!.y + dy) / 4) * 4;
        if (idx === 0) {
          // First segment connected to startPoint
          pts = [
            startPoint,
            { x: startPoint.x, y: newY },
            { x: dragState.initialPoints[1]?.x ?? endPoint.x, y: newY },
            ...dragState.initialPoints.slice(2),
          ];
        } else if (idx === dragState.initialPoints.length - 2) {
          // Last segment connected to endPoint
          pts = [
            ...dragState.initialPoints.slice(0, idx),
            { x: dragState.initialPoints[idx]!.x, y: newY },
            { x: endPoint.x, y: newY },
            endPoint,
          ];
        } else {
          // Intermediate horizontal segment: clean parallel shift
          pts[idx]!.y = newY;
          pts[idx + 1]!.y = newY;
        }
      }

      setLivePoints(cleanAndSimplifyWaypoints(pts));
    } else if (dragState.type === 'corner') {
      const idx = dragState.pointIndex;
      if (idx > 0 && idx < dragState.initialPoints.length - 1) {
        const newX = Math.round((dragState.initialPoints[idx]!.x + dx) / 4) * 4;
        const newY = Math.round((dragState.initialPoints[idx]!.y + dy) / 4) * 4;

        const isPrevH =
          Math.abs(dragState.initialPoints[idx - 1]!.y - dragState.initialPoints[idx]!.y) <= 2;
        if (isPrevH) {
          if (idx - 1 > 0) pts[idx - 1]!.y = newY;
          pts[idx] = { x: newX, y: newY };
          if (idx + 1 < pts.length - 1) pts[idx + 1]!.x = newX;
        } else {
          if (idx - 1 > 0) pts[idx - 1]!.x = newX;
          pts[idx] = { x: newX, y: newY };
          if (idx + 1 < pts.length - 1) pts[idx + 1]!.y = newY;
        }
      }

      setLivePoints(cleanAndSimplifyWaypoints(pts));
    } else if (dragState.type === 'midpoint') {
      const idx = dragState.segIndex;
      const isV = dragState.isVertical;

      if (isV) {
        const newX = Math.round((dragState.initialPoints[idx]!.x + dx) / 4) * 4;
        const midY = (dragState.initialPoints[idx]!.y + dragState.initialPoints[idx + 1]!.y) / 2;
        pts = [
          ...dragState.initialPoints.slice(0, idx + 1),
          { x: dragState.initialPoints[idx]!.x, y: midY },
          { x: newX, y: midY },
          { x: newX, y: dragState.initialPoints[idx + 1]!.y },
          ...dragState.initialPoints.slice(idx + 1),
        ];
      } else {
        const newY = Math.round((dragState.initialPoints[idx]!.y + dy) / 4) * 4;
        const midX = (dragState.initialPoints[idx]!.x + dragState.initialPoints[idx + 1]!.x) / 2;
        pts = [
          ...dragState.initialPoints.slice(0, idx + 1),
          { x: midX, y: dragState.initialPoints[idx]!.y },
          { x: midX, y: newY },
          { x: dragState.initialPoints[idx + 1]!.x, y: newY },
          ...dragState.initialPoints.slice(idx + 1),
        ];
      }

      setLivePoints(cleanAndSimplifyWaypoints(pts));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!dragState) return;
    e.stopPropagation();
    e.preventDefault();

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const finalPoints = livePoints ? cleanAndSimplifyWaypoints(livePoints) : waypoints;

    setDragState(null);
    setLivePoints(null);

    if (onUpdateWaypoints) {
      onUpdateWaypoints(wire.id, finalPoints);
    }
  };

  const isActive = isSelected || isHovered || Boolean(dragState);

  const isDarkColor = (color: string): boolean => {
    const c = color.toLowerCase().trim();
    if (c === '#0f172a' || c === '#020617' || c === '#000000' || c === '#1e293b' || c === '#171717' || c === 'black') {
      return true;
    }
    if (c.startsWith('#') && c.length === 7) {
      const r = parseInt(c.slice(1, 3), 16);
      const g = parseInt(c.slice(3, 5), 16);
      const b = parseInt(c.slice(5, 7), 16);
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      return lum < 50;
    }
    return false;
  };
  const isDarkWire = isDarkColor(wire.color);

  return (
    <g
      className="cursor-pointer group/wire"
      onClick={(e) => onSelect(wire, e)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (onResetWaypoints) onResetWaypoints(wire.id);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        if (!dragState) setIsHovered(false);
      }}
    >
      {/* 1. Selection & Hover Outline (Clean Matte, Zero-Neon) */}
      {isSelected ? (
        <path
          d={pathD}
          fill="none"
          stroke="#ffffff"
          strokeWidth="6.5"
          strokeDasharray="6 4"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.8"
          className="pointer-events-none"
        />
      ) : isHovered ? (
        <path
          d={pathD}
          fill="none"
          stroke="#94a3b8"
          strokeWidth="5.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.35"
          className="pointer-events-none"
        />
      ) : null}

      {/* 2. Outer Border / Casing - Uses contrast slate outline for dark/black wires */}
      <path
        d={pathD}
        fill="none"
        stroke={isDarkWire ? '#475569' : '#020617'}
        strokeWidth={isDarkWire ? 5.2 : 4.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={isDarkWire ? 0.95 : 0.9}
      />

      {/* 3. Main Colored Wire - Thick and rich wire body */}
      <path
        d={pathD}
        fill="none"
        stroke={isDarkWire ? '#1e293b' : wire.color}
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-colors duration-150 group-hover/wire:brightness-125"
      />

      {/* 4. Glossy Center Highlight */}
      <path
        d={pathD}
        fill="none"
        stroke={isDarkWire ? '#94a3b8' : '#ffffff'}
        strokeWidth={isDarkWire ? 1.0 : 0.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={isDarkWire ? 0.55 : 0.4}
      />

      {/* 5. Terminal Eyelets */}
      <circle
        cx={startPoint.x}
        cy={startPoint.y}
        r="4"
        fill={isDarkWire ? '#1e293b' : wire.color}
        stroke={isDarkWire ? '#475569' : '#020617'}
        strokeWidth="1.2"
        className="pointer-events-none"
      />
      <circle
        cx={endPoint.x}
        cy={endPoint.y}
        r="4"
        fill={isDarkWire ? '#1e293b' : wire.color}
        stroke={isDarkWire ? '#475569' : '#020617'}
        strokeWidth="1.2"
        className="pointer-events-none"
      />

      {/* 6. Non-orthogonal Invisible Hitbox */}
      {wire.routing !== 'orthogonal' && (
        <path
          d={pathD}
          fill="none"
          stroke="transparent"
          strokeWidth="18"
          strokeLinecap="round"
        />
      )}

      {/* 7. Interactive Orthogonal Segment Drag Hitboxes (ERD Studio style) */}
      {wire.routing === 'orthogonal' &&
        waypoints.map((p, idx) => {
          if (idx === waypoints.length - 1) return null;
          const nextP = waypoints[idx + 1]!;
          const isVertical = Math.abs(p.x - nextP.x) < 2;
          const isHorizontal = Math.abs(p.y - nextP.y) < 2;

          if (!isVertical && !isHorizontal) return null;

          const cursorClass = isVertical ? 'cursor-ew-resize' : 'cursor-ns-resize';

          return (
            <line
              key={`seg-hitbox-${idx}`}
              x1={p.x}
              y1={p.y}
              x2={nextP.x}
              y2={nextP.y}
              stroke="transparent"
              strokeWidth={18}
              strokeLinecap="round"
              className={cursorClass}
              onPointerDown={(e) => handleStartSegmentDrag(idx, isVertical, e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            />
          );
        })}

      {/* 8. Interactive Handles (Corner & Midpoint dots when Hovered or Selected) */}
      {isActive && wire.routing === 'orthogonal' && (
        <g>
          {/* Corner Handles */}
          {waypoints.map((p, idx) => {
            if (idx === 0 || idx === waypoints.length - 1) return null;
            return (
              <g key={`corner-${idx}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={12}
                  fill="transparent"
                  className="cursor-move"
                  onPointerDown={(e) => handleStartCornerDrag(idx, e)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={4.5}
                  fill="#0f172a"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  className="pointer-events-none"
                />
              </g>
            );
          })}

          {/* Midpoint Split Handles */}
          {waypoints.map((p, idx) => {
            if (idx === waypoints.length - 1) return null;
            const nextP = waypoints[idx + 1]!;
            const midX = (p.x + nextP.x) / 2;
            const midY = (p.y + nextP.y) / 2;
            const len = Math.hypot(nextP.x - p.x, nextP.y - p.y);
            const isVertical = Math.abs(p.x - nextP.x) < 2;

            if (len < 32) return null;

            return (
              <g key={`midpoint-${idx}`}>
                <circle
                  cx={midX}
                  cy={midY}
                  r={10}
                  fill="transparent"
                  className={isVertical ? 'cursor-ew-resize' : 'cursor-ns-resize'}
                  onPointerDown={(e) => handleStartMidpointDrag(idx, isVertical, e)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                />
                <circle
                  cx={midX}
                  cy={midY}
                  r={3.5}
                  fill="#0284c7"
                  stroke="#38bdf8"
                  strokeWidth={1.5}
                  className="pointer-events-none opacity-80 hover:opacity-100 transition-opacity"
                />
              </g>
            );
          })}
        </g>
      )}
    </g>
  );
};

function areWirePropsEqual(prev: WireSvgProps, next: WireSvgProps): boolean {
  if (prev.isSelected !== next.isSelected) return false;
  if (Math.abs((prev.zoom || 1) - (next.zoom || 1)) > 0.001) return false;

  if (prev.startPoint.x !== next.startPoint.x || prev.startPoint.y !== next.startPoint.y) return false;
  if (prev.endPoint.x !== next.endPoint.x || prev.endPoint.y !== next.endPoint.y) return false;

  const pw = prev.wire;
  const nw = next.wire;

  if (pw === nw) return true;
  if (pw.id !== nw.id || pw.color !== nw.color || pw.routing !== nw.routing) return false;
  if (pw.fromComponentId !== nw.fromComponentId || pw.toComponentId !== nw.toComponentId) return false;
  if (pw.fromPinId !== nw.fromPinId || pw.toPinId !== nw.toPinId) return false;

  const pwPts = pw.waypoints || [];
  const nwPts = nw.waypoints || [];
  if (pwPts.length !== nwPts.length) return false;
  for (let i = 0; i < pwPts.length; i++) {
    if (pwPts[i]!.x !== nwPts[i]!.x || pwPts[i]!.y !== nwPts[i]!.y) return false;
  }

  return true;
}

export const WireSvg = React.memo(WireSvgComponent, areWirePropsEqual);
