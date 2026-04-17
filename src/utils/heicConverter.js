/**
 * Utility to convert HEIC/HEIF images to JPEG using heic2any.
 * Dynamically loads the library from CDN to keep bundle size small.
 */

let heic2anyLoaded = false;

const loadHeic2Any = () => {
  return new Promise((resolve, reject) => {
    if (window.heic2any) {
      heic2anyLoaded = true;
      return resolve(window.heic2any);
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/heic2any@0.0.4/dist/heic2any.min.js';
    script.onload = () => {
      heic2anyLoaded = true;
      resolve(window.heic2any);
    };
    script.onerror = () => reject(new Error('Failed to load heic2any library'));
    document.head.appendChild(script);
  });
};

/**
 * Converts an HEIC blob to a JPEG blob.
 * @param {Blob} blob - The HEIC image blob.
 * @param {number} quality - JPEG quality (0 to 1).
 * @returns {Promise<Blob>} - The converted JPEG blob.
 */
export const convertHeicToJpeg = async (blob, quality = 0.8) => {
  try {
    const heic2any = await loadHeic2Any();
    const result = await heic2any({
      blob,
      toType: 'image/jpeg',
      quality
    });
    
    // Result can be a single Blob or an array of Blobs
    return Array.isArray(result) ? result[0] : result;
  } catch (error) {
    console.error('HEIC conversion failed:', error);
    throw error;
  }
};

/**
 * Checks if a file is an HEIC image based on name or MIME type.
 */
export const isHeic = (filename, mimeType) => {
  return (
    (mimeType && (mimeType.includes('heic') || mimeType.includes('heif'))) ||
    (filename && (filename.toLowerCase().endsWith('.heic') || filename.toLowerCase().endsWith('.heif')))
  );
};
