package ru.komar.etis3;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Логин и пароль ЕТИС, зашифрованные ключом из Android Keystore (AES-GCM).
 * Ключ привязан к подтверждению владельца: расшифровать можно только в течение
 * нескольких секунд после отпечатка / PIN телефона. Новый отпечаток в системе делает ключ
 * недействительным — сохранённый вход сбрасывается. Ключ не покидает телефон и не попадает в резервные копии.
 */
final class LoginVault {

    private static final String KEY = "etis3-login-v2";
    private static final String OLD_KEY = "etis3-login";
    static final int AUTH_SECONDS = 15;
    private static final String PREFS = "etis3-vault";

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static SecretKey key() throws Exception {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
        ks.load(null);
        if (ks.containsAlias(KEY)) return ((KeyStore.SecretKeyEntry) ks.getEntry(KEY, null)).getSecretKey();
        KeyGenerator g = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        KeyGenParameterSpec.Builder b = new KeyGenParameterSpec.Builder(KEY, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setUserAuthenticationRequired(true)
                .setInvalidatedByBiometricEnrollment(true);
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            b.setUserAuthenticationParameters(AUTH_SECONDS, KeyProperties.AUTH_BIOMETRIC_STRONG | KeyProperties.AUTH_DEVICE_CREDENTIAL);
        } else {
            //noinspection deprecation
            b.setUserAuthenticationValidityDurationSeconds(AUTH_SECONDS);
        }
        g.init(b.build());
        return g.generateKey();
    }

    private static String encrypt(String plain) throws Exception {
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.ENCRYPT_MODE, key());
        byte[] out = c.doFinal(plain.getBytes(StandardCharsets.UTF_8));
        return Base64.encodeToString(c.getIV(), Base64.NO_WRAP) + ":" + Base64.encodeToString(out, Base64.NO_WRAP);
    }

    private static String decrypt(String stored) throws Exception {
        String[] parts = stored.split(":");
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, Base64.decode(parts[0], Base64.NO_WRAP)));
        return new String(c.doFinal(Base64.decode(parts[1], Base64.NO_WRAP)), StandardCharsets.UTF_8);
    }

    static boolean has(Context c) {
        return prefs(c).contains("u") && prefs(c).contains("p");
    }

    /** Только сразу после подтверждения владельца. Бросает исключение Keystore, если подтверждения не было. */
    static void save(Context c, String user, String pass) throws Exception {
        prefs(c).edit().putString("u", encrypt(user)).putString("p", encrypt(pass)).putBoolean("stale", false).apply();
    }

    /** Вход сохранёнными данными не прошёл (пароль сменили на сайте). */
    static boolean stale(Context c) { return prefs(c).getBoolean("stale", false); }
    static void setStale(Context c) { prefs(c).edit().putBoolean("stale", true).apply(); }

    /** {логин, пароль}; только сразу после подтверждения владельца. */
    static String[] load(Context c) throws Exception {
        String u = prefs(c).getString("u", null), p = prefs(c).getString("p", null);
        if (u == null || p == null) return null;
        return new String[]{decrypt(u), decrypt(p)};
    }

    static void clear(Context c) {
        boolean declined = declined(c);
        prefs(c).edit().clear().putBoolean("declined", declined).apply();
        try {
            KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
            ks.load(null);
            if (ks.containsAlias(KEY)) ks.deleteEntry(KEY);
        } catch (Exception ignored) { }
    }

    /** 4.11.0 хранил вход ключом без подтверждения — удаляем и его, и данные. */
    static void migrate(Context c) {
        try {
            KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
            ks.load(null);
            if (ks.containsAlias(OLD_KEY)) {
                ks.deleteEntry(OLD_KEY);
                prefs(c).edit().remove("u").remove("p").apply();
            }
        } catch (Exception ignored) { }
    }

    static boolean declined(Context c) { return prefs(c).getBoolean("declined", false); }
    static void setDeclined(Context c, boolean v) { prefs(c).edit().putBoolean("declined", v).apply(); }

    private LoginVault() { }
}
