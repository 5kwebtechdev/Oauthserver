package com.pkce.authserver.web;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateAdminRequest {

    @NotBlank
    private String fullName;

    @NotBlank
    @Email
    private String email;

    private String phone;

    @NotBlank
    private String department;

    private String designation;

    /** ADMIN, SUPER_ADMIN, MANAGER or EXECUTIVE - see com.pkce.authserver.superme.enums.Role. */
    @NotBlank
    private String role;

    @NotBlank
    @Size(min = 8)
    private String password;
}
