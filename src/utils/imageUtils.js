/**
 * Compresses an image to fit within Firestore's 1MB limit.
 * Accepts either a File (from an input) or an existing base64 data URL.
 *
 * @param {File|string} input - A File object or a base64 data URL string.
 * @param {number} [maxWidth=800] - Maximum width for the resized image.
 * @param {number} [maxHeight=800] - Maximum height for the resized image.
 * @param {number} [quality=0.7] - Compression quality (0 to 1).
 * @returns {Promise<string>} - Compressed base64 data URL (e.g. "data:image/jpeg;base64,...").
 */
export const compressImage = (input, maxWidth = 800, maxHeight = 800, quality = 0.7) => {
  const compressBase64 = (base64Str) => {
    return new Promise((resolve, reject) => {
      if (!base64Str) {
        return reject(new Error('Empty image data provided.'));
      }
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      img.onerror = () => reject(new Error('Failed to load image for compression.'));
    });
  };

  // Check if input is a File or Blob
  if (input && (input instanceof File || input instanceof Blob || (typeof input === 'object' && input.size && input.type))) {
    const file = input;
    // HEIC/HEIF check (only if it has a type or name)
    const type = file.type || '';
    const name = file.name || '';
    if (type.includes('heic') || type.includes('heif') || name.toLowerCase().endsWith('.heic')) {
      return Promise.reject(new Error('HEIC format is not supported. Please use JPEG or PNG.'));
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        compressBase64(reader.result).then(resolve).catch(reject);
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  }

  // String input: treat as base64 and compress
  if (typeof input === 'string') {
    // Basic check if it's a data URL or just a raw base64
    const base64Str = input.startsWith('data:') ? input : `data:image/jpeg;base64,${input}`;
    return compressBase64(base64Str);
  }

  return Promise.reject(new Error('compressImage expects a File, Blob, or a base64 string.'));
};
/**
 * Safely handles image sources from Firestore.
 * If the source is a URL (starts with http), it returns it as is.
 * If it's a base64 string without a prefix, it prepends the data:image/jpeg;base64, prefix.
 * If it's already a data URL, it returns it as is.
 *
 * @param {string} src - The raw image source from Firestore.
 * @returns {string} - A valid image source for an <img> tag.
 */

let imageStats = { storage: 0, legacy: 0, local: 0, total: 0 };
let alertTimeout = null;
let toastElement = null;

const showTrackingToast = () => {
  if (!toastElement) {
    toastElement = document.createElement('div');
    toastElement.id = 'image-tracking-toast';
    toastElement.style.cssText = `
      position: fixed;
      top: 100px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.75);
      color: white;
      padding: 10px 20px;
      border-radius: 30px;
      font-size: 13px;
      font-weight: 600;
      z-index: 999999;
      pointer-events: none;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    document.body.appendChild(toastElement);
  }

  imageStats.total++;
  toastElement.innerHTML = `📸 Image loading tracked (${imageStats.total})`;
  toastElement.style.opacity = '1';
  toastElement.style.transform = 'translateX(-50%) translateY(0)';

  if (window._toastTimer) clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => {
    toastElement.style.opacity = '0';
    toastElement.style.transform = 'translateX(-50%) translateY(-10px)';
  }, 3000);
};

/**
 * Tracks and alerts the source of loaded images.
 * Bunches alerts into a 5-second window.
 * 
 * @param {string} src - The image source being loaded.
 */
export const trackImageSource = (src) => {
  if (!src || !window.showImageVerificationAlert) return;

  showTrackingToast();

  if (typeof src === 'string' && src.startsWith('http')) {
    imageStats.storage++;
  } else if (typeof src === 'string' && src.startsWith('data:')) {
    imageStats.legacy++;
  } else {
    // Anything else (relative paths, /src/assets, etc.) is considered local
    imageStats.local++;
  }

  if (alertTimeout) clearTimeout(alertTimeout);

  alertTimeout = setTimeout(() => {
    const msg = `📸 Image Source Report (Last 5s):
🌐 Cloud Storage (URL): ${imageStats.storage}
📦 Legacy (Base64): ${imageStats.legacy}
🏠 Local Assets: ${imageStats.local}`;

    alert(msg);

    // Reset stats for next window
    imageStats = { storage: 0, legacy: 0, local: 0, total: 0 };
    alertTimeout = null;
  }, 5000);
};

export const normalizeImageSrc = (src) => {
  if (!src) return '';
  let finalSrc = src;
  if (!src.startsWith('http') && !src.startsWith('data:')) {
    finalSrc = `data:image/jpeg;base64,${src}`;
  }

  // Track the source
  trackImageSource(finalSrc);

  return finalSrc;
};
