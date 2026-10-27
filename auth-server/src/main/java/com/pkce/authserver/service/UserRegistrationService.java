package com.pkce.authserver.service;

import com.pkce.authserver.config.SupermeProperties;
import com.pkce.authserver.entity.ReferralPopupEvent;
import com.pkce.authserver.entity.ReferralReward;
import com.pkce.authserver.repository.AvatarRepository;
import com.pkce.authserver.repository.CoinTransactionRepository;
import com.pkce.authserver.repository.FamilyMemberRepository;
import com.pkce.authserver.repository.FamilyRepository;
import com.pkce.authserver.repository.PetRepository;
import com.pkce.authserver.repository.ReferralPopupEventRepository;
import com.pkce.authserver.repository.ReferralRewardRepository;
import com.pkce.authserver.repository.SupermeUserRepository;
import com.pkce.authserver.repository.UserPasswordRepository;
import com.pkce.authserver.superme.dto.RegisterRequest;
import com.pkce.authserver.superme.enums.Relationship;
import com.pkce.authserver.superme.model.Avatar;
import com.pkce.authserver.superme.model.CoinTransaction;
import com.pkce.authserver.superme.model.Family;
import com.pkce.authserver.superme.model.FamilyMember;
import com.pkce.authserver.superme.model.Pet;
import com.pkce.authserver.superme.model.User;
import com.pkce.authserver.superme.model.UserPassword;
import com.pkce.authserver.superme.util.AvatarNameGenerator;
import com.pkce.authserver.superme.util.FamilyCodeGenerator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Registration, ported from SuperMeBE's UserService.registerUser so an account created here is
 * indistinguishable from one their own app created: same required fields, same onboarding-step
 * arithmetic, same avatar auto-creation, same family rules and member limits, same coin bonuses
 * and ledger entries, same referral handling.
 *
 * Three things from their version are deliberately not carried over, each for a concrete reason:
 *
 *   - **The admin-email uniqueness check.** Theirs calls emailUniquenessValidator against a second
 *     datasource (mindfullAdmin). This server has one datasource and no business reading their
 *     admin tables, so an email already belonging to an admin is not rejected here.
 *   - **Badge/achievement triggers.** Those belong to subsystems this server does not carry.
 *
 * Everything here is gated on app.superme.writes-enabled: registration inserts rows into a live
 * production database shared with a running app, so it is off unless deliberately switched on.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UserRegistrationService {

    private static final int ONBOARDING_STEP_COMPLETE = 7;
    private static final int REFERRAL_BONUS_COINS = 100;
    private static final int PARENT_REGISTRATION_BONUS_COINS = 500;
    private static final int SIGNUP_BONUS_COINS = 10;
    private static final int MAX_CHILDREN_PER_FAMILY = 2;
    private static final int MAX_PARENTS_PER_FAMILY = 2;

    private static final Set<String> ALLOWED_USER_GENDERS = Set.of(
            "male",
            "female",
            "prefer_not_to_say"
    );

    private final SupermeUserRepository userRepository;
    private final UserPasswordRepository userPasswordRepository;
    private final FamilyRepository familyRepository;
    private final FamilyMemberRepository familyMemberRepository;
    private final AvatarRepository avatarRepository;
    private final PetRepository petRepository;
    private final CoinTransactionRepository coinTransactionRepository;
    private final ReferralRewardRepository referralRewardRepository;
    private final ReferralPopupEventRepository referralPopupEventRepository;
    private final PasswordEncoder passwordEncoder;
    private final SupermeProperties supermeProperties;

    /** Thrown for every rejection a caller can fix, mapped to 400 by RegisterController. */
    public static class RegistrationException extends RuntimeException {
        public RegistrationException(String message) {
            super(message);
        }
    }

    public record Result(User user, boolean newlyCreated) {
    }

    /** Whether an account already exists for this email - used before emailing a registration code. */
    @Transactional(readOnly = true)
    public boolean accountExists(String email) {
        return email != null && userRepository.findByEmail(email.trim()).isPresent();
    }

    /**
     * SuperMeBE's checkAlreadyRegisteredUser rule: anything containing '@' is looked up as an
     * email, everything else as a phone number. Their version also checks the Admin tables, which
     * live in a second datasource this server does not have.
     */
    @Transactional(readOnly = true)
    public boolean identifierIsTaken(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            return false;
        }
        String trimmed = identifier.trim();
        return trimmed.contains("@")
                ? userRepository.findByEmail(trimmed).isPresent()
                : userRepository.findByPhone(trimmed).isPresent();
    }

    @Transactional
    public Result register(RegisterRequest request) {
        if (!supermeProperties.isWritesEnabled()) {
            throw new IllegalStateException("Registration is disabled on this server (app.superme.writes-enabled=false)");
        }

        // Basic validations - same order and same messages as theirs.
        if (request.getName() == null || request.getName().isEmpty()) {
            throw new RegistrationException("Name is required.");
        }
        if ((request.getEmail() == null || request.getEmail().isBlank())
                && (request.getPhone() == null || request.getPhone().isBlank())) {
            throw new RegistrationException("Either email or phone must be provided.");
        }
        String normalizedGender = normalizeUserGender(request.getGender());
        if (request.getDateOfBirth() == null) {
            throw new RegistrationException("Date of birth is required.");
        }
        if (request.getRelationship() == null || request.getRelationship().isEmpty()) {
            throw new RegistrationException("Relationship is required (CHILD, PARENT, SELF).");
        }

        // Find an existing user by email, falling back to phone.
        User existingUser = null;
        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            existingUser = userRepository.findByEmail(request.getEmail().trim()).orElse(null);
        }
        if (existingUser == null && request.getPhone() != null && !request.getPhone().isBlank()) {
            existingUser = userRepository.findByPhone(request.getPhone().trim()).orElse(null);
        }

        if (existingUser != null) {
            boolean isComplete = existingUser.getOnboardingStep() != null
                    && existingUser.getOnboardingStep() >= ONBOARDING_STEP_COMPLETE;
            if (isComplete) {
                throw new RegistrationException("User already exists with the provided email or phone.");
            }
            // Onboarding is still in progress for this email/phone: patch just the newly-completed
            // step(s) instead of re-running full registration, which would duplicate
            // avatars/coins/family rows on every retry.
            return new Result(patchOnboardingProgress(existingUser, request), false);
        }

        // Username is optional but must be unique when provided.
        String normalizedUsername = (request.getUsername() != null && !request.getUsername().isBlank())
                ? request.getUsername().trim() : null;
        if (normalizedUsername != null && userRepository.existsByUsername(normalizedUsername)) {
            throw new RegistrationException("Username is already taken.");
        }

        Relationship relationship = parseRelationship(request.getRelationship());
        String familyCode = request.getFamilyCode();

        User user = new User();
        user.setName(request.getName());
        user.setUsername(normalizedUsername);
        user.setGender(normalizedGender);
        user.setRelationship(relationship);
        user.setDateOfBirth(request.getDateOfBirth());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone() != null && !request.getPhone().isEmpty() ? request.getPhone() : null);
        LocalDateTime now = LocalDateTime.now();
        user.setCreatedDateTime(now);
        user.setLastActiveTime(now);
        int baseStep = (request.getPetName() != null && !request.getPetName().isBlank()) ? 6 : 5;
        user.setOnboardingStep(Boolean.TRUE.equals(request.getUnlockPotential()) ? ONBOARDING_STEP_COMPLETE : baseStep);
        user.setEmailVerified(true);

        User referrer = applyReferralToNewUser(request, user);

        User savedUser = userRepository.save(user);

        if (referrer != null) {
            recordCoins(savedUser, REFERRAL_BONUS_COINS, "REFERRAL_BONUS",
                    "Referral bonus: used referral code of " + referrer.getName());
        }

        // Pet: find-or-create so unknown names never produce a 404.
        if (request.getPetName() != null && !request.getPetName().isBlank()) {
            Pet pet = petRepository.findByPetName(request.getPetName())
                    .or(() -> petRepository.findByUrl(request.getPetName()))
                    .orElseGet(() -> petRepository.save(Pet.builder()
                            .petName(request.getPetName())
                            .url(request.getPetName())
                            .build()));
            user.setPet(pet);
        }

        // Avatar auto-creation.
        Avatar avatar = new Avatar();
        avatar.setAvatarName(generateUniqueAvatarName(user.getName()));
        avatar.setAvatarImageName(request.getAvatarImageName());
        avatar.setGender(user.getGender());
        avatar = avatarRepository.save(avatar);
        user.setAvatar(avatar);

        user = attachFamily(user, relationship, familyCode, request);

        // Parent gets 500 starter coins to assign tasks/habits to children.
        if (relationship == Relationship.PARENT) {
            user.setCoins(user.getCoins() + PARENT_REGISTRATION_BONUS_COINS);
            user.setLifetimeCoinsEarned(user.getLifetimeCoinsEarned() + PARENT_REGISTRATION_BONUS_COINS);
        } else {
            user.setCoins(user.getCoins() + SIGNUP_BONUS_COINS);
            user.setLifetimeCoinsEarned(user.getLifetimeCoinsEarned() + SIGNUP_BONUS_COINS);
        }

        savedUser = userRepository.save(user);

        if (relationship == Relationship.PARENT) {
            recordCoins(savedUser, PARENT_REGISTRATION_BONUS_COINS, "REGISTRATION_BONUS",
                    "Welcome bonus: 500 coins awarded on parent registration");
        } else {
            recordCoins(savedUser, SIGNUP_BONUS_COINS, "FIRST_SIGNUP_BONUS",
                    "First signup bonus: 10 coins awarded");
        }

        if (request.getPassword() != null && !request.getPassword().isEmpty()) {
            UserPassword userPassword = new UserPassword();
            userPassword.setUser(savedUser);
            userPassword.setPassword(passwordEncoder.encode(request.getPassword()));
            userPasswordRepository.save(userPassword);
        }

        if (savedUser.getFamily() != null) {
            FamilyMember member = new FamilyMember();
            member.setFamily(savedUser.getFamily());
            member.setUser(savedUser);
            member.setDateOfBirth(savedUser.getDateOfBirth());
            familyMemberRepository.save(member);
        }

        if (referrer != null) {
            LocalDateTime referralCreatedAt = LocalDateTime.now();
            referralRewardRepository.save(ReferralReward.builder()
                    .referrer(referrer)
                    .referredUserId(savedUser.getId())
                    .referredUserName(savedUser.getName())
                    .coins(REFERRAL_BONUS_COINS)
                    .notified(false)
                    .createdAt(referralCreatedAt)
                    .build());

            recordReferralPopupEvent(savedUser.getId(), ReferralPopupEvent.Type.REFERRAL_RECEIVED,
                    referrer.getId(), referralCreatedAt);
            recordReferralPopupEvent(referrer.getId(), ReferralPopupEvent.Type.REFERRAL_JOINED,
                    savedUser.getId(), referralCreatedAt);
        }

        if (request.getFamilyCode() != null && !request.getFamilyCode().isBlank()) {
            Long registeredUserId = savedUser.getId();
            familyRepository.findByFamilyCode(request.getFamilyCode()).ifPresent(existedFamily -> {
                if (existedFamily.getCreatedBy() == null) {
                    existedFamily.setCreatedBy(registeredUserId);
                    familyRepository.save(existedFamily);
                }
            });
        }

        log.info("Registered new SuperMeApp user {} ({})", savedUser.getId(), savedUser.getName());
        return new Result(savedUser, true);
    }

    /**
     * Credits the referrer and flags the new user, mirroring theirs. The new user's own coin
     * transaction is written by the caller, once the insert has given them an id.
     */
    private User applyReferralToNewUser(RegisterRequest request, User user) {
        if (request.getReferralCode() == null || request.getReferralCode().isBlank()) {
            return null;
        }
        User referrer = userRepository.findByReferralCodeIgnoreCase(request.getReferralCode().trim())
                .orElseThrow(() -> new RegistrationException("Invalid referral code."));

        referrer.setCoins(referrer.getCoins() + REFERRAL_BONUS_COINS);
        referrer.setLifetimeCoinsEarned(referrer.getLifetimeCoinsEarned() + REFERRAL_BONUS_COINS);
        referrer.setReferralCount(referrer.getReferralCount() + 1);
        // Both sides are rewarded: the joining user also gets 100 coins.
        user.setCoins(user.getCoins() + REFERRAL_BONUS_COINS);
        user.setLifetimeCoinsEarned(user.getLifetimeCoinsEarned() + REFERRAL_BONUS_COINS);
        user.setJoinedWithReferral(true);
        user.setUsedReferralCode(request.getReferralCode().trim());
        userRepository.save(referrer);

        recordCoins(referrer, REFERRAL_BONUS_COINS, "REFERRAL_BONUS",
                "Referral bonus: invited new user " + user.getName());
        return referrer;
    }

    private void recordReferralPopupEvent(Long recipientUserId, ReferralPopupEvent.Type type,
                                          Long relatedUserId, LocalDateTime createdAt) {
        if (referralPopupEventRepository.existsByRecipientUserIdAndTypeAndRelatedUserId(
                recipientUserId, type, relatedUserId)) {
            return;
        }
        referralPopupEventRepository.save(ReferralPopupEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .recipientUserId(recipientUserId)
                .type(type)
                .relatedUserId(relatedUserId)
                .amount(REFERRAL_BONUS_COINS)
                .bothRewarded(true)
                .createdAt(createdAt)
                .build());
    }

    private User attachFamily(User user, Relationship relationship, String familyCode, RegisterRequest request) {
        if (relationship == Relationship.CHILD) {
            if (familyCode == null || familyCode.isBlank()) {
                throw new RegistrationException("Family code is mandatory for child registration.");
            }
            Optional<Family> optionalFamily = familyRepository.findByFamilyCode(familyCode);
            if (optionalFamily.isPresent()) {
                Family existingFamily = optionalFamily.get();
                long childCount = familyMemberRepository.countByRelationship(existingFamily, Relationship.CHILD);
                if (childCount >= MAX_CHILDREN_PER_FAMILY) {
                    throw new RegistrationException("This family already has the maximum number of children (2).");
                }
                user.setFamily(existingFamily);
            }
            return user;
        }

        if (relationship == Relationship.PARENT) {
            if (familyCode != null && !familyCode.isBlank()) {
                Optional<Family> optionalFamily = familyRepository.findByFamilyCode(familyCode);
                if (optionalFamily.isPresent()) {
                    // Co-parent joining an existing family.
                    Family existingFamily = optionalFamily.get();
                    long parentCount = familyMemberRepository.countByRelationship(existingFamily, Relationship.PARENT);
                    if (parentCount >= MAX_PARENTS_PER_FAMILY) {
                        throw new RegistrationException("This family already has the maximum number of parents (2).");
                    }
                    user.setFamily(existingFamily);
                    return user;
                }
                // Fresh parent creating a new family using the client-provided code.
                user = userRepository.save(user); // ensure ID available for createdBy
                user.setFamily(createFamily(
                        request.getFamilyName() != null ? request.getFamilyName() : user.getName() + "'s Family",
                        familyCode, user.getId()));
                return user;
            }

            if (request.getFamilyName() != null && !request.getFamilyName().isBlank()) {
                // No familyCode provided but familyName given: create the family first (generating
                // a fresh unique code), then mark this parent as its creator.
                user = userRepository.save(user); // ensure ID available for createdBy
                user.setFamily(createFamily(request.getFamilyName(),
                        generateUniqueFamilyCode(request.getFamilyName()), user.getId()));
                return user;
            }

            throw new RegistrationException("Either familyCode or familyName is required for parent registration.");
        }

        if (relationship == Relationship.SELF) {
            user.setFamily(null);
            user.setAsChild(Boolean.TRUE.equals(request.getAsChild()) ? Boolean.TRUE : null);
            return user;
        }

        throw new RegistrationException("Invalid relationship type provided.");
    }

    private Family createFamily(String familyName, String familyCode, Long createdBy) {
        Family family = new Family();
        family.setFamilyName(familyName);
        family.setFamilyCode(familyCode);
        family.setCreatedBy(createdBy);
        return familyRepository.save(family);
    }

    /**
     * Advances an in-progress registration by one onboarding step per newly-supplied piece of info,
     * rather than re-running the whole create flow. Idempotent: if neither applies, the user's
     * current state is returned unchanged rather than treated as an error.
     */
    private User patchOnboardingProgress(User existingUser, RegisterRequest request) {
        boolean changed = false;

        if (request.getPetName() != null && !request.getPetName().isBlank()
                && (existingUser.getPet() == null || !request.getPetName().equals(existingUser.getPet().getPetName()))) {
            Pet pet = petRepository.findByPetName(request.getPetName())
                    .or(() -> petRepository.findByUrl(request.getPetName()))
                    .orElseGet(() -> petRepository.save(Pet.builder()
                            .petName(request.getPetName())
                            .url(request.getPetName())
                            .build()));
            existingUser.setPet(pet);
            existingUser.setOnboardingStep(existingUser.getOnboardingStep() + 1);
            changed = true;
        }

        if (Boolean.TRUE.equals(request.getUnlockPotential())
                && existingUser.getOnboardingStep() < ONBOARDING_STEP_COMPLETE) {
            existingUser.setOnboardingStep(ONBOARDING_STEP_COMPLETE);
            changed = true;
        }

        return changed ? userRepository.save(existingUser) : existingUser;
    }

    private void recordCoins(User user, int amount, String type, String description) {
        coinTransactionRepository.save(CoinTransaction.builder()
                .user(user)
                .amount(amount)
                .type(type)
                .timestamp(LocalDateTime.now())
                .description(description)
                .build());
    }

    private String generateUniqueAvatarName(String userName) {
        String name;
        int attempts = 0;
        do {
            name = AvatarNameGenerator.generate(userName);
            attempts++;
        } while (avatarRepository.existsByAvatarNameIgnoreCase(name) && attempts < 15);

        if (attempts == 15) {
            throw new RegistrationException("Unable to generate unique avatar name");
        }
        return name;
    }

    private String generateUniqueFamilyCode(String familyName) {
        String code;
        do {
            code = FamilyCodeGenerator.generateFamilyCode(familyName);
        } while (familyRepository.existsByFamilyCode(code));
        return code;
    }

    private String normalizeUserGender(String rawGender) {
        if (rawGender == null || rawGender.isBlank()) {
            return "prefer_not_to_say";
        }
        String normalized = rawGender.trim().toLowerCase(Locale.ROOT);
        if (!ALLOWED_USER_GENDERS.contains(normalized)) {
            throw new RegistrationException("Gender must be one of: male, female, prefer_not_to_say");
        }
        return normalized;
    }

    private Relationship parseRelationship(String raw) {
        try {
            return Relationship.valueOf(raw.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new RegistrationException("Invalid relationship type provided.");
        }
    }
}
