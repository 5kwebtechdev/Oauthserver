package io.ionic.starter.plugins;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.firebase.appcheck.FirebaseAppCheck;

@CapacitorPlugin(name = "FirebaseAppCheck")
public class AppCheckPlugin extends Plugin {
    @PluginMethod
    public void getToken(PluginCall call) {
        boolean forceRefresh = Boolean.TRUE.equals(call.getBoolean("forceRefresh", false));

        FirebaseAppCheck.getInstance()
            .getAppCheckToken(forceRefresh)
            .addOnSuccessListener(result -> {
                JSObject response = new JSObject();
                response.put("token", result.getToken());
                response.put("expireTimeMillis", result.getExpireTimeMillis());
                call.resolve(response);
            })
            .addOnFailureListener(error -> call.reject("Unable to get Firebase App Check token", error));
    }
}
