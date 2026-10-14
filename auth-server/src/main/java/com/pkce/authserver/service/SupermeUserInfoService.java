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
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public Optional<Map<String, Object>> userPayloadFor(String identifier) {
        return userLookup.findByIdentifier(identifier)
                .map(UserMapper::toDto)
                .map(this::toMap);
    }

    private Map<String, Object> toMap(UserDTO dto) {
        return objectMapper.convertValue(dto, MAP_TYPE);
    }
}
