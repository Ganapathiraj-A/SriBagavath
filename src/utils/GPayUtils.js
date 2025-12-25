import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { AppLauncher } from '@capacitor/app-launcher';

export const GPayUtils = {
    // 1. Open GPay
    openGPay: async () => {
        const packageName = "com.google.android.apps.nbu.paisa.user";
        try {
            await AppLauncher.openUrl({ url: `android-app://${packageName}` }).catch(async () => {
                // Fallback to Play Store if not installed
                await AppLauncher.openUrl({ url: `https://play.google.com/store/apps/details?id=${packageName}` });
            });
        } catch (e) {
            console.error("GPay Launch Error", e);
            // Fallback for web or generic failure
            window.location.href = "https://pay.google.com/about";
        }
    },

    // 2. Save QR Code
    saveQRCode: async (qrImageSrc) => {
        try {
            // 1. Get Base64
            let base64 = "";
            if (qrImageSrc.startsWith('data:image')) {
                base64 = qrImageSrc.split(',')[1];
            } else {
                const response = await fetch(qrImageSrc);
                const blob = await response.blob();
                base64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.readAsDataURL(blob);
                });
            }

            // 2. Use OCR Plugin to save to gallery (Native)
            try {
                const { default: OCR } = await import('../plugins/OCRPlugin');
                await OCR.saveImageToGallery({ base64 });
                // Note: SBB App removed Toast per user request, so we just return true.
                // But let's keep the alert as per Sri Bagavath original flow "Click to Save" feedback requirement?
                // User said "copy exact logic", SBB utils says "// Toast removed per user request".
                // But PaymentScreen.tsx calls it and says "Tap the QR code to save it and proceed".
                // Let's stick to SBB behavior: Silent save or simple toast if native fails.

                // Alerting just in case so user knows it happened, as SriBagavath users might expect it.
                // But adhering to "exact logic": SBB Utils has NO toast on success.
                // So we will be silent on success.

            } catch (e) {
                console.error("Write Failed", e);
                alert('Failed to Save to Gallery');
            }
        } catch (e) {
            console.error("Save Error", e);
            alert('Failed to Save Image');
        }
    }
};
