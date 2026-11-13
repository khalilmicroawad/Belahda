import { supabase, SUPABASE_ANON_KEY, uploadFileToStorage } from './supabase';

export const THUMBNAILS_BUCKET = 'thumbnails';
export const IMAGEKIT_AUTH_EDGE_FUNCTION_URL =
  'https://yzseuychjsojkkqbtbjn.supabase.co/functions/v1/super-handler';
export const MAX_IMAGEKIT_BYTES = 200 * 1024; // 200 KB (204,800 bytes)

const FALLBACK_IMAGEKIT_PUBLIC_KEY =
  (import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || 'public_HJ3wn0Ex39GhLrpce0EytngSxlA=').trim();
const FALLBACK_IMAGEKIT_URL_ENDPOINT =
  (import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/Belahda').trim();

export interface DualUploadResult {
  thumbnailUrl: string;
  fullImageUrl: string;
  thumbnailSizeKB: number;
  fullImageSizeKB: number;
  usedImageKit: boolean;
}

/**
 * Generates a lightweight <= 300px WebP/JPEG thumbnail (< 30KB) in the browser using HTML5 Canvas.
 */
export async function generateClientThumbnail(
  file: File | Blob,
  maxDim = 300,
  targetMaxBytes = 30 * 1024
): Promise<Blob> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (err) => reject(err);
      image.src = objectUrl;
    });

    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;

    if (width > maxDim || height > maxDim) {
      if (width >= height) {
        height = Math.max(1, Math.round((height * maxDim) / width));
        width = maxDim;
      } else {
        width = Math.max(1, Math.round((width * maxDim) / height));
        height = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    ctx.drawImage(img, 0, 0, width, height);

    const exportBlob = (mime: string, quality: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, quality));

    // Try WebP first at 70% quality, fall back to JPEG if WebP isn't supported
    let quality = 0.7;
    let mimeType = 'image/webp';
    let blob = await exportBlob(mimeType, quality);

    if (!blob || blob.type !== 'image/webp') {
      mimeType = 'image/jpeg';
      blob = await exportBlob(mimeType, quality);
    }

    // Ensure final file size stays under 30KB
    while (blob && blob.size > targetMaxBytes && quality > 0.3) {
      quality = Number((quality - 0.1).toFixed(2));
      blob = await exportBlob(mimeType, quality);
    }

    if (!blob) throw new Error('Failed to compress thumbnail');
    return blob;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Uploads the lightweight thumbnail to Supabase Storage (`thumbnails` bucket) and verifies public URL.
 */
export async function uploadThumbnailToSupabase(thumbnailBlob: Blob): Promise<string> {
  const ext = thumbnailBlob.type === 'image/webp' ? 'webp' : 'jpg';
  const filePath = `thumb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: thumbErr } = await supabase.storage
    .from(THUMBNAILS_BUCKET)
    .upload(filePath, thumbnailBlob, {
      cacheControl: '31536000',
      upsert: true,
      contentType: thumbnailBlob.type || 'image/webp',
    });

  if (thumbErr) {
    // Only fall back to app-uploads if the thumbnails bucket itself doesn't exist
    const msg = thumbErr.message || '';
    if (msg.toLowerCase().includes('bucket') && msg.toLowerCase().includes('not found')) {
      const fallbackUrl = await uploadFileToStorage(thumbnailBlob, 'listings', `thumbnails/${filePath}`);
      if (fallbackUrl && fallbackUrl.startsWith('http')) {
        return fallbackUrl;
      }
    }
    throw new Error(`Supabase Thumbnail Upload Failed: ${thumbErr.message}`);
  }

  const { data } = supabase.storage.from(THUMBNAILS_BUCKET).getPublicUrl(filePath);
  if (!data?.publicUrl || !data.publicUrl.startsWith('http')) {
    throw new Error('Supabase Storage failed to return a valid public thumbnail URL.');
  }
  return data.publicUrl;
}

/**
 * Compresses and resizes an image in the browser via HTML5 <canvas> before ImageKit upload:
 * - Starts at max 1280px and JPEG 0.85 quality
 * - Iteratively lowers quality (0.85 -> 0.7 -> 0.55 -> 0.4 -> 0.3) and scales dimensions if needed
 * - Guarantees final Blob is strictly under 200 KB (204,800 bytes) and converts back to a `.jpg` File
 */
export async function compressImageForImageKit(
  file: File | Blob,
  fileName?: string,
  maxBytes = MAX_IMAGEKIT_BYTES
): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (err) => reject(err);
      image.src = objectUrl;
    });

    const natW = img.naturalWidth || img.width || 1280;
    const natH = img.naturalHeight || img.height || 960;

    // Initial dimensions capped at 1280px on longest side
    let maxDim = 1280;
    let width = natW;
    let height = natH;
    if (width > maxDim || height > maxDim) {
      if (width >= height) {
        height = Math.max(1, Math.round((height * maxDim) / width));
        width = maxDim;
      } else {
        width = Math.max(1, Math.round((width * maxDim) / height));
        height = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    const renderAndExport = (w: number, h: number, quality: number) =>
      new Promise<Blob | null>((resolve) => {
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
        }
        canvas.toBlob(resolve, 'image/jpeg', quality);
      });

    const drawDimensions = (w: number, h: number) => {
      canvas.width = w;
      canvas.height = h;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
    };

    const qualitySteps = [0.85, 0.7, 0.55, 0.4, 0.3];
    let finalBlob: Blob | null = null;

    // Iteratively compress & downscale dimensions until strictly under 200 KB (204,800 bytes)
    for (let scalePass = 0; scalePass < 6; scalePass++) {
      drawDimensions(width, height);
      const passQualities = scalePass === 0 ? qualitySteps : [0.7, 0.55, 0.4, 0.3];

      for (const quality of passQualities) {
        const candidate = await renderAndExport(width, height, quality);
        if (candidate) {
          finalBlob = candidate;
          if (candidate.size < maxBytes) {
            break;
          }
        }
      }

      if (finalBlob && finalBlob.size < maxBytes) {
        break;
      }

      // Scale down dimensions by 25% for next pass
      width = Math.max(160, Math.round(width * 0.75));
      height = Math.max(160, Math.round(height * 0.75));
    }

    if (!finalBlob) {
      throw new Error('Failed to compress image via HTML5 Canvas.');
    }
    if (finalBlob.size >= maxBytes) {
      throw new Error(`Compressed image (${Math.round(finalBlob.size / 1024)} KB) still exceeds 200 KB limit.`);
    }

    const rawName = fileName || (file instanceof File ? file.name : `product-${Date.now()}`);
    const baseName = rawName.replace(/\.[^/.]+$/, '') || `product-${Date.now()}`;
    return new File([finalBlob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Compresses every image in the browser to < 200 KB (.jpg File),
 * fetches ImageKit upload signature ({ token, expire, signature }) from the Supabase Edge Function,
 * and uploads the compressed file directly to ImageKit.io.
 */
export async function uploadFullImageToImageKit(
  originalFile: File | Blob,
  fileName?: string
): Promise<{ url: string; usedImageKit: boolean; compressedSizeKB: number }> {
  const compressedFile = await compressImageForImageKit(originalFile, fileName);
  const compressedSizeKB = Math.round((compressedFile.size / 1024) * 10) / 10;

  const { data: sessionData } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
  const bearerToken = sessionData?.session?.access_token || SUPABASE_ANON_KEY;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${bearerToken}`,
  };

  let authRes: Response;
  try {
    authRes = await fetch(IMAGEKIT_AUTH_EDGE_FUNCTION_URL, {
      method: 'GET',
      cache: 'no-store',
      headers,
    });
    if (authRes.status === 405) {
      authRes = await fetch(IMAGEKIT_AUTH_EDGE_FUNCTION_URL, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });
    }
  } catch (networkErr: any) {
    throw new Error(
      `ImageKit Auth Network Error: ${networkErr?.message || 'Unable to reach Supabase Edge Function super-handler'}`
    );
  }

  const contentType = (authRes.headers.get('content-type') || '').toLowerCase();
  const rawBody = await authRes.text();

  let authData: any = {};
  try {
    authData = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    const looksLikeHtml = contentType.includes('text/html') || rawBody.trim().startsWith('<');
    if (looksLikeHtml) {
      throw new Error(
        `Supabase Edge Function (${IMAGEKIT_AUTH_EDGE_FUNCTION_URL}) returned HTML instead of JSON (HTTP ${authRes.status}).`
      );
    }
    throw new Error(
      `ImageKit Auth Edge Function returned invalid JSON (HTTP ${authRes.status}): ${rawBody.slice(0, 120)}`
    );
  }

  if (!authRes.ok || !authData?.token || !authData?.expire || !authData?.signature) {
    const serverMsg = authData?.error || authData?.message;
    throw new Error(
      serverMsg
        ? `ImageKit Auth Error (HTTP ${authRes.status}): ${serverMsg}`
        : `ImageKit Auth Failed (HTTP ${authRes.status}): Edge Function did not return { token, expire, signature }.`
    );
  }

  const publicKey = String(authData.publicKey || FALLBACK_IMAGEKIT_PUBLIC_KEY || '').trim();
  const urlEndpoint = String(authData.urlEndpoint || FALLBACK_IMAGEKIT_URL_ENDPOINT || '').trim();

  if (!publicKey) {
    throw new Error('ImageKit publicKey is missing (neither returned by Edge Function nor set in VITE_IMAGEKIT_PUBLIC_KEY).');
  }

  const formData = new FormData();
  formData.append('file', compressedFile);
  formData.append('fileName', compressedFile.name);
  formData.append('publicKey', publicKey);
  formData.append('signature', String(authData.signature));
  formData.append('expire', String(authData.expire));
  formData.append('token', String(authData.token));
  formData.append('useUniqueFileName', 'true');
  formData.append('folder', '/souq-listings');

  let uploadRes: Response;
  try {
    uploadRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      body: formData,
    });
  } catch (netErr: any) {
    throw new Error(`ImageKit Upload Network Error: ${netErr?.message || 'Connection failed'}`);
  }

  const uploadJson = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok || (!uploadJson?.url && !uploadJson?.filePath)) {
    throw new Error(
      `ImageKit Upload Failed (HTTP ${uploadRes.status}): ${uploadJson?.message || uploadJson?.help || 'Invalid response from ImageKit'}`
    );
  }

  let finalUrl = uploadJson?.url ? String(uploadJson.url) : '';
  if (!finalUrl && uploadJson?.filePath && urlEndpoint) {
    const baseEndpoint = urlEndpoint.replace(/\/+$/, '');
    const relPath = String(uploadJson.filePath).replace(/^\/+/, '');
    finalUrl = `${baseEndpoint}/${relPath}`;
  }

  if (!finalUrl.startsWith('http')) {
    throw new Error('ImageKit Upload did not return a valid public image URL.');
  }

  return { url: finalUrl, usedImageKit: true, compressedSizeKB };
}

/**
 * Complete dual-upload workflow:
 * 1. Generates <= 300px (<30KB) thumbnail in browser for Supabase Storage.
 * 2. Compresses ImageKit image to <= 1280px (<200KB .jpg File) in browser and uploads both in parallel.
 */
export async function performDualProductImageUpload(
  originalFile: File | Blob
): Promise<DualUploadResult> {
  const thumbnailBlob = await generateClientThumbnail(originalFile);
  const thumbnailSizeKB = Math.round((thumbnailBlob.size / 1024) * 10) / 10;

  const fileName = originalFile instanceof File ? originalFile.name : `camera-${Date.now()}.jpg`;

  const [thumbnailUrl, fullUpload] = await Promise.all([
    uploadThumbnailToSupabase(thumbnailBlob),
    uploadFullImageToImageKit(originalFile, fileName),
  ]);

  return {
    thumbnailUrl,
    fullImageUrl: fullUpload.url,
    thumbnailSizeKB,
    fullImageSizeKB: fullUpload.compressedSizeKB,
    usedImageKit: fullUpload.usedImageKit,
  };
}
