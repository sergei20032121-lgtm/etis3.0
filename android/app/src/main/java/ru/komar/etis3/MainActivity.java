package ru.komar.etis3;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.webkit.CookieManager;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.webkit.ScriptHandler;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * ЕТИС 3.0 для Android: WebView со student.psu.ru и встроенным userscript-ом
 * (тот же dist/etis3.user.js, что ставится в Tampermonkey / Stay).
 * Скрипт берётся из файла, скачанного с GitHub (если он новее), иначе — из assets.
 */
public class MainActivity extends Activity {

    private static final String HOST = "student.psu.ru";
    private static final String START_URL = "https://student.psu.ru/pls/stu_cus_et/stu.timetable";
    private static final String SCRIPT_URL =
            "https://raw.githubusercontent.com/sergei20032121-lgtm/etis3.0/main/dist/etis3.user.js";
    private static final String SCRIPT_FILE = "etis3.user.js";
    private static final int FILE_CHOOSER = 1;

    private WebView web;
    private String script = "";
    private boolean documentStartSupported;
    private ScriptHandler scriptHandler;
    private ValueCallback<Uri[]> fileCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        web = new WebView(this);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);          // настройки и заметки ЕТИС 3.0 живут в localStorage
        s.setDatabaseEnabled(true);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setSupportZoom(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setUserAgentString(s.getUserAgentString() + " ETIS3App/" + BuildConfigHolder.versionName(this));

        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(web, true);

        script = wrap(loadScript());
        documentStartSupported = WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT);
        installScript();

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (HOST.equalsIgnoreCase(uri.getHost())) return false;   // ЕТИС — внутри приложения
                openExternal(uri);                                       // остальное — в браузере / приложениях
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                // Старые WebView без document-start: подключаем после загрузки (скрипт умеет стартовать поздно)
                if (!documentStartSupported && isEtis(url)) view.evaluateJavascript(script, null);
                CookieManager.getInstance().flush();
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try {
                    startActivityForResult(params.createIntent(), FILE_CHOOSER);
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });

        web.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            if (url.startsWith("blob:") || url.startsWith("data:")) {
                toast("Этот файл можно скачать только в браузере");
                return;
            }
            try {
                String name = URLUtil.guessFileName(url, contentDisposition, mimeType);
                DownloadManager.Request req = new DownloadManager.Request(Uri.parse(url));
                req.addRequestHeader("Cookie", CookieManager.getInstance().getCookie(url));
                req.addRequestHeader("User-Agent", userAgent);
                req.setMimeType(mimeType);
                req.setTitle(name);
                req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                req.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
                ((DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE)).enqueue(req);
                toast("Скачивание: " + name);
            } catch (Exception e) {
                openExternal(Uri.parse(url));
            }
        });

        Uri data = getIntent() != null ? getIntent().getData() : null;
        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(data != null && HOST.equalsIgnoreCase(data.getHost()) ? data.toString() : START_URL);

        updateScriptInBackground();
    }

    // ---------- Скрипт ----------

    /** Защита от двойного запуска (document-start + onPageFinished, перезагрузки фреймов). */
    private static String wrap(String js) {
        return "if (!window.__etis3App) { window.__etis3App = true;\n" + js + "\n}";
    }

    private void installScript() {
        if (!documentStartSupported) return;
        if (scriptHandler != null) scriptHandler.remove();
        scriptHandler = WebViewCompat.addDocumentStartJavaScript(web, script, Collections.singleton("https://" + HOST));
    }

    /** Скачанная версия, если она новее встроенной, иначе встроенная из assets. */
    private String loadScript() {
        String bundled = readAsset();
        File f = new File(getFilesDir(), SCRIPT_FILE);
        if (f.exists()) {
            try {
                String saved = new String(readAll(new java.io.FileInputStream(f)), StandardCharsets.UTF_8);
                if (compareVersions(version(saved), version(bundled)) > 0) return saved;
            } catch (Exception ignored) { }
        }
        return bundled;
    }

    private String readAsset() {
        try (InputStream in = getAssets().open(SCRIPT_FILE)) {
            return new String(readAll(in), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return "";
        }
    }

    /** Тянем свежий скрипт с GitHub; если он новее — сохраняем и применяем при следующей загрузке страницы. */
    private void updateScriptInBackground() {
        new Thread(() -> {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(SCRIPT_URL).openConnection();
                c.setConnectTimeout(10000);
                c.setReadTimeout(20000);
                c.setUseCaches(false);
                if (c.getResponseCode() != 200) return;
                String fresh = new String(readAll(c.getInputStream()), StandardCharsets.UTF_8);
                if (!fresh.contains("==UserScript==")) return;
                String current = loadScript();
                if (compareVersions(version(fresh), version(current)) <= 0) return;
                try (FileOutputStream out = new FileOutputStream(new File(getFilesDir(), SCRIPT_FILE))) {
                    out.write(fresh.getBytes(StandardCharsets.UTF_8));
                }
                new Handler(Looper.getMainLooper()).post(() -> {
                    script = wrap(fresh);
                    installScript();
                    toast("ЕТИС 3.0 обновлён до " + version(fresh));
                    web.reload();
                });
            } catch (Exception ignored) { }
        }).start();
    }

    private static String version(String userscript) {
        Matcher m = Pattern.compile("@version\\s+([\\d.]+)").matcher(userscript);
        return m.find() ? m.group(1) : "0";
    }

    private static int compareVersions(String a, String b) {
        String[] pa = a.split("\\."), pb = b.split("\\.");
        for (int i = 0; i < Math.max(pa.length, pb.length); i++) {
            int x = i < pa.length ? parseInt(pa[i]) : 0, y = i < pb.length ? parseInt(pb[i]) : 0;
            if (x != y) return Integer.compare(x, y);
        }
        return 0;
    }

    private static int parseInt(String s) {
        try { return Integer.parseInt(s); } catch (NumberFormatException e) { return 0; }
    }

    private static byte[] readAll(InputStream in) throws java.io.IOException {
        try (InputStream src = in; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[16384];
            int n;
            while ((n = src.read(buf)) > 0) out.write(buf, 0, n);
            return out.toByteArray();
        }
    }

    // ---------- Разное ----------

    private static boolean isEtis(String url) {
        Uri u = Uri.parse(url);
        return u != null && HOST.equalsIgnoreCase(u.getHost());
    }

    private void openExternal(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException e) {
            toast("Нет приложения, чтобы открыть ссылку");
        }
    }

    private void toast(String text) {
        Toast.makeText(this, text, Toast.LENGTH_SHORT).show();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Uri data = intent.getData();
        if (data != null && HOST.equalsIgnoreCase(data.getHost())) web.loadUrl(data.toString());
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILE_CHOOSER && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            fileCallback = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        super.onSaveInstanceState(outState);
        web.saveState(outState);
    }

    @Override
    protected void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
    }

    /** Имя версии без BuildConfig (он выключен по умолчанию в AGP 8). */
    static final class BuildConfigHolder {
        static String versionName(Context c) {
            try {
                return c.getPackageManager().getPackageInfo(c.getPackageName(), 0).versionName;
            } catch (Exception e) {
                return "1";
            }
        }
    }
}
