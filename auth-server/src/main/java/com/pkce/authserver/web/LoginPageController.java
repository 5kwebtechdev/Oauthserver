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

    private static final String PANDA_IMAGE_DATA = "data:image/webp;base64,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";

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

    @Value("${app.frontend.additional-client-id:}")
    private String additionalClientId;
    @Value("${app.frontend.additional-base-url:}")
    private String additionalBaseUrl;
    @Value("${app.frontend.additional-signup-url:}")
    private String additionalSignupUrl;
    @Value("${app.frontend.additional-forgot-password-url:}")
    private String additionalForgotUrl;
    @Value("${app.frontend.additional-continue-with-email-url:}")
    private String additionalEmailUrl;

    @GetMapping("/")
    public void home(jakarta.servlet.http.HttpServletResponse response) throws java.io.IOException {
        response.sendRedirect(frontendBaseUrl);
    }

    @GetMapping("/login")
    public void login(HttpServletRequest request, jakarta.servlet.http.HttpServletResponse response) throws Exception {
        // The saved authorization request determines the client; never accept a return URL
        // supplied directly to /login. Each link is a configured frontend URL.
        var session = request.getSession(false);
        var saved = session == null ? null : session.getAttribute("SPRING_SECURITY_SAVED_REQUEST");
        boolean additional = false;
        if (saved instanceof org.springframework.security.web.savedrequest.SavedRequest authorizationRequest) {
            String[] ids = authorizationRequest.getParameterValues("client_id");
            additional = !additionalClientId.isBlank() && ids != null && ids.length == 1
                    && additionalClientId.equals(ids[0]);
        }
        String pageBaseUrl = additional && !additionalBaseUrl.isBlank() ? additionalBaseUrl : frontendBaseUrl;
        String pageSignupUrl = additional && !additionalSignupUrl.isBlank() ? additionalSignupUrl : frontendBaseUrl;
        String pageForgotUrl = additional && !additionalForgotUrl.isBlank() ? additionalForgotUrl : forgotPasswordUrl;
        String pageEmailUrl = additional && !additionalEmailUrl.isBlank() ? additionalEmailUrl : continueWithEmailUrl;
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
                        <meta name="theme-color" content="#fbf9f6">
                        <meta name="mobile-web-app-capable" content="yes">
                        <meta name="apple-mobile-web-app-capable" content="yes">
                        <meta name="apple-mobile-web-app-status-bar-style" content="default">
                        <title>Sign in | SuperMeApp</title>
                        <style>
                          :root {
                            color-scheme: light;
                            --ink: #231e34;
                            --ink-subtle: #524d62;
                            --muted: #6e697e;
                            --violet: #583296;
                            --violet-deep: #2e1d4b;
                            --violet-focus: #885bc4;
                            --pink-accent: #e02e70;
                            --line: #e3dbe7;
                            --line-focus: #885bc4;
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
                              radial-gradient(ellipse at 12%% 18%%, #d4cde8 0, transparent 38rem),
                              radial-gradient(ellipse at 88%% 82%%, #f3bdcf 0, transparent 36rem),
                              radial-gradient(ellipse at 78%% 18%%, #dceced 0, transparent 34rem),
                              radial-gradient(ellipse at 18%% 82%%, #f5dfd1 0, transparent 34rem),
                              radial-gradient(ellipse at 45%% 5%%, #fae6dc 0, transparent 32rem),
                              radial-gradient(ellipse at 50%% 95%%, #dceced 0, transparent 34rem),
                              #e2e0d8;
                            -webkit-font-smoothing: antialiased;
                            -moz-osx-font-smoothing: grayscale;
                            overflow-x: hidden;
                          }
                          .auth-shell {
                            width: 100%%;
                            max-width: 23.75rem;
                            position: relative;
                            margin: auto 0;
                            padding: 0.5rem 0;
                          }
                          .auth-heading {
                            margin: 0 0 1.7rem;
                            text-align: center;
                          }
                          .auth-heading h1 {
                            margin: 0;
                            font-size: 0.875rem;
                            font-weight: 700;
                            letter-spacing: -0.015em;
                            color: #1f1933;
                            line-height: 1.25;
                          }
                          .auth-heading p {
                            margin: 0.4rem 0 0;
                            color: var(--muted);
                            font-size: 0.875rem;
                          }
                          .auth-layout {
                            display: grid;
                            grid-template-columns: minmax(0, 1fr);
                            position: relative;
                            align-items: center;
                            justify-content: center;
                            gap: 0;
                            width: 100%%;
                          }
                          .mascot-col {
                            position: absolute;
                            width: 10.9rem;
                            right: calc(100%% - 0.4rem);
                            top: 3.1rem;
                            z-index: 2;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                          }
                          .speech-bubble {
                            position: relative;
                            width: 100%%;
                            max-width: 14.2rem;
                            padding: 0.85rem 1rem;
                            border: 1px solid #eee8f3;
                            border-radius: 1.15rem;
                            background: #ffffff;
                            box-shadow: 0 0.7rem 1.8rem rgba(75, 50, 100, 0.08);
                            text-align: center;
                          }
                          .speech-bubble strong {
                            display: block;
                            color: var(--violet);
                            font-size: 1.02rem;
                            font-weight: 800;
                          }
                          .speech-bubble span {
                            display: block;
                            margin-top: 0.3rem;
                            color: var(--muted);
                            font-size: 0.65rem;
                            font-weight: 600;
                            line-height: 1.4;
                          }
                          .speech-tail {
                            position: absolute;
                            bottom: -7px;
                            right: 42px;
                            width: 14px;
                            height: 14px;
                            background: #ffffff;
                            border-right: 1px solid #eee8f3;
                            border-bottom: 1px solid #eee8f3;
                            transform: rotate(45deg);
                          }
                          .sparkle {
                            position: absolute;
                            pointer-events: none;
                          }
                          .star-gold {
                            bottom: -4px;
                            left: -6px;
                          }
                          .star-purple {
                            top: 50%%;
                            right: -7px;
                            transform: translateY(-50%%);
                          }
                          .panda-stage {
                            position: relative;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            width: 100%%;
                            margin-top: 0.75rem;
                          }
                          .panda-circle {
                            position: absolute;
                            width: 6rem;
                            height: 6rem;
                            border-radius: 50%%;
                            background: #f8eee4;
                            z-index: 0;
                          }
                          .panda-img {
                            position: relative;
                            z-index: 1;
                            width: 6.5rem;
                            height: auto;
                            display: block;
                            filter: drop-shadow(0 0.6rem 0.7rem rgba(60, 40, 70, 0.12));
                            user-select: none;
                          }
                          .pink-arrow {
                            position: absolute;
                            right: -1.25rem;
                            top: 52%%;
                            transform: translateY(-50%%);
                            z-index: 2;
                            display: grid;
                            place-items: center;
                            width: 1.85rem;
                            height: 1.85rem;
                            border-radius: 50%%;
                            background: transparent;
                            color: #eb5280;
                            filter: drop-shadow(0 2px 2px rgba(224, 46, 112, 0.2));
                          }
                          .auth-card {
                            width: 100%%;
                            padding: 1.1rem 0.8rem 1.2rem;
                            border: 1px solid var(--line);
                            border-radius: 1.25rem;
                            background: var(--card-bg);
                            box-shadow:
                              0 1rem 2.8rem rgba(55, 35, 80, 0.1),
                              0 0.15rem 0.5rem rgba(55, 35, 80, 0.04);
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
                            margin: 0 0 0.65rem;
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
                            padding: 0.75rem 1rem;
                            border: 1px solid #eeecef;
                            border-radius: 0.75rem;
                            background: #ffffff;
                            color: var(--ink);
                            font: inherit;
                            font-size: 16px; /* 16px prevents mobile/Android Chrome auto-zoom on focus */
                            box-shadow: 0 0 0 1px rgba(52, 32, 78, 0.035), inset 0 1px 3px rgba(52, 32, 78, 0.025);
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
                            color: #9a94a5;
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
                            background: #f6f0fb;
                            color: var(--violet);
                            outline: none;
                          }
                          .forgot-row {
                            margin: -0.25rem 0 1.65rem;
                            text-align: right;
                            font-size: 0.65rem;
                          }
                          .forgot-link {
                            color: #553389;
                            font-weight: 550;
                            text-decoration: underline;
                            transition: color 0.15s ease;
                          }
                          .forgot-link:hover, .forgot-link:focus-visible {
                            color: var(--violet-deep);
                            text-decoration: underline;
                          }
                          .btn {
                            display: inline-flex;
                            justify-content: center;
                            align-items: center;
                            width: 100%%;
                            min-height: 2.8rem;
                            padding: 0.65rem 1.25rem;
                            border: 0;
                            border-radius: 0.8rem;
                            font: inherit;
                            font-size: 0.875rem;
                            font-weight: 700;
                            cursor: pointer;
                            touch-action: manipulation;
                            -webkit-tap-highlight-color: transparent;
                            transition: transform 0.12s ease, filter 0.18s ease, box-shadow 0.18s ease;
                            text-decoration: none;
                          }
                          .btn-primary {
                            color: #ffffff;
                            background: linear-gradient(135deg, #623696 0%%, #301f4c 100%%);
                            border: 1px solid #714aa4;
                            box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.35);
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
                            gap: 0.85rem;
                            margin: 1.6rem 2.1rem 0.85rem;
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
                            min-height: 2.4rem;
                            width: 100%%;
                            overflow: hidden;
                          }
                          .signup-row {
                            margin: 1.5rem 0 0;
                            text-align: center;
                            color: var(--ink-subtle);
                            font-size: 0.8rem;
                          }
                          .signup-link {
                            color: #553389;
                            font-weight: 650;
                            text-decoration: underline;
                            transition: color 0.15s ease;
                          }
                          .signup-link:hover {
                            color: var(--violet-deep);
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
                          @media (min-width: 701px) {
                            #signin-pane { padding: 1.6rem 1.1rem; }
                          }
                          @media (min-width: 701px) and (min-height: 601px) {
                            .auth-shell { top: -1.3rem; }
                          }
                          @media (max-width: 700px) {
                            .auth-shell { max-width: 22rem; }
                            .auth-heading { margin-bottom: 1.25rem; }
                            .auth-layout { display: flex; flex-direction: column; gap: 1rem; }
                            .mascot-col {
                              position: relative;
                              inset: auto;
                              width: 100%%;
                              flex-direction: row;
                              gap: 1rem;
                            }
                            .speech-bubble { order: 2; max-width: 11rem; }
                            .speech-tail {
                              left: -7px;
                              top: 50%%;
                              bottom: auto;
                              right: auto;
                              transform: translateY(-50%%) rotate(135deg);
                            }
                            .panda-stage { order: 1; width: 5rem; margin-top: 0; }
                            .panda-img { width: 4.4rem; }
                            .panda-circle { width: 4.8rem; height: 4.8rem; }
                            .pink-arrow { display: none; }
                            .auth-card { padding: 1.1rem 0.8rem 1.2rem; }
                            .forgot-row { font-size: 0.75rem; }
                            .forgot-link { display: inline-block; padding: 0.4rem 0; }
                            .signup-row { line-height: 1.6; }
                          }
                          @media (max-height: 600px) and (min-width: 701px) {
                            body { padding-top: 1.5rem; padding-bottom: 1.5rem; }
                          }
                          @media (prefers-reduced-motion: reduce) {
                            *, *::before, *::after { transition: none !important; }
                          }
                        </style>
                        <script src="https://accounts.google.com/gsi/client" async defer></script>
                        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
                      </head>
                      <body>
                        <main class="auth-shell">
                          <header class="auth-heading">
                            <h1>Welcome to SuperMeApp!</h1>
                            <p>Let's unlock today's achievements.</p>
                          </header>
                          <div class="auth-layout" id="auth-layout">
                            <aside class="mascot-col" aria-label="Welcome">
                              <div class="speech-bubble">
                                <svg class="sparkle star-gold" viewBox="0 0 24 24" width="13" height="13" fill="#f59e0b" aria-hidden="true">
                                  <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/>
                                </svg>
                                <strong>Hi, SuperStar!</strong>
                                <span>Log in to continue your SuperMe adventure.</span>
                                <svg class="sparkle star-purple" viewBox="0 0 24 24" width="12" height="12" fill="#8b5cf6" aria-hidden="true">
                                  <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"/>
                                </svg>
                                <div class="speech-tail"></div>
                              </div>
                              <div class="panda-stage">
                                <div class="panda-circle"></div>
                                <img src="%s" alt="SuperMe Panda Mascot" class="panda-img">
                                <div class="pink-arrow" aria-hidden="true">
                                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                    <polyline points="12 5 19 12 12 19"></polyline>
                                  </svg>
                                </div>
                              </div>
                            </aside>
                            <div class="auth-card" id="signin-pane">
                              <form class="form-signin" method="post" action="/login">
                            %s
                            %s
                            %s
                            <div class="field">
                              <label for="username" class="sr-only">Email or phone</label>
                              <input type="text" id="username" name="username" class="form-control" placeholder="Enter Email Address" aria-label="Email or phone" data-test="placeholder=&quot;Email or phone&quot;" required autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" inputmode="email">
                              <!-- placeholder="Email or phone" -->
                            </div>
                            <div class="field">
                              <label for="password" class="sr-only">Password</label>
                              <div class="password-wrap">
                                <input type="password" id="password" name="password" class="form-control" placeholder="Enter Your Password" required autocomplete="current-password" autocapitalize="none" autocorrect="off">
                                <button class="password-toggle" type="button" id="password-toggle" aria-label="Show password" title="Show password">
                                  <svg id="eye-icon" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                                </button>
                              </div>
                            </div>
                            <input name="%s" type="hidden" value="%s" />
                            %s
                            <p class="forgot-row">
                              <a href="%s" class="forgot-link">Forgot password?</a>
                            </p>
                            <button class="btn btn-primary" type="submit">Login</button>
                            <a href="%s" style="display:none;" tabindex="-1" aria-hidden="true">Continue with email</a>
                          </form>
                          <div class="divider">OR</div>
                          <div id="google-signin-button"></div>
                          <p id="google-signin-error" class="alert alert-danger" style="display:none; margin-top:0.75rem;"></p>
                            </div>
                          </div>
                          <p class="signup-row">Don't have an account? <a href="%s" class="signup-link">Sign up</a></p>

                        <script>
                          var FALLBACK_REDIRECT = '%s';
                          function showSignInError(message) {
                            var el = document.getElementById('google-signin-error');
                            el.textContent = message;
                            el.style.display = 'block';
                          }

                          function redirectToFrontendSignup(handoffTicket) {
                            // Registration belongs to the configured FE wizard. Use its
                            // server-configured link, never a URL supplied by the identity provider.
                            var signupLink = document.querySelector('.signup-link');
                            if (!signupLink || !signupLink.href) {
                              showSignInError('Please use the sign-up page to create your account.');
                              return;
                            }
                            var signupUrl = new URL(signupLink.href, window.location.href);
                            // The user must select Self, Child, or Parent first. The
                            // frontend exchanges the one-time ticket and prefills the
                            // selected role's profile form after that choice.
                            signupUrl.searchParams.set('step', '1');
                            signupUrl.searchParams.set('googleSignupTicket', handoffTicket);
                            window.location.assign(signupUrl.toString());
                          }

                          function onGoogleCredential(response) {
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
                                // The identity is valid, but new account creation belongs to the
                                // FE's full signup flow rather than an abbreviated form on /login.
                                if (result.data.registrationRequired) {
                                  if (!result.data.handoffTicket) {
                                    throw new Error('Google signup could not be started. Please try again.');
                                  }
                                  redirectToFrontendSignup(result.data.handoffTicket);
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
                            // Reserve space for the Google iframe's horizontal margins.
                            var targetWidth = Math.min(Math.max(availableWidth - 20, 200), 380);
                            gBtnContainer.innerHTML = '';
                            google.accounts.id.renderButton(
                              gBtnContainer,
                              { theme: 'outline', size: 'large', type: 'standard', text: 'continue_with', shape: 'rectangular', width: targetWidth }
                            );
                          }

                          window.onload = function () {
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
                                this.setAttribute('aria-pressed', String(showing));
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
                    PANDA_IMAGE_DATA,
                    hasError ? "<div class=\"alert alert-danger\">Invalid email or password.</div>" : "",
                    loggedOut ? "<div class=\"alert alert-success\">You have been signed out.</div>" : "",
                    captchaFailed ? "<div class=\"alert alert-danger\">Captcha verification failed - please try again.</div>" : "",
                    csrfToken.getParameterName(),
                    csrfToken.getToken(),
                    turnstileWidget,
                    pageForgotUrl,
                    pageEmailUrl,
                    pageSignupUrl,
                    pageBaseUrl,
                    googleClientId
            ));
        }
    }
}
