import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GoogleAuthService } from '../../services/google-auth.service';

@Component({
  selector: 'social-media',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="social-media">
      <button class="btn" type="button" (click)="onGoogleClick()" [disabled]="googleAuth.isLoading" [title]="googleAuth.isLoading ? 'Signing in…' : 'Sign in with Google'">
        <span *ngIf="googleAuth.isLoading" class="spinner"></span>
        <svg *ngIf="!googleAuth.isLoading" xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48" fill="none">
          <mask id="mask0_9034_60314" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="4" y="4" width="39" height="40">
            <path d="M41.8917 20.5089H24.0008V27.9271H34.299C33.339 32.6398 29.3244 35.3453 24.0008 35.3453C17.7171 35.3453 12.6553 30.2834 12.6553 23.9998C12.6553 17.7162 17.7171 12.6544 24.0008 12.6544C26.7062 12.6544 29.1499 13.6144 31.0699 15.1853L36.6553 9.5998C33.2517 6.63253 28.8881 4.7998 24.0008 4.7998C13.3535 4.7998 4.80078 13.3525 4.80078 23.9998C4.80078 34.6471 13.3535 43.1998 24.0008 43.1998C33.6008 43.1998 42.3281 36.218 42.3281 23.9998C42.3281 22.8653 42.1535 21.6434 41.8917 20.5089Z" fill="white"/>
          </mask>
          <g mask="url(#mask0_9034_60314)">
            <path d="M3.05859 35.3452V12.6543L17.895 23.9998L3.05859 35.3452Z" fill="#FBBC05"/>
          </g>
          <mask id="mask1_9034_60314" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="4" y="4" width="39" height="40">
            <path d="M41.8917 20.5089H24.0008V27.9271H34.299C33.339 32.6398 29.3244 35.3453 24.0008 35.3453C17.7171 35.3453 12.6553 30.2834 12.6553 23.9998C12.6553 17.7162 17.7171 12.6544 24.0008 12.6544C26.7062 12.6544 29.1499 13.6144 31.0699 15.1853L36.6553 9.5998C33.2517 6.63253 28.8881 4.7998 24.0008 4.7998C13.3535 4.7998 4.80078 13.3525 4.80078 23.9998C4.80078 34.6471 13.3535 43.1998 24.0008 43.1998C33.6008 43.1998 42.3281 36.218 42.3281 23.9998C42.3281 22.8653 42.1535 21.6434 41.8917 20.5089Z" fill="white"/>
          </mask>
          <g mask="url(#mask1_9034_60314)">
            <path d="M3.05859 12.6547L17.895 24.0001L24.004 18.6765L44.9495 15.2729V3.05469H3.05859V12.6547Z" fill="#EA4335"/>
          </g>
          <mask id="mask2_9034_60314" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="4" y="4" width="39" height="40">
            <path d="M41.8917 20.5089H24.0008V27.9271H34.299C33.339 32.6398 29.3244 35.3453 24.0008 35.3453C17.7171 35.3453 12.6553 30.2834 12.6553 23.9998C12.6553 17.7162 17.7171 12.6544 24.0008 12.6544C26.7062 12.6544 29.1499 13.6144 31.0699 15.1853L36.6553 9.5998C33.2517 6.63253 28.8881 4.7998 24.0008 4.7998C13.3535 4.7998 4.80078 13.3525 4.80078 23.9998C4.80078 34.6471 13.3535 43.1998 24.0008 43.1998C33.6008 43.1998 42.3281 36.218 42.3281 23.9998C42.3281 22.8653 42.1535 21.6434 41.8917 20.5089Z" fill="white"/>
          </mask>
          <g mask="url(#mask2_9034_60314)">
            <path d="M3.05859 35.3456L29.2404 15.2729L36.135 16.1456L44.9478 3.05469V44.9456H3.05859V35.3456Z" fill="#34A853"/>
          </g>
          <mask id="mask3_9034_60314" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="4" y="4" width="39" height="40">
            <path d="M41.8917 20.5089H24.0008V27.9271H34.299C33.339 32.6398 29.3244 35.3453 24.0008 35.3453C17.7171 35.3453 12.6553 30.2834 12.6553 23.9998C12.6553 17.7162 17.7171 12.6544 24.0008 12.6544C26.7062 12.6544 29.1499 13.6144 31.0699 15.1853L36.6553 9.5998C33.2517 6.63253 28.8881 4.7998 24.0008 4.7998C13.3535 4.7998 4.80078 13.3525 4.80078 23.9998C4.80078 34.6471 13.3535 43.1998 24.0008 43.1998C33.6008 43.1998 42.3281 36.218 42.3281 23.9998C42.3281 22.8653 42.1535 21.6434 41.8917 20.5089Z" fill="white"/>
          </mask>
          <g mask="url(#mask3_9034_60314)">
            <path d="M44.9478 44.9452L17.8933 23.9998L14.4023 21.3816L44.9478 12.6543V44.9452Z" fill="#4285F4"/>
          </g>
        </svg>
      </button>
      <p *ngIf="googleAuth.errorMessage" class="google-error">{{ googleAuth.errorMessage }}</p>
    </div>
  `,
  styles: [`
    .social-media {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 1;
      transition: opacity 0.2s;
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }
    .btn svg { display: block; }
    .spinner {
      width: 48px;
      height: 48px;
      border: 3px solid #f0f0f0;
      border-top-color: #4285F4;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: block;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .google-error {
      font-size: 12px;
      color: #E53935;
      font-family: 'Nunito', sans-serif;
      text-align: center;
      margin: 0;
      max-width: 220px;
    }
  `]
})
export class SocialMediaComponent {
  @Input() mode: 'login' | 'signup' = 'login';

  constructor(public googleAuth: GoogleAuthService) {}

  onGoogleClick(): void {
    this.googleAuth.signIn(this.mode);
  }
}
