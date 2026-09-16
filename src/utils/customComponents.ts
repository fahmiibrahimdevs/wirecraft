import { ComponentDefinition } from '../types/circuit';
import { COMPONENT_DEFINITIONS } from '../constants/components';

const STORAGE_KEY = 'wirecraft_custom_components_v1';
export const CUSTOM_COMPONENTS_EVENT = 'wirecraft_custom_components_updated';

export interface CustomComponentEntry {
  definition: ComponentDefinition;
  imageBase64?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get all user-created custom components from localStorage
 */
export function getCustomComponents(): Record<string, CustomComponentEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse custom components from localStorage:', err);
    return {};
  }
}

/**
 * Save or update a custom component in localStorage
 */
export function saveCustomComponent(
  definition: ComponentDefinition,
  imageBase64?: string
): void {
  try {
    const current = getCustomComponents();
    const existing = current[definition.type];
    const now = new Date().toISOString();

    current[definition.type] = {
      definition: {
        ...definition,
        category: definition.category || 'sensors',
      },
      imageBase64: imageBase64 || existing?.imageBase64 || (definition as any).imageUrl,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    window.dispatchEvent(new Event(CUSTOM_COMPONENTS_EVENT));
  } catch (err) {
    console.error('Failed to save custom component to localStorage:', err);
  }
}

/**
 * Delete a custom component from localStorage
 */
export function deleteCustomComponent(typeId: string): void {
  try {
    const current = getCustomComponents();
    if (current[typeId]) {
      delete current[typeId];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      window.dispatchEvent(new Event(CUSTOM_COMPONENTS_EVENT));
    }
  } catch (err) {
    console.error('Failed to delete custom component from localStorage:', err);
  }
}

/**
 * Get unified definitions combining built-in COMPONENT_DEFINITIONS and custom ones
 */
export function getAllComponentDefinitions(): Record<string, ComponentDefinition> {
  const custom = getCustomComponents();
  const merged: Record<string, ComponentDefinition> = { ...COMPONENT_DEFINITIONS };

  Object.values(custom).forEach((entry) => {
    merged[entry.definition.type] = {
      ...entry.definition,
      // If imageBase64 exists, attach it as property
      imageUrl: entry.imageBase64 || (entry.definition as any).imageUrl,
    } as any;
  });

  return merged;
}

/**
 * Generate clean TypeScript definition code for copying into components.ts
 */
export function generateTypeScriptCode(definition: ComponentDefinition, imageFileName?: string): string {
  const pinsFormatted = definition.pins
    .map(
      (p) =>
        `      { id: '${p.id}', name: '${p.name}', x: ${p.x.toFixed(1)}, y: ${p.y.toFixed(1)}, type: '${p.type}'${
          p.description ? `, description: '${p.description.replace(/'/g, "\\'")}'` : ''
        } },`
    )
    .join('\n');

  return `  // Type definition in src/types/circuit.ts:
  // | '${definition.type}'

  // Component definition in src/constants/components.ts:
  '${definition.type}': {
    type: '${definition.type}',
    name: '${definition.name.replace(/'/g, "\\'")}',
    category: '${definition.category}',
    description: '${definition.description.replace(/'/g, "\\'")}',
    width: ${definition.width.toFixed(1)},
    height: ${definition.height.toFixed(1)},
    icon: '${definition.icon || 'Cpu'}',${
      definition.imageOffset && (definition.imageOffset.x !== 0 || definition.imageOffset.y !== 0)
        ? `\n    imageOffset: { x: ${definition.imageOffset.x.toFixed(1)}, y: ${definition.imageOffset.y.toFixed(1)} },`
        : ''
    }
    pins: [
${pinsFormatted}
    ],
  },

  // ComponentSvg renderer case in src/components/canvas/ComponentSvg.tsx:
  case '${definition.type}':
    return (
      <image
        href="${imageFileName ? `/components/${imageFileName}` : `/components/${definition.type.replace(/-/g, '_')}.png`}"
        x="${definition.imageOffset?.x ? definition.imageOffset.x.toFixed(1) : '0'}"
        y="${definition.imageOffset?.y ? definition.imageOffset.y.toFixed(1) : '0'}"
        width={width}
        height={height}
        preserveAspectRatio="none"
      />
    );`;
}

/**
 * Export a component as a JSON file
 */
export function exportComponentJson(typeId: string): void {
  const custom = getCustomComponents();
  const item = custom[typeId];
  if (!item) return;

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(item, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `${typeId}.wirecraft.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Import a component from JSON string
 */
export function importComponentJson(jsonStr: string): boolean {
  try {
    const item = JSON.parse(jsonStr) as CustomComponentEntry;
    if (item?.definition?.type) {
      saveCustomComponent(item.definition, item.imageBase64);
      return true;
    }
  } catch (err) {
    console.error('Failed to import component JSON:', err);
  }
  return false;
}
