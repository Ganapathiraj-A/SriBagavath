import { AppLauncher } from '@capacitor/app-launcher';
import OCR from '@/plugins/OCRPlugin';

export const GPayUtils = {
    // 1. Open GPay
    openGPay: async () => {
        const packageName = "com.google.android.apps.nbu.paisa.user";
        try {
            await AppLauncher.openUrl({ url: `android-app://${packageName}` }).catch(async () => {
                // Fallback to Play Store if not installed
                await AppLauncher.openUrl({ url: `https://play.google.com/store/apps/details?id=${packageName}` });
            });
        } catch (_err) {
            console.error("GPay Launch Error", _err);
            // Fallback for web or generic failure
            window.location.href = "https://pay.google.com/about";
        }
    },

    // 2. Save QR Code
    saveQRCode: async (qrImageSrc) => {
        console.log("Saving QR Code from:", qrImageSrc);
        try {
            // 1. Get Base64
            let base64 = "";
            if (qrImageSrc.startsWith('data:image')) {
                base64 = qrImageSrc.split(',')[1];
            } else {
                console.log("Fetching QR image...");
                const response = await fetch(qrImageSrc);
                console.log("Fetch response status:", response.status);
                const blob = await response.blob();
                base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
            }

            console.log("Base64 length:", base64.length);

            // 2. Use OCR Plugin to save to gallery (Native)
            try {
                await OCR.saveImageToGallery({ base64 });
                console.log("Successfully saved to gallery");
            } catch (nativeErr) {
                console.error("Native Save Failed:", nativeErr);
                alert('Native Save Failed: ' + (nativeErr.message || JSON.stringify(nativeErr)));
            }
        } catch (err) {
            console.error("Save Error (JS):", err);
            alert('Save Error (JS): ' + err.message);
        }
    }
};
