import { useState, useEffect, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import {
  CircuitComponent,
  Wire,
  ComponentType,
  WirePoint,
  WireRouting,
  CircuitProject,
  ComponentDefinition,
} from './types/circuit';
import { COMPONENT_DEFINITIONS } from './constants/components';
import { getAllComponentDefinitions } from './utils/customComponents';
import { useCircuitHistory, HistoryState } from './hooks/useCircuitHistory';
import { TopBar } from './components/navigation/TopBar';
import { ComponentLibrary } from './components/panels/ComponentLibrary';
import { CircuitCanvas } from './components/canvas/CircuitCanvas';
import { PropertiesInspector } from './components/panels/PropertiesInspector';
import { CodeEditorModal } from './components/modals/CodeEditorModal';
import { BomModal } from './components/modals/BomModal';
import { PresetsModal } from './components/modals/PresetsModal';
import { ComponentStudioModal } from './components/modals/ComponentStudioModal';
import { ContextMenu, ContextMenuState } from './components/menu/ContextMenu';

const STORAGE_KEY = 'wirecraft_saved_project_v1';

interface StoredProjectData {
  projectName: string;
  components: CircuitComponent[];
  wires: Wire[];
  wireRouting: WireRouting;
  currentWireColor: string;
  pan: WirePoint;
  zoom: number;
  timestamp: number;
}

// Initial Default Starter Circuit (Arduino Uno + Half Breadboard + 1 Resistor 220Ω + 1 Red LED + Wires)
const DEFAULT_STARTER_COMPONENTS: CircuitComponent[] = [
  {
    id: 'uno_1',
    type: 'arduino-uno',
    name: 'Arduino Uno R3',
    label: 'Arduino Uno R3',
    x: 80,
    y: 100,
    rotation: 0,
    customProps: {},
  },
  {
    id: 'bb_1',
    type: 'breadboard-half',
    name: 'Half Breadboard',
    label: 'Half Breadboard (400 Tie-Point)',
    x: 480,
    y: 100,
    rotation: 0,
    customProps: {},
  },
  {
    id: 'res_1',
    type: 'resistor',
    name: 'Resistor 220Ω',
    label: 'R1 (220Ω)',
    x: 550,
    y: 200,
    rotation: 0,
    customProps: { resistance: 220 },
  },
  {
    id: 'led_1',
    type: 'led',
    name: 'LED 5mm',
    label: 'LED1',
    x: 650,
    y: 200,
    rotation: 0,
    customProps: { ledColor: 'red', isLedOn: false },
  },
];

const DEFAULT_STARTER_WIRES: Wire[] = [
  {
    id: 'wire_5v_rail',
    fromComponentId: 'uno_1',
    fromPinId: '5v',
    toComponentId: 'bb_1',
    toPinId: 'top-vcc-1',
    color: '#ef4444', // Red 5V
    routing: 'orthogonal',
  },
  {
    id: 'wire_gnd_rail',
    fromComponentId: 'uno_1',
    fromPinId: 'gnd1',
    toComponentId: 'bb_1',
    toPinId: 'top-gnd-1',
    color: '#0f172a', // Black GND
    routing: 'orthogonal',
  },
  {
    id: 'wire_d13_resistor',
    fromComponentId: 'uno_1',
    fromPinId: 'd13',
    toComponentId: 'res_1',
    toPinId: 'pin1',
    color: '#38bdf8', // Blue D13
    routing: 'orthogonal',
  },
];

export function App() {
  // Load initial state from LocalStorage if available
  const initialDataRef = useRef<{
    projectName: string;
    historyState: HistoryState;
    wireRouting: WireRouting;
    currentWireColor: string;
    pan: WirePoint;
    zoom: number;
  }>((() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: StoredProjectData = JSON.parse(saved);
        if (Array.isArray(parsed.components) && Array.isArray(parsed.wires)) {
          return {
            projectName: parsed.projectName || 'Latihan Sirkuit Arduino',
            historyState: {
              components: parsed.components,
              wires: parsed.wires,
            },
            wireRouting: parsed.wireRouting || 'orthogonal',
            currentWireColor: parsed.currentWireColor || '#38bdf8',
            pan: parsed.pan || { x: 80, y: 50 },
            zoom: parsed.zoom || 1,
          };
        }
      }
    } catch (e) {
      console.warn('Could not restore project from localStorage, using defaults:', e);
    }

    return {
      projectName: 'Latihan Sirkuit Arduino',
      historyState: {
        components: DEFAULT_STARTER_COMPONENTS,
        wires: DEFAULT_STARTER_WIRES,
      },
      wireRouting: 'orthogonal',
      currentWireColor: '#38bdf8',
      pan: { x: 80, y: 50 },
      zoom: 1,
    };
  })());

  const [projectName, setProjectName] = useState(initialDataRef.current.projectName);

  // History state management (Undo / Redo)
  const {
    components,
    wires,
    commit,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCircuitHistory(initialDataRef.current.historyState);

  // Selections (Multi-Selection support)
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>([]);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);

  // Tools & Canvas States
  const [currentWireColor, setCurrentWireColor] = useState(initialDataRef.current.currentWireColor);
  const [wireRouting, setWireRouting] = useState<WireRouting>(initialDataRef.current.wireRouting);
  const [snapGrid, setSnapGrid] = useState(true);
  const [zoom, setZoom] = useState(initialDataRef.current.zoom);
  const [pan, setPan] = useState<WirePoint>(initialDataRef.current.pan);

  // Cursor tracker for placing new components close to mouse
  const lastCursorWorldPosRef = useRef<WirePoint>({ x: 400, y: 300 });

  // Auto-save Status: 'saved' | 'saving'
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDataRef = useRef<StoredProjectData>({
    projectName,
    components,
    wires,
    wireRouting,
    currentWireColor,
    pan,
    zoom,
    timestamp: Date.now(),
  });

  // Always keep latest refs updated without triggering re-renders
  useEffect(() => {
    latestDataRef.current = {
      projectName,
      components,
      wires,
      wireRouting,
      currentWireColor,
      pan,
      zoom,
      timestamp: Date.now(),
    };
  });

  // Debounced Auto-Save to localStorage
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        const payload = latestDataRef.current;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed to auto-save circuit project to localStorage:', err);
        setSaveStatus('saved');
      }
    }, 800);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [components, wires, projectName, wireRouting, currentWireColor]);

  // Drawers & Modals
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isBomModalOpen, setIsBomModalOpen] = useState(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [studioEditDef, setStudioEditDef] = useState<ComponentDefinition | null>(null);

  // Context Menu state
  const [contextMenuState, setContextMenuState] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    worldX: 0,
    worldY: 0,
    targetType: 'canvas',
  });

  // 1. Lock / Unlock Components
  const handleToggleLock = useCallback(
    (idsToToggle: string[]) => {
      if (idsToToggle.length === 0) return;
      commit((prev) => {
        const targetComps = prev.components.filter((c) => idsToToggle.includes(c.id));
        const allCurrentlyLocked = targetComps.length > 0 && targetComps.every((c) => c.locked);
        const nextLockState = !allCurrentlyLocked;

        return {
          ...prev,
          components: prev.components.map((c) =>
            idsToToggle.includes(c.id) ? { ...c, locked: nextLockState } : c
          ),
        };
      });
    },
    [commit]
  );

  // 2. Duplicate Components (Single or Multi)
  const handleDuplicateComponents = useCallback(
    (idsToDuplicate?: string[]) => {
      const targetIds = idsToDuplicate && idsToDuplicate.length > 0 ? idsToDuplicate : selectedComponentIds;
      if (targetIds.length === 0) return;

      const sources = components.filter((c) => targetIds.includes(c.id));
      if (sources.length === 0) return;

      const newComps: CircuitComponent[] = [];
      const newIds: string[] = [];

      sources.forEach((source, idx) => {
        const count = components.filter((c) => c.type === source.type).length + 1 + idx;
        const prefixMatch = source.label.match(/^(.*?)(\d+)$/);
        const newLabel = prefixMatch
          ? `${prefixMatch[1]}${count}`
          : `${source.label}_${count}`;

        const newComp: CircuitComponent = {
          id: `${source.type}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          type: source.type,
          name: source.name,
          label: newLabel,
          x: Math.round((source.x + 30) / 10) * 10,
          y: Math.round((source.y + 30) / 10) * 10,
          rotation: source.rotation,
          locked: false, // duplicates start unlocked
          customProps: { ...(source.customProps || {}) },
        };

        newComps.push(newComp);
        newIds.push(newComp.id);
      });

      commit((prev) => ({
        ...prev,
        components: [...prev.components, ...newComps],
      }));

      setSelectedComponentIds(newIds);
      setSelectedWireId(null);
    },
    [components, selectedComponentIds, commit]
  );

  // 3. Rotate Components (Single or Multi)
  const handleRotateComponents = useCallback(
    (idsToRotate?: string[]) => {
      const targetIds = idsToRotate && idsToRotate.length > 0 ? idsToRotate : selectedComponentIds;
      if (targetIds.length === 0) return;

      const rotations: (0 | 90 | 180 | 270)[] = [0, 90, 180, 270];

      commit((prev) => ({
        ...prev,
        components: prev.components.map((c) => {
          if (!targetIds.includes(c.id)) return c;
          const currentIndex = rotations.indexOf(c.rotation);
          const nextRotation = rotations[(currentIndex + 1) % 4]!;
          return { ...c, rotation: nextRotation };
        }),
      }));
    },
    [selectedComponentIds, commit]
  );

  // 4. Delete Components (Single or Multi)
  const handleDeleteComponents = useCallback(
    (idsToDelete?: string[]) => {
      const targetIds = idsToDelete && idsToDelete.length > 0 ? idsToDelete : selectedComponentIds;
      if (targetIds.length === 0) return;

      commit((prev) => ({
        ...prev,
        components: prev.components.filter((c) => !targetIds.includes(c.id)),
        wires: prev.wires.filter(
          (w) => !targetIds.includes(w.fromComponentId) && !targetIds.includes(w.toComponentId)
        ),
      }));

      setSelectedComponentIds([]);
    },
    [selectedComponentIds, commit]
  );

  // 5. Update Component Positions (with Wire Waypoint Preservation)
  const handleUpdateComponentPositions = useCallback(
    (updates: { id: string; x: number; y: number }[], isFinal = false) => {
      commit(
        (prev) => {
          const updateMap = new Map(updates.map((u) => [u.id, { x: u.x, y: u.y }]));
          const deltaMap = new Map<string, { dx: number; dy: number }>();

          const nextComponents = prev.components.map((c) => {
            const target = updateMap.get(c.id);
            if (!target) return c;
            deltaMap.set(c.id, { dx: target.x - c.x, dy: target.y - c.y });
            return { ...c, x: target.x, y: target.y };
          });

          // Wire waypoint translation:
          // If BOTH ends of a wire move together (group move), translate all waypoints by (dx, dy)
          // so the wire route stays completely intact with zero deformation!
          const nextWires = prev.wires.map((w) => {
            if (!w.waypoints || w.waypoints.length === 0) return w;
            const fromDelta = deltaMap.get(w.fromComponentId);
            const toDelta = deltaMap.get(w.toComponentId);

            if (fromDelta && toDelta) {
              const avgDx = (fromDelta.dx + toDelta.dx) / 2;
              const avgDy = (fromDelta.dy + toDelta.dy) / 2;
              return {
                ...w,
                waypoints: w.waypoints.map((p) => ({ x: p.x + avgDx, y: p.y + avgDy })),
              };
            } else if (fromDelta && !toDelta) {
              return {
                ...w,
                waypoints: w.waypoints.map((p, idx) => {
                  const weight = 1 - (idx + 1) / (w.waypoints!.length + 1);
                  return { x: p.x + fromDelta.dx * weight, y: p.y + fromDelta.dy * weight };
                }),
              };
            } else if (!fromDelta && toDelta) {
              return {
                ...w,
                waypoints: w.waypoints.map((p, idx) => {
                  const weight = (idx + 1) / (w.waypoints!.length + 1);
                  return { x: p.x + toDelta.dx * weight, y: p.y + toDelta.dy * weight };
                }),
              };
            }
            return w;
          });

          return {
            components: nextComponents,
            wires: nextWires,
          };
        },
        !isFinal
      );
    },
    [commit]
  );

  // 6. Add Component to Canvas (Placed near cursor or specified world position)
  const handleAddComponent = (type: ComponentType, spawnPos?: { x: number; y: number }) => {
    const allDefs = getAllComponentDefinitions();
    const def = allDefs[type] || COMPONENT_DEFINITIONS[type];
    if (!def) return;

    const count = components.filter((c) => c.type === type).length + 1;

    let targetX: number;
    let targetY: number;

    if (spawnPos) {
      targetX = Math.round((spawnPos.x - def.width / 2) / 10) * 10;
      targetY = Math.round((spawnPos.y - def.height / 2) / 10) * 10;
    } else {
      const cursor = lastCursorWorldPosRef.current;
      targetX = Math.round((cursor.x - def.width / 2 + (count % 4) * 20) / 10) * 10;
      targetY = Math.round((cursor.y - def.height / 2 + (count % 4) * 20) / 10) * 10;
    }

    const newComp: CircuitComponent = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type,
      name: def.name,
      label: `${def.name.split(' ')[0] || 'C'}_${count}`,
      x: targetX,
      y: targetY,
      rotation: 0,
      locked: false,
      customProps: { ...(def.defaultProps || {}) },
    };

    commit((prev) => ({
      ...prev,
      components: [...prev.components, newComp],
    }));

    setSelectedComponentIds([newComp.id]);
    setSelectedWireId(null);
  };

  // 7. Select All Components (Ctrl+A)
  const handleSelectAll = useCallback(() => {
    setSelectedComponentIds(components.map((c) => c.id));
    setSelectedWireId(null);
  }, [components]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea', 'select'].includes((e.target as HTMLElement)?.tagName.toLowerCase())) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Undo / Redo
      if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // Select All (Ctrl+A / Cmd+A)
      if (isCmdOrCtrl && e.key.toLowerCase() === 'a') {
        if (!isStudioOpen && !isCodeModalOpen && !isBomModalOpen && !isPresetsModalOpen) {
          e.preventDefault();
          handleSelectAll();
        }
        return;
      }

      // Direct Duplicate Component (Ctrl+D / Cmd+D)
      if (isCmdOrCtrl && e.key.toLowerCase() === 'd') {
        if (
          selectedComponentIds.length > 0 &&
          !isStudioOpen &&
          !isCodeModalOpen &&
          !isBomModalOpen &&
          !isPresetsModalOpen
        ) {
          e.preventDefault();
          handleDuplicateComponents();
        }
        return;
      }

      // Lock / Unlock Component (L)
      if (
        !isCmdOrCtrl &&
        !e.altKey &&
        (e.key === 'l' || e.key === 'L') &&
        selectedComponentIds.length > 0 &&
        !isStudioOpen &&
        !isCodeModalOpen &&
        !isBomModalOpen &&
        !isPresetsModalOpen
      ) {
        e.preventDefault();
        handleToggleLock(selectedComponentIds);
        return;
      }

      // Rotate selected component(s) on canvas (R / Space)
      if (
        !isCmdOrCtrl &&
        !e.altKey &&
        (e.key === 'r' || e.key === 'R' || e.key === ' ' || e.code === 'Space')
      ) {
        if (
          selectedComponentIds.length > 0 &&
          !isStudioOpen &&
          !isCodeModalOpen &&
          !isBomModalOpen &&
          !isPresetsModalOpen
        ) {
          e.preventDefault();
          handleRotateComponents();
        }
        return;
      }

      // Delete (Delete / Backspace)
      if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        !isStudioOpen &&
        !isCodeModalOpen &&
        !isBomModalOpen &&
        !isPresetsModalOpen
      ) {
        if (selectedComponentIds.length > 0) {
          e.preventDefault();
          handleDeleteComponents();
        } else if (selectedWireId) {
          e.preventDefault();
          commit((prev) => ({
            ...prev,
            wires: prev.wires.filter((w) => w.id !== selectedWireId),
          }));
          setSelectedWireId(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    undo,
    redo,
    commit,
    selectedComponentIds,
    selectedWireId,
    isStudioOpen,
    isCodeModalOpen,
    isBomModalOpen,
    isPresetsModalOpen,
    handleDuplicateComponents,
    handleToggleLock,
    handleRotateComponents,
    handleDeleteComponents,
    handleSelectAll,
  ]);

  // Update Component Custom Props
  const handleUpdateComponent = (id: string, updates: Partial<CircuitComponent>) => {
    commit((prev) => ({
      ...prev,
      components: prev.components.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  };

  // Add Wire
  const handleAddWire = (wireData: Omit<Wire, 'id'>) => {
    const newWire: Wire = {
      ...wireData,
      id: `wire_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    };
    commit((prev) => ({
      ...prev,
      wires: [...prev.wires, newWire],
    }));
    setSelectedWireId(newWire.id);
    setSelectedComponentIds([]);
  };

  // Update Wire
  const handleUpdateWire = (id: string, updates: Partial<Wire>) => {
    commit((prev) => ({
      ...prev,
      wires: prev.wires.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    }));
  };

  // Delete Wire
  const handleDeleteWire = (id: string) => {
    commit((prev) => ({
      ...prev,
      wires: prev.wires.filter((w) => w.id !== id),
    }));
    if (selectedWireId === id) setSelectedWireId(null);
  };

  // Update Wire Waypoints
  const handleUpdateWireWaypoints = (id: string, waypoints: WirePoint[]) => {
    commit((prev) => ({
      ...prev,
      wires: prev.wires.map((w) => (w.id === id ? { ...w, waypoints } : w)),
    }));
  };

  // Reset Wire Waypoints
  const handleResetWireWaypoints = (id: string) => {
    commit((prev) => ({
      ...prev,
      wires: prev.wires.map((w) => (w.id === id ? { ...w, waypoints: undefined } : w)),
    }));
  };

  // Delete Current Selection
  const handleDeleteSelected = useCallback(() => {
    if (selectedComponentIds.length > 0) {
      handleDeleteComponents();
    } else if (selectedWireId) {
      handleDeleteWire(selectedWireId);
    }
  }, [selectedComponentIds, selectedWireId, handleDeleteComponents, handleDeleteWire]);

  // Load Preset Circuit
  const handleLoadPreset = (presetComponents: CircuitComponent[], presetWires: Wire[]) => {
    commit({
      components: presetComponents,
      wires: presetWires,
    });
    setSelectedComponentIds([]);
    setSelectedWireId(null);
    setZoom(1);
    setPan({ x: 100, y: 80 });
  };

  // Export as PNG Diagram
  const handleExportPng = async () => {
    try {
      const node = document.querySelector('svg') as unknown as HTMLElement;
      if (!node) return;

      const dataUrl = await toPng(node, {
        backgroundColor: '#020617',
        pixelRatio: 2,
      });

      const link = document.createElement('a');
      link.download = `${projectName.toLowerCase().replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export PNG:', err);
      alert('Gagal mengekspor diagram PNG.');
    }
  };

  // Export JSON Project File
  const handleExportJson = () => {
    const projectData: CircuitProject = {
      version: '1.0.0',
      id: `proj_${Date.now()}`,
      name: projectName,
      components,
      wires,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName.toLowerCase().replace(/\s+/g, '_')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON Project File
  const handleImportJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.components && parsed.wires) {
          setProjectName(parsed.name || 'Proyek Diimpor');
          commit({
            components: parsed.components,
            wires: parsed.wires,
          });
          setSelectedComponentIds([]);
          setSelectedWireId(null);
        } else {
          alert('Format file proyek JSON tidak valid.');
        }
      } catch (err) {
        alert('Gagal membaca file proyek JSON.');
      }
    };
    reader.readAsText(file);
  };

  // Clear Canvas
  const handleClearCanvas = () => {
    if (window.confirm('Bersihkan seluruh kanvas sirkuit? Semua kabel dan komponen akan dihapus.')) {
      commit({
        components: [],
        wires: [],
      });
      setSelectedComponentIds([]);
      setSelectedWireId(null);
    }
  };

  // Derived selected component (single or first of multi)
  const selectedComponent = components.find((c) => selectedComponentIds.includes(c.id)) || null;
  const selectedWire = wires.find((w) => w.id === selectedWireId) || null;

  return (
    <div className="flex flex-col w-screen h-screen bg-[#020617] text-slate-100 overflow-hidden select-none">
      {/* Top Header Navigation with Undo / Redo */}
      <TopBar
        saveStatus={saveStatus}
        projectName={projectName}
        onProjectNameChange={setProjectName}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        currentWireColor={currentWireColor}
        onSelectWireColor={setCurrentWireColor}
        wireRouting={wireRouting}
        onSelectWireRouting={setWireRouting}
        zoom={zoom}
        onZoomIn={() => setZoom((z) => Math.min(z * 1.15, 3))}
        onZoomOut={() => setZoom((z) => Math.max(z * 0.85, 0.25))}
        onResetZoom={() => {
          setZoom(1);
          setPan({ x: 120, y: 80 });
        }}
        snapGrid={snapGrid}
        onToggleSnapGrid={() => setSnapGrid((prev) => !prev)}
        onOpenPresets={() => setIsPresetsModalOpen(true)}
        onOpenCodeEditor={() => setIsCodeModalOpen(true)}
        onOpenBom={() => setIsBomModalOpen(true)}
        onOpenStudio={() => {
          setStudioEditDef(null);
          setIsStudioOpen(true);
        }}
        onExportPng={handleExportPng}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onClearCanvas={handleClearCanvas}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 relative w-full h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Left Component Catalog Drawer */}
        <ComponentLibrary
          isOpen={isLibraryOpen}
          onToggle={() => setIsLibraryOpen((prev) => !prev)}
          onAddComponent={handleAddComponent}
          onOpenStudio={(def?: ComponentDefinition) => {
            setStudioEditDef(def || null);
            setIsStudioOpen(true);
          }}
        />

        {/* Interactive Infinite Circuit Canvas */}
        <CircuitCanvas
          components={components}
          wires={wires}
          selectedComponentIds={selectedComponentIds}
          selectedWireId={selectedWireId}
          currentWireColor={currentWireColor}
          onSelectWireColor={setCurrentWireColor}
          wireRouting={wireRouting}
          snapGrid={snapGrid}
          onSelectComponents={setSelectedComponentIds}
          onSelectWire={setSelectedWireId}
          onUpdateComponentPositions={handleUpdateComponentPositions}
          onAddWire={handleAddWire}
          onDeleteSelected={handleDeleteSelected}
          onUpdateWireWaypoints={handleUpdateWireWaypoints}
          onResetWireWaypoints={handleResetWireWaypoints}
          zoom={zoom}
          pan={pan}
          onZoomChange={setZoom}
          onPanChange={setPan}
          onContextMenu={setContextMenuState}
          onCursorMove={(pos) => {
            lastCursorWorldPosRef.current = pos;
          }}
        />

        {/* Right Properties Inspector Drawer */}
        <PropertiesInspector
          selectedComponent={selectedComponent}
          selectedComponentIds={selectedComponentIds}
          selectedWire={selectedWire}
          allComponents={components}
          allWires={wires}
          snapGrid={snapGrid}
          onToggleSnapGrid={() => setSnapGrid((prev) => !prev)}
          onUpdateComponent={handleUpdateComponent}
          onUpdateWire={handleUpdateWire}
          onDeleteComponent={(id) => handleDeleteComponents([id])}
          onDuplicateComponent={(id) => handleDuplicateComponents([id])}
          onToggleLock={handleToggleLock}
          onRotateComponents={handleRotateComponents}
          onDuplicateComponents={handleDuplicateComponents}
          onDeleteComponents={handleDeleteComponents}
          onDeleteWire={handleDeleteWire}
          isOpen={isInspectorOpen}
          onToggleOpen={() => setIsInspectorOpen((prev) => !prev)}
        />

        {/* Right-Click Context Menu */}
        <ContextMenu
          menuState={contextMenuState}
          onClose={() => setContextMenuState((prev) => ({ ...prev, isOpen: false }))}
          onToggleLock={handleToggleLock}
          onDuplicate={handleDuplicateComponents}
          onRotate={handleRotateComponents}
          onDeleteComponents={handleDeleteComponents}
          onEditInStudio={(def) => {
            setStudioEditDef(def || null);
            setIsStudioOpen(true);
          }}
          onUpdateWireColor={(wireId, color) => handleUpdateWire(wireId, { color })}
          onUpdateWireRouting={(wireId, routing) => handleUpdateWire(wireId, { routing })}
          onDeleteWire={handleDeleteWire}
          onQuickAddComponent={handleAddComponent}
          onToggleSnapGrid={() => setSnapGrid((prev) => !prev)}
          snapGrid={snapGrid}
          onResetView={() => {
            setZoom(1);
            setPan({ x: 120, y: 80 });
          }}
          onSelectAll={handleSelectAll}
          onClearCanvas={handleClearCanvas}
        />
      </div>

      {/* Code Editor Modal */}
      <CodeEditorModal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        components={components}
        wires={wires}
      />

      {/* BOM (Bill of Materials) Modal */}
      <BomModal
        isOpen={isBomModalOpen}
        onClose={() => setIsBomModalOpen(false)}
        components={components}
        wires={wires}
      />

      {/* Presets Modal */}
      <PresetsModal
        isOpen={isPresetsModalOpen}
        onClose={() => setIsPresetsModalOpen(false)}
        onLoadPreset={handleLoadPreset}
      />

      {/* Component Studio (Admin Mode) Modal */}
      <ComponentStudioModal
        isOpen={isStudioOpen}
        onClose={() => {
          setIsStudioOpen(false);
          setStudioEditDef(null);
        }}
        initialDefinition={studioEditDef}
        onComponentSaved={(typeId) => {
          handleAddComponent(typeId);
        }}
      />
    </div>
  );
}

export default App;
