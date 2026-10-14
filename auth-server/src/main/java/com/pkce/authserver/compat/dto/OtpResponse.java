package com.pkce.authserver.compat.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

/** Copied verbatim from SuperMeBE (com.superme.dto.OtpResponse). */
@Data
@NoArgsConstructor
public class OtpResponse {

    private boolean success;
    private String message;
    private Integer nextStep;
    private Map<String, Object> savedData;
    private String email;
    private String otp;
    private String identifierType;

    public OtpResponse(boolean success, String message) {
        this.success = success;
        this.message = message;
    }

    public static OtpResponse success(String message) {
        return new OtpResponse(true, message);
    }

    public static OtpResponse success(String message, Integer nextStep) {
        OtpResponse response = new OtpResponse(true, message);
        response.setNextStep(nextStep);
        return response;
    }

    public static OtpResponse failure(String message) {
        return new OtpResponse(false, message);
    }
}
