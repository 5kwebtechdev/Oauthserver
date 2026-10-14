package com.pkce.authserver.compat.dto;

import com.pkce.authserver.superme.dto.UserDTO;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * SuperMeBE's login response (com.superme.dto.LoginResponse), field-for-field.
 *
 * referralRewards and roleSwitchNotifications are typed as List<Object> rather than their own DTOs
 * because this server never populates them: draining those queues is a stateful business operation
 * that would race SuperMeBE's own login (see ARCHITECTURE.md section 18). They stay null, which is
 * the same JSON a login with nothing pending produces over there.
 *
 * refreshToken is the one addition - their token is opaque and long-lived, ours is a short-lived
 * access token from the authorization server, so a client needs the refresh token to keep going.
 * Additive, so a client written against their API ignores it.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {

    private String token;
    private UserDTO user;
    private Boolean alreadyExistsUser;
    private List<Object> referralRewards;
    private List<Object> roleSwitchNotifications;
    private Boolean firstLoggedForTheDay;
    private String refreshToken;

    public LoginResponse(String token, UserDTO user) {
        this.token = token;
        this.user = user;
    }
}
