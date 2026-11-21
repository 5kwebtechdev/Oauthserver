import { Component, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { AndroidTurnstileComponent } from '../android-turnstile/android-turnstile.component';

/** App-owned security check: never reads or injects into the hosted auth WebView. */
@Component({
  standalone: true,
  imports: [CommonModule, IonicModule, AndroidTurnstileComponent],
  template: `<ion-content><main><h2>Security check</h2><p>Complete the check to continue with Google.</p>
    <app-android-turnstile [siteKey]="siteKey"></app-android-turnstile>
    <p *ngIf="error" role="alert">{{ error }}</p>
    <ion-button *ngIf="error" [disabled]="checking" (click)="verify()">Retry security check</ion-button>
    <ion-button fill="outline" (click)="cancel()">Cancel</ion-button></main></ion-content>`,
  styles: ['main{padding:24px 16px;max-width:420px;margin:auto}h2{font-size:22px;color:#432477}p{font-size:16px;line-height:1.5}ion-button{--color:#432477;--border-color:#432477}']
})
export class NativeGoogleSecurityComponent {
  @Input() siteKey = '';
  @ViewChild(AndroidTurnstileComponent, { static: true }) check!: AndroidTurnstileComponent;
  error = '';
  checking = false;
  private finished = false;
  constructor(private modal: ModalController) {}
  async ionViewDidEnter(): Promise<void> { await this.verify(); }
  async verify(): Promise<void> {
    if (this.finished || this.checking) return;
    this.checking = true;
    this.error = '';
    try {
      const token = await this.check.verify();
      if (!this.finished) { this.finished = true; await this.modal.dismiss({ token }, 'verified'); }
    } catch (error) {
      if (!this.finished) this.error = error instanceof Error ? error.message : 'The security check could not finish. Please retry.';
    } finally {
      this.checking = false;
    }
  }
  async cancel(): Promise<void> {
    if (this.finished) return;
    this.finished = true;
    await this.modal.dismiss(undefined, 'cancelled');
  }
}
