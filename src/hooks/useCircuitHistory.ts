import { useState, useCallback, useRef } from 'react';
import { CircuitComponent, Wire } from '../types/circuit';

export interface HistoryState {
  components: CircuitComponent[];
  wires: Wire[];
}

const MAX_HISTORY = 50;

// Deep clone state to guarantee immutability
function cloneState(s: HistoryState): HistoryState {
  return {
    components: s.components.map((c) => ({
      ...c,
      customProps: { ...(c.customProps || {}) },
    })),
    wires: s.wires.map((w) => ({
      ...w,
      waypoints: w.waypoints ? w.waypoints.map((p) => ({ ...p })) : undefined,
    })),
  };
}

export function useCircuitHistory(initialState: HistoryState) {
  const [past, setPast] = useState<HistoryState[]>([]);
  const [present, setPresent] = useState<HistoryState>(() => cloneState(initialState));
  const [future, setFuture] = useState<HistoryState[]>([]);

  const presentRef = useRef(present);
  presentRef.current = present;

  const pastRef = useRef(past);
  pastRef.current = past;

  const futureRef = useRef(future);
  futureRef.current = future;

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  // Commit a new state snapshot
  const commit = useCallback(
    (
      newStateOrUpdater: HistoryState | ((prev: HistoryState) => HistoryState),
      skipHistory = false
    ) => {
      const current = presentRef.current;
      const nextRaw =
        typeof newStateOrUpdater === 'function'
          ? newStateOrUpdater(current)
          : newStateOrUpdater;

      // Fast-path during interactive dragging: bypass expensive JSON serialization
      if (skipHistory) {
        setPresent(nextRaw);
        return;
      }

      const next = cloneState(nextRaw);

      // Save to undo history stack
      setPast((prev) => {
        const updated = [...prev, cloneState(current)];
        if (updated.length > MAX_HISTORY) {
          return updated.slice(updated.length - MAX_HISTORY);
        }
        return updated;
      });
      setFuture([]);
      setPresent(next);
    },
    []
  );

  // Undo previous action (Ctrl+Z)
  const undo = useCallback((): HistoryState | null => {
    if (pastRef.current.length === 0) return null;

    const previous = pastRef.current[pastRef.current.length - 1]!;
    const newPast = pastRef.current.slice(0, -1);

    setPast(newPast);
    setFuture((prev) => [cloneState(presentRef.current), ...prev]);
    setPresent(cloneState(previous));

    return previous;
  }, []);

  // Redo undone action (Ctrl+Y / Ctrl+Shift+Z)
  const redo = useCallback((): HistoryState | null => {
    if (futureRef.current.length === 0) return null;

    const next = futureRef.current[0]!;
    const newFuture = futureRef.current.slice(1);

    setPast((prev) => [...prev, cloneState(presentRef.current)]);
    setFuture(newFuture);
    setPresent(cloneState(next));

    return next;
  }, []);

  // Reset entire history (e.g. initial load or project reload)
  const resetHistory = useCallback((state: HistoryState) => {
    setPast([]);
    setFuture([]);
    setPresent(cloneState(state));
  }, []);

  return {
    present,
    components: present.components,
    wires: present.wires,
    commit,
    undo,
    redo,
    resetHistory,
    canUndo,
    canRedo,
    pastCount: past.length,
    futureCount: future.length,
  };
}
