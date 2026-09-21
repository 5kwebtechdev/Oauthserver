package io.ionic.starter;

import android.app.Application;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.pm.ApplicationInfo;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import com.google.firebase.FirebaseApp;
import com.google.firebase.appcheck.FirebaseAppCheck;
import com.google.firebase.appcheck.AppCheckProviderFactory;
import com.google.firebase.appcheck.playintegrity.PlayIntegrityAppCheckProviderFactory;
import java.lang.reflect.Method;

public class MainApplication extends Application {
    private static final String CHANNEL_ID = "superme_ping_v1";

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        FirebaseApp.initializeApp(this);
        FirebaseAppCheck firebaseAppCheck = FirebaseAppCheck.getInstance();
        if (isDebuggable()) {
            AppCheckProviderFactory debugFactory = getDebugAppCheckProviderFactory();
            firebaseAppCheck.installAppCheckProviderFactory(
                debugFactory != null ? debugFactory
                    : PlayIntegrityAppCheckProviderFactory.getInstance()
            );
        } else {
            firebaseAppCheck.installAppCheckProviderFactory(
                PlayIntegrityAppCheckProviderFactory.getInstance()
            );
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (manager == null) return;
        // Existing channel settings belong to the user. Do not delete/recreate it.
        if (manager.getNotificationChannel(CHANNEL_ID) == null) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "SuperMeApp", NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("SuperMeApp notifications");
            AudioAttributes audio = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
            // Use the resource name instead of a numeric ID that can change on upgrade.
            Uri sound = Uri.parse("android.resource://" + getPackageName() + "/raw/superme_ping");
            channel.setSound(sound, audio);
            channel.enableVibration(true);
            channel.enableLights(true);
            channel.setLightColor(0xFFEE6621);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            manager.createNotificationChannel(channel);
        }
        if (isDebuggable()) {
            NotificationChannel actual = manager.getNotificationChannel(CHANNEL_ID);
            if (actual != null) {
                Log.d("SuperMeNotifications", "Channel=" + actual.getId()
                    + ", importance=" + actual.getImportance() + ", sound=" + actual.getSound());
            }
        }
    }

    private AppCheckProviderFactory getDebugAppCheckProviderFactory() {
        try {
            Class<?> factoryClass = Class.forName(
                "com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory"
            );
            Method getInstance = factoryClass.getMethod("getInstance");
            return (AppCheckProviderFactory) getInstance.invoke(null);
        } catch (Exception ignored) {
            return null;
        }
    }

    private boolean isDebuggable() {
        return (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
    }
}
