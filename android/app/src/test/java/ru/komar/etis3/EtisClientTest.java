package ru.komar.etis3;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.Test;

import java.io.File;
import java.net.URL;
import java.util.Calendar;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;

/** Парсеры фоновой синхронизации на обезличенных страницах ЕТИС (tests/fixtures в корне репозитория). */
public class EtisClientTest {

    private static Document fixture(String name, String path) throws Exception {
        File f = new File("../../tests/fixtures/" + name + ".html");
        return Jsoup.parse(f, "UTF-8", EtisClient.BASE + path);
    }

    @Test
    public void timetableWeek() throws Exception {
        List<EtisClient.Pair> pairs = EtisClient.parseWeek(fixture("stu.timetable", "stu.timetable"));
        assertEquals(8, pairs.size());
        EtisClient.Pair p = pairs.get(0);
        assertEquals(4, p.num);
        assertEquals("Электродинамика материальных сред", p.name);
        assertEquals("лекция", p.type);
        assertTrue(p.aud.startsWith("ауд. 702/8"));
        Calendar c = Calendar.getInstance(EtisClient.TZ);
        c.setTimeInMillis(p.start);
        assertEquals(13, c.get(Calendar.HOUR_OF_DAY));
        assertEquals(30, c.get(Calendar.MINUTE));
        assertEquals(95 * 60000L, p.end - p.start);
    }

    @Test
    public void nextWeekLink() throws Exception {
        String next = EtisClient.nextWeekUrl(fixture("stu.timetable", "stu.timetable"));
        assertTrue(next, next != null && next.contains("p_week=7"));
    }

    @Test
    public void currentGrades() throws Exception {
        Map<String, EtisClient.Grade> g = EtisClient.parseGrades(fixture("stu.signs-current", "stu.signs?p_mode=current"));
        assertEquals(20, g.size());
        long graded = g.values().stream().filter(x -> !x.value.isEmpty()).count();
        assertEquals(2, graded);
    }

    @Test
    public void dayTitles() {
        Calendar c = Calendar.getInstance(EtisClient.TZ);
        c.setTimeInMillis(EtisClient.parseDay("Вторник, 6 октября"));
        assertEquals(6, c.get(Calendar.DAY_OF_MONTH));
        assertEquals(Calendar.OCTOBER, c.get(Calendar.MONTH));
        c.setTimeInMillis(EtisClient.parseDay("Пятница, 1 мая"));
        assertEquals(Calendar.MAY, c.get(Calendar.MONTH));
        c.setTimeInMillis(EtisClient.parseDay("13.01"));
        assertEquals(Calendar.JANUARY, c.get(Calendar.MONTH));
        assertEquals(-1, EtisClient.parseDay("без даты"));
    }

    @Test
    public void dayIsPermMidnightWhateverDeviceZone() {
        TimeZone saved = TimeZone.getDefault();
        try {
            TimeZone.setDefault(TimeZone.getTimeZone("Europe/Moscow"));
            Calendar c = Calendar.getInstance(EtisClient.TZ);
            c.setTimeInMillis(EtisClient.parseDay("Вторник, 6 октября"));
            assertEquals(0, c.get(Calendar.HOUR_OF_DAY));
            assertEquals(6, c.get(Calendar.DAY_OF_MONTH));
        } finally {
            TimeZone.setDefault(saved);
        }
    }

    private static String gradesPage(String... topics) {
        StringBuilder b = new StringBuilder("<h3>Физика</h3><table class=\"common\"><tr><th>Тема</th><th>Оценка</th>"
                + "<th colspan=\"2\">Балл в рейтинг</th></tr>");
        for (String t : topics) b.append("<tr><td>").append(t).append("</td><td>5</td><td></td><td>10</td></tr>");
        return b.append("</table>").toString();
    }

    @Test
    public void gradeKeysSurviveInsertedRow() {
        Map<String, EtisClient.Grade> before = EtisClient.parseGrades(Jsoup.parse(gradesPage("КТ 1", "КТ 2")));
        Map<String, EtisClient.Grade> after = EtisClient.parseGrades(Jsoup.parse(gradesPage("КТ 0", "КТ 1", "КТ 2")));
        assertTrue(after.keySet().containsAll(before.keySet()));
        assertEquals(3, after.size());
        assertEquals("10", after.get("Физика|КТ 1").max);
    }

    @Test
    public void duplicateTopicsGetCounter() {
        Map<String, EtisClient.Grade> g = EtisClient.parseGrades(Jsoup.parse(gradesPage("Тест", "Тест", "Итог")));
        assertEquals(3, g.size());
        assertTrue(g.containsKey("Физика|Тест"));
        assertTrue(g.containsKey("Физика|Тест|2"));
        assertTrue(g.containsKey("Физика|Итог"));
    }

    @Test
    public void etisUrlsOnlyHttps() throws Exception {
        assertTrue(EtisClient.isEtis(new URL("https://student.psu.ru/pls/stu_cus_et/stu.timetable")));
        assertFalse(EtisClient.isEtis(new URL("http://student.psu.ru/pls/stu_cus_et/stu.timetable")));
        assertFalse(EtisClient.isEtis(new URL("https://student.psu.ru.evil.example/")));
    }
}
