package ru.komar.etis3;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.junit.Test;

import java.io.File;
import java.util.Calendar;
import java.util.List;
import java.util.Map;

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
        Calendar c = Calendar.getInstance();
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
        Calendar c = Calendar.getInstance();
        c.setTimeInMillis(EtisClient.parseDay("Вторник, 6 октября"));
        assertEquals(6, c.get(Calendar.DAY_OF_MONTH));
        assertEquals(Calendar.OCTOBER, c.get(Calendar.MONTH));
        c.setTimeInMillis(EtisClient.parseDay("Пятница, 1 мая"));
        assertEquals(Calendar.MAY, c.get(Calendar.MONTH));
        c.setTimeInMillis(EtisClient.parseDay("13.01"));
        assertEquals(Calendar.JANUARY, c.get(Calendar.MONTH));
        assertEquals(-1, EtisClient.parseDay("без даты"));
    }
}
