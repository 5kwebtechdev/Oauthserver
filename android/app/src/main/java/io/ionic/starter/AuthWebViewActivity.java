package io.ionic.starter;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Bundle;
import android.webkit.*;
import android.view.View;
import android.widget.FrameLayout;

import java.io.ByteArrayInputStream;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/** Standalone hosted-login WebView: no Capacitor bridge, injected script or URL logging. */
public final class AuthWebViewActivity extends Activity {
    private WebView web;
    private WebView loader;
    private android.window.OnBackInvokedCallback backCallback;
    private boolean finished;
    private String expectedCallbackPath;
    private final android.os.Handler timeoutHandler = new android.os.Handler(android.os.Looper.getMainLooper());
    private final Runnable logoutTimeout = () -> finishError("logout_timeout");
    private static final Set<String> NAVIGATION_HOSTS = new HashSet<>(Arrays.asList(
        "auth.supermeapp.com", "sso.supermeapp.com", "accounts.google.com", "appleid.apple.com"
    ));
    private static final Set<String> RESOURCE_HOSTS = new HashSet<>(Arrays.asList(
        "auth.supermeapp.com", "sso.supermeapp.com", "accounts.google.com", "appleid.apple.com",
        "challenges.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com",
        "www.gstatic.com", "ssl.gstatic.com"
    ));
    private static boolean secureHost(Uri uri, Set<String> hosts) {
        return AuthWebViewPolicy.secureHost(uri.toString(), hosts);
    }
    public static boolean validStart(String value) { return AuthWebViewPolicy.validStart(value); }
    private boolean callback(Uri uri) { return AuthWebViewPolicy.callback(uri.toString(), expectedCallbackPath); }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            backCallback = this::handleBack;
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, backCallback);
        }
        String url = getIntent().getStringExtra("authorizationUrl");
        if (state != null || url == null || !validStart(url)) { finishError("interrupted"); return; }
        expectedCallbackPath = "/android-dev-logout".equals(Uri.parse(url).getPath()) ? "/dev/logout" : "/dev/callback";
        if ("/dev/logout".equals(expectedCallbackPath)) timeoutHandler.postDelayed(logoutTimeout, 12000);
        FrameLayout layout = new FrameLayout(this);
        layout.setFitsSystemWindows(true);
        WebView.setWebContentsDebuggingEnabled(false);
        web = new WebView(this);
        layout.addView(web, new FrameLayout.LayoutParams(-1, -1));
        // A trusted local CSS-only copy of the existing SuperMe loader, never the auth page.
        loader = new WebView(this);
        loader.getSettings().setJavaScriptEnabled(false);
        loader.getSettings().setAllowContentAccess(false);
        loader.getSettings().setBlockNetworkLoads(true);
        loader.loadUrl("file:///android_asset/auth-loader.html");
        layout.addView(loader, new FrameLayout.LayoutParams(-1, -1));
        setContentView(layout);
        WebSettings settings = web.getSettings();
        // Hosted forms and Turnstile need normal page JavaScript; no scripts are injected.
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(true);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(ConsoleMessage message) { return true; }
            @Override public boolean onCreateWindow(WebView view, boolean dialog, boolean gesture, android.os.Message message) {
                new android.app.AlertDialog.Builder(AuthWebViewActivity.this)
                    .setTitle("Sign-in window")
                    .setMessage("This popup is not supported. Please reopen the Android sign-in page.")
                    .setPositiveButton("OK", (dialogInterface, which) -> {})
                    .show();
                return false; // Native Google support is pending; never bypass provider restrictions.
            }
            @Override public void onPermissionRequest(PermissionRequest request) { request.deny(); }
        });
        web.setWebViewClient(new WebViewClient() {
            private boolean intercept(WebView view, Uri uri, boolean mainFrame, boolean userGesture) {
                if (mainFrame && userGesture && "/dev/callback".equals(expectedCallbackPath) && AuthWebViewPolicy.googleAction(uri.toString())) {
                    if (!finished) {
                        finished = true; view.stopLoading();
                        setResult(RESULT_OK, new Intent().putExtra("action", "google")); finish();
                    }
                    return true;
                }
                String appRoute = AuthWebViewPolicy.accountRoute(uri.toString());
                if (mainFrame && userGesture && "/dev/callback".equals(expectedCallbackPath) && appRoute != null) {
                    if (!finished) {
                        finished = true;
                        view.stopLoading();
                        setResult(RESULT_OK, new Intent().putExtra("appRoute", appRoute));
                        finish();
                    }
                    return true;
                }
                if (callback(uri)) {
                    if (mainFrame && !finished) {
                        finished = true;
                        view.stopLoading();
                        setResult(RESULT_OK, new Intent().putExtra("callbackUrl", uri.toString()));
                        finish();
                    }
                    return true;
                }
                if (!secureHost(uri, mainFrame ? NAVIGATION_HOSTS : RESOURCE_HOSTS)) {
                    if (mainFrame) finishError("navigation_blocked");
                    return true;
                }
                return false;
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return intercept(view, request.getUrl(), request.isForMainFrame(), request.hasGesture());
            }
            @Override public void onPageStarted(WebView view, String url, Bitmap icon) {
                // Also enforce the policy for redirects not delivered to shouldOverrideUrlLoading.
                if (loader != null) loader.setVisibility(View.VISIBLE);
                intercept(view, Uri.parse(url), true, false);
            }
            @Override public void onPageCommitVisible(WebView view, String url) {
                if (loader != null && !"/dev/logout".equals(expectedCallbackPath)) loader.setVisibility(View.GONE);
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (secureHost(request.getUrl(), request.isForMainFrame() ? NAVIGATION_HOSTS : RESOURCE_HOSTS)) return null;
                return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked", java.util.Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel(); view.stopLoading(); finishError("tls_error");
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) finishError("load_failed");
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 400) finishError("load_failed");
            }
        });
        web.loadUrl(url);
    }
    private void finishError(String error) {
        if (finished) return;
        finished = true;
        if (web != null) web.stopLoading();
        setResult(RESULT_CANCELED, new Intent().putExtra("error", error)); finish();
    }
    @Override public void onBackPressed() { handleBack(); }
    private void handleBack() {
        if (web != null && web.canGoBack()) web.goBack(); else finishError("cancelled");
    }
    @Override protected void onDestroy() {
        timeoutHandler.removeCallbacks(logoutTimeout);
        if (android.os.Build.VERSION.SDK_INT >= 33 && backCallback != null) getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(backCallback);
        if (web != null) { web.stopLoading(); web.setWebChromeClient(null); web.setWebViewClient(new WebViewClient()); web.destroy(); web = null; }
        if (loader != null) { loader.destroy(); loader = null; }
        super.onDestroy();
    }
}
