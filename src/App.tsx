import { useState, useEffect, useRef, useCallback } from 'react';
import {
  CircuitComponent,
  Wire,
  ComponentType,
  WirePoint,
  WireRouting,
  ComponentDefinition,
} from './types/circuit';
import { COMPONENT_DEFINITIONS } from './constants/components';
import { getAllComponentDefinitions } from './utils/customComponents';
import { cleanAndSimplifyWaypoints } from './utils/orthogonalRouter';
import { translateComponentsAndWires } from './utils/wireTranslation';
import { useCircuitHistory } from './hooks/useCircuitHistory';
import { useAppModals } from './hooks/useAppModals';
import { useCanvasHotkeys } from './hooks/useCanvasHotkeys';
import { useProjectIO } from './hooks/useProjectIO';
import { useCircuitFiles } from './hooks/useCircuitFiles';
import { TopBar } from './components/navigation/TopBar';
import { ComponentLibrary } from './components/panels/ComponentLibrary';
import { CircuitCanvas } from './components/canvas/CircuitCanvas';
import { PropertiesInspector } from './components/panels/PropertiesInspector';
import { AppModalsContainer } from './components/modals/AppModalsContainer';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthModal } from './components/modals/AuthModal';
import { ContextMenu, ContextMenuState } from './components/menu/ContextMenu';
import { Zap } from 'lucide-react';
import { showToast } from './utils/alert';

function CircuitAppContent() {
  const { user, isAdmin, token, logout, isLoading } = useAuth();

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
  const [showWireMarkers, setShowWireMarkers] = useState<boolean>(activeFile?.showWireMarkers ?? true);
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
        showWireMarkers,
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
      showWireMarkers,
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
      if (activeFile.showWireMarkers !== undefined) setShowWireMarkers(activeFile.showWireMarkers);
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
        showWireMarkers,
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
      showWireMarkers,
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
          showWireMarkers,
          pan,
          zoom,
          name: projectName,
        });
        setSaveStatus('saved');
      } catch (err) {
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
    wireRouting,
    currentWireColor,
    showWireMarkers,
    pan,
    zoom,
    projectName,
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

  // Drawers & Modals state management
  const modals = useAppModals();

  // Context Menu state
  const [contextMenuState, setContextMenuState] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    worldX: 0,
    worldY: 0,
    targetType: 'canvas',
  });

  // Wire Branching request from context menu
  const [startBranchWireRequest, setStartBranchWireRequest] = useState<{ wire: Wire; point: WirePoint; timestamp: number } | null>(null);

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

      commit((prev) => {
        const deletedCompIds = new Set(targetIds);
        const remainingComps = prev.components.filter((c) => !deletedCompIds.has(c.id));

        let remainingWires = prev.wires.filter(
          (w) =>
            !(w.fromComponentId && deletedCompIds.has(w.fromComponentId)) &&
            !(w.toComponentId && deletedCompIds.has(w.toComponentId))
        );

        // Also clean up any wires that were connected to now-deleted wires
        const existingWireIds = new Set(remainingWires.map((w) => w.id));
        remainingWires = remainingWires.filter((w) => {
          if (w.fromWireId && !existingWireIds.has(w.fromWireId)) return false;
          if (w.toWireId && !existingWireIds.has(w.toWireId)) return false;
          return true;
        });

        return {
          ...prev,
          components: remainingComps,
          wires: remainingWires,
        };
      });

      setSelectedComponentIds([]);
    },
    [selectedComponentIds, commit]
  );

  // 5. Update Component Positions (with Wire Waypoint Preservation)
  const handleUpdateComponentPositions = useCallback(
    (updates: { id: string; x: number; y: number }[], isFinal = false) => {
      commit(
        (prev) => translateComponentsAndWires(prev.components, prev.wires, updates),
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

    const availWidth = window.innerWidth - (modals.isInspectorOpen ? 320 : 0) - 70;
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
  }, [components, modals.isInspectorOpen]);

  // 7. Select All Components (Ctrl+A)
  const handleSelectAll = useCallback(() => {
    setSelectedComponentIds(components.map((c) => c.id));
    setSelectedWireId(null);
  }, [components]);

  // Delete Wire
  const handleDeleteWire = useCallback((id: string) => {
    commit((prev) => {
      const remainingWires = prev.wires
        .filter((w) => w.id !== id)
        .map((w) => {
          let updated = { ...w };
          if (w.fromWireId === id) {
            updated = { ...updated, fromWireId: undefined, fromPoint: undefined };
          }
          if (w.toWireId === id) {
            updated = { ...updated, toWireId: undefined, toPoint: undefined };
          }
          return updated;
        })
        .filter((w) => {
          const hasStart = Boolean((w.fromComponentId && w.fromPinId) || w.fromWireId);
          const hasEnd = Boolean((w.toComponentId && w.toPinId) || w.toWireId);
          return hasStart && hasEnd;
        });

      return {
        ...prev,
        wires: remainingWires,
      };
    });
    setSelectedWireId((curr) => (curr === id ? null : curr));
  }, [commit]);

  // Global Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+A, Ctrl+D, L, M, R/Space, Delete/Backspace)
  useCanvasHotkeys({
    isModalOpen:
      modals.isAuthModalOpen ||
      modals.isBomModalOpen ||
      modals.isWiringTableOpen ||
      modals.isPresetsModalOpen ||
      modals.isStudioOpen ||
      modals.isUserManagementOpen ||
      modals.isExportModalOpen,
    canUndo,
    canRedo,
    onUndo: undo,
    onRedo: redo,
    selectedComponentIds,
    selectedWireId,
    onSelectAll: handleSelectAll,
    onDuplicateComponents: handleDuplicateComponents,
    onToggleLock: handleToggleLock,
    onRotateComponents: handleRotateComponents,
    onDeleteComponents: handleDeleteComponents,
    onDeleteWire: handleDeleteWire,
    onToggleWireMarkers: () => setShowWireMarkers((prev) => !prev),
  });

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

  // Add Multiple Wires (Batch Atomic Addition for Auto-Routing)
  const handleAddMultipleWires = useCallback((wiresData: Omit<Wire, 'id'>[]) => {
    if (!wiresData || wiresData.length === 0) return;
    const newWires: Wire[] = wiresData.map((wd, i) => ({
      ...wd,
      id: `wire_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
    }));

    commit((prev) => ({
      ...prev,
      wires: [...prev.wires, ...newWires],
    }));
    setSelectedWireId(null);
  }, [commit]);

  // Update Wire
  const handleUpdateWire = (id: string, updates: Partial<Wire>) => {
    commit((prev) => ({
      ...prev,
      wires: prev.wires.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    }));
  };

  // Update Wire Waypoints
  const handleUpdateWireWaypoints = (
    id: string,
    waypoints: WirePoint[],
    fromPoint?: WirePoint,
    toPoint?: WirePoint
  ) => {
    commit((prev) => ({
      ...prev,
      wires: prev.wires.map((w) =>
        w.id === id
          ? {
              ...w,
              waypoints: cleanAndSimplifyWaypoints(waypoints),
              ...(fromPoint !== undefined ? { fromPoint } : {}),
              ...(toPoint !== undefined ? { toPoint } : {}),
            }
          : w
      ),
    }));
  };

  // Update Multiple Wire Waypoints in a single atomic commit
  const handleUpdateMultiWireWaypoints = (
    updates: {
      id: string;
      waypoints: WirePoint[];
      fromPoint?: WirePoint;
      toPoint?: WirePoint;
    }[]
  ) => {
    if (updates.length === 0) return;
    const updateMap = new Map(updates.map((u) => [u.id, u]));
    commit((prev) => ({
      ...prev,
      wires: prev.wires.map((w) => {
        const u = updateMap.get(w.id);
        if (u) {
          return {
            ...w,
            waypoints: cleanAndSimplifyWaypoints(u.waypoints),
            ...(u.fromPoint !== undefined ? { fromPoint: u.fromPoint } : {}),
            ...(u.toPoint !== undefined ? { toPoint: u.toPoint } : {}),
          };
        }
        return w;
      }),
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

  // Export, Import, and Clear handlers
  const {
    handleExportPng,
    handleExportJson,
    handleImportJson,
    handleClearCanvas,
  } = useProjectIO({
    projectName,
    components,
    wires,
    setProjectName,
    commit,
    setSelectedComponentIds,
    setSelectedWireId,
  });

  // 1. Loading state while verifying stored session token
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center w-screen h-screen bg-slate-100 dark:bg-[#020617] text-slate-900 dark:text-slate-100 select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-sm animate-pulse">
            <Zap className="w-5 h-5" />
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Memuat Wirecraft IDE...</div>
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
        showWireMarkers={showWireMarkers}
        onToggleWireMarkers={() => setShowWireMarkers((prev) => !prev)}
        onOpenPresets={modals.openPresetsModal}
        onOpenBom={modals.openBomModal}
        onOpenWiringTable={modals.openWiringTable}
        onOpenStudio={
          isAdmin
            ? () => modals.openStudio(null)
            : undefined
        }
        onOpenUserManagement={
          isAdmin
            ? modals.openUserManagement
            : undefined
        }
        onOpenExportModal={modals.openExportModal}
        onExportPng={handleExportPng}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onClearCanvas={handleClearCanvas}
        user={user}
        isAdmin={isAdmin}
        onOpenAuthModal={modals.openAuthModal}
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
          isOpen={modals.isLibraryOpen}
          onToggle={modals.toggleLibrary}
          onAddComponent={handleAddComponent}
          onOpenStudio={
            isAdmin
              ? (def?: ComponentDefinition) => modals.openStudio(def || null)
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
          showWireMarkers={showWireMarkers}
          onSelectComponents={setSelectedComponentIds}
          onSelectWire={setSelectedWireId}
          onUpdateComponentPositions={handleUpdateComponentPositions}
          onAddWire={handleAddWire}
          onAddMultipleWires={handleAddMultipleWires}
          onUpdateWire={handleUpdateWire}
          onDeleteSelected={handleDeleteSelected}
          onUpdateWireWaypoints={handleUpdateWireWaypoints}
          onUpdateMultiWireWaypoints={handleUpdateMultiWireWaypoints}
          onResetWireWaypoints={handleResetWireWaypoints}
          zoom={zoom}
          pan={pan}
          onZoomChange={setZoom}
          onPanChange={setPan}
          onContextMenu={setContextMenuState}
          onCursorMove={(pos) => {
            lastCursorWorldPosRef.current = pos;
          }}
          startBranchWireRequest={startBranchWireRequest}
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
          onOpenWiringTable={modals.openWiringTable}
          onUpdateComponent={handleUpdateComponent}
          onUpdateWire={handleUpdateWire}
          onAddMultipleWires={handleAddMultipleWires}
          onDeleteComponent={(id) => handleDeleteComponents([id])}
          onDuplicateComponent={(id) => handleDuplicateComponents([id])}
          onToggleLock={handleToggleLock}
          onRotateComponents={handleRotateComponents}
          onDuplicateComponents={handleDuplicateComponents}
          onDeleteComponents={handleDeleteComponents}
          onDeleteWire={handleDeleteWire}
          isOpen={modals.isInspectorOpen}
          onToggleOpen={modals.toggleInspector}
        />

        {/* Right-Click Context Menu */}
        <ContextMenu
          menuState={contextMenuState}
          onClose={() => setContextMenuState((prev) => ({ ...prev, isOpen: false }))}
          onToggleLock={handleToggleLock}
          onDuplicate={handleDuplicateComponents}
          onRotate={handleRotateComponents}
          onDeleteComponents={handleDeleteComponents}
          allComponents={components}
          allWires={wires}
          wireRouting={wireRouting}
          onAddMultipleWires={handleAddMultipleWires}
          onEditInStudio={
            isAdmin
              ? (def) => modals.openStudio(def || null)
              : undefined
          }
          onUpdateWireColor={(wireId, color) => handleUpdateWire(wireId, { color })}
          onUpdateWireRouting={(wireId, routing) => handleUpdateWire(wireId, { routing })}
          onUpdateWire={handleUpdateWire}
          onDeleteWire={handleDeleteWire}
          onStartBranchWire={(wire, worldPos) => {
            setStartBranchWireRequest({ wire, point: worldPos, timestamp: Date.now() });
          }}
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

      {/* Application Modals Container */}
      <AppModalsContainer
        modals={modals}
        components={components}
        wires={wires}
        allDefs={getAllComponentDefinitions()}
        projectName={projectName}
        isAdmin={isAdmin}
        onLoadPreset={handleLoadPreset}
        onAddComponent={handleAddComponent}
        onHighlightComponent={(compId) => {
          if (compId) {
            setSelectedComponentIds([compId]);
            setSelectedWireId(null);
          }
        }}
        onHighlightWire={(wireId) => {
          if (wireId) {
            setSelectedWireId(wireId);
            setSelectedComponentIds([]);
          }
        }}
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
