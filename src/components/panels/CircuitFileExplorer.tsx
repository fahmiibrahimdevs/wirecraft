import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CircuitFile, CircuitFolder, CircuitFileSystem } from '../../types/circuit';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  FolderPlus,
  FilePlus,
  Upload,
  Download,
  Copy,
  Edit2,
  Trash2,
  FileText,
  Layers,
  Sparkles,
  Eye,
} from 'lucide-react';

interface ExplorerContextMenuState {
  x: number;
  y: number;
  type: 'file' | 'folder' | 'root';
  targetId?: string;
  targetName?: string;
}

interface CircuitFileExplorerProps {
  fileSystem: CircuitFileSystem;
  activeFile: CircuitFile | null;
  onSelectFile: (fileId: string) => void;
  onCreateFile: (name?: string, parentId?: string | null) => void;
  onCreateFolder: (name?: string, parentId?: string | null) => void;
  onRenameFile: (fileId: string, newName: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFile: (fileId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onMoveItem: (itemId: string, itemType: 'file' | 'folder', targetParentId: string | null) => void;
  onToggleFolder: (folderId: string) => void;
  onCollapseAll: () => void;
  onExpandAll: () => void;
  onDuplicateFile: (fileId: string) => void;
  onImportFile: (file: File, targetParentId?: string | null) => void;
  onExportFile: (fileId: string) => void;
}

export const CircuitFileExplorer: React.FC<CircuitFileExplorerProps> = ({
  fileSystem,
  activeFile,
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onRenameFile,
  onRenameFolder,
  onDeleteFile,
  onDeleteFolder,
  onMoveItem,
  onToggleFolder,
  onCollapseAll,
  onExpandAll,
  onDuplicateFile,
  onImportFile,
  onExportFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState<ExplorerContextMenuState | null>(null);

  // Inline creation states
  const [creatingType, setCreatingType] = useState<'file' | 'folder' | null>(null);
  const [creatingParentId, setCreatingParentId] = useState<string | null>(null);
  const [createNameInput, setCreateNameInput] = useState('');

  // Inline rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingType, setRenamingType] = useState<'file' | 'folder' | null>(null);
  const [renameInput, setRenameInput] = useState('');

  // Drag & drop state
  const [draggedItem, setDraggedItem] = useState<{ id: string; type: 'file' | 'folder' } | null>(
    null
  );
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);

  // Close context menu on click outside or escape key
  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  const startCreating = (type: 'file' | 'folder', parentId: string | null = null) => {
    setCreatingType(type);
    setCreatingParentId(parentId);
    setCreateNameInput(type === 'file' ? 'Desain_Baru' : 'Folder_Baru');
  };

  const submitCreating = () => {
    if (!createNameInput.trim()) {
      setCreatingType(null);
      return;
    }
    if (creatingType === 'file') {
      onCreateFile(createNameInput.trim(), creatingParentId);
    } else if (creatingType === 'folder') {
      onCreateFolder(createNameInput.trim(), creatingParentId);
    }
    setCreatingType(null);
    setCreateNameInput('');
  };

  const startRenaming = (id: string, currentName: string, type: 'file' | 'folder') => {
    setRenamingId(id);
    setRenamingType(type);
    setRenameInput(type === 'file' ? currentName.replace(/\.wire$/, '') : currentName);
  };

  const submitRenaming = () => {
    if (!renamingId || !renameInput.trim()) {
      setRenamingId(null);
      return;
    }
    if (renamingType === 'file') {
      onRenameFile(renamingId, renameInput.trim());
    } else if (renamingType === 'folder') {
      onRenameFolder(renamingId, renameInput.trim());
    }
    setRenamingId(null);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportFile(file, creatingParentId);
      e.target.value = '';
    }
  };

  // Helper to render tree nodes recursively
  const renderTree = (parentId: string | null = null, depth = 0) => {
    const folders = fileSystem.folders.filter((f) => f.parentId === parentId);
    const files = fileSystem.files.filter((f) => f.parentId === parentId);

    return (
      <div className="space-y-0.5">
        {/* Render Folders */}
        {folders.map((folder) => {
          const isExpanded = folder.isExpanded ?? true;
          const isTarget = dragOverTargetId === folder.id;
          const isRenaming = renamingId === folder.id;

          return (
            <div key={folder.id} className="select-none">
              {/* Folder Row */}
              <div
                draggable={!isRenaming}
                onDragStart={(e) => {
                  e.stopPropagation();
                  setDraggedItem({ id: folder.id, type: 'folder' });
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (draggedItem?.id !== folder.id) {
                    setDragOverTargetId(folder.id);
                  }
                }}
                onDragLeave={() => {
                  if (dragOverTargetId === folder.id) {
                    setDragOverTargetId(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (draggedItem && draggedItem.id !== folder.id) {
                    onMoveItem(draggedItem.id, draggedItem.type, folder.id);
                  }
                  setDragOverTargetId(null);
                  setDraggedItem(null);
                }}
                onClick={() => onToggleFolder(folder.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({
                    type: 'folder',
                    x: e.clientX,
                    y: e.clientY,
                    targetId: folder.id,
                    targetName: folder.name,
                  });
                }}
                style={{ paddingLeft: `${depth * 14 + 8}px` }}
                className={`group flex items-center justify-between py-1.5 pr-2 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  isTarget
                    ? 'bg-sky-500/20 border border-dashed border-sky-400 text-sky-200'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="text-slate-500 hover:text-slate-300 p-0.5 shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </span>
                  {isExpanded ? (
                    <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <Folder className="w-4 h-4 text-amber-400 shrink-0" />
                  )}

                  {isRenaming ? (
                    <input
                      type="text"
                      value={renameInput}
                      onChange={(e) => setRenameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitRenaming();
                        if (e.key === 'Escape') setRenamingId(null);
                      }}
                      onBlur={submitRenaming}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                      className="bg-slate-950 border border-sky-500 text-slate-100 text-xs px-1.5 py-0.5 rounded outline-none w-36"
                    />
                  ) : (
                    <span className="truncate">{folder.name}</span>
                  )}
                </div>

                {/* Folder Action Buttons on Hover */}
                {!isRenaming && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <button
                      onClick={() => startCreating('file', folder.id)}
                      title="File Baru di folder ini"
                      className="p-1 rounded text-slate-400 hover:text-sky-400 hover:bg-slate-700/60"
                    >
                      <FilePlus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => startCreating('folder', folder.id)}
                      title="Sub-folder Baru"
                      className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-700/60"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => startRenaming(folder.id, folder.name, 'folder')}
                      title="Ubah Nama"
                      className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700/60"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Hapus folder "${folder.name}" beserta seluruh isinya?`)) {
                          onDeleteFolder(folder.id);
                        }
                      }}
                      title="Hapus Folder"
                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-700/60"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Sub-Tree or New Item Inline Input */}
              {isExpanded && (
                <div className="border-l border-slate-800/80 ml-3.5">
                  {creatingType && creatingParentId === folder.id && (
                    <div
                      style={{ paddingLeft: `${(depth + 1) * 14}px` }}
                      className="flex items-center gap-1.5 py-1 pr-2"
                    >
                      {creatingType === 'folder' ? (
                        <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      )}
                      <input
                        type="text"
                        value={createNameInput}
                        onChange={(e) => setCreateNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitCreating();
                          if (e.key === 'Escape') setCreatingType(null);
                        }}
                        onBlur={submitCreating}
                        autoFocus
                        placeholder={creatingType === 'file' ? 'nama_file' : 'nama_folder'}
                        className="bg-slate-950 border border-sky-500 text-slate-100 text-xs px-1.5 py-0.5 rounded outline-none w-36"
                      />
                    </div>
                  )}
                  {renderTree(folder.id, depth + 1)}
                </div>
              )}
            </div>
          );
        })}

        {/* Render Files */}
        {files.map((file) => {
          const isActive = activeFile?.id === file.id;
          const isRenaming = renamingId === file.id;

          return (
            <div
              key={file.id}
              draggable={!isRenaming}
              onDragStart={(e) => {
                e.stopPropagation();
                setDraggedItem({ id: file.id, type: 'file' });
              }}
              onClick={() => onSelectFile(file.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setContextMenu({
                  type: 'file',
                  x: e.clientX,
                  y: e.clientY,
                  targetId: file.id,
                  targetName: file.name,
                });
              }}
              style={{ paddingLeft: `${depth * 14 + 10}px` }}
              className={`group flex items-center justify-between py-1.5 pr-2 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                isActive
                  ? 'bg-sky-500/15 border border-sky-500/35 text-sky-300 font-semibold shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {/* Standard File Document Icon with active status dot */}
                <div className="relative shrink-0 flex items-center justify-center">
                  <FileText
                    className={`w-4 h-4 ${
                      isActive ? 'text-sky-400' : 'text-slate-400 group-hover:text-sky-400'
                    }`}
                  />
                  {isActive && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>

                {isRenaming ? (
                  <input
                    type="text"
                    value={renameInput}
                    onChange={(e) => setRenameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitRenaming();
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    onBlur={submitRenaming}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    className="bg-slate-950 border border-sky-500 text-slate-100 text-xs px-1.5 py-0.5 rounded outline-none w-36"
                  />
                ) : (
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{file.name}</span>
                    <span className="text-[10px] text-slate-500 font-normal">
                      {file.components.length} part • {file.wires.length} kabel
                    </span>
                  </div>
                )}
              </div>

              {/* Action Buttons on Hover */}
              {!isRenaming && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <button
                    onClick={() => onDuplicateFile(file.id)}
                    title="Duplikat Desain Rangkaian"
                    className="p-1 rounded text-slate-400 hover:text-sky-400 hover:bg-slate-700/60"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onExportFile(file.id)}
                    title="Unduh File (.wire)"
                    className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-700/60"
                  >
                    <Download className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => startRenaming(file.id, file.name, 'file')}
                    title="Ubah Nama"
                    className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-700/60"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Hapus berkas rangkaian "${file.name}"?`)) {
                        onDeleteFile(file.id);
                      }
                    }}
                    title="Hapus File"
                    className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-700/60"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 select-none">
      {/* Hidden File Input for Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".wire,.json"
        className="hidden"
      />

      {/* Explorer Top Toolbar */}
      <div className="p-3 border-b border-slate-800/90 flex items-center justify-between bg-slate-900/95">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            BERKAS DESAIN
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => startCreating('file', null)}
            title="Buat Desain Rangkaian Baru (.wire)"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-sky-400 border border-slate-700/80 transition-colors cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => startCreating('folder', null)}
            title="Buat Folder Baru"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-amber-400 border border-slate-700/80 transition-colors cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Import File Rangkaian (.wire / .json)"
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-emerald-400 border border-slate-700/80 transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Tree List */}
      <div
        onContextMenu={(e) => {
          e.preventDefault();
          setContextMenu({
            type: 'root',
            x: e.clientX,
            y: e.clientY,
          });
        }}
        className="flex-1 overflow-y-auto p-2.5 space-y-1"
      >
        {/* Inline Input when creating at root */}
        {creatingType && creatingParentId === null && (
          <div className="flex items-center gap-2 py-1.5 px-2 bg-slate-950/80 border border-sky-500 rounded-lg">
            {creatingType === 'folder' ? (
              <Folder className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-sky-400 shrink-0" />
            )}
            <input
              type="text"
              value={createNameInput}
              onChange={(e) => setCreateNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitCreating();
                if (e.key === 'Escape') setCreatingType(null);
              }}
              onBlur={submitCreating}
              autoFocus
              placeholder={creatingType === 'file' ? 'nama_desain' : 'nama_folder'}
              className="bg-transparent text-slate-100 text-xs outline-none w-full"
            />
          </div>
        )}

        {/* Tree Content */}
        {renderTree(null, 0)}

        {/* Root Drop Zone for moving files to root */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverTargetId('root');
          }}
          onDragLeave={() => {
            if (dragOverTargetId === 'root') setDragOverTargetId(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (draggedItem) {
              onMoveItem(draggedItem.id, draggedItem.type, null);
            }
            setDragOverTargetId(null);
            setDraggedItem(null);
          }}
          className={`mt-4 py-3 px-2 rounded-lg border border-dashed text-center text-[10px] transition-colors ${
            dragOverTargetId === 'root'
              ? 'bg-sky-500/15 border-sky-400 text-sky-300'
              : 'border-slate-800 text-slate-600 hover:border-slate-700'
          }`}
        >
          Tarik file/folder ke sini untuk pindah ke Root
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-2.5 border-t border-slate-800/80 bg-slate-950/50 flex items-center justify-between text-[11px] text-slate-400">
        <span className="truncate">
          Aktif: <span className="text-sky-400 font-medium">{activeFile?.name || '-'}</span>
        </span>
        <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-slate-400 shrink-0">
          {fileSystem.files.length} Desain
        </span>
      </div>

      {/* Right-click Context Menu (Rendered to document.body via Portal to prevent CSS containing-block offsets) */}
      {contextMenu &&
        createPortal(
          <div
            ref={contextMenuRef}
            style={{
              left: Math.max(10, Math.min(contextMenu.x, window.innerWidth - 230)),
              top: Math.max(10, Math.min(contextMenu.y, window.innerHeight - 260)),
            }}
            className="fixed z-[9999] min-w-[210px] max-w-[260px] bg-slate-900/95 border border-slate-700/80 rounded-xl shadow-2xl backdrop-blur-xl py-1 text-slate-200 text-xs select-none animate-in fade-in zoom-in-95 duration-100 font-sans"
          >
            {/* FILE CONTEXT MENU */}
            {contextMenu.type === 'file' && contextMenu.targetId && (
              <>
                <div className="px-3 py-1.5 border-b border-slate-800/80 text-[11px] text-slate-400 font-medium flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate font-semibold text-slate-200">
                    {contextMenu.targetName || 'Berkas Desain'}
                  </span>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      if (contextMenu.targetId) onSelectFile(contextMenu.targetId);
                      setContextMenu(null);
                    }}
                    className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-sky-500/15 hover:text-sky-300 text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Eye className="w-3.5 h-3.5 text-sky-400" />
                      <span>Buka Desain</span>
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (contextMenu.targetId) onDuplicateFile(contextMenu.targetId);
                      setContextMenu(null);
                    }}
                    className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-sky-500/15 hover:text-sky-300 text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Duplikat Desain</span>
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (contextMenu.targetId && contextMenu.targetName) {
                        startRenaming(contextMenu.targetId, contextMenu.targetName, 'file');
                      }
                      setContextMenu(null);
                    }}
                    className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-sky-500/15 hover:text-sky-300 text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Ubah Nama</span>
                    </span>
                    <kbd className="text-[10px] text-slate-500 bg-slate-800 px-1 py-0.5 rounded">F2</kbd>
                  </button>
                  <button
                    onClick={() => {
                      if (contextMenu.targetId) onExportFile(contextMenu.targetId);
                      setContextMenu(null);
                    }}
                    className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-sky-500/15 hover:text-sky-300 text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Download className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Ekspor Berkas (.wire)</span>
                    </span>
                  </button>

                  <div className="h-px bg-slate-800/80 my-1" />

                  <button
                    onClick={() => {
                      if (contextMenu.targetId) {
                        if (confirm(`Hapus berkas rangkaian "${contextMenu.targetName || ''}"?`)) {
                          onDeleteFile(contextMenu.targetId);
                        }
                      }
                      setContextMenu(null);
                    }}
                    className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-rose-500/15 text-rose-300/90 hover:text-rose-400 text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Hapus Berkas</span>
                    </span>
                    <kbd className="text-[10px] text-slate-500 bg-slate-800 px-1 py-0.5 rounded">Del</kbd>
                  </button>
                </div>
              </>
            )}

            {/* FOLDER CONTEXT MENU */}
            {contextMenu.type === 'folder' && contextMenu.targetId && (
              <>
                <div className="px-3 py-1.5 border-b border-slate-800/80 text-[11px] text-slate-400 font-medium flex items-center gap-2">
                  <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate font-semibold text-slate-200">
                    {contextMenu.targetName || 'Folder'}
                  </span>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      if (contextMenu.targetId) startCreating('file', contextMenu.targetId);
                      setContextMenu(null);
                    }}
                    className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-sky-500/15 hover:text-sky-300 text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <FilePlus className="w-3.5 h-3.5 text-sky-400" />
                      <span>Berkas Baru di Folder Ini</span>
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (contextMenu.targetId) startCreating('folder', contextMenu.targetId);
                      setContextMenu(null);
                    }}
                    className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-sky-500/15 hover:text-sky-300 text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                      <span>Folder Baru di Folder Ini</span>
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (contextMenu.targetId) onToggleFolder(contextMenu.targetId);
                      setContextMenu(null);
                    }}
                    className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-sky-500/15 hover:text-sky-300 text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>Buka / Tutup Folder</span>
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      if (contextMenu.targetId && contextMenu.targetName) {
                        startRenaming(contextMenu.targetId, contextMenu.targetName, 'folder');
                      }
                      setContextMenu(null);
                    }}
                    className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-sky-500/15 hover:text-sky-300 text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                      <span>Ubah Nama</span>
                    </span>
                    <kbd className="text-[10px] text-slate-500 bg-slate-800 px-1 py-0.5 rounded">F2</kbd>
                  </button>

                  <div className="h-px bg-slate-800/80 my-1" />

                  <button
                    onClick={() => {
                      if (contextMenu.targetId) {
                        if (confirm(`Hapus folder "${contextMenu.targetName || ''}" beserta seluruh isinya?`)) {
                          onDeleteFolder(contextMenu.targetId);
                        }
                      }
                      setContextMenu(null);
                    }}
                    className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-rose-500/15 text-rose-300/90 hover:text-rose-400 text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Hapus Folder</span>
                    </span>
                  </button>
                </div>
              </>
            )}

            {/* ROOT CONTEXT MENU */}
            {contextMenu.type === 'root' && (
              <>
                <div className="px-3 py-1.5 border-b border-slate-800/80 text-[11px] text-slate-400 font-medium flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="truncate font-semibold text-slate-200">Berkas Desain</span>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      startCreating('file', null);
                      setContextMenu(null);
                    }}
                    className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-sky-500/15 hover:text-sky-300 text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <FilePlus className="w-3.5 h-3.5 text-sky-400" />
                      <span>Berkas Desain Baru</span>
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      startCreating('folder', null);
                      setContextMenu(null);
                    }}
                    className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-sky-500/15 hover:text-sky-300 text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                      <span>Folder Baru</span>
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setContextMenu(null);
                    }}
                    className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-sky-500/15 hover:text-sky-300 text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Impor Desain (.wire / .json)</span>
                    </span>
                  </button>

                  <div className="h-px bg-slate-800/80 my-1" />

                  <button
                    onClick={() => {
                      onExpandAll();
                      setContextMenu(null);
                    }}
                    className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-sky-500/15 hover:text-sky-300 text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <FolderOpen className="w-3.5 h-3.5 text-slate-400" />
                      <span>Buka Semua Folder</span>
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      onCollapseAll();
                      setContextMenu(null);
                    }}
                    className="w-full px-3 py-1.5 flex items-center justify-between hover:bg-sky-500/15 hover:text-sky-300 text-left transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <Folder className="w-3.5 h-3.5 text-slate-400" />
                      <span>Tutup Semua Folder</span>
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
};
