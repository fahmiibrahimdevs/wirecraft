import React from 'react';
import { CircuitComponent, ComponentDefinition, Wire } from '../../types/circuit';
import { AppModalsState } from '../../hooks/useAppModals';
import { BomModal } from './BomModal';
import { WiringTableModal } from './WiringTableModal';
import { PresetsModal } from './PresetsModal';
import { ComponentStudioModal } from './ComponentStudioModal';
import { UserManagementModal } from './UserManagementModal';
import { ExportModal } from './ExportModal';
import { AuthModal } from './AuthModal';

interface AppModalsContainerProps {
  modals: AppModalsState;
  components: CircuitComponent[];
  wires: Wire[];
  allDefs: Record<string, ComponentDefinition>;
  projectName: string;
  isAdmin: boolean;
  onLoadPreset: (components: CircuitComponent[], wires: Wire[]) => void;
  onAddComponent: (type: string) => void;
  onHighlightComponent: (compId: string | null) => void;
  onHighlightWire: (wireId: string | null) => void;
}

/**
 * Clean container component for rendering all application modals.
 * Decouples modal render JSX from the main App viewport layout.
 */
export const AppModalsContainer: React.FC<AppModalsContainerProps> = ({
  modals,
  components,
  wires,
  allDefs,
  projectName,
  isAdmin,
  onLoadPreset,
  onAddComponent,
  onHighlightComponent,
  onHighlightWire,
}) => {
  return (
    <>
      <BomModal isOpen={modals.isBomModalOpen} onClose={modals.closeBomModal} components={components} wires={wires} />
      <WiringTableModal isOpen={modals.isWiringTableOpen} onClose={modals.closeWiringTable} components={components} wires={wires} allDefs={allDefs} onHighlightComponent={onHighlightComponent} onHighlightWire={onHighlightWire} />
      <PresetsModal isOpen={modals.isPresetsModalOpen} onClose={modals.closePresetsModal} onLoadPreset={onLoadPreset} />
      {isAdmin && <ComponentStudioModal isOpen={modals.isStudioOpen} onClose={modals.closeStudio} initialDefinition={modals.studioEditDef} onComponentSaved={(typeId) => onAddComponent(typeId)} />}
      {isAdmin && <UserManagementModal isOpen={modals.isUserManagementOpen} onClose={modals.closeUserManagement} />}
      <ExportModal isOpen={modals.isExportModalOpen} onClose={modals.closeExportModal} projectName={projectName} components={components} wires={wires} />
      <AuthModal isOpen={modals.isAuthModalOpen} onClose={modals.closeAuthModal} />
    </>
  );
};
