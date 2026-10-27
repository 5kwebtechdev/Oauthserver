package io.ionic.starter;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.app.PictureInPictureParams;
import android.content.res.Configuration;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.util.Rational;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.TextView;
import io.ionic.starter.plugins.ActiveTimerPlugin;

import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;
import com.android.installreferrer.api.ReferrerDetails;
import com.getcapacitor.BridgeActivity;
import io.ionic.starter.plugins.AppCheckPlugin;
import io.ionic.starter.plugins.CrashlyticsPlugin;
import io.ionic.starter.plugins.InstallReferrerPlugin;
import io.ionic.starter.plugins.NativeCredentialsPlugin;
import io.ionic.starter.plugins.PlayStoreUpdatePlugin;

public class MainActivity extends BridgeActivity {

    private static final String KEY_CHECKED = "referralChecked";
    private String timerTitle;
    private long timerEnd;
    private TextView timerView;
    private final Handler timerHandler = new Handler(Looper.getMainLooper());
    private final Runnable renderTimer = new Runnable() {
        @Override public void run() {
            if (timerView == null || timerView.getVisibility() != View.VISIBLE) return;
            long seconds = Math.max(0, (timerEnd - System.currentTimeMillis() + 999) / 1000);
            timerView.setText((timerTitle == null ? "Activity" : timerTitle) + "\n" +
                (seconds == 0 ? "Time finished\nOpen to continue" : String.format(java.util.Locale.ROOT, "%02d:%02d", seconds / 60, seconds % 60)));
            timerHandler.postDelayed(this, 1000);
        }
    };

    public void setActiveTimer(String title, long end) {
        timerTitle = title;
        timerEnd = end;
        if (title == null && Build.VERSION.SDK_INT >= 26 && isInPictureInPictureMode()) {
            // Keep the existing task on the back stack; expanding restores its WebView.
            moveTaskToBack(true);
        }
    }

    @Override protected void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (Build.VERSION.SDK_INT < 26 || timerTitle == null || timerEnd <= System.currentTimeMillis()
                || !getPackageManager().hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)) return;
        showTimerView();
        try {
            boolean entered = enterPictureInPictureMode(new PictureInPictureParams.Builder()
                .setAspectRatio(new Rational(16, 9)).build());
            if (!entered) hideTimerView();
        } catch (IllegalStateException | IllegalArgumentException exception) { hideTimerView(); }
    }

    private void showTimerView() {
        if (timerView == null) {
            timerView = new TextView(this);
            timerView.setGravity(Gravity.CENTER);
            timerView.setTextColor(0xff432477);
            timerView.setBackgroundColor(0xfff3eef9);
            timerView.setTextSize(24);
            timerView.setPadding(20, 12, 20, 12);
            addContentView(timerView, new ViewGroup.LayoutParams(-1, -1));
        }
        timerView.setVisibility(View.VISIBLE);
        timerHandler.removeCallbacks(renderTimer);
        renderTimer.run();
    }

    private void hideTimerView() {
        timerHandler.removeCallbacks(renderTimer);
        if (timerView != null) timerView.setVisibility(View.GONE);
    }

    @Override public void onPictureInPictureModeChanged(boolean inPip, Configuration configuration) {
        super.onPictureInPictureModeChanged(inPip, configuration);
        if (inPip) showTimerView(); else hideTimerView();
    }

    @Override public void onDestroy() {
        timerHandler.removeCallbacks(renderTimer);
        super.onDestroy();
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ActiveTimerPlugin.class);
        registerPlugin(AppCheckPlugin.class);
        registerPlugin(CrashlyticsPlugin.class);
        registerPlugin(InstallReferrerPlugin.class);
        registerPlugin(NativeCredentialsPlugin.class);
        registerPlugin(PlayStoreUpdatePlugin.class);
        super.onCreate(savedInstanceState);
        getBridge().getWebView().setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_YES);
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
