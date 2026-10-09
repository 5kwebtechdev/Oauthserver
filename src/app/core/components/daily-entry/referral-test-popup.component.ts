import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AvatarService } from '../../services/avatar.service';
import { displayName } from '../../models/display-name';
import { PetMessageApiResponse } from '../../services/pet-message-api.service';

// TEMP REFERRAL POPUP UI FOR TESTING - REMOVE/DISABLE AFTER TESTING
// Presentation only; the existing daily-entry component owns API requests and receipts.
@Component({
  selector: 'app-referral-test-popup',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="referral-card" [class.referral-card--joined]="!received" aria-labelledby="referral-heading">
      <button class="close" type="button" aria-label="Close referral celebration" [disabled]="busy" (click)="dismiss.emit()">
        <span class="close-crop" aria-hidden="true"><img src="assets/figma/referral-popup/close.svg" alt=""></span>
      </button>
      <div class="content">
        <div class="message-block">
          <img class="avatar" [src]="avatarUrl" [alt]="name + ' avatar'" (error)="imageFailed = true">
          <div class="copy">
            <h2 id="referral-heading"><span>{{ name }}</span><br>{{ received ? 'brought you here! 🎉' : 'just joined because of you!' }}</h2>
            <p *ngIf="amount !== null; else noAmount">
              <ng-container *ngIf="!received">Your referral worked. </ng-container>{{ event.bothRewarded === true ? "You've both earned" : "You've earned" }}
              <strong>{{ amount | number }} coins.</strong>
              <ng-container *ngIf="received && event.bothRewarded === true"> <strong>{{ name }}</strong> is already on a streak, time to catch up.</ng-container>
            </p>
            <ng-template #noAmount><p>{{ event.message || 'Thanks for growing the SuperMe community!' }}</p></ng-template>
          </div>
        </div>
        <div class="reward" *ngIf="amount !== null" aria-hidden="true">
          <img src="assets/figma/referral-popup/reward-500.png" alt="">
          <span class="dynamic-amount" *ngIf="amount !== 500">+{{ amount | number }}</span>
        </div>
      </div>
      <p *ngIf="notice" class="error" role="alert">{{ notice }}</p>
      <button *ngIf="notice" type="button" class="retry" [disabled]="busy" (click)="dismiss.emit()">Try again</button>
    </section>`,
  styles: [`
    :host { display:block; width:min(393px,100vw); max-height:calc(100dvh - 24px); overflow-y:auto; }
    .referral-card { position:relative; box-sizing:border-box; width:100%; min-height:314px; padding:12px 16px;
      overflow:hidden; border-radius:24px; background:linear-gradient(180deg,#ebe6f5 0%,#fff 100%);
      box-shadow:inset 0 2px 2px .5px rgba(255,255,255,.5);
      text-align:center; font-family:var(--font-sans,'Nunito',sans-serif); color:#282527; }
    .referral-card--joined { border-radius:44px 44px 24px 24px; }
    .content,.message-block,.copy { display:flex; flex-direction:column; align-items:center; }
    .content { gap:8px; }
    .message-block { width:100%; gap:8px; }
    .copy { width:100%; }
    .avatar { display:block; width:64px; height:64px; border-radius:50%; object-fit:cover; flex:none; }
    h2 { width:100%; margin:0; color:#282527; font-size:20px; font-weight:700; line-height:27px; overflow-wrap:anywhere; }
    h2 span,.copy strong { color:#432477; }
    .copy p { max-width:289px; margin:0 auto; color:#6b656a; font-size:13px; font-weight:600; line-height:18px; }
    .referral-card--joined .copy p { max-width:249px; }
    .copy strong { font-weight:700; }
    .reward { position:relative; width:154px; height:120px; flex:none; overflow:hidden; }
    .reward img { display:block; width:100%; height:100%; object-fit:contain; }
    .dynamic-amount { position:absolute; left:70px; bottom:13px; display:block; min-width:57px;
      padding:0 3px; border-radius:10px; background:#f0e9ff; color:#432477;
      font-size:19px; font-weight:900; line-height:25px; }
    .close { position:absolute; z-index:1; top:10px; right:10px; display:grid; place-items:center;
      width:36px; height:36px; padding:0; border:0; background:transparent; cursor:pointer; }
    .close-crop { position:relative; display:block; width:14px; height:14px; overflow:hidden; }
    .close-crop img { position:absolute; top:-5px; left:-342px; display:block; width:361px; height:24px; max-width:none; }
    .error { margin:8px 0 0; color:#a52345; font-size:13px; }
    .retry { margin-top:8px; padding:8px 14px; border:0; border-radius:20px; background:#432477; color:white; cursor:pointer; }
    button:focus-visible { outline:3px solid #9c78d1; outline-offset:2px; }
    button:disabled { opacity:.5; cursor:wait; }
    @media(max-width:360px) { h2 { font-size:18px; line-height:24px; } .copy p { max-width:100%; } }
  `]
})
export class ReferralTestPopupComponent {
  @Input() event!: PetMessageApiResponse;
  @Input() busy = false;
  @Input() notice = '';
  @Output() dismiss = new EventEmitter<void>();
  imageFailed = false;
  constructor(private avatars: AvatarService) {}
  get received(): boolean { return this.event.overlayType === 'REFERRAL_RECEIVED'; }
  get name(): string { return displayName(this.event.relatedUser) || 'Your friend'; }
  get amount(): number | null {
    const value = this.event.amount;
    return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
  }
  get avatarUrl(): string {
    const person = this.event.relatedUser;
    const avatar = person?.avatar;
    const savedAvatar = this.avatars.getAvatarAsset(avatar?.avatarImageName);
    if (!this.imageFailed && savedAvatar) return savedAvatar.value;
    if (!this.imageFailed && !avatar?.avatarImageName?.trim() && avatar?.url?.trim()) return avatar.url;
    return this.avatars.getAvatarForUser(person).value;
  }
}
