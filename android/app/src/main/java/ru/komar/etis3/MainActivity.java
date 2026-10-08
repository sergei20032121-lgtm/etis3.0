package ru.komar.etis3;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.net.http.SslCertificate;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.SslErrorHandler;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
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
import java.security.KeyStore;
import java.security.cert.CertPathValidator;
import java.security.cert.CertificateFactory;
import java.security.cert.PKIXParameters;
import java.security.cert.TrustAnchor;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
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
    /** Сколько ждём первую отрисовку, прежде чем показать экран «не грузится». */
    private static final long LOAD_TIMEOUT_MS = 45000;
    /**
     * student.psu.ru отдаёт только свой сертификат, без промежуточного GlobalSign AlphaSSL.
     * Браузеры докачивают его сами, а WebView — нет, и страница остаётся белой.
     * Поэтому промежуточный (и корень R6 для старых Android) лежат в res/raw.
     */
    private static final String[] CA_FILES = {"globalsign_alphassl_2025", "globalsign_root_r6"};

    private WebView web;
    private String script = "";
    private boolean documentStartSupported;
    private ScriptHandler scriptHandler;
    private ValueCallback<Uri[]> fileCallback;
    private ProgressBar progress;
    private LinearLayout errorView;
    private TextView errorText;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private final Runnable loadTimeout = () -> showError(
            "ЕТИС не отвечает",
            "Сайт student.psu.ru слишком долго не загружается. Проверьте интернет (ЕТИС иногда не открывается через VPN) и попробуйте ещё раз.");

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0D0D14"));
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#0D0D14"));
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setMax(100);
        progress.setIndeterminate(false);
        progress.setProgressTintList(android.content.res.ColorStateList.valueOf(Color.parseColor("#8B7CFF")));
        root.addView(progress, new FrameLayout.LayoutParams(-1, dp(4), Gravity.TOP));
        errorView = buildErrorView();
        root.addView(errorView, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);

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

        // Мост для страницы: сохранить картинку «Итогов семестра» в галерею
        web.addJavascriptInterface(new NativeBridge(), "ETIS3Native");

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
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                progress.setVisibility(View.VISIBLE);
                ui.removeCallbacks(loadTimeout);
                ui.postDelayed(loadTimeout, LOAD_TIMEOUT_MS);
            }

            @Override
            public void onPageCommitVisible(WebView view, String url) {
                ui.removeCallbacks(loadTimeout);
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (!request.isForMainFrame()) return;
                showError("Не удалось открыть ЕТИС", describe(error.getErrorCode(), String.valueOf(error.getDescription())));
            }

            @Override
            public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (!request.isForMainFrame() || response.getStatusCode() < 500) return;
                showError("ЕТИС временно недоступен",
                        "Сервер ответил ошибкой " + response.getStatusCode() + ". Так бывает при обновлениях ЕТИС — попробуйте чуть позже.");
            }

            @Override
            public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                // Достраиваем цепочку встроенным промежуточным сертификатом и проверяем её сами.
                if (isEtis(error.getUrl()) && trustedWithBundledChain(error.getCertificate())) {
                    handler.proceed();
                    return;
                }
                handler.cancel();
                if (isEtis(error.getUrl())) showError("Небезопасное соединение",
                        "Сертификат сайта не прошёл проверку (код " + error.getPrimaryError() + "). "
                                + "Проверьте дату и время на телефоне или откройте ЕТИС в браузере.");
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                progress.setVisibility(View.GONE);
                ui.removeCallbacks(loadTimeout);
                // Старые WebView без document-start: подключаем после загрузки (скрипт умеет стартовать поздно)
                if (!documentStartSupported && isEtis(url)) view.evaluateJavascript(script, null);
                CookieManager.getInstance().flush();
                // Зашёл в ЕТИС — обновим виджет и снимок оценок фоном
                if (isEtis(url) && !url.contains("stu.login")) SyncWorker.syncSoon(MainActivity.this);
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int p) {
                progress.setProgress(p);
            }

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
            String name = URLUtil.guessFileName(url, contentDisposition, mimeType);
            download(url, userAgent, mimeType, name);
        });

        Uri data = getIntent() != null ? getIntent().getData() : null;
        if (savedInstanceState != null) web.restoreState(savedInstanceState);
        else web.loadUrl(data != null && HOST.equalsIgnoreCase(data.getHost()) ? data.toString() : START_URL);

        updateScriptInBackground();
        SyncWorker.schedule(this);
        askNotificationsOnce();
    }

    /** Android 13+: разрешение на уведомления о новых оценках — один раз при первом запуске. */
    private void askNotificationsOnce() {
        SyncWorker.ensureChannel(this);
        if (Build.VERSION.SDK_INT < 33 || EtisStore.askedNotifications(this)) return;
        EtisStore.setAskedNotifications(this);
        if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 3);
        }
    }

    /** Методы, доступные странице ЕТИС как window.ETIS3Native. */
    final class NativeBridge {
        @android.webkit.JavascriptInterface
        public void saveImage(String base64, String name) {
            ui.post(() -> {
                String url = web.getUrl();
                if (url == null || !isEtis(url)) return;
                new Thread(() -> {
                    Uri saved = null;
                    try {
                        byte[] png = android.util.Base64.decode(base64, android.util.Base64.DEFAULT);
                        saved = saveToGallery(png, name.replaceAll("[^\\w.\\-]", "_"));
                    } catch (Exception ignored) { }
                    Uri result = saved;
                    ui.post(() -> {
                        if (result == null) { toast("Не получилось сохранить картинку"); return; }
                        toast("Картинка сохранена в «Галерею»");
                        if (!"content".equals(result.getScheme())) return;   // file:// поделиться нельзя (Android 7+)
                        Intent share = new Intent(Intent.ACTION_SEND).setType("image/png")
                                .putExtra(Intent.EXTRA_STREAM, result)
                                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        try { startActivity(Intent.createChooser(share, "Поделиться итогами")); } catch (Exception ignored) { }
                    });
                }).start();
            });
        }
    }

    private Uri saveToGallery(byte[] png, String name) throws java.io.IOException {
        if (Build.VERSION.SDK_INT >= 29) {
            android.content.ContentValues v = new android.content.ContentValues();
            v.put(android.provider.MediaStore.Images.Media.DISPLAY_NAME, name);
            v.put(android.provider.MediaStore.Images.Media.MIME_TYPE, "image/png");
            v.put(android.provider.MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/ЕТИС 3.0");
            Uri uri = getContentResolver().insert(android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI, v);
            if (uri == null) throw new java.io.IOException("MediaStore");
            try (java.io.OutputStream out = getContentResolver().openOutputStream(uri)) {
                if (out == null) throw new java.io.IOException("MediaStore");
                out.write(png);
            }
            return uri;
        }
        if (checkSelfPermission(android.Manifest.permission.WRITE_EXTERNAL_STORAGE) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            ui.post(() -> requestPermissions(new String[]{android.Manifest.permission.WRITE_EXTERNAL_STORAGE}, 2));
            return null;
        }
        File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES), "ЕТИС 3.0");
        //noinspection ResultOfMethodCallIgnored
        dir.mkdirs();
        File f = new File(dir, name);
        try (FileOutputStream out = new FileOutputStream(f)) { out.write(png); }
        android.media.MediaScannerConnection.scanFile(this, new String[]{f.getAbsolutePath()}, new String[]{"image/png"}, null);
        return Uri.fromFile(f);
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

    // ---------- Достраивание цепочки сертификатов ----------

    private Set<TrustAnchor> anchors;
    private List<X509Certificate> intermediates;

    private void loadAnchors() {
        if (anchors != null) return;
        anchors = new HashSet<>();
        intermediates = new ArrayList<>();
        try {
            CertificateFactory cf = CertificateFactory.getInstance("X.509");
            for (String name : CA_FILES) {
                int id = getResources().getIdentifier(name, "raw", getPackageName());
                if (id == 0) continue;
                try (InputStream in = getResources().openRawResource(id)) {
                    X509Certificate c = (X509Certificate) cf.generateCertificate(in);
                    if (c.getSubjectX500Principal().equals(c.getIssuerX500Principal())) anchors.add(new TrustAnchor(c, null));
                    else intermediates.add(c);
                }
            }
        } catch (Exception ignored) { }
        // Плюс системные корни телефона
        try {
            KeyStore ks = KeyStore.getInstance("AndroidCAStore");
            ks.load(null, null);
            for (java.util.Enumeration<String> e = ks.aliases(); e.hasMoreElements(); ) {
                java.security.cert.Certificate c = ks.getCertificate(e.nextElement());
                if (c instanceof X509Certificate) anchors.add(new TrustAnchor((X509Certificate) c, null));
            }
        } catch (Exception ignored) { }
    }

    private boolean trustedWithBundledChain(SslCertificate sslCert) {
        try {
            X509Certificate leaf = toX509(sslCert);
            if (leaf == null) return false;
            loadAnchors();
            if (anchors.isEmpty()) return false;
            leaf.checkValidity();
            List<X509Certificate> chain = new ArrayList<>();
            chain.add(leaf);
            X509Certificate cur = leaf;
            for (int i = 0; i < 4; i++) {
                X509Certificate next = null;
                for (X509Certificate c : intermediates) {
                    if (c.getSubjectX500Principal().equals(cur.getIssuerX500Principal()) && !chain.contains(c)) { next = c; break; }
                }
                if (next == null) break;
                chain.add(next);
                cur = next;
            }
            PKIXParameters params = new PKIXParameters(anchors);
            params.setRevocationEnabled(false);
            CertPathValidator.getInstance("PKIX").validate(
                    CertificateFactory.getInstance("X.509").generateCertPath(chain), params);
            // Сертификат должен быть выписан на ЕТИС (*.psu.ru / student.psu.ru)
            java.util.Collection<List<?>> alt = leaf.getSubjectAlternativeNames();
            if (alt != null) for (List<?> e : alt) {
                String n = String.valueOf(e.get(1)).toLowerCase(java.util.Locale.ROOT);
                if (n.equals(HOST) || n.equals("*.psu.ru")) return true;
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    private static X509Certificate toX509(SslCertificate ssl) throws Exception {
        if (ssl == null) return null;
        if (Build.VERSION.SDK_INT >= 29) return ssl.getX509Certificate();
        byte[] der = SslCertificate.saveState(ssl).getByteArray("x509-certificate");
        if (der == null) return null;
        return (X509Certificate) CertificateFactory.getInstance("X.509")
                .generateCertificate(new java.io.ByteArrayInputStream(der));
    }

    // ---------- Экран ошибки ----------

    private LinearLayout buildErrorView() {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setPadding(dp(32), dp(32), dp(32), dp(32));
        box.setBackgroundColor(Color.parseColor("#0D0D14"));
        box.setClickable(true);
        box.setVisibility(View.GONE);

        TextView icon = new TextView(this);
        icon.setText("Е");
        icon.setTextColor(Color.WHITE);
        icon.setTextSize(TypedValue.COMPLEX_UNIT_SP, 34);
        icon.setGravity(Gravity.CENTER);
        icon.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        GradientDrawable g = new GradientDrawable(GradientDrawable.Orientation.TL_BR,
                new int[]{Color.parseColor("#8B7CFF"), Color.parseColor("#5AC8FA")});
        g.setCornerRadius(dp(20));
        icon.setBackground(g);
        box.addView(icon, new LinearLayout.LayoutParams(dp(72), dp(72)));

        TextView title = new TextView(this);
        title.setTag("title");
        title.setTextColor(Color.WHITE);
        title.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20);
        title.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        title.setGravity(Gravity.CENTER);
        title.setPadding(0, dp(20), 0, dp(8));
        box.addView(title, new LinearLayout.LayoutParams(-2, -2));

        errorText = new TextView(this);
        errorText.setTextColor(Color.parseColor("#A9A9BC"));
        errorText.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        errorText.setGravity(Gravity.CENTER);
        errorText.setLineSpacing(0, 1.2f);
        box.addView(errorText, new LinearLayout.LayoutParams(-2, -2));

        Button retry = button("Повторить", true);
        retry.setOnClickListener(v -> {
            hideError();
            String url = web.getUrl();
            if (url == null || !isEtis(url)) web.loadUrl(START_URL);
            else web.reload();
        });
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(240), dp(48));
        lp.topMargin = dp(28);
        box.addView(retry, lp);

        Button browser = button("Открыть в браузере", false);
        browser.setOnClickListener(v -> {
            String url = web.getUrl();
            openExternal(Uri.parse(url != null && isEtis(url) ? url : START_URL));
        });
        LinearLayout.LayoutParams lp2 = new LinearLayout.LayoutParams(dp(240), dp(48));
        lp2.topMargin = dp(10);
        box.addView(browser, lp2);
        return box;
    }

    private Button button(String text, boolean primary) {
        Button b = new Button(this);
        b.setText(text);
        b.setAllCaps(false);
        b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 15);
        b.setTextColor(Color.WHITE);
        GradientDrawable bg = new GradientDrawable();
        bg.setCornerRadius(dp(14));
        if (primary) bg.setColor(Color.parseColor("#7B6CF6"));
        else {
            bg.setColor(Color.parseColor("#1C1C28"));
            bg.setStroke(dp(1), Color.parseColor("#33334A"));
        }
        b.setBackground(bg);
        b.setStateListAnimator(null);
        return b;
    }

    private void showError(String title, String text) {
        ui.removeCallbacks(loadTimeout);
        progress.setVisibility(View.GONE);
        ((TextView) errorView.findViewWithTag("title")).setText(title);
        errorText.setText(text);
        errorView.setVisibility(View.VISIBLE);
    }

    private void hideError() {
        errorView.setVisibility(View.GONE);
    }

    private static String describe(int code, String desc) {
        switch (code) {
            case WebViewClient.ERROR_HOST_LOOKUP:
            case WebViewClient.ERROR_CONNECT:
                return "Нет связи с student.psu.ru. Проверьте интернет и попробуйте ещё раз.\n(" + desc + ")";
            case WebViewClient.ERROR_TIMEOUT:
                return "ЕТИС слишком долго не отвечает. Попробуйте ещё раз чуть позже.\n(" + desc + ")";
            case WebViewClient.ERROR_FAILED_SSL_HANDSHAKE:
                return "Не удалось установить защищённое соединение.\n(" + desc + ")";
            default:
                return desc + " (" + code + ")";
        }
    }

    private int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }

    // ---------- Скачивание файлов ----------

    /**
     * Качаем сами, а не через DownloadManager: системный загрузчик не знает
     * промежуточного сертификата ЕТИС и падает с ошибкой SSL.
     */
    private void download(String url, String userAgent, String mimeType, String name) {
        if (Build.VERSION.SDK_INT < 29
                && checkSelfPermission(android.Manifest.permission.WRITE_EXTERNAL_STORAGE)
                != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{android.Manifest.permission.WRITE_EXTERNAL_STORAGE}, 2);
            toast("Разрешите доступ к файлам и нажмите «скачать» ещё раз");
            return;
        }
        String cookie = CookieManager.getInstance().getCookie(url);
        toast("Скачивание: " + name);
        new Thread(() -> {
            String result;
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                c.setConnectTimeout(15000);
                c.setReadTimeout(60000);
                if (cookie != null) c.setRequestProperty("Cookie", cookie);
                c.setRequestProperty("User-Agent", userAgent);
                if (c.getResponseCode() >= 400) throw new java.io.IOException("HTTP " + c.getResponseCode());
                String type = mimeType != null && !mimeType.isEmpty() ? mimeType : c.getContentType();
                try (InputStream in = c.getInputStream(); java.io.OutputStream out = openDownload(name, type)) {
                    byte[] buf = new byte[16384];
                    int n;
                    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                }
                result = "Сохранено в «Загрузки»: " + name;
            } catch (Exception e) {
                result = null;
            }
            String done = result;
            ui.post(() -> {
                if (done != null) toast(done);
                else {
                    toast("Не получилось скачать — открываю в браузере");
                    openExternal(Uri.parse(url));
                }
            });
        }).start();
    }

    private java.io.OutputStream openDownload(String name, String type) throws java.io.IOException {
        if (Build.VERSION.SDK_INT >= 29) {
            android.content.ContentValues v = new android.content.ContentValues();
            v.put(android.provider.MediaStore.Downloads.DISPLAY_NAME, name);
            if (type != null) v.put(android.provider.MediaStore.Downloads.MIME_TYPE, type.split(";")[0].trim());
            Uri uri = getContentResolver().insert(android.provider.MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
            if (uri == null) throw new java.io.IOException("MediaStore");
            java.io.OutputStream out = getContentResolver().openOutputStream(uri);
            if (out == null) throw new java.io.IOException("MediaStore");
            return out;
        }
        File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        //noinspection ResultOfMethodCallIgnored
        dir.mkdirs();
        return new FileOutputStream(new File(dir, name));
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
        if (errorView.getVisibility() == View.VISIBLE && web.canGoBack()) { hideError(); web.goBack(); }
        else if (web.canGoBack()) web.goBack();
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
