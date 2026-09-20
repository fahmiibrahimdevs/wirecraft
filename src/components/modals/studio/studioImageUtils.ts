export interface TrimCanvasResult {
  trimmedDataUrl: string;
  cropX: number;
  cropY: number;
  cropW: number;
  cropH: number;
  originalW: number;
  originalH: number;
}

/**
 * Trim transparent outer margins from a canvas to wrap content bounds tightly.
 */
export function trimCanvasTransparent(
  canvas: HTMLCanvasElement,
  alphaThreshold = 15
): TrimCanvasResult {
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
  if (
    maxX < minX ||
    maxY < minY ||
    (minX === 0 && minY === 0 && maxX === W - 1 && maxY === H - 1)
  ) {
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
}

/**
 * Remove image background using flood-fill (edge-preserving) or global chroma keying.
 */
export function removeImageBackground(
  sourceImage: string,
  tolerance: number,
  algorithm: 'flood-fill' | 'global'
): Promise<TrimCanvasResult> {
  return new Promise((resolve, reject) => {
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
          reject(new Error('Canvas 2D context unavailable'));
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

        const maxDist = (tolerance / 100) * 441.67;
        const fadeRange = maxDist * 0.22;

        const checkIsBg = (r: number, g: number, b: number, a: number) => {
          if (a === 0) return true;
          const distCorner = Math.sqrt((r - bgR) ** 2 + (g - bgG) ** 2 + (b - bgB) ** 2);
          const distWhite = Math.sqrt((r - 255) ** 2 + (g - 255) ** 2 + (b - 255) ** 2);
          return Math.min(distCorner, distWhite) <= maxDist;
        };

        if (algorithm === 'flood-fill') {
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
              visited[idx] = 2;
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
        const trimResult = trimCanvasTransparent(canvas, 15);
        resolve(trimResult);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (e) => reject(e);
    img.src = sourceImage;
  });
}

/**
 * Auto-crops transparent boundaries from image.
 */
export function autoCropImage(sourceImage: string): Promise<TrimCanvasResult> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(trimCanvasTransparent(canvas, 15));
    };
    img.onerror = (e) => reject(e);
    img.src = sourceImage;
  });
}
