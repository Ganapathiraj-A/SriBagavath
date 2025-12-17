package com.bhavathpathai.app;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import android.content.Intent;
import android.net.Uri;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;

@CapacitorPlugin(name = "OCR")
public class OCRPlugin extends Plugin {

    // Static buffer for Shared Intent
    public static String pendingSharedImageBase64 = null;

    @PluginMethod
    public void detectText(PluginCall call) {
        // Fix: TS sends 'base64Image', not 'image'
        String base64Image = call.getString("base64Image");
        if (base64Image == null) {
             // Fallback if 'image' was sent
             base64Image = call.getString("image");
        }
        
        if (base64Image == null && pendingSharedImageBase64 != null) {
            // Optional: Helper to use pending if none provided?
            // No, let's keep explicit checkSharedImage separate.
        }

        if (base64Image == null || base64Image.isEmpty()) {
            call.reject("No image provided");
            return;
        }

        try {
            processBase64(call, base64Image);
        } catch (Exception e) {
            call.reject("Error processing image", e);
        }
    }

    @PluginMethod
    public void checkSharedImage(PluginCall call) {
        if (pendingSharedImageBase64 != null) {
            JSObject ret = new JSObject();
            ret.put("base64", pendingSharedImageBase64);
            pendingSharedImageBase64 = null;
            call.resolve(ret);
        } else {
            call.resolve();
        }
    }
    
    private void processBase64(PluginCall call, String base64Image) {



        try {
            // Decode Base64
            byte[] decodedString = Base64.decode(base64Image, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(decodedString, 0, decodedString.length);

            if (bitmap == null) {
                call.reject("Failed to decode image");
                return;
            }

            // Run ML Kit
            TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
                    .process(InputImage.fromBitmap(bitmap, 0))
                    .addOnSuccessListener(visionText -> {
                        String rawText = visionText.getText();
                        Log.d("OCR_DEBUG_RAW", "Raw Text: " + rawText); // Log for debugging
                        String amount = parseAmount(rawText);
                        String transactionId = parseTransactionId(rawText);

                        JSObject ret = new JSObject();
                        ret.put("rawText", rawText);
                        ret.put("amount", amount);
                        ret.put("transactionId", transactionId);
                        call.resolve(ret);
                    })
                    .addOnFailureListener(e -> call.reject("OCR Failed", e));

        } catch (Exception e) {
            call.reject("Error processing image", e);
        }
    }

    private String parseAmount(String text) {
        // 1. Look for Amounts with Rupee Symbol explicitly (High Confidence)
        // Matches ₹ 500, ₹500, Rs. 500, INR 500.
        // ALSO Matches ₹ I, ₹ l, ₹| (Common OCR errors for "1")
        Pattern prioPattern = Pattern.compile("(?:₹|Rs\\.?|INR)\\s*([\\d,Il|]+\\.?\\d*)", Pattern.CASE_INSENSITIVE);
        Matcher prioMatcher = prioPattern.matcher(text);
        if (prioMatcher.find()) {
             String val = prioMatcher.group(1);
             // Normalize common OCR errors for 1
             val = val.replace("I", "1").replace("l", "1").replace("|", "1");
             return val.replace(",", "");
        }

        // 2. Fallback: Look for "Paid <Amount>" or similar context
        Pattern secondaryPattern = Pattern.compile("(?:Paid|Amount)\\s*[:\\-]?\\s*([\\d,]+\\.?\\d*)", Pattern.CASE_INSENSITIVE);
        Matcher secMatcher = secondaryPattern.matcher(text);
        if (secMatcher.find()) {
            return secMatcher.group(1).replace(",", "");
        }

        String[] lines = text.split("\n");

        // NEW: HIGH PRIORITY "LONELY ONE" SCAN
        // Run this BEFORE the noise filter loop to catch "1" that might be stripped or ignored.
        for (String line : lines) {
            String clean = line.trim();
            // Regex: Start, optional currency, 1 OR I OR l OR | OR !, End.
            // Matches: "1", "₹1", "Rs 1", "I", "l", "!", "₹ I"
            if (clean.matches("(?i)^(?:₹|Rs\\.?|INR)?\\s*[1Il|!]\\s*$")) {
                 return "1";
            }
        }

        // 3. Tertiary: Look for isolated lines with currency format OR just simple numbers
        for (String line : lines) {
            String clean = line.trim();
            
            // NEW: Strip non-digits from BOTH start and end.
            // "1 Rs" -> "1"
            // "? 1" -> "1"
            // "7:27 pm" -> "7:27" (Still contains colon, so safe)
            String stripped = clean.replaceAll("^[^\\d]+|[^\\d]+$", ""); 
            
            // NOISE FILTER: Compare original length with stripped length
            int noise = clean.length() - stripped.length();
            
            Log.d("OCR_DEBUG", "Line: '" + clean + "' Stripped: '" + stripped + "' Noise: " + noise);

            if (noise > 10) {
                 Log.d("OCR_DEBUG", "Skipping due to High Noise");
                 continue; // Likely embedded in a sentence, skip it.
            }
            
            // SPECIAL CASE: "Lonely One"
            // If stripped is empty (no digits) but the line looks like "I", "l", "|", "!", treat as "1".
            // This handles cases where "1" is read as a letter and the currency symbol is missing/misread.
            if (stripped.isEmpty() && clean.matches("^[Il|!]+$")) {
                 return "1";
            }
            
            // Match "1,000", "4,500", "12,345.00"
            if (stripped.matches("^\\d{1,3}(,\\d{3})+(\\.\\d+)?$")) {
                return stripped.replace(",", "");
            }
            // Match strict decimal "4500.00" OR "1.0"
            if (stripped.matches("^\\d+\\.\\d+$")) {
                return stripped;
            }
            // Match simple integer amounts (e.g. "1", "100", "500")
            // Avoid phone numbers (usually 10 digits) 
            // RESTRICTIVE FIX: Only allow 1-3 digits for simple integers (0-999).
            // Larger amounts (>=1000) usually have commas or decimals (Handled above).
            // This guarantees "4505" (4 digits) is REJECTED.
            // "1" (1 digit) is ACCEPTED.
            if (stripped.matches("^\\d{1,3}$")) {
                 return stripped;
            }
        }

        return null;
    }

    @PluginMethod
    public void saveImageToGallery(PluginCall call) {
        String base64Image = call.getString("base64");
        if (base64Image == null) {
            call.reject("No image provided");
            return;
        }

        try {
            // Check if image already exists
            android.content.ContentResolver resolver = getContext().getContentResolver();
            android.net.Uri collection;
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                collection = android.provider.MediaStore.Images.Media.getContentUri(android.provider.MediaStore.VOLUME_EXTERNAL_PRIMARY);
            } else {
                collection = android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
            }

            String[] projection = new String[] { android.provider.MediaStore.Images.Media._ID };
            // Check both TITLE and DISPLAY_NAME to be safe
            String selection = android.provider.MediaStore.Images.Media.TITLE + " = ? OR " + 
                               android.provider.MediaStore.Images.Media.DISPLAY_NAME + " LIKE ?";
            String[] selectionArgs = new String[] { "BagavathMission_QR", "BagavathMission_QR%" };

            try (android.database.Cursor cursor = resolver.query(collection, projection, selection, selectionArgs, null)) {
                if (cursor != null && cursor.moveToFirst()) {
                    // Already exists
                    call.resolve();
                    return;
                }
            }

            // If not found, save it
            byte[] decodedString = Base64.decode(base64Image, Base64.DEFAULT);
            Bitmap bitmap = BitmapFactory.decodeByteArray(decodedString, 0, decodedString.length);

            String savedImageURL = android.provider.MediaStore.Images.Media.insertImage(
                    resolver,
                    bitmap,
                    "BagavathMission_QR",
                    "QR Code for Payment"
            );

            if (savedImageURL != null) {
                call.resolve();
            } else {
                call.reject("Failed to save image");
            }
        } catch (Exception e) {
            call.reject("Error saving image", e);
        }
    }

    private String parseTransactionId(String text) {
        // Regex for UPI Ref No or Transaction ID
        // Supports GPay's "Google transaction ID \n <ID>" format
        // Supports "UPI transaction ID \n <ID>"
        // Added flexible spacing and newline handling
        
        // Pattern 1: Google / UPI specific headers
        Pattern p1 = Pattern.compile("(?:Google transaction ID|UPI transaction ID|UPI Ref\\.? No\\.|Ref No\\.)\\s*[:\\-]?\\s*([a-zA-Z0-9]+)", Pattern.CASE_INSENSITIVE | Pattern.MULTILINE);
        Matcher m1 = p1.matcher(text);
        if (m1.find()) {
            return m1.group(1);
        }

        // Pattern 2: Generic "Transaction ID" (Fallback)
        Pattern p2 = Pattern.compile("Transaction ID\\s*[:\\-]?\\s*([a-zA-Z0-9]+)", Pattern.CASE_INSENSITIVE);
        Matcher m2 = p2.matcher(text);
        if (m2.find()) {
            return m2.group(1);
        }

        return null;
    }
}
