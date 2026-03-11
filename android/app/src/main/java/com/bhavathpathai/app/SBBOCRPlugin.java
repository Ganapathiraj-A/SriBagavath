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

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import android.os.Build;

@CapacitorPlugin(name = "SBBOCR")
public class SBBOCRPlugin extends Plugin {

    public SBBOCRPlugin() {
        super();
        Log.d("SBB_DEBUG", "SBBOCRPlugin Instance Created");
    }

    @Override
    public void load() {
        Log.d("SBB_DEBUG", "SBBOCRPlugin Native Loaded/Bound to Bridge!");
    }

    // Static buffer for Shared Intent
    public static String pendingSharedImageBase64 = null;

    @PluginMethod
    public void ping(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("value", "pong");
        call.resolve(ret);
    }

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
        Log.d("OCR_PLUGIN", "checkSharedImage called. Buffer state: " + (pendingSharedImageBase64 != null ? "HAS DATA" : "NULL"));
        if (pendingSharedImageBase64 != null) {
            String temp = pendingSharedImageBase64;
            pendingSharedImageBase64 = null; // Clear it after sending
            JSObject ret = new JSObject();
            ret.put("base64", temp);
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
                    // Already exists - DELETE it so we can re-create it at the top
                    long id = cursor.getLong(cursor.getColumnIndexOrThrow(android.provider.MediaStore.Images.Media._ID));
                    android.net.Uri deleteUri = android.content.ContentUris.withAppendedId(collection, id);
                    try {
                        resolver.delete(deleteUri, null, null);
                        Log.d("OCR_PLUGIN", "Deleted existing QR image: " + id);
                    } catch (Exception e) {
                        Log.e("OCR_PLUGIN", "Failed to delete existing QR", e);
                        // If delete fails, we might create a duplicate or just error out. 
                        // Proceeding to insert might result in "BagavathMission_QR (1)" etc.
                    }
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
        // Regex for UPI Ref No or Transaction ID or UTR
        // Supports GPay, PhonePe, Paytm formats
        
        String[] keywords = {
            "UTR",
            "UTR No\\.?",
            "UPI Ref\\.? No\\.?",
            "Ref No\\.?",
            "Google transaction ID",
            "UPI transaction ID",
            "Transaction ID"
        };

        // 1. First Pass: Look for exactly 12 digits (Strong UTR candidate) near keywords
        // Use DOTALL (?s) to allow matching across newlines with '.' 
        // Use a radius of 100 characters to skip button noise like "Pay again"
        for (String kw : keywords) {
            Pattern p = Pattern.compile("(?is)" + kw + ".{0,100}?(\\d{12})");
            Matcher m = p.matcher(text);
            if (m.find()) {
                return m.group(1);
            }
        }

        // 2. Second Pass: Fallback to alpha-numeric if no 12-digit number found
        // Restricted to 8+ characters to avoid capturing button text like "Pay" or "Paid"
        Pattern pGeneric = Pattern.compile("(?i)(?:UTR|UTR No\\.?|UPI Ref\\.? No\\.?|Ref No\\.?|Google transaction ID|UPI transaction ID|Transaction ID)\\s*[:\\-]?\\s*([a-zA-Z0-9]{8,})", Pattern.MULTILINE);
        Matcher mGeneric = pGeneric.matcher(text);
        if (mGeneric.find()) {
            return mGeneric.group(1);
        }

        return null;
    }

    @PluginMethod
    public void installApk(PluginCall call) {
        if (!getContext().getPackageName().endsWith(".dev")) {
            call.reject("Feature not available in this build");
            return;
        }

        String filePath = call.getString("filePath");
        if (filePath == null) {
            call.reject("No file path provided");
            return;
        }

        try {
            android.content.Context context = getContext();
            java.io.File file;
            
            Log.d("UPGRADE_DEBUG", "Install requested for path: " + filePath);
            Log.d("UPGRADE_DEBUG", "Package Name: " + context.getPackageName());
            
            if (filePath.startsWith("file://")) {
                file = new java.io.File(java.net.URI.create(filePath));
            } else {
                file = new java.io.File(filePath);
            }

            if (!file.exists()) {
                Log.e("UPGRADE_DEBUG", "FILE NOT FOUND at: " + file.getAbsolutePath());
                call.reject("File not found at: " + file.getAbsolutePath());
                return;
            }
            Log.d("UPGRADE_DEBUG", "File Size: " + file.length() + " bytes");

            Intent intent = new Intent(Intent.ACTION_VIEW);
            String authority = context.getPackageName() + ".fileprovider";
            Log.d("UPGRADE_DEBUG", "Using FileProvider Authority: " + authority);
            
            Uri apkUri = androidx.core.content.FileProvider.getUriForFile(
                    context,
                    authority,
                    file
            );
            Log.d("UPGRADE_DEBUG", "Generated APK URI: " + apkUri.toString());
            
            intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP); 
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            
            Log.d("UPGRADE_DEBUG", "Starting Package Installer Activity...");
            context.startActivity(intent);
            call.resolve();

        } catch (Exception e) {
            Log.e("OCR_PLUGIN", "Install failed", e);
            call.reject("Install failed: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void downloadApk(PluginCall call) {
        if (!getContext().getPackageName().endsWith(".dev")) {
            call.reject("Feature not available in this build");
            return;
        }

        String urlString = call.getString("url");
        String filename = call.getString("filename", "update.apk");

        if (urlString == null) {
            call.reject("No URL provided");
            return;
        }

        // Run in background thread to avoid blocking UI
        new Thread(() -> {
            java.io.InputStream input = null;
            java.io.OutputStream output = null;
            java.net.HttpURLConnection connection = null;
            try {
                java.net.URL url = new java.net.URL(urlString);
                connection = (java.net.HttpURLConnection) url.openConnection();
                connection.connect();

                // Check for HTTP 200
                if (connection.getResponseCode() != java.net.HttpURLConnection.HTTP_OK) {
                    call.reject("Server returned HTTP " + connection.getResponseCode() + " " + connection.getResponseMessage());
                    return;
                }

                int fileLength = connection.getContentLength();

                // Download location: External Files Dir (Publicly accessible by FileProvider)
                java.io.File storageDir = getContext().getExternalFilesDir(null); 
                java.io.File outputFile = new java.io.File(storageDir, filename);

                input = new java.io.BufferedInputStream(url.openStream(), 8192);
                output = new java.io.FileOutputStream(outputFile);

                byte[] data = new byte[1024]; // 1KB buffer
                long total = 0;
                int count;
                int lastProgress = -1;

                while ((count = input.read(data)) != -1) {
                    total += count;
                    output.write(data, 0, count);

                    // Publish progress if known length
                    if (fileLength > 0) {
                        int progress = (int) (total * 100 / fileLength);
                        // Debounce events: only send if changed
                        if (progress > lastProgress) {
                            JSObject ret = new JSObject();
                            ret.put("progress", progress); // 0-100
                            notifyListeners("downloadProgress", ret);
                            lastProgress = progress;
                        }
                    }
                }

                output.flush();

                Log.d("OCR_PLUGIN", "Download complete: " + outputFile.getAbsolutePath());
                JSObject ret = new JSObject();
                ret.put("filePath", outputFile.getAbsolutePath());
                call.resolve(ret);

            } catch (Exception e) {
                Log.e("OCR_PLUGIN", "Download error", e);
                call.reject("Download error: " + e.getMessage());
            } finally {
                try {
                    if (output != null) output.close();
                    if (input != null) input.close();
                } catch (IOException ignored) { }
                if (connection != null) connection.disconnect();
            }
        }).start();
    }

    @PluginMethod
    public void launchApp(PluginCall call) {
        String packageName = call.getString("packageName");
        if (packageName == null) {
            call.reject("Package name required");
            return;
        }
        try {
            android.content.Intent launchIntent = getContext().getPackageManager().getLaunchIntentForPackage(packageName);
            if (launchIntent != null) {
                launchIntent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(launchIntent);
                call.resolve();
            } else {
                call.reject("App not found: " + packageName);
            }
        } catch (Exception e) {
            call.reject("Launch failed: " + e.getMessage());
        }
    }
    @PluginMethod
    public void saveAndUploadScreenshot(PluginCall call) {
        if (!getContext().getPackageName().endsWith(".dev")) {
            call.reject("Feature not available in this build");
            return;
        }
        
        getBridge().executeOnMainThread(() -> {
            try {
                // 1. Capture Root View
                android.view.View rootView = getBridge().getActivity().getWindow().getDecorView().getRootView();
                rootView.setDrawingCacheEnabled(true);
                android.graphics.Bitmap bitmap = android.graphics.Bitmap.createBitmap(rootView.getDrawingCache());
                rootView.setDrawingCacheEnabled(false);
                
                // 2. Base64
                java.io.ByteArrayOutputStream stream = new java.io.ByteArrayOutputStream();
                bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 70, stream);
                byte[] byteArr = stream.toByteArray();
                String base64 = android.util.Base64.encodeToString(byteArr, android.util.Base64.NO_WRAP);
                
                // 3. Upload (Async)
                new Thread(() -> {
                    try {
                        String uploadUrl = call.getString("url");
                        if (uploadUrl == null || uploadUrl.isEmpty()) {
                            uploadUrl = "http://192.168.1.7:5000/upload_base64";
                        }
                        
                        java.net.URL url = new java.net.URL(uploadUrl);
                        java.net.HttpURLConnection conn = (java.net.HttpURLConnection) url.openConnection();
                        conn.setRequestMethod("POST");
                        conn.setDoOutput(true);
                        conn.setRequestProperty("Content-Type", "application/json");
                        conn.setConnectTimeout(5000);
                        
                        String json = "{\"image\": \"" + base64 + "\"}";
                        
                        java.io.OutputStreamWriter writer = new java.io.OutputStreamWriter(conn.getOutputStream());
                        writer.write(json);
                        writer.flush();
                        writer.close();
                        
                        int code = conn.getResponseCode();
                        if (code == 200) {
                            call.resolve();
                        } else {
                            call.reject("Upload failed with HTTP " + code);
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                        call.reject("Network error: " + e.getMessage());
                    }
                }).start();
                
            } catch (Exception e) {
                e.printStackTrace();
                call.reject("Capture error: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void getAppVersion(PluginCall call) {
        String packageName = call.getString("packageName");
        if (packageName == null) {
            call.reject("Package name required");
            return;
        }
        try {
            android.content.pm.PackageInfo pInfo = getContext().getPackageManager().getPackageInfo(packageName, 0);
            com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
            ret.put("version", pInfo.versionName);
            call.resolve(ret);
        } catch (android.content.pm.PackageManager.NameNotFoundException e) {
            call.resolve(); // Resolving empty is better than rejecting if just checking existence/version
        } catch (Exception e) {
            call.reject("Failed to get version: " + e.getMessage());
        }
    }
}
