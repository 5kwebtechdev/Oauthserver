import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminUsersResponse, AdminUsersService } from '../../core/admin-users.service';
import { AuthService } from '../../core/auth.service';
import { MeResponse, NotesService } from '../../core/notes.service';
import { SecurityEvent, SecurityEventsService } from '../../core/security-events.service';
import { TokenResponse, TokenTestService } from '../../core/token-test.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="page">
      <h1>Dashboard</h1>

      <p *ngIf="loading">Loading your profile from the resource server...</p>

      <div *ngIf="me" class="success">
        Login successful - welcome, <strong>{{ me.sub }}</strong>!
      </div>
      <p *ngIf="error" class="error">{{ error }}</p>

      <dl *ngIf="me">
        <dt>Subject</dt><dd>{{ me.sub }}</dd>
        <dt>Roles</dt><dd>{{ me.roles.join(', ') }}</dd>
        <dt>Scopes</dt><dd>{{ me.scope }}</dd>
        <dt>Token expires</dt><dd>{{ me.expiresAt }}</dd>
      </dl>
      <nav>
        <a routerLink="/notes">Notes</a>
        <button type="button" (click)="auth.logout()">Log out</button>
      </nav>

      <section class="test-section">
        <h2>Test: refresh an access token</h2>
        <p class="hint">
          Paste any refresh_token issued by this auth-server and call
          <code>POST /oauth2/token</code> (grant_type=refresh_token) - a raw test of the endpoint,
          separate from the app's own automatic renewal. Refreshing <em>your own</em> token goes
          through the OIDC library so the rotated id_token is stored too, which is what keeps
          logout working afterwards.
        </p>
        <textarea
          [(ngModel)]="refreshTokenInput"
          name="refreshTokenInput"
          rows="3"
          placeholder="Paste a refresh_token here"
        ></textarea>
        <div class="test-actions">
          <button type="button" (click)="useMyRefreshToken()" [disabled]="!auth.refreshToken">
            Use my current refresh token
          </button>
          <button type="button" (click)="callRefresh()" [disabled]="!refreshTokenInput || refreshing">
            {{ refreshing ? 'Calling /oauth2/token...' : 'Refresh access token' }}
          </button>
        </div>

        <p *ngIf="refreshError" class="error">{{ refreshError }}</p>

        <div *ngIf="refreshResult" class="result">
          <div class="result-row"><strong>New access_token:</strong> <code class="truncate">{{ refreshResult.access_token }}</code></div>
          <div class="result-row" *ngIf="refreshResult.refresh_token">
            <strong>New refresh_token (rotated):</strong> <code class="truncate">{{ refreshResult.refresh_token }}</code>
          </div>
          <div class="result-row"><strong>Expires in:</strong> {{ refreshResult.expires_in }}s</div>
          <div class="result-row"><strong>Scope:</strong> {{ refreshResult.scope }}</div>
          <details>
            <summary>Full raw response</summary>
            <pre>{{ refreshResult | json }}</pre>
          </details>
        </div>
      </section>

      <section *ngIf="isAdmin" class="admin-section">
        <h2>Registered users (admin)</h2>
        <p *ngIf="usersLoading">Loading users...</p>
        <p *ngIf="usersError" class="error">{{ usersError }}</p>

        <div *ngIf="usersData" class="summary">
          <span><strong>{{ usersData.total }}</strong> total</span>
          <span>page <strong>{{ usersData.page + 1 }}</strong> of {{ usersData.totalPages }}</span>
          <span><strong>{{ usersData.users.length }}</strong> shown</span>
        </div>

        <table *ngIf="usersData">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Provider</th>
              <th>Onboarding</th>
              <th>Status</th>
              <th>Created</th>
              <th>Last login</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of usersData.users">
              <td>{{ user.name }}</td>
              <td>{{ user.username || '-' }}</td>
              <td>{{ user.email || '-' }}</td>
              <td>{{ user.phone || '-' }}</td>
              <td>{{ user.role }}</td>
              <td>
                <span class="badge" [class.badge-google]="user.authProvider === 'GOOGLE'">{{ user.authProvider }}</span>
              </td>
              <td>{{ user.onboardingStep ?? '-' }}</td>
              <td>{{ user.deleted ? 'deleted' : user.enabled ? 'active' : 'disabled' }}</td>
              <td>{{ user.createdDateTime || '-' }}</td>
              <td>{{ user.lastLoginDate || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section *ngIf="isAdmin" class="admin-section">
        <h2>Security events (admin)</h2>
        <p class="hint">
          Failed logins, account lockouts, OTP verify failures, rate-limit trips, and
          captcha failures - most recent 200.
        </p>
        <p *ngIf="eventsLoading">Loading events...</p>
        <p *ngIf="eventsError" class="error">{{ eventsError }}</p>

        <table *ngIf="securityEvents">
          <thead>
            <tr>
              <th>Time</th>
              <th>Type</th>
              <th>Identifier</th>
              <th>IP</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let event of securityEvents">
              <td>{{ event.createdAt }}</td>
              <td>
                <span class="badge" [class.badge-google]="event.eventType === 'ACCOUNT_LOCKED'">{{ event.eventType }}</span>
              </td>
              <td>{{ event.identifier || '-' }}</td>
              <td>{{ event.ipAddress || '-' }}</td>
              <td>{{ event.details || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  `,
  styles: [`
    .page { max-width: 760px; margin: 2rem auto; font-family: sans-serif; }
    .success { background: #e6f4ea; color: #1e7e34; border: 1px solid #b7dfc3; border-radius: 4px; padding: 0.75rem 1rem; margin: 1rem 0; }
    .error { color: #b00020; }
    nav { display: flex; gap: 1rem; margin-top: 1.5rem; }
    dt { font-weight: bold; }
    .admin-section, .test-section { margin-top: 2.5rem; border-top: 1px solid #ddd; padding-top: 1.5rem; }
    .summary { display: flex; gap: 1.5rem; margin: 0.75rem 0 1rem; color: #333; }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    th, td { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid #eee; }
    .badge { background: #e0e0e0; border-radius: 3px; padding: 0.1rem 0.5rem; font-size: 0.8rem; }
    .badge-google { background: #fce8e6; color: #c5221f; }
    .hint { font-size: 0.85rem; color: #555; }
    textarea { width: 100%; box-sizing: border-box; font-family: monospace; font-size: 0.8rem; padding: 0.5rem; }
    .test-actions { display: flex; gap: 0.75rem; margin: 0.75rem 0; }
    .result { background: #f5f5f5; border-radius: 4px; padding: 0.75rem 1rem; margin-top: 1rem; }
    .result-row { margin-bottom: 0.4rem; font-size: 0.9rem; }
    .truncate { word-break: break-all; }
    pre { white-space: pre-wrap; word-break: break-all; font-size: 0.8rem; }
  `],
})
export class DashboardComponent implements OnInit {
  me: MeResponse | null = null;
  error: string | null = null;
  loading = true;

  isAdmin = false;
  usersData: AdminUsersResponse | null = null;
  usersLoading = false;
  usersError: string | null = null;

  securityEvents: SecurityEvent[] | null = null;
  eventsLoading = false;
  eventsError: string | null = null;

  refreshTokenInput = '';
  refreshing = false;
  refreshResult: TokenResponse | null = null;
  refreshError: string | null = null;

  constructor(
    public readonly auth: AuthService,
    private readonly notes: NotesService,
    private readonly adminUsers: AdminUsersService,
    private readonly securityEventsService: SecurityEventsService,
    private readonly tokenTest: TokenTestService
  ) {}

  ngOnInit(): void {
    this.notes.me().subscribe({
      next: (me) => {
        this.me = me;
        this.loading = false;
        this.isAdmin = me.roles.includes('ROLE_ADMIN');
        if (this.isAdmin) {
          this.loadUsers();
          this.loadSecurityEvents();
        }
      },
      error: () => {
        this.error = 'Could not load your profile from the resource server.';
        this.loading = false;
      },
    });
  }

  useMyRefreshToken(): void {
    this.refreshTokenInput = this.auth.refreshToken ?? '';
  }

  /**
   * Refreshing THIS session's token goes through the library rather than the raw POST, because the
   * grant rotates the ID token server-side as well. A raw call leaves the library holding the
   * superseded ID token, and logout then sends it as id_token_hint - the authorization server looks
   * the authorization up by that exact value, finds nothing, and renders an error page instead of
   * signing the user out. (That was a real bug: logout worked before a refresh and failed after.)
   *
   * Pasting someone else's refresh token still uses the raw call: it rotates a different
   * authorization, so this session's ID token is unaffected and there is nothing to keep in sync.
   */
  callRefresh(): void {
    this.refreshError = null;
    this.refreshResult = null;
    this.refreshing = true;

    const token = this.refreshTokenInput.trim();
    if (token === this.auth.refreshToken) {
      this.auth
        .refreshWithStoredToken()
        .then((result) => {
          this.refreshResult = result as unknown as TokenResponse;
          this.refreshing = false;
        })
        .catch((err) => {
          this.refreshError = this.refreshFailureMessage(err);
          this.refreshing = false;
        });
      return;
    }

    this.tokenTest.refreshAccessToken(token).subscribe({
      next: (result) => {
        this.refreshResult = result;
        this.refreshing = false;
      },
      error: (err) => {
        this.refreshError = this.refreshFailureMessage(err);
        this.refreshing = false;
      },
    });
  }

  private refreshFailureMessage(err: unknown): string {
    const body = (err as { error?: { error_description?: string; error?: string } })?.error;
    return body?.error_description || body?.error
      || 'Refresh failed - the token may be invalid, expired, or already used.';
  }

  private loadUsers(): void {
    this.usersLoading = true;
    this.adminUsers.listUsers().subscribe({
      next: (data) => {
        this.usersData = data;
        this.usersLoading = false;
      },
      error: () => {
        this.usersError = 'Could not load the user list.';
        this.usersLoading = false;
      },
    });
  }

  private loadSecurityEvents(): void {
    this.eventsLoading = true;
    this.securityEventsService.listRecent().subscribe({
      next: (events) => {
        this.securityEvents = events;
        this.eventsLoading = false;
      },
      error: () => {
        this.eventsError = 'Could not load security events.';
        this.eventsLoading = false;
      },
    });
  }
}
