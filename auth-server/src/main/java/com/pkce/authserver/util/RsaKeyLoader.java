package com.pkce.authserver.util;
///home/mohit/TestPKCE/PKCE_BE_FE_B14/PKCE_BE_FE/BE/auth-server/keys/private_key_20261003153613.pem
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

/**
 * Loads PEM-encoded RSA keys from the filesystem (paths come from
 * app.security.jwt.private-key-path / public-key-path, never from source control).
 */
public final class RsaKeyLoader {

    private RsaKeyLoader() {
    }

    public static RSAPrivateKey loadPrivateKey(String path) {
        try {
            String pem = stripPemHeaders(Files.readString(Path.of(path)));
            byte[] decoded = Base64.getMimeDecoder().decode(pem);
            KeyFactory keyFactory = KeyFactory.getInstance("RSA");
            return (RSAPrivateKey) keyFactory.generatePrivate(new PKCS8EncodedKeySpec(decoded));
        } catch (IOException | NoSuchAlgorithmException | InvalidKeySpecException e) {
            throw new IllegalStateException("Failed to load RSA private key from " + path, e);
        }
    }

    public static RSAPublicKey loadPublicKey(String path) {
        try {
            String pem = stripPemHeaders(Files.readString(Path.of(path)));
            byte[] decoded = Base64.getMimeDecoder().decode(pem);
            KeyFactory keyFactory = KeyFactory.getInstance("RSA");
            return (RSAPublicKey) keyFactory.generatePublic(new X509EncodedKeySpec(decoded));
        } catch (IOException | NoSuchAlgorithmException | InvalidKeySpecException e) {
            throw new IllegalStateException("Failed to load RSA public key from " + path, e);
        }
    }

    private static String stripPemHeaders(String pem) {
        return pem.replaceAll("-----BEGIN [A-Z ]+-----", "")
                .replaceAll("-----END [A-Z ]+-----", "")
                .replaceAll("\\s", "");
    }
}
