package com.bhavathpathai.app;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

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
        Log.d("SBB_DEBUG", "Starting Plugin Registration...");
        registerPlugin(com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth.class);
        registerPlugin(SBBOCRPlugin.class);
        registerPlugin(com.capacitorjs.plugins.app.AppPlugin.class);
        registerPlugin(com.capacitorjs.plugins.applauncher.AppLauncherPlugin.class);
        registerPlugin(com.capacitorjs.plugins.camera.CameraPlugin.class);
        registerPlugin(com.capacitorjs.plugins.clipboard.ClipboardPlugin.class);
        registerPlugin(com.capacitorjs.plugins.filesystem.FilesystemPlugin.class);
        registerPlugin(com.capacitorjs.plugins.share.SharePlugin.class);
        Log.d("SBB_DEBUG", "Plugin Registration Complete. Calling super.onCreate...");

        super.onCreate(savedInstanceState);
    }

}
