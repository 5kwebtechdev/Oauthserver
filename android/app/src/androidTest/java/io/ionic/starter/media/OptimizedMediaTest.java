package io.ionic.starter.media;

import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import io.ionic.starter.MainActivity;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class OptimizedMediaTest {
    @Test public void releaseWebViewServesEveryOriginalImageUrl() throws Exception {
        var instrumentation = InstrumentationRegistry.getInstrumentation();
        var context = instrumentation.getTargetContext();
        Intent intent = new Intent(context, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        MainActivity activity = (MainActivity) instrumentation.startActivitySync(intent);
        instrumentation.waitForIdleSync();
        assertTrue(activity.getBridge().getWebViewClient() instanceof OptimizedMediaWebViewClient);
        JSONObject manifest;
        try (InputStream stream = context.getAssets().open("public/_superme-media.json")) {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            byte[] buffer = new byte[8192]; int count;
            while ((count = stream.read(buffer)) != -1) bytes.write(buffer, 0, count);
            manifest = new JSONObject(new String(bytes.toByteArray(), StandardCharsets.UTF_8));
        }
        JSONObject entries = manifest.getJSONObject("entries");
        assertTrue(entries.length() > 0);
        String sample = null;
        Iterator<String> keys = entries.keys();
        int checked = 0;
        while (keys.hasNext()) {
            String original = keys.next();
            String url = activity.getBridge().getLocalUrl().replaceAll("/$", "") + original;
            WebResourceRequest request = request(url);
            WebResourceResponse response = activity.getBridge().getWebViewClient()
                .shouldInterceptRequest(activity.getBridge().getWebView(), request);
            assertNotNull(original, response);
            assertEquals(200, response.getStatusCode());
            assertEquals(entries.getJSONObject(original).getString("mime"), response.getMimeType());
            try (InputStream data = response.getData()) {
                Bitmap bitmap = BitmapFactory.decodeStream(data);
                assertNotNull("Android could not decode " + original, bitmap);
                assertTrue(bitmap.getWidth() > 0 && bitmap.getHeight() > 0);
                bitmap.recycle();
            }
            if (sample == null && original.endsWith(".png")) sample = url;
            checked++;
        }
        assertEquals(entries.length(), checked);

        // Exercise Chromium's real request path as well as Android's decoder.
        String script = "window.__mediaAudit=null;new Promise((resolve,reject)=>{const i=new Image();"
            + "i.onload=()=>resolve(i.naturalWidth);i.onerror=()=>reject('decode');i.src=" + JSONObject.quote(sample)
            + ";}).then(w=>window.__mediaAudit=w).catch(()=>window.__mediaAudit=-1);";
        instrumentation.runOnMainSync(() -> activity.getBridge().getWebView().evaluateJavascript(script, null));
        boolean decoded = false;
        for (int attempt = 0; attempt < 40 && !decoded; attempt++) {
            Thread.sleep(250);
            CountDownLatch latch = new CountDownLatch(1);
            String[] value = new String[1];
            instrumentation.runOnMainSync(() -> activity.getBridge().getWebView()
                .evaluateJavascript("window.__mediaAudit", result -> { value[0] = result; latch.countDown(); }));
            assertTrue(latch.await(5, TimeUnit.SECONDS));
            assertNotEquals("WebView image request failed", "-1", value[0]);
            decoded = value[0] != null && value[0].matches("[1-9][0-9]*");
        }
        assertTrue("Real WebView did not decode the original .png URL", decoded);
        instrumentation.runOnMainSync(activity::finish);
    }

    private WebResourceRequest request(String url) {
        return new WebResourceRequest() {
            public Uri getUrl() { return Uri.parse(url); }
            public boolean isForMainFrame() { return false; }
            public boolean isRedirect() { return false; }
            public boolean hasGesture() { return false; }
            public String getMethod() { return "GET"; }
            public Map<String, String> getRequestHeaders() { return Collections.emptyMap(); }
        };
    }
}
