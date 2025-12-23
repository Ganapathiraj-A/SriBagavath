package com.antigravity.sigscanner;

import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.os.Bundle;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import java.security.MessageDigest;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;

public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        TextView textView = new TextView(this);
        textView.setPadding(40, 40, 40, 40);
        textView.setTextSize(18);
        setContentView(textView);

        String targetPackage = "com.bhavathpathai.app";
        try {
            PackageInfo packageInfo = getPackageManager().getPackageInfo(targetPackage, PackageManager.GET_SIGNATURES);
            Signature[] signatures = packageInfo.signatures;
            byte[] cert = signatures[0].toByteArray();
            InputStream input = new ByteArrayInputStream(cert);
            CertificateFactory cf = CertificateFactory.getInstance("X509");
            X509Certificate c = (X509Certificate) cf.generateCertificate(input);

            MessageDigest md = MessageDigest.getInstance("SHA1");
            byte[] publicKey = md.digest(c.getEncoded());
            StringBuilder sb = new StringBuilder();
            for (byte b : publicKey) {
                sb.append(String.format("%02X:", b));
            }
            if (sb.length() > 0) sb.setLength(sb.length() - 1);

            textView.setText("App: Sri Bagavath\n\nPackage: " + targetPackage + "\n\nSHA-1 Fingerprint:\n\n" + sb.toString() + "\n\nCopy this value and send it to Antigravity.");
        } catch (Exception e) {
            textView.setText("Error: " + e.getMessage() + "\n\nMake sure Sri Bagavath is installed on this phone.");
        }
    }
}
