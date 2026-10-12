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
    // Свежий скрипт берём из последнего релиза вместе с подписью; без верной подписи — не применяем
    private static final String SCRIPT_URL =
            "https://github.com/sergei20032121-lgtm/etis3.0/releases/latest/download/etis3.user.js";
    private static final String SIG_URL = SCRIPT_URL + ".sig";
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
    private String[] pendingLogin;          // логин/пароль, только что введённые на странице входа
    private boolean bioPrompted;            // отпечаток уже спрашивали на этой странице входа
    private boolean bioSubmitted;           // форму только что отправили сохранёнными данными
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
                bioPrompted = false;
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
                afterPage(url);
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
        LoginVault.migrate(this);
        askNotificationsOnce();
    }

    /** Android 13+: разрешение на уведомления о новых оценках — один раз при первом запуске. */
    private void askNotificationsOnce() {
        SyncWorker.ensureChannel(this);
        ReminderReceiver.ensureChannel(this);
        if (Build.VERSION.SDK_INT < 33 || EtisStore.askedNotifications(this)) return;
        EtisStore.setAskedNotifications(this);
        if (checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS}, 3);
        }
    }

    // ---------- Вход по отпечатку ----------

    /** После загрузки страницы: предложить сохранить вход или сразу спросить отпечаток. */
    private void afterPage(String url) {
        if (!isEtis(url)) return;
        // Страница входа без поля пароля — значит, мы уже внутри
        web.evaluateJavascript("(document.querySelector('input[type=password]') && !document.querySelector('div.span3'))"
                + " ? (document.querySelector('.error_message') ? 'error' : 'login') : 'in'", state -> {
            if ("\"error\"".equals(state)) {
                // Сохранённый пароль не подошёл (сменили на сайте) — не спрашиваем по кругу; после ручного входа обновим
                if (bioSubmitted) LoginVault.setStale(this);
                bioSubmitted = false;
                pendingLogin = null;
                return;
            }
            bioSubmitted = false;
            if ("\"login\"".equals(state)) {
                if (LoginVault.has(this) && !LoginVault.stale(this) && !bioPrompted) { bioPrompted = true; ui.postDelayed(this::biometricLogin, 400); }
                return;
            }
            String[] cred = pendingLogin;
            pendingLogin = null;
            if (cred == null) return;
            if (LoginVault.has(this)) {
                if (!LoginVault.stale(this)) return;
                // Сохранённый пароль перестал подходить, а вручную вошли — предложим обновить
                new android.app.AlertDialog.Builder(this)
                        .setTitle("Обновить сохранённый вход?")
                        .setMessage("Запомнить новый логин и пароль для входа по отпечатку.")
                        .setPositiveButton("Обновить", (d, w) -> withVault("Подтвердите, что это вы", () -> {
                            LoginVault.save(this, cred[0], cred[1]);
                            toast("Сохранённый вход обновлён");
                        }))
                        .setNegativeButton("Нет", null)
                        .show();
                return;
            }
            if (LoginVault.declined(this) || !canAuthenticate()) return;
            new android.app.AlertDialog.Builder(this)
                    .setTitle("Входить по отпечатку?")
                    .setMessage("ЕТИС 3.0 запомнит логин и пароль в защищённом хранилище телефона. "
                            + "Расшифровать их можно только вашим отпечатком или кодом блокировки — "
                            + "без этого пароль недоступен даже самому приложению.")
                    .setPositiveButton("Да", (d, w) -> withVault("Подтвердите, что это вы", () -> {
                        LoginVault.save(this, cred[0], cred[1]);
                        toast("Готово — дальше по отпечатку");
                    }))
                    .setNegativeButton("Не надо", (d, w) -> LoginVault.setDeclined(this, true))
                    .show();
        });
    }

    private boolean canAuthenticate() {
        android.app.KeyguardManager km = (android.app.KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
        return km != null && km.isDeviceSecure();
    }

    private Runnable authSuccess;
    private static final int CONFIRM_CREDENTIAL = 4;

    /** Отпечаток / лицо / PIN телефона; на Android < 9 — экран блокировки. */
    private void authenticate(String title, Runnable onSuccess) {
        if (!canAuthenticate()) { toast("Включите блокировку экрана (отпечаток или PIN)"); return; }
        if (Build.VERSION.SDK_INT >= 28) {
            android.hardware.biometrics.BiometricPrompt.Builder b = new android.hardware.biometrics.BiometricPrompt.Builder(this)
                    .setTitle(title).setSubtitle("ЕТИС 3.0");
            if (Build.VERSION.SDK_INT >= 30) {
                // Только «сильная» биометрия и код блокировки открывают ключ в Keystore
                b.setAllowedAuthenticators(android.hardware.biometrics.BiometricManager.Authenticators.BIOMETRIC_STRONG
                        | android.hardware.biometrics.BiometricManager.Authenticators.DEVICE_CREDENTIAL);
            } else if (Build.VERSION.SDK_INT == 29) {
                b.setDeviceCredentialAllowed(true);
            } else {
                b.setNegativeButton("Отмена", getMainExecutor(), (d, w) -> { });
            }
            b.build().authenticate(new android.os.CancellationSignal(), getMainExecutor(),
                    new android.hardware.biometrics.BiometricPrompt.AuthenticationCallback() {
                        @Override
                        public void onAuthenticationSucceeded(android.hardware.biometrics.BiometricPrompt.AuthenticationResult r) {
                            onSuccess.run();
                        }
                    });
        } else {
            android.app.KeyguardManager km = (android.app.KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
            confirmCredential(title, onSuccess);
        }
    }

    private void confirmCredential(String title, Runnable onSuccess) {
        android.app.KeyguardManager km = (android.app.KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
        Intent i = km.createConfirmDeviceCredentialIntent(title, "ЕТИС 3.0");
        if (i == null) return;
        authSuccess = onSuccess;
        startActivityForResult(i, CONFIRM_CREDENTIAL);
    }

    interface VaultAction { void run() throws Exception; }

    /**
     * Подтверждение владельца → действие с хранилищем. Если ключ не открылся (например, «слабая» биометрия
     * на Android 10) — спрашиваем код блокировки и повторяем; если ключ аннулирован новым отпечатком — сбрасываем.
     */
    private void withVault(String title, VaultAction action) {
        authenticate(title, () -> runVault(title, action, true));
    }

    private void runVault(String title, VaultAction action, boolean retry) {
        try {
            action.run();
        } catch (android.security.keystore.KeyPermanentlyInvalidatedException e) {
            LoginVault.clear(this);
            toast("В телефоне поменялись отпечатки — войдите паролем, вход сохранится заново");
        } catch (android.security.keystore.UserNotAuthenticatedException e) {
            if (retry) confirmCredential(title, () -> runVault(title, action, false));
        } catch (Exception e) {
            toast("Не получилось: " + e.getClass().getSimpleName());
        }
    }

    private void biometricLogin() {
        if (!LoginVault.has(this)) return;
        withVault("Вход в ЕТИС", () -> {
            String[] cred = LoginVault.load(this);
            if (cred == null) { toast("Сохранённый вход недоступен — войдите паролем"); LoginVault.clear(this); return; }
            String js = "(function(u,p){var l=document.querySelector('#login,input[name=p_username]'),w=document.querySelector('input[type=password]'),"
                    + "f=(w&&w.form)||document.getElementById('form');if(!l||!w||!f)return;l.value=u;w.value=p;"
                    + "var b=document.getElementById('sbmt');if(b)b.classList.add('is-loading');f.submit();})("
                    + org.json.JSONObject.quote(cred[0]) + "," + org.json.JSONObject.quote(cred[1]) + ")";
            bioSubmitted = true;
            web.evaluateJavascript(js, null);
        });
    }

    /** Методы, доступные странице ЕТИС как window.ETIS3Native. */
    final class NativeBridge {
        @android.webkit.JavascriptInterface
        public void loginSubmitted(String user, String pass) {
            ui.post(() -> {
                String url = web.getUrl();
                if (url != null && isEtis(url) && user != null && pass != null && !user.isEmpty() && !pass.isEmpty()) {
                    pendingLogin = new String[]{user, pass};
                }
            });
        }

        @android.webkit.JavascriptInterface
        public void setReminders(String json) {
            ui.post(() -> {
                String url = web.getUrl();
                if (url != null && isEtis(url)) new Thread(() -> ReminderReceiver.replace(MainActivity.this, json)).start();
            });
        }

        @android.webkit.JavascriptInterface
        public boolean hasSavedLogin() {
            return LoginVault.has(MainActivity.this);
        }

        @android.webkit.JavascriptInterface
        public void biometricLogin() {
            ui.post(() -> { String url = web.getUrl(); if (url != null && isEtis(url)) MainActivity.this.biometricLogin(); });
        }

        @android.webkit.JavascriptInterface
        public void forgetLogin() {
            LoginVault.clear(MainActivity.this);
            LoginVault.setDeclined(MainActivity.this, false);
            ui.post(() -> toast("Сохранённый вход удалён"));
        }

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
                byte[] raw = readAll(new java.io.FileInputStream(f));
                byte[] sig = readAll(new java.io.FileInputStream(new File(getFilesDir(), SCRIPT_FILE + ".sig")));
                String saved = new String(raw, StandardCharsets.UTF_8);
                // Скачанный скрипт перепроверяем при каждом запуске: подпись должна сходиться
                if (verifySignature(raw, sig) && compareVersions(version(saved), version(bundled)) > 0) return saved;
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
                byte[] body = readAll(c.getInputStream());
                byte[] sig = download(SIG_URL);
                if (!verifySignature(body, sig)) return;   // подменённый или неподписанный — мимо
                String fresh = new String(body, StandardCharsets.UTF_8);
                if (!fresh.contains("==UserScript==")) return;
                String current = loadScript();
                if (compareVersions(version(fresh), version(current)) <= 0) return;
                try (FileOutputStream out = new FileOutputStream(new File(getFilesDir(), SCRIPT_FILE))) {
                    out.write(body);
                }
                try (FileOutputStream out = new FileOutputStream(new File(getFilesDir(), SCRIPT_FILE + ".sig"))) {
                    out.write(sig);
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

    private static byte[] download(String url) throws java.io.IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(10000);
        c.setReadTimeout(20000);
        c.setUseCaches(false);
        if (c.getResponseCode() != 200) throw new java.io.IOException("HTTP " + c.getResponseCode());
        return readAll(c.getInputStream());
    }

    /** ECDSA P-256 / SHA-256: открытый ключ встроен в APK (res/raw/script_pub.pem), закрытый — только в секретах CI. */
    private boolean verifySignature(byte[] data, byte[] sig) {
        try (InputStream in = getResources().openRawResource(R.raw.script_pub)) {
            String pem = new String(readAll(in), StandardCharsets.US_ASCII)
                    .replaceAll("-----[A-Z ]+-----", "").replaceAll("\\s", "");
            java.security.PublicKey key = java.security.KeyFactory.getInstance("EC")
                    .generatePublic(new java.security.spec.X509EncodedKeySpec(android.util.Base64.decode(pem, android.util.Base64.DEFAULT)));
            java.security.Signature v = java.security.Signature.getInstance("SHA256withECDSA");
            v.initVerify(key);
            v.update(data);
            return v.verify(sig);
        } catch (Exception e) {
            return false;
        }
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
            hideOffline();
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

        Button offline = button("Расписание без интернета", false);
        offline.setTag("offline");
        offline.setOnClickListener(v -> showOffline());
        LinearLayout.LayoutParams lp3 = new LinearLayout.LayoutParams(dp(240), dp(48));
        lp3.topMargin = dp(10);
        box.addView(offline, lp3);
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
        errorView.findViewWithTag("offline").setVisibility(EtisStore.loadPairs(this).isEmpty() ? View.GONE : View.VISIBLE);
        errorView.setVisibility(View.VISIBLE);
    }

    // ---------- Расписание без интернета ----------

    private android.widget.ScrollView offlineView;

    /** Сохранённое фоновой синхронизацией расписание — когда ЕТИС не открывается. */
    private void showOffline() {
        long now = System.currentTimeMillis();
        java.util.Calendar today = java.util.Calendar.getInstance();
        today.set(java.util.Calendar.HOUR_OF_DAY, 0); today.set(java.util.Calendar.MINUTE, 0);
        today.set(java.util.Calendar.SECOND, 0); today.set(java.util.Calendar.MILLISECOND, 0);
        long dayStart = today.getTimeInMillis();

        LinearLayout list = new LinearLayout(this);
        list.setOrientation(LinearLayout.VERTICAL);
        list.setPadding(dp(18), dp(28), dp(18), dp(28));

        LinearLayout head = new LinearLayout(this);
        head.setGravity(Gravity.CENTER_VERTICAL);
        LinearLayout titles = new LinearLayout(this);
        titles.setOrientation(LinearLayout.VERTICAL);
        titles.addView(text("Расписание", 26, Color.WHITE, true));
        long at = EtisStore.pairsAt(this);
        titles.addView(text("без интернета · сохранено " + (at > 0 ? new java.text.SimpleDateFormat("d MMM, H:mm", new java.util.Locale("ru")).format(at) : "раньше"), 13, Color.parseColor("#A9A9BC"), false));
        head.addView(titles, new LinearLayout.LayoutParams(0, -2, 1));
        Button close = button("Назад", false);
        close.setOnClickListener(v -> hideOffline());
        head.addView(close, new LinearLayout.LayoutParams(-2, dp(40)));
        list.addView(head);

        long lastDay = -1;
        int shown = 0;
        java.text.SimpleDateFormat dayFmt = new java.text.SimpleDateFormat("EEEE, d MMMM", new java.util.Locale("ru"));
        java.text.SimpleDateFormat hm = new java.text.SimpleDateFormat("H:mm", java.util.Locale.getDefault());
        for (EtisClient.Pair p : EtisStore.loadPairs(this)) {
            if (p.end < dayStart) continue;
            long d = p.start - ((p.start - dayStart) % 86400000L + 86400000L) % 86400000L;
            if (d != lastDay) {
                lastDay = d;
                String label = d == dayStart ? "Сегодня" : d == dayStart + 86400000L ? "Завтра" : dayFmt.format(p.start);
                TextView dh = text(label.substring(0, 1).toUpperCase() + label.substring(1), 15, Color.parseColor("#B4A9FF"), true);
                dh.setPadding(dp(4), dp(22), 0, dp(8));
                list.addView(dh);
            }
            boolean live = p.start <= now && now < p.end;
            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setPadding(dp(16), dp(12), dp(16), dp(12));
            GradientDrawable bg = new GradientDrawable();
            bg.setCornerRadius(dp(16));
            bg.setColor(Color.parseColor(live ? "#2A2350" : "#17172A"));
            bg.setStroke(dp(1), Color.parseColor(live ? "#7B6CF6" : "#26263C"));
            card.setBackground(bg);
            card.addView(text(p.num + " пара · " + hm.format(p.start) + "–" + hm.format(p.end) + (live ? " · сейчас" : ""), 12, Color.parseColor("#A9A9BC"), true));
            TextView name = text(p.name, 16, Color.WHITE, true);
            name.setPadding(0, dp(4), 0, dp(2));
            card.addView(name);
            String sub = (p.aud.isEmpty() ? "" : p.aud) + (p.type.isEmpty() ? "" : (p.aud.isEmpty() ? "" : " · ") + p.type);
            if (!sub.isEmpty()) card.addView(text(sub, 13, Color.parseColor("#C9C6E0"), false));
            if (!p.teacher.isEmpty()) card.addView(text(p.teacher, 13, Color.parseColor("#8F8BAD"), false));
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(-1, -2);
            lp.bottomMargin = dp(8);
            list.addView(card, lp);
            shown++;
        }
        if (shown == 0) {
            TextView empty = text("На сохранённые недели пар больше нет", 15, Color.parseColor("#A9A9BC"), false);
            empty.setPadding(dp(4), dp(28), 0, 0);
            list.addView(empty);
        }

        if (offlineView == null) {
            offlineView = new android.widget.ScrollView(this);
            offlineView.setBackgroundColor(Color.parseColor("#0D0D14"));
            offlineView.setFillViewport(true);
            ((FrameLayout) errorView.getParent()).addView(offlineView, new FrameLayout.LayoutParams(-1, -1));
        }
        offlineView.removeAllViews();
        offlineView.addView(list);
        offlineView.setVisibility(View.VISIBLE);
    }

    private void hideOffline() {
        if (offlineView != null) offlineView.setVisibility(View.GONE);
    }

    private TextView text(String s, int sp, int color, boolean bold) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        t.setTextColor(color);
        if (bold) t.setTypeface(android.graphics.Typeface.DEFAULT_BOLD);
        return t;
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
        if (requestCode == CONFIRM_CREDENTIAL) {
            Runnable r = authSuccess;
            authSuccess = null;
            if (resultCode == RESULT_OK && r != null) r.run();
            return;
        }
        if (requestCode == FILE_CHOOSER && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            fileCallback = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (offlineView != null && offlineView.getVisibility() == View.VISIBLE) { hideOffline(); return; }
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
