import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Pin, PinType, ComponentDefinition } from '../../types/circuit';
import {
  saveCustomComponent,
  optimizeImageForStorage,
  getCustomComponents,
  generateTypeScriptCode,
  exportComponentJson,
  importComponentJson,
  rotateSvgDataUrl,
} from '../../utils/customComponents';
import {
  Upload,
  Sparkles,
  Wand2,
  Crop,
  Grid,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  FolderOpen,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  RotateCw,
  Layers,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Cpu,
  Info,
  Sliders,
  Move,
  ShieldCheck,
  Globe,
  Undo,
  Image as ImageIcon,
  AlignCenter,
  Compass,
  Box,
  Tag,
  Magnet,
  Undo2,
  Redo2,
  Hand,
} from 'lucide-react';

interface ComponentStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComponentSaved?: (typeId: string) => void;
  initialDefinition?: ComponentDefinition | null;
}

const PIN_TYPES: { type: PinType; label: string; color: string }[] = [
  { type: 'power', label: 'Power / VCC', color: '#ef4444' },
  { type: 'ground', label: 'Ground / GND', color: '#1e293b' },
  { type: 'digital', label: 'Digital I/O', color: '#38bdf8' },
  { type: 'analog', label: 'Analog Input', color: '#10b981' },
  { type: 'pwm', label: 'PWM Output', color: '#f97316' },
  { type: 'i2c', label: 'I2C (SDA/SCL)', color: '#a855f7' },
  { type: 'spi', label: 'SPI Bus', color: '#eab308' },
  { type: 'uart', label: 'UART (RX/TX)', color: '#06b6d4' },
  { type: 'passive', label: 'Passive / Terminal', color: '#94a3b8' },
  { type: 'generic', label: 'Generic Pin', color: '#64748b' },
];

const CATEGORIES = [
  { id: 'sensors', label: 'Sensor' },
  { id: 'microcontrollers', label: 'Mikrokontroler' },
  { id: 'power', label: 'Daya / Power' },
  { id: 'outputs', label: 'Output & Aktuator' },
  { id: 'displays', label: 'Layar / Display' },
  { id: 'passives', label: 'Pasif' },
  { id: 'prototyping', label: 'Breadboard / Prototyping' },
  { id: 'custom', label: 'Custom' },
];

// Physical to Pixel Conversion Helpers (Standard 2.54mm Breadboard Pitch = 17.0px)
export const MM_PER_PX = 2.54 / 17.0; // ~0.14941176 mm per px
export const PX_PER_MM = 17.0 / 2.54; // ~6.69291339 px per mm

export const pxToMm = (px: number, decimals = 1): number => {
  return Number((px * MM_PER_PX).toFixed(decimals));
};

export const mmToPx = (mm: number, decimals = 1): number => {
  return Number((mm * PX_PER_MM).toFixed(decimals));
};

export interface CalloutGeometry {
  dir: 'top' | 'bottom' | 'left' | 'right';
  p0: { x: number; y: number };
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  badgeX: number;
  badgeY: number;
  badgeW: number;
  badgeH: number;
}

export const getPinCalloutGeometry = (
  pin: { x: number; y: number; name: string },
  imageOffset: { x: number; y: number },
  compWidth: number,
  compHeight: number
): CalloutGeometry => {
  const centerX = imageOffset.x + compWidth / 2;
  const centerY = imageOffset.y + compHeight / 2;

  // Calculate distances to 4 bounding box edges of the component
  const dTop = Math.abs(pin.y - imageOffset.y);
  const dBottom = Math.abs(imageOffset.y + compHeight - pin.y);
  const dLeft = Math.abs(pin.x - imageOffset.x);
  const dRight = Math.abs(imageOffset.x + compWidth - pin.x);

  const minDist = Math.min(dTop, dBottom, dLeft, dRight);
  let dir: 'top' | 'bottom' | 'left' | 'right' = 'top';
  if (minDist === dBottom) dir = 'bottom';
  else if (minDist === dLeft) dir = 'left';
  else if (minDist === dRight) dir = 'right';
  else dir = 'top';

  const isRightHalf = pin.x >= centerX;
  const isBottomHalf = pin.y >= centerY;

  const charWidth = 6.8;
  const padX = 7;
  const badgeW = Math.max(30, Math.round(pin.name.length * charWidth + padX * 2 + 6));
  const badgeH = 15;

  let p0 = { x: 0, y: 0 };
  let p1 = { x: 0, y: 0 };
  let p2 = { x: 0, y: 0 };
  let badgeX = 0;
  let badgeY = 0;

  if (dir === 'top') {
    p0 = { x: 0, y: -5.5 };
    const sx = isRightHalf ? 1 : -1;
    p1 = { x: sx * 8, y: -16 };
    p2 = { x: sx * 16, y: -16 };
    badgeX = p2.x + (sx * badgeW) / 2;
    badgeY = -16;
  } else if (dir === 'bottom') {
    p0 = { x: 0, y: 5.5 };
    const sx = isRightHalf ? 1 : -1;
    p1 = { x: sx * 8, y: 16 };
    p2 = { x: sx * 16, y: 16 };
    badgeX = p2.x + (sx * badgeW) / 2;
    badgeY = 16;
  } else if (dir === 'left') {
    p0 = { x: -5.5, y: 0 };
    const sy = isBottomHalf ? 1 : -1;
    p1 = { x: -12, y: sy * 7 };
    p2 = { x: -18, y: sy * 7 };
    badgeX = p2.x - badgeW / 2;
    badgeY = p2.y;
  } else {
    // right
    p0 = { x: 5.5, y: 0 };
    const sy = isBottomHalf ? 1 : -1;
    p1 = { x: 12, y: sy * 7 };
    p2 = { x: 18, y: sy * 7 };
    badgeX = p2.x + badgeW / 2;
    badgeY = p2.y;
  }

  return {
    dir,
    p0,
    p1,
    p2,
    badgeX,
    badgeY,
    badgeW,
    badgeH,
  };
};

export const ComponentStudioModal: React.FC<ComponentStudioModalProps> = ({
  isOpen,
  onClose,
  onComponentSaved,
  initialDefinition,
}) => {
  // Measurement Unit: 'mm' (Physical Millimeters - Default) | 'px' (Canvas Pixels)
  const [unit, setUnit] = useState<'mm' | 'px'>('mm');

  // Image state (raw original preserved for non-destructive re-runs)
  const [rawImageDataUrl, setRawImageDataUrl] = useState<string>('');
  const [imageDataUrl, setImageDataUrl] = useState<string>('');
  const [originalImageSize, setOriginalImageSize] = useState<{ width: number; height: number }>({
    width: 200,
    height: 200,
  });
  const [bgTolerance, setBgTolerance] = useState<number>(20);
  const [bgAlgorithm, setBgAlgorithm] = useState<'flood-fill' | 'global'>('flood-fill');
  const [isProcessingBg, setIsProcessingBg] = useState<boolean>(false);

  // Component metadata
  const [typeId, setTypeId] = useState<string>('custom-module-1');
  const [name, setName] = useState<string>('Modul Kustom Baru');
  const [category, setCategory] = useState<string>('sensors');
  const [description, setDescription] = useState<string>('Modul kustom terkalibrasi');
  const [icon, setIcon] = useState<string>('Cpu');

  // Dimension & Image Offset state (WireCraft logical units)
  const [width, setWidth] = useState<number>(200);
  const [height, setHeight] = useState<number>(150);
  const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(true);
  const [imageOffset, setImageOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Pins state & Hover state
  const [pins, setPins] = useState<Pin[]>([]);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
  const [alwaysShowLabels, setAlwaysShowLabels] = useState<boolean>(false);

  // Canvas / Viewport state
  const [zoom, setZoom] = useState<number>(1.8);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [startPanPos, setStartPanPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);
  const hasMovedPanRef = useRef<boolean>(false);

  // Breadboard overlay & snapping helpers
  const [showBreadboard, setShowBreadboard] = useState<boolean>(true);
  const [breadboardType, setBreadboardType] = useState<'half' | 'mini' | 'grid'>('half');
  const [breadboardOpacity, setBreadboardOpacity] = useState<number>(0.7);
  const [snapToBreadboard, setSnapToBreadboard] = useState<boolean>(true);
  const [breadboardOffset, setBreadboardOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Tool mode: 'select-pin' | 'drag-image' | 'drag-all' | 'add-pin' | 'pan'
  const [toolMode, setToolMode] = useState<'select-pin' | 'drag-image' | 'drag-all' | 'add-pin' | 'pan'>('select-pin');

  // Dragging states
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);
  const [isDraggingImage, setIsDraggingImage] = useState<boolean>(false);
  const [imageDragStart, setImageDragStart] = useState<{
    mouseX: number;
    mouseY: number;
    startX: number;
    startY: number;
    initialPins: Pin[];
  }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
    initialPins: [],
  });

  // Undo / Redo History Stack
  const [history, setHistory] = useState<{
    width: number;
    height: number;
    pins: Pin[];
    imageOffset: { x: number; y: number };
    imageDataUrl: string;
    rawImageDataUrl: string;
  }[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isUndoRedoActionRef = useRef<boolean>(false);

  // Multi-pin Generator state
  const [genCount, setGenCount] = useState<number>(6);
  const [genPitch, setGenPitch] = useState<number>(17.0);
  const [genOrientation, setGenOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const [genPrefix, setGenPrefix] = useState<string>('p');

  // Feedback states
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Refs
  const canvasRef = useRef<SVGSVGElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // Load initial definition if provided
  useEffect(() => {
    if (initialDefinition) {
      setTypeId(initialDefinition.type);
      setName(initialDefinition.name);
      setCategory(initialDefinition.category || 'sensors');
      setDescription(initialDefinition.description || '');
      setWidth(initialDefinition.width);
      setHeight(initialDefinition.height);
      setPins(initialDefinition.pins || []);
      if (initialDefinition.imageOffset) {
        setImageOffset(initialDefinition.imageOffset);
      }
      if ((initialDefinition as any).imageUrl) {
        setImageDataUrl((initialDefinition as any).imageUrl);
        setRawImageDataUrl((initialDefinition as any).imageUrl);
      }
    }
  }, [initialDefinition, isOpen]);

  // Push snapshot to history stack
  const pushSnapshot = useCallback(
    (override?: {
      width?: number;
      height?: number;
      pins?: Pin[];
      imageOffset?: { x: number; y: number };
      imageDataUrl?: string;
      rawImageDataUrl?: string;
    }) => {
      if (isUndoRedoActionRef.current) return;
      const snap = {
        width: override?.width ?? width,
        height: override?.height ?? height,
        pins: override?.pins ? JSON.parse(JSON.stringify(override.pins)) : JSON.parse(JSON.stringify(pins)),
        imageOffset: override?.imageOffset ? { ...override.imageOffset } : { ...imageOffset },
        imageDataUrl: override?.imageDataUrl !== undefined ? override.imageDataUrl : imageDataUrl,
        rawImageDataUrl: override?.rawImageDataUrl !== undefined ? override.rawImageDataUrl : rawImageDataUrl,
      };
      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        return [...next, snap];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [width, height, pins, imageOffset, imageDataUrl, rawImageDataUrl, historyIndex]
  );

  // Initialize history when modal opens
  useEffect(() => {
    if (isOpen) {
      const initSnap = {
        width: initialDefinition?.width || width || 200,
        height: initialDefinition?.height || height || 150,
        pins: initialDefinition?.pins ? JSON.parse(JSON.stringify(initialDefinition.pins)) : JSON.parse(JSON.stringify(pins)),
        imageOffset: initialDefinition?.imageOffset ? { ...initialDefinition.imageOffset } : { ...imageOffset },
        imageDataUrl: (initialDefinition as any)?.imageUrl || imageDataUrl || '',
        rawImageDataUrl: (initialDefinition as any)?.imageUrl || rawImageDataUrl || '',
      };
      setHistory([initSnap]);
      setHistoryIndex(0);
    }
  }, [isOpen]);

  // Undo Action
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      const snap = history[targetIndex];
      if (snap) {
        isUndoRedoActionRef.current = true;
        setWidth(snap.width);
        setHeight(snap.height);
        setPins(JSON.parse(JSON.stringify(snap.pins)));
        setImageOffset({ ...snap.imageOffset });
        setImageDataUrl(snap.imageDataUrl || '');
        setRawImageDataUrl(snap.rawImageDataUrl || '');
        setHistoryIndex(targetIndex);
        setTimeout(() => {
          isUndoRedoActionRef.current = false;
        }, 50);
      }
    }
  }, [history, historyIndex]);

  // Redo Action
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      const snap = history[targetIndex];
      if (snap) {
        isUndoRedoActionRef.current = true;
        setWidth(snap.width);
        setHeight(snap.height);
        setPins(JSON.parse(JSON.stringify(snap.pins)));
        setImageOffset({ ...snap.imageOffset });
        setImageDataUrl(snap.imageDataUrl || '');
        setRawImageDataUrl(snap.rawImageDataUrl || '');
        setHistoryIndex(targetIndex);
        setTimeout(() => {
          isUndoRedoActionRef.current = false;
        }, 50);
      }
    }
  }, [history, historyIndex]);

  // Convert screen client coordinates to logical component coordinates
  const getLogicalCoords = useCallback(
    (clientX: number, clientY: number) => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      const screenX = clientX - rect.left;
      const screenY = clientY - rect.top;
      // Account for <g transform="translate(pan.x + 120, pan.y + 80) scale(zoom)">
      const rawX = (screenX - (pan.x + 120)) / zoom;
      const rawY = (screenY - (pan.y + 80)) / zoom;
      return { x: rawX, y: rawY };
    },
    [pan.x, pan.y, zoom]
  );

  // Snap to nearest 17.0px breadboard hole
  const snapCoordinate = (coord: number, offset: number = 0): number => {
    if (!snapToBreadboard) return Math.round(coord * 10) / 10;
    const pitch = 17.0;
    const relative = coord - offset;
    const snapped = Math.round(relative / pitch) * pitch + offset;
    return Math.round(snapped * 10) / 10;
  };

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
      let svgW = 0;
      let svgH = 0;

      if (isSvg) {
        try {
          let svgText = '';
          if (dataUrl.startsWith('data:image/svg+xml;base64,')) {
            svgText = atob(dataUrl.split(';base64,')[1]);
          } else {
            svgText = decodeURIComponent(dataUrl.replace(/^data:image\/svg\+xml;?(charset=utf-8)?,?/, ''));
          }
          const parser = new DOMParser();
          const doc = parser.parseFromString(svgText, 'image/svg+xml');
          const svgEl = doc.querySelector('svg');
          if (svgEl) {
            const vb = svgEl.getAttribute('viewBox');
            if (vb) {
              const parts = vb.trim().split(/[\s,]+/).map(Number);
              if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
                svgW = parts[2];
                svgH = parts[3];
              }
            }
          }
        } catch {
          // fallback to img natural size
        }
      }

      const img = new Image();
      img.onload = () => {
        const natW = svgW > 0 ? svgW : img.naturalWidth;
        const natH = svgH > 0 ? svgH : img.naturalHeight;
        setOriginalImageSize({ width: Math.round(natW), height: Math.round(natH) });
        setRawImageDataUrl(dataUrl);
        setImageDataUrl(dataUrl);
        setImageOffset({ x: 0, y: 0 });

        // Auto calculate initial logical dimensions
        const aspect = natW / natH;
        let initW = 200;
        let initH = Math.round((initW / aspect) * 10) / 10;

        if (initH > 260) {
          initH = 220;
          initW = Math.round((initH * aspect) * 10) / 10;
        }

        setWidth(initW);
        setHeight(initH);

        // Auto suggest typeId and name if untouched
        const baseName = file.name.replace(/\.[^/.]+$/, '').trim();
        if (typeId === 'custom-module-1' || !typeId) {
          const slug = baseName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          setTypeId(slug || 'custom-module');
          setName(baseName.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Reset to original image (Undo background removal)
  const handleResetToOriginal = () => {
    if (rawImageDataUrl) {
      setImageDataUrl(rawImageDataUrl);
    }
  };

  // Helper: Trim transparent outer margins to wrap module body with exact bounds
  const trimCanvasTransparent = (canvas: HTMLCanvasElement, alphaThreshold = 15): {
    trimmedDataUrl: string;
    cropX: number;
    cropY: number;
    cropW: number;
    cropH: number;
    originalW: number;
    originalH: number;
  } => {
    const W = canvas.width;
    const H = canvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx || W === 0 || H === 0) {
      return {
        trimmedDataUrl: canvas.toDataURL('image/png'),
        cropX: 0,
        cropY: 0,
        cropW: W,
        cropH: H,
        originalW: W,
        originalH: H,
      };
    }

    const imgData = ctx.getImageData(0, 0, W, H);
    const data = imgData.data;

    let minX = W;
    let minY = H;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const alpha = data[(y * W + x) * 4 + 3];
        if (alpha > alphaThreshold) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // If entire image is transparent or already tight
    if (maxX < minX || maxY < minY || (minX === 0 && minY === 0 && maxX === W - 1 && maxY === H - 1)) {
      return {
        trimmedDataUrl: canvas.toDataURL('image/png'),
        cropX: 0,
        cropY: 0,
        cropW: W,
        cropH: H,
        originalW: W,
        originalH: H,
      };
    }

    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropW;
    croppedCanvas.height = cropH;
    const croppedCtx = croppedCanvas.getContext('2d');
    if (!croppedCtx) {
      return {
        trimmedDataUrl: canvas.toDataURL('image/png'),
        cropX: 0,
        cropY: 0,
        cropW: W,
        cropH: H,
        originalW: W,
        originalH: H,
      };
    }

    croppedCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
    const trimmedDataUrl = croppedCanvas.toDataURL('image/png');

    return {
      trimmedDataUrl,
      cropX: minX,
      cropY: minY,
      cropW,
      cropH,
      originalW: W,
      originalH: H,
    };
  };

  // Magic Background Remover with Flood Fill (Protects internal silkscreen / white markings!)
  const handleMagicRemoveBackground = () => {
    const sourceImage = rawImageDataUrl || imageDataUrl;
    if (!sourceImage || isProcessingBg) return;
    setIsProcessingBg(true);

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const W = img.naturalWidth;
        const H = img.naturalHeight;
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsProcessingBg(false);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, W, H);
        const data = imgData.data;

        // Sample background reference from 4 corners
        const c00 = 0;
        const c10 = (W - 1) * 4;
        const c01 = (H - 1) * W * 4;
        const c11 = ((H - 1) * W + (W - 1)) * 4;

        const bgR = Math.round((data[c00] + data[c10] + data[c01] + data[c11]) / 4);
        const bgG = Math.round((data[c00 + 1] + data[c10 + 1] + data[c01 + 1] + data[c11 + 1]) / 4);
        const bgB = Math.round((data[c00 + 2] + data[c10 + 2] + data[c01 + 2] + data[c11 + 2]) / 4);

        // Max Euclidean distance in RGB
        const maxDist = (bgTolerance / 100) * 441.67;
        const fadeRange = maxDist * 0.22;

        const checkIsBg = (r: number, g: number, b: number, a: number) => {
          if (a === 0) return true;
          const distCorner = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
          const distWhite = Math.sqrt((r - 255) ** 2 + (g - 255) ** 2 + (b - 255) ** 2);
          return Math.min(distCorner, distWhite) <= maxDist;
        };

        if (bgAlgorithm === 'flood-fill') {
          // --- FLOOD FILL / EDGE BFS ALGORITHM (SILKSCREEN SAFE) ---
          const visited = new Uint8Array(W * H);
          const qx = new Int32Array(W * H);
          const qy = new Int32Array(W * H);
          let head = 0;
          let tail = 0;

          const enqueue = (x: number, y: number) => {
            const idx = y * W + x;
            if (visited[idx] !== 0) return;
            const p = idx * 4;
            if (checkIsBg(data[p], data[p + 1], data[p + 2], data[p + 3])) {
              visited[idx] = 1;
              qx[tail] = x;
              qy[tail] = y;
              tail++;
            } else {
              visited[idx] = 2; // Component boundary on border
            }
          };

          for (let x = 0; x < W; x++) {
            enqueue(x, 0);
            enqueue(x, H - 1);
          }
          for (let y = 0; y < H; y++) {
            enqueue(0, y);
            enqueue(W - 1, y);
          }

          while (head < tail) {
            const cx = qx[head];
            const cy = qy[head];
            head++;

            const neighbors = [
              [cx + 1, cy],
              [cx - 1, cy],
              [cx, cy + 1],
              [cx, cy - 1],
            ];

            for (let i = 0; i < 4; i++) {
              const nx = neighbors[i][0];
              const ny = neighbors[i][1];

              if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
                const nIdx = ny * W + nx;
                if (visited[nIdx] === 0) {
                  const p = nIdx * 4;
                  if (checkIsBg(data[p], data[p + 1], data[p + 2], data[p + 3])) {
                    visited[nIdx] = 1;
                    qx[tail] = nx;
                    qy[tail] = ny;
                    tail++;
                  } else {
                    visited[nIdx] = 2;
                  }
                }
              }
            }
          }

          for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
              const idx = y * W + x;
              const p = idx * 4;

              if (visited[idx] === 1) {
                data[p + 3] = 0;
              } else if (visited[idx] === 2) {
                const r = data[p];
                const g = data[p + 1];
                const b = data[p + 2];
                const dist = Math.min(
                  Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2),
                  Math.sqrt((r - 255) ** 2 + (g - 255) ** 2 + (b - 255) ** 2)
                );
                if (dist < maxDist) {
                  const factor = Math.max(0.1, (dist - (maxDist - fadeRange)) / fadeRange);
                  data[p + 3] = Math.round(data[p + 3] * factor);
                }
              }
            }
          }
        } else {
          // --- GLOBAL CHROMA REMOVAL ---
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3];

            if (a === 0) continue;

            const distCorner = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
            const distWhite = Math.sqrt((r - 255) ** 2 + (g - 255) ** 2 + (b - 255) ** 2);
            const dist = Math.min(distCorner, distWhite);

            if (dist < maxDist - fadeRange) {
              data[i + 3] = 0;
            } else if (dist < maxDist) {
              const alphaFactor = (dist - (maxDist - fadeRange)) / fadeRange;
              data[i + 3] = Math.round(a * alphaFactor);
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);

        // Auto-Trim Transparent Outer Padding to perfectly wrap module body!
        const trimResult = trimCanvasTransparent(canvas, 15);
        const cleanedDataUrl = trimResult.trimmedDataUrl;

        setImageDataUrl(cleanedDataUrl);
        setRawImageDataUrl(cleanedDataUrl);
        setOriginalImageSize({ width: trimResult.cropW, height: trimResult.cropH });

        let nextHeight = height;
        if (lockAspectRatio && trimResult.cropW > 0) {
          nextHeight = Math.round((width * (trimResult.cropH / trimResult.cropW)) * 10) / 10;
          setHeight(nextHeight);
        }

        let nextPins = pins;
        if (pins.length > 0 && (trimResult.cropX > 0 || trimResult.cropY > 0)) {
          const scaleX = width / trimResult.originalW;
          const scaleY = height / trimResult.originalH;
          const shiftX = trimResult.cropX * scaleX;
          const shiftY = trimResult.cropY * scaleY;
          nextPins = pins.map((p) => ({
            ...p,
            x: Math.round((p.x - shiftX) * 10) / 10,
            y: Math.round((p.y - shiftY) * 10) / 10,
          }));
          setPins(nextPins);
        }

        pushSnapshot({
          width: width,
          height: nextHeight,
          pins: nextPins,
          imageOffset: imageOffset,
          imageDataUrl: cleanedDataUrl,
          rawImageDataUrl: cleanedDataUrl,
        });
      } catch (err) {
        console.error('Magic background removal failed:', err);
      } finally {
        setIsProcessingBg(false);
      }
    };
    img.src = sourceImage;
  };

  // Manual / Quick Auto-Crop Transparent Padding to Component Body
  const handleAutoCropToContent = () => {
    const source = imageDataUrl || rawImageDataUrl;
    if (!source) return;

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);

      const trimResult = trimCanvasTransparent(canvas, 15);
      if (trimResult.cropW === img.naturalWidth && trimResult.cropH === img.naturalHeight) {
        return; // Already tightly cropped
      }

      const finalDataUrl = trimResult.trimmedDataUrl;
      setImageDataUrl(finalDataUrl);
      setRawImageDataUrl(finalDataUrl);
      setOriginalImageSize({ width: trimResult.cropW, height: trimResult.cropH });

      let nextHeight = height;
      if (lockAspectRatio && trimResult.cropW > 0) {
        nextHeight = Math.round((width * (trimResult.cropH / trimResult.cropW)) * 10) / 10;
        setHeight(nextHeight);
      }

      let nextPins = pins;
      if (pins.length > 0 && (trimResult.cropX > 0 || trimResult.cropY > 0)) {
        const scaleX = width / trimResult.originalW;
        const scaleY = height / trimResult.originalH;
        const shiftX = trimResult.cropX * scaleX;
        const shiftY = trimResult.cropY * scaleY;
        nextPins = pins.map((p) => ({
          ...p,
          x: Math.round((p.x - shiftX) * 10) / 10,
          y: Math.round((p.y - shiftY) * 10) / 10,
        }));
        setPins(nextPins);
      }

      pushSnapshot({
        width: width,
        height: nextHeight,
        pins: nextPins,
        imageOffset: imageOffset,
        imageDataUrl: finalDataUrl,
        rawImageDataUrl: finalDataUrl,
      });
    };
    img.src = source;
  };

  // Dimension scaling handlers
  const handleWidthChange = (newWidth: number) => {
    if (newWidth <= 0) return;
    setWidth(newWidth);
    if (lockAspectRatio && originalImageSize.width > 0) {
      const newHeight = Math.round((newWidth * (originalImageSize.height / originalImageSize.width)) * 10) / 10;
      setHeight(newHeight);
    }
  };

  const handleHeightChange = (newHeight: number) => {
    if (newHeight <= 0) return;
    setHeight(newHeight);
    if (lockAspectRatio && originalImageSize.height > 0) {
      const newWidth = Math.round((newHeight * (originalImageSize.width / originalImageSize.height)) * 10) / 10;
      setWidth(newWidth);
    }
  };

  // Image Offset Nudge (Moves ONLY the image visual)
  const nudgeImage = (dx: number, dy: number) => {
    const newOffset = {
      x: Math.round((imageOffset.x + dx) * 10) / 10,
      y: Math.round((imageOffset.y + dy) * 10) / 10,
    };
    setImageOffset(newOffset);
    pushSnapshot({ imageOffset: newOffset });
  };

  // Nudge All (Moves both Image and Pins together)
  const nudgeAll = (dx: number, dy: number) => {
    const newOffset = {
      x: Math.round((imageOffset.x + dx) * 10) / 10,
      y: Math.round((imageOffset.y + dy) * 10) / 10,
    };
    const newPins = pins.map((p) => ({
      ...p,
      x: Math.round((p.x + dx) * 10) / 10,
      y: Math.round((p.y + dy) * 10) / 10,
    }));
    setImageOffset(newOffset);
    setPins(newPins);
    pushSnapshot({ imageOffset: newOffset, pins: newPins });
  };

  // Fit Bounding Box directly to image
  const handleFitBoxToImage = () => {
    if (imageOffset.x === 0 && imageOffset.y === 0) return;
    const shiftX = imageOffset.x;
    const shiftY = imageOffset.y;

    // Normalize pins so their relative position on the image is preserved
    const newPins = pins.map((p) => ({
      ...p,
      x: Math.round((p.x - shiftX) * 10) / 10,
      y: Math.round((p.y - shiftY) * 10) / 10,
    }));
    setPins(newPins);
    setImageOffset({ x: 0, y: 0 });
    pushSnapshot({ imageOffset: { x: 0, y: 0 }, pins: newPins });
  };

  // Rotate component, image, and pins 90 degrees clockwise (R / Space Shortcut)
  const handleRotateClockwise = useCallback(() => {
    const oldWidth = width;
    const oldHeight = height;

    // 1. Swap Canvas Dimensions
    const newW = oldHeight;
    const newH = oldWidth;
    setWidth(newW);
    setHeight(newH);

    // 2. Compute New Image Offset around the center of the component
    const centerX = imageOffset.x + oldWidth / 2;
    const centerY = imageOffset.y + oldHeight / 2;
    const newOffsetX = Math.round((centerX - newW / 2) * 10) / 10;
    const newOffsetY = Math.round((centerY - newH / 2) * 10) / 10;
    const nextOffset = { x: newOffsetX, y: newOffsetY };
    setImageOffset(nextOffset);

    // 3. Rotate All Pins mathematically around the component's relative box
    // When toolMode === 'drag-image' (Geser Gambar), pins STAY in place and ONLY the image rotates!
    // When toolMode === 'drag-all' / 'select-pin' / others, ALL pins rotate together with the image!
    const shouldRotatePins = toolMode !== 'drag-image';

    const newPins = shouldRotatePins
      ? pins.map((p) => {
          const relX = p.x - imageOffset.x;
          const relY = p.y - imageOffset.y;
          const relXRot = oldHeight - relY;
          const relYRot = relX;
          return {
            ...p,
            x: Math.round((newOffsetX + relXRot) * 10) / 10,
            y: Math.round((newOffsetY + relYRot) * 10) / 10,
          };
        })
      : pins;

    setPins(newPins);

    // 4. Rotate Image (Pure Lossless Vector for SVG, High-Quality Canvas for Bitmaps)
    const sourceImgUrl = imageDataUrl || rawImageDataUrl;
    if (sourceImgUrl) {
      if (sourceImgUrl.startsWith('data:image/svg+xml') || sourceImgUrl.includes('<svg')) {
        const rotatedSvg = rotateSvgDataUrl(sourceImgUrl);
        setImageDataUrl(rotatedSvg);
        setRawImageDataUrl(rotatedSvg);
        setOriginalImageSize((prev) => ({ width: prev.height, height: prev.width }));
        pushSnapshot({
          width: newW,
          height: newH,
          pins: newPins,
          imageOffset: nextOffset,
          imageDataUrl: rotatedSvg,
          rawImageDataUrl: rotatedSvg,
        });
      } else {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalHeight;
          canvas.height = img.naturalWidth;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (ctx) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((90 * Math.PI) / 180);
            ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
            const rotatedDataUrl = canvas.toDataURL('image/png');
            setImageDataUrl(rotatedDataUrl);
            setRawImageDataUrl(rotatedDataUrl);
            setOriginalImageSize({ width: img.naturalHeight, height: img.naturalWidth });
            pushSnapshot({
              width: newW,
              height: newH,
              pins: newPins,
              imageOffset: nextOffset,
              imageDataUrl: rotatedDataUrl,
              rawImageDataUrl: rotatedDataUrl,
            });
          }
        };
        img.src = sourceImgUrl;
      }
    } else {
      pushSnapshot({
        width: newW,
        height: newH,
        pins: newPins,
        imageOffset: nextOffset,
      });
    }
  }, [width, height, pins, imageOffset, imageDataUrl, rawImageDataUrl, toolMode, pushSnapshot]);

  // Pin Dragging Mouse Event Listeners (UNCONSTRAINED - Can drag anywhere to match module pads!)
  useEffect(() => {
    if (!draggingPinId) return;

    let finalPins = pins;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const { x: rawX, y: rawY } = getLogicalCoords(e.clientX, e.clientY);
      let finalX = rawX;
      let finalY = rawY;

      if (snapToBreadboard) {
        finalX = snapCoordinate(rawX, breadboardOffset.x % 17);
        finalY = snapCoordinate(rawY, breadboardOffset.y % 17);
      } else {
        finalX = Math.round(rawX * 10) / 10;
        finalY = Math.round(rawY * 10) / 10;
      }

      finalPins = pins.map((p) =>
        p.id === draggingPinId ? { ...p, x: finalX, y: finalY } : p
      );
      setPins(finalPins);
    };

    const handleWindowMouseUp = () => {
      setDraggingPinId(null);
      pushSnapshot({ pins: finalPins });
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [
    draggingPinId,
    getLogicalCoords,
    snapToBreadboard,
    breadboardOffset.x,
    breadboardOffset.y,
    pins,
    pushSnapshot,
  ]);

  // Image / All Dragging Mouse Event Listeners
  useEffect(() => {
    if (!isDraggingImage) return;

    let latestOffset = imageOffset;
    let latestPins = pins;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const deltaX = (e.clientX - imageDragStart.mouseX) / zoom;
      const deltaY = (e.clientY - imageDragStart.mouseY) / zoom;

      let newX = imageDragStart.startX + deltaX;
      let newY = imageDragStart.startY + deltaY;

      if (snapToBreadboard) {
        newX = snapCoordinate(newX, breadboardOffset.x % 17);
        newY = snapCoordinate(newY, breadboardOffset.y % 17);
      } else {
        newX = Math.round(newX * 10) / 10;
        newY = Math.round(newY * 10) / 10;
      }

      const diffX = newX - imageDragStart.startX;
      const diffY = newY - imageDragStart.startY;

      latestOffset = { x: newX, y: newY };
      setImageOffset(latestOffset);

      if (toolMode === 'drag-all' && imageDragStart.initialPins.length > 0) {
        latestPins = imageDragStart.initialPins.map((p) => ({
          ...p,
          x: Math.round((p.x + diffX) * 10) / 10,
          y: Math.round((p.y + diffY) * 10) / 10,
        }));
        setPins(latestPins);
      }
    };

    const handleWindowMouseUp = () => {
      setIsDraggingImage(false);
      pushSnapshot({ imageOffset: latestOffset, pins: latestPins });
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDraggingImage, imageDragStart, zoom, snapToBreadboard, breadboardOffset.x, breadboardOffset.y, toolMode, pushSnapshot, imageOffset, pins]);

  // Handle Pin Mouse Down to start dragging pin
  const handlePinMouseDown = (e: React.MouseEvent, pinId: string) => {
    if (e.button !== 0) return; // Left click only
    if (toolMode === 'drag-all') {
      handleImageMouseDown(e);
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    setSelectedPinId(pinId);
    setDraggingPinId(pinId);
  };

  // Handle Mouse Wheel Zoom centered on cursor position
  const handleCanvasWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Zoom factor: smooth exponential for trackpad pinch (ctrlKey), responsive for mouse wheel
    let zoomFactor = 1;
    if (e.ctrlKey) {
      zoomFactor = Math.exp(-e.deltaY * 0.01);
    } else {
      zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    }

    const newZoom = Math.min(Math.max(zoom * zoomFactor, 0.3), 6.0);
    if (Math.abs(newZoom - zoom) < 0.001) return;

    const offsetX = 120;
    const offsetY = 80;

    const newPan = {
      x: mouseX - offsetX - (mouseX - (pan.x + offsetX)) * (newZoom / zoom),
      y: mouseY - offsetY - (mouseY - (pan.y + offsetY)) * (newZoom / zoom),
    };

    setZoom(Number(newZoom.toFixed(3)));
    setPan(newPan);
  };

  // Handle Image Mouse Down to start dragging component image or all
  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (toolMode === 'drag-image' || toolMode === 'drag-all') {
      e.stopPropagation();
      e.preventDefault();
      setIsDraggingImage(true);
      setImageDragStart({
        mouseX: e.clientX,
        mouseY: e.clientY,
        startX: imageOffset.x,
        startY: imageOffset.y,
        initialPins: [...pins],
      });
    }
  };

  // Canvas click to add new pin (Unconstrained)
  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning || draggingPinId || isDraggingImage || hasMovedPanRef.current) return;
    const { x: rawX, y: rawY } = getLogicalCoords(e.clientX, e.clientY);

    if (toolMode === 'add-pin') {
      let finalX = snapToBreadboard ? snapCoordinate(rawX, breadboardOffset.x % 17) : Math.round(rawX * 10) / 10;
      let finalY = snapToBreadboard ? snapCoordinate(rawY, breadboardOffset.y % 17) : Math.round(rawY * 10) / 10;

      const newId = `pin_${pins.length + 1}`;
      const newPin: Pin = {
        id: newId,
        name: `Pin ${pins.length + 1}`,
        x: finalX,
        y: finalY,
        type: 'digital',
        description: `Pin ${pins.length + 1}`,
      };

      const nextPins = [...pins, newPin];
      setPins(nextPins);
      setSelectedPinId(newId);
      pushSnapshot({ pins: nextPins });
    }
  };

  // Selected Pin manipulation
  const selectedPin = pins.find((p) => p.id === selectedPinId);

  const updateSelectedPin = (fields: Partial<Pin>) => {
    if (!selectedPinId) return;
    const nextPins = pins.map((p) => {
      if (p.id === selectedPinId) {
        return { ...p, ...fields };
      }
      return p;
    });
    setPins(nextPins);
  };

  const deletePin = (id: string) => {
    const remaining = pins.filter((p) => p.id !== id);
    setPins(remaining);
    if (selectedPinId === id) {
      setSelectedPinId(remaining.length > 0 ? remaining[0].id : null);
    }
    pushSnapshot({ pins: remaining });
  };

  // Micro-nudge pin with keyboard arrow keys
  const nudgePin = (dx: number, dy: number) => {
    if (!selectedPin) return;
    const newX = Math.round((selectedPin.x + dx) * 10) / 10;
    const newY = Math.round((selectedPin.y + dy) * 10) / 10;
    const nextPins = pins.map((p) => (p.id === selectedPinId ? { ...p, x: newX, y: newY } : p));
    setPins(nextPins);
    pushSnapshot({ pins: nextPins });
  };

  // Keyboard navigation & Shortcuts (R / Space for Rotate, Ctrl+Z Undo, Ctrl+Y Redo, Arrows for Nudge)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (['input', 'textarea', 'select'].includes((e.target as HTMLElement)?.tagName.toLowerCase())) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Undo / Redo Shortcuts inside Studio
      if (isCmdOrCtrl && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
        return;
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
        return;
      }

      // If user presses Ctrl+R or Cmd+R, DO NOT INTERCEPT (allow browser refresh!)
      if (isCmdOrCtrl) {
        return;
      }

      // Shortcut: R to Rotate 90° Clockwise
      if (!e.altKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        handleRotateClockwise();
        return;
      }

      // Space key for Hand/Pan tool
      if (!isCmdOrCtrl && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        setIsSpacePressed(true);
        return;
      }

      const step = e.shiftKey ? 5.0 : e.altKey ? 0.1 : 1.0;

      if (toolMode === 'drag-all') {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          nudgeAll(0, -step);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          nudgeAll(0, step);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          nudgeAll(-step, 0);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          nudgeAll(step, 0);
        }
      } else if (toolMode === 'drag-image') {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          nudgeImage(0, -step);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          nudgeImage(0, step);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          nudgeImage(-step, 0);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          nudgeImage(step, 0);
        }
      } else if (selectedPin) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          nudgePin(0, -step);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          nudgePin(0, step);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          nudgePin(-step, 0);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          nudgePin(step, 0);
        } else if (e.key === 'Delete' || e.key === 'Backspace') {
          if (selectedPinId) {
            e.preventDefault();
            deletePin(selectedPinId);
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    isOpen,
    selectedPin,
    selectedPinId,
    toolMode,
    width,
    height,
    handleRotateClockwise,
    handleUndo,
    handleRedo,
    pins,
    imageOffset,
    pushSnapshot,
  ]);

  // Smooth global canvas pan dragging (continues smoothly even when cursor leaves canvas)
  useEffect(() => {
    if (!isPanning) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      hasMovedPanRef.current = true;
      setPan({
        x: e.clientX - startPanPos.x,
        y: e.clientY - startPanPos.y,
      });
    };

    const handleGlobalMouseUp = () => {
      setIsPanning(false);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isPanning, startPanPos]);

  // Generate multi-pin / DIP Row
  const handleGeneratePinRow = () => {
    if (genCount < 1) return;
    const startX = selectedPin ? selectedPin.x : (imageOffset.x + 17.0);
    const startY = selectedPin ? selectedPin.y : (imageOffset.y + 17.0);

    const newGeneratedPins: Pin[] = [];
    for (let i = 0; i < genCount; i++) {
      const px = genOrientation === 'horizontal' ? startX + i * genPitch : startX;
      const py = genOrientation === 'vertical' ? startY + i * genPitch : startY;

      newGeneratedPins.push({
        id: `${genPrefix}_${i + 1}`,
        name: `${genPrefix.toUpperCase()}${i + 1}`,
        x: Math.round(px * 10) / 10,
        y: Math.round(py * 10) / 10,
        type: 'digital',
        description: `Header Pin ${i + 1}`,
      });
    }

    setPins([...pins, ...newGeneratedPins]);
    if (newGeneratedPins.length > 0) {
      setSelectedPinId(newGeneratedPins[0].id);
    }
  };

  // Helper to get auto-normalized component definition (Origin at 0,0)
  const getNormalizedDefinition = (): ComponentDefinition => {
    const cleanTypeId = typeId.trim().toLowerCase().replace(/\s+/g, '-');

    // Calculate bounding box enclosing both the image and all pins
    const xs = [imageOffset.x, imageOffset.x + width, ...pins.map((p) => p.x)];
    const ys = [imageOffset.y, imageOffset.y + height, ...pins.map((p) => p.y)];

    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys);

    const normWidth = Math.max(20, Math.round((maxX - minX) * 10) / 10);
    const normHeight = Math.max(20, Math.round((maxY - minY) * 10) / 10);

    const normPins = pins.map((p) => ({
      ...p,
      x: Math.round((p.x - minX) * 10) / 10,
      y: Math.round((p.y - minY) * 10) / 10,
    }));

    const normOffset = {
      x: Math.round((imageOffset.x - minX) * 10) / 10,
      y: Math.round((imageOffset.y - minY) * 10) / 10,
    };

    return {
      type: cleanTypeId,
      name: name.trim() || 'Modul Kustom',
      category: category || 'sensors',
      description: description.trim() || 'Modul kustom',
      width: normWidth,
      height: normHeight,
      pins: normPins,
      icon: icon || 'Cpu',
      imageUrl: imageDataUrl,
      imageOffset: (normOffset.x !== 0 || normOffset.y !== 0) ? normOffset : undefined,
      isCustom: true,
    };
  };

  // Save component definition
  const handleSaveComponent = async () => {
    const definition = getNormalizedDefinition();
    let imgToSave = imageDataUrl;
    if (imgToSave) {
      imgToSave = await optimizeImageForStorage(imgToSave, 600);
    }
    const res = saveCustomComponent(definition, imgToSave);
    if (res.success) {
      setSaveSuccess(true);
      onComponentSaved?.(definition.type);
      setTimeout(() => setSaveSuccess(false), 3500);
    } else {
      alert(`Gagal menyimpan: ${res.error || 'Memori browser penuh'}`);
    }
  };

  // Copy TypeScript code
  const handleCopyCode = () => {
    const definition = getNormalizedDefinition();
    const code = generateTypeScriptCode(definition, `${definition.type.replace(/-/g, '_')}.png`);
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Import / Export JSON
  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        try {
          const item = JSON.parse(text);
          if (item?.definition) {
            const def = item.definition;
            setTypeId(def.type || 'custom-module');
            setName(def.name || 'Modul Kustom');
            setCategory(def.category || 'sensors');
            setDescription(def.description || '');
            setWidth(def.width || 200);
            setHeight(def.height || 150);
            setPins(def.pins || []);
            if (def.imageOffset) {
              setImageOffset(def.imageOffset);
            }
            if (item.imageBase64 || def.imageUrl) {
              const imgUrl = item.imageBase64 || def.imageUrl;
              setRawImageDataUrl(imgUrl);
              setImageDataUrl(imgUrl);
            }
          }
        } catch (err) {
          console.error('Failed to import json:', err);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md select-none overflow-hidden animate-in fade-in duration-200">
      <div className="flex flex-col w-[96vw] h-[94vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* 1. Modal Top Bar */}
        <div className="h-14 bg-slate-950/90 border-b border-slate-800 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                WireCraft Component Studio
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Admin Mode
                </span>
              </h2>
              <span className="text-[11px] text-slate-400">
                Visual Pin Calibrator & Breadboard Alignment Studio
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Import JSON */}
            <input
              type="file"
              ref={jsonInputRef}
              onChange={handleImportJsonFile}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => jsonInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Buka File JSON Komponen"
            >
              <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
              <span>Import JSON</span>
            </button>

            {/* Export JSON */}
            <button
              onClick={() => exportComponentJson(typeId)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Export Definisi JSON Komponen"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export JSON</span>
            </button>

            {/* Copy TS Code */}
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Copy TypeScript Definition Code"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-amber-400" />}
              {copiedCode ? 'Tersalin!' : 'Copy TS Code'}
            </button>

            {/* Save Button */}
            <button
              onClick={handleSaveComponent}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all ${
                saveSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-500/30'
                  : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sky-500/25'
              }`}
            >
              {saveSuccess ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {saveSuccess ? 'Tersimpan di Library!' : 'Simpan ke Library'}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 flex items-center justify-center transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Floating Success Notification Banner */}
        {saveSuccess && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-emerald-950/95 border border-emerald-500/50 text-emerald-100 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 backdrop-blur-md animate-in fade-in slide-in-from-top-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Check className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-emerald-100">Komponen Berhasil Disimpan!</span>
              <span className="text-[11px] text-emerald-300/80">
                Telah masuk ke <b>Katalog Komponen (Tab &apos;Custom Studio&apos;)</b> dan ditambahkan ke kanvas.
              </span>
            </div>
            <button
              onClick={onClose}
              className="ml-2 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all hover:scale-105 cursor-pointer shrink-0"
            >
              Lihat di Kanvas
            </button>
          </div>
        )}

        {/* 2. Main Studio Workspace (3 Columns) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Image Upload, Background Cleaner & Component Meta */}
          <div className="w-80 bg-slate-950/60 border-r border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto">
            {/* Upload Box */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                <span>1. Visual Asset Image</span>
                {imageDataUrl && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {originalImageSize.width} × {originalImageSize.height} px
                  </span>
                )}
              </label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={handleFileUpload}
                className="hidden"
              />

              {!imageDataUrl ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="h-28 border-2 border-dashed border-slate-700 hover:border-sky-500/60 rounded-xl bg-slate-900/50 hover:bg-slate-900 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all p-3 text-center"
                >
                  <Upload className="w-6 h-6 text-sky-400" />
                  <span className="text-xs font-medium text-slate-300">
                    Klik atau Drop Gambar Komponen
                  </span>
                  <span className="text-[10px] text-slate-500">PNG, JPG, WebP (Rekomendasi HD)</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="relative h-28 bg-slate-900/80 rounded-xl border border-slate-700/80 p-2 flex items-center justify-center overflow-hidden">
                    <img
                      src={imageDataUrl}
                      alt="Component Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                    <div className="absolute bottom-2 right-2 flex items-center gap-1">
                      {rawImageDataUrl && rawImageDataUrl !== imageDataUrl && (
                        <button
                          onClick={handleResetToOriginal}
                          className="px-2 py-1 rounded bg-slate-800/90 hover:bg-slate-700 text-[10px] text-amber-300 border border-slate-600 shadow flex items-center gap-1"
                          title="Kembalikan gambar asli sebelum remove bg"
                        >
                          <Undo className="w-3 h-3" />
                          Reset
                        </button>
                      )}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2 py-1 rounded bg-slate-800/90 hover:bg-slate-700 text-[10px] text-slate-200 border border-slate-600 shadow"
                      >
                        Ganti
                      </button>
                    </div>
                  </div>

                  {/* Magic Background Remover */}
                  <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                        <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                        Auto Remove Background
                      </span>
                      <span className="text-[10px] text-sky-400 font-mono font-bold">{bgTolerance}%</span>
                    </div>

                    {/* Mode Algorithm Selector */}
                    <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setBgAlgorithm('flood-fill')}
                        className={`py-1 px-1.5 rounded flex items-center justify-center gap-1 transition-all ${
                          bgAlgorithm === 'flood-fill'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Hanya hapus background luar. Silkscreen/sablon putih di dalam board AMAN!"
                      >
                        <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>Tepi Luar (Aman)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setBgAlgorithm('global')}
                        className={`py-1 px-1.5 rounded flex items-center justify-center gap-1 transition-all ${
                          bgAlgorithm === 'global'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="Hapus semua warna putih di seluruh gambar"
                      >
                        <Globe className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>Global (Semua)</span>
                      </button>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>Toleransi Warna</span>
                        <span>{bgTolerance <= 15 ? 'Ketat' : bgTolerance <= 35 ? 'Sedang' : 'Tinggi'}</span>
                      </div>
                      <input
                        type="range"
                        min="5"
                        max="70"
                        value={bgTolerance}
                        onChange={(e) => setBgTolerance(Number(e.target.value))}
                        className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={handleMagicRemoveBackground}
                        disabled={isProcessingBg}
                        className="py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                        title="Hapus background luar dan otomatis pangkas (crop) ke batas fisik bodi modul"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isProcessingBg ? 'Memproses...' : 'Hapus BG'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleAutoCropToContent}
                        className="py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                        title="Pangkas (crop) sisa area transparan di pinggir agar ukuran mm pas ke bodi modul"
                      >
                        <Crop className="w-3.5 h-3.5" />
                        <span>Crop Bodi</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dimension, Rotation & Image Positioning Controls */}
            <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200">2. Ukuran & Posisi</label>

                <div className="flex items-center gap-1.5">
                  {/* Unit Switcher: mm / px */}
                  <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setUnit('mm')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                        unit === 'mm'
                          ? 'bg-sky-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Gunakan satuan Milimeter (mm) - Standar Fisik Komponen"
                    >
                      mm
                    </button>
                    <button
                      onClick={() => setUnit('px')}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                        unit === 'px'
                          ? 'bg-sky-500 text-slate-950 shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title="Gunakan satuan Pixel (px) - Standar Kanvas"
                    >
                      px
                    </button>
                  </div>

                  {/* Rotate 90 deg button */}
                  <button
                    onClick={handleRotateClockwise}
                    className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                    title={
                      toolMode === 'drag-image'
                        ? 'Putar Gambar Saja 90° (Pin tidak ikut berputar)'
                        : 'Putar Semua (Gambar + Pin) 90°'
                    }
                  >
                    <RotateCw className={`w-3 h-3 ${toolMode === 'drag-image' ? 'text-amber-400' : 'text-sky-400'}`} />
                    <span>{toolMode === 'drag-image' ? 'Putar Gbr' : '90°'}</span>
                  </button>
                </div>
              </div>

              {/* Width & Height */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Lebar ({unit})</span>
                    <span className="text-[9px] font-mono text-slate-400">
                      {unit === 'mm' ? `≈ ${width} px` : `≈ ${pxToMm(width, 1)} mm`}
                    </span>
                  </div>
                  <input
                    type="number"
                    value={unit === 'mm' ? pxToMm(width, 1) : width}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const pxVal = unit === 'mm' ? mmToPx(val, 1) : val;
                      handleWidthChange(pxVal);
                    }}
                    step={unit === 'mm' ? '0.1' : '1'}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Tinggi ({unit})</span>
                    <span className="text-[9px] font-mono text-slate-400">
                      {unit === 'mm' ? `≈ ${height} px` : `≈ ${pxToMm(height, 1)} mm`}
                    </span>
                  </div>
                  <input
                    type="number"
                    value={unit === 'mm' ? pxToMm(height, 1) : height}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const pxVal = unit === 'mm' ? mmToPx(val, 1) : val;
                      handleHeightChange(pxVal);
                    }}
                    step={unit === 'mm' ? '0.1' : '1'}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lockAspectRatio}
                  onChange={(e) => setLockAspectRatio(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-sky-500 focus:ring-0 w-3.5 h-3.5"
                />
                <span className="text-xs text-slate-300">Kunci Rasio Aspek (Aspect Ratio)</span>
              </label>

              {/* Image Offset X & Y with Nudge & Fit Box Controls */}
              <div className="p-2.5 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                    Posisi Offset Gambar
                  </span>
                  <button
                    onClick={handleFitBoxToImage}
                    className="text-[10px] text-sky-400 hover:text-sky-300 font-medium hover:underline flex items-center gap-1"
                    title="Paskan Bounding Box ke Gambar dan nolkan offset"
                  >
                    <Box className="w-3 h-3" />
                    Paskan Box
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Offset X ({unit})</span>
                      <span className="text-[9px] font-mono text-slate-400">
                        {unit === 'mm' ? `≈ ${imageOffset.x} px` : `≈ ${pxToMm(imageOffset.x, 2)} mm`}
                      </span>
                    </div>
                    <input
                      type="number"
                      value={unit === 'mm' ? pxToMm(imageOffset.x, 2) : imageOffset.x}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const pxVal = unit === 'mm' ? mmToPx(val, 1) : val;
                        const next = { ...imageOffset, x: pxVal };
                        setImageOffset(next);
                        pushSnapshot({ imageOffset: next });
                      }}
                      step={unit === 'mm' ? '0.1' : '0.5'}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Offset Y ({unit})</span>
                      <span className="text-[9px] font-mono text-slate-400">
                        {unit === 'mm' ? `≈ ${imageOffset.y} px` : `≈ ${pxToMm(imageOffset.y, 2)} mm`}
                      </span>
                    </div>
                    <input
                      type="number"
                      value={unit === 'mm' ? pxToMm(imageOffset.y, 2) : imageOffset.y}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const pxVal = unit === 'mm' ? mmToPx(val, 1) : val;
                        const next = { ...imageOffset, y: pxVal };
                        setImageOffset(next);
                        pushSnapshot({ imageOffset: next });
                      }}
                      step={unit === 'mm' ? '0.1' : '0.5'}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 font-mono"
                    />
                  </div>
                </div>

                {/* Micro Nudge Image Buttons */}
                <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400">Nudge Gambar:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => nudgeImage(unit === 'mm' ? -mmToPx(0.5, 1) : -1.0, 0)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title={`Geser Gambar Kiri (-${unit === 'mm' ? '0.5mm' : '1px'})`}
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => nudgeImage(0, unit === 'mm' ? -mmToPx(0.5, 1) : -1.0)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title={`Geser Gambar Atas (-${unit === 'mm' ? '0.5mm' : '1px'})`}
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => nudgeImage(0, unit === 'mm' ? mmToPx(0.5, 1) : 1.0)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title={`Geser Gambar Bawah (+${unit === 'mm' ? '0.5mm' : '1px'})`}
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => nudgeImage(unit === 'mm' ? mmToPx(0.5, 1) : 1.0, 0)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title={`Geser Gambar Kanan (+${unit === 'mm' ? '0.5mm' : '1px'})`}
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Component Metadata */}
            <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-200">3. Informasi Komponen</label>

              <div>
                <span className="text-[10px] text-slate-400">ID Tipe (slug unik)</span>
                <input
                  type="text"
                  value={typeId}
                  onChange={(e) => setTypeId(e.target.value)}
                  placeholder="sensor-nama-modul"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400">Nama Tampilan</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Modul Sensor..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div>
                <span className="text-[10px] text-slate-400">Kategori</span>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <span className="text-[10px] text-slate-400">Deskripsi</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Keterangan singkat fungsi modul..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:border-sky-500 focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Center Canvas: Interactive Pin & Image Visualizer */}
          <div className="flex-1 flex flex-col bg-slate-950 relative overflow-hidden">
            {/* Canvas Toolbar - Sleek Pro Single-Line Bar */}
            <div className="min-h-[46px] bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 py-1.5 flex items-center justify-between z-10 gap-3 overflow-x-auto no-scrollbar select-none">
              {/* Primary Tool Mode Switch, Undo/Redo & Rotate */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Undo / Redo Buttons */}
                <div className="flex bg-slate-900/90 p-0.5 rounded-xl border border-slate-800 shadow-inner">
                  <button
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors"
                    title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
                  >
                    <Redo2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Segmented Control */}
                <div className="flex bg-slate-900/90 p-0.5 rounded-xl border border-slate-800 shadow-inner">
                  <button
                    onClick={() => setToolMode('select-pin')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      toolMode === 'select-pin'
                        ? 'bg-sky-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                    }`}
                    title="Pilih & Geser Pin di kanvas"
                  >
                    <Move className="w-3.5 h-3.5" />
                    <span>Geser Pin</span>
                  </button>

                  <button
                    onClick={() => setToolMode('drag-image')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      toolMode === 'drag-image'
                        ? 'bg-amber-400 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                    }`}
                    title="Geser Gambar Modul saja untuk dicocokkan ke pin / breadboard"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Geser Gambar</span>
                  </button>

                  <button
                    onClick={() => setToolMode('drag-all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      toolMode === 'drag-all'
                        ? 'bg-purple-500 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                    }`}
                    title="Geser Gambar dan Pin bersamaan"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Geser Semua</span>
                  </button>

                  <button
                    onClick={() => setToolMode('add-pin')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      toolMode === 'add-pin'
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                    }`}
                    title="Klik kanvas untuk menambah pin baru"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Pin</span>
                  </button>

                  <button
                    onClick={() => setToolMode('pan')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      toolMode === 'pan'
                        ? 'bg-sky-400 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                    }`}
                    title="Geser / Pan kanvas secara leluasa (atau tahan Spasi / klik background)"
                  >
                    <Hand className="w-3.5 h-3.5" />
                    <span>Geser Kanvas</span>
                  </button>
                </div>

                {/* Rotate Button */}
                <button
                  onClick={handleRotateClockwise}
                  className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer ${
                    toolMode === 'drag-image'
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 hover:bg-amber-500/25'
                      : 'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-sky-500/40 text-slate-300 hover:text-sky-300'
                  }`}
                  title={
                    toolMode === 'drag-image'
                      ? 'Putar Gambar Saja 90° (Pin TIDAK ikut berputar karena Mode Geser Gambar aktif)'
                      : 'Putar Semua (Gambar + Pin + Bodi) 90° (Shortcut: Tombol R)'
                  }
                >
                  <RotateCw className={`w-3.5 h-3.5 ${toolMode === 'drag-image' ? 'text-amber-400' : 'text-sky-400'}`} />
                  <span className="hidden sm:inline">
                    {toolMode === 'drag-image' ? 'Putar Gambar' : 'Putar 90°'}
                  </span>
                  <span className="text-[10px] font-mono font-bold px-1 py-0.2 bg-slate-950 text-slate-400 rounded border border-slate-800">
                    R
                  </span>
                </button>
              </div>

              {/* Guides, Overlays & Zoom */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Magnet Snap Toggle Button */}
                <button
                  onClick={() => setSnapToBreadboard(!snapToBreadboard)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all shadow-sm shrink-0 cursor-pointer ${
                    snapToBreadboard
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                  }`}
                  title={
                    unit === 'mm'
                      ? 'Kunci posisi pin tepat di lubang breadboard (Pitch 2.54mm / 17px)'
                      : 'Kunci posisi pin tepat di lubang breadboard (Pitch 17px)'
                  }
                >
                  <Magnet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{unit === 'mm' ? 'Snap 2.54mm' : 'Snap 17px'}</span>
                </button>

                {/* Pin Callout Toggle Button */}
                <button
                  onClick={() => setAlwaysShowLabels(!alwaysShowLabels)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all shadow-sm shrink-0 cursor-pointer ${
                    alwaysShowLabels
                      ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                  }`}
                  title={alwaysShowLabels ? 'Callout selalu tampil' : 'Callout tampil saat pin di-hover / dipilih (Default)'}
                >
                  <Tag className="w-3.5 h-3.5 text-sky-400" />
                  <span>Callout</span>
                </button>

                {/* Breadboard Capsule */}
                <div className="flex items-center gap-1.5 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800 shadow-sm shrink-0">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-300 select-none">
                    <input
                      type="checkbox"
                      checked={showBreadboard}
                      onChange={(e) => setShowBreadboard(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-sky-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span className="font-semibold text-xs">Breadboard</span>
                  </label>

                  {showBreadboard && (
                    <>
                      <select
                        value={breadboardType}
                        onChange={(e) => setBreadboardType(e.target.value as any)}
                        className="bg-slate-950 border border-slate-700/80 text-slate-200 text-[11px] rounded-lg px-2 py-0.5 outline-none focus:border-sky-500 cursor-pointer"
                      >
                        <option value="half">Half (400)</option>
                        <option value="mini">Mini (170)</option>
                        <option value="grid">Grid 17px</option>
                      </select>

                      <div className="flex items-center gap-1 pl-1 border-l border-slate-800" title="Transparansi Breadboard">
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.05"
                          value={breadboardOpacity}
                          onChange={(e) => setBreadboardOpacity(Number(e.target.value))}
                          className="w-14 accent-sky-500 h-1 bg-slate-800 rounded cursor-pointer"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Zoom Capsule */}
                <div className="flex items-center gap-0.5 bg-slate-900 px-1 py-1 rounded-xl border border-slate-800 shadow-sm shrink-0">
                  <button
                    onClick={() => setZoom((z) => Math.max(0.4, z - 0.2))}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono text-slate-300 font-bold px-1 min-w-[38px] text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom((z) => Math.min(4.0, z + 0.2))}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setZoom(1.8);
                      setPan({ x: 0, y: 0 });
                    }}
                    className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-sky-300 transition-colors ml-0.5 border-l border-slate-800"
                    title="Reset Posisi & Zoom"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* SVG Interactive Canvas */}
            <div
              className={`flex-1 overflow-hidden relative bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] select-none ${
                isPanning
                  ? 'cursor-grabbing'
                  : isSpacePressed || toolMode === 'pan'
                  ? 'cursor-grab'
                  : toolMode === 'drag-image' || toolMode === 'drag-all'
                  ? 'cursor-grab active:cursor-grabbing'
                  : toolMode === 'add-pin'
                  ? 'cursor-crosshair'
                  : 'cursor-grab'
              }`}
              onWheel={handleCanvasWheel}
              onMouseDown={(e) => {
                hasMovedPanRef.current = false;
                // Middle click, space pressed, alt/shift, pan tool
                if (
                  e.button === 1 ||
                  isSpacePressed ||
                  e.altKey ||
                  toolMode === 'pan' ||
                  (e.button === 0 && e.shiftKey)
                ) {
                  e.preventDefault();
                  setIsPanning(true);
                  setStartPanPos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
                  return;
                }

                // If in drag-image or drag-all mode
                if (toolMode === 'drag-image' || toolMode === 'drag-all') {
                  handleImageMouseDown(e);
                  return;
                }

                // Left click on canvas to pan (when not adding a pin)
                if (e.button === 0 && toolMode !== 'add-pin') {
                  setIsPanning(true);
                  setStartPanPos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
                }
              }}
            >
              <svg
                ref={canvasRef}
                className="w-full h-full select-none"
                onClick={handleCanvasClick}
              >
                <g transform={`translate(${pan.x + 120}, ${pan.y + 80}) scale(${zoom})`}>
                  {/* REALISTIC BREADBOARD OVERLAY (HALF / MINI / GRID) */}
                  {showBreadboard && (
                    <g opacity={breadboardOpacity} pointerEvents="none">
                      {breadboardType === 'half' ? (
                        /* Photorealistic Half Breadboard (400 Tie-Point) with Exact 17px Pitch & Aligned Hole Centers */
                        <g transform={`translate(${breadboardOffset.x + 8.216667}, ${breadboardOffset.y})`}>
                          <image
                            href="/components/breadboard_half.svg"
                            x={0}
                            y={0}
                            width={578.554}
                            height={357.0}
                            preserveAspectRatio="none"
                          />
                        </g>
                      ) : breadboardType === 'mini' ? (
                        /* Photorealistic Mini Breadboard (170 Tie-Point) with Exact 17px Pitch */
                        <g transform={`translate(${breadboardOffset.x - 0.288}, ${breadboardOffset.y - 8.63})`}>
                          <image
                            href="/components/breadboard_mini.svg"
                            x={0}
                            y={0}
                            width={306.56}
                            height={238.27}
                            preserveAspectRatio="none"
                          />
                        </g>
                      ) : (
                        /* Clean 17px Cyan Grid Overlay */
                        <g opacity={0.4}>
                          {Array.from({ length: Math.max(22, Math.ceil(height / 17) + 8) }).map((_, r) => (
                            <React.Fragment key={`row-${r}`}>
                              {Array.from({ length: Math.max(35, Math.ceil(width / 17) + 12) }).map((_, c) => {
                                const hx = c * 17.0 + breadboardOffset.x;
                                const hy = r * 17.0 + breadboardOffset.y;
                                return (
                                  <circle
                                    key={`bb-${r}-${c}`}
                                    cx={hx}
                                    cy={hy}
                                    r={2.2}
                                    fill="#38bdf8"
                                    stroke="#0284c7"
                                    strokeWidth={0.8}
                                  />
                                );
                              })}
                            </React.Fragment>
                          ))}
                        </g>
                      )}
                    </g>
                  )}

                  {/* Component Border Box - Follows Image Position */}
                  <rect
                    x={imageOffset.x}
                    y={imageOffset.y}
                    width={width}
                    height={height}
                    fill="#0f172a"
                    fillOpacity={0.4}
                    stroke="#38bdf8"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    rx={4}
                  />

                  {/* Component Image (with interactive drag & custom offset) */}
                  {imageDataUrl && (
                    <image
                      href={imageDataUrl}
                      x={imageOffset.x}
                      y={imageOffset.y}
                      width={width}
                      height={height}
                      preserveAspectRatio="none"
                      className={`transition-opacity duration-150 ${
                        toolMode === 'drag-image' || toolMode === 'drag-all' ? 'cursor-grab active:cursor-grabbing hover:opacity-90' : ''
                      }`}
                      onMouseDown={handleImageMouseDown}
                    />
                  )}

                  {/* Render Pins & Smart Elbow Callouts with Live Grab & Drag */}
                  {pins
                    .slice()
                    .sort((a, b) => {
                      if (a.id === selectedPinId) return 1;
                      if (b.id === selectedPinId) return -1;
                      if (a.id === hoveredPinId) return 1;
                      if (b.id === hoveredPinId) return -1;
                      return 0;
                    })
                    .map((pin) => {
                      const isSelected = pin.id === selectedPinId;
                      const isHovered = pin.id === hoveredPinId;
                      const isDragging = pin.id === draggingPinId;
                      const shouldShowLabel = isHovered || isSelected || isDragging || alwaysShowLabels;
                      const typeDef = PIN_TYPES.find((t) => t.type === pin.type) || PIN_TYPES[0];
                      const callout = getPinCalloutGeometry(pin, imageOffset, width, height);
                      const badgeColor = isSelected ? '#38bdf8' : isHovered ? '#38bdf8' : typeDef.color;
                      const strokeW = isSelected ? 1.6 : isHovered ? 1.4 : 1.1;

                      return (
                        <g
                          key={pin.id}
                          transform={`translate(${pin.x}, ${pin.y})`}
                          style={{ pointerEvents: 'all' }}
                          onMouseEnter={() => setHoveredPinId(pin.id)}
                          onMouseLeave={() => setHoveredPinId(null)}
                          onMouseDown={(e) => handlePinMouseDown(e, pin.id)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPinId(pin.id);
                          }}
                        >
                          {/* Invisible Large Hit Area Circle for Easy Grabbing & Hover */}
                          <circle
                            cx={0}
                            cy={0}
                            r={14}
                            fill="transparent"
                            className={isDragging ? 'cursor-grabbing' : 'cursor-grab'}
                          />

                          {/* Selected Glowing Ring */}
                          {isSelected && (
                            <circle
                              cx={0}
                              cy={0}
                              r={10}
                              fill="none"
                              stroke="#38bdf8"
                              strokeWidth={2}
                              strokeDasharray="3 3"
                              className="animate-spin"
                              style={{ animationDuration: '4s' }}
                            />
                          )}

                          {/* Outer Pin Body */}
                          <circle
                            cx={0}
                            cy={0}
                            r={5.5}
                            fill={typeDef.color}
                            stroke="#ffffff"
                            strokeWidth={1.8}
                            className={isDragging ? 'cursor-grabbing' : 'cursor-grab'}
                          />

                          {/* Center Dot */}
                          <circle cx={0} cy={0} r={1.8} fill="#ffffff" pointerEvents="none" />

                          {/* Smart Directional Elbow Callout Annotation */}
                          {shouldShowLabel && (
                            <g
                              pointerEvents="none"
                              className="transition-all duration-150"
                              style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.65))' }}
                            >
                              {/* 1. Leader Line (Elbow) */}
                              <path
                                d={`M ${callout.p0.x} ${callout.p0.y} L ${callout.p1.x} ${callout.p1.y} L ${callout.p2.x} ${callout.p2.y}`}
                                fill="none"
                                stroke={badgeColor}
                                strokeWidth={strokeW}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                opacity={0.95}
                              />

                              {/* 2. Anchor Dot on Pin Pad Rim */}
                              <circle
                                cx={callout.p0.x}
                                cy={callout.p0.y}
                                r={1.6}
                                fill={badgeColor}
                              />

                              {/* 3. Callout Badge Box */}
                              <rect
                                x={callout.badgeX - callout.badgeW / 2}
                                y={callout.badgeY - callout.badgeH / 2}
                                width={callout.badgeW}
                                height={callout.badgeH}
                                rx={3.5}
                                fill="#020617"
                                fillOpacity={0.96}
                                stroke={badgeColor}
                                strokeWidth={strokeW}
                              />

                              {/* 4. Mini Pin Type Color Dot inside Badge */}
                              <circle
                                cx={callout.badgeX - callout.badgeW / 2 + 5.5}
                                cy={callout.badgeY}
                                r={2}
                                fill={typeDef.color}
                              />

                              {/* 5. Pin Label Text */}
                              <text
                                x={callout.badgeX + 3}
                                y={callout.badgeY + 3.2}
                                fill="#f8fafc"
                                fontSize={8.5}
                                fontWeight="bold"
                                textAnchor="middle"
                                fontFamily="monospace"
                                letterSpacing="0.02em"
                              >
                                {pin.name}
                              </text>
                            </g>
                          )}
                        </g>
                      );
                    })}
                </g>
              </svg>

              {/* Instructions badge */}
              <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 backdrop-blur text-[11px] text-slate-300 flex items-center gap-2 pointer-events-none shadow-lg">
                <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span>
                  <b>Tarik Background / Spasi:</b> Geser Kanvas • <b>Scroll:</b> Zoom • <b>Hover Pin:</b> Callout • <b>Putar:</b> <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-sky-300 font-bold">R</kbd>
                </span>
              </div>
            </div>
          </div>

          {/* Right Panel: Pin Inspector & Header DIP Generator */}
          <div className="w-80 bg-slate-950/60 border-l border-slate-800 p-4 flex flex-col gap-4 overflow-y-auto">
            {/* Multi-pin Header Generator */}
            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 flex flex-col gap-2.5">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                Auto Header / DIP Generator
              </span>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400">Jumlah Pin</span>
                  <input
                    type="number"
                    value={genCount}
                    onChange={(e) => setGenCount(Number(e.target.value))}
                    min="1"
                    max="60"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Pitch ({unit})</span>
                    <span className="text-[9px] font-mono text-slate-400">
                      {unit === 'mm' ? `≈ ${genPitch} px` : `≈ ${pxToMm(genPitch, 2)} mm`}
                    </span>
                  </div>
                  <input
                    type="number"
                    value={unit === 'mm' ? pxToMm(genPitch, 2) : genPitch}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const pxVal = unit === 'mm' ? mmToPx(val, 2) : val;
                      setGenPitch(pxVal);
                    }}
                    step={unit === 'mm' ? '0.01' : '0.5'}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 font-mono"
                  />
                </div>
              </div>

              {/* Quick Pitch Pills */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setGenPitch(17.0)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                    Math.abs(genPitch - 17.0) < 0.1
                      ? 'bg-sky-500/20 border-sky-500/50 text-sky-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Standar Breadboard / DIP (2.54 mm / 17 px)"
                >
                  2.54mm (DIP)
                </button>
                <button
                  type="button"
                  onClick={() => setGenPitch(mmToPx(2.0, 2))}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                    Math.abs(genPitch - mmToPx(2.0, 2)) < 0.1
                      ? 'bg-sky-500/20 border-sky-500/50 text-sky-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Pitch 2.0 mm (XBee / Mini Modules)"
                >
                  2.00mm
                </button>
                <button
                  type="button"
                  onClick={() => setGenPitch(mmToPx(1.27, 2))}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                    Math.abs(genPitch - mmToPx(1.27, 2)) < 0.1
                      ? 'bg-sky-500/20 border-sky-500/50 text-sky-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title="Pitch 1.27 mm (SMD / SOP)"
                >
                  1.27mm
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400">Orientasi</span>
                  <select
                    value={genOrientation}
                    onChange={(e) => setGenOrientation(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100"
                  >
                    <option value="vertical">Vertikal</option>
                    <option value="horizontal">Horizontal</option>
                  </select>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Prefix ID</span>
                  <input
                    type="text"
                    value={genPrefix}
                    onChange={(e) => setGenPrefix(e.target.value)}
                    placeholder="p / d / pin"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 font-mono"
                  />
                </div>
              </div>

              <button
                onClick={handleGeneratePinRow}
                className="w-full py-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Generate Deretan Pin ({unit === 'mm' ? `${pxToMm(genPitch, 2)}mm` : `${genPitch}px`})
              </button>
            </div>

            {/* Selected Pin Details Inspector */}
            {selectedPin ? (
              <div className="p-3 bg-slate-900 rounded-xl border border-sky-500/30 flex flex-col gap-3 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                    Edit Pin Terpilih
                  </span>
                  <button
                    onClick={() => deletePin(selectedPin.id)}
                    className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Hapus Pin"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400">ID Pin (Unik)</span>
                    <input
                      type="text"
                      value={selectedPin.id}
                      onChange={(e) => updateSelectedPin({ id: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 font-mono focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Nama / Label</span>
                    <input
                      type="text"
                      value={selectedPin.name}
                      onChange={(e) => updateSelectedPin({ name: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 font-bold focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400">Tipe Pin</span>
                  <select
                    value={selectedPin.type}
                    onChange={(e) => updateSelectedPin({ type: e.target.value as PinType })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
                  >
                    {PIN_TYPES.map((t) => (
                      <option key={t.type} value={t.type}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Koordinat X ({unit})</span>
                      <span className="text-[9px] font-mono text-slate-400">
                        {unit === 'mm' ? `≈ ${selectedPin.x} px` : `≈ ${pxToMm(selectedPin.x, 2)} mm`}
                      </span>
                    </div>
                    <input
                      type="number"
                      value={unit === 'mm' ? pxToMm(selectedPin.x, 2) : selectedPin.x}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const pxVal = unit === 'mm' ? mmToPx(val, 2) : val;
                        updateSelectedPin({ x: pxVal });
                      }}
                      step={unit === 'mm' ? '0.1' : '0.1'}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Koordinat Y ({unit})</span>
                      <span className="text-[9px] font-mono text-slate-400">
                        {unit === 'mm' ? `≈ ${selectedPin.y} px` : `≈ ${pxToMm(selectedPin.y, 2)} mm`}
                      </span>
                    </div>
                    <input
                      type="number"
                      value={unit === 'mm' ? pxToMm(selectedPin.y, 2) : selectedPin.y}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const pxVal = unit === 'mm' ? mmToPx(val, 2) : val;
                        updateSelectedPin({ y: pxVal });
                      }}
                      step={unit === 'mm' ? '0.1' : '0.1'}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 font-mono"
                    />
                  </div>
                </div>

                {/* Micro Nudge Buttons */}
                <div className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400">Micro Nudge:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => nudgePin(unit === 'mm' ? -mmToPx(0.5, 1) : -0.5, 0)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title={`Nudge Kiri (-${unit === 'mm' ? '0.5mm' : '0.5px'})`}
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => nudgePin(0, unit === 'mm' ? -mmToPx(0.5, 1) : -0.5)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title={`Nudge Atas (-${unit === 'mm' ? '0.5mm' : '0.5px'})`}
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => nudgePin(0, unit === 'mm' ? mmToPx(0.5, 1) : 0.5)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title={`Nudge Bawah (+${unit === 'mm' ? '0.5mm' : '0.5px'})`}
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => nudgePin(unit === 'mm' ? mmToPx(0.5, 1) : 0.5, 0)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title={`Nudge Kanan (+${unit === 'mm' ? '0.5mm' : '0.5px'})`}
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400">Deskripsi Tooltip</span>
                  <input
                    type="text"
                    value={selectedPin.description || ''}
                    onChange={(e) => updateSelectedPin({ description: e.target.value })}
                    placeholder="Contoh: Power 5V / Signal Input..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
                Pilih pin pada canvas untuk mengedit atau geser gambar/pin langsung dengan cursor mouse.
              </div>
            )}

            {/* List of All Pins */}
            <div className="flex-1 flex flex-col gap-1.5 min-h-[140px]">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 px-1">
                <span>Daftar Pin ({pins.length})</span>
                {pins.length > 0 && (
                  <button
                    onClick={() => setPins([])}
                    className="text-[10px] text-rose-400 hover:underline"
                  >
                    Hapus Semua
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col gap-1 pr-1 max-h-48">
                {pins.map((pin) => {
                  const isSelected = pin.id === selectedPinId;
                  const typeDef = PIN_TYPES.find((t) => t.type === pin.type) || PIN_TYPES[0];

                  return (
                    <div
                      key={pin.id}
                      onClick={() => setSelectedPinId(pin.id)}
                      onMouseEnter={() => setHoveredPinId(pin.id)}
                      onMouseLeave={() => setHoveredPinId(null)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-sky-500/15 border-sky-500/50 text-sky-200'
                          : 'bg-slate-900/70 border-slate-800 hover:bg-slate-900 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: typeDef.color }}
                        />
                        <span className="font-bold">{pin.name}</span>
                        <span className="text-[10px] font-mono text-slate-500">({pin.id})</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        {unit === 'mm'
                          ? `${pxToMm(pin.x, 1)}, ${pxToMm(pin.y, 1)}`
                          : `${pin.x.toFixed(1)}, ${pin.y.toFixed(1)}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
