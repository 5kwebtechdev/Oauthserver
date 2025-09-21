import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { ProfileFactsComponent } from '../profile-facts/profile-facts.component';
import { IonicModule } from '@ionic/angular';

@Component({
  standalone: true,
  selector: 'refer-friend',
  imports: [CommonModule, MindfulNavigatorComponent, MindfulButtonComponent, IonicModule, ProfileFactsComponent],
  templateUrl: './refer-friend.component.html',
  styleUrls: ['./refer-friend.component.scss']
})
export class ReferFriendComponent implements OnInit {
  referralCode: string = '';
  shareLink: string = '';
  faqs: Array<{question: string, answer?: string}> = [];

  ngOnInit(): void {
  this.referralCode = ReferFriendComponent.generateRandomCode(6);
    this.shareLink = `https://mindfulbuddy.app/referral?code=${this.referralCode}`;

  this.faqs = [
      { question: 'How does this work?', answer: '' },
      { question: 'The code is not working', answer: '' },
      { question: 'I cannot copy the code', answer: '' }
    ];
  }

  static generateRandomCode(length: number) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  copyLink() {
    try {
      navigator.clipboard.writeText(this.shareLink);
      
    } catch (e) {
      console.warn('Clipboard not available', e);
    }
  }

  shareNow() {
    const message = `Join me on MindfulBuddy! Use my referral code ${this.referralCode} to sign up: ${this.shareLink}`;

    
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      (navigator as any).share({
        title: 'MindfulBuddy',
        text: message,
        url: this.shareLink
      }).catch((err: any) => {
        console.warn('Share failed, falling back to clipboard', err);
        this.fallbackShare(message);
      });
      return;
    }

    this.fallbackShare(message);
  }

  private fallbackShare(message: string) {
    
    try {
      navigator.clipboard.writeText(message);
      console.info('Referral message copied to clipboard');
    } catch (e) {
      console.warn('Clipboard not available', e);
    }

    
    try {
      const encoded = encodeURIComponent(message);
      const whatsappUrl = `https://api.whatsapp.com/send?text=${encoded}`;
      window.open(whatsappUrl, '_blank');
    } catch (e) {
      console.warn('Could not open WhatsApp web', e);
    }
  }
}
