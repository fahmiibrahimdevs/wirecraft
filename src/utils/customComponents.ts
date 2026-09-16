import { ComponentDefinition } from '../types/circuit';
import { COMPONENT_DEFINITIONS } from '../constants/components';

const STORAGE_KEY = 'wirecraft_custom_components_v1';
export const CUSTOM_COMPONENTS_EVENT = 'wirecraft_custom_components_updated';

export interface CustomComponentEntry {
  definition: ComponentDefinition;
  imageBase64?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory runtime cache for custom components
let memoryCache: Record<string, CustomComponentEntry> = {};
let isServerLoaded = false;

/**
 * Load saved components from localStorage into memory cache as initial state
 */
function initFromLocalStorage(): void {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      memoryCache = JSON.parse(raw);
    }
  } catch (err) {
    console.error('Failed to parse custom components from localStorage:', err);
  }
}

initFromLocalStorage();

/**
 * Fetch permanent custom components from server API / public file
 */
export async function loadServerCustomComponents(): Promise<Record<string, CustomComponentEntry>> {
  try {
    // 1. Try server API first
    let res = await fetch('/api/custom-components').catch(() => null);

    // 2. If API is not available (e.g. static CDN host), try static public JSON file
    if (!res || !res.ok) {
      res = await fetch('/custom-components/components.json').catch(() => null);
    }

    if (res && res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        // Merge server data with local cache
        memoryCache = { ...memoryCache, ...data };
        isServerLoaded = true;

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache));
          } catch {}
          window.dispatchEvent(new Event(CUSTOM_COMPONENTS_EVENT));
        }
        return memoryCache;
      }
    }
  } catch (err) {
    console.warn('Server custom components fetch skipped, using local cache:', err);
  }
  return memoryCache;
}

// Auto-trigger background server load on start
if (typeof window !== 'undefined') {
  loadServerCustomComponents();
}

/**
 * Get all custom components from in-memory cache and localStorage
 */
export function getCustomComponents(): Record<string, CustomComponentEntry> {
  if (!isServerLoaded && typeof window !== 'undefined') {
    initFromLocalStorage();
  }
  return memoryCache;
}

/**
 * Pure Lossless Vector 90° Clockwise Rotation for SVG data URLs and strings.
 * Preserves infinite crisp vector quality without ever rasterizing to low-res canvas pixels.
 */
export function rotateSvgDataUrl(svgDataUrlOrString: string): string {
  try {
    let svgText = '';
    if (svgDataUrlOrString.startsWith('data:image/svg+xml;base64,')) {
      const base64 = svgDataUrlOrString.split(';base64,')[1];
      svgText = atob(base64);
    } else if (svgDataUrlOrString.startsWith('data:image/svg+xml')) {
      const encoded = svgDataUrlOrString.replace(/^data:image\/svg\+xml;?(charset=utf-8)?,?/, '');
      svgText = decodeURIComponent(encoded);
    } else {
      svgText = svgDataUrlOrString;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgText, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (!svgEl) return svgDataUrlOrString;

    // 1. Get original viewBox or calculate from width/height
    let minX = 0;
    let minY = 0;
    let width = 0;
    let height = 0;

    const viewBoxAttr = svgEl.getAttribute('viewBox');
    if (viewBoxAttr) {
      const parts = viewBoxAttr.trim().split(/[\s,]+/).map(Number);
      if (parts.length === 4 && !parts.some(isNaN)) {
        minX = parts[0];
        minY = parts[1];
        width = parts[2];
        height = parts[3];
      }
    }

    if (width === 0 || height === 0) {
      const wAttr = svgEl.getAttribute('width') || '200';
      const hAttr = svgEl.getAttribute('height') || '200';
      width = parseFloat(wAttr) || 200;
      height = parseFloat(hAttr) || 200;
    }

    // 2. Compute rotated geometry (90 deg clockwise around origin)
    // Original (x, y) -> (-y, x) -> translated by (minY + height, -minX)
    const newVbW = height;
    const newVbH = width;
    const newViewBox = `0 0 ${newVbW} ${newVbH}`;

    svgEl.setAttribute('viewBox', newViewBox);
    svgEl.setAttribute('width', `${newVbW}`);
    svgEl.setAttribute('height', `${newVbH}`);

    // 3. Wrap all existing child elements into a single rotated group
    const wrapper = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
    wrapper.setAttribute('transform', `translate(${minY + height}, ${-minX}) rotate(90)`);

    while (svgEl.firstChild) {
      wrapper.appendChild(svgEl.firstChild);
    }
    svgEl.appendChild(wrapper);

    // 4. Serialize back to clean data URL
    const serializer = new XMLSerializer();
    const rotatedSvg = serializer.serializeToString(doc);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(rotatedSvg)}`;
  } catch (err) {
    console.error('Failed to rotate SVG in vector mode:', err);
    return svgDataUrlOrString;
  }
}

/**
 * Compress / optimize large base64 images
 */
export function optimizeImageForStorage(dataUrl: string, maxDimension: number = 800): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image')) {
    return Promise.resolve(dataUrl);
  }

  // Pure SVG vectors should NEVER be rasterized to canvas
  if (dataUrl.startsWith('data:image/svg')) {
    return Promise.resolve(dataUrl);
  }

  return new Promise((resolve) => {
    if (dataUrl.length < 200000) {
      resolve(dataUrl);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      let { naturalWidth: w, naturalHeight: h } = img;
      if (w <= maxDimension && h <= maxDimension && dataUrl.length < 300000) {
        resolve(dataUrl);
        return;
      }

      if (w > h) {
        if (w > maxDimension) {
          h = Math.round((h * maxDimension) / w);
          w = maxDimension;
        }
      } else {
        if (h > maxDimension) {
          w = Math.round((w * maxDimension) / h);
          h = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.drawImage(img, 0, 0, w, h);
      const optimized = canvas.toDataURL('image/png');
      resolve(optimized);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/**
 * Save or update a custom component permanently to server and local cache
 */
export function saveCustomComponent(
  definition: ComponentDefinition,
  imageBase64?: string
): { success: boolean; error?: string } {
  try {
    const existing = memoryCache[definition.type];
    const now = new Date().toISOString();
    const safeId = definition.type.replace(/[^a-zA-Z0-9_-]/g, '_');
    const imagePublicPath = `/components/${safeId}.png`;

    const updatedDef: ComponentDefinition = {
      ...definition,
      category: definition.category || 'sensors',
      isCustom: true,
      imageUrl: imageBase64?.startsWith('data:') ? imagePublicPath : (definition as any).imageUrl || imagePublicPath,
    };

    const entry: CustomComponentEntry = {
      definition: updatedDef,
      imageBase64: imageBase64 || existing?.imageBase64,
      imageUrl: updatedDef.imageUrl,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    memoryCache[definition.type] = entry;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache));
      } catch (quotaErr) {
        console.warn('LocalStorage quota limit reached:', quotaErr);
      }
      window.dispatchEvent(new Event(CUSTOM_COMPONENTS_EVENT));

      // Asynchronously persist permanently to server disk
      fetch('/api/custom-components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          definition: updatedDef,
          imageBase64: imageBase64,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && data?.imageUrl) {
            memoryCache[definition.type] = {
              ...memoryCache[definition.type]!,
              definition: { ...updatedDef, imageUrl: data.imageUrl },
              imageUrl: data.imageUrl,
            };
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache));
            } catch {}
            window.dispatchEvent(new Event(CUSTOM_COMPONENTS_EVENT));
          }
        })
        .catch((err) => {
          console.warn('Permanent server save background notice:', err);
        });
    }

    return { success: true };
  } catch (err: any) {
    console.error('Failed to save custom component:', err);
    return { success: false, error: err?.message || 'Gagal menyimpan komponen' };
  }
}

/**
 * Delete a custom component permanently from server and local cache
 */
export function deleteCustomComponent(typeId: string): void {
  try {
    if (memoryCache[typeId]) {
      delete memoryCache[typeId];
    }
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache));
      } catch {}
      window.dispatchEvent(new Event(CUSTOM_COMPONENTS_EVENT));

      // Asynchronously delete from server disk
      fetch(`/api/custom-components?type=${encodeURIComponent(typeId)}`, {
        method: 'DELETE',
      }).catch((err) => console.warn('Server delete error:', err));
    }
  } catch (err) {
    console.error('Failed to delete custom component:', err);
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
      imageUrl: entry.definition.imageUrl || entry.imageUrl || entry.imageBase64,
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
      saveCustomComponent(item.definition, item.imageBase64 || item.imageUrl);
      return true;
    }
  } catch (err) {
    console.error('Failed to import component JSON:', err);
  }
  return false;
}

