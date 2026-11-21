# Android secure session storage

Android-only AES-GCM encryption of a single session blob in app-private SharedPreferences. Encryption key is generated in AndroidKeyStore and is never exported. Android backups are already disabled in the manifest. No new dependency, client secret, OAuth registration or production configuration is introduced.

`src/app/core/storage/session-storage.ts` loads the encrypted session before Angular bootstrap. Existing synchronous token readers use a memory adapter; non-sensitive preferences retain their existing storage. All application localStorage consumers use the adapter so logout enumeration/clear includes secure keys. Keys containing token/secret/verifier, OIDC state and user_data are protected. Temporary social-signup tokens are routed through the same secure blob. Browser and iOS delegate to existing browser storage.

Migration writes the encrypted copy before removing legacy values. Existing secure values win over legacy copies. Decryption failure stops startup without deleting data. Session writes are serialized. Logout waits for secure persistence; token sets changed within one JavaScript turn are serialized together. No unencrypted fallback on persistence failure. Errors surface an alert.

Validation: TypeScript compilation, Android compileDebugJavaWithJavac and three focused storage tests passed. Production build result recorded in /tmp/superme-secure-build.log. Device login/refresh/restart/logout testing remains required. Android native PKCE remains disabled exactly as before; secure storage does not introduce a new authorization flow. DEV backend's Android callback and refresh/revocation success need real-session tests.

Use HTTPS DEV APIs for token-bearing requests. No server deployment or store upload performed. Release signing still requires the configured upload keystore.
