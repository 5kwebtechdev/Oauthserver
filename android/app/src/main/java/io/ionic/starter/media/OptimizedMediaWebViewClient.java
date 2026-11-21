package io.ionic.starter.media;

import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeWebViewClient;
import java.io.FileNotFoundException;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Iterator;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Only the packaging of local artwork changes. All other requests, navigation,
 * bridge callbacks, hosted auth and error handling stay with Capacitor's client.
 */
public final class OptimizedMediaWebViewClient extends BridgeWebViewClient {
    private final Bridge bridge;
    private final BundledMediaIndex index;

    public OptimizedMediaWebViewClient(Bridge bridge) {
        super(bridge);
        this.bridge = bridge;
        index = new BundledMediaIndex(bridge.getLocalUrl());
        try (InputStream stream = bridge.getContext().getAssets().open("public/_superme-media.json")) {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192];
            int count;
            while ((count = stream.read(buffer)) != -1) bytes.write(buffer, 0, count);
            JSONObject manifest = new JSONObject(new String(bytes.toByteArray(), StandardCharsets.UTF_8));
            if (manifest.getInt("version") != 1) throw new JSONException("Unsupported media manifest");
            JSONObject entries = manifest.getJSONObject("entries");
            Iterator<String> keys = entries.keys();
            while (keys.hasNext()) {
                String original = keys.next();
                JSONObject entry = entries.getJSONObject(original);
                index.add(original, entry.getString("asset"), entry.getString("mime"));
            }
        } catch (FileNotFoundException exception) {
            // Unoptimized/dev builds use the original files through Capacitor.
        } catch (IOException | JSONException exception) {
            throw new IllegalStateException("Bundled media manifest is invalid", exception);
        }
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        // Live-reload or downloaded web bundles must not use an older APK's map.
        if (bridge.getServerUrl() == null && "public".equals(bridge.getLocalServer().getBasePath())) {
            BundledMediaIndex.Asset asset = index.find(request.getUrl().toString(), request.getMethod());
            if (asset != null) {
                try {
                    return new WebResourceResponse(asset.mime, null, 200, "OK",
                        Collections.singletonMap("Cache-Control", "no-cache"),
                        bridge.getContext().getAssets().open(asset.path));
                } catch (IOException exception) {
                    // A release preflight validates every target; preserve normal
                    // WebView error handling if the installed package is damaged.
                }
            }
        }
        return super.shouldInterceptRequest(view, request);
    }
}
