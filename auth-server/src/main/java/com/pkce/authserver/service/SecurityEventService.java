package com.pkce.authserver.service;

import com.pkce.authserver.entity.SecurityEvent;
import com.pkce.authserver.repository.SecurityEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SecurityEventService {

    private final SecurityEventRepository securityEventRepository;

    public void record(String eventType, String identifier, String ipAddress, String details) {
        SecurityEvent event = new SecurityEvent();
        event.setEventType(eventType);
        event.setIdentifier(identifier);
        event.setIpAddress(ipAddress);
        event.setDetails(details);
        securityEventRepository.save(event);
    }
}
