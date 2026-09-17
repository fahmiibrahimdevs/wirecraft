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
import { BomModal } from './components/modals/BomModal';
import { PresetsModal } from './components/modals/PresetsModal';
import { ComponentStudioModal } from './components/modals/ComponentStudioModal';
import { UserManagementModal } from './components/modals/UserManagementModal';
import { ExportModal } from './components/modals/ExportModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthModal } from './components/modals/AuthModal';
import { ContextMenu, ContextMenuState } from './components/menu/ContextMenu';
import { Zap } from 'lucide-react';
import { showToast, showConfirm, showError } from './utils/alert';

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

import { useCircuitFiles } from './hooks/useCircuitFiles';

function CircuitAppContent() {
  const { user, isAdmin, token, logout, isLoading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const {
    fileSystem,
    activeFile,
    cloudSyncStatus,
    syncToCloudNow,
    createFile,
    createFolder,
    renameFile,
    renameFolder,
    deleteFile,
    deleteFolder,
    moveItem,
    toggleFolder,
    collapseAllFolders,
    expandAllFolders,
    selectFile,
    updateActiveFileContent,
    duplicateFile,
    importFile,
    exportFile,
  } = useCircuitFiles(token);

  const [projectName, setProjectName] = useState(
    activeFile ? activeFile.name.replace(/\.wire$/, '') : 'Latihan Sirkuit Arduino'
  );

  // History state management (Undo / Redo)
  const {
    components,
    wires,
    commit,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCircuitHistory({
    components: activeFile?.components || [],
    wires: activeFile?.wires || [],
  });

  // Selections (Multi-Selection support)
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>([]);
  const [selectedWireId, setSelectedWireId] = useState<string | null>(null);

  // Tools & Canvas States
  const [currentWireColor, setCurrentWireColor] = useState(activeFile?.currentWireColor || '#38bdf8');
  const [wireRouting, setWireRouting] = useState<WireRouting>(activeFile?.wireRouting || 'orthogonal');
  const [snapGrid, setSnapGrid] = useState(true);
  const [zoom, setZoom] = useState(activeFile?.zoom || 1);
  const [pan, setPan] = useState<WirePoint>(activeFile?.pan || { x: 80, y: 50 });

  // Cursor tracker for placing new components close to mouse
  const lastCursorWorldPosRef = useRef<WirePoint>({ x: 400, y: 300 });

  // Auto-save Status: 'saved' | 'saving'
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Active File tracking ref
  const activeFileIdRef = useRef<string>(activeFile?.id || '');

  // Handle switching active file
  const handleSelectFile = useCallback(
    (fileId: string) => {
      if (fileId === activeFileIdRef.current) return;
      // Save current file state first
      updateActiveFileContent({
        components,
        wires,
        wireRouting,
        currentWireColor,
        pan,
        zoom,
        name: projectName,
      });

      selectFile(fileId);
    },
    [
      updateActiveFileContent,
      components,
      wires,
      wireRouting,
      currentWireColor,
      pan,
      zoom,
      projectName,
      selectFile,
    ]
  );

  // Sync canvas state when activeFile changes from file system
  useEffect(() => {
    if (!activeFile) return;
    if (activeFile.id !== activeFileIdRef.current) {
      activeFileIdRef.current = activeFile.id;
      setProjectName(activeFile.name.replace(/\.wire$/, ''));
      commit({
        components: activeFile.components || [],
        wires: activeFile.wires || [],
      });
      if (activeFile.wireRouting) setWireRouting(activeFile.wireRouting);
      if (activeFile.currentWireColor) setCurrentWireColor(activeFile.currentWireColor);
      if (activeFile.pan) setPan(activeFile.pan);
      if (activeFile.zoom) setZoom(activeFile.zoom);
      setSelectedComponentIds([]);
      setSelectedWireId(null);
    }
  }, [activeFile, commit]);

  // Handle creating a new file
  const handleCreateFile = useCallback(
    (name?: string, parentId?: string | null) => {
      updateActiveFileContent({
        components,
        wires,
        wireRouting,
        currentWireColor,
        pan,
        zoom,
        name: projectName,
      });
      const newId = createFile(name, parentId, [], []);
      selectFile(newId);
    },
    [
      updateActiveFileContent,
      components,
      wires,
      wireRouting,
      currentWireColor,
      pan,
      zoom,
      projectName,
      createFile,
      selectFile,
    ]
  );

  // Debounced Auto-Save to active file
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    setSaveStatus('saving');
    saveTimeoutRef.current = setTimeout(() => {
      try {
        updateActiveFileContent({
          components,
          wires,
          wireRouting,
          currentWireColor,
          pan,
          zoom,
          name: projectName,
        });
        setSaveStatus('saved');
      } catch (err) {
        console.error('Failed to auto-save circuit file:', err);
        setSaveStatus('saved');
      }
    }, 600);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [
    components,
    wires,
    projectName,
    wireRouting,
    currentWireColor,
    pan,
    zoom,
    updateActiveFileContent,
  ]);

  // Handle Project Name change from TopBar
  const handleProjectNameChange = useCallback(
    (newName: string) => {
      setProjectName(newName);
      if (activeFile) {
        renameFile(activeFile.id, newName);
      }
    },
    [activeFile, renameFile]
  );

  // Drawers & Modals
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [isBomModalOpen, setIsBomModalOpen] = useState(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
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

  // Center View / Fit All Components to Screen
  const handleCenterCanvas = useCallback(() => {
    if (components.length === 0) {
      setZoom(1);
      setPan({ x: 120, y: 80 });
      return;
    }

    const allDefs = getAllComponentDefinitions();
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    components.forEach((c) => {
      const def = allDefs[c.type] || COMPONENT_DEFINITIONS[c.type];
      const w = def?.width || 60;
      const h = def?.height || 60;
      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x + w);
      maxY = Math.max(maxY, c.y + h);
    });

    const padding = 80;
    const bboxWidth = maxX - minX + padding * 2;
    const bboxHeight = maxY - minY + padding * 2;

    const availWidth = window.innerWidth - (isInspectorOpen ? 320 : 0) - 70;
    const availHeight = window.innerHeight - 60;

    const scaleX = availWidth / Math.max(bboxWidth, 100);
    const scaleY = availHeight / Math.max(bboxHeight, 100);
    const newZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.35), 1.5);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const newPan = {
      x: (availWidth / 2 + 70) - centerX * newZoom,
      y: (availHeight / 2 + 50) - centerY * newZoom,
    };

    setZoom(Number(newZoom.toFixed(2)));
    setPan(newPan);
  }, [components, isInspectorOpen]);

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
        if (!isStudioOpen && !isBomModalOpen && !isPresetsModalOpen) {
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
      showToast('success', 'Diagram rangkaian (PNG) berhasil diunduh!');
    } catch (err) {
      console.error('Failed to export PNG:', err);
      showError('Gagal Ekspor Gambar', 'Terjadi kesalahan saat mengekspor diagram rangkaian PNG.');
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
    showToast('success', 'Berkas proyek (.json) berhasil diunduh!');
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
          showToast('success', `Proyek "${parsed.name || file.name}" berhasil dimuat!`);
        } else {
          showError('Format Tidak Valid', 'Format file proyek JSON tidak valid atau struktur tidak dikenali.');
        }
      } catch (err) {
        showError('Gagal Membaca File', 'Tidak dapat memproses atau membaca file proyek JSON.');
      }
    };
    reader.readAsText(file);
  };

  // Clear Canvas
  const handleClearCanvas = async () => {
    const isConfirmed = await showConfirm({
      title: 'Bersihkan Seluruh Kanvas?',
      text: 'Semua kabel dan komponen yang ada di kanvas aktif akan dihapus.',
      icon: 'warning',
      confirmText: 'Ya, Bersihkan',
      cancelText: 'Batal',
      isDanger: true,
    });

    if (isConfirmed) {
      commit({
        components: [],
        wires: [],
      });
      setSelectedComponentIds([]);
      setSelectedWireId(null);
      showToast('info', 'Kanvas telah dibersihkan.');
    }
  };

  // 1. Loading state while verifying stored session token
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center w-screen h-screen bg-slate-100 dark:bg-[#020617] text-slate-900 dark:text-slate-100 select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-sm animate-pulse">
            <Zap className="w-5 h-5" />
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Memuat Circuit Electronics IDE...</div>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated state: Lock canvas and show Auth Modal
  if (!user) {
    return (
      <div className="flex flex-col w-screen h-screen bg-slate-100 dark:bg-[#020617] text-slate-900 dark:text-slate-100 overflow-hidden select-none relative">
        {/* Ambient Grid Background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />

        {/* Auth Modal with locked close */}
        <AuthModal
          isOpen={true}
          canClose={false}
        />
      </div>
    );
  }

  const selectedComponent = components.find((c) => selectedComponentIds.includes(c.id)) || null;
  const selectedWire = wires.find((w) => w.id === selectedWireId) || null;

  return (
    <div className="flex flex-col w-screen h-screen bg-slate-100 dark:bg-[#020617] text-slate-900 dark:text-slate-100 overflow-hidden select-none">
      {/* Top Header Navigation with Undo / Redo */}
      <TopBar
        saveStatus={saveStatus}
        projectName={projectName}
        onProjectNameChange={handleProjectNameChange}
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
        onOpenBom={() => setIsBomModalOpen(true)}
        onOpenStudio={
          isAdmin
            ? () => {
                setStudioEditDef(null);
                setIsStudioOpen(true);
              }
            : undefined
        }
        onOpenUserManagement={
          isAdmin
            ? () => {
                setIsUserManagementOpen(true);
              }
            : undefined
        }
        onOpenExportModal={() => setIsExportModalOpen(true)}
        onExportPng={handleExportPng}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onClearCanvas={handleClearCanvas}
        user={user}
        isAdmin={isAdmin}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onLogout={() => {
          logout();
          showToast('info', 'Anda telah keluar dari workspace.');
        }}
        cloudSyncStatus={cloudSyncStatus}
        onSyncToCloud={async () => {
          await syncToCloudNow();
          showToast('success', 'Rangkaian berhasil disinkronkan ke Cloud!');
        }}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 relative w-full h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Left Drawer (Katalog Komponen & File Explorer) */}
        <ComponentLibrary
          isOpen={isLibraryOpen}
          onToggle={() => setIsLibraryOpen((prev) => !prev)}
          onAddComponent={handleAddComponent}
          onOpenStudio={
            isAdmin
              ? (def?: ComponentDefinition) => {
                  setStudioEditDef(def || null);
                  setIsStudioOpen(true);
                }
              : undefined
          }
          fileSystem={fileSystem}
          activeFile={activeFile}
          onSelectFile={handleSelectFile}
          onCreateFile={handleCreateFile}
          onCreateFolder={createFolder}
          onRenameFile={renameFile}
          onRenameFolder={renameFolder}
          onDeleteFile={deleteFile}
          onDeleteFolder={deleteFolder}
          onMoveItem={moveItem}
          onToggleFolder={toggleFolder}
          onCollapseAll={collapseAllFolders}
          onExpandAll={expandAllFolders}
          onDuplicateFile={duplicateFile}
          onImportFile={importFile}
          onExportFile={exportFile}
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
          onCenterCanvas={handleCenterCanvas}
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
          onEditInStudio={
            isAdmin
              ? (def) => {
                  setStudioEditDef(def || null);
                  setIsStudioOpen(true);
                }
              : undefined
          }
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
      {isAdmin && (
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
      )}

      {/* User Management (Admin Mode) Modal */}
      {isAdmin && (
        <UserManagementModal
          isOpen={isUserManagementOpen}
          onClose={() => setIsUserManagementOpen(false)}
        />
      )}

      {/* HD Schema & Diagram Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        projectName={projectName}
        components={components}
        wires={wires}
      />

      {/* Auth Modal (Login / Register) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CircuitAppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
