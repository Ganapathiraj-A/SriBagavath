package com.bhavathpathai.app.dev;

import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GoogleAuth.class);
        registerPlugin(OCRPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
