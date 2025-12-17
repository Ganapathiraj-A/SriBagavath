package com.bhavathpathai.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public class ShareReceiverActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        handleIntent(getIntent());
    }

    private void handleIntent(Intent intent) {
        if (Intent.ACTION_SEND.equals(intent.getAction()) && intent.getType() != null) {
            if (intent.getType().startsWith("image/")) {
                Uri imageUri = (Uri) intent.getParcelableExtra(Intent.EXTRA_STREAM);
                if (imageUri != null) {
                    processImage(imageUri);
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
            OCRPlugin.pendingSharedImageBase64 = base64;
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
