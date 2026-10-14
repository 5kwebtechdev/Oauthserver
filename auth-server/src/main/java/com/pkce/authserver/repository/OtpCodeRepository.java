package com.pkce.authserver.repository;

import com.pkce.authserver.entity.OtpCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface OtpCodeRepository extends JpaRepository<OtpCode, Long> {

    Optional<OtpCode> findFirstByPurposeAndEmailAndConsumedFalseOrderByCreatedAtDesc(String purpose, String email);

    @Modifying
    @Query("DELETE FROM OtpCode o WHERE o.purpose = :purpose AND o.email = :email AND o.consumed = false")
    void deleteUnconsumed(@Param("purpose") String purpose, @Param("email") String email);
}
