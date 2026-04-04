import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Toast } from '@capacitor/toast';
import { Capacitor } from '@capacitor/core';

const DATA_URL_PATTERN = /^data:([^;]+);base64,(.+)$/;
const MIME_EXTENSION_MAP = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/heic': 'heic',
    'image/heif': 'heif'
};

const showToastMessage = async (text) => {
    if (!text) return;

    try {
        await Toast.show({ text, duration: 'short' });
    } catch {
        // Toast is best-effort only.
    }
};

const sanitizeFileSegment = (value, fallback = 'share-image') => {
    const cleaned = String(value || fallback)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);

    return cleaned || fallback;
};

const getMimeTypeFromUrl = (url) => {
    if (!url || !url.startsWith('http')) return null;

    try {
        const pathname = new URL(url).pathname.toLowerCase();
        if (pathname.endsWith('.png')) return 'image/png';
        if (pathname.endsWith('.webp')) return 'image/webp';
        if (pathname.endsWith('.gif')) return 'image/gif';
        if (pathname.endsWith('.heic')) return 'image/heic';
        if (pathname.endsWith('.heif')) return 'image/heif';
        if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'image/jpeg';
    } catch {
        return null;
    }

    return null;
};

const resolveMimeType = ({ explicitMimeType, blobType, dataUrlMimeType, imageUrl }) => {
    return explicitMimeType || blobType || dataUrlMimeType || getMimeTypeFromUrl(imageUrl) || 'image/jpeg';
};

const mimeTypeToExtension = (mimeType) => MIME_EXTENSION_MAP[mimeType?.toLowerCase?.()] || 'jpg';

const buildShareFileName = ({ fileNameBase, mimeType }) =>
    `${sanitizeFileSegment(fileNameBase)}-${Date.now()}.${mimeTypeToExtension(mimeType)}`;

const blobToBase64 = async (blob) => {
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
        reader.onload = () => {
            const result = reader.result || '';
            const [, base64 = ''] = String(result).split(',');
            resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

const dataUrlToBlob = async (dataUrl) => {
    const match = DATA_URL_PATTERN.exec(dataUrl || '');
    if (!match) {
        throw new Error('Invalid data URL');
    }

    const [, mimeType, base64Data] = match;
    const byteChars = atob(base64Data);
    const byteNumbers = new Uint8Array(byteChars.length);

    for (let i = 0; i < byteChars.length; i += 1) {
        byteNumbers[i] = byteChars.charCodeAt(i);
    }

    return {
        blob: new Blob([byteNumbers], { type: mimeType }),
        mimeType
    };
};

const fetchImageBlob = async (imageUrl) => {
    const fetchUrl = `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}t=${Date.now()}`;
    const response = await fetch(fetchUrl, { credentials: 'omit' });

    if (!response.ok) {
        throw new Error(`Image fetch failed: HTTP ${response.status}`);
    }

    return response.blob();
};

const createWebShareFile = async ({ imageUrl, imageData, fileNameBase, mimeType }) => {
    let blob = null;
    let resolvedMimeType = mimeType || null;

    if (imageData instanceof Blob) {
        blob = imageData;
    } else if (typeof imageData === 'string' && imageData.startsWith('data:')) {
        const parsed = await dataUrlToBlob(imageData);
        blob = parsed.blob;
        resolvedMimeType = resolvedMimeType || parsed.mimeType;
    } else if (imageUrl) {
        blob = await fetchImageBlob(imageUrl);
    } else {
        throw new Error('No image source provided');
    }

    resolvedMimeType = resolveMimeType({
        explicitMimeType: resolvedMimeType,
        blobType: blob.type,
        imageUrl
    });

    const normalizedBlob = blob.type === resolvedMimeType ? blob : new Blob([blob], { type: resolvedMimeType });
    const fileName = buildShareFileName({ fileNameBase, mimeType: resolvedMimeType });

    return new File([normalizedBlob], fileName, { type: resolvedMimeType });
};

const createNativeShareFile = async ({ imageUrl, imageData, fileNameBase, mimeType }) => {
    if (imageUrl && !imageData && imageUrl.startsWith('http')) {
        const resolvedMimeType = resolveMimeType({ explicitMimeType: mimeType, imageUrl });
        const fileName = buildShareFileName({ fileNameBase, mimeType: resolvedMimeType });
        const downloadResult = await Filesystem.downloadFile({
            url: `${imageUrl}${imageUrl.includes('?') ? '&' : '?'}t=${Date.now()}`,
            path: fileName,
            directory: Directory.Cache
        });

        return downloadResult.path.startsWith('file://')
            ? downloadResult.path
            : `file://${downloadResult.path}`;
    }

    let blob = null;
    let resolvedMimeType = mimeType || null;

    if (imageData instanceof Blob) {
        blob = imageData;
    } else if (typeof imageData === 'string' && imageData.startsWith('data:')) {
        const parsed = await dataUrlToBlob(imageData);
        blob = parsed.blob;
        resolvedMimeType = resolvedMimeType || parsed.mimeType;
    } else if (imageUrl) {
        blob = await fetchImageBlob(imageUrl);
    } else {
        throw new Error('No image source provided');
    }

    resolvedMimeType = resolveMimeType({
        explicitMimeType: resolvedMimeType,
        blobType: blob?.type,
        imageUrl
    });

    const fileName = buildShareFileName({ fileNameBase, mimeType: resolvedMimeType });
    const base64Data = await blobToBase64(blob);
    const result = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Cache
    });

    return result.uri;
};

const buildShareText = (text, url) => [text, url].filter(Boolean).join('\n\n').trim();

/**
 * Formats and shares multiple transaction records.
 * @param {Array} items - Array of transaction objects
 * @param {string} type - 'PROGRAM', 'BOOK', or 'DONATION'
 * @param {Object} masterPrograms - (Optional) Master list of programs for detail lookup
 */
export const shareTransactions = async (items, type, allPrograms = []) => {
    if (!items || items.length === 0) return;

    let text = "";

    if (type === 'PROGRAM') {
        text += "🔴 *PROGRAM REGISTRATIONS*\n";
        text += "--------------------------\n";
        items.forEach((item, index) => {
            // Helper: Find Program Details if missing in Transaction
            const getProgramDetails = (tx) => {
                if (tx.programId) {
                    const match = allPrograms.find(p => p.id === tx.programId);
                    if (match) return { date: match.programDate, city: match.programCity };
                }
                if (tx.programDate && tx.programCity) return { date: tx.programDate, city: tx.programCity };
                const matchName = allPrograms.find(p => p.programName === tx.itemName);
                if (matchName) return { date: tx.programDate || matchName.programDate, city: tx.programCity || matchName.programCity };
                return { date: "", city: "" };
            };

            const details = getProgramDetails(item);
            const dateStr = details.date ? new Date(details.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : "";
            
            text += `*${index + 1}. ${item.itemName}*\n`;
            if (dateStr) text += `📅 Date: ${dateStr}${details.city ? ` - ${details.city}` : ""}\n`;
            text += `👥 Participants (${item.participants?.length || 0}):\n`;
            item.participants?.forEach((p) => {
                text += `   - ${p.name} (${p.mobile})\n`;
            });
            text += `💰 Paid: ₹${item.amount}\n`;
            text += `📞 Contact: ${item.primaryApplicant?.name || item.name} (${item.primaryApplicant?.mobile || item.mobile})\n`;
            text += "--------------------------\n";
        });
    } else if (type === 'BOOK' || type === 'MAGAZINE_SUBSCRIPTION') {
        text += "📚 *BOOK PURCHASES*\n";
        text += "--------------------------\n";
        items.forEach((item, index) => {
            text += `*${index + 1}. Order #${item.id?.substring(0, 8)}*\n`;
            text += `👤 Customer: ${item.shippingAddress?.name || item.name}\n`;
            text += `📦 Items:\n`;
            item.orderItems?.forEach(oi => {
                text += `   - ${oi.title} x ${oi.quantity}\n`;
            });
            text += `💰 Total: ₹${item.amount}\n`;
            if (item.shippingAddress) {
                text += `📍 Address: ${item.shippingAddress.address}, ${item.shippingAddress.city} - ${item.shippingAddress.pincode}\n`;
                text += `📞 Mobile: ${item.shippingAddress.mobile}\n`;
            }
            text += "--------------------------\n";
        });
    } else if (type === 'DONATION') {
        text += "❤️ *DONATIONS RECEIVED*\n";
        text += "--------------------------\n";
        items.forEach((item, index) => {
            const donorName = item.name || item.shippingAddress?.name || 'Anonymous';
            text += `*${index + 1}. Donor: ${donorName}*\n`;
            text += `💰 Amount: ₹${item.amount}\n`;
            text += `📍 City: ${item.city || item.shippingAddress?.city || 'Unknown'}\n`;
            const date = item.timestamp?.seconds ? new Date(item.timestamp.seconds * 1000).toLocaleDateString() : 'N/A';
            text += `📅 Date: ${date}\n`;
            if (item.mobile || item.shippingAddress?.mobile) {
                text += `📞 Mobile: ${item.mobile || item.shippingAddress?.mobile}\n`;
            }
            text += "--------------------------\n";
        });
    }

    try {
        await Share.share({
            title: `Sri Bagavath Admin Share (${type})`,
            text: text,
            dialogTitle: 'Share Transactions'
        });
    } catch (error) {
        console.error("Sharing failed", error);
    }
};

/**
 * Central sharing utility that handles both Native and Web/PWA platforms.
 */
export const shareItem = async ({ title, text, url, imageUrl, dialogTitle = 'Share' }) => {
    const shareText = buildShareText(text, url);

    try {
        if (imageUrl) {
            await shareImageFile({
                title,
                text,
                url,
                imageUrl,
                dialogTitle
            });
            return;
        }

        // Web / PWA Platform
        if (navigator.share) {
            // Check if we can share files
            if (imageUrl && navigator.canShare) {
                try {
                    const response = await fetch(imageUrl);
                    const blob = await response.blob();
                    const file = new File([blob], 'share-image.jpg', { type: 'image/jpeg' });

                    if (navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            title: title,
                            text: shareText,
                            files: [file]
                        });
                        return;
                    }
                } catch (err) {
                    console.error("PWA file share prep failed", err);
                }
            }

            // Fallback for Web Text/URL Share
            await navigator.share({
                title,
                text: shareText || text || '',
                url
            });
        } else {
            // Final fallback: Clipboard
            await navigator.clipboard.writeText(shareText);
            await showToastMessage('Link copied to clipboard!');
        }
    } catch (error) {
        console.error("Sharing failed", error);
    }
};

export const shareImageFile = async ({
    title,
    text,
    url,
    imageUrl,
    imageData,
    fileNameBase = 'share-image',
    mimeType,
    dialogTitle = 'Share'
}) => {
    const shareText = buildShareText(text, url);

    try {
        if (Capacitor.isNativePlatform()) {
            const fileUri = await createNativeShareFile({
                imageUrl,
                imageData,
                fileNameBase,
                mimeType
            });

            await Share.share({
                title,
                text: shareText || text || '',
                files: fileUri ? [fileUri] : undefined,
                dialogTitle
            });
            return { sharedFile: true, platform: 'native' };
        }

        if (navigator.share) {
            try {
                const file = await createWebShareFile({
                    imageUrl,
                    imageData,
                    fileNameBase,
                    mimeType
                });

                if (navigator.canShare?.({ files: [file] })) {
                    await navigator.share({
                        title,
                        text: shareText || text || '',
                        files: [file]
                    });
                    return { sharedFile: true, platform: 'web' };
                }
            } catch (fileError) {
                console.error('Web image file share prep failed', fileError);
            }

            await navigator.share({
                title,
                text: shareText || text || '',
                url
            });
            await showToastMessage('This browser shared the link because image-file sharing is not supported here.');
            return { sharedFile: false, platform: 'web', reason: 'file-share-unavailable' };
        }

        if (shareText) {
            await navigator.clipboard.writeText(shareText);
            await showToastMessage('Image-file sharing is not supported here. Link copied to clipboard.');
            return { sharedFile: false, platform: 'web', reason: 'clipboard-fallback' };
        }

        throw new Error('Image sharing is not supported on this platform');
    } catch (error) {
        console.error('Image sharing failed', error);
        throw error;
    }
};

export const shareCanvasImage = async (canvas, options = {}) => {
    if (!canvas) {
        throw new Error('No canvas provided for sharing');
    }

    const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
            if (result) {
                resolve(result);
                return;
            }

            reject(new Error('Canvas export failed'));
        }, options.mimeType || 'image/jpeg', options.quality || 0.95);
    });

    return shareImageFile({
        ...options,
        imageData: blob
    });
};

/**
 * Legacy wrapper: Shares a gallery image URL.
 */
export const shareImage = async (img) => {
    if (!img) return;
    return shareImageFile({
        title: 'Sri Bagavath Gallery',
        text: img.caption || 'Check out this image from Sri Bagavath Gallery',
        url: img.url,
        imageUrl: img.url,
        fileNameBase: img.caption || 'gallery-image',
        dialogTitle: 'Share Image'
    });
};
