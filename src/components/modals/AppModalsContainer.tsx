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
      {/* BOM (Bill of Materials) Modal */}
      <BomModal
        isOpen={modals.isBomModalOpen}
        onClose={modals.closeBomModal}
        components={components}
        wires={wires}
      />

      {/* Hardware Wiring Table Modal */}
      <WiringTableModal
        isOpen={modals.isWiringTableOpen}
        onClose={modals.closeWiringTable}
        components={components}
        wires={wires}
        allDefs={allDefs}
        onHighlightComponent={onHighlightComponent}
        onHighlightWire={onHighlightWire}
      />

      {/* Presets Modal */}
      <PresetsModal
        isOpen={modals.isPresetsModalOpen}
        onClose={modals.closePresetsModal}
        onLoadPreset={onLoadPreset}
      />

      {/* Component Studio (Admin Mode) Modal */}
      {isAdmin && (
        <ComponentStudioModal
          isOpen={modals.isStudioOpen}
          onClose={modals.closeStudio}
          initialDefinition={modals.studioEditDef}
          onComponentSaved={(typeId) => {
            onAddComponent(typeId);
          }}
        />
      )}

      {/* User Management (Admin Mode) Modal */}
      {isAdmin && (
        <UserManagementModal
          isOpen={modals.isUserManagementOpen}
          onClose={modals.closeUserManagement}
        />
      )}

      {/* HD Schema & Diagram Export Modal */}
      <ExportModal
        isOpen={modals.isExportModalOpen}
        onClose={modals.closeExportModal}
        projectName={projectName}
        components={components}
        wires={wires}
      />

      {/* Auth Modal (Login / Register) */}
      <AuthModal
        isOpen={modals.isAuthModalOpen}
        onClose={modals.closeAuthModal}
      />
    </>
  );
};
