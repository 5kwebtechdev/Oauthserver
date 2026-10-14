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
                : "<div class=\"cf-turnstile\" data-sitekey=\"" + turnstileSiteKey + "\" style=\"margin:1rem 0;\"></div>";

        response.setContentType("text/html;charset=UTF-8");
        try (PrintWriter writer = response.getWriter()) {
            writer.write("""
                    <!doctype html>
                    <html lang="en">
                      <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <meta name="theme-color" content="#f7f2ff">
                        <title>Sign in | SuperMeApp</title>
                        <style>
                          :root {
                            color-scheme: light;
                            --ink: #24203a;
                            --muted: #777286;
                            --violet: #6840a2;
                            --violet-deep: #34204e;
                            --line: #e8e3ec;
                          }
                          * { box-sizing: border-box; }
                          body {
                            min-height: 100vh;
                            margin: 0;
                            display: grid;
                            place-items: center;
                            padding: 3rem 1.25rem;
                            color: var(--ink);
                            font-family: Inter, "Segoe UI", sans-serif;
                            background:
                              radial-gradient(ellipse at 12% 18%, #e8dafa 0, transparent 34rem),
                              radial-gradient(ellipse at 88% 82%, #f5c9dc 0, transparent 32rem),
                              radial-gradient(ellipse at 72% 15%, #d7eee8 0, transparent 30rem),
                              #f8f4ef;
                          }
                          .auth-shell { width: min(100vw - 2.5rem, 48rem); margin: auto; }
                          .auth-heading { margin: 0 0 1.65rem; text-align: center; }
                          .auth-heading h1 { margin: 0; font-size: 1.45rem; font-weight: 750; letter-spacing: 0; }
                          .auth-heading p { margin: .45rem 0 0; color: var(--muted); font-size: .95rem; }
                          .auth-layout { display: grid; grid-template-columns: minmax(10rem, 1fr) minmax(19rem, 21rem); align-items: center; gap: 1.4rem; }
                          .mascot-side { position: relative; display: grid; justify-items: center; align-content: center; min-height: 17rem; }
                          .mascot-note { z-index: 1; max-width: 13.5rem; padding: 1rem 1.2rem; border: 1px solid #e9e1f0; border-radius: 1rem; background: #fff; box-shadow: 0 .8rem 2rem #49316018; text-align: center; }
                          .mascot-note strong { display: block; color: var(--violet); font-size: 1.05rem; }
                          .mascot-note span { display: block; margin-top: .35rem; color: var(--muted); font-size: .85rem; line-height: 1.45; }
                          .mascot { position: relative; display: grid; place-items: center; width: 8.4rem; height: 8.4rem; margin-top: .2rem; border-radius: 50%; background: radial-gradient(circle at 35% 28%, #fff 0, #f6e9da 52%, #efd5ca 100%); font-size: 5.2rem; filter: drop-shadow(0 .8rem .7rem #3a254022); }
                          .auth-card { width: 100%; padding: 1.25rem; border: 1px solid #e5dfe8; border-radius: 1.25rem; background: #fff; box-shadow: 0 1.2rem 3.5rem #34204e20, 0 .15rem .6rem #34204e0c; }
                          .form-signin { margin: 0; }
                          .form-signin-heading { margin: 0 0 1rem; font-size: 1.15rem; font-weight: 700; }
                          .field { margin: 0 0 .75rem; }
                          .field label, .form-signin > p > label:not(.sr-only) { display: block; margin: 0 0 .35rem; color: #514b60; font-size: .82rem; font-weight: 650; }
                          .form-control { display: block; width: 100%%; min-height: 3rem; padding: .75rem .9rem; border: 1px solid var(--line); border-radius: .7rem; background: #fff; color: var(--ink); font: inherit; font-size: .95rem; box-shadow: 0 .1rem .25rem #34204e08; }
                          .form-control:focus { outline: 3px solid #6840a226; border-color: #8d69b6; }
                          .password-wrap { position: relative; }
                          .password-wrap .form-control { padding-right: 3.4rem; }
                          .password-toggle { position: absolute; top: .25rem; right: .3rem; display: grid; place-items: center; width: 2.5rem; height: 2.5rem; border: 0; border-radius: .5rem; background: transparent; color: #6b6575; cursor: pointer; }
                          .password-toggle:hover { background: #f4eff8; }
                          .forgot-row { margin: -.15rem 0 1rem; text-align: right; font-size: .8rem; }
                          a { color: #63409b; font-weight: 600; }
                          a:hover { color: #392456; }
                          .btn { display: block; width: 100%%; min-height: 2.9rem; padding: .7rem 1rem; border: 0; border-radius: .7rem; font: inherit; font-weight: 700; cursor: pointer; }
                          .btn-primary { color: #fff; background: linear-gradient(105deg, #7543a8, #33204d); box-shadow: 0 .35rem .85rem #51327035; }
                          .btn-primary:hover { filter: brightness(1.08); }
                          .divider { display: flex; align-items: center; gap: .8rem; margin: 1.25rem 0; color: var(--muted); font-size: .8rem; }
                          .divider::before, .divider::after { height: 1px; flex: 1; background: var(--line); content: ""; }
                          #google-signin-button { display: flex; justify-content: center; min-height: 2.5rem; }
                          .continue-row { margin: 1rem 0 0; text-align: center; font-size: .88rem; }
                          .signup-row { margin: 1.5rem 0 0; text-align: center; color: #514b60; font-size: .88rem; }
                          .alert { margin: 0 0 .8rem; padding: .7rem .8rem; border-radius: .6rem; font-size: .85rem; }
                          .alert-danger { color: #8b2635; background: #fff0f1; }
                          .alert-success { color: #276448; background: #eaf7f0; }
                          .text-muted { color: var(--muted); }
                          .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
                          #register-pane { width: min(100vw - 2.5rem, 27rem); margin: auto; }
                          #register-pane .form-signin > p { margin: .85rem 0; }
                          #register-pane .form-signin > p > label { display: block; margin-bottom: .35rem; font-size: .85rem; font-weight: 650; }
                          @media (max-width: 640px) {
                            body { padding: 2rem 1rem; }
                            .auth-shell { width: min(100vw - 2rem, 25rem); }
                            .auth-heading { margin-bottom: 1.2rem; }
                            .auth-layout { display: block; }
                            .mascot-side { display: none; }
                            .auth-card { padding: 1.15rem; }
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
                          <div class="auth-layout">
                            <aside class="mascot-side" aria-label="Welcome">
                              <div class="mascot-note">
                                <strong>Hi, SuperStar!</strong>
                                <span>Log in to continue your SuperMe adventure.</span>
                              </div>
                              <div class="mascot" aria-hidden="true">🐼</div>
                            </aside>
                            <div class="auth-card" id="signin-pane">
                              <form class="form-signin" method="post" action="/login">
                            %s
                            %s
                            %s
                            <div class="field">
                              <label for="username" class="sr-only">Email or phone</label>
                              <input type="text" id="username" name="username" class="form-control" placeholder="Email or phone" required autofocus>
                            </div>
                            <div class="field">
                              <label for="password" class="sr-only">Password</label>
                              <div class="password-wrap">
                                <input type="password" id="password" name="password" class="form-control" placeholder="Password" required>
                                <button class="password-toggle" type="button" id="password-toggle" aria-label="Show password" title="Show password">
                                  <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
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
                          <p id="google-signin-error" style="color:#b00020; display:none;"></p>
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
                            <p class="text-muted" style="font-size:0.9rem;">
                              Signed in with Google as <strong id="register-email-label"></strong>.
                              We just need a few details SuperMeApp requires.
                            </p>
                            <p id="register-error" class="alert alert-danger" style="display:none;"></p>

                            <p>
                              <label for="reg-name">Full name</label>
                              <input type="text" id="reg-name" class="form-control" required>
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
                              <input type="text" id="reg-family-code" class="form-control" maxlength="8" placeholder="8 characters">
                              <small class="text-muted" id="reg-family-code-hint"></small>
                            </p>
                            <p>
                              <label for="reg-pet">Pet name <span class="text-muted">(optional)</span></label>
                              <input type="text" id="reg-pet" class="form-control">
                            </p>
                            <p>
                              <label for="reg-referral">Referral code <span class="text-muted">(optional)</span></label>
                              <input type="text" id="reg-referral" class="form-control">
                            </p>

                            <button class="btn btn-lg btn-primary btn-block" type="submit" id="reg-submit">
                              Create account and continue
                            </button>
                            <p style="text-align:center; margin-top:1rem;">
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
                            document.getElementById('auth-layout').style.display = 'none';
                            document.querySelector('.signup-row').style.display = 'none';
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
                            var raw = document.getElementById(id).value;
                            raw = raw ? raw.trim() : '';
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
                          window.onload = function () {
                            document.getElementById('reg-relationship').addEventListener('change', updateFamilyFields);
                            document.getElementById('register-form').addEventListener('submit', submitRegistration);
                            document.getElementById('register-cancel').addEventListener('click', function (event) {
                              event.preventDefault();
                              document.getElementById('register-pane').style.display = 'none';
                              document.getElementById('auth-layout').style.display = 'grid';
                              document.querySelector('.signup-row').style.display = 'block';
                            });

                            google.accounts.id.initialize({
                              client_id: '%s',
                              callback: onGoogleCredential
                            });
                            google.accounts.id.renderButton(
                              document.getElementById('google-signin-button'),
                              { theme: 'outline', size: 'large', width: 280 }
                            );
                            document.getElementById('password-toggle').addEventListener('click', function () {
                              var password = document.getElementById('password');
                              var showing = password.type === 'password';
                              password.type = showing ? 'text' : 'password';
                              this.setAttribute('aria-label', showing ? 'Hide password' : 'Show password');
                              this.setAttribute('title', showing ? 'Hide password' : 'Show password');
                            });
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
