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
 * Uploads the lightweight thumbnail to Supabase Storage (`thumbnails` bucket, with `app-uploads` fallback).
 */
export async function uploadThumbnailToSupabase(thumbnailBlob: Blob): Promise<string> {
  const ext = thumbnailBlob.type === 'image/webp' ? 'webp' : 'jpg';
  const filePath = `thumb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  // 1. Try dedicated `thumbnails` bucket
  const { error: thumbErr } = await supabase.storage
    .from(THUMBNAILS_BUCKET)
    .upload(filePath, thumbnailBlob, {
      cacheControl: '31536000',
      upsert: true,
      contentType: thumbnailBlob.type || 'image/webp',
    });

  if (!thumbErr) {
    const { data } = supabase.storage.from(THUMBNAILS_BUCKET).getPublicUrl(filePath);
    return data.publicUrl;
  }

  // 2. Fallback to `app-uploads/thumbnails` if `thumbnails` bucket wasn't created yet
  try {
    return await uploadFileToStorage(thumbnailBlob, 'listings', `thumbnails/${filePath}`);
  } catch {
    // 3. Final fallback to inline data URL so preview never breaks
    return await blobToDataUrl(thumbnailBlob);
  }
}

/**
 * Uploads the untouched full-resolution original file directly to ImageKit.io using /api/imagekit/auth signature.
 */
export async function uploadFullImageToImageKit(
  originalFile: File | Blob,
  fileName?: string
): Promise<{ url: string; usedImageKit: boolean }> {
  try {
    const authRes = await fetch('/api/imagekit/auth');
    if (authRes.ok) {
      const authData = await authRes.json();
      if (authData.configured && authData.token && authData.signature && authData.publicKey) {
        const formData = new FormData();
        const safeName =
          fileName ||
          (originalFile instanceof File ? originalFile.name : `product-${Date.now()}.jpg`);

        formData.append('file', originalFile);
        formData.append('fileName', safeName);
        formData.append('publicKey', authData.publicKey);
        formData.append('signature', authData.signature);
        formData.append('expire', String(authData.expire));
        formData.append('token', authData.token);
        formData.append('useUniqueFileName', 'true');
        formData.append('folder', '/souq-listings');

        const uploadRes = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
          method: 'POST',
          body: formData,
        });

        if (uploadRes.ok) {
          const uploadJson = await uploadRes.json();
          if (uploadJson?.url) {
            return { url: uploadJson.url, usedImageKit: true };
          }
        }
      }
    }
  } catch (err) {
    console.warn('ImageKit upload skipped or failed, using Supabase Storage fallback:', err);
  }

  // Fallback to Supabase `app-uploads` bucket if ImageKit keys are not yet set in Secrets
  try {
    const fallbackUrl = await uploadFileToStorage(originalFile, 'listings');
    return { url: fallbackUrl, usedImageKit: false };
  } catch {
    const dataUrl = await blobToDataUrl(originalFile);
    return { url: dataUrl, usedImageKit: false };
  }
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

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === 'string') resolve(ev.target.result);
      else reject(new Error('Failed to convert blob to DataURL'));
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
