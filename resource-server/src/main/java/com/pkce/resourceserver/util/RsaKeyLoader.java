package com.pkce.resourceserver.util;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.KeyFactory;
import java.security.NoSuchAlgorithmException;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.InvalidKeySpecException;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

/**
 * Loads a PEM-encoded RSA public key from the filesystem (path comes from
 * app.resource-server.jwt.public-key-path, never from source control). Public-key-only,
 * deliberately - unlike auth-server's own RsaKeyLoader, this service never signs
 * anything and has no business ever touching the private key half of the pair.
 */
public final class RsaKeyLoader {

    private RsaKeyLoader() {
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
