package com.pkce.authserver.web;

import jakarta.validation.constraints.NotBlank;

public record GoogleSignupHandoffRequest(@NotBlank String ticket) { }
