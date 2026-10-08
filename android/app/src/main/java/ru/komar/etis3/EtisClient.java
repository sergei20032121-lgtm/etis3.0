package ru.komar.etis3;

import android.webkit.CookieManager;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;

import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Загрузка и разбор страниц ЕТИС без WebView — для виджета и уведомлений. */
final class EtisClient {

    static final String BASE = "https://student.psu.ru/pls/stu_cus_et/";
    static final long PAIR_MINUTES = 95;

    static final class LoginRequired extends IOException {
        LoginRequired() { super("login"); }
    }

    static final class Pair {
        long start, end;
        int num;
        String name = "", type = "", aud = "", teacher = "";
    }

    static Document fetch(String path) throws IOException {
        String url = path.startsWith("http") ? path : BASE + path;
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(15000);
        c.setReadTimeout(30000);
        c.setInstanceFollowRedirects(true);
        String cookie = CookieManager.getInstance().getCookie(url);
        if (cookie == null) throw new LoginRequired();
        c.setRequestProperty("Cookie", cookie);
        c.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android) ETIS3App");
        int code = c.getResponseCode();
        if (code >= 400) throw new IOException("HTTP " + code);
        String type = c.getContentType();
        String charset = null;
        if (type != null) {
            Matcher m = Pattern.compile("charset=([\\w-]+)", Pattern.CASE_INSENSITIVE).matcher(type);
            if (m.find()) charset = m.group(1);
        }
        try (InputStream in = c.getInputStream()) {
            Document doc = Jsoup.parse(in, charset, url);
            boolean login = !doc.select("input[type=password]").isEmpty() && doc.select("div.span3").isEmpty();
            if (login) throw new LoginRequired();
            return doc;
        }
    }

    // ---------- Расписание ----------

    private static final String[] MONTHS = {"январ", "феврал", "март", "апрел", "ма", "июн", "июл", "август", "сентябр", "октябр", "ноябр", "декабр"};

    /** «Вторник, 6 октября» → полночь этого дня; год — ближайший к сегодняшнему. */
    static long parseDay(String title) {
        String t = title.toLowerCase();
        int d = -1, mon = -1;
        Matcher num = Pattern.compile("(\\d{1,2})\\.(\\d{1,2})").matcher(t);
        Matcher word = Pattern.compile("(\\d{1,2})\\s+([а-яё]+)").matcher(t);
        if (num.find()) { d = Integer.parseInt(num.group(1)); mon = Integer.parseInt(num.group(2)) - 1; }
        else if (word.find()) {
            d = Integer.parseInt(word.group(1));
            String w = word.group(2);
            for (int i = 0; i < MONTHS.length; i++) {
                if (i == 4 ? (w.equals("май") || w.equals("мая")) : w.startsWith(MONTHS[i])) { mon = i; break; }
            }
        }
        if (d < 1 || mon < 0) return -1;
        Calendar now = Calendar.getInstance();
        int y = now.get(Calendar.YEAR);
        if (mon - now.get(Calendar.MONTH) > 6) y--;
        if (now.get(Calendar.MONTH) - mon > 6) y++;
        Calendar c = Calendar.getInstance();
        c.clear();
        c.set(y, mon, d, 0, 0, 0);
        return c.getTimeInMillis();
    }

    static List<Pair> parseWeek(Document doc) {
        List<Pair> out = new ArrayList<>();
        for (Element day : doc.select("div.day")) {
            Element h3 = day.selectFirst("h3");
            if (h3 == null) continue;
            long date = parseDay(h3.text());
            if (date < 0) continue;
            for (Element row : day.select("table tr")) {
                Element numCell = row.selectFirst("td.pair_num");
                if (numCell == null) continue;
                Matcher nm = Pattern.compile("(\\d+)\\s*пар").matcher(numCell.text());
                if (!nm.find()) continue;
                int pairNum = Integer.parseInt(nm.group(1));
                Matcher tm = Pattern.compile("(\\d{1,2}):(\\d{2})").matcher(numCell.text());
                if (!tm.find()) continue;
                long start = date + (Integer.parseInt(tm.group(1)) * 60L + Integer.parseInt(tm.group(2))) * 60000L;
                Element info = row.selectFirst("td.pair_info");
                if (info == null) continue;
                for (Element box : info.children()) {
                    Element dis = box.selectFirst(".dis a, .dis");
                    if (dis == null || dis.text().trim().isEmpty()) continue;
                    Pair p = new Pair();
                    p.num = pairNum;
                    p.start = start;
                    p.end = start + PAIR_MINUTES * 60000L;
                    String full = dis.text().trim();
                    Matcher type = Pattern.compile("\\s*\\(([^()]*)\\)\\s*$").matcher(full);
                    if (type.find()) {
                        p.type = typeLabel(type.group(1));
                        p.name = full.substring(0, type.start()).trim();
                    } else p.name = full;
                    Element aud = box.selectFirst(".aud");
                    if (aud != null) p.aud = aud.text().replaceAll("\\s+", " ").trim();
                    Element teacher = box.selectFirst(".teacher a");
                    if (teacher != null) p.teacher = teacher.text().trim();
                    out.add(p);
                }
            }
        }
        return out;
    }

    static String typeLabel(String raw) {
        String t = raw.toLowerCase().trim();
        if (t.startsWith("лек")) return "лекция";
        if (t.startsWith("практ") || t.startsWith("пр")) return "практика";
        if (t.startsWith("лаб")) return "лабораторная";
        if (t.startsWith("сем")) return "семинар";
        if (t.startsWith("конс")) return "консультация";
        if (t.startsWith("экз")) return "экзамен";
        if (t.startsWith("зач")) return "зачёт";
        return t;
    }

    /** Ссылка на следующую неделю из ленты недель ЕТИС. */
    static String nextWeekUrl(Document doc) {
        Element cur = doc.selectFirst(".weeks li.current");
        if (cur == null) return null;
        Element next = cur.nextElementSibling();
        Element a = next != null ? next.selectFirst("a[href]") : null;
        return a != null ? a.absUrl("href") : null;
    }

    // ---------- Оценки ----------

    static final class Grade {
        String dis = "", topic = "", value = "", max = "";
    }

    /** «Оценки в семестре»: ключ (дисциплина|номер|тема) → оценка. */
    static Map<String, Grade> parseGrades(Document doc) {
        Map<String, Grade> out = new LinkedHashMap<>();
        for (Element table : doc.select("table.common")) {
            Element h = table.previousElementSibling();
            while (h != null && !h.tagName().equals("h3")) h = h.previousElementSibling();
            String dis = h != null ? h.text().trim() : "";
            Elements rows = table.select("tr");
            if (rows.isEmpty()) continue;
            int pos = 0, gradeCol = -1, maxCol = -1;
            for (Element cell : rows.get(0).children()) {
                String name = cell.text().trim().toLowerCase();
                int span = 1;
                try { span = Math.max(1, Integer.parseInt(cell.attr("colspan"))); } catch (NumberFormatException ignored) { }
                if (name.startsWith("оценка")) gradeCol = pos;
                else if (name.startsWith("балл в рейтинг")) maxCol = pos + 1;
                pos += span;
            }
            if (gradeCol < 0) continue;
            int idx = 0;
            for (Element tr : rows) {
                Elements cells = tr.children();
                if (!tr.select("th").isEmpty() || cells.size() < pos) continue;
                Grade g = new Grade();
                g.dis = dis;
                g.topic = cells.get(0).text().replaceAll("\\s+", " ").trim();
                g.value = cells.get(gradeCol).text().trim();
                if (maxCol >= 0 && maxCol < cells.size()) g.max = cells.get(maxCol).text().trim();
                out.put(dis + "|" + (idx++) + "|" + g.topic, g);
            }
        }
        return out;
    }

    private EtisClient() { }
}
