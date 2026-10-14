package com.pkce.authserver.config;

import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import com.pkce.authserver.util.RsaKeyLoader;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;

/**
 *
 * test
 * Loads the RSA signing keypair from the filesystem (see generate-keys.sh / ARCHITECTURE.md
 * for the rotation runbook) and publishes it as the JWKSource backing both JWT signing
 * and the /oauth2/jwks endpoint. Private key material never leaves this process.
 */
@Configuration
public class JwkConfig {

    @Value("${app.security.jwt.private-key-path}")
    private String privateKeyPath;

    @Value("${app.security.jwt.public-key-path}")
    private String publicKeyPath;

    @Value("${app.security.jwt.key-id}")
    private String keyId;

    @Bean
    public JWKSource<SecurityContext> jwkSource() {
        RSAPublicKey publicKey = RsaKeyLoader.loadPublicKey(publicKeyPath);
        RSAPrivateKey privateKey = RsaKeyLoader.loadPrivateKey(privateKeyPath);

        RSAKey rsaKey = new RSAKey.Builder(publicKey)
                .privateKey(privateKey)
                .keyID(keyId)
                .build();

        JWKSet jwkSet = new JWKSet(rsaKey);
        return new ImmutableJWKSet<>(jwkSet);
    }
}
