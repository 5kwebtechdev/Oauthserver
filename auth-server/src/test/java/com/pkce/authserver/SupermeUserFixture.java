package com.pkce.authserver;

import com.pkce.authserver.repository.SupermeUserRepository;
import com.pkce.authserver.repository.UserPasswordRepository;
import com.pkce.authserver.superme.enums.Relationship;
import com.pkce.authserver.superme.enums.Role;
import com.pkce.authserver.superme.model.User;
import com.pkce.authserver.superme.model.UserPassword;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;

/**
 * Builds test users the way SuperMeBE's schema actually demands.
 *
 * name, gender, dateOfBirth, relationship, role and ageGroup are all NOT NULL with no database
 * default over there, so there is no such thing as a minimal user row - which is exactly why this
 * server cannot register anyone itself and only authenticates accounts their onboarding created.
 * Every test that needs a user goes through here so that constraint keeps being honoured, and so a
 * future column becoming mandatory is one fix rather than six.
 */
public final class SupermeUserFixture {

    private SupermeUserFixture() {
    }

    public static User user(String email) {
        return User.builder()
                .name("Test User")
                .email(email)
                .gender("OTHER")
                .dateOfBirth(LocalDate.of(1990, 1, 1))
                .relationship(Relationship.SELF)
                .role(Role.USER)
                .enabled(true)
                .build();
    }

    /** Saves a user with a password, the normal "can log in with a password" case. */
    public static User saveWithPassword(SupermeUserRepository users,
                                        UserPasswordRepository passwords,
                                        PasswordEncoder encoder,
                                        String email,
                                        String rawPassword) {
        return saveWithPassword(users, passwords, encoder, email, null, rawPassword, Role.USER);
    }

    public static User saveWithPassword(SupermeUserRepository users,
                                        UserPasswordRepository passwords,
                                        PasswordEncoder encoder,
                                        String email,
                                        String phone,
                                        String rawPassword,
                                        Role role) {
        User user = user(email);
        user.setPhone(phone);
        user.setRole(role);
        User saved = users.save(user);
        passwords.save(UserPassword.builder()
                .user(saved)
                .password(encoder.encode(rawPassword))
                .build());
        return saved;
    }

    /** Saves a user with no UserPassword row - the state 131 of the live accounts are in. */
    public static User saveWithoutPassword(SupermeUserRepository users, String email) {
        return users.save(user(email));
    }
}
