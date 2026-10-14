package com.pkce.authserver.web;

import com.pkce.authserver.entity.SecurityEvent;

import java.time.LocalDateTime;

public record SecurityEventResponse(
        Long id,
        String eventType,
        String identifier,
        String ipAddress,
        String details,
        LocalDateTime createdAt
) {
    public static SecurityEventResponse from(SecurityEvent event) {
        return new SecurityEventResponse(
                event.getId(),
                event.getEventType(),
                event.getIdentifier(),
                event.getIpAddress(),
                event.getDetails(),
                event.getCreatedAt()
        );
    }
}
