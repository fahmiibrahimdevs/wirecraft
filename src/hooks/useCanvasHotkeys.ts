import { useEffect } from 'react';

interface UseCanvasHotkeysProps {
  isModalOpen: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  selectedComponentIds: string[];
  selectedWireId: string | null;
  onSelectAll: () => void;
  onDuplicateComponents: () => void;
  onToggleLock: (ids: string[]) => void;
  onRotateComponents: () => void;
  onDeleteComponents: () => void;
  onDeleteWire: (wireId: string) => void;
  onToggleWireMarkers: () => void;
}

/**
 * Custom hook handling global canvas keyboard shortcuts:
 * - Undo (Ctrl+Z), Redo (Ctrl+Y / Ctrl+Shift+Z)
 * - Select All (Ctrl+A)
 * - Duplicate (Ctrl+D)
 * - Rotate (R / Space)
 * - Lock/Unlock (L)
 * - Toggle Markers (M)
 * - Delete (Delete / Backspace)
 */
export function useCanvasHotkeys({
  isModalOpen,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  selectedComponentIds,
  selectedWireId,
  onSelectAll,
  onDuplicateComponents,
  onToggleLock,
  onRotateComponents,
  onDeleteComponents,
  onDeleteWire,
  onToggleWireMarkers,
}: UseCanvasHotkeysProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing inside an input / textarea / select
      const activeTag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (['input', 'textarea', 'select'].includes(activeTag)) {
        return;
      }

      // Ignore canvas shortcuts if a modal dialog is actively open
      if (isModalOpen) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // 1. Undo / Redo
      if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) onRedo();
        } else {
          if (canUndo) onUndo();
        }
        return;
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (canRedo) onRedo();
        return;
      }

      // 2. Select All (Ctrl+A / Cmd+A)
      if (isCmdOrCtrl && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        onSelectAll();
        return;
      }

      // 3. Duplicate (Ctrl+D / Cmd+D)
      if (isCmdOrCtrl && e.key.toLowerCase() === 'd') {
        if (selectedComponentIds.length > 0) {
          e.preventDefault();
          onDuplicateComponents();
        }
        return;
      }

      // 4. Lock / Unlock (L)
      if (!isCmdOrCtrl && !e.altKey && (e.key === 'l' || e.key === 'L')) {
        if (selectedComponentIds.length > 0) {
          e.preventDefault();
          onToggleLock(selectedComponentIds);
        }
        return;
      }

      // 5. Toggle Wire Marking Tubes (M)
      if (!isCmdOrCtrl && !e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        onToggleWireMarkers();
        return;
      }

      // 6. Rotate (R / Space)
      if (
        !isCmdOrCtrl &&
        !e.altKey &&
        (e.key === 'r' || e.key === 'R' || e.key === ' ' || e.code === 'Space')
      ) {
        if (selectedComponentIds.length > 0) {
          e.preventDefault();
          onRotateComponents();
        }
        return;
      }

      // 7. Delete (Delete / Backspace)
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedComponentIds.length > 0) {
          e.preventDefault();
          onDeleteComponents();
        } else if (selectedWireId) {
          e.preventDefault();
          onDeleteWire(selectedWireId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isModalOpen,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    selectedComponentIds,
    selectedWireId,
    onSelectAll,
    onDuplicateComponents,
    onToggleLock,
    onRotateComponents,
    onDeleteComponents,
    onDeleteWire,
    onToggleWireMarkers,
  ]);
}
