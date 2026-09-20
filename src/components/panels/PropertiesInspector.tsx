import React from 'react';
import { CircuitComponent, Wire } from '../../types/circuit';
import { MultiSelectionSection } from './inspector/MultiSelectionSection';
import { ComponentPropertiesSection } from './inspector/ComponentPropertiesSection';
import { WirePropertiesSection } from './inspector/WirePropertiesSection';
import { DefaultOverviewSection } from './inspector/DefaultOverviewSection';

export interface PropertiesInspectorProps {
  selectedComponent: CircuitComponent | null;
  selectedComponentIds?: string[];
  selectedWire: Wire | null;
  allComponents: CircuitComponent[];
  allWires: Wire[];
  snapGrid: boolean;
  onToggleSnapGrid: () => void;
  onCenterCanvas?: () => void;
  onOpenWiringTable?: () => void;
  onUpdateComponent: (id: string, updates: Partial<CircuitComponent>) => void;
  onDeleteComponent: (id: string) => void;
  onDuplicateComponent?: (id: string) => void;
  onToggleLock?: (ids: string[]) => void;
  onRotateComponents?: (ids: string[]) => void;
  onDuplicateComponents?: (ids: string[]) => void;
  onDeleteComponents?: (ids: string[]) => void;
  onUpdateWire: (id: string, updates: Partial<Wire>) => void;
  onAddMultipleWires?: (wires: Omit<Wire, 'id'>[]) => void;
  onDeleteWire: (id: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

/**
 * PropertiesInspector - Coordinator component for the right sidebar inspector.
 * Delegates rendering to specialized sub-panels:
 * - MultiSelectionSection: Group actions & Smart Bus Auto-Wiring
 * - ComponentPropertiesSection: Single component settings & live interactive testing
 * - WirePropertiesSection: Marking tube config, routing styles, wire coloring
 * - DefaultOverviewSection: Project stats, live circuit health, quick navigation guide
 */
export const PropertiesInspector: React.FC<PropertiesInspectorProps> = ({
  selectedComponent,
  selectedComponentIds = [],
  selectedWire,
  allComponents,
  allWires,
  snapGrid,
  onToggleSnapGrid,
  onCenterCanvas,
  onOpenWiringTable,
  onUpdateComponent,
  onDeleteComponent,
  onDuplicateComponent,
  onToggleLock,
  onRotateComponents,
  onDuplicateComponents,
  onDeleteComponents,
  onUpdateWire,
  onAddMultipleWires,
  onDeleteWire,
  isOpen,
}) => {
  if (!isOpen) return null;

  // 1. Multi-Component Selection Mode
  if (selectedComponentIds.length > 1) {
    return (
      <MultiSelectionSection
        selectedComponentIds={selectedComponentIds}
        allComponents={allComponents}
        allWires={allWires}
        onToggleLock={onToggleLock}
        onDuplicateComponents={onDuplicateComponents}
        onDeleteComponents={onDeleteComponents}
        onRotateComponents={onRotateComponents}
        onAddMultipleWires={onAddMultipleWires}
      />
    );
  }

  // 2. Single Component Selection Mode
  if (selectedComponent) {
    return (
      <ComponentPropertiesSection
        selectedComponent={selectedComponent}
        allComponents={allComponents}
        allWires={allWires}
        onUpdateComponent={onUpdateComponent}
        onDeleteComponent={onDeleteComponent}
        onDuplicateComponent={onDuplicateComponent}
        onToggleLock={onToggleLock}
        onDeleteWire={onDeleteWire}
      />
    );
  }

  // 3. Single Wire Selection Mode
  if (selectedWire) {
    return (
      <WirePropertiesSection
        selectedWire={selectedWire}
        allComponents={allComponents}
        onUpdateWire={onUpdateWire}
        onDeleteWire={onDeleteWire}
      />
    );
  }

  // 4. Default Project Overview (No Selection)
  return (
    <DefaultOverviewSection
      allComponents={allComponents}
      allWires={allWires}
      snapGrid={snapGrid}
      onToggleSnapGrid={onToggleSnapGrid}
      onCenterCanvas={onCenterCanvas}
      onOpenWiringTable={onOpenWiringTable}
    />
  );
};
