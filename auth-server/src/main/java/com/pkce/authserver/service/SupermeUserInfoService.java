package com.pkce.authserver.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pkce.authserver.superme.dto.UserDTO;
import com.pkce.authserver.superme.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Optional;

/**
 * Builds the "user" payload carried on every /oauth2/token response, in SuperMeBE's own UserDTO
 * shape (see UserMapper).
 *
 * Runs in a read-only transaction for two reasons: UserMapper walks the lazy family.members
 * collection and needs an open session, and read-only keeps Hibernate from flushing - User's
 * @PreUpdate recomputes age/ageGroup, so a plain transaction could turn simply reading a user
 * whose stored age has gone stale into an UPDATE against live production data.
 *
 * The DTO is converted to a Map with the Spring-Boot-configured ObjectMapper rather than handed
 * over as an object, because the token endpoint serializes its response with
 * OAuth2AccessTokenResponseHttpMessageConverter's own internal Jackson instance
 * (HttpMessageConverters.getJsonMessageConverter()), which still has WRITE_DATES_AS_TIMESTAMPS
 * enabled - a LocalDate on the DTO would come out as [2020,1,15] instead of "2020-01-15". Doing
 * the conversion here means the dates match what SuperMeBE returns while the keys stay exactly as
 * the DTO declares them.
 */
@Service
@RequiredArgsConstructor
public class SupermeUserInfoService {

    private static final com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>> MAP_TYPE =
            new com.fasterxml.jackson.core.type.TypeReference<>() {
            };

    private final SupermeUserLookup userLookup;
    private final SupermeUserDevLookup userDevLookup;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public Optional<Map<String, Object>> userPayloadFor(String identifier) {
        return userPayloadFor(identifier, null);
    }

    @Transactional(readOnly = true)
    public Optional<Map<String, Object>> userPayloadFor(String identifier, String authProvider) {
        return userPayloadFor(identifier, authProvider, null);
    }

    @Transactional(readOnly = true)
    public Optional<Map<String, Object>> userPayloadFor(String identifier, String authProvider, String socialProviderId) {
        return buildPayload(userLookup.findByIdentifier(identifier), authProvider, socialProviderId);
    }

    /**
     * Dev-datasource counterpart, for the /oauth2/token "user" payload of an APK_DEV client (e.g.
     * devapk.supermeapp.com) - see UserInfoAccessTokenResponseCustomizer, which picks this over
     * userPayloadFor based on the issuing RegisteredClient's id. Without this, a dev-client login
     * correctly resolved against superme_db (AppUserDetailsService) would still have its "user"
     * token payload built from prod's mindfullP1.User, which either returns a different account's
     * data or - for an identifier that only exists in superme_db - nothing at all, breaking the
     * Angular app's OIDC login (it requires this payload's "id" to complete sign-in).
     */
    @Transactional(readOnly = true)
    public Optional<Map<String, Object>> userPayloadForDev(String identifier, String authProvider, String socialProviderId) {
        return buildPayload(userDevLookup.findByIdentifier(identifier), authProvider, socialProviderId);
    }

    private Optional<Map<String, Object>> buildPayload(
            Optional<com.pkce.authserver.superme.model.User> user, String authProvider, String socialProviderId) {
        return user
                .map(UserMapper::toDto)
                .map(this::toMap)
                .map(payload -> {
                    if ("google".equals(authProvider) || "apple".equals(authProvider)) {
                        payload.put("authProvider", authProvider);
                    }
                    if (socialProviderId != null && !socialProviderId.isBlank()) {
                        payload.put("socialProviderId", socialProviderId);
                    }
                    return payload;
                });
    }

    private Map<String, Object> toMap(UserDTO dto) {
        return objectMapper.convertValue(dto, MAP_TYPE);
    }
}
