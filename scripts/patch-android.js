const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
if (fs.existsSync(manifestPath)) {
  let xml = fs.readFileSync(manifestPath, 'utf8');
  if (!xml.includes('android.permission.INTERNET')) {
    xml = xml.replace('<application', '<uses-permission android:name="android.permission.INTERNET" />\n    <application');
  }
  if (!xml.includes('android.permission.ACCESS_NETWORK_STATE')) {
    xml = xml.replace('<application', '<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />\n    <application');
  }
  if (!xml.includes('android:configChanges=')) {
    xml = xml.replace(
      /(<activity[^>]*android:name="[^"]*MainActivity"[^>]*)>/,
      '$1 android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode" android:screenOrientation="unspecified" android:hardwareAccelerated="true">'
    );
  } else {
    xml = xml.replace(/android:screenOrientation="[^"]*"/g, 'android:screenOrientation="unspecified"');
  }
  if (!xml.includes('android:usesCleartextTraffic')) {
    xml = xml.replace('<application', '<application android:usesCleartextTraffic="true" android:hardwareAccelerated="true"');
  }
  fs.writeFileSync(manifestPath, xml, 'utf8');
  console.log('Patched AndroidManifest.xml successfully');
}

function findMainActivity(dir) {
  if (!fs.existsSync(dir)) return null;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = findMainActivity(full);
      if (found) return found;
    } else if (entry.name === 'MainActivity.java' || entry.name === 'MainActivity.kt') {
      return full;
    }
  }
  return null;
}

const mainActPath = findMainActivity(path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'java'));
if (mainActPath && mainActPath.endsWith('.java')) {
  let java = fs.readFileSync(mainActPath, 'utf8');
  if (!java.includes('setOverScrollMode')) {
    const imports = [
      'import android.os.Bundle;',
      'import android.view.View;',
      'import android.webkit.WebSettings;',
      'import android.webkit.WebView;'
    ].join('\n');
    java = java.replace('import com.getcapacitor.BridgeActivity;', imports + '\nimport com.getcapacitor.BridgeActivity;');
    const onCreatePatch = `
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (this.bridge != null && this.bridge.getWebView() != null) {
            WebView wv = this.bridge.getWebView();
            wv.setVerticalScrollBarEnabled(true);
            wv.setScrollbarFadingEnabled(true);
            wv.setOverScrollMode(View.OVER_SCROLL_ALWAYS);
            WebSettings settings = wv.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setMediaPlaybackRequiresUserGesture(false);
        }
    }
`;
    java = java.replace(/public class MainActivity extends BridgeActivity\s*\{/, 'public class MainActivity extends BridgeActivity {' + onCreatePatch);
    fs.writeFileSync(mainActPath, java, 'utf8');
    console.log('Patched MainActivity.java successfully');
  }
}
