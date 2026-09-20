import { useState, useCallback } from 'react';
import { ComponentDefinition } from '../types/circuit';

export interface AppModalsState {
  // Drawer / Sidebar toggles
  isLibraryOpen: boolean;
  isInspectorOpen: boolean;
  // Modal dialogs
  isAuthModalOpen: boolean;
  isBomModalOpen: boolean;
  isWiringTableOpen: boolean;
  isPresetsModalOpen: boolean;
  isStudioOpen: boolean;
  isUserManagementOpen: boolean;
  isExportModalOpen: boolean;
  studioEditDef: ComponentDefinition | null;

  // Actions
  setIsLibraryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setIsInspectorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleLibrary: () => void;
  toggleInspector: () => void;

  openAuthModal: () => void;
  closeAuthModal: () => void;

  openBomModal: () => void;
  closeBomModal: () => void;

  openWiringTable: () => void;
  closeWiringTable: () => void;

  openPresetsModal: () => void;
  closePresetsModal: () => void;

  openStudio: (def?: ComponentDefinition | null) => void;
  closeStudio: () => void;

  openUserManagement: () => void;
  closeUserManagement: () => void;

  openExportModal: () => void;
  closeExportModal: () => void;

  closeAllModals: () => void;
}

/**
 * Custom hook managing all dialog modals and side drawer visibility states.
 * Keeps App.tsx clean and decoupled from modal plumbing.
 */
export function useAppModals(): AppModalsState {
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isBomModalOpen, setIsBomModalOpen] = useState(false);
  const [isWiringTableOpen, setIsWiringTableOpen] = useState(false);
  const [isPresetsModalOpen, setIsPresetsModalOpen] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [studioEditDef, setStudioEditDef] = useState<ComponentDefinition | null>(null);

  const toggleLibrary = useCallback(() => setIsLibraryOpen((prev) => !prev), []);
  const toggleInspector = useCallback(() => setIsInspectorOpen((prev) => !prev), []);

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), []);
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), []);

  const openBomModal = useCallback(() => setIsBomModalOpen(true), []);
  const closeBomModal = useCallback(() => setIsBomModalOpen(false), []);

  const openWiringTable = useCallback(() => setIsWiringTableOpen(true), []);
  const closeWiringTable = useCallback(() => setIsWiringTableOpen(false), []);

  const openPresetsModal = useCallback(() => setIsPresetsModalOpen(true), []);
  const closePresetsModal = useCallback(() => setIsPresetsModalOpen(false), []);

  const openStudio = useCallback((def: ComponentDefinition | null = null) => {
    setStudioEditDef(def);
    setIsStudioOpen(true);
  }, []);
  const closeStudio = useCallback(() => {
    setIsStudioOpen(false);
    setStudioEditDef(null);
  }, []);

  const openUserManagement = useCallback(() => setIsUserManagementOpen(true), []);
  const closeUserManagement = useCallback(() => setIsUserManagementOpen(false), []);

  const openExportModal = useCallback(() => setIsExportModalOpen(true), []);
  const closeExportModal = useCallback(() => setIsExportModalOpen(false), []);

  const closeAllModals = useCallback(() => {
    setIsAuthModalOpen(false);
    setIsBomModalOpen(false);
    setIsWiringTableOpen(false);
    setIsPresetsModalOpen(false);
    setIsStudioOpen(false);
    setIsUserManagementOpen(false);
    setIsExportModalOpen(false);
    setStudioEditDef(null);
  }, []);

  return {
    isLibraryOpen,
    isInspectorOpen,
    isAuthModalOpen,
    isBomModalOpen,
    isWiringTableOpen,
    isPresetsModalOpen,
    isStudioOpen,
    isUserManagementOpen,
    isExportModalOpen,
    studioEditDef,
    setIsLibraryOpen,
    setIsInspectorOpen,
    toggleLibrary,
    toggleInspector,
    openAuthModal,
    closeAuthModal,
    openBomModal,
    closeBomModal,
    openWiringTable,
    closeWiringTable,
    openPresetsModal,
    closePresetsModal,
    openStudio,
    closeStudio,
    openUserManagement,
    closeUserManagement,
    openExportModal,
    closeExportModal,
    closeAllModals,
  };
}
