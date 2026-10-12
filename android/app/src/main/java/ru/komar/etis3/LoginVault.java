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
 * Ключ не покидает защищённое хранилище телефона и не переносится на другие устройства.
 * Без подтверждения пользователя — чтобы фоновая синхронизация могла перелогиниться сама;
 * отпечаток спрашивается при входе в приложении.
 */
final class LoginVault {

    private static final String KEY = "etis3-login";
    private static final String PREFS = "etis3-vault";

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private static SecretKey key() throws Exception {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
        ks.load(null);
        if (ks.containsAlias(KEY)) return ((KeyStore.SecretKeyEntry) ks.getEntry(KEY, null)).getSecretKey();
        KeyGenerator g = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        g.init(new KeyGenParameterSpec.Builder(KEY, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .build());
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

    static boolean save(Context c, String user, String pass) {
        try {
            prefs(c).edit().putString("u", encrypt(user)).putString("p", encrypt(pass)).apply();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    /** {логин, пароль} или null. */
    static String[] load(Context c) {
        try {
            String u = prefs(c).getString("u", null), p = prefs(c).getString("p", null);
            if (u == null || p == null) return null;
            return new String[]{decrypt(u), decrypt(p)};
        } catch (Exception e) {
            return null;
        }
    }

    static void clear(Context c) {
        prefs(c).edit().clear().apply();
    }

    static boolean declined(Context c) { return prefs(c).getBoolean("declined", false); }
    static void setDeclined(Context c, boolean v) { prefs(c).edit().putBoolean("declined", v).apply(); }

    private LoginVault() { }
}
