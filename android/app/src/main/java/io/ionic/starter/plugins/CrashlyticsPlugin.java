package io.ionic.starter.plugins;

import android.content.pm.ApplicationInfo;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.crashlytics.FirebaseCrashlytics;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.Iterator;

@CapacitorPlugin(name = "Crashlytics")
public class CrashlyticsPlugin extends Plugin {
    private FirebaseCrashlytics crashlytics() {
        return FirebaseCrashlytics.getInstance();
    }

    @PluginMethod
    public void setEnabled(PluginCall call) {
        Boolean enabled = call.getBoolean("enabled", true);
        crashlytics().setCrashlyticsCollectionEnabled(Boolean.TRUE.equals(enabled));
        call.resolve();
    }

    @PluginMethod
    public void setUserId(PluginCall call) {
        String userId = call.getString("userId", "");
        crashlytics().setUserId(userId == null ? "" : userId);
        call.resolve();
    }

    @PluginMethod
    public void log(PluginCall call) {
        String message = call.getString("message", "");
        if (message != null && !message.trim().isEmpty()) {
            crashlytics().log(message);
        }
        call.resolve();
    }

    @PluginMethod
    public void setCustomKey(PluginCall call) {
        String key = call.getString("key");
        String value = call.getString("value", "");
        if (key == null || key.trim().isEmpty()) {
            call.reject("Crashlytics custom key is required.");
            return;
        }
        crashlytics().setCustomKey(key, value == null ? "" : value);
        call.resolve();
    }

    @PluginMethod
    public void recordException(PluginCall call) {
        String name = call.getString("name", "NonFatalError");
        String message = call.getString("message", "A non-fatal error was recorded.");
        String stack = call.getString("stack", "");

        applyCustomKeys(call.getObject("keys"));

        Exception exception = new Exception(name + ": " + message);
        if (stack != null && !stack.trim().isEmpty()) {
            crashlytics().log(stack);
        }
        crashlytics().recordException(exception);
        call.resolve();
    }

    @PluginMethod
    public void forceCrash(PluginCall call) {
        if (!isDebuggableBuild()) {
            call.reject("Test crashes are available only in debug builds.");
            return;
        }
        throw new RuntimeException("Firebase Crashlytics test crash from debug build.");
    }

    private boolean isDebuggableBuild() {
        return getContext() != null
            && (getContext().getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    }

    private void applyCustomKeys(JSObject keys) {
        if (keys == null) {
            return;
        }

        Iterator<String> iterator = keys.keys();
        while (iterator.hasNext()) {
            String key = iterator.next();
            if (key == null || key.trim().isEmpty()) {
                continue;
            }
            try {
                Object value = keys.get(key);
                if (value == null || value == JSONObject.NULL) {
                    crashlytics().setCustomKey(key, "");
                } else {
                    crashlytics().setCustomKey(key, String.valueOf(value));
                }
            } catch (JSONException ignored) {
                crashlytics().setCustomKey(key, "");
            }
        }
    }
}
