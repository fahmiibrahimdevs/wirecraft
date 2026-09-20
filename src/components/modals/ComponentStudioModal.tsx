import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Pin, PinType, ComponentDefinition } from '../../types/circuit';
import {
  saveCustomComponent,
  optimizeImageForStorage,
  generateTypeScriptCode,
  exportComponentJson,
  rotateSvgDataUrl,
} from '../../utils/customComponents';
import { inferPinProfile } from '../../utils/pinInference';
import { showToast, showError } from '../../utils/alert';
import {
  Sliders,
  FolderOpen,
  Download,
  Copy,
  Check,
  Sparkles,
  X,
} from 'lucide-react';

import { StudioMetadataForm } from './studio/StudioMetadataForm';
import { StudioPinEditor } from './studio/StudioPinEditor';
import { StudioCanvasPreview } from './studio/StudioCanvasPreview';
import { removeImageBackground, autoCropImage } from './studio/studioImageUtils';

interface ComponentStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComponentSaved?: (typeId: string) => void;
  initialDefinition?: ComponentDefinition | null;
}

export const ComponentStudioModal: React.FC<ComponentStudioModalProps> = ({
  isOpen,
  onClose,
  onComponentSaved,
  initialDefinition,
}) => {
  // Measurement Unit: 'mm' (Physical Millimeters - Default) | 'px' (Canvas Pixels)
  const [unit, setUnit] = useState<'mm' | 'px'>('mm');

  // Image state
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

  // Dimension & Image Offset state
  const [width, setWidth] = useState<number>(200);
  const [height, setHeight] = useState<number>(150);
  const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(true);
  const [imageOffset, setImageOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Pins state & Hover state
  const [pins, setPins] = useState<Pin[]>([]);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
  const [alwaysShowLabels, setAlwaysShowLabels] = useState<boolean>(false);

  // Inline Canvas Quick Edit state
  const [inlineEditPinId, setInlineEditPinId] = useState<string | null>(null);
  const [inlinePinName, setInlinePinName] = useState<string>('');
  const [inlinePinDescription, setInlinePinDescription] = useState<string>('');
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const pinClickTrackerRef = useRef<{ id: string; time: number; clientX: number; clientY: number } | null>(null);

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
  const [breadboardOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Tool mode: 'smart' (Auto/Smart drag) | 'add-pin'
  const [toolMode, setToolMode] = useState<'smart' | 'add-pin'>('smart');
  const [linkPinsToImage, setLinkPinsToImage] = useState<boolean>(false);

  // Dragging states
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);
  const [isDraggingImage, setIsDraggingImage] = useState<boolean>(false);
  const [imageDragStart, setImageDragStart] = useState<{
    mouseX: number;
    mouseY: number;
    startX: number;
    startY: number;
    initialPins: Pin[];
    dragAll: boolean;
  }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
    initialPins: [],
    dragAll: false,
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

  // Refs for zero-lag drag handling
  const pinsRef = useRef<Pin[]>(pins);
  pinsRef.current = pins;
  const imageOffsetRef = useRef<{ x: number; y: number }>(imageOffset);
  imageOffsetRef.current = imageOffset;

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

  // Initialize studio state whenever modal opens or initialDefinition changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialDefinition) {
      const initW =
        initialDefinition.imageWidth && initialDefinition.imageHeight
          ? initialDefinition.imageWidth
          : initialDefinition.width || 200;
      const initH =
        initialDefinition.imageWidth && initialDefinition.imageHeight
          ? initialDefinition.imageHeight
          : initialDefinition.height || 150;
      const initPins = initialDefinition.pins
        ? JSON.parse(JSON.stringify(initialDefinition.pins))
        : [];
      const initOffset = initialDefinition.imageOffset
        ? { ...initialDefinition.imageOffset }
        : { x: 0, y: 0 };
      const initImg = (initialDefinition as any).imageUrl || '';

      setTypeId(initialDefinition.type);
      setName(initialDefinition.name);
      setCategory(initialDefinition.category || 'sensors');
      setDescription(initialDefinition.description || '');
      setWidth(initW);
      setHeight(initH);
      setPins(initPins);
      setImageOffset(initOffset);
      setImageDataUrl(initImg);
      setRawImageDataUrl(initImg);
      setSelectedPinId(null);
      setHoveredPinId(null);
      setInlineEditPinId(null);
      setZoom(1.8);
      setPan({ x: 0, y: 0 });

      const initSnap = {
        width: initW,
        height: initH,
        pins: initPins,
        imageOffset: initOffset,
        imageDataUrl: initImg,
        rawImageDataUrl: initImg,
      };
      setHistory([initSnap]);
      setHistoryIndex(0);
    } else {
      const freshSnap = {
        width: 200,
        height: 150,
        pins: [],
        imageOffset: { x: 0, y: 0 },
        imageDataUrl: '',
        rawImageDataUrl: '',
      };
      setTypeId('custom-module-1');
      setName('Modul Kustom Baru');
      setCategory('sensors');
      setDescription('Modul kustom terkalibrasi');
      setWidth(200);
      setHeight(150);
      setPins([]);
      setImageOffset({ x: 0, y: 0 });
      setImageDataUrl('');
      setRawImageDataUrl('');
      setSelectedPinId(null);
      setHoveredPinId(null);
      setInlineEditPinId(null);
      setZoom(1.8);
      setPan({ x: 0, y: 0 });

      setHistory([freshSnap]);
      setHistoryIndex(0);
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
        pins: override?.pins
          ? JSON.parse(JSON.stringify(override.pins))
          : JSON.parse(JSON.stringify(pins)),
        imageOffset: override?.imageOffset ? { ...override.imageOffset } : { ...imageOffset },
        imageDataUrl: override?.imageDataUrl !== undefined ? override.imageDataUrl : imageDataUrl,
        rawImageDataUrl:
          override?.rawImageDataUrl !== undefined ? override.rawImageDataUrl : rawImageDataUrl,
      };
      setHistory((prev) => {
        const next = prev.slice(0, historyIndex + 1);
        return [...next, snap];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [width, height, pins, imageOffset, imageDataUrl, rawImageDataUrl, historyIndex]
  );

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
      const rawX = (screenX - (pan.x + 120)) / zoom;
      const rawY = (screenY - (pan.y + 80)) / zoom;
      return { x: rawX, y: rawY };
    },
    [pan.x, pan.y, zoom]
  );

  // Snap to nearest 17.0px breadboard hole
  const snapCoordinate = useCallback(
    (coord: number, offset: number = 0): number => {
      if (!snapToBreadboard) return Math.round(coord * 10) / 10;
      const pitch = 17.0;
      const relative = coord - offset;
      const snapped = Math.round(relative / pitch) * pitch + offset;
      return Math.round(snapped * 10) / 10;
    },
    [snapToBreadboard]
  );

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
            svgText = decodeURIComponent(
              dataUrl.replace(/^data:image\/svg\+xml;?(charset=utf-8)?,?/, '')
            );
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
          // fallback
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

        const aspect = natW / natH;
        let initW = 200;
        let initH = Math.round((initW / aspect) * 10) / 10;

        if (initH > 260) {
          initH = 220;
          initW = Math.round((initH * aspect) * 10) / 10;
        }

        setWidth(initW);
        setHeight(initH);

        const baseName = file.name.replace(/\.[^/.]+$/, '').trim();
        if (typeId === 'custom-module-1' || !typeId) {
          const slug = baseName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
          setTypeId(slug || 'custom-module');
          setName(baseName.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleResetToOriginal = () => {
    if (rawImageDataUrl) {
      setImageDataUrl(rawImageDataUrl);
    }
  };

  const handleMagicRemoveBackground = async () => {
    const sourceImage = rawImageDataUrl || imageDataUrl;
    if (!sourceImage || isProcessingBg) return;
    setIsProcessingBg(true);

    try {
      const trimResult = await removeImageBackground(sourceImage, bgTolerance, bgAlgorithm);
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

  const handleAutoCropToContent = async () => {
    const source = imageDataUrl || rawImageDataUrl;
    if (!source) return;

    try {
      const trimResult = await autoCropImage(source);
      if (
        trimResult.cropW === originalImageSize.width &&
        trimResult.cropH === originalImageSize.height
      ) {
        return;
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
    } catch (err) {
      console.error('Auto crop failed:', err);
    }
  };

  const nudgeImage = (dx: number, dy: number) => {
    const newOffset = {
      x: Math.round((imageOffset.x + dx) * 10) / 10,
      y: Math.round((imageOffset.y + dy) * 10) / 10,
    };
    setImageOffset(newOffset);
    pushSnapshot({ imageOffset: newOffset });
  };

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

  const handleRotateClockwise = useCallback(
    (shouldRotatePins: boolean = true) => {
      const oldWidth = width;
      const oldHeight = height;

      const newW = oldHeight;
      const newH = oldWidth;
      setWidth(newW);
      setHeight(newH);

      const centerX = imageOffset.x + oldWidth / 2;
      const centerY = imageOffset.y + oldHeight / 2;
      const newOffsetX = Math.round((centerX - newW / 2) * 10) / 10;
      const newOffsetY = Math.round((centerY - newH / 2) * 10) / 10;
      const nextOffset = { x: newOffsetX, y: newOffsetY };
      setImageOffset(nextOffset);

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
    },
    [width, height, pins, imageOffset, imageDataUrl, rawImageDataUrl, pushSnapshot]
  );

  const handleRotateCounterClockwise = () => {
    handleRotateClockwise(true);
    handleRotateClockwise(true);
    handleRotateClockwise(true);
  };

  const handleAutoScaleAndSnapToBreadboard = useCallback(() => {
    if (pins.length === 0) {
      const newX = snapCoordinate(imageOffset.x, breadboardOffset.x % 17);
      const newY = snapCoordinate(imageOffset.y, breadboardOffset.y % 17);
      const nextOffset = { x: newX, y: newY };
      setImageOffset(nextOffset);
      pushSnapshot({ imageOffset: nextOffset });
      return;
    }

    if (pins.length === 1) {
      const p = pins[0];
      const targetX = snapCoordinate(p.x, breadboardOffset.x % 17);
      const targetY = snapCoordinate(p.y, breadboardOffset.y % 17);
      const diffX = targetX - p.x;
      const diffY = targetY - p.y;
      const nextOffset = {
        x: Math.round((imageOffset.x + diffX) * 10) / 10,
        y: Math.round((imageOffset.y + diffY) * 10) / 10,
      };
      const nextPins = [{ ...p, x: targetX, y: targetY }];
      setImageOffset(nextOffset);
      setPins(nextPins);
      pushSnapshot({ imageOffset: nextOffset, pins: nextPins });
      return;
    }

    const xs = pins.map((p) => p.x);
    const ys = pins.map((p) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = maxX - minX;
    const spanY = maxY - minY;

    let isHorizontalRow = spanX > 5 && (spanY <= 15 || spanX >= spanY * 1.5);
    let isVerticalRow = spanY > 5 && (spanX <= 15 || spanY >= spanX * 1.5);

    let newWidth = width;
    let newHeight = height;
    let newOffsetX = imageOffset.x;
    let newOffsetY = imageOffset.y;
    let newPins: Pin[] = [];

    const bbOffX = breadboardOffset.x % 17;
    const bbOffY = breadboardOffset.y % 17;

    if (isHorizontalRow) {
      const sortedByX = [...pins].sort((a, b) => a.x - b.x);
      const pinCount = sortedByX.length;
      const targetSpanX = (pinCount - 1) * 17.0;
      let scale = targetSpanX / Math.max(1, spanX);
      if (scale <= 0.02 || scale > 50 || !isFinite(scale)) scale = 1.0;

      newWidth = Math.max(10, Math.round(width * scale * 10) / 10);
      newHeight = Math.max(10, Math.round(height * scale * 10) / 10);

      const indexMap = new Map<string, number>();
      sortedByX.forEach((p, idx) => indexMap.set(p.id, idx));

      const firstPin = sortedByX[0];
      let startHoleX = snapCoordinate(firstPin.x, bbOffX);
      let startHoleY = snapCoordinate(firstPin.y, bbOffY);

      if (startHoleX < 34.0 || startHoleX > 530.0 || startHoleY < 30.0 || startHoleY > 320.0) {
        startHoleX = 68.0 + bbOffX;
        startHoleY = 136.0 + bbOffY;
      }

      const relFirstX = firstPin.x - imageOffset.x;
      const relFirstY = firstPin.y - imageOffset.y;
      newOffsetX = Math.round((startHoleX - relFirstX * scale) * 10) / 10;
      newOffsetY = Math.round((startHoleY - relFirstY * scale) * 10) / 10;

      newPins = pins.map((p) => {
        const idx = indexMap.get(p.id) ?? 0;
        return {
          ...p,
          x: Math.round((startHoleX + idx * 17.0) * 10) / 10,
          y: startHoleY,
        };
      });
    } else if (isVerticalRow) {
      const sortedByY = [...pins].sort((a, b) => a.y - b.y);
      const pinCount = sortedByY.length;
      const targetSpanY = (pinCount - 1) * 17.0;
      let scale = targetSpanY / Math.max(1, spanY);
      if (scale <= 0.02 || scale > 50 || !isFinite(scale)) scale = 1.0;

      newWidth = Math.max(10, Math.round(width * scale * 10) / 10);
      newHeight = Math.max(10, Math.round(height * scale * 10) / 10);

      const indexMap = new Map<string, number>();
      sortedByY.forEach((p, idx) => indexMap.set(p.id, idx));

      const firstPin = sortedByY[0];
      let startHoleX = snapCoordinate(firstPin.x, bbOffX);
      let startHoleY = snapCoordinate(firstPin.y, bbOffY);

      if (startHoleX < 34.0 || startHoleX > 530.0 || startHoleY < 30.0 || startHoleY > 320.0) {
        startHoleX = 68.0 + bbOffX;
        startHoleY = 68.0 + bbOffY;
      }

      const relFirstX = firstPin.x - imageOffset.x;
      const relFirstY = firstPin.y - imageOffset.y;
      newOffsetX = Math.round((startHoleX - relFirstX * scale) * 10) / 10;
      newOffsetY = Math.round((startHoleY - relFirstY * scale) * 10) / 10;

      newPins = pins.map((p) => {
        const idx = indexMap.get(p.id) ?? 0;
        return {
          ...p,
          x: startHoleX,
          y: Math.round((startHoleY + idx * 17.0) * 10) / 10,
        };
      });
    } else {
      const sortedPins = [...pins].sort((a, b) => a.x - b.x || a.y - b.y);
      let totalStepDist = 0;
      let stepCount = 0;
      for (let i = 0; i < sortedPins.length - 1; i++) {
        const d = Math.hypot(
          sortedPins[i + 1].x - sortedPins[i].x,
          sortedPins[i + 1].y - sortedPins[i].y
        );
        if (d > 3) {
          totalStepDist += d;
          stepCount++;
        }
      }
      const avgDist = stepCount > 0 ? totalStepDist / stepCount : 17.0;
      let scale = 17.0 / Math.max(1, avgDist);
      if (scale <= 0.02 || scale > 50 || !isFinite(scale)) scale = 1.0;

      newWidth = Math.max(10, Math.round(width * scale * 10) / 10);
      newHeight = Math.max(10, Math.round(height * scale * 10) / 10);

      const refPin = pins[0];
      let targetRefX = snapCoordinate(refPin.x, bbOffX);
      let targetRefY = snapCoordinate(refPin.y, bbOffY);

      if (targetRefX < 34.0 || targetRefX > 530.0 || targetRefY < 30.0 || targetRefY > 320.0) {
        targetRefX = 68.0 + bbOffX;
        targetRefY = 136.0 + bbOffY;
      }

      const relRefX = refPin.x - imageOffset.x;
      const relRefY = refPin.y - imageOffset.y;
      newOffsetX = Math.round((targetRefX - relRefX * scale) * 10) / 10;
      newOffsetY = Math.round((targetRefY - relRefY * scale) * 10) / 10;

      newPins = pins.map((p) => {
        const scaledX = targetRefX + (p.x - refPin.x) * scale;
        const scaledY = targetRefY + (p.y - refPin.y) * scale;
        return {
          ...p,
          x: snapCoordinate(scaledX, bbOffX),
          y: snapCoordinate(scaledY, bbOffY),
        };
      });
    }

    setWidth(newWidth);
    setHeight(newHeight);
    setImageOffset({ x: newOffsetX, y: newOffsetY });
    setPins(newPins);

    pushSnapshot({
      width: newWidth,
      height: newHeight,
      imageOffset: { x: newOffsetX, y: newOffsetY },
      pins: newPins,
    });
  }, [
    pins,
    width,
    height,
    imageOffset,
    snapCoordinate,
    breadboardOffset.x,
    breadboardOffset.y,
    pushSnapshot,
  ]);

  // Pin Dragging Window Listeners
  useEffect(() => {
    if (!draggingPinId) return;

    let finalPins = pinsRef.current;
    let rafId: number | null = null;
    let pendingCoords: { clientX: number; clientY: number; altKey: boolean } | null = null;

    const updatePinPosition = () => {
      rafId = null;
      if (!pendingCoords) return;
      const { clientX, clientY, altKey } = pendingCoords;
      const { x: rawX, y: rawY } = getLogicalCoords(clientX, clientY);
      let finalX = rawX;
      let finalY = rawY;

      const isSmoothMode = altKey;

      if (snapToBreadboard && !isSmoothMode) {
        finalX = snapCoordinate(rawX, breadboardOffset.x % 17);
        finalY = snapCoordinate(rawY, breadboardOffset.y % 17);
      } else {
        finalX = Math.round(rawX * 10) / 10;
        finalY = Math.round(rawY * 10) / 10;
      }

      setPins((prevPins) => {
        finalPins = prevPins.map((p) =>
          p.id === draggingPinId ? { ...p, x: finalX, y: finalY } : p
        );
        return finalPins;
      });
    };

    const handleWindowMouseMove = (e: MouseEvent) => {
      pendingCoords = { clientX: e.clientX, clientY: e.clientY, altKey: e.altKey };
      if (rafId === null) {
        rafId = requestAnimationFrame(updatePinPosition);
      }
    };

    const handleWindowMouseUp = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        updatePinPosition();
      }
      setDraggingPinId(null);
      pushSnapshot({ pins: finalPins });
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [
    draggingPinId,
    getLogicalCoords,
    snapToBreadboard,
    snapCoordinate,
    breadboardOffset.x,
    breadboardOffset.y,
    pushSnapshot,
  ]);

  // Image Dragging Window Listeners
  useEffect(() => {
    if (!isDraggingImage) return;

    let latestOffset = imageOffsetRef.current;
    let latestPins = pinsRef.current;
    let rafId: number | null = null;
    let pendingEvent: { clientX: number; clientY: number; altKey: boolean } | null = null;

    const updateImagePosition = () => {
      rafId = null;
      if (!pendingEvent) return;
      const { clientX, clientY, altKey } = pendingEvent;

      const deltaX = (clientX - imageDragStart.mouseX) / zoom;
      const deltaY = (clientY - imageDragStart.mouseY) / zoom;

      const isSmoothMode = altKey;

      let newX = imageDragStart.startX + deltaX;
      let newY = imageDragStart.startY + deltaY;
      let diffX = deltaX;
      let diffY = deltaY;

      if (imageDragStart.dragAll && imageDragStart.initialPins.length > 0) {
        const refPin =
          imageDragStart.initialPins.find((p) => p.id === selectedPinId) ||
          imageDragStart.initialPins[0];
        if (snapToBreadboard && !isSmoothMode && refPin) {
          const rawPinX = refPin.x + deltaX;
          const rawPinY = refPin.y + deltaY;
          const snappedPinX = snapCoordinate(rawPinX, breadboardOffset.x % 17);
          const snappedPinY = snapCoordinate(rawPinY, breadboardOffset.y % 17);
          diffX = snappedPinX - refPin.x;
          diffY = snappedPinY - refPin.y;
          newX = Math.round((imageDragStart.startX + diffX) * 10) / 10;
          newY = Math.round((imageDragStart.startY + diffY) * 10) / 10;
        } else {
          diffX = Math.round(deltaX * 10) / 10;
          diffY = Math.round(deltaY * 10) / 10;
          newX = Math.round((imageDragStart.startX + diffX) * 10) / 10;
          newY = Math.round((imageDragStart.startY + diffY) * 10) / 10;
        }

        latestPins = imageDragStart.initialPins.map((p) => ({
          ...p,
          x: Math.round((p.x + diffX) * 10) / 10,
          y: Math.round((p.y + diffY) * 10) / 10,
        }));
        setPins(latestPins);
      } else {
        if (snapToBreadboard && !isSmoothMode) {
          newX = snapCoordinate(newX, breadboardOffset.x % 17);
          newY = snapCoordinate(newY, breadboardOffset.y % 17);
        } else {
          newX = Math.round(newX * 10) / 10;
          newY = Math.round(newY * 10) / 10;
        }
      }

      latestOffset = { x: newX, y: newY };
      setImageOffset(latestOffset);
    };

    const handleWindowMouseMove = (e: MouseEvent) => {
      pendingEvent = { clientX: e.clientX, clientY: e.clientY, altKey: e.altKey };
      if (rafId === null) {
        rafId = requestAnimationFrame(updateImagePosition);
      }
    };

    const handleWindowMouseUp = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        updateImagePosition();
      }
      setIsDraggingImage(false);
      pushSnapshot({ imageOffset: latestOffset, pins: latestPins });
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [
    isDraggingImage,
    imageDragStart,
    zoom,
    snapToBreadboard,
    snapCoordinate,
    breadboardOffset.x,
    breadboardOffset.y,
    pushSnapshot,
    selectedPinId,
  ]);

  const handleCanvasWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

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

  const handleImageMouseDown = (e: React.MouseEvent, forceDragAll = false) => {
    if (e.button !== 0) return;
    if (toolMode === 'add-pin') return;
    e.stopPropagation();
    e.preventDefault();
    const shouldDragAll = forceDragAll || linkPinsToImage || e.shiftKey;
    setIsDraggingImage(true);
    setImageDragStart({
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: imageOffset.x,
      startY: imageOffset.y,
      initialPins: [...pins],
      dragAll: shouldDragAll,
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isPanning || draggingPinId || isDraggingImage || hasMovedPanRef.current) return;
    const { x: rawX, y: rawY } = getLogicalCoords(e.clientX, e.clientY);

    if (toolMode === 'add-pin') {
      let finalX = snapToBreadboard
        ? snapCoordinate(rawX, breadboardOffset.x % 17)
        : Math.round(rawX * 10) / 10;
      let finalY = snapToBreadboard
        ? snapCoordinate(rawY, breadboardOffset.y % 17)
        : Math.round(rawY * 10) / 10;

      if (e.shiftKey && pins.length > 0) {
        const refPin =
          (selectedPinId ? pins.find((p) => p.id === selectedPinId) : null) ||
          pins[pins.length - 1];
        if (refPin) {
          const dx = rawX - refPin.x;
          const dy = rawY - refPin.y;
          if (Math.abs(dx) >= Math.abs(dy)) {
            const signX = dx >= 0 ? 1 : -1;
            finalX = Math.round((refPin.x + signX * 17.0) * 10) / 10;
            finalY = refPin.y;
          } else {
            const signY = dy >= 0 ? 1 : -1;
            finalX = refPin.x;
            finalY = Math.round((refPin.y + signY * 17.0) * 10) / 10;
          }
          if (snapToBreadboard) {
            finalX = snapCoordinate(finalX, breadboardOffset.x % 17);
            finalY = snapCoordinate(finalY, breadboardOffset.y % 17);
          }
        }
      }

      const newId = `pin_${pins.length + 1}`;
      const newPinName = `Pin ${pins.length + 1}`;
      const profile = inferPinProfile(newPinName);
      const newPin: Pin = {
        id: newId,
        name: newPinName,
        x: finalX,
        y: finalY,
        type: profile.type,
        description: newPinName,
      };

      const nextPins = [...pins, newPin];
      setPins(nextPins);
      setSelectedPinId(newId);
      pushSnapshot({ pins: nextPins });
    } else {
      setSelectedPinId(null);
    }
  };

  const selectedPin = pins.find((p) => p.id === selectedPinId) || null;

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

  const applyPinNameChange = useCallback(
    (pinId: string, newName: string, explicitType?: PinType, explicitDesc?: string) => {
      const targetPin = pins.find((p) => p.id === pinId);
      if (!targetPin) return pins;
      const oldName = targetPin.name;
      const oldDesc = targetPin.description || '';
      const oldProfile = inferPinProfile(oldName);
      const newProfile = inferPinProfile(newName);

      let finalDescription = explicitDesc !== undefined ? explicitDesc : oldDesc;
      if (explicitDesc === undefined) {
        const isGenericOrAuto =
          !oldDesc ||
          /^Pin\s*\d+$/i.test(oldDesc.trim()) ||
          oldDesc.trim() === oldProfile.description.trim() ||
          oldDesc.startsWith('Terminal Pin ');
        finalDescription = isGenericOrAuto ? newProfile.description : oldDesc;
      }

      let nextType: PinType = targetPin.type;
      if (explicitType) {
        nextType = explicitType;
      } else if (newProfile.isConfident) {
        nextType = newProfile.type;
      } else if (!targetPin.type || targetPin.type === 'generic' || targetPin.type === 'digital') {
        nextType = newProfile.type;
      }

      const updatedPin: Pin = {
        ...targetPin,
        name: newName,
        type: nextType,
        description: finalDescription,
      };

      const nextPins = pins.map((p) => (p.id === pinId ? updatedPin : p));
      setPins(nextPins);
      return nextPins;
    },
    [pins]
  );

  const handlePinNameChange = (newName: string) => {
    if (!selectedPinId) return;
    const nextPins = applyPinNameChange(selectedPinId, newName);
    pushSnapshot({ pins: nextPins });
  };

  const startInlineEdit = useCallback(
    (pinId: string) => {
      const pin = pins.find((p) => p.id === pinId);
      if (!pin) return;
      const profile = inferPinProfile(pin.name);
      setSelectedPinId(pinId);
      setInlineEditPinId(pinId);
      setInlinePinName(pin.name);
      setInlinePinDescription(pin.description || profile.description || '');
      setTimeout(() => {
        inlineInputRef.current?.focus();
        inlineInputRef.current?.select();
      }, 50);
    },
    [pins]
  );

  const commitAndNavigateInlineEdit = useCallback(
    (direction: 'next' | 'prev' | 'close') => {
      if (!inlineEditPinId) return;
      const nextPins = applyPinNameChange(
        inlineEditPinId,
        inlinePinName,
        undefined,
        inlinePinDescription
      );
      pushSnapshot({ pins: nextPins });

      if (direction === 'close') {
        setInlineEditPinId(null);
        return;
      }

      const currentIndex = nextPins.findIndex((p) => p.id === inlineEditPinId);
      if (currentIndex === -1) {
        setInlineEditPinId(null);
        return;
      }

      let targetIndex = -1;
      if (direction === 'next') {
        if (currentIndex < nextPins.length - 1) {
          targetIndex = currentIndex + 1;
        } else {
          setInlineEditPinId(null);
          return;
        }
      } else if (direction === 'prev') {
        if (currentIndex > 0) {
          targetIndex = currentIndex - 1;
        } else {
          setInlineEditPinId(null);
          return;
        }
      }

      if (targetIndex >= 0 && targetIndex < nextPins.length) {
        const targetPin = nextPins[targetIndex];
        const profile = inferPinProfile(targetPin.name);
        setSelectedPinId(targetPin.id);
        setInlineEditPinId(targetPin.id);
        setInlinePinName(targetPin.name);
        setInlinePinDescription(targetPin.description || profile.description || '');
        setTimeout(() => {
          inlineInputRef.current?.focus();
          inlineInputRef.current?.select();
        }, 50);
      } else {
        setInlineEditPinId(null);
      }
    },
    [inlineEditPinId, inlinePinName, inlinePinDescription, applyPinNameChange, pushSnapshot]
  );

  const handlePinMouseDown = (e: React.MouseEvent, pinId: string) => {
    if (e.button !== 0) return;
    if (toolMode === 'add-pin') return;
    e.stopPropagation();
    e.preventDefault();

    const now = Date.now();
    const lastClick = pinClickTrackerRef.current;
    if (
      lastClick &&
      lastClick.id === pinId &&
      now - lastClick.time < 450 &&
      Math.hypot(e.clientX - lastClick.clientX, e.clientY - lastClick.clientY) < 15
    ) {
      pinClickTrackerRef.current = null;
      setDraggingPinId(null);
      setIsDraggingImage(false);
      startInlineEdit(pinId);
      return;
    }
    pinClickTrackerRef.current = { id: pinId, time: now, clientX: e.clientX, clientY: e.clientY };

    setSelectedPinId(pinId);
    setDraggingPinId(pinId);
  };

  const handleAutoFillPinProfile = () => {
    if (!selectedPin) return;
    const profile = inferPinProfile(selectedPin.name);
    updateSelectedPin({
      type: profile.type,
      description: profile.description,
    });
  };

  const handleAutoInferAllPins = () => {
    if (pins.length === 0) return;
    const nextPins = pins.map((p) => {
      const profile = inferPinProfile(p.name);
      const isGenericOrAuto =
        !p.description ||
        /^Pin\s*\d+$/i.test(p.description.trim()) ||
        p.description.startsWith('Terminal Pin ');
      return {
        ...p,
        type: profile.type,
        description: isGenericOrAuto ? profile.description : p.description,
      };
    });
    setPins(nextPins);
    pushSnapshot({ pins: nextPins });
  };

  const deletePin = (id: string) => {
    const remaining = pins.filter((p) => p.id !== id);
    setPins(remaining);
    if (selectedPinId === id) {
      setSelectedPinId(remaining.length > 0 ? remaining[0].id : null);
    }
    pushSnapshot({ pins: remaining });
  };

  const nudgePin = (dx: number, dy: number) => {
    if (!selectedPin) return;
    const newX = Math.round((selectedPin.x + dx) * 10) / 10;
    const newY = Math.round((selectedPin.y + dy) * 10) / 10;
    const nextPins = pins.map((p) => (p.id === selectedPinId ? { ...p, x: newX, y: newY } : p));
    setPins(nextPins);
    pushSnapshot({ pins: nextPins });
  };

  // Keyboard navigation & Shortcuts inside Studio
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (['input', 'textarea', 'select'].includes((e.target as HTMLElement)?.tagName.toLowerCase())) {
        return;
      }

      if (e.key === 'Alt' || (e.altKey && (e.key === 'Tab' || e.key === 'F4' || e.key.startsWith('F')))) {
        return;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isCmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

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

      if (isCmdOrCtrl && e.key.toLowerCase() === 'd') {
        if (selectedPinId) {
          const source = pins.find((p) => p.id === selectedPinId);
          if (source) {
            e.preventDefault();
            const newId = `pin_${pins.length + 1}`;
            let nextX = source.x + 17.0;
            let nextY = source.y;
            if (snapToBreadboard) {
              nextX = snapCoordinate(nextX, breadboardOffset.x % 17);
              nextY = snapCoordinate(nextY, breadboardOffset.y % 17);
            }

            const numMatch = source.name.match(/^(.*?)(\d+)$/);
            const nextName = numMatch
              ? `${numMatch[1]}${parseInt(numMatch[2], 10) + 1}`
              : `Pin ${pins.length + 1}`;

            const profile = inferPinProfile(nextName);
            const newPin: Pin = {
              id: newId,
              name: nextName,
              x: Math.round(nextX * 10) / 10,
              y: Math.round(nextY * 10) / 10,
              type: profile.isConfident ? profile.type : source.type,
              description: profile.isConfident ? profile.description : source.description,
            };

            const nextPins = [...pins, newPin];
            setPins(nextPins);
            setSelectedPinId(newId);
            pushSnapshot({ pins: nextPins });
          }
        }
        return;
      }

      if (isCmdOrCtrl) {
        return;
      }

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        const shouldRotatePins = !e.altKey;
        handleRotateClockwise(shouldRotatePins);
        return;
      }

      if (e.key === 'Tab' && pins.length > 0 && !inlineEditPinId) {
        e.preventDefault();
        const currentIndex = pins.findIndex((p) => p.id === selectedPinId);
        let nextIndex = 0;
        if (currentIndex === -1) {
          nextIndex = e.shiftKey ? pins.length - 1 : 0;
        } else {
          nextIndex = e.shiftKey
            ? (currentIndex - 1 + pins.length) % pins.length
            : (currentIndex + 1) % pins.length;
        }
        setSelectedPinId(pins[nextIndex].id);
        return;
      }

      if ((e.key === 'Enter' || e.key === 'F2') && selectedPinId && !inlineEditPinId) {
        e.preventDefault();
        startInlineEdit(selectedPinId);
        return;
      }

      if (!isCmdOrCtrl && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        setIsSpacePressed(true);
        return;
      }

      const step = e.shiftKey ? 17.0 : e.altKey ? 0.1 : 0.5;

      if (selectedPin) {
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
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setSelectedPinId(null);
        }
      } else {
        const isAll = linkPinsToImage;
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (isAll) nudgeAll(0, -step);
          else nudgeImage(0, -step);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (isAll) nudgeAll(0, step);
          else nudgeImage(0, step);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (isAll) nudgeAll(-step, 0);
          else nudgeImage(-step, 0);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (isAll) nudgeAll(step, 0);
          else nudgeImage(step, 0);
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
    inlineEditPinId,
    startInlineEdit,
    linkPinsToImage,
    handleRotateClockwise,
    handleUndo,
    handleRedo,
    pins,
    snapToBreadboard,
    snapCoordinate,
    breadboardOffset.x,
    breadboardOffset.y,
    pushSnapshot,
  ]);

  // Global mouse listeners for panning
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
    const startX = selectedPin ? selectedPin.x : imageOffset.x + 17.0;
    const startY = selectedPin ? selectedPin.y : imageOffset.y + 17.0;

    const newGeneratedPins: Pin[] = [];
    for (let i = 0; i < genCount; i++) {
      const px = genOrientation === 'horizontal' ? startX + i * genPitch : startX;
      const py = genOrientation === 'vertical' ? startY + i * genPitch : startY;
      const pinName = `${genPrefix.toUpperCase()}${i + 1}`;
      const inferred = inferPinProfile(pinName);

      newGeneratedPins.push({
        id: `${genPrefix}_${i + 1}`,
        name: pinName,
        x: Math.round(px * 10) / 10,
        y: Math.round(py * 10) / 10,
        type: inferred.type,
        description: inferred.description || `Header Pin ${i + 1}`,
      });
    }

    setPins([...pins, ...newGeneratedPins]);
    if (newGeneratedPins.length > 0) {
      setSelectedPinId(newGeneratedPins[0].id);
    }
  };

  const getNormalizedDefinition = (): ComponentDefinition => {
    const cleanTypeId = typeId.trim().toLowerCase().replace(/\s+/g, '-');

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
      imageOffset: normOffset.x !== 0 || normOffset.y !== 0 ? normOffset : undefined,
      imageWidth: width,
      imageHeight: height,
      isCustom: true,
    };
  };

  const handleSaveComponent = async () => {
    const definition = getNormalizedDefinition();
    let imgToSave = imageDataUrl;
    if (imgToSave) {
      imgToSave = await optimizeImageForStorage(imgToSave, 2400);
    }
    const res = saveCustomComponent(definition, imgToSave);
    if (res.success) {
      setSaveSuccess(true);
      showToast('success', `Komponen "${definition.name}" berhasil disimpan ke Library!`);
      onComponentSaved?.(definition.type);
      setTimeout(() => setSaveSuccess(false), 3500);
    } else {
      showError(
        'Gagal Menyimpan Komponen',
        res.error || 'Memori browser penuh atau data tidak valid.'
      );
    }
  };

  const handleCopyCode = () => {
    const definition = getNormalizedDefinition();
    const code = generateTypeScriptCode(definition, `${definition.type.replace(/-/g, '_')}.png`);
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    showToast('success', 'Kode TypeScript berhasil disalin ke clipboard!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

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
            showToast('success', `Definisi komponen "${def.name}" berhasil diimpor!`);
          }
        } catch (err) {
          console.error('Failed to import json:', err);
          showError('Gagal Impor JSON', 'Format file JSON komponen tidak valid.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md select-none overflow-hidden animate-in fade-in duration-200">
      <div className="flex flex-col w-[96vw] h-[94vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Top Bar */}
        <div className="h-14 bg-slate-50 dark:bg-slate-950/90 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 dark:bg-sky-500/20 dark:border-sky-500/40 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                WireCraft Component Studio
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  Admin Mode
                </span>
              </h2>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Visual Pin Calibrator & Breadboard Alignment Studio
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={jsonInputRef}
              onChange={handleImportJsonFile}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => jsonInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Buka File JSON Komponen"
            >
              <FolderOpen className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Import JSON</span>
            </button>

            <button
              onClick={() => exportComponentJson(typeId)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Export Definisi JSON Komponen"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-slate-700 dark:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copy TypeScript Definition Code"
            >
              {copiedCode ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              )}
              {copiedCode ? 'Tersalin!' : 'Copy TS Code'}
            </button>

            <button
              onClick={handleSaveComponent}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
                saveSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-500/30'
                  : 'bg-sky-600 hover:bg-sky-500 text-white dark:bg-sky-500 dark:hover:bg-sky-400 dark:text-slate-950 shadow-sky-500/25'
              }`}
            >
              {saveSuccess ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              {saveSuccess ? 'Tersimpan di Library!' : 'Simpan ke Library'}
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-400 dark:hover:text-slate-100 flex items-center justify-center transition-colors ml-2 cursor-pointer"
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
              <span className="text-xs font-bold text-emerald-100">
                Komponen Berhasil Disimpan!
              </span>
              <span className="text-[11px] text-emerald-300/80">
                Telah masuk ke <b>Katalog Komponen (Tab &apos;Custom Studio&apos;)</b> dan
                ditambahkan ke kanvas.
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

        {/* Main Studio Workspace (3 Modular Columns) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Column 1: Metadata Form */}
          <StudioMetadataForm
            typeId={typeId}
            setTypeId={setTypeId}
            name={name}
            setName={setName}
            category={category}
            setCategory={setCategory}
            description={description}
            setDescription={setDescription}
            icon={icon}
            setIcon={setIcon}
            width={width}
            setWidth={setWidth}
            height={height}
            setHeight={setHeight}
            unit={unit}
            setUnit={setUnit}
            lockAspectRatio={lockAspectRatio}
            setLockAspectRatio={setLockAspectRatio}
            imageOffset={imageOffset}
            setImageOffset={setImageOffset}
            linkPinsToImage={linkPinsToImage}
            setLinkPinsToImage={setLinkPinsToImage}
            imageDataUrl={imageDataUrl}
            rawImageDataUrl={rawImageDataUrl}
            originalImageSize={originalImageSize}
            bgTolerance={bgTolerance}
            setBgTolerance={setBgTolerance}
            bgAlgorithm={bgAlgorithm}
            setBgAlgorithm={setBgAlgorithm}
            isProcessingBg={isProcessingBg}
            fileInputRef={fileInputRef}
            onFileUpload={handleFileUpload}
            onResetToOriginal={handleResetToOriginal}
            onMagicRemoveBackground={handleMagicRemoveBackground}
            onAutoCropToContent={handleAutoCropToContent}
            onRotateClockwise={() => handleRotateClockwise(true)}
            onRotateCounterClockwise={handleRotateCounterClockwise}
            nudgeImage={nudgeImage}
            nudgeAll={nudgeAll}
          />

          {/* Column 2: Center Interactive Canvas Preview */}
          <StudioCanvasPreview
            canvasRef={canvasRef}
            inlineInputRef={inlineInputRef}
            width={width}
            height={height}
            unit={unit}
            imageOffset={imageOffset}
            imageDataUrl={imageDataUrl}
            pins={pins}
            selectedPinId={selectedPinId}
            setSelectedPinId={setSelectedPinId}
            hoveredPinId={hoveredPinId}
            setHoveredPinId={setHoveredPinId}
            draggingPinId={draggingPinId}
            alwaysShowLabels={alwaysShowLabels}
            setAlwaysShowLabels={setAlwaysShowLabels}
            toolMode={toolMode}
            setToolMode={setToolMode}
            linkPinsToImage={linkPinsToImage}
            setLinkPinsToImage={setLinkPinsToImage}
            zoom={zoom}
            setZoom={setZoom}
            pan={pan}
            setPan={setPan}
            isPanning={isPanning}
            setIsPanning={setIsPanning}
            setStartPanPos={setStartPanPos}
            isSpacePressed={isSpacePressed}
            hasMovedPanRef={hasMovedPanRef}
            showBreadboard={showBreadboard}
            setShowBreadboard={setShowBreadboard}
            breadboardType={breadboardType}
            setBreadboardType={setBreadboardType}
            breadboardOpacity={breadboardOpacity}
            setBreadboardOpacity={setBreadboardOpacity}
            snapToBreadboard={snapToBreadboard}
            setSnapToBreadboard={setSnapToBreadboard}
            breadboardOffset={breadboardOffset}
            inlineEditPinId={inlineEditPinId}
            inlinePinName={inlinePinName}
            setInlinePinName={setInlinePinName}
            inlinePinDescription={inlinePinDescription}
            setInlinePinDescription={setInlinePinDescription}
            historyIndex={historyIndex}
            historyLength={history.length}
            handleUndo={handleUndo}
            handleRedo={handleRedo}
            handleRotateClockwise={handleRotateClockwise}
            handleAutoScaleAndSnapToBreadboard={handleAutoScaleAndSnapToBreadboard}
            handleCanvasWheel={handleCanvasWheel}
            handleCanvasClick={handleCanvasClick}
            handleImageMouseDown={handleImageMouseDown}
            handlePinMouseDown={handlePinMouseDown}
            startInlineEdit={startInlineEdit}
            commitAndNavigateInlineEdit={commitAndNavigateInlineEdit}
            applyPinNameChange={applyPinNameChange}
          />

          {/* Column 3: Right Pin Editor & Multi-Pin Generator */}
          <StudioPinEditor
            pins={pins}
            setPins={setPins}
            selectedPin={selectedPin}
            selectedPinId={selectedPinId}
            setSelectedPinId={setSelectedPinId}
            setHoveredPinId={setHoveredPinId}
            unit={unit}
            genCount={genCount}
            setGenCount={setGenCount}
            genPitch={genPitch}
            setGenPitch={setGenPitch}
            genOrientation={genOrientation}
            setGenOrientation={setGenOrientation}
            genPrefix={genPrefix}
            setGenPrefix={setGenPrefix}
            onGeneratePinRow={handleGeneratePinRow}
            updateSelectedPin={updateSelectedPin}
            deletePin={deletePin}
            startInlineEdit={startInlineEdit}
            handlePinNameChange={handlePinNameChange}
            handleAutoFillPinProfile={handleAutoFillPinProfile}
            handleAutoInferAllPins={handleAutoInferAllPins}
            nudgePin={nudgePin}
          />
        </div>
      </div>
    </div>
  );
};
