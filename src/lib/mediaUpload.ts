import { supabase, SUPABASE_BUCKET, uploadFileToStorage } from './supabase';

export const THUMBNAILS_BUCKET = 'thumbnails';

export interface DualUploadResult {
  thumbnailUrl: string;
  fullImageUrl: string;
  thumbnailSizeKB: number;
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
 * Uploads the untouched full-resolution original file directly to ImageKit.io using /api/imagekit-auth signature.
 * Verifies a valid ImageKit URL is returned; throws exact cause error on auth or upload failure.
 */
export async function uploadFullImageToImageKit(
  originalFile: File | Blob,
  fileName?: string
): Promise<{ url: string; usedImageKit: boolean }> {
  let authRes: Response;
  try {
    authRes = await fetch('/api/imagekit-auth', {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });
  } catch (networkErr: any) {
    throw new Error(`ImageKit Auth Network Error: ${networkErr?.message || 'Unable to reach /api/imagekit-auth'}`);
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
        `ImageKit Auth Endpoint (/api/imagekit-auth) returned HTML instead of JSON (HTTP ${authRes.status}). Make sure the backend Express server is running and updated.`
      );
    }
    throw new Error(
      `ImageKit Auth Endpoint returned invalid JSON (HTTP ${authRes.status}): ${rawBody.slice(0, 120)}`
    );
  }

  if (
    !authRes.ok ||
    !authData?.token ||
    !authData?.expire ||
    !authData?.signature ||
    !authData?.publicKey ||
    !authData?.urlEndpoint
  ) {
    const missingList = Array.isArray(authData?.missing) && authData.missing.length > 0
      ? `Missing Secrets on server: ${authData.missing.join(', ')}`
      : '';
    throw new Error(
      authData?.error ||
        missingList ||
        `ImageKit Auth Failed (HTTP ${authRes.status}): Server did not return { token, expire, signature, publicKey, urlEndpoint }.`
    );
  }

  const formData = new FormData();
  const safeName =
    fileName ||
    (originalFile instanceof File ? originalFile.name : `product-${Date.now()}.jpg`);

  formData.append('file', originalFile);
  formData.append('fileName', safeName);
  formData.append('publicKey', String(authData.publicKey));
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
  if (!uploadRes.ok || !uploadJson?.url || !String(uploadJson.url).startsWith('http')) {
    throw new Error(
      `ImageKit Upload Failed (HTTP ${uploadRes.status}): ${uploadJson?.message || uploadJson?.help || 'Invalid response from ImageKit'}`
    );
  }

  // Ensure URL aligns with configured urlEndpoint when ImageKit returns filePath
  let finalUrl = String(uploadJson.url);
  if (!finalUrl && uploadJson?.filePath) {
    const baseEndpoint = String(authData.urlEndpoint).replace(/\/+$/, '');
    const relPath = String(uploadJson.filePath).replace(/^\/+/, '');
    finalUrl = `${baseEndpoint}/${relPath}`;
  }

  return { url: finalUrl, usedImageKit: true };
}

/**
 * Complete dual-upload workflow:
 * 1. Generates <= 300px (<30KB) thumbnail in browser.
 * 2. Uploads thumbnail to Supabase Storage & original full-res image to ImageKit.io in parallel via Promise.all.
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
    usedImageKit: fullUpload.usedImageKit,
  };
}
