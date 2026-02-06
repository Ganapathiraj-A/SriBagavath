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
