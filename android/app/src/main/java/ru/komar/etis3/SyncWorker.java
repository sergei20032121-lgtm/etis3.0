package ru.komar.etis3;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import org.jsoup.nodes.Document;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Фоновая синхронизация: расписание этой и следующей недели — для виджета,
 * «оценки в семестре» — чтобы прислать уведомление о новой оценке.
 * Работает на cookie из WebView: пока сессия ЕТИС жива, вход не нужен.
 */
public class SyncWorker extends Worker {

    static final String CHANNEL = "grades";
    private static final String PERIODIC = "etis3-sync";
    private static final String ONCE = "etis3-sync-now";

    public SyncWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    static void schedule(Context c) {
        Constraints net = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        PeriodicWorkRequest req = new PeriodicWorkRequest.Builder(SyncWorker.class, 1, TimeUnit.HOURS)
                .setConstraints(net).build();
        WorkManager.getInstance(c).enqueueUniquePeriodicWork(PERIODIC, ExistingPeriodicWorkPolicy.KEEP, req);
    }

    /** Сразу после того, как в приложении открылся ЕТИС (не чаще раза в 10 минут). */
    static void syncSoon(Context c) {
        if (System.currentTimeMillis() - EtisStore.lastSync(c) < 10 * 60000L) return;
        Constraints net = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        OneTimeWorkRequest req = new OneTimeWorkRequest.Builder(SyncWorker.class).setConstraints(net).build();
        WorkManager.getInstance(c).enqueueUniqueWork(ONCE, ExistingWorkPolicy.KEEP, req);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context c = getApplicationContext();
        EtisStore.markSync(c);
        try {
            syncTimetable(c);
            syncGrades(c);
            EtisStore.setLoggedOut(c, false);
        } catch (EtisClient.LoginRequired e) {
            EtisStore.setLoggedOut(c, true);
        } catch (Exception e) {
            return Result.success(); // сеть/ЕТИС недоступны — попробуем в следующий раз
        } finally {
            NextPairWidget.updateAll(c);
        }
        return Result.success();
    }

    private void syncTimetable(Context c) throws Exception {
        Document week = EtisClient.fetch("stu.timetable");
        List<EtisClient.Pair> pairs = new ArrayList<>(EtisClient.parseWeek(week));
        String next = EtisClient.nextWeekUrl(week);
        if (next != null) {
            try { pairs.addAll(EtisClient.parseWeek(EtisClient.fetch(next))); } catch (EtisClient.LoginRequired e) { throw e; } catch (Exception ignored) { }
        }
        // Пустой ответ не затирает сохранённое расписание
        if (!pairs.isEmpty() || !week.select("div.day").isEmpty()) EtisStore.savePairs(c, pairs);
    }

    private void syncGrades(Context c) throws Exception {
        Map<String, EtisClient.Grade> fresh = EtisClient.parseGrades(EtisClient.fetch("stu.signs?p_mode=current"));
        if (fresh.isEmpty()) return;
        boolean first = !EtisStore.hasGrades(c);
        Map<String, String> old = EtisStore.loadGrades(c);
        List<EtisClient.Grade> news = new ArrayList<>();
        for (Map.Entry<String, EtisClient.Grade> e : fresh.entrySet()) {
            String v = e.getValue().value;
            if (v.isEmpty()) continue;
            String was = old.get(e.getKey());
            if (!v.equals(was) && (was != null || !first)) news.add(e.getValue());
        }
        EtisStore.saveGrades(c, fresh);
        if (!first && !news.isEmpty()) notifyGrades(c, news);
    }

    static void ensureChannel(Context c) {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel ch = new NotificationChannel(CHANNEL, "Новые оценки", NotificationManager.IMPORTANCE_DEFAULT);
        ch.setDescription("Уведомление, когда в ЕТИС появляется оценка за контрольную точку");
        nm.createNotificationChannel(ch);
    }

    private static void notifyGrades(Context c, List<EtisClient.Grade> news) {
        if (Build.VERSION.SDK_INT >= 33
                && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        ensureChannel(c);
        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse(EtisClient.BASE + "stu.signs?p_mode=current"), c, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(c, 1, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        android.app.Notification.Builder b = Build.VERSION.SDK_INT >= 26
                ? new android.app.Notification.Builder(c, CHANNEL)
                : new android.app.Notification.Builder(c);
        b.setSmallIcon(R.drawable.ic_stat_etis).setAutoCancel(true).setContentIntent(pi)
                .setColor(0xFF7C6FD4).setCategory(android.app.Notification.CATEGORY_SOCIAL);
        if (news.size() == 1) {
            EtisClient.Grade g = news.get(0);
            String text = gradeLine(g);
            b.setContentTitle("Новая оценка · " + g.dis).setContentText(text)
                    .setStyle(new android.app.Notification.BigTextStyle().bigText(text));
        } else {
            android.app.Notification.InboxStyle inbox = new android.app.Notification.InboxStyle();
            for (EtisClient.Grade g : news) inbox.addLine(g.dis + ": " + gradeShort(g));
            b.setContentTitle(news.size() + " " + plural(news.size(), "новая оценка", "новые оценки", "новых оценок"))
                    .setContentText(news.get(0).dis + ": " + gradeShort(news.get(0)))
                    .setStyle(inbox);
        }
        try {
            ((NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE)).notify((int) (System.currentTimeMillis() % 100000), b.build());
        } catch (SecurityException ignored) { }
    }

    private static String gradeShort(EtisClient.Grade g) {
        return g.value + (g.max.isEmpty() || g.max.equals("0") ? "" : " из " + g.max);
    }

    private static String gradeLine(EtisClient.Grade g) {
        return gradeShort(g) + " — " + g.topic;
    }

    static String plural(int n, String one, String few, String many) {
        int a = Math.abs(n) % 100, b = a % 10;
        if (a > 10 && a < 20) return many;
        if (b > 1 && b < 5) return few;
        if (b == 1) return one;
        return many;
    }
}
