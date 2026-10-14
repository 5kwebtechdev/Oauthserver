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
                        <title>Please sign in</title>
                        <link href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-beta/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-/Y6pD6FV/Vv2HJnA6t+vslU6fwYXjCFtcEpHbNJ0lyAFsXTsjBbfaDjzALeQsN6M" crossorigin="anonymous">
                        <link href="https://getbootstrap.com/docs/4.0/examples/signin/signin.css" rel="stylesheet" integrity="sha384-oOE/3m0LUMPub4kaC09mrdEhIc+e3exm4xOGxAmuFXhBNF4hcg/6MiAXAf5p0P56" crossorigin="anonymous"/>
                        <script src="https://accounts.google.com/gsi/client" async defer></script>
                        <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
                      </head>
                      <body>
                        <div class="container" id="signin-pane">
                          <form class="form-signin" method="post" action="/login">
                            <h2 class="form-signin-heading">Please sign in</h2>
                            %s
                            %s
                            %s
                            <p>
                              <label for="username" class="sr-only">Email or phone</label>
                              <input type="text" id="username" name="username" class="form-control" placeholder="Email or phone" required autofocus>
                            </p>
                            <p>
                              <label for="password" class="sr-only">Password</label>
                              <input type="password" id="password" name="password" class="form-control" placeholder="Password" required>
                            </p>
                            <input name="%s" type="hidden" value="%s" />
                            %s
                            <button class="btn btn-lg btn-primary btn-block" type="submit">Sign in</button>
                            <p style="margin-top: 1rem;">
                              <a href="%s">Forgot password?</a>
                            </p>
                          </form>
                          <div style="text-align:center; margin: 1rem 0; color:#888;">or</div>
                          <div id="google-signin-button" style="display:flex; justify-content:center;"></div>
                          <p id="google-signin-error" style="color:#b00020; display:none;"></p>
                          <p style="text-align:center; margin-top: 1rem;">
                            <a href="%s">Continue with email</a>
                          </p>
                        </div>

                        <!-- Shown only when Google sign-in reports registrationRequired: the identity
                             is verified, there is just no SuperMeApp account behind it yet. The
                             fields are the ones SuperMeBE's User table demands and a Google token
                             cannot supply. -->
                        <div class="container" id="register-pane" style="display:none; max-width:420px;">
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
                            document.getElementById('signin-pane').style.display = 'none';
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
                              document.getElementById('signin-pane').style.display = 'block';
                            });

                            google.accounts.id.initialize({
                              client_id: '%s',
                              callback: onGoogleCredential
                            });
                            google.accounts.id.renderButton(
                              document.getElementById('google-signin-button'),
                              { theme: 'outline', size: 'large', width: 280 }
                            );
                          };
                        </script>
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
                    googleClientId
            ));
        }
    }
}
