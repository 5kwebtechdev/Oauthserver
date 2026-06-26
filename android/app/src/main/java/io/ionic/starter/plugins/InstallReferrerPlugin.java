package io.ionic.starter.plugins;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "InstallReferrer")
public class InstallReferrerPlugin extends Plugin {

    public static final String PREFS_NAME = "SuperMeInstallPrefs";
    public static final String KEY_REFERRAL = "referralCode";

    @PluginMethod
    public void getReferralCode(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String code = prefs.getString(KEY_REFERRAL, null);
        JSObject ret = new JSObject();
        ret.put("code", code != null ? code : "");
        call.resolve(ret);
    }

    @PluginMethod
    public void clearReferralCode(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        prefs.edit().remove(KEY_REFERRAL).apply();
        call.resolve();
    }
}
