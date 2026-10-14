package com.pkce.authserver.web;

import com.pkce.authserver.superme.model.User;

import java.time.LocalDateTime;

/**
 * The admin users-list row, in terms of SuperMeBE's User. Separate from the login payload
 * (com.pkce.authserver.superme.dto.UserDTO) on purpose: that one has to stay byte-for-byte the
 * shape their /auth/login returns, while this one is this server's own admin view and is free to
 * show different fields, such as the authProvider derived below.
 */
public record AdminUserResponse(
        Long id,
        String name,
        String username,
        String email,
        String phone,
        String role,
        String authProvider,
        Integer onboardingStep,
        boolean enabled,
        boolean deleted,
        LocalDateTime createdDateTime,
        LocalDateTime lastLoginDate
) {
    public static AdminUserResponse from(User user) {
        return new AdminUserResponse(
                user.getId(),
                user.getName(),
                user.getUsername(),
                user.getEmail(),
                user.getPhone(),
                user.getRole() == null ? null : user.getRole().name(),
                authProviderOf(user),
                user.getOnboardingStep(),
                user.isEnabled(),
                Boolean.TRUE.equals(user.getDeleted()),
                user.getCreatedDateTime(),
                user.getLastLoginDate()
        );
    }

    /**
     * SuperMeBE has no single "how did this account sign up" column; a linked OAuth provider is the
     * only signal, so anything without one is reported as LOCAL.
     */
    private static String authProviderOf(User user) {
        String providerType = user.getOauth2ProviderType();
        return providerType == null || providerType.isBlank() ? "LOCAL" : providerType;
    }
}
