package ru.komar.etis3;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.SystemClock;
import android.view.View;
import android.widget.RemoteViews;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;

/** Виджет «Сейчас / Следующая пара» с обратным отсчётом. */
public class NextPairWidget extends AppWidgetProvider {

    static final String ACTION_TICK = "ru.komar.etis3.WIDGET_TICK";

    @Override
    public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
        render(context, manager, ids);
        SyncWorker.schedule(context);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_TICK.equals(intent.getAction())) updateAll(context);
    }

    static void updateAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] ids = m.getAppWidgetIds(new ComponentName(c, NextPairWidget.class));
        if (ids.length > 0) render(c, m, ids);
    }

    private static void render(Context c, AppWidgetManager m, int[] ids) {
        long now = System.currentTimeMillis();
        List<EtisClient.Pair> pairs = EtisStore.loadPairs(c);
        EtisClient.Pair cur = null, next = null;
        for (EtisClient.Pair p : pairs) {
            if (p.start <= now && now < p.end) { if (cur == null) cur = p; }
            else if (p.start > now && next == null) next = p;
        }
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_next_pair);
        Intent open = new Intent(c, MainActivity.class);
        v.setOnClickPendingIntent(R.id.w_root, PendingIntent.getActivity(c, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));

        long refreshAt = startOfTomorrow(now);
        v.setViewVisibility(R.id.w_timer, View.GONE);
        if (cur != null) {
            v.setTextViewText(R.id.w_label, "СЕЙЧАС · " + cur.num + " ПАРА");
            v.setTextViewText(R.id.w_title, cur.name);
            v.setTextViewText(R.id.w_sub, join(cur.aud, cur.type));
            countdown(v, cur.end, now, "до конца %s");
            EtisClient.Pair after = next != null && sameDay(next.start, now) ? next : null;
            v.setTextViewText(R.id.w_foot, after != null ? "Дальше в " + hm(after.start) + " · " + after.name : "Это последняя пара сегодня");
            refreshAt = Math.min(refreshAt, cur.end);
        } else if (next != null) {
            boolean today = sameDay(next.start, now);
            v.setTextViewText(R.id.w_label, (today ? "СЕГОДНЯ" : dayLabel(next.start, now)) + " · " + hm(next.start));
            v.setTextViewText(R.id.w_title, next.name);
            v.setTextViewText(R.id.w_sub, join(next.aud, next.type));
            if (today || next.start - now < 12 * 3600000L) countdown(v, next.start, now, "через %s");
            int left = 0;
            for (EtisClient.Pair p : pairs) if (sameDay(p.start, next.start) && p.start >= next.start) left++;
            v.setTextViewText(R.id.w_foot, today
                    ? (left > 1 ? "Сегодня ещё " + left + " " + SyncWorker.plural(left, "пара", "пары", "пар") : "Сегодня одна пара")
                    : "Сегодня пар больше нет");
            refreshAt = Math.min(refreshAt, next.start);
        } else {
            v.setTextViewText(R.id.w_label, "ЕТИС 3.0");
            boolean noData = EtisStore.pairsAt(c) == 0;
            v.setTextViewText(R.id.w_title, noData ? "Открой приложение" : "Пар не видно");
            v.setTextViewText(R.id.w_sub, noData ? "чтобы загрузить расписание" : "на этой и следующей неделе");
            v.setTextViewText(R.id.w_foot, "");
        }
        if (EtisStore.loggedOut(c)) v.setTextViewText(R.id.w_foot, "Войди в ЕТИС в приложении, чтобы обновить");
        m.updateAppWidget(ids, v);
        scheduleTick(c, refreshAt + 1000);
    }

    private static void countdown(RemoteViews v, long target, long now, String format) {
        v.setViewVisibility(R.id.w_timer, View.VISIBLE);
        v.setChronometer(R.id.w_timer, SystemClock.elapsedRealtime() + (target - now), format, true);
        v.setChronometerCountDown(R.id.w_timer, true);
    }

    private static void scheduleTick(Context c, long at) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        Intent i = new Intent(c, NextPairWidget.class).setAction(ACTION_TICK);
        PendingIntent pi = PendingIntent.getBroadcast(c, 0, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        am.set(AlarmManager.RTC, at, pi);
    }

    private static String join(String a, String b) {
        List<String> parts = new ArrayList<>();
        if (a != null && !a.isEmpty()) parts.add(a.replaceFirst("^ауд\\.\\s*", "ауд. "));
        if (b != null && !b.isEmpty()) parts.add(b);
        return String.join(" · ", parts);
    }

    private static String hm(long t) {
        return new SimpleDateFormat("H:mm", Locale.getDefault()).format(t);
    }

    private static boolean sameDay(long a, long b) {
        Calendar x = Calendar.getInstance(), y = Calendar.getInstance();
        x.setTimeInMillis(a); y.setTimeInMillis(b);
        return x.get(Calendar.YEAR) == y.get(Calendar.YEAR) && x.get(Calendar.DAY_OF_YEAR) == y.get(Calendar.DAY_OF_YEAR);
    }

    private static String dayLabel(long t, long now) {
        if (sameDay(t, now + 86400000L)) return "ЗАВТРА";
        return new SimpleDateFormat("EEE, d MMM", new Locale("ru")).format(t).toUpperCase(new Locale("ru")).replace(".", "");
    }

    private static long startOfTomorrow(long now) {
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(now);
        c.add(Calendar.DAY_OF_YEAR, 1);
        c.set(Calendar.HOUR_OF_DAY, 0); c.set(Calendar.MINUTE, 0); c.set(Calendar.SECOND, 5); c.set(Calendar.MILLISECOND, 0);
        return c.getTimeInMillis();
    }
}
