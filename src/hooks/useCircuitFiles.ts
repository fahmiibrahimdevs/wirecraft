import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CircuitFile,
  CircuitFolder,
  CircuitFileSystem,
  CircuitComponent,
  Wire,
  WireRouting,
  WirePoint,
} from '../types/circuit';

const STORAGE_FILES_KEY = 'wirecraft_circuit_files_v1';
const LEGACY_STORAGE_KEY = 'wirecraft_saved_project_v1';

// Default starter components for a fresh project
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
    color: '#ef4444',
    routing: 'orthogonal',
  },
  {
    id: 'wire_gnd_rail',
    fromComponentId: 'uno_1',
    fromPinId: 'gnd1',
    toComponentId: 'bb_1',
    toPinId: 'top-gnd-1',
    color: '#1e293b',
    routing: 'orthogonal',
  },
  {
    id: 'wire_d13_resistor',
    fromComponentId: 'uno_1',
    fromPinId: 'd13',
    toComponentId: 'res_1',
    toPinId: 'pin1',
    color: '#38bdf8',
    routing: 'orthogonal',
  },
];

function getInitialFileSystem(): CircuitFileSystem {
  try {
    const saved = localStorage.getItem(STORAGE_FILES_KEY);
    if (saved) {
      const parsed: CircuitFileSystem = JSON.parse(saved);
      if (
        Array.isArray(parsed.files) &&
        parsed.files.length > 0 &&
        Array.isArray(parsed.folders)
      ) {
        return parsed;
      }
    }

    // Try migrating from legacy single-project storage
    const legacySaved = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacySaved) {
      const parsedLegacy = JSON.parse(legacySaved);
      if (Array.isArray(parsedLegacy.components) && Array.isArray(parsedLegacy.wires)) {
        const fileId = 'file_main';
        const initialFile: CircuitFile = {
          id: fileId,
          name: parsedLegacy.projectName ? `${parsedLegacy.projectName.replace(/\.wire$/, '')}.wire` : 'Latihan Sirkuit Arduino.wire',
          parentId: null,
          components: parsedLegacy.components,
          wires: parsedLegacy.wires,
          wireRouting: parsedLegacy.wireRouting || 'orthogonal',
          currentWireColor: parsedLegacy.currentWireColor || '#38bdf8',
          pan: parsedLegacy.pan || { x: 80, y: 50 },
          zoom: parsedLegacy.zoom || 1,
          createdAt: parsedLegacy.timestamp || Date.now(),
          updatedAt: Date.now(),
        };

        return {
          activeFileId: fileId,
          files: [initialFile],
          folders: [
            {
              id: 'folder_examples',
              name: 'Contoh Rangkaian',
              parentId: null,
              isExpanded: true,
              createdAt: Date.now(),
            },
          ],
        };
      }
    }
  } catch (err) {
    console.warn('Error reading file system from localStorage:', err);
  }

  // Fresh default file system
  const defaultFileId = 'file_default_1';
  return {
    activeFileId: defaultFileId,
    files: [
      {
        id: defaultFileId,
        name: 'Latihan Sirkuit Arduino.wire',
        parentId: null,
        components: DEFAULT_STARTER_COMPONENTS,
        wires: DEFAULT_STARTER_WIRES,
        wireRouting: 'orthogonal',
        currentWireColor: '#38bdf8',
        pan: { x: 80, y: 50 },
        zoom: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: 'file_wemos_sample',
        name: 'Buzzer_WeMos_Node.wire',
        parentId: 'folder_examples',
        components: [
          {
            id: 'wemos_1',
            type: 'wemos-d1-mini',
            name: 'WEMOS D1 MINI (ESP8266)',
            label: 'WEMOS_1',
            x: 200,
            y: 260,
            rotation: 0,
            customProps: {},
          },
          {
            id: 'piezo_1',
            type: 'buzzer',
            name: 'Piezo Buzzer',
            label: 'Piezo_1',
            x: 380,
            y: 120,
            rotation: 0,
            customProps: {},
          },
        ],
        wires: [
          {
            id: 'w_buzzer_pos',
            fromComponentId: 'wemos_1',
            fromPinId: 'pin_3v3',
            toComponentId: 'piezo_1',
            toPinId: 'pos',
            color: '#ef4444',
            routing: 'orthogonal',
          },
          {
            id: 'w_buzzer_gnd',
            fromComponentId: 'wemos_1',
            fromPinId: 'pin_g',
            toComponentId: 'piezo_1',
            toPinId: 'neg',
            color: '#1e293b',
            routing: 'orthogonal',
          },
        ],
        wireRouting: 'orthogonal',
        currentWireColor: '#38bdf8',
        pan: { x: 80, y: 50 },
        zoom: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
    folders: [
      {
        id: 'folder_examples',
        name: 'Contoh Rangkaian',
        parentId: null,
        isExpanded: true,
        createdAt: Date.now(),
      },
    ],
  };
}

export function useCircuitFiles(authToken?: string | null) {
  const [fileSystem, setFileSystem] = useState<CircuitFileSystem>(getInitialFileSystem);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('offline');
  const syncTimeoutRef = useRef<any>(null);

  // Keep a ref to latest file system for immediate writes
  const fileSystemRef = useRef(fileSystem);
  useEffect(() => {
    fileSystemRef.current = fileSystem;
  }, [fileSystem]);

  // Load from Cloud Database when logged in
  useEffect(() => {
    if (!authToken) {
      setCloudSyncStatus('offline');
      return;
    }

    let isMounted = true;
    const fetchCloudFiles = async () => {
      setCloudSyncStatus('syncing');
      try {
        const res = await fetch('/api/circuits/files', {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.fileSystem && isMounted) {
            const cloudFiles = data.fileSystem.files || [];
            const cloudFolders = data.fileSystem.folders || [];

            if (cloudFiles.length > 0 || cloudFolders.length > 0) {
              setFileSystem((prev) => ({
                activeFileId: cloudFiles[0]?.id || prev.activeFileId,
                folders: cloudFolders,
                files: cloudFiles,
              }));
              setCloudSyncStatus('synced');
              return;
            } else {
              // Cloud is empty for this user, upload initial local files to Cloud
              await fetch('/api/circuits/sync', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                  folders: fileSystemRef.current.folders,
                  files: fileSystemRef.current.files,
                }),
              });
              setCloudSyncStatus('synced');
              return;
            }
          }
        }
        if (isMounted) setCloudSyncStatus('error');
      } catch (err) {
        console.error('Failed to sync with cloud database:', err);
        if (isMounted) setCloudSyncStatus('error');
      }
    };

    fetchCloudFiles();

    return () => {
      isMounted = false;
    };
  }, [authToken]);

  // Save to localStorage and debounce sync to Cloud Database
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FILES_KEY, JSON.stringify(fileSystem));
    } catch (err) {
      console.error('Failed to save file system to localStorage:', err);
    }

    if (authToken) {
      setCloudSyncStatus('syncing');
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      syncTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await fetch('/api/circuits/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({
              folders: fileSystem.folders,
              files: fileSystem.files,
            }),
          });
          if (res.ok) {
            setCloudSyncStatus('synced');
          } else {
            setCloudSyncStatus('error');
          }
        } catch {
          setCloudSyncStatus('error');
        }
      }, 1000);
    }
  }, [fileSystem, authToken]);

  const syncToCloudNow = useCallback(async () => {
    if (!authToken) return;
    setCloudSyncStatus('syncing');
    try {
      const res = await fetch('/api/circuits/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          folders: fileSystemRef.current.folders,
          files: fileSystemRef.current.files,
        }),
      });
      if (res.ok) {
        setCloudSyncStatus('synced');
      } else {
        setCloudSyncStatus('error');
      }
    } catch {
      setCloudSyncStatus('error');
    }
  }, [authToken]);

  // Find active file
  const activeFile =
    fileSystem.files.find((f) => f.id === fileSystem.activeFileId) ||
    fileSystem.files[0] ||
    null;

  // 1. Create a New Circuit Design File
  const createFile = useCallback((
    name?: string,
    parentId: string | null = null,
    initialComponents: CircuitComponent[] = [],
    initialWires: Wire[] = []
  ): string => {
    const id = `file_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const baseName = (name || 'Desain_Rangkaian').replace(/\.wire$/, '');
    const fileName = `${baseName}.wire`;

    const newFile: CircuitFile = {
      id,
      name: fileName,
      parentId,
      components: initialComponents,
      wires: initialWires,
      wireRouting: 'orthogonal',
      currentWireColor: '#38bdf8',
      pan: { x: 80, y: 50 },
      zoom: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setFileSystem((prev) => ({
      ...prev,
      activeFileId: id,
      files: [...prev.files, newFile],
    }));

    return id;
  }, []);

  // 2. Create a New Folder
  const createFolder = useCallback((name?: string, parentId: string | null = null): string => {
    const id = `folder_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const folderName = name || 'Folder_Baru';

    const newFolder: CircuitFolder = {
      id,
      name: folderName,
      parentId,
      isExpanded: true,
      createdAt: Date.now(),
    };

    setFileSystem((prev) => ({
      ...prev,
      folders: [...prev.folders, newFolder],
    }));

    return id;
  }, []);

  // 3. Rename File
  const renameFile = useCallback((fileId: string, rawName: string) => {
    if (!rawName.trim()) return;
    const base = rawName.trim().replace(/\.wire$/, '');
    const finalName = `${base}.wire`;

    setFileSystem((prev) => ({
      ...prev,
      files: prev.files.map((f) =>
        f.id === fileId ? { ...f, name: finalName, updatedAt: Date.now() } : f
      ),
    }));
  }, []);

  // 4. Rename Folder
  const renameFolder = useCallback((folderId: string, newName: string) => {
    if (!newName.trim()) return;
    setFileSystem((prev) => ({
      ...prev,
      folders: prev.folders.map((folder) =>
        folder.id === folderId ? { ...folder, name: newName.trim() } : folder
      ),
    }));
  }, []);

  // 5. Delete File
  const deleteFile = useCallback((fileId: string) => {
    setFileSystem((prev) => {
      const remainingFiles = prev.files.filter((f) => f.id !== fileId);
      if (remainingFiles.length === 0) {
        // If all files deleted, create an empty fresh file
        const newId = `file_${Date.now()}`;
        const freshFile: CircuitFile = {
          id: newId,
          name: 'Desain_Utama.wire',
          parentId: null,
          components: [],
          wires: [],
          wireRouting: 'orthogonal',
          currentWireColor: '#38bdf8',
          pan: { x: 80, y: 50 },
          zoom: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        return {
          ...prev,
          activeFileId: newId,
          files: [freshFile],
        };
      }

      let newActiveId = prev.activeFileId;
      if (prev.activeFileId === fileId) {
        newActiveId = remainingFiles[0]!.id;
      }

      return {
        ...prev,
        activeFileId: newActiveId,
        files: remainingFiles,
      };
    });
  }, []);

  // 6. Delete Folder (Cascades to subfolders & files)
  const deleteFolder = useCallback((folderId: string) => {
    setFileSystem((prev) => {
      // Find all nested folder IDs recursively
      const getDescendantFolderIds = (id: string): string[] => {
        const children = prev.folders.filter((f) => f.parentId === id);
        return [id, ...children.flatMap((c) => getDescendantFolderIds(c.id))];
      };

      const folderIdsToDelete = new Set(getDescendantFolderIds(folderId));

      const remainingFolders = prev.folders.filter((f) => !folderIdsToDelete.has(f.id));
      const remainingFiles = prev.files.filter(
        (f) => !f.parentId || !folderIdsToDelete.has(f.parentId)
      );

      if (remainingFiles.length === 0) {
        const newId = `file_${Date.now()}`;
        const freshFile: CircuitFile = {
          id: newId,
          name: 'Desain_Utama.wire',
          parentId: null,
          components: [],
          wires: [],
          wireRouting: 'orthogonal',
          currentWireColor: '#38bdf8',
          pan: { x: 80, y: 50 },
          zoom: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        return {
          ...prev,
          activeFileId: newId,
          files: [freshFile],
          folders: remainingFolders,
        };
      }

      let newActiveId = prev.activeFileId;
      if (!remainingFiles.some((f) => f.id === newActiveId)) {
        newActiveId = remainingFiles[0]!.id;
      }

      return {
        ...prev,
        activeFileId: newActiveId,
        files: remainingFiles,
        folders: remainingFolders,
      };
    });
  }, []);

  // 7. Move File or Folder (Drag & Drop)
  const moveItem = useCallback(
    (itemId: string, itemType: 'file' | 'folder', targetParentId: string | null) => {
      // Prevent moving folder into itself or its own descendants
      if (itemType === 'folder' && targetParentId === itemId) return;

      setFileSystem((prev) => {
        if (itemType === 'file') {
          return {
            ...prev,
            files: prev.files.map((f) =>
              f.id === itemId ? { ...f, parentId: targetParentId, updatedAt: Date.now() } : f
            ),
          };
        } else {
          // Check circular ancestor
          const isDescendant = (parent: string | null, target: string): boolean => {
            if (!parent) return false;
            if (parent === target) return true;
            const pFolder = prev.folders.find((f) => f.id === parent);
            return pFolder ? isDescendant(pFolder.parentId, target) : false;
          };

          if (isDescendant(targetParentId, itemId)) return prev;

          return {
            ...prev,
            folders: prev.folders.map((f) =>
              f.id === itemId ? { ...f, parentId: targetParentId } : f
            ),
          };
        }
      });
    },
    []
  );

  // 8. Toggle Folder expand/collapse
  const toggleFolder = useCallback((folderId: string) => {
    setFileSystem((prev) => ({
      ...prev,
      folders: prev.folders.map((f) =>
        f.id === folderId ? { ...f, isExpanded: !f.isExpanded } : f
      ),
    }));
  }, []);

  // 9. Collapse All
  const collapseAllFolders = useCallback(() => {
    setFileSystem((prev) => ({
      ...prev,
      folders: prev.folders.map((f) => ({ ...f, isExpanded: false })),
    }));
  }, []);

  // 10. Expand All
  const expandAllFolders = useCallback(() => {
    setFileSystem((prev) => ({
      ...prev,
      folders: prev.folders.map((f) => ({ ...f, isExpanded: true })),
    }));
  }, []);

  // 11. Select Active File
  const selectFile = useCallback((fileId: string) => {
    setFileSystem((prev) => {
      if (prev.activeFileId === fileId) return prev;
      return {
        ...prev,
        activeFileId: fileId,
      };
    });
  }, []);

  // 12. Update Active File content from Canvas
  const updateActiveFileContent = useCallback(
    (content: {
      components?: CircuitComponent[];
      wires?: Wire[];
      wireRouting?: WireRouting;
      currentWireColor?: string;
      pan?: WirePoint;
      zoom?: number;
      name?: string;
    }) => {
      setFileSystem((prev) => ({
        ...prev,
        files: prev.files.map((f) => {
          if (f.id !== prev.activeFileId) return f;
          return {
            ...f,
            components: content.components ?? f.components,
            wires: content.wires ?? f.wires,
            wireRouting: content.wireRouting ?? f.wireRouting,
            currentWireColor: content.currentWireColor ?? f.currentWireColor,
            pan: content.pan ?? f.pan,
            zoom: content.zoom ?? f.zoom,
            name: content.name ? `${content.name.replace(/\.wire$/, '')}.wire` : f.name,
            updatedAt: Date.now(),
          };
        }),
      }));
    },
    []
  );

  // 13. Duplicate File
  const duplicateFile = useCallback((fileId: string): string => {
    const fileToCopy = fileSystemRef.current.files.find((f) => f.id === fileId);
    if (!fileToCopy) return '';

    const newId = `file_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const baseName = fileToCopy.name.replace(/\.wire$/, '');
    const newName = `${baseName}_Copy.wire`;

    const newFile: CircuitFile = {
      ...fileToCopy,
      id: newId,
      name: newName,
      // Create new IDs for duplicated components and wires
      components: JSON.parse(JSON.stringify(fileToCopy.components)),
      wires: JSON.parse(JSON.stringify(fileToCopy.wires)),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setFileSystem((prev) => ({
      ...prev,
      activeFileId: newId,
      files: [...prev.files, newFile],
    }));

    return newId;
  }, []);

  // 14. Import File (.wire or .json)
  const importFile = useCallback((file: File, targetParentId: string | null = null) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);

        const newId = `file_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const rawFileName = file.name.replace(/\.(json|wire)$/, '');
        const fileName = `${rawFileName}.wire`;

        const newFile: CircuitFile = {
          id: newId,
          name: fileName,
          parentId: targetParentId,
          components: Array.isArray(parsed.components) ? parsed.components : [],
          wires: Array.isArray(parsed.wires) ? parsed.wires : [],
          wireRouting: parsed.wireRouting || 'orthogonal',
          currentWireColor: parsed.currentWireColor || '#38bdf8',
          pan: parsed.pan || { x: 80, y: 50 },
          zoom: parsed.zoom || 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        setFileSystem((prev) => ({
          ...prev,
          activeFileId: newId,
          files: [...prev.files, newFile],
        }));
      } catch (err) {
        console.error('Failed to parse imported circuit file:', err);
        alert('Format file rangkaian tidak valid!');
      }
    };
    reader.readAsText(file);
  }, []);

  // 15. Export File
  const exportFile = useCallback((fileId: string) => {
    const targetFile = fileSystemRef.current.files.find((f) => f.id === fileId);
    if (!targetFile) return;

    const dataStr = JSON.stringify(targetFile, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = targetFile.name.endsWith('.wire') ? targetFile.name : `${targetFile.name}.wire`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
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
  };
}
