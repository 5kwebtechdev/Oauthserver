package io.ionic.starter.plugins;

import android.app.Activity;
import android.content.Intent;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import io.ionic.starter.AuthWebViewActivity;

/** Only the trusted app WebView can call this plugin. The auth WebView has no bridge. */
@CapacitorPlugin(name = "AuthWebView")
public class AuthWebViewPlugin extends Plugin {
    @PluginMethod public void open(PluginCall call) {
        String url = call.getString("url", "");
        if (!AuthWebViewActivity.validStart(url)) { call.reject("Invalid DEV sign-in URL"); return; }
        Intent intent = new Intent(getActivity(), AuthWebViewActivity.class);
        intent.putExtra("authorizationUrl", url);
        startActivityForResult(call, intent, "finished");
    }
    @ActivityCallback private void finished(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        JSObject response = new JSObject();
        if (result.getResultCode() == Activity.RESULT_OK && data != null) {
            response.put("callbackUrl", data.getStringExtra("callbackUrl"));
            response.put("appRoute", data.getStringExtra("appRoute"));
            response.put("action", data.getStringExtra("action"));
        } else {
            response.put("cancelled", true);
            response.put("error", data == null ? "cancelled" : data.getStringExtra("error"));
        }
        call.resolve(response);
    }
}
