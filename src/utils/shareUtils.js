import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Toast } from '@capacitor/toast';
import { Capacitor } from '@capacitor/core';

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
            item.participants?.forEach((p, i) => {
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
    const isNative = Capacitor.isNativePlatform();
    const shareText = `${text}\n\n${url}`;

    try {
        if (isNative) {
            // Native Platform (Capacitor)
            let files = [];
            if (imageUrl) {
                try {
                    const response = await fetch(`${imageUrl}${imageUrl.includes('?') ? '&' : '?'}t=${Date.now()}`);
                    const blob = await response.blob();
                    const reader = new FileReader();
                    const base64Data = await new Promise((resolve, reject) => {
                        reader.onload = () => resolve(reader.result.split(',')[1]);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });

                    const fileName = `share_${Date.now()}.jpg`;
                    const result = await Filesystem.writeFile({
                        path: fileName,
                        data: base64Data,
                        directory: Directory.Cache
                    });
                    files = [result.uri];
                } catch (err) {
                    console.error("Native image prep failed", err);
                }
            }

            await Share.share({
                title: title,
                text: shareText,
                files: files,
                dialogTitle: dialogTitle
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
                title: title,
                text: shareText,
                url: url
            });
        } else {
            // Final fallback: Clipboard
            await navigator.clipboard.writeText(shareText);
            await Toast.show({ text: 'Link copied to clipboard!', duration: 'short' });
        }
    } catch (error) {
        console.error("Sharing failed", error);
    }
};

/**
 * Legacy wrapper: Shares a gallery image URL.
 */
export const shareImage = async (img) => {
    if (!img) return;
    return shareItem({
        title: 'Sri Bagavath Gallery',
        text: img.caption || 'Check out this image from Sri Bagavath Gallery',
        url: img.url,
        imageUrl: img.url,
        dialogTitle: 'Share Image'
    });
};
