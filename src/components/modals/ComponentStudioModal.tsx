import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Pin, PinType, ComponentDefinition } from '../../types/circuit';
import {
  saveCustomComponent,
  optimizeImageForStorage,
  getCustomComponents,
  generateTypeScriptCode,
  exportComponentJson,
  importComponentJson,
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

export const ComponentStudioModal: React.FC<ComponentStudioModalProps> = ({
  isOpen,
  onClose,
  onComponentSaved,
  initialDefinition,
}) => {
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

  // Breadboard overlay & snapping helpers
  const [showBreadboard, setShowBreadboard] = useState<boolean>(true);
  const [breadboardType, setBreadboardType] = useState<'half' | 'mini' | 'grid'>('half');
  const [breadboardOpacity, setBreadboardOpacity] = useState<number>(0.7);
  const [snapToBreadboard, setSnapToBreadboard] = useState<boolean>(true);
  const [breadboardOffset, setBreadboardOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Tool mode: 'select-pin' | 'drag-image' | 'add-pin'
  const [toolMode, setToolMode] = useState<'select-pin' | 'drag-image' | 'add-pin'>('select-pin');

  // Dragging states
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);
  const [isDraggingImage, setIsDraggingImage] = useState<boolean>(false);
  const [imageDragStart, setImageDragStart] = useState<{
    mouseX: number;
    mouseY: number;
    startX: number;
    startY: number;
  }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

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

      const img = new Image();
      img.onload = () => {
        setOriginalImageSize({ width: img.naturalWidth, height: img.naturalHeight });
        setRawImageDataUrl(dataUrl);
        setImageDataUrl(dataUrl);
        setImageOffset({ x: 0, y: 0 });

        // Auto calculate initial logical dimensions
        const aspect = img.naturalWidth / img.naturalHeight;
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
        const cleanedDataUrl = canvas.toDataURL('image/png');
        setImageDataUrl(cleanedDataUrl);
      } catch (err) {
        console.error('Magic background removal failed:', err);
      } finally {
        setIsProcessingBg(false);
      }
    };
    img.src = sourceImage;
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
    setImageOffset((prev) => ({
      x: Math.round((prev.x + dx) * 10) / 10,
      y: Math.round((prev.y + dy) * 10) / 10,
    }));
  };

  // Fit Bounding Box directly to image
  const handleFitBoxToImage = () => {
    if (imageOffset.x === 0 && imageOffset.y === 0) return;
    const shiftX = imageOffset.x;
    const shiftY = imageOffset.y;

    // Normalize pins so their relative position on the image is preserved
    setPins((prevPins) =>
      prevPins.map((p) => ({
        ...p,
        x: Math.round((p.x - shiftX) * 10) / 10,
        y: Math.round((p.y - shiftY) * 10) / 10,
      }))
    );
    setImageOffset({ x: 0, y: 0 });
  };

  // Rotate component, image, and pins 90 degrees clockwise (R / Space Shortcut)
  const handleRotateClockwise = useCallback(() => {
    const oldWidth = width;
    const oldHeight = height;

    // 1. Swap Canvas Dimensions
    setWidth(oldHeight);
    setHeight(oldWidth);

    // 2. Rotate All Pins Mathematically (x' = oldHeight - y, y' = x)
    setPins((prevPins) =>
      prevPins.map((p) => ({
        ...p,
        x: Math.round((oldHeight - p.y) * 10) / 10,
        y: Math.round(p.x * 10) / 10,
      }))
    );

    // 3. Rotate Image Pixels on Offscreen Canvas
    const sourceImgUrl = imageDataUrl || rawImageDataUrl;
    if (sourceImgUrl) {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalHeight;
        canvas.height = img.naturalWidth;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((90 * Math.PI) / 180);
          ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
          const rotatedDataUrl = canvas.toDataURL('image/png');
          setImageDataUrl(rotatedDataUrl);
          setRawImageDataUrl(rotatedDataUrl);
          setOriginalImageSize({ width: img.naturalHeight, height: img.naturalWidth });
        }
      };
      img.src = sourceImgUrl;
    }

    // 4. Reset Image Offset
    setImageOffset({ x: 0, y: 0 });
  }, [width, height, imageDataUrl, rawImageDataUrl]);

  // Pin Dragging Mouse Event Listeners (UNCONSTRAINED - Can drag anywhere to match module pads!)
  useEffect(() => {
    if (!draggingPinId) return;

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

      setPins((prevPins) =>
        prevPins.map((p) =>
          p.id === draggingPinId ? { ...p, x: finalX, y: finalY } : p
        )
      );
    };

    const handleWindowMouseUp = () => {
      setDraggingPinId(null);
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
  ]);

  // Image Dragging Mouse Event Listeners (Moves ONLY image independently)
  useEffect(() => {
    if (!isDraggingImage) return;

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

      setImageOffset({ x: newX, y: newY });
    };

    const handleWindowMouseUp = () => {
      setIsDraggingImage(false);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [isDraggingImage, imageDragStart, zoom, snapToBreadboard, breadboardOffset.x, breadboardOffset.y]);

  // Handle Pin Mouse Down to start dragging pin
  const handlePinMouseDown = (e: React.MouseEvent, pinId: string) => {
    if (e.button !== 0) return; // Left click only
    e.stopPropagation();
    e.preventDefault();
    setSelectedPinId(pinId);
    setDraggingPinId(pinId);
  };

  // Handle Image Mouse Down to start dragging component image
  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if (toolMode === 'drag-image') {
      e.stopPropagation();
      e.preventDefault();
      setIsDraggingImage(true);
      setImageDragStart({
        mouseX: e.clientX,
        mouseY: e.clientY,
        startX: imageOffset.x,
        startY: imageOffset.y,
      });
    }
  };

  // Canvas click to add new pin (Unconstrained)
  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning || draggingPinId || isDraggingImage) return;
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

      setPins((prev) => [...prev, newPin]);
      setSelectedPinId(newId);
    }
  };

  // Selected Pin manipulation
  const selectedPin = pins.find((p) => p.id === selectedPinId);

  const updateSelectedPin = (fields: Partial<Pin>) => {
    if (!selectedPinId) return;
    setPins(
      pins.map((p) => {
        if (p.id === selectedPinId) {
          return { ...p, ...fields };
        }
        return p;
      })
    );
  };

  const deletePin = (id: string) => {
    const remaining = pins.filter((p) => p.id !== id);
    setPins(remaining);
    if (selectedPinId === id) {
      setSelectedPinId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // Micro-nudge pin with keyboard arrow keys
  const nudgePin = (dx: number, dy: number) => {
    if (!selectedPin) return;
    const newX = Math.round((selectedPin.x + dx) * 10) / 10;
    const newY = Math.round((selectedPin.y + dy) * 10) / 10;
    updateSelectedPin({ x: newX, y: newY });
  };

  // Keyboard navigation & Shortcuts (R / Space for Rotate, Arrows for Nudge)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (['input', 'textarea', 'select'].includes((e.target as HTMLElement)?.tagName.toLowerCase())) {
        return;
      }

      // Shortcut: R or Space to Rotate 90° Clockwise
      if (e.key === 'r' || e.key === 'R' || e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handleRotateClockwise();
        return;
      }

      const step = e.shiftKey ? 5.0 : e.altKey ? 0.1 : 1.0;

      if (toolMode === 'drag-image') {
        // Nudge image with arrow keys
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
        // Nudge pin with arrow keys
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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedPin, selectedPinId, toolMode, width, height, handleRotateClockwise]);

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

                    <button
                      onClick={handleMagicRemoveBackground}
                      disabled={isProcessingBg}
                      className="w-full py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {isProcessingBg ? 'Memproses...' : 'Hapus Background Luar'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Dimension, Rotation & Image Positioning Controls */}
            <div className="flex flex-col gap-2.5 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-200">2. Ukuran & Posisi Gambar</label>
                {/* Rotate 90 deg button */}
                <button
                  onClick={handleRotateClockwise}
                  className="px-2 py-1 rounded bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  title="Putar 90° Searah Jarum Jam (Shortcut: Tombol R atau Spasi)"
                >
                  <RotateCw className="w-3.5 h-3.5 text-sky-400" />
                  <span>Putar 90° (R)</span>
                </button>
              </div>

              {/* Width & Height */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400">Lebar (Width px)</span>
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => handleWidthChange(Number(e.target.value))}
                    step="1"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">Tinggi (Height px)</span>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => handleHeightChange(Number(e.target.value))}
                    step="1"
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
                    <span className="text-[10px] text-slate-400">Offset X (px)</span>
                    <input
                      type="number"
                      value={imageOffset.x}
                      onChange={(e) => setImageOffset({ ...imageOffset, x: Number(e.target.value) })}
                      step="0.5"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Offset Y (px)</span>
                    <input
                      type="number"
                      value={imageOffset.y}
                      onChange={(e) => setImageOffset({ ...imageOffset, y: Number(e.target.value) })}
                      step="0.5"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 font-mono"
                    />
                  </div>
                </div>

                {/* Micro Nudge Image Buttons */}
                <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400">Nudge Gambar:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => nudgeImage(-1.0, 0)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="Geser Gambar Kiri (-1px)"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => nudgeImage(0, -1.0)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="Geser Gambar Atas (-1px)"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => nudgeImage(0, 1.0)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="Geser Gambar Bawah (+1px)"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => nudgeImage(1.0, 0)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="Geser Gambar Kanan (+1px)"
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
              {/* Primary Tool Mode Switch & Rotate */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Segmented Control */}
                <div className="flex bg-slate-900/90 p-0.5 rounded-xl border border-slate-800 shadow-inner">
                  <button
                    onClick={() => setToolMode('select-pin')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
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
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      toolMode === 'drag-image'
                        ? 'bg-amber-400 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                    }`}
                    title="Geser Gambar Modul untuk dicocokkan ke pin / breadboard"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Geser Gambar</span>
                  </button>

                  <button
                    onClick={() => setToolMode('add-pin')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      toolMode === 'add-pin'
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
                    }`}
                    title="Klik kanvas untuk menambah pin baru"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Pin</span>
                  </button>
                </div>

                {/* Rotate Button */}
                <button
                  onClick={handleRotateClockwise}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/40 text-slate-300 hover:text-sky-300 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer"
                  title="Putar Komponen & Gambar 90° (Shortcut: Tombol R atau Spasi)"
                >
                  <RotateCw className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden sm:inline">Putar 90°</span>
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
                  title="Kunci posisi pin tepat di lubang breadboard (Pitch 17px)"
                >
                  <Magnet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Snap 17px</span>
                </button>

                {/* Pin Labels Toggle Button */}
                <button
                  onClick={() => setAlwaysShowLabels(!alwaysShowLabels)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all shadow-sm shrink-0 cursor-pointer ${
                    alwaysShowLabels
                      ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
                  }`}
                  title={alwaysShowLabels ? 'Label selalu tampil' : 'Label hanya tampil saat pin di-hover (Default)'}
                >
                  <Tag className="w-3.5 h-3.5 text-sky-400" />
                  <span>Label</span>
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
              className={`flex-1 overflow-hidden relative bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] ${
                toolMode === 'drag-image' ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
              }`}
              onMouseDown={(e) => {
                if (e.button === 1 || e.altKey) {
                  setIsPanning(true);
                  setStartPanPos({ x: e.clientX - pan.x, y: e.clientY - pan.y });
                } else if (toolMode === 'drag-image') {
                  handleImageMouseDown(e);
                }
              }}
              onMouseMove={(e) => {
                if (isPanning) {
                  setPan({ x: e.clientX - startPanPos.x, y: e.clientY - startPanPos.y });
                }
              }}
              onMouseUp={() => setIsPanning(false)}
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
                        toolMode === 'drag-image' ? 'cursor-grab active:cursor-grabbing hover:opacity-90' : ''
                      }`}
                      onMouseDown={handleImageMouseDown}
                    />
                  )}

                  {/* Render Pins with Live Grab & Drag (Free unconstrained positioning!) */}
                  {pins.map((pin) => {
                    const isSelected = pin.id === selectedPinId;
                    const isHovered = pin.id === hoveredPinId;
                    const isDragging = pin.id === draggingPinId;
                    const shouldShowLabel = isHovered || isSelected || isDragging || alwaysShowLabels;
                    const typeDef = PIN_TYPES.find((t) => t.type === pin.type) || PIN_TYPES[0];

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

                        {/* Pin Label Tag - SHOWN ONLY ON HOVER / SELECTION / DRAGGING (OR IF ALWAYS TOGGLE IS ON) */}
                        {shouldShowLabel && (
                          <g transform="translate(0, -13)" pointerEvents="none" className="transition-opacity duration-150">
                            <rect
                              x={-(pin.name.length * 3.5 + 6)}
                              y={-7}
                              width={pin.name.length * 7 + 12}
                              height={14}
                              rx={3.5}
                              fill="#020617"
                              fillOpacity={0.92}
                              stroke={isSelected ? '#38bdf8' : isHovered ? '#0ea5e9' : '#475569'}
                              strokeWidth={isSelected ? 1.5 : 1}
                            />
                            <text
                              x={0}
                              y={3.5}
                              fill="#f8fafc"
                              fontSize={8.5}
                              fontWeight="bold"
                              textAnchor="middle"
                              fontFamily="monospace"
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
                <Info className="w-3.5 h-3.5 text-sky-400" />
                <span>
                  <b>Drag:</b> Mouse • <b>Hover Pin:</b> Munculkan Label • <b>Putar 90°:</b> Tombol <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-sky-300 font-bold">R</kbd> atau <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 font-mono text-sky-300 font-bold">Spasi</kbd>
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
                  <span className="text-[10px] text-slate-400">Pitch (px)</span>
                  <input
                    type="number"
                    value={genPitch}
                    onChange={(e) => setGenPitch(Number(e.target.value))}
                    step="0.5"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 font-mono"
                  />
                </div>
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
                Generate Deretan Pin (17px)
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
                    <span className="text-[10px] text-slate-400">Koordinat X (px)</span>
                    <input
                      type="number"
                      value={selectedPin.x}
                      onChange={(e) => updateSelectedPin({ x: Number(e.target.value) })}
                      step="0.1"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400">Koordinat Y (px)</span>
                    <input
                      type="number"
                      value={selectedPin.y}
                      onChange={(e) => updateSelectedPin({ y: Number(e.target.value) })}
                      step="0.1"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 font-mono"
                    />
                  </div>
                </div>

                {/* Micro Nudge Buttons */}
                <div className="flex items-center justify-between bg-slate-950 p-2 rounded-lg border border-slate-800">
                  <span className="text-[10px] text-slate-400">Micro Nudge:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => nudgePin(-0.5, 0)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="Nudge Kiri (-0.5px)"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => nudgePin(0, -0.5)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="Nudge Atas (-0.5px)"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => nudgePin(0, 0.5)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="Nudge Bawah (+0.5px)"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => nudgePin(0.5, 0)}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                      title="Nudge Kanan (+0.5px)"
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
                        {pin.x.toFixed(1)}, {pin.y.toFixed(1)}
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
