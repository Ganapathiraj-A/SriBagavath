package com.bhavathpathai.app;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.ionicframework.capacitor.Checkout;

import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;
import com.capacitorjs.plugins.app.AppPlugin;
import com.capacitorjs.plugins.applauncher.AppLauncherPlugin;
import com.capacitorjs.plugins.camera.CameraPlugin;
import com.capacitorjs.plugins.clipboard.ClipboardPlugin;
import com.capacitorjs.plugins.filesystem.FilesystemPlugin;
import com.capacitorjs.plugins.share.SharePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register all plugins BEFORE super.onCreate in Capacitor 7
        // In Capacitor 7, standard plugins are auto-registered.
        // Only register custom or special plugins if needed.
        Log.d("SBB_DEBUG", "Registering custom plugins...");
        registerPlugin(GoogleAuth.class);
        registerPlugin(SBBOCRPlugin.class);
        registerPlugin(Checkout.class);
        Log.d("SBB_DEBUG", "Custom plugins registered.");

        super.onCreate(savedInstanceState);
    }

}
