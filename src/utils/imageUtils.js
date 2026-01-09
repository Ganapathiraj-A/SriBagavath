/**
 * Compresses an image file to a Base64 string (JPEG) under a certain size.
 * @param {File} file 
 * @returns {Promise<string>} Base64 data URL
 */
export const compressImage = (file) => {
    return new Promise((resolve, reject) => {
        // 1. Check for HEIC/HEIF which browsers often can't render in <img>/Canvas directly
        if (file.type === "image/heic" || file.type === "image/heif" || file.name.toLowerCase().endsWith('.heic')) {
            reject(new Error("HEIC format is not supported by the browser. Please use a standard JPEG or PNG image."));
            return;
        }

        const attemptLoad = (src, isBlob) => {
            const img = new Image();
            img.onload = () => {
                if (isBlob) URL.revokeObjectURL(src);
                try {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_WIDTH = 800;

                    if (width > MAX_WIDTH) {
                        height = (height * MAX_WIDTH) / width;
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Adaptive Quality Reduction
                    let quality = 0.8;
                    let dataUrl = canvas.toDataURL('image/jpeg', quality);
                    const TARGET_SIZE = 350000; // 350KB target

                    while (dataUrl.length * 0.75 > TARGET_SIZE && quality > 0.3) {
                        quality -= 0.1;
                        dataUrl = canvas.toDataURL('image/jpeg', quality);
                    }

                    resolve(dataUrl);
                } catch (e) {
                    reject(new Error("Image processing error: " + e.message));
                }
            };

            img.onerror = (e) => {
                if (isBlob) {
                    URL.revokeObjectURL(src);
                    console.warn("createObjectURL failed, falling back to FileReader...");
                    const reader = new FileReader();
                    reader.onload = (re) => attemptLoad(re.target.result, false);
                    reader.onerror = (err) => reject(new Error("Failed to read file: " + err.message));
                    reader.readAsDataURL(file);
                } else {
                    reject(new Error("Unable to load image. Only JPEG/PNG are supported. If using HEIC, please convert it first."));
                }
            };

            img.src = src;
        };

        try {
            const objectUrl = URL.createObjectURL(file);
            attemptLoad(objectUrl, true);
        } catch (e) {
            const reader = new FileReader();
            reader.onload = (re) => attemptLoad(re.target.result, false);
            reader.readAsDataURL(file);
        }
    });
};
