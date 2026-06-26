package io.ionic.starter;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;

import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;
import com.android.installreferrer.api.ReferrerDetails;
import com.getcapacitor.BridgeActivity;
import io.ionic.starter.plugins.AppCheckPlugin;
import io.ionic.starter.plugins.CrashlyticsPlugin;
import io.ionic.starter.plugins.InstallReferrerPlugin;

public class MainActivity extends BridgeActivity {

    private static final String KEY_CHECKED = "referralChecked";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppCheckPlugin.class);
        registerPlugin(CrashlyticsPlugin.class);
        registerPlugin(InstallReferrerPlugin.class);
        super.onCreate(savedInstanceState);
        checkInstallReferrer();
    }

    private void checkInstallReferrer() {
        SharedPreferences prefs = getSharedPreferences(InstallReferrerPlugin.PREFS_NAME, Context.MODE_PRIVATE);

        // Only run once — after first check, skip forever
        if (prefs.getBoolean(KEY_CHECKED, false)) return;

        InstallReferrerClient client = InstallReferrerClient.newBuilder(this).build();
        client.startConnection(new InstallReferrerStateListener() {
            @Override
            public void onInstallReferrerSetupFinished(int responseCode) {
                prefs.edit().putBoolean(KEY_CHECKED, true).apply();
                if (responseCode == InstallReferrerClient.InstallReferrerResponse.OK) {
                    try {
                        ReferrerDetails details = client.getInstallReferrer();
                        String referrer = details.getInstallReferrer();
                        // referrer looks like: "referralCode=UJXCJDYU"
                        Uri uri = Uri.parse("?" + referrer);
                        String code = uri.getQueryParameter("referralCode");
                        if (code != null && !code.isEmpty()) {
                            prefs.edit().putString(InstallReferrerPlugin.KEY_REFERRAL, code.toUpperCase()).apply();
                        }
                    } catch (Exception e) {
                        // ignore
                    }
                }
                client.endConnection();
            }

            @Override
            public void onInstallReferrerServiceDisconnected() {
                // ignore
            }
        });
    }
}
