package io.ionic.starter;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/** Pure URL policy, also tested without a device. No wildcard host matching. */
public final class AuthWebViewPolicy {
    private AuthWebViewPolicy() {}
    public static boolean secureHost(String value, Set<String> hosts) {
        try {
            URI uri = new URI(value);
            return "https".equals(uri.getScheme()) && hosts.contains(uri.getHost())
                && (uri.getPort() == -1 || uri.getPort() == 443) && uri.getUserInfo() == null;
        } catch (Exception error) { return false; }
    }
    public static boolean callback(String value, String path) {
        try {
            URI uri = new URI(value);
            return "superme".equals(uri.getScheme()) && "oauth".equals(uri.getHost())
                && path.equals(uri.getRawPath()) && uri.getPort() == -1 && uri.getUserInfo() == null && uri.getFragment() == null;
        } catch (Exception error) { return false; }
    }
    /** Known account links hand back to native routing; never load the frontend in auth WebView. */
    public static String accountRoute(String value) {
        try {
            if (!secureHost(value, Set.of("devapk.supermeapp.com", "supermeapp.com"))) return null;
            URI uri = new URI(value);
            if (uri.getFragment() != null) return null;
            switch (uri.getRawPath()) {
                case "/": case "/signup": case "/sign-up": case "/app/signup": return "/signup";
                case "/forgot-password": case "/app/forgot-password": return "/forgot-password";
                default: return null;
            }
        } catch (Exception error) { return null; }
    }
    public static boolean googleAction(String value) { return "superme://oauth/dev/google".equals(value); }
    public static boolean validStart(String value) {
        try {
            if (!secureHost(value, Set.of("auth.supermeapp.com", "sso.supermeapp.com"))) return false;
            URI uri = new URI(value);
            Map<String, String> params = new HashMap<>();
            for (String pair : uri.getRawQuery().split("&")) {
                String[] parts = pair.split("=", 2);
                String key = URLDecoder.decode(parts[0], StandardCharsets.UTF_8.name());
                String decoded = URLDecoder.decode(parts.length == 2 ? parts[1] : "", StandardCharsets.UTF_8.name());
                if (params.put(key, decoded) != null) return false;
            }
            if ("/android-dev/google-security".equals(uri.getRawPath())) return uri.getFragment() == null && params.size() == 1 && present(params, "transaction");
            if ("/android-dev-logout".equals(uri.getRawPath())) return "superme://oauth/dev/logout".equals(params.get("post_logout_redirect_uri"));
            return "/oauth2/authorize".equals(uri.getRawPath()) && "supermeapp-dev-android".equals(params.get("client_id"))
                && "superme://oauth/dev/callback".equals(params.get("redirect_uri")) && "code".equals(params.get("response_type"))
                && "S256".equals(params.get("code_challenge_method")) && present(params, "code_challenge")
                && present(params, "nonce") && present(params, "state");
        } catch (Exception error) { return false; }
    }
    private static boolean present(Map<String, String> values, String key) { return values.containsKey(key) && !values.get(key).isEmpty(); }
}
