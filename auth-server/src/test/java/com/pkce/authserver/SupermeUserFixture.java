package com.pkce.authserver;

import com.pkce.authserver.repository.SupermeUserRepository;
import com.pkce.authserver.repository.UserPasswordRepository;
import com.pkce.authserver.superme.converter.UserAgeGroupIdConverter;
import com.pkce.authserver.superme.converter.UserRelationshipIdConverter;
import com.pkce.authserver.superme.enums.AgeGroup;
import com.pkce.authserver.superme.enums.Relationship;
import com.pkce.authserver.superme.enums.Role;
import com.pkce.authserver.superme.model.User;
import com.pkce.authserver.superme.model.UserPassword;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.sql.Date;
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
                                        JdbcTemplate jdbcTemplate,
                                        String email,
                                        String rawPassword) {
        return saveWithPassword(users, passwords, encoder, jdbcTemplate, email, null, rawPassword, Role.USER);
    }

    public static User saveWithPassword(SupermeUserRepository users,
                                        UserPasswordRepository passwords,
                                        PasswordEncoder encoder,
                                        JdbcTemplate jdbcTemplate,
                                        String email,
                                        String phone,
                                        String rawPassword,
                                        Role role) {
        User user = user(email);
        user.setPhone(phone);
        user.setRole(role);
        User saved = users.save(user);
        // email/phone/username/dateOfBirth/relationship/age/ageGroup all live on user_profile,
        // read through User.profileRef (see its comment) - no save() path writes them, so
        // findByEmail/findByPhone/findByUsername (which join through that association) won't
        // find this user at all without this, exactly like real registrations get via
        // UserRegistrationService.syncUserProfile.
        syncProfile(jdbcTemplate, saved);
        passwords.save(UserPassword.builder()
                .user(saved)
                .password(encoder.encode(rawPassword))
                .build());
        return saved;
    }

    /** Saves a user with no UserPassword row - the state 131 of the live accounts are in. */
    public static User saveWithoutPassword(SupermeUserRepository users, JdbcTemplate jdbcTemplate, String email) {
        User saved = users.save(user(email));
        syncProfile(jdbcTemplate, saved);
        return saved;
    }

    /**
     * Writes the user_profile row real registrations get via UserRegistrationService.syncUserProfile.
     * relationship/ageGroup are Transient on User (see User.java's comment on why) - no save() path
     * writes them, so any test that reads getRelationship()/getAgeGroup() back off a reloaded User
     * needs this called once after the user itself is saved.
     */
    public static void syncProfile(JdbcTemplate jdbcTemplate, User user) {
        Integer relationshipId = new UserRelationshipIdConverter()
                .convertToDatabaseColumn(user.getRelationship()) instanceof Byte b ? b.intValue() : null;
        AgeGroup ageGroup = user.getAgeGroup() == null ? AgeGroup.BELOW_11 : user.getAgeGroup();
        Integer ageGroupId = new UserAgeGroupIdConverter()
                .convertToDatabaseColumn(ageGroup) instanceof Byte b ? b.intValue() : null;
        int age = user.getDateOfBirth() == null ? 0
                : java.time.Period.between(user.getDateOfBirth(), LocalDate.now()).getYears();
        jdbcTemplate.update(
                "INSERT INTO user_profile (user_id, age, age_group_id, dateOfBirth, email, gender_id, name, phone, relationship_id, username, dobChanged) "
                        + "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0) "
                        + "ON DUPLICATE KEY UPDATE age=VALUES(age), age_group_id=VALUES(age_group_id), dateOfBirth=VALUES(dateOfBirth), "
                        + "email=VALUES(email), name=VALUES(name), phone=VALUES(phone), relationship_id=VALUES(relationship_id), username=VALUES(username)",
                user.getId(), age, ageGroupId, Date.valueOf(user.getDateOfBirth()), user.getEmail(),
                null, user.getName(), user.getPhone(), relationshipId, user.getUsername());
    }
}
