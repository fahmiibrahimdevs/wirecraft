import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CircuitComponent, Wire, ComponentType, WireRouting, WirePoint, CircuitProject, ComponentDefinition } from './types/circuit';
import { COMPONENT_DEFINITIONS } from './constants/components';
import { getAllComponentDefinitions } from './utils/customComponents';
import { CircuitCanvas } from './components/canvas/CircuitCanvas';
import { ComponentLibrary } from './components/panels/ComponentLibrary';
import { PropertiesInspector } from './components/panels/PropertiesInspector';
import { TopBar } from './components/navigation/TopBar';
import { CodeEditorModal } from './components/modals/CodeEditorModal';
import { BomModal } from './components/modals/BomModal';
import { PresetsModal } from './components/modals/PresetsModal';
import { ComponentStudioModal } from './components/modals/ComponentStudioModal';
import { useCircuitHistory, HistoryState } from './hooks/useCircuitHistory';
import { toPng } from 'html-to-image';

const INITIAL_STATE: HistoryState = {
  components: [
    {
      id: 'uno-demo',
      type: 'arduino-uno',
      name: 'Arduino Uno R3',
      label: 'ARDUINO_1',
      x: 80,
      y: 120,
      rotation: 0,
      customProps: {},
    },
    {
      id: 'bb-demo',
      type: 'breadboard-half',
      name: 'Half Breadboard',
      label: 'BREADBOARD_1',
      x: 460,
      y: 80,
      rotation: 0,
      customProps: {},
    },
    {
      id: 'r-demo',
      type: 'resistor',
      name: 'Resistor 220Ω',
      label: 'R1',
      x: 516.0,
      y: 207.75,
      rotation: 0,
      customProps: { resistance: 220 },
    },
    {
      id: 'led-demo',
      type: 'led',
      name: 'LED 5mm',
      label: 'LED1',
      x: 580.3,
      y: 157.4,
      rotation: 0,
      customProps: { ledColor: 'red', isLedOn: true },
    },
  ],
  wires: [
    {
      id: 'w-led-gnd',
      fromComponentId: 'led-demo',
      fromPinId: 'cathode',
      toComponentId: 'uno-demo',
      toPinId: 'gnd_top',
      color: '#1e293b',
      routing: 'orthogonal',
      waypoints: [
        { x: 604.8, y: 216.0 },
        { x: 604.8, y: 50 },
        { x: 228.6, y: 50 },
        { x: 228.6, y: 131.5 },
      ],
    },
    {
      id: 'w-uno-r',
      fromComponentId: 'uno-demo',
      fromPinId: 'd13',
      toComponentId: 'r-demo',
      toPinId: 'pin1',
      color: '#eab308',
      routing: 'orthogonal',
    },
    {
      id: 'w-r-led',
      fromComponentId: 'r-demo',
      fromPinId: 'pin2',
      toComponentId: 'led-demo',
      toPinId: 'anode',
      color: '#ef4444',
      routing: 'orthogonal',
    },
    {
      id: 'w-cross-demo',
      fromComponentId: 'uno-demo',
      fromPinId: 'd9',
      toComponentId: 'bb-demo',
      toPinId: 'top-vcc-5',
      color: '#38bdf8',
      routing: 'orthogonal',
      waypoints: [
        { x: 286.2, y: 131.5 },
        { x: 286.2, y: 65 },
        { x: 587.8, y: 65 },
        { x: 587.8, y: 114.0 },
      ],
    },
  ],
};

const STORAGE_KEY = 'circuit_electronics_project_v2';

interface StoredProjectData {
  projectName: string;
  components: CircuitComponent[];
  wires: Wire[];
  wireRouting?: WireRouting;
  currentWireColor?: string;
  pan?: WirePoint;
  zoom?: number;
  timestamp?: number;
}

function getInitialProjectData(): {
  projectName: string;
  historyState: HistoryState;
  wireRouting: WireRouting;
  currentWireColor: string;
  pan: WirePoint;
  zoom: number;
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data: StoredProjectData = JSON.parse(raw);
      if (Array.isArray(data.components) && Array.isArray(data.wires)) {
        return {
          projectName: data.projectName || 'Arduino LED Blink Project',
          historyState: {
            components: data.components,
            wires: data.wires,
          },
          wireRouting: data.wireRouting || 'orthogonal',
          currentWireColor: data.currentWireColor || '#38bdf8',
          pan: data.pan || { x: 120, y: 80 },
          zoom: typeof data.zoom === 'number' ? data.zoom : 1,
        };
      }
    }
  } catch (e) {
    console.error('Failed to parse saved project from localStorage:', e);
  }

  return {
    projectName: 'Arduino LED Blink Project',
    historyState: INITIAL_STATE,
    wireRouting: 'orthogonal',
    currentWireColor: '#38bdf8',
    pan: { x: 120, y: 80 },
    zoom: 1,
  };
}

export default function App() {
  const initialDataRef = useRef(getInitialProjectData());

  // Project Info
  const [projectName, setProjectName] = useState(initialDataRef.current.projectName);

  // History state management (Undo / Redo)
  const {
    components,
    wires,
    commit,
    undo,
    redo,
    resetHistory,
    canUndo,
    canRedo,
  } = useCircuitHistory(initialDataRef.current.historyState);

  // Selections
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);

  // Tools & Canvas States (Default: Siku 90° / Orthogonal seperti ERD Studio)
  const [currentWireColor, setCurrentWireColor] = useState(initialDataRef.current.currentWireColor);
  const [wireRouting, setWireRouting] = useState<WireRouting>(initialDataRef.current.wireRouting);
  const [snapGrid, setSnapGrid] = useState(true);
  const [zoom, setZoom] = useState(initialDataRef.current.zoom);
  const [pan, setPan] = useState<WirePoint>(initialDataRef.current.pan);

  // Auto-save Status: 'saved' | 'saving'
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced Auto-Save to localStorage (Like ERD Studio)
  useEffect(() => {
    setSaveStatus('saving');
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        const payload: StoredProjectData = {
          projectName,
          components,
          wires,
          wireRouting,
          currentWireColor,
          pan,
          zoom,
          timestamp: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed to auto-save circuit project to localStorage:', err);
        setSaveStatus('saved');
      }
    }, 600);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [components, wires, projectName, wireRouting, currentWireColor, pan, zoom]);

  // Drawers & Modals
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isBomModalOpen, setIsBomModalOpen] = useState(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [studioEditDef, setStudioEditDef] = useState<ComponentDefinition | null>(null);
  // Clipboard state for Component Copy & Paste (Ctrl+C / Ctrl+V / Ctrl+D)
  const clipboardComponentRef = useRef<CircuitComponent | null>(null);

  // Duplicate Component
  const handleDuplicateComponent = useCallback(
    (idToDuplicate?: string) => {
      const targetId = idToDuplicate || selectedComponentId;
      if (!targetId) return;
      const source = components.find((c) => c.id === targetId);
      if (!source) return;

      const count = components.filter((c) => c.type === source.type).length + 1;
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
        customProps: { ...(source.customProps || {}) },
      };

      commit((prev) => ({
        ...prev,
        components: [...prev.components, newComp],
      }));
      setSelectedComponentId(newComp.id);
      setSelectedWireId(null);
      clipboardComponentRef.current = newComp;
    },
    [components, selectedComponentId, commit]
  );

  // Global Keyboard Shortcuts (Ctrl+Z Undo, Ctrl+Y Redo, Ctrl+C Copy, Ctrl+V Paste, Ctrl+D Duplicate, R/Space Rotate)
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

      // Copy Component (Ctrl+C / Cmd+C)
      if (isCmdOrCtrl && e.key.toLowerCase() === 'c') {
        if (
          selectedComponentId &&
          !isStudioOpen &&
          !isCodeModalOpen &&
          !isBomModalOpen &&
          !isPresetsModalOpen
        ) {
          const comp = components.find((c) => c.id === selectedComponentId);
          if (comp) {
            e.preventDefault();
            clipboardComponentRef.current = comp;
          }
        }
        return;
      }

      // Paste Component (Ctrl+V / Cmd+V)
      if (isCmdOrCtrl && e.key.toLowerCase() === 'v') {
        if (
          clipboardComponentRef.current &&
          !isStudioOpen &&
          !isCodeModalOpen &&
          !isBomModalOpen &&
          !isPresetsModalOpen
        ) {
          e.preventDefault();
          const source = clipboardComponentRef.current;
          const count = components.filter((c) => c.type === source.type).length + 1;
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
            customProps: { ...(source.customProps || {}) },
          };

          commit((prev) => ({
            ...prev,
            components: [...prev.components, newComp],
          }));
          setSelectedComponentId(newComp.id);
          setSelectedWireId(null);
          clipboardComponentRef.current = newComp;
        }
        return;
      }

      // Direct Duplicate Component (Ctrl+D / Cmd+D)
      if (isCmdOrCtrl && e.key.toLowerCase() === 'd') {
        if (
          selectedComponentId &&
          !isStudioOpen &&
          !isCodeModalOpen &&
          !isBomModalOpen &&
          !isPresetsModalOpen
        ) {
          e.preventDefault();
          handleDuplicateComponent(selectedComponentId);
        }
        return;
      }

      // Rotate selected component on Home canvas (R / Space)
      if (
        !isCmdOrCtrl &&
        !e.altKey &&
        (e.key === 'r' || e.key === 'R' || e.key === ' ' || e.code === 'Space')
      ) {
        if (
          selectedComponentId &&
          !isStudioOpen &&
          !isCodeModalOpen &&
          !isBomModalOpen &&
          !isPresetsModalOpen
        ) {
          e.preventDefault();
          const rotations: (0 | 90 | 180 | 270)[] = [0, 90, 180, 270];
          const comp = components.find((c) => c.id === selectedComponentId);
          if (comp) {
            const currentIndex = rotations.indexOf(comp.rotation);
            const nextRotation = rotations[(currentIndex + 1) % 4]!;
            commit((prev) => ({
              ...prev,
              components: prev.components.map((c) =>
                c.id === selectedComponentId ? { ...c, rotation: nextRotation } : c
              ),
            }));
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    undo,
    redo,
    commit,
    selectedComponentId,
    components,
    isStudioOpen,
    isCodeModalOpen,
    isBomModalOpen,
    isPresetsModalOpen,
    handleDuplicateComponent,
  ]);

  // Add Component to Canvas
  const handleAddComponent = (type: ComponentType) => {
    const allDefs = getAllComponentDefinitions();
    const def = allDefs[type] || COMPONENT_DEFINITIONS[type];
    if (!def) return;

    const count = components.filter((c) => c.type === type).length + 1;
    const spawnX = Math.round((Math.max(100, -pan.x + 300) + (count % 4) * 30) / 10) * 10;
    const spawnY = Math.round((Math.max(100, -pan.y + 200) + (count % 4) * 30) / 10) * 10;

    const newComp: CircuitComponent = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type,
      name: def.name,
      label: `${def.name.split(' ')[0] || 'C'}_${count}`,
      x: spawnX,
      y: spawnY,
      rotation: 0,
      customProps: { ...(def.defaultProps || {}) },
    };

    commit((prev) => ({
      ...prev,
      components: [...prev.components, newComp],
    }));
    setSelectedComponentId(newComp.id);
    setSelectedWireId(null);
  };

  // Update Component Position (with smooth wire waypoint translation & undo support)
  const handleUpdateComponentPosition = useCallback(
    (id: string, x: number, y: number, isFinal = false) => {
      commit(
        (prev) => {
          const comp = prev.components.find((c) => c.id === id);
          if (!comp) return prev;
          const dx = x - comp.x;
          const dy = y - comp.y;

          const nextComponents = prev.components.map((c) =>
            c.id === id ? { ...c, x, y } : c
          );

          // If wire has custom waypoints, translate them when connected component moves
          const nextWires = prev.wires.map((w) => {
            if (!w.waypoints || w.waypoints.length === 0) return w;
            if (w.fromComponentId === id && w.toComponentId === id) {
              return {
                ...w,
                waypoints: w.waypoints.map((p) => ({ x: p.x + dx, y: p.y + dy })),
              };
            }
            return w;
          });

          return {
            components: nextComponents,
            wires: nextWires,
          };
        },
        !isFinal // only record to history once dragging finishes (on mouse up)
      );
    },
    [commit]
  );

  // Update Component Props
  const handleUpdateComponent = (id: string, updates: Partial<CircuitComponent>) => {
    commit((prev) => ({
      ...prev,
      components: prev.components.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    }));
  };

  // Delete Component (and its connected wires)
  const handleDeleteComponent = (id: string) => {
    commit((prev) => ({
      components: prev.components.filter((c) => c.id !== id),
      wires: prev.wires.filter((w) => w.fromComponentId !== id && w.toComponentId !== id),
    }));
    if (selectedComponentId === id) setSelectedComponentId(null);
  };

  // Add Wire
  const handleAddWire = (wireData: Omit<Wire, 'id'>) => {
    const newWire: Wire = {
      ...wireData,
      id: `wire_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    };
    commit((prev) => ({
      ...prev,
      wires: [...prev.wires, newWire],
    }));
    setSelectedWireId(newWire.id);
  };

  // Update Wire
  const handleUpdateWire = (id: string, updates: Partial<Wire>) => {
    commit((prev) => ({
      ...prev,
      wires: prev.wires.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    }));
  };

  // Update Wire Waypoints (from dragging segments or corners)
  const handleUpdateWireWaypoints = (id: string, waypoints: WirePoint[]) => {
    commit((prev) => ({
      ...prev,
      wires: prev.wires.map((w) => (w.id === id ? { ...w, waypoints } : w)),
    }));
  };

  // Reset Wire Waypoints to Auto (double click on wire)
  const handleResetWireWaypoints = (id: string) => {
    commit((prev) => ({
      ...prev,
      wires: prev.wires.map((w) => (w.id === id ? { ...w, waypoints: undefined } : w)),
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

  // Delete Current Selection
  const handleDeleteSelected = useCallback(() => {
    if (selectedComponentId) {
      handleDeleteComponent(selectedComponentId);
    } else if (selectedWireId) {
      handleDeleteWire(selectedWireId);
    }
  }, [selectedComponentId, selectedWireId, handleDeleteComponent, handleDeleteWire]);

  // Load Preset Circuit
  const handleLoadPreset = (presetComponents: CircuitComponent[], presetWires: Wire[]) => {
    commit({
      components: presetComponents,
      wires: presetWires,
    });
    setSelectedComponentId(null);
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
          setSelectedComponentId(null);
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
      setSelectedComponentId(null);
      setSelectedWireId(null);
    }
  };

  const selectedComponent = components.find((c) => c.id === selectedComponentId) || null;
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
          onOpenStudio={(def) => {
            setStudioEditDef(def || null);
            setIsStudioOpen(true);
          }}
        />

        {/* Interactive Infinite Circuit Canvas */}
        <CircuitCanvas
          components={components}
          wires={wires}
          selectedComponentId={selectedComponentId}
          selectedWireId={selectedWireId}
          currentWireColor={currentWireColor}
          onSelectWireColor={setCurrentWireColor}
          wireRouting={wireRouting}
          snapGrid={snapGrid}
          onSelectComponent={setSelectedComponentId}
          onSelectWire={setSelectedWireId}
          onUpdateComponentPosition={handleUpdateComponentPosition}
          onAddWire={handleAddWire}
          onDeleteSelected={handleDeleteSelected}
          onUpdateWireWaypoints={handleUpdateWireWaypoints}
          onResetWireWaypoints={handleResetWireWaypoints}
          zoom={zoom}
          pan={pan}
          onZoomChange={setZoom}
          onPanChange={setPan}
        />

        {/* Right Properties Inspector Drawer */}
        <PropertiesInspector
          selectedComponent={selectedComponent}
          selectedWire={selectedWire}
          allComponents={components}
          allWires={wires}
          snapGrid={snapGrid}
          onToggleSnapGrid={() => setSnapGrid((prev) => !prev)}
          onUpdateComponent={handleUpdateComponent}
          onUpdateWire={handleUpdateWire}
          onDeleteComponent={handleDeleteComponent}
          onDuplicateComponent={handleDuplicateComponent}
          onDeleteWire={handleDeleteWire}
          isOpen={isInspectorOpen}
          onToggleOpen={() => setIsInspectorOpen((prev) => !prev)}
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
