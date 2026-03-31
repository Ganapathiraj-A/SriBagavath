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
            dialogTitle: 'Share via WhatsApp'
        });
    } catch (error) {
        console.error("Sharing failed", error);
    }
};

/**
 * Shares a gallery image URL.
 * @param {Object} img - Image object with url and caption
 */
export const shareImage = async (img) => {
    if (!img || !img.url) return;
    
    const isNative = Capacitor.isNativePlatform();
    
    try {
        if (isNative) {
            // Show a "Preparing image" toast for better UX
            await Toast.show({
                text: 'Preparing image for sharing...',
                duration: 'short'
            });

            // 1. Fetch image
            const response = await fetch(img.url);
            const blob = await response.blob();
            
            // 2. Convert to Base64 (Filesystem.writeFile expects base64 or string)
            const reader = new FileReader();
            const base64Data = await new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });

            // 3. Save to temporary file
            const fileName = `share_${Date.now()}.jpg`;
            const result = await Filesystem.writeFile({
                path: fileName,
                data: base64Data,
                directory: Directory.Cache
            });

            // 4. Share the file URI
            await Share.share({
                title: 'Sri Bagavath Gallery',
                text: img.caption || '',
                files: [result.uri],
                dialogTitle: 'Share Image'
            });
            
            return; // Success
        }

        // Web Fallback (or if not native)
        await Share.share({
            title: 'Sri Bagavath Gallery',
            text: img.caption || 'Check out this image from Sri Bagavath Gallery',
            url: img.url,
            dialogTitle: 'Share Image'
        });

    } catch (error) {
        console.error("Sharing failed", error);
        
        // Final fallback to URL if native file sharing fails
        if (isNative) {
            try {
                await Share.share({
                    title: 'Sri Bagavath Gallery',
                    text: img.caption || 'Check out this image from Sri Bagavath Gallery',
                    url: img.url,
                    dialogTitle: 'Share Image'
                });
            } catch (err2) {
                console.error("Secondary share failed", err2);
            }
        }
        
        // Browser Navigator.share fallback
        if (!isNative && navigator.share) {
            await navigator.share({
                title: 'Sri Bagavath Gallery',
                text: img.caption || 'Check out this image from Sri Bagavath Gallery',
                url: img.url
            }).catch(() => {});
        }
    }
};
