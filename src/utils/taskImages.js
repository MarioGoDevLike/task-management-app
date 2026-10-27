/** Shared task image upload rules — same constraints for inline add and Quill editor. */

export const TASK_IMAGE_ACCEPT = 'image/*,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg';
export const TASK_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'image/x-png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/x-ms-bmp',
  'image/svg+xml',
];
export const TASK_IMAGE_EXTENSION_PATTERN = /\.(jpe?g|png|gif|webp|bmp|svg)$/i;
export const TASK_IMAGE_BLOCKED_TYPES = new Set(['image/heic', 'image/heif']);

export function isAllowedTaskImageFile(file) {
  if (!file) return false;
  const type = String(file.type || '').toLowerCase();
  if (type) {
    if (TASK_IMAGE_BLOCKED_TYPES.has(type)) return false;
    if (TASK_IMAGE_MIME_TYPES.includes(type)) return true;
    if (type.startsWith('image/')) return true;
  }
  return TASK_IMAGE_EXTENSION_PATTERN.test(file.name || '');
}
export const TASK_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const TASK_IMAGE_MAX_COUNT = 5;
/** Firestore string field limit is ~1 MiB — stay under with margin for other task fields. */
export const TASK_DESCRIPTION_MAX_BYTES = 900_000;
export const TASK_IMAGE_MAX_DIMENSION = 1280;
export const TASK_IMAGE_JPEG_QUALITY = 0.82;
/** Target max base64 length per embedded image (~150KB binary). */
export const TASK_IMAGE_TARGET_DATA_URL_LENGTH = 200_000;

export function formatMaxImageSizeMb() {
  return `${TASK_IMAGE_MAX_BYTES / (1024 * 1024)}MB`;
}

export function getDescriptionByteSize(html) {
  if (!html) return 0;
  return new TextEncoder().encode(html).length;
}

/**
 * @param {string} html
 * @returns {string|null} Error message or null if valid
 */
export function validateDescriptionForFirestore(html) {
  const bytes = getDescriptionByteSize(html);
  if (bytes > TASK_DESCRIPTION_MAX_BYTES) {
    const kb = Math.round(bytes / 1024);
    const maxKb = Math.round(TASK_DESCRIPTION_MAX_BYTES / 1024);
    return `Task content is too large (${kb}KB, max ${maxKb}KB). Remove images or use smaller photos.`;
  }
  return null;
}

/**
 * @param {File} file
 * @returns {string|null} Error message or null if valid
 */
export function validateTaskImageFile(file) {
  if (!file) return 'No file selected';
  if (!isAllowedTaskImageFile(file)) {
    return 'Unsupported format. Use JPEG, PNG, GIF, or WebP.';
  }
  if (file.size > TASK_IMAGE_MAX_BYTES) {
    return `File exceeds ${formatMaxImageSizeMb()} limit.`;
  }
  return null;
}

/**
 * @param {File} file
 * @returns {Promise<string>} data URL
 */
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Resize and compress an image for Firestore storage (avoids 1MB field limit).
 * @param {string} dataUrl
 * @returns {Promise<string>}
 */
export function compressDataUrlForTask(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;
        if (!width || !height) {
          resolve(dataUrl);
          return;
        }

        const scale = Math.min(
          1,
          TASK_IMAGE_MAX_DIMENSION / Math.max(width, height)
        );
        width = Math.max(1, Math.round(width * scale));
        height = Math.max(1, Math.round(height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        let quality = TASK_IMAGE_JPEG_QUALITY;
        let compressed = canvas.toDataURL('image/jpeg', quality);
        while (
          compressed.length > TASK_IMAGE_TARGET_DATA_URL_LENGTH &&
          quality > 0.45
        ) {
          quality -= 0.08;
          compressed = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(compressed);
      } catch {
        reject(new Error('Failed to compress image'));
      }
    };
    img.onerror = () => reject(new Error('Failed to decode image'));
    img.src = dataUrl;
  });
}

/**
 * Read file and compress for task storage.
 * @param {File} file
 * @returns {Promise<string>}
 */
export async function prepareImageDataUrlForTask(file) {
  const raw = await readFileAsDataUrl(file);
  if (!raw.startsWith('data:image/')) return raw;

  const type = String(file.type || '').toLowerCase();
  if (type === 'image/gif' || type === 'image/svg+xml' || /\.svg$/i.test(file.name || '')) {
    if (raw.length <= TASK_IMAGE_TARGET_DATA_URL_LENGTH) return raw;
    throw new Error('GIF/SVG too large — use JPG or PNG under 5MB');
  }

  try {
    return await compressDataUrlForTask(raw);
  } catch {
    if (raw.length <= TASK_IMAGE_TARGET_DATA_URL_LENGTH) return raw;
    throw new Error('Could not optimize image — try a smaller file');
  }
}

/**
 * Ensure embedded image data URLs fit Firestore limits (e.g. re-compress legacy uploads).
 * @param {string[]} dataUrls
 * @returns {Promise<string[]>}
 */
export async function ensureImageDataUrlsFitTaskStorage(dataUrls) {
  if (!dataUrls?.length) return [];
  const result = [];
  for (const url of dataUrls) {
    if (!url || typeof url !== 'string') continue;
    if (!url.startsWith('data:image/') || url.length <= TASK_IMAGE_TARGET_DATA_URL_LENGTH) {
      result.push(url);
      continue;
    }
    try {
      result.push(await compressDataUrlForTask(url));
    } catch {
      result.push(url);
    }
  }
  return result;
}

/**
 * Build description HTML from image data URLs (Quill-compatible).
 * @param {string[]} dataUrls
 * @returns {string}
 */
export function imagesToDescriptionHtml(dataUrls) {
  if (!dataUrls?.length) return '';

  const container = document.createElement('div');
  dataUrls.forEach((src) => {
    if (!src || typeof src !== 'string') return;
    const paragraph = document.createElement('p');
    const img = document.createElement('img');
    img.src = src;
    img.alt = 'Task attachment';
    paragraph.appendChild(img);
    container.appendChild(paragraph);
  });

  return container.innerHTML;
}

/**
 * Process FileList for task attachment; skips invalid files with error messages.
 * @param {FileList|File[]} files
 * @param {number} existingCount
 * @returns {Promise<{ items: Array<{ id: string, dataUrl: string, name: string }>, errors: string[] }>}
 */
export async function processTaskImageFiles(files, existingCount = 0) {
  const list = Array.from(files || []);
  const items = [];
  const errors = [];
  const remaining = TASK_IMAGE_MAX_COUNT - existingCount;

  if (remaining <= 0) {
    return {
      items,
      errors: [`Maximum ${TASK_IMAGE_MAX_COUNT} images allowed per task.`],
    };
  }

  const batch = list.slice(0, remaining);
  if (list.length > remaining) {
    errors.push(`Only ${remaining} more image(s) can be added.`);
  }

  for (const file of batch) {
    const validationError = validateTaskImageFile(file);
    if (validationError) {
      errors.push(`${file.name}: ${validationError}`);
      continue;
    }
    try {
      const dataUrl = await prepareImageDataUrlForTask(file);
      items.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        dataUrl,
        name: file.name,
      });
    } catch (err) {
      errors.push(`${file.name}: ${err.message || 'Failed to read file.'}`);
    }
  }

  return { items, errors };
}

export const EMPTY_INLINE_ADD_DRAFT = Object.freeze({
  title: '',
  images: [],
});

/**
 * Parse embedded images from task description HTML for preview.
 * @param {string} html
 * @returns {Array<{ id: string, dataUrl: string, name: string }>}
 */
export function parseImagesFromDescription(html) {
  if (!html) return [];
  const div = document.createElement('div');
  div.innerHTML = html;
  return Array.from(div.querySelectorAll('img')).map((img, index) => ({
    id: `desc-img-${index}-${img.src.slice(-12)}`,
    dataUrl: img.src,
    name: img.alt || `Image ${index + 1}`,
  }));
}

/**
 * Remove one image from description HTML by data URL.
 * @param {string} html
 * @param {string} dataUrl
 * @returns {string}
 */
export function removeImageFromDescription(html, dataUrl) {
  if (!html || !dataUrl) return html || '';
  const div = document.createElement('div');
  div.innerHTML = html;
  div.querySelectorAll('img').forEach((img) => {
    if (img.src === dataUrl) {
      const parent = img.parentElement;
      if (parent && parent.tagName === 'P' && parent.childNodes.length === 1) {
        parent.remove();
      } else {
        img.remove();
      }
    }
  });
  return div.innerHTML;
}

/**
 * Merge plain-text description with optional image HTML blocks.
 */
export function buildTaskDescription(plainText, imageDataUrls = []) {
  const textHtml = plainText?.trim()
    ? plainTextToSafeDescriptionHtml(plainText)
    : '';
  const imageHtml = imagesToDescriptionHtml(imageDataUrls);
  if (textHtml && imageHtml) return `${textHtml}${imageHtml}`;
  return textHtml || imageHtml || '';
}

function plainTextToSafeDescriptionHtml(text) {
  if (!text || !String(text).trim()) return '';
  const lines = String(text).split(/\n/);
  const escaped = lines.map((line) =>
    line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  );
  return `<p>${escaped.join('<br>')}</p>`;
}
