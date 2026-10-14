package ru.komar.etis3;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.HashSet;
import java.util.Set;

/**
 * Напоминания о ДЗ к парам. Список приходит со страницы (заметки), будильники — AlarmManager.
 * После перезагрузки телефона будильники пропадают — восстанавливаем их из сохранённого списка.
 */
public class ReminderReceiver extends BroadcastReceiver {

    static final String CHANNEL = "reminders";
    private static final String ACTION_FIRE = "ru.komar.etis3.REMINDER";

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences("etis3-reminders", Context.MODE_PRIVATE);
    }

    /** Полная замена списка напоминаний: старые будильники снимаем, новые ставим. Вызовы не пересекаются. */
    static synchronized void replace(Context c, String json) {
        try {
            JSONArray list = new JSONArray(json);
            Set<String> old = prefs(c).getStringSet("ids", new HashSet<>());
            for (String id : old) cancel(c, id);
            Set<String> ids = new HashSet<>();
            long now = System.currentTimeMillis();
            for (int i = 0; i < list.length() && i < 60; i++) {
                JSONObject o = list.getJSONObject(i);
                long at = o.getLong("at");
                if (at <= now) continue;
                String id = o.getString("id");
                schedule(c, id, at, o.optString("title"), o.optString("text"));
                ids.add(id);
            }
            prefs(c).edit().putString("list", json).putStringSet("ids", ids).apply();
        } catch (Exception ignored) { }
    }

    private static PendingIntent intent(Context c, String id, String title, String text) {
        Intent i = new Intent(c, ReminderReceiver.class).setAction(ACTION_FIRE)
                .setData(Uri.parse("etis3-reminder://" + Uri.encode(id)))
                .putExtra("title", title).putExtra("text", text);
        return PendingIntent.getBroadcast(c, 0, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void schedule(Context c, String id, long at, String title, String text) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        PendingIntent pi = intent(c, id, title, text);
        // Точный будильник, если система разрешает; иначе — окно в 10 минут (setAndAllowWhileIdle может опоздать на часы)
        if (Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi);
        } else {
            am.setWindow(AlarmManager.RTC_WAKEUP, at, 10 * 60000L, pi);
        }
    }

    private static void cancel(Context c, String id) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        am.cancel(intent(c, id, "", ""));
    }

    @Override
    public void onReceive(Context c, Intent intent) {
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            replace(c, prefs(c).getString("list", "[]"));
            SyncWorker.schedule(c);
            return;
        }
        if (!ACTION_FIRE.equals(action)) return;
        if (Build.VERSION.SDK_INT >= 33
                && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        ensureChannel(c);
        String title = intent.getStringExtra("title");
        String text = intent.getStringExtra("text");
        Intent open = new Intent(c, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(c, 2, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26 ? new Notification.Builder(c, CHANNEL) : new Notification.Builder(c);
        b.setSmallIcon(R.drawable.ic_stat_etis).setColor(0xFF7C6FD4).setAutoCancel(true).setContentIntent(pi)
                .setContentTitle(title).setContentText(text).setStyle(new Notification.BigTextStyle().bigText(text))
                .setCategory(Notification.CATEGORY_REMINDER);
        try {
            ((NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE))
                    .notify(intent.getDataString() != null ? intent.getDataString().hashCode() : 7, b.build());
        } catch (SecurityException ignored) { }
    }

    static void ensureChannel(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, "Задания к парам", NotificationManager.IMPORTANCE_DEFAULT);
        ch.setDescription("Напоминания о заметках и ДЗ: вечером накануне или за час до пары");
        nm.createNotificationChannel(ch);
    }
}
