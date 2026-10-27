package io.ionic.starter;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.net.Uri;
import android.view.View;
import android.widget.RemoteViews;
import com.google.firebase.messaging.RemoteMessage;
import io.capawesome.capacitorjs.plugins.firebase.messaging.MessagingService;
import java.util.Map;

/** Birthday data-only pushes are rendered here even when the WebView is stopped. */
public class BirthdayMessagingService extends MessagingService {
    private static final String CHANNEL = "superme_ping_v1";
    private static final long RETENTION = 35L * 24 * 60 * 60 * 1000;

    static boolean accepts(Map<String, String> data) {
        String type = data.get("type");
        if (!"BIRTHDAY_SELF".equals(type) && !"CHILD_BIRTHDAY_PARENT".equals(type)) return false;
        for (String key : new String[]{"notificationId", "title", "body", "actionScreen", "referenceId"}) {
            if (data.get(key) == null || data.get(key).trim().isEmpty()) return false;
        }
        return true;
    }

    @Override public void onMessageReceived(RemoteMessage message) {
        // Legacy notification+data and every non-birthday message keep the plugin path.
        if (message.getNotification() == null && accepts(message.getData())) {
            try { displayBirthday(message); }
            catch (RuntimeException failure) {
                android.util.Log.e("BirthdayPush", "Unable to display birthday notification", failure);
            }
        }
        // Preserve inbox refresh and all existing Firebase plugin callbacks.
        super.onMessageReceived(message);
    }

    private synchronized void displayBirthday(RemoteMessage message) {
        Map<String, String> data = message.getData();
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (!manager.areNotificationsEnabled()) return;
        SharedPreferences seen = getSharedPreferences("birthday_push_receipts", MODE_PRIVATE);
        String id = data.get("notificationId");
        long now = System.currentTimeMillis();
        if (now - seen.getLong(id, 0) < RETENTION) return;
        if (manager.getNotificationChannel(CHANNEL) == null) {
            NotificationChannel channel = new NotificationChannel(CHANNEL, "SuperMe Notifications", NotificationManager.IMPORTANCE_HIGH);
            channel.setSound(Uri.parse("android.resource://" + getPackageName() + "/raw/superme_ping"),
                new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build());
            manager.createNotificationChannel(channel);
        }
        Intent intent = new Intent(this, MainActivity.class)
            .setAction(getPackageName() + ".birthday." + id)
            .addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        for (Map.Entry<String, String> entry : data.entrySet()) intent.putExtra(entry.getKey(), entry.getValue());
        // The existing Capacitor Firebase handler uses this key to dispatch the tap.
        intent.putExtra("google.message_id", message.getMessageId() == null ? id : message.getMessageId());
        PendingIntent tap = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        RemoteViews expanded = new RemoteViews(getPackageName(), R.layout.notification_birthday);
        expanded.setTextViewText(R.id.birthday_title, data.get("title"));
        expanded.setTextViewText(R.id.birthday_body, data.get("body"));
        expanded.setViewVisibility(R.id.birthday_cta, "BIRTHDAY_SELF".equals(data.get("type")) ? View.VISIBLE : View.GONE);
        expanded.setOnClickPendingIntent(R.id.birthday_cta, tap);
        Notification notification = new Notification.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_notification)
            .setContentTitle(data.get("title")).setContentText(data.get("body"))
            .setCustomBigContentView(expanded)
            .setStyle(new Notification.DecoratedCustomViewStyle())
            .setContentIntent(tap).setAutoCancel(true).setOnlyAlertOnce(true)
            .build();
        manager.notify("birthday:" + id, 0, notification);
        SharedPreferences.Editor editor = seen.edit();
        for (Map.Entry<String, ?> receipt : seen.getAll().entrySet()) {
            if (receipt.getValue() instanceof Long && now - (Long) receipt.getValue() >= RETENTION) editor.remove(receipt.getKey());
        }
        editor.putLong(id, now).apply();
    }
}
