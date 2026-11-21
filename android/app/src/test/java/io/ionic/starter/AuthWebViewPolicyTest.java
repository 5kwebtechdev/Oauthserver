package io.ionic.starter;
import org.junit.Test;
import static org.junit.Assert.*;
import java.util.Collections;
public class AuthWebViewPolicyTest {
    @Test public void productionUsesSameContractOnSsoHost() {
        assertTrue(AuthWebViewPolicy.validStart(start.replace("auth.supermeapp.com", "sso.supermeapp.com")));
        assertTrue(AuthWebViewPolicy.validStart("https://sso.supermeapp.com/android-dev-logout?post_logout_redirect_uri=superme%3A%2F%2Foauth%2Fdev%2Flogout"));
        assertEquals("/signup", AuthWebViewPolicy.accountRoute("https://supermeapp.com/app/signup"));
        assertFalse(AuthWebViewPolicy.validStart(start.replace("auth.supermeapp.com", "sso.supermeapp.com.evil.invalid")));
    }
    private final String start = "https://auth.supermeapp.com/oauth2/authorize?client_id=supermeapp-dev-android&response_type=code&redirect_uri=superme%3A%2F%2Foauth%2Fdev%2Fcallback&code_challenge_method=S256&code_challenge=challenge&state=random-state&nonce=random-nonce";
    @Test public void acceptsOnlyExactHostedGoogleSecurityPage() {
        assertTrue(AuthWebViewPolicy.validStart("https://auth.supermeapp.com/android-dev/google-security?transaction=tx"));
        assertFalse(AuthWebViewPolicy.validStart("https://auth.supermeapp.com/android-dev/google-security?transaction="));
        assertFalse(AuthWebViewPolicy.validStart("https://auth.supermeapp.com/android-dev/google-security?transaction=tx&transaction=other"));
        assertFalse(AuthWebViewPolicy.validStart("https://evil.invalid/android-dev/google-security?transaction=tx"));
    }
    @Test public void acceptsExactDevAuthorization() { assertTrue(AuthWebViewPolicy.validStart(start)); }
    @Test public void refusesHttpAndSpoofedHosts() {
        for (String url : new String[]{start.replace("https:", "http:"),start.replace("auth.supermeapp.com", "auth.supermeapp.com.evil.invalid"),start.replace("auth.supermeapp.com", "evil.invalid@auth.supermeapp.com"),start.replace("auth.supermeapp.com", "auth.supermeapp.com:444")}) assertFalse(AuthWebViewPolicy.validStart(url));
    }
    @Test public void requiresClientPkceStateAndNonce() {
        for (String url : new String[]{start.replace("supermeapp-dev-android", "supermeapp-dev-web"),start.replace("S256", "plain"),start.replace("&state=random-state", ""),start.replace("&nonce=random-nonce", ""),start+"&client_id=other"}) assertFalse(AuthWebViewPolicy.validStart(url));
    }
    @Test public void onlyExactRegisteredCallbackIsAccepted() {
        assertTrue(AuthWebViewPolicy.callback("superme://oauth/dev/callback?code=c&state=s", "/dev/callback"));
        for (String url : new String[]{"superme://evil/dev/callback?code=c", "superme://oauth/prod/callback", "superme://oauth/dev/callback/", "superme://user@oauth/dev/callback", "superme://oauth/dev/callback#code=c", "superme://oauth/dev/%63allback"}) assertFalse(AuthWebViewPolicy.callback(url, "/dev/callback"));
    }
    @Test public void logoutCannotChangeRedirect() {
        assertTrue(AuthWebViewPolicy.validStart("https://auth.supermeapp.com/android-dev-logout?post_logout_redirect_uri=superme%3A%2F%2Foauth%2Fdev%2Flogout"));
        assertFalse(AuthWebViewPolicy.validStart("https://auth.supermeapp.com/android-dev-logout?post_logout_redirect_uri=https://evil.invalid"));
    }
    @Test public void handsOnlyKnownDevAccountLinksToNativeRoutes() {
        assertEquals("/signup", AuthWebViewPolicy.accountRoute("https://devapk.supermeapp.com/"));
        assertEquals("/signup", AuthWebViewPolicy.accountRoute("https://devapk.supermeapp.com/signup"));
        assertEquals("/forgot-password", AuthWebViewPolicy.accountRoute("https://devapk.supermeapp.com/forgot-password"));
        for (String url : new String[]{"https://evil.invalid/signup", "https://devapk.supermeapp.com.evil.invalid/signup", "https://devapk.supermeapp.com/account", "http://devapk.supermeapp.com/signup", "https://devapk.supermeapp.com/%73ignup", "https://devapk.supermeapp.com/signup#token"}) assertNull(AuthWebViewPolicy.accountRoute(url));
    }
    @Test public void acceptsOnlyExactNativeGoogleAction() {
        assertTrue(AuthWebViewPolicy.googleAction("superme://oauth/dev/google"));
        for (String uri : new String[]{"superme://oauth/dev/google?token=x", "superme://oauth/dev/google#x", "superme://oauth/dev/google/", "superme://oauth/prod/google", "superme://user@oauth/dev/google"}) assertFalse(AuthWebViewPolicy.googleAction(uri));
    }
    @Test public void blocksFileJavascriptAndUnlistedResourceHosts() {
        for (String url : new String[]{"file:///etc/passwd", "javascript:alert(1)", "https://evil.invalid", "intent://oauth/dev/callback"}) assertFalse(AuthWebViewPolicy.secureHost(url, Collections.singleton("auth.supermeapp.com")));
    }
}
