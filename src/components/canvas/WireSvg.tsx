import React, { useLayoutEffect, useMemo, useSyncExternalStore } from 'react';
import { Wire, WirePoint } from '../../types/circuit';
import {
  Point,
  liveWireRegistry,
  cleanAndSimplifyWaypoints,
  getEffectiveWaypoints,
  createRoundedOrthogonalPathWithJumps,
} from '../../utils/orthogonalRouter';
import { generateWirePath, PinDirection, getCleanPinName, isScrewTerminalConnection, isActivePinSignalConnection } from '../../utils/geometry';

interface WireSvgProps {
  wire: Wire;
  startPoint: WirePoint;
  endPoint: WirePoint;
  startDir?: PinDirection;
  endDir?: PinDirection;
  netSignalName?: string;
  resolvedWaypoints?: Point[];
  connectedWireIds?: Set<string>;
  junctionPoints?: Point[];
  liveWaypoints?: Point[];
  isSelected: boolean;
  zoom?: number;
  showWireMarkers?: boolean;
  fromPinName?: string;
  toPinName?: string;
  fromCompType?: string;
  toCompType?: string;
  onSelect: (wire: Wire, e: React.MouseEvent) => void;
  onResetWaypoints?: (wireId: string) => void;
  onStartEndpointDrag?: (wire: Wire, endpoint: 'start' | 'end', e: React.PointerEvent) => void;
  onStartSegmentDrag?: (wire: Wire, segIndex: number, isVertical: boolean, e: React.PointerEvent) => void;
  onStartJunctionDrag?: (wire: Wire, junctionIndex: number, jp: Point, isVerticalBus: boolean, e: React.PointerEvent) => void;
  onStartCornerDrag?: (wire: Wire, pointIndex: number, e: React.PointerEvent) => void;
  onStartMidpointDrag?: (wire: Wire, segIndex: number, isVertical: boolean, e: React.PointerEvent) => void;
}

const WireSvgComponent: React.FC<WireSvgProps> = ({
  wire,
  startPoint,
  endPoint,
  startDir,
  endDir,
  netSignalName,
  resolvedWaypoints,
  connectedWireIds,
  junctionPoints = [],
  liveWaypoints,
  isSelected,
  zoom = 1,
  showWireMarkers = true,
  fromPinName,
  toPinName,
  fromCompType,
  toCompType,
  onSelect,
  onResetWaypoints,
  onStartEndpointDrag,
  onStartSegmentDrag,
  onStartJunctionDrag,
  onStartCornerDrag,
  onStartMidpointDrag,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  // Subscribe to live segment updates across all wires so jumping arc bridges update synchronously in real-time
  useSyncExternalStore(liveWireRegistry.subscribe, liveWireRegistry.getVersion);

  // Derive initial/effective waypoints (use live dragging waypoints if active, or router's resolved waypoints)
  const waypoints = useMemo(() => {
    if (liveWaypoints && liveWaypoints.length >= 2) {
      return liveWaypoints;
    }
    if (resolvedWaypoints && resolvedWaypoints.length >= 2) {
      return resolvedWaypoints;
    }
    const basePoints: Point[] = getEffectiveWaypoints(wire, startPoint, endPoint, startDir, endDir);

    return wire.routing === 'orthogonal'
      ? cleanAndSimplifyWaypoints(basePoints)
      : [startPoint, ...(wire.waypoints || []), endPoint];
  }, [liveWaypoints, resolvedWaypoints, wire, startPoint, endPoint, startDir, endDir]);

  // Register horizontal segments for electrical jump collision detection
  useLayoutEffect(() => {
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
    const ortho = createRoundedOrthogonalPathWithJumps(
      waypoints,
      crossSegments,
      wire.id,
      connectedWireIds || new Set(),
      8,
      6,
      junctionPoints
    );
    pathD = ortho.path;
  } else {
    pathD = generateWirePath(startPoint, endPoint, wire.routing, wire.waypoints, startDir, endDir);
  }

  const pStart = (waypoints && waypoints.length >= 2 ? waypoints[0]! : startPoint) || startPoint;
  const pEnd = (waypoints && waypoints.length >= 2 ? waypoints[waypoints.length - 1]! : endPoint) || endPoint;

  const isStartPin = Boolean(wire.fromComponentId && wire.fromPinId) && Math.hypot(pStart.x - startPoint.x, pStart.y - startPoint.y) <= 6;
  const isStartTap = Boolean(wire.fromWireId && (!connectedWireIds || connectedWireIds.has(wire.fromWireId)));
  const isStartJunction = isStartTap || junctionPoints.some((p) => Math.hypot(p.x - pStart.x, p.y - pStart.y) < 2);

  const isEndPin = Boolean(wire.toComponentId && wire.toPinId) && Math.hypot(pEnd.x - endPoint.x, pEnd.y - endPoint.y) <= 6;
  const isEndTap = Boolean(wire.toWireId && (!connectedWireIds || connectedWireIds.has(wire.toWireId)));
  const isEndJunction = isEndTap || junctionPoints.some((p) => Math.hypot(p.x - pEnd.x, p.y - pEnd.y) < 2);

  const isActive = isSelected || isHovered || Boolean(liveWaypoints);

  // Total wire path length calculation
  const totalWireLength = useMemo(() => {
    let len = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      len += Math.hypot(waypoints[i + 1]!.x - waypoints[i]!.x, waypoints[i + 1]!.y - waypoints[i]!.y);
    }
    return len;
  }, [waypoints]);

  // Helper to check if a pin name is generic/passive or a raw breadboard coordinate
  const isGenericOrBbCoordinate = (name: string) => {
    if (!name) return true;
    const lower = name.toLowerCase();
    return /^[a-j]\d+$/i.test(lower) || lower === '+' || lower === '-' || lower === 'a' || lower === 'k' || lower === 'pos' || lower === 'neg';
  };

  const rawStartName = useMemo(() => getCleanPinName(fromPinName, wire.fromPinId), [fromPinName, wire.fromPinId]);
  const rawEndName = useMemo(() => getCleanPinName(toPinName, wire.toPinId), [toPinName, wire.toPinId]);

  // Derived labels for Start and End Marking Tubes
  const startLabel = useMemo(() => {
    if (wire.label) return wire.label;
    if (netSignalName && (!rawStartName || isGenericOrBbCoordinate(rawStartName))) return netSignalName;
    return rawStartName || netSignalName || '';
  }, [wire.label, rawStartName, netSignalName]);

  const endLabel = useMemo(() => {
    if (wire.label) return wire.label;
    if (netSignalName && (!rawEndName || isGenericOrBbCoordinate(rawEndName))) return netSignalName;
    return rawEndName || netSignalName || '';
  }, [wire.label, rawEndName, netSignalName]);

  const effectiveStartLabel = startLabel || netSignalName || endLabel || '';
  const effectiveEndLabel = endLabel || netSignalName || startLabel || '';
  const effectiveCenterLabel = wire.label || netSignalName || startLabel || endLabel || '';

  // Ferrule Crimp Boot Detection (Active on screw terminals, fitting lamp, steker, relay, etc.)
  const startHasFerrule = isStartPin && isScrewTerminalConnection(fromCompType, wire.fromPinId);
  const endHasFerrule = isEndPin && isScrewTerminalConnection(toCompType, wire.toPinId);

  // Dynamic dimension & clearance calculations (ensures marking tubes NEVER overlap solder dots)
  const startTubeWidth = Math.max(16, (effectiveStartLabel.length || 2) * 5.2 + 6);
  const endTubeWidth = Math.max(16, (effectiveEndLabel.length || 2) * 5.2 + 6);
  const centerTubeWidth = Math.max(16, (effectiveCenterLabel.length || 2) * 5.2 + 6);

  // Dynamic clearance: near edge of tube must be at least marginGap away from the solder dot
  // targetDist = marginGap + (tubeWidth / 2)
  const startMargin = startHasFerrule ? 18 : 14;
  const endMargin = endHasFerrule ? 18 : 14;
  const startDist = startMargin + startTubeWidth / 2;
  const endDist = endMargin + endTubeWidth / 2;

  // Dual markers require enough wire length so both sleeves fit with at least a 10px clear gap
  const minDualLength = startDist + startTubeWidth / 2 + endDist + endTubeWidth / 2 + 10;
  const minSingleLength = Math.max(22, centerTubeWidth + 8);

  // Active pin signal detection for automatic mode
  const rawStartActive = isActivePinSignalConnection(fromCompType, wire.fromPinId, fromPinName);
  const rawEndActive = isActivePinSignalConnection(toCompType, wire.toPinId, toPinName);

  // Position mode: 'auto' | 'start' | 'end' | 'both' | 'center' | 'none'
  const posMode = wire.markerPosition || (wire.label !== undefined ? (wire.label ? 'both' : 'none') : 'auto');

  let renderStart = false;
  let renderEnd = false;
  let renderCenter = false;

  if (posMode === 'none' || (wire.label !== undefined && wire.label.trim() === '')) {
    renderStart = false;
    renderEnd = false;
    renderCenter = false;
  } else if (posMode === 'start') {
    renderStart = Boolean(effectiveStartLabel);
  } else if (posMode === 'end') {
    renderEnd = Boolean(effectiveEndLabel);
  } else if (posMode === 'center') {
    renderCenter = Boolean(effectiveCenterLabel);
  } else if (posMode === 'both') {
    if (totalWireLength < minDualLength) {
      renderCenter = Boolean(effectiveCenterLabel);
    } else {
      renderStart = Boolean(effectiveStartLabel);
      renderEnd = Boolean(effectiveEndLabel);
    }
  } else {
    // 'auto' mode: Smart clean behavior
    if (rawStartActive && rawEndActive) {
      if (totalWireLength < minDualLength) {
        renderCenter = Boolean(effectiveCenterLabel);
      } else {
        renderStart = Boolean(effectiveStartLabel);
        renderEnd = Boolean(effectiveEndLabel);
      }
    } else if (rawStartActive && !rawEndActive) {
      // Source is active MCU/Power, destination is passive resistor -> mark start only
      renderStart = Boolean(effectiveStartLabel);
    } else if (!rawStartActive && rawEndActive) {
      // Source is passive LED, destination is GND/Power rail -> mark end only
      renderEnd = Boolean(effectiveEndLabel);
    } else {
      // Both ends are passive / unlabeled jumpers -> clean (no marker)
      renderStart = false;
      renderEnd = false;
      renderCenter = false;
    }
  }

  const hasAnyMarker = renderStart || renderEnd || renderCenter;

  // Helper to sample point and orientation along polyline
  const getPointAndTangentAtDistance = (points: Point[], targetDist: number): { pos: Point; dir: Point; isVertical: boolean } | null => {
    if (points.length < 2) return null;
    let currentDist = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i]!;
      const p2 = points[i + 1]!;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const segLen = Math.hypot(dx, dy);
      if (segLen === 0) continue;

      if (currentDist + segLen >= targetDist || i === points.length - 2) {
        const remain = Math.max(0, Math.min(segLen, targetDist - currentDist));
        const ratio = segLen > 0 ? remain / segLen : 0;
        return {
          pos: { x: p1.x + dx * ratio, y: p1.y + dy * ratio },
          dir: { x: dx / segLen, y: dy / segLen },
          isVertical: Math.abs(dy) >= Math.abs(dx),
        };
      }
      currentDist += segLen;
    }
    return null;
  };

  // Render Ferrule Crimp Boot (Metallic collar + Insulating boot)
  const renderFerruleBoot = (p0: Point, pNext: Point, isVertical: boolean, key: string) => {
    const dx = pNext.x - p0.x;
    const dy = pNext.y - p0.y;
    const len = Math.hypot(dx, dy);
    if (len < 6) return null;
    const ux = dx / len;
    const uy = dy / len;

    const tipCenter = { x: p0.x + ux * 2, y: p0.y + uy * 2 };
    const bootCenter = { x: p0.x + ux * 6, y: p0.y + uy * 6 };

    if (isVertical) {
      return (
        <g key={key} className="pointer-events-none">
          <rect x={tipCenter.x - 2} y={tipCenter.y - 2} width={4} height={4} fill="#cbd5e1" stroke="#64748b" strokeWidth="0.5" rx={0.5} />
          <rect x={bootCenter.x - 3} y={bootCenter.y - 3} width={6} height={6.5} fill="#0284c7" stroke="#0369a1" strokeWidth="0.5" rx={1} />
          <line x1={bootCenter.x - 1.5} y1={bootCenter.y - 2.5} x2={bootCenter.x - 1.5} y2={bootCenter.y + 2.5} stroke="#38bdf8" strokeWidth="0.6" opacity="0.8" />
        </g>
      );
    } else {
      return (
        <g key={key} className="pointer-events-none">
          <rect x={tipCenter.x - 2} y={tipCenter.y - 2} width={4} height={4} fill="#cbd5e1" stroke="#64748b" strokeWidth="0.5" rx={0.5} />
          <rect x={bootCenter.x - 3} y={bootCenter.y - 3} width={6.5} height={6} fill="#0284c7" stroke="#0369a1" strokeWidth="0.5" rx={1} />
          <line x1={bootCenter.x - 2.5} y1={bootCenter.y - 1.5} x2={bootCenter.x + 2.5} y2={bootCenter.y - 1.5} stroke="#38bdf8" strokeWidth="0.6" opacity="0.8" />
        </g>
      );
    }
  };

  // Render Cable Marking Tube (White sleeve with crisp text)
  const renderMarkingTube = (
    info: { pos: Point; dir: Point; isVertical: boolean },
    text: string,
    key: string
  ) => {
    if (!text) return null;
    const cleanText = text.trim();
    if (!cleanText) return null;

    const charCount = cleanText.length;
    const tubeHeight = 11.5;
    const tubeWidth = Math.max(16, charCount * 5.2 + 6);

    if (info.isVertical) {
      const rx = info.pos.x - tubeHeight / 2;
      const ry = info.pos.y - tubeWidth / 2;
      return (
        <g key={key} className="group/tube">
          <rect x={rx} y={ry} width={tubeHeight} height={tubeWidth} rx={2} ry={2} fill="#ffffff" stroke="#94a3b8" strokeWidth="0.75" className="shadow-sm transition-all group-hover/tube:stroke-sky-500 group-hover/tube:fill-slate-50" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.18))' }} />
          <line x1={rx} y1={ry + 2} x2={rx + tubeHeight} y2={ry + 2} stroke="#e2e8f0" strokeWidth="0.5" />
          <line x1={rx} y1={ry + tubeWidth - 2} x2={rx + tubeHeight} y2={ry + tubeWidth - 2} stroke="#e2e8f0" strokeWidth="0.5" />
          <text x={info.pos.x} y={info.pos.y} transform={`rotate(-90 ${info.pos.x} ${info.pos.y})`} fill="#0f172a" fontSize="7.5" fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" fontWeight="bold" textAnchor="middle" dominantBaseline="central" className="select-none pointer-events-none tracking-tight">{cleanText}</text>
        </g>
      );
    } else {
      const rx = info.pos.x - tubeWidth / 2;
      const ry = info.pos.y - tubeHeight / 2;
      return (
        <g key={key} className="group/tube">
          <rect x={rx} y={ry} width={tubeWidth} height={tubeHeight} rx={2} ry={2} fill="#ffffff" stroke="#94a3b8" strokeWidth="0.75" className="shadow-sm transition-all group-hover/tube:stroke-sky-500 group-hover/tube:fill-slate-50" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.18))' }} />
          <line x1={rx + 2} y1={ry} x2={rx + 2} y2={ry + tubeHeight} stroke="#e2e8f0" strokeWidth="0.5" />
          <line x1={rx + tubeWidth - 2} y1={ry} x2={rx + tubeWidth - 2} y2={ry + tubeHeight} stroke="#e2e8f0" strokeWidth="0.5" />
          <text x={info.pos.x} y={info.pos.y} fill="#0f172a" fontSize="7.5" fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" fontWeight="bold" textAnchor="middle" dominantBaseline="central" className="select-none pointer-events-none tracking-tight">{cleanText}</text>
        </g>
      );
    }
  };

  return (
    <g
      className="cursor-pointer group/wire"
      onClick={(e) => onSelect(wire, e)}
      onDoubleClick={(e) => { e.stopPropagation(); onResetWaypoints?.(wire.id); }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 1. Selection Aura Glow */}
      {isSelected && <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" className="pointer-events-none animate-pulse" />}

      {/* 2. Main Colored Wire - Clean, flat and crisp */}
      <path d={pathD} fill="none" stroke={wire.color} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" className={isSelected ? 'brightness-110' : 'group-hover/wire:brightness-110'} />

      {/* 3. Terminal Dots & T-Junction Solder Dots (Only rendered at valid connections, NEVER stranded) */}
      {(isStartPin || isStartTap || isStartJunction) && <circle cx={pStart.x} cy={pStart.y} r={isStartTap || isStartJunction ? 3.8 : 3.4} fill={wire.color} className="pointer-events-none" />}
      {(isEndPin || isEndTap || isEndJunction) && <circle cx={pEnd.x} cy={pEnd.y} r={isEndTap || isEndJunction ? 3.8 : 3.4} fill={wire.color} className="pointer-events-none" />}

      {/* T-Junction Solder Dots on wire body */}
      {junctionPoints.map((jp, idx) => {
        const isStart = Math.hypot(jp.x - pStart.x, jp.y - pStart.y) < 2;
        const isEnd = Math.hypot(jp.x - pEnd.x, jp.y - pEnd.y) < 2;
        if (isStart || isEnd) return null;
        return <circle key={`jp-${idx}`} cx={jp.x} cy={jp.y} r={3.8} fill={wire.color} className="pointer-events-none" />;
      })}

      {/* 4. Cable Marking Tubes & Ferrule Boots (Industrial Sleeve Aesthetic) */}
      {showWireMarkers && (startHasFerrule || endHasFerrule || (hasAnyMarker && totalWireLength >= minSingleLength)) && (
        <g className="wire-marking-tubes pointer-events-auto">
          {startHasFerrule && waypoints.length >= 2 && renderFerruleBoot(waypoints[0]!, waypoints[1]!, Math.abs(waypoints[1]!.y - waypoints[0]!.y) >= Math.abs(waypoints[1]!.x - waypoints[0]!.x), `ferrule-start-${wire.id}`)}
          {endHasFerrule && waypoints.length >= 2 && renderFerruleBoot(waypoints[waypoints.length - 1]!, waypoints[waypoints.length - 2]!, Math.abs(waypoints[waypoints.length - 2]!.y - waypoints[waypoints.length - 1]!.y) >= Math.abs(waypoints[waypoints.length - 2]!.x - waypoints[waypoints.length - 1]!.x), `ferrule-end-${wire.id}`)}

          {renderCenter && (() => {
            const centerInfo = getPointAndTangentAtDistance(waypoints, totalWireLength / 2);
            return centerInfo && effectiveCenterLabel ? renderMarkingTube(centerInfo, effectiveCenterLabel, `tube-center-${wire.id}`) : null;
          })()}

          {renderStart && (() => {
            const startInfo = getPointAndTangentAtDistance(waypoints, startDist);
            return startInfo && effectiveStartLabel ? renderMarkingTube(startInfo, effectiveStartLabel, `tube-start-${wire.id}`) : null;
          })()}

          {renderEnd && (() => {
            const pointsRev = [...waypoints].reverse();
            const endInfo = getPointAndTangentAtDistance(pointsRev, endDist);
            return endInfo && effectiveEndLabel ? renderMarkingTube(endInfo, effectiveEndLabel, `tube-end-${wire.id}`) : null;
          })()}
        </g>
      )}

      {/* Interactive Draggable Junction Solder Dots (Direct Slider Handles) */}
      {junctionPoints.map((jp, idx) => {
        const isHBus = waypoints.some((p, i) => {
          if (i === waypoints.length - 1) return false;
          const next = waypoints[i + 1]!;
          return Math.abs(p.y - next.y) <= 2 && Math.abs(p.y - jp.y) <= 2 && jp.x >= Math.min(p.x, next.x) - 2 && jp.x <= Math.max(p.x, next.x) + 2;
        });
        return (
          <g key={`jp-handle-${idx}`}>
            <circle cx={jp.x} cy={jp.y} r={14} fill="transparent" className={isHBus ? 'cursor-ew-resize' : 'cursor-ns-resize'} onPointerDown={(e) => onStartJunctionDrag?.(wire, idx, jp, !isHBus, e)}>
              <title>Geser Posisi Titik Sambungan (Junction)</title>
            </circle>
          </g>
        );
      })}

      {/* Hover / Selected Endpoint Rings */}
      {(isSelected || isHovered) && (
        <>
          {(isStartPin || isStartTap || isStartJunction) && <circle cx={pStart.x} cy={pStart.y} r={5.5} fill="none" stroke={isSelected ? '#38bdf8' : wire.color} strokeWidth="1.5" opacity={isSelected ? 1 : 0.75} className="pointer-events-none" />}
          {(isEndPin || isEndTap || isEndJunction) && <circle cx={pEnd.x} cy={pEnd.y} r={5.5} fill="none" stroke={isSelected ? '#38bdf8' : wire.color} strokeWidth="1.5" opacity={isSelected ? 1 : 0.75} className="pointer-events-none" />}
        </>
      )}

      {/* Interactive Endpoint Drag Handles (Re-connection & Junction Sliding - Only active when wire is selected) */}
      {onStartEndpointDrag && isSelected && (
        <>
          {(isStartPin || isStartTap || isStartJunction) && (
            <circle cx={pStart.x} cy={pStart.y} r={12} fill="transparent" className="cursor-grab active:cursor-grabbing hover:scale-125" onPointerDown={(e) => { if (e.button !== 0) return; e.stopPropagation(); onStartEndpointDrag(wire, 'start', e); }}>
              <title>Geser / Pindahkan Titik Sambungan (lepas di pin/kabel)</title>
            </circle>
          )}
          {(isEndPin || isEndTap || isEndJunction) && (
            <circle cx={pEnd.x} cy={pEnd.y} r={12} fill="transparent" className="cursor-grab active:cursor-grabbing hover:scale-125" onPointerDown={(e) => { if (e.button !== 0) return; e.stopPropagation(); onStartEndpointDrag(wire, 'end', e); }}>
              <title>Geser / Pindahkan Titik Sambungan (lepas di pin/kabel)</title>
            </circle>
          )}
        </>
      )}

      {/* 5. Non-orthogonal Invisible Hitbox */}
      {wire.routing !== 'orthogonal' && <path d={pathD} fill="none" stroke="transparent" strokeWidth="18" strokeLinecap="round" />}

      {/* 6. Interactive Orthogonal Segment Drag Hitboxes (ERD Studio style) */}
      {wire.routing === 'orthogonal' &&
        waypoints.map((p, idx) => {
          if (idx === waypoints.length - 1) return null;
          const nextP = waypoints[idx + 1]!;
          const isVertical = Math.abs(p.x - nextP.x) < 2;
          const isHorizontal = Math.abs(p.y - nextP.y) < 2;
          if (!isVertical && !isHorizontal) return null;
          const cursorClass = isVertical ? 'cursor-ew-resize' : 'cursor-ns-resize';
          return <line key={`seg-hitbox-${idx}`} x1={p.x} y1={p.y} x2={nextP.x} y2={nextP.y} stroke="transparent" strokeWidth={18} strokeLinecap="round" className={cursorClass} onPointerDown={(e) => onStartSegmentDrag?.(wire, idx, isVertical, e)} />;
        })}

      {/* 7. Interactive Midpoint Split Handles (Only center points, zero corner clutter) */}
      {isActive && wire.routing === 'orthogonal' && (
        <g>
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
                <circle cx={midX} cy={midY} r={10} fill="transparent" className={isVertical ? 'cursor-ew-resize' : 'cursor-ns-resize'} onPointerDown={(e) => onStartMidpointDrag?.(wire, idx, isVertical, e)} />
                <circle cx={midX} cy={midY} r={3.5} fill="#0284c7" stroke="#38bdf8" strokeWidth={1.5} className="pointer-events-none opacity-80 hover:opacity-100" />
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
  if (prev.showWireMarkers !== next.showWireMarkers) return false;
  if (prev.netSignalName !== next.netSignalName) return false;
  if (prev.fromPinName !== next.fromPinName || prev.toPinName !== next.toPinName) return false;
  if (prev.fromCompType !== next.fromCompType || prev.toCompType !== next.toCompType) return false;

  if (prev.startPoint.x !== next.startPoint.x || prev.startPoint.y !== next.startPoint.y) return false;
  if (prev.endPoint.x !== next.endPoint.x || prev.endPoint.y !== next.endPoint.y) return false;
  if (prev.startDir !== next.startDir || prev.endDir !== next.endDir) return false;

  const prevLive = prev.liveWaypoints || [];
  const nextLive = next.liveWaypoints || [];
  if (prevLive.length !== nextLive.length) return false;
  for (let i = 0; i < prevLive.length; i++) {
    if (prevLive[i]!.x !== nextLive[i]!.x || prevLive[i]!.y !== nextLive[i]!.y) return false;
  }

  const prevRes = prev.resolvedWaypoints || [];
  const nextRes = next.resolvedWaypoints || [];
  if (prevRes.length !== nextRes.length) return false;
  for (let i = 0; i < prevRes.length; i++) {
    if (prevRes[i]!.x !== nextRes[i]!.x || prevRes[i]!.y !== nextRes[i]!.y) return false;
  }

  const prevJPs = prev.junctionPoints || [];
  const nextJPs = next.junctionPoints || [];
  if (prevJPs.length !== nextJPs.length) return false;
  for (let i = 0; i < prevJPs.length; i++) {
    if (prevJPs[i]!.x !== nextJPs[i]!.x || prevJPs[i]!.y !== nextJPs[i]!.y) return false;
  }

  const prevConn = prev.connectedWireIds || new Set();
  const nextConn = next.connectedWireIds || new Set();
  if (prevConn.size !== nextConn.size) return false;
  for (const id of prevConn) {
    if (!nextConn.has(id)) return false;
  }

  const pw = prev.wire;
  const nw = next.wire;

  if (pw === nw) return true;
  if (pw.id !== nw.id || pw.color !== nw.color || pw.routing !== nw.routing || pw.label !== nw.label || pw.markerPosition !== nw.markerPosition) return false;
  if (pw.fromComponentId !== nw.fromComponentId || pw.toComponentId !== nw.toComponentId) return false;
  if (pw.fromPinId !== nw.fromPinId || pw.toPinId !== nw.toPinId) return false;
  if (pw.fromWireId !== nw.fromWireId || pw.toWireId !== nw.toWireId) return false;
  if (pw.fromPoint?.x !== nw.fromPoint?.x || pw.fromPoint?.y !== nw.fromPoint?.y) return false;
  if (pw.toPoint?.x !== nw.toPoint?.x || pw.toPoint?.y !== nw.toPoint?.y) return false;

  const pwPts = pw.waypoints || [];
  const nwPts = nw.waypoints || [];
  if (pwPts.length !== nwPts.length) return false;
  for (let i = 0; i < pwPts.length; i++) {
    if (pwPts[i]!.x !== nwPts[i]!.x || pwPts[i]!.y !== nwPts[i]!.y) return false;
  }

  return true;
}

export const WireSvg = React.memo(WireSvgComponent, areWirePropsEqual);

