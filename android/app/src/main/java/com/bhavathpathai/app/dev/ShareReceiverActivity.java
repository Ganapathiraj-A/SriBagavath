package com.bhavathpathai.app.dev;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.util.Log;
import android.widget.Toast;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public class ShareReceiverActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.d("OCR_PLUGIN", "ShareReceiverActivity created (Dev)");
        handleIntent(getIntent());
    }

    private void handleIntent(Intent intent) {
        Log.d("OCR_PLUGIN", "handleIntent: " + intent.getAction());
        if (Intent.ACTION_SEND.equals(intent.getAction()) && intent.getType() != null) {
            if (intent.getType().startsWith("image/")) {
                Uri imageUri = (Uri) intent.getParcelableExtra(Intent.EXTRA_STREAM);
                if (imageUri != null) {
                    processImage(imageUri);
                } else {
                    Log.e("OCR_PLUGIN", "No image URI in Intent");
                }
            }
        }
        
        // Launch Main Activity with correct flags to bring existing task to front
        Intent mainIntent = new Intent(this, MainActivity.class);
        mainIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(mainIntent);
        
        // Close this proxy activity immediately
        finish();
    }

    private void processImage(Uri imageUri) {
         try {
            Log.d("OCR_PLUGIN", "Processing image: " + imageUri.toString());
            InputStream iStream = getContentResolver().openInputStream(imageUri);
            ByteArrayOutputStream byteBuffer = new ByteArrayOutputStream();
            int bufferSize = 1024;
            byte[] buffer = new byte[bufferSize];
            int len = 0;
            while ((len = iStream.read(buffer)) != -1) {
                byteBuffer.write(buffer, 0, len);
            }
            byte[] imageBytes = byteBuffer.toByteArray();
            String base64 = Base64.encodeToString(imageBytes, Base64.DEFAULT);
            
            // Store directly in the Plugin's static variable
            Log.d("OCR_PLUGIN", "Setting static buffer, length: " + base64.length());
            OCRPlugin.pendingSharedImageBase64 = base64;
            Toast.makeText(this, "Sri Bagavath (Dev): Screenshot Ready", Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Log.e("OCR_PLUGIN", "Error processing shared image", e);
            Toast.makeText(this, "Error: " + e.getMessage(), Toast.LENGTH_LONG).show();
            e.printStackTrace();
        }
    }
}
