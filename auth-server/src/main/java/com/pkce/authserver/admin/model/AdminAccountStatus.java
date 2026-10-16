package com.pkce.authserver.admin.model;

/**
 * Mirrors the two values of SuperMeBE's com.superme.enums.AdminStatus that this server
 * actually reads off mindfullAdmin.Admin.status. Kept local rather than importing their
 * whole enums package for one field.
 */
public enum AdminAccountStatus {
    ACTIVE,
    INACTIVE
}
