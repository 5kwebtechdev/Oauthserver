package com.pkce.authserver.web;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

import java.io.PrintWriter;

/**
 * Replaces Spring Security's auto-generated /login page so it can carry a "Forgot
 * password?" link out to the Angular app, and a "Sign in with Google" option handled
 * right here (see GoogleLoginController) - everything past the forgot-password link is
 * served by the FE, but Google sign-in is same-origin on this page by design, which lets
 * it resume the exact original /oauth2/authorize request instead of starting a new one.
 */
@Controller
public class LoginPageController {

    @Value("${app.frontend.forgot-password-url}")
    private String forgotPasswordUrl;

    @Value("${app.frontend.continue-with-email-url}")
    private String continueWithEmailUrl;

    @Value("${app.frontend.base-url}")
    private String frontendBaseUrl;

    @Value("${app.google.client-id}")
    private String googleClientId;

    @Value("${app.turnstile.site-key}")
    private String turnstileSiteKey;

    @GetMapping("/")
    public void home(jakarta.servlet.http.HttpServletResponse response) throws java.io.IOException {
        response.sendRedirect(frontendBaseUrl);
    }

    @GetMapping("/login")
    public void login(HttpServletRequest request, jakarta.servlet.http.HttpServletResponse response) throws Exception {
        CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        boolean captchaFailed = request.getParameter("captcha") != null;
        boolean hasError = request.getParameter("error") != null && !captchaFailed;
        boolean loggedOut = request.getParameter("logout") != null;

        // Cloudflare's auto-render (class="cf-turnstile" + data-sitekey) auto-injects a
        // hidden cf-turnstile-response input into the enclosing form with zero extra JS -
        // TurnstileLoginFilter reads that same field name server-side. Rendered only when
        // a real site key exists, so a not-yet-configured deployment shows nothing rather
        // than a broken widget with an empty sitekey.
        String turnstileWidget = turnstileSiteKey.isBlank()
                ? ""
                : "<div class=\"cf-turnstile\" data-sitekey=\"" + turnstileSiteKey + "\"></div>";

        response.setContentType("text/html;charset=UTF-8");
        try (PrintWriter writer = response.getWriter()) {
            // String.formatted treats '%' as a format marker: use '%%' for CSS percentages.
            writer.write("""
                    <!doctype html>
                    <html lang="en">
                      <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
                        <meta name="theme-color" content="#f8f4ef">
                        <meta name="mobile-web-app-capable" content="yes">
                        <meta name="apple-mobile-web-app-capable" content="yes">
                        <meta name="apple-mobile-web-app-status-bar-style" content="default">
                        <title>Sign in | SuperMeApp</title>
                        <style>
                          :root {
                            color-scheme: light;
                            --ink: #24203a;
                            --ink-subtle: #514b60;
                            --muted: #777286;
                            --violet: #6840a2;
                            --violet-light: #7b4ebc;
                            --violet-deep: #34204e;
                            --violet-tint: #f5f0fa;
                            --line: #e5dfe8;
                            --line-focus: #9168be;
                            --card-bg: #ffffff;
                            --danger-bg: #fdf2f2;
                            --danger-text: #9b1c1c;
                            --danger-border: #f8b4b4;
                            --success-bg: #f3faf7;
                            --success-text: #0e6245;
                            --success-border: #84e1bc;
                          }
                          * { box-sizing: border-box; }
                          html, body {
                            margin: 0;
                            padding: 0;
                            width: 100%%;
                            min-height: 100%%;
                          }
                          body {
                            min-height: 100vh;
                            min-height: 100dvh;
                            display: flex;
                            flex-direction: column;
                            justify-content: center;
                            align-items: center;
                            padding: max(1.25rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1.25rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
                            color: var(--ink);
                            font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
                            background:
                              radial-gradient(ellipse at 12%% 18%%, #e8dafa 0, transparent 34rem),
                              radial-gradient(ellipse at 88%% 82%%, #f5c9dc 0, transparent 32rem),
                              radial-gradient(ellipse at 72%% 15%%, #d7eee8 0, transparent 30rem),
                              #f8f4ef;
                            -webkit-font-smoothing: antialiased;
                            -moz-osx-font-smoothing: grayscale;
                            overflow-x: hidden;
                          }
                          .auth-shell {
                            width: 100%%;
                            max-width: 48rem;
                            margin: auto 0;
                            padding: 0.5rem 0;
                          }
                          .auth-heading {
                            margin: 0 0 1.5rem;
                            text-align: center;
                          }
                          .auth-heading h1 {
                            margin: 0;
                            font-size: clamp(1.3rem, 4vw, 1.6rem);
                            font-weight: 800;
                            letter-spacing: -0.015em;
                            color: var(--violet-deep);
                            line-height: 1.25;
                          }
                          .auth-heading p {
                            margin: 0.4rem 0 0;
                            color: var(--muted);
                            font-size: clamp(0.88rem, 2.5vw, 0.98rem);
                          }
                          .auth-layout {
                            display: grid;
                            grid-template-columns: minmax(11rem, 1fr) minmax(18rem, 22rem);
                            align-items: center;
                            gap: 1.5rem;
                            width: 100%%;
                          }
                          .mascot-side {
                            position: relative;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            min-height: 17rem;
                          }
                          .mascot-note {
                            z-index: 1;
                            max-width: 14rem;
                            padding: 0.95rem 1.2rem;
                            border: 1px solid #ebdff5;
                            border-radius: 1.1rem;
                            background: rgba(255, 255, 255, 0.95);
                            backdrop-filter: blur(8px);
                            -webkit-backdrop-filter: blur(8px);
                            box-shadow: 0 0.8rem 2rem rgba(73, 49, 96, 0.1);
                            text-align: center;
                          }
                          .mascot-note strong {
                            display: block;
                            color: var(--violet);
                            font-size: 1.05rem;
                            font-weight: 700;
                          }
                          .mascot-note span {
                            display: block;
                            margin-top: 0.35rem;
                            color: var(--muted);
                            font-size: 0.85rem;
                            line-height: 1.45;
                          }
                          .mascot-mobile-badge {
                            display: none;
                          }
                          .mascot {
                            position: relative;
                            display: grid;
                            place-items: center;
                            width: 8.4rem;
                            height: 8.4rem;
                            margin-top: 0.5rem;
                            border-radius: 50%%;
                            background: radial-gradient(circle at 35%% 28%%, #ffffff 0, #f6e9da 52%%, #efd5ca 100%%);
                            font-size: 5.2rem;
                            filter: drop-shadow(0 0.8rem 0.7rem rgba(58, 37, 64, 0.15));
                            user-select: none;
                          }
                          .auth-card {
                            width: 100%%;
                            padding: clamp(1.25rem, 4vw, 1.75rem);
                            border: 1px solid var(--line);
                            border-radius: 1.25rem;
                            background: var(--card-bg);
                            box-shadow:
                              0 1rem 3rem rgba(52, 32, 78, 0.12),
                              0 0.2rem 0.6rem rgba(52, 32, 78, 0.05);
                          }
                          .form-signin {
                            margin: 0;
                          }
                          .form-signin-heading {
                            margin: 0 0 1rem;
                            font-size: 1.2rem;
                            font-weight: 750;
                            color: var(--violet-deep);
                          }
                          .field {
                            margin: 0 0 0.85rem;
                          }
                          .field label, .form-signin > p > label:not(.sr-only) {
                            display: block;
                            margin: 0 0 0.4rem;
                            color: var(--ink-subtle);
                            font-size: 0.85rem;
                            font-weight: 650;
                          }
                          .form-control {
                            display: block;
                            width: 100%%;
                            min-height: 3rem;
                            padding: 0.75rem 0.95rem;
                            border: 1px solid var(--line);
                            border-radius: 0.75rem;
                            background: #ffffff;
                            color: var(--ink);
                            font: inherit;
                            font-size: 16px; /* 16px prevents mobile/Android Chrome auto-zoom on focus */
                            box-shadow: 0 0.1rem 0.25rem rgba(52, 32, 78, 0.04);
                            transition: border-color 0.18s ease, box-shadow 0.18s ease;
                            -webkit-appearance: none;
                            appearance: none;
                          }
                          .form-control:focus {
                            outline: none;
                            border-color: var(--line-focus);
                            box-shadow: 0 0 0 3px rgba(104, 64, 162, 0.18);
                          }
                          .form-control::placeholder {
                            color: #9a95a4;
                          }
                          select.form-control {
                            -webkit-appearance: menulist;
                            appearance: auto;
                            cursor: pointer;
                          }
                          .password-wrap {
                            position: relative;
                            width: 100%%;
                          }
                          .password-wrap .form-control {
                            padding-right: 3.4rem;
                          }
                          .password-toggle {
                            position: absolute;
                            top: 50%%;
                            right: 0.35rem;
                            transform: translateY(-50%%);
                            display: grid;
                            place-items: center;
                            width: 2.6rem;
                            height: 2.6rem;
                            border: 0;
                            border-radius: 0.55rem;
                            background: transparent;
                            color: #6b6575;
                            cursor: pointer;
                            touch-action: manipulation;
                            -webkit-tap-highlight-color: transparent;
                            transition: background-color 0.15s ease, color 0.15s ease;
                          }
                          .password-toggle:hover, .password-toggle:focus-visible {
                            background: var(--violet-tint);
                            color: var(--violet);
                            outline: none;
                          }
                          .forgot-row {
                            margin: 0.2rem 0 1rem;
                            text-align: right;
                            font-size: 0.85rem;
                          }
                          a {
                            color: var(--violet);
                            font-weight: 600;
                            text-decoration: none;
                            transition: color 0.15s ease;
                          }
                          a:hover, a:focus-visible {
                            color: var(--violet-deep);
                            text-decoration: underline;
                          }
                          .btn {
                            display: inline-flex;
                            justify-content: center;
                            align-items: center;
                            width: 100%%;
                            min-height: 3rem;
                            padding: 0.75rem 1.25rem;
                            border: 0;
                            border-radius: 0.75rem;
                            font: inherit;
                            font-size: 1rem;
                            font-weight: 700;
                            cursor: pointer;
                            touch-action: manipulation;
                            -webkit-tap-highlight-color: transparent;
                            transition: transform 0.12s ease, filter 0.18s ease, box-shadow 0.18s ease;
                            text-decoration: none;
                          }
                          .btn-primary {
                            color: #ffffff;
                            background: linear-gradient(105deg, #7543a8 0%%, #34204e 100%%);
                            box-shadow: 0 0.35rem 0.9rem rgba(81, 50, 112, 0.28);
                          }
                          .btn-primary:hover {
                            filter: brightness(1.08);
                          }
                          .btn-primary:active {
                            transform: scale(0.985);
                          }
                          .btn-primary:focus-visible {
                            outline: 3px solid var(--line-focus);
                            outline-offset: 2px;
                          }
                          .cf-turnstile {
                            display: flex;
                            justify-content: center;
                            width: 100%%;
                            max-width: 100%%;
                            margin: 0.85rem 0;
                            overflow-x: auto;
                          }
                          .divider {
                            display: flex;
                            align-items: center;
                            gap: 0.8rem;
                            margin: 1.25rem 0;
                            color: var(--muted);
                            font-size: 0.82rem;
                            font-weight: 600;
                            text-transform: uppercase;
                            letter-spacing: 0.05em;
                          }
                          .divider::before, .divider::after {
                            height: 1px;
                            flex: 1;
                            background: var(--line);
                            content: "";
                          }
                          #google-signin-button {
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            min-height: 2.75rem;
                            width: 100%%;
                            overflow: hidden;
                          }
                          .continue-row {
                            margin: 1.1rem 0 0;
                            text-align: center;
                            font-size: 0.9rem;
                          }
                          .signup-row {
                            margin: 1.5rem 0 0;
                            text-align: center;
                            color: var(--ink-subtle);
                            font-size: 0.92rem;
                          }
                          .alert {
                            margin: 0 0 1rem;
                            padding: 0.75rem 0.95rem;
                            border-radius: 0.7rem;
                            font-size: 0.88rem;
                            line-height: 1.4;
                            border: 1px solid transparent;
                            word-break: break-word;
                          }
                          .alert-danger {
                            color: var(--danger-text);
                            background: var(--danger-bg);
                            border-color: var(--danger-border);
                          }
                          .alert-success {
                            color: var(--success-text);
                            background: var(--success-bg);
                            border-color: var(--success-border);
                          }
                          .text-muted {
                            color: var(--muted);
                          }
                          .sr-only {
                            position: absolute;
                            width: 1px;
                            height: 1px;
                            padding: 0;
                            margin: -1px;
                            overflow: hidden;
                            clip: rect(0, 0, 0, 0);
                            white-space: nowrap;
                            border: 0;
                          }
                          #register-pane {
                            width: 100%%;
                            max-width: 28rem;
                            margin: 0 auto;
                          }
                          #register-pane .form-signin > p {
                            margin: 0.85rem 0;
                          }
                          #register-pane .form-signin > p > label {
                            display: block;
                            margin-bottom: 0.35rem;
                            font-size: 0.85rem;
                            font-weight: 650;
                            color: var(--ink-subtle);
                          }
                          @media (max-width: 768px) {
                            body {
                              padding: max(1rem, env(safe-area-inset-top)) max(0.85rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(0.85rem, env(safe-area-inset-left));
                            }
                            .auth-shell {
                              max-width: 26rem;
                            }
                            .auth-heading {
                              margin-bottom: 1.1rem;
                            }
                            .auth-layout {
                              display: flex;
                              flex-direction: column;
                              gap: 0.85rem;
                            }
                            .mascot-side {
                              min-height: auto;
                              margin-bottom: 0.2rem;
                            }
                            .mascot-note {
                              display: none;
                            }
                            .mascot {
                              display: none;
                            }
                            .mascot-mobile-badge {
                              display: inline-flex;
                              align-items: center;
                              gap: 0.5rem;
                              padding: 0.45rem 0.9rem;
                              border: 1px solid #ebdff5;
                              border-radius: 9999px;
                              background: rgba(255, 255, 255, 0.95);
                              box-shadow: 0 0.35rem 1rem rgba(73, 49, 96, 0.08);
                              font-size: 0.85rem;
                              color: var(--violet);
                              font-weight: 650;
                            }
                            .mascot-mobile-badge span {
                              font-size: 1.15rem;
                            }
                            .auth-card {
                              padding: 1.35rem 1.1rem;
                              border-radius: 1.15rem;
                            }
                          }
                          @media (max-width: 360px) {
                            body {
                              padding: 0.75rem 0.5rem;
                            }
                            .auth-card {
                              padding: 1.15rem 0.85rem;
                            }
                            .auth-heading h1 {
                              font-size: 1.25rem;
                            }
                            .btn {
                              font-size: 0.94rem;
                            }
                          }
                        </style>
                        <script src="https://accounts.google.com/gsi/client" async defer></script>
                        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
                      </head>
                      <body>
                        <main class="auth-shell">
                          <header class="auth-heading">
                            <h1>Welcome back to SuperMeApp!</h1>
                            <p>Let's unlock today's achievements.</p>
                          </header>
                          <div class="auth-layout" id="auth-layout">
                            <aside class="mascot-side" aria-label="Welcome">
                              <div class="mascot-note">
                                <strong>Hi, SuperStar!</strong>
                                <span>Log in to continue your SuperMe adventure.</span>
                              </div>
                              <div class="mascot" aria-hidden="true">🐼</div>
                              <div class="mascot-mobile-badge" aria-label="Welcome greeting">
                                <span aria-hidden="true">🐼</span> Hi, SuperStar! Welcome back
                              </div>
                            </aside>
                            <div class="auth-card" id="signin-pane">
                              <form class="form-signin" method="post" action="/login">
                            %s
                            %s
                            %s
                            <div class="field">
                              <label for="username" class="sr-only">Email or phone</label>
                              <input type="text" id="username" name="username" class="form-control" placeholder="Email or phone" required autofocus autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" inputmode="email">
                            </div>
                            <div class="field">
                              <label for="password" class="sr-only">Password</label>
                              <div class="password-wrap">
                                <input type="password" id="password" name="password" class="form-control" placeholder="Password" required autocomplete="current-password" autocapitalize="none" autocorrect="off">
                                <button class="password-toggle" type="button" id="password-toggle" aria-label="Show password" title="Show password">
                                  <svg id="eye-icon" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                                </button>
                              </div>
                            </div>
                            <input name="%s" type="hidden" value="%s" />
                            %s
                            <button class="btn btn-primary" type="submit">Sign in</button>
                            <p class="forgot-row">
                              <a href="%s">Forgot password?</a>
                            </p>
                          </form>
                          <div class="divider">OR</div>
                          <div id="google-signin-button"></div>
                          <p id="google-signin-error" class="alert alert-danger" style="display:none; margin-top:0.75rem;"></p>
                          <p class="continue-row">
                            <a href="%s">Continue with email</a>
                          </p>
                            </div>
                          </div>
                          <p class="signup-row">Don't have an account? <a href="%s">Sign up</a></p>

                        <!-- Shown only when Google sign-in reports registrationRequired: the identity
                             is verified, there is just no SuperMeApp account behind it yet. The
                             fields are the ones SuperMeBE's User table demands and a Google token
                             cannot supply. -->
                        <div id="register-pane" class="auth-card" style="display:none;">
                          <form class="form-signin" id="register-form">
                            <h2 class="form-signin-heading">Finish creating your account</h2>
                            <p class="text-muted" style="font-size:0.9rem; margin-top:0;">
                              Signed in with Google as <strong id="register-email-label"></strong>.
                              We just need a few details SuperMeApp requires.
                            </p>
                            <p id="register-error" class="alert alert-danger" style="display:none;"></p>

                            <p>
                              <label for="reg-name">Full name</label>
                              <input type="text" id="reg-name" class="form-control" autocomplete="name" required>
                            </p>
                            <p>
                              <label for="reg-gender">Gender</label>
                              <select id="reg-gender" class="form-control">
                                <option value="prefer_not_to_say">Prefer not to say</option>
                                <option value="female">Female</option>
                                <option value="male">Male</option>
                              </select>
                            </p>
                            <p>
                              <label for="reg-dob">Date of birth</label>
                              <input type="date" id="reg-dob" class="form-control" required>
                            </p>
                            <p>
                              <label for="reg-relationship">I am registering as</label>
                              <select id="reg-relationship" class="form-control">
                                <option value="SELF">Myself</option>
                                <option value="PARENT">A parent</option>
                                <option value="CHILD">A child</option>
                              </select>
                            </p>
                            <p id="reg-family-name-row" style="display:none;">
                              <label for="reg-family-name">Family name</label>
                              <input type="text" id="reg-family-name" class="form-control" placeholder="e.g. The Sharmas">
                            </p>
                            <p id="reg-family-code-row" style="display:none;">
                              <label for="reg-family-code">Family code</label>
                              <input type="text" id="reg-family-code" class="form-control" maxlength="8" placeholder="8 characters" autocapitalize="characters">
                              <small class="text-muted" id="reg-family-code-hint" style="display:block; margin-top:0.3rem;"></small>
                            </p>
                            <p>
                              <label for="reg-pet">Pet name <span class="text-muted">(optional)</span></label>
                              <input type="text" id="reg-pet" class="form-control">
                            </p>
                            <p>
                              <label for="reg-referral">Referral code <span class="text-muted">(optional)</span></label>
                              <input type="text" id="reg-referral" class="form-control" autocapitalize="characters">
                            </p>

                            <button class="btn btn-primary" type="submit" id="reg-submit" style="margin-top:1.25rem;">
                              Create account and continue
                            </button>
                            <p style="text-align:center; margin-top:1.2rem;">
                              <a href="#" id="register-cancel">Back to sign in</a>
                            </p>
                          </form>
                        </div>

                        <script>
                          var FALLBACK_REDIRECT = '%s';
                          // Held between the two calls: the same verified Google token that proved
                          // the identity is what /api/auth/register accepts as proof of the email.
                          var pendingGoogleToken = null;

                          function showSignInError(message) {
                            var el = document.getElementById('google-signin-error');
                            el.textContent = message;
                            el.style.display = 'block';
                          }

                          function openRegistrationForm(identity) {
                            document.getElementById('register-email-label').textContent = identity.email;
                            document.getElementById('reg-name').value = identity.name || '';
                            var authLayout = document.getElementById('auth-layout');
                            if (authLayout) { authLayout.style.display = 'none'; }
                            var signupRow = document.querySelector('.signup-row');
                            if (signupRow) { signupRow.style.display = 'none'; }
                            document.getElementById('register-pane').style.display = 'block';
                            updateFamilyFields();
                          }

                          // Their rules: a CHILD must join an existing family by code, a PARENT
                          // either joins one by code or starts one by name, and SELF has neither.
                          function updateFamilyFields() {
                            var relationship = document.getElementById('reg-relationship').value;
                            var codeRow = document.getElementById('reg-family-code-row');
                            var nameRow = document.getElementById('reg-family-name-row');
                            var hint = document.getElementById('reg-family-code-hint');
                            var codeInput = document.getElementById('reg-family-code');

                            codeRow.style.display = relationship === 'SELF' ? 'none' : 'block';
                            nameRow.style.display = relationship === 'PARENT' ? 'block' : 'none';
                            codeInput.required = relationship === 'CHILD';
                            hint.textContent = relationship === 'CHILD'
                              ? 'Required - ask a parent for the family code.'
                              : 'Optional - leave blank to start a new family.';
                          }

                          function valueOf(id) {
                            var el = document.getElementById(id);
                            if (!el) { return null; }
                            var raw = el.value ? el.value.trim() : '';
                            return raw.length ? raw : null;
                          }

                          function submitRegistration(event) {
                            event.preventDefault();
                            var button = document.getElementById('reg-submit');
                            var errorEl = document.getElementById('register-error');
                            errorEl.style.display = 'none';
                            button.disabled = true;
                            button.textContent = 'Creating your account...';

                            var payload = {
                              googleIdToken: pendingGoogleToken,
                              email: document.getElementById('register-email-label').textContent,
                              name: valueOf('reg-name'),
                              gender: valueOf('reg-gender'),
                              dateOfBirth: valueOf('reg-dob'),
                              relationship: valueOf('reg-relationship'),
                              familyCode: valueOf('reg-family-code'),
                              familyName: valueOf('reg-family-name'),
                              petName: valueOf('reg-pet'),
                              referralCode: valueOf('reg-referral')
                            };

                            fetch('/api/auth/register', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(payload)
                            })
                              .then(function (res) {
                                return res.json()
                                  .catch(function () { return {}; })
                                  .then(function (data) {
                                    if (!res.ok) { throw new Error(data.message || 'Could not create your account.'); }
                                    return data;
                                  });
                              })
                              .then(function (data) {
                                // Registration already established the session, so this resumes the
                                // /oauth2/authorize request that sent the browser here - the new
                                // user lands signed in rather than back at a login form.
                                window.location.href = data.redirectTo || FALLBACK_REDIRECT;
                              })
                              .catch(function (err) {
                                errorEl.textContent = err.message;
                                errorEl.style.display = 'block';
                                button.disabled = false;
                                button.textContent = 'Create account and continue';
                              });
                          }

                          function onGoogleCredential(response) {
                            pendingGoogleToken = response.credential;
                            fetch('/api/auth/google-login', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ idToken: response.credential })
                            })
                              .then(function (res) {
                                return res.json()
                                  .catch(function () { return {}; })
                                  .then(function (data) {
                                    return { ok: res.ok, data: data };
                                  });
                              })
                              .then(function (result) {
                                if (result.ok) {
                                  window.location.href = result.data.redirectTo || FALLBACK_REDIRECT;
                                  return;
                                }
                                // The identity is fine, there is just no account yet - collect what
                                // SuperMeApp needs rather than dead-ending on an error message.
                                if (result.data.registrationRequired) {
                                  openRegistrationForm(result.data);
                                  return;
                                }
                                throw new Error(result.data.message || 'Google sign-in failed.');
                              })
                              .catch(function (err) {
                                showSignInError(err.message || 'Google sign-in failed. Please try again.');
                              });
                          }

                          function renderGoogleButton() {
                            var gBtnContainer = document.getElementById('google-signin-button');
                            if (!gBtnContainer || typeof google === 'undefined' || !google.accounts || !google.accounts.id) {
                              return;
                            }
                            var availableWidth = gBtnContainer.offsetWidth || 280;
                            // Google Identity button width bounds: min 200, max 400
                            var targetWidth = Math.min(Math.max(availableWidth, 200), 380);
                            gBtnContainer.innerHTML = '';
                            google.accounts.id.renderButton(
                              gBtnContainer,
                              { theme: 'outline', size: 'large', width: targetWidth, shape: 'rectangular' }
                            );
                          }

                          window.onload = function () {
                            var relSelect = document.getElementById('reg-relationship');
                            if (relSelect) {
                              relSelect.addEventListener('change', updateFamilyFields);
                            }
                            var regForm = document.getElementById('register-form');
                            if (regForm) {
                              regForm.addEventListener('submit', submitRegistration);
                            }
                            var regCancel = document.getElementById('register-cancel');
                            if (regCancel) {
                              regCancel.addEventListener('click', function (event) {
                                event.preventDefault();
                                document.getElementById('register-pane').style.display = 'none';
                                var authLayout = document.getElementById('auth-layout');
                                if (authLayout) { authLayout.style.display = ''; }
                                var signupRow = document.querySelector('.signup-row');
                                if (signupRow) { signupRow.style.display = ''; }
                              });
                            }

                            if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
                              google.accounts.id.initialize({
                                client_id: '%s',
                                callback: onGoogleCredential
                              });
                              renderGoogleButton();
                              window.addEventListener('resize', function () {
                                clearTimeout(window._gResizeTimer);
                                window._gResizeTimer = setTimeout(renderGoogleButton, 200);
                              });
                            }

                            var toggleBtn = document.getElementById('password-toggle');
                            if (toggleBtn) {
                              var eyeOpenSvg = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
                              var eyeOffSvg = '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3.6 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>';
                              toggleBtn.addEventListener('click', function () {
                                var password = document.getElementById('password');
                                var showing = password.type === 'password';
                                password.type = showing ? 'text' : 'password';
                                this.setAttribute('aria-label', showing ? 'Hide password' : 'Show password');
                                this.setAttribute('title', showing ? 'Hide password' : 'Show password');
                                this.innerHTML = showing ? eyeOffSvg : eyeOpenSvg;
                              });
                            }
                          };
                        </script>
                        </main>
                      </body>
                    </html>
                    """.formatted(
                    hasError ? "<div class=\"alert alert-danger\">Invalid email/phone or password.</div>" : "",
                    loggedOut ? "<div class=\"alert alert-success\">You have been signed out.</div>" : "",
                    captchaFailed ? "<div class=\"alert alert-danger\">Captcha verification failed - please try again.</div>" : "",
                    csrfToken.getParameterName(),
                    csrfToken.getToken(),
                    turnstileWidget,
                    forgotPasswordUrl,
                    continueWithEmailUrl,
                    frontendBaseUrl,
                    frontendBaseUrl,
                    googleClientId
            ));
        }
    }
}
