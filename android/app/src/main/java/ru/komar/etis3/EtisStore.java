package ru.komar.etis3;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Расписание и снимок оценок между запусками (SharedPreferences). */
final class EtisStore {

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences("etis3", Context.MODE_PRIVATE);
    }

    static void savePairs(Context c, List<EtisClient.Pair> pairs) {
        JSONArray a = new JSONArray();
        try {
            for (EtisClient.Pair p : pairs) {
                JSONObject o = new JSONObject();
                o.put("s", p.start); o.put("e", p.end); o.put("n", p.num);
                o.put("name", p.name); o.put("type", p.type); o.put("aud", p.aud); o.put("t", p.teacher);
                a.put(o);
            }
        } catch (Exception ignored) { }
        prefs(c).edit().putString("pairs", a.toString()).putLong("pairsAt", System.currentTimeMillis()).apply();
    }

    static List<EtisClient.Pair> loadPairs(Context c) {
        List<EtisClient.Pair> out = new ArrayList<>();
        try {
            JSONArray a = new JSONArray(prefs(c).getString("pairs", "[]"));
            for (int i = 0; i < a.length(); i++) {
                JSONObject o = a.getJSONObject(i);
                EtisClient.Pair p = new EtisClient.Pair();
                p.start = o.getLong("s"); p.end = o.getLong("e"); p.num = o.optInt("n");
                p.name = o.optString("name"); p.type = o.optString("type"); p.aud = o.optString("aud"); p.teacher = o.optString("t");
                out.add(p);
            }
        } catch (Exception ignored) { }
        Collections.sort(out, (x, y) -> Long.compare(x.start, y.start));
        return out;
    }

    static long pairsAt(Context c) { return prefs(c).getLong("pairsAt", 0); }

    static Map<String, String> loadGrades(Context c) {
        Map<String, String> out = new HashMap<>();
        try {
            JSONObject o = new JSONObject(prefs(c).getString("grades", "{}"));
            for (java.util.Iterator<String> it = o.keys(); it.hasNext(); ) {
                String k = it.next();
                out.put(k, o.getString(k));
            }
        } catch (Exception ignored) { }
        return out;
    }

    static boolean hasGrades(Context c) { return prefs(c).contains("grades"); }

    static void saveGrades(Context c, Map<String, EtisClient.Grade> grades) {
        JSONObject o = new JSONObject();
        try { for (Map.Entry<String, EtisClient.Grade> e : grades.entrySet()) o.put(e.getKey(), e.getValue().value); } catch (Exception ignored) { }
        prefs(c).edit().putString("grades", o.toString()).apply();
    }

    static void setLoggedOut(Context c, boolean v) { prefs(c).edit().putBoolean("loggedOut", v).apply(); }
    static boolean loggedOut(Context c) { return prefs(c).getBoolean("loggedOut", false); }

    static long lastSync(Context c) { return prefs(c).getLong("lastSync", 0); }
    static void markSync(Context c) { prefs(c).edit().putLong("lastSync", System.currentTimeMillis()).apply(); }

    static boolean askedNotifications(Context c) { return prefs(c).getBoolean("askedNotif", false); }
    static void setAskedNotifications(Context c) { prefs(c).edit().putBoolean("askedNotif", true).apply(); }

    private EtisStore() { }
}
