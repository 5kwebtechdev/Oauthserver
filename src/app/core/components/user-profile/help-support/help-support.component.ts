import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../..//components/mindful-navigator/mindful-navigator.component';
import { ProfileFactsComponent, FaqItem, PROFILE_FAQS } from '../profile-facts/profile-facts.component';
import { AuthService as CoreAuthService } from '../../../services/auth.service';

@Component({
  standalone: true,
  selector: 'help-support',
  imports: [CommonModule, IonicModule, MindfulNavigatorComponent, ProfileFactsComponent],
  templateUrl: './help-support.component.html',
  styleUrls: ['./help-support.component.scss']
})
export class HelpSupportComponent implements OnInit {
  showContactForm = false;

  accountFaqs: FaqItem[] = [];
  petsFaqs: FaqItem[] = [];
  coinsFaqs: FaqItem[] = [];
  habitsFaqs: FaqItem[] = [];
  habitsChildFaqs: FaqItem[] = [];
  habitsParentFaqs: FaqItem[] = [];
  parentControlsFaqs: FaqItem[] = [];
  securityFaqs: FaqItem[] = [];
  troubleshootingFaqs: FaqItem[] = [];

  constructor(private coreAuthService: CoreAuthService) {}

  toggleContactForm() {
    this.showContactForm = !this.showContactForm;
  }

  onSubmitContact() {
    console.log('Contact form submitted (stub)');
    this.showContactForm = false;
  }

  ngOnInit(): void {
    this.populateHelpFaqs();
  }

  isParentUser(): boolean {
    try {
      return this.coreAuthService.isParentUser();
    } catch {
      return false;
    }
  }

  private populateHelpFaqs(): void {
    const isParent = (() => { try { return this.coreAuthService.isParentUser(); } catch { return false; } })();
    const relationship = (() => { try { return this.coreAuthService.getUserRelationship?.(); } catch { return null; } })();

    if (isParent) {
      this.accountFaqs = PROFILE_FAQS.filter(f => (f.screen || '').toLowerCase().includes('help-account (parent)'));
      this.habitsParentFaqs = PROFILE_FAQS.filter(f => (f.screen || '').toLowerCase().includes('help-habits (parent)'));
      this.habitsChildFaqs = [];
      this.parentControlsFaqs = PROFILE_FAQS.filter(f => (f.screen || '').toLowerCase().includes('help-parent controls (parent)') || (f.section || '').toLowerCase().includes('parent'));
      this.securityFaqs = PROFILE_FAQS.filter(f => (f.screen || '').toLowerCase().includes('help-security (parent)'));
      this.troubleshootingFaqs = PROFILE_FAQS.filter(f => (f.screen || '').toLowerCase().includes('help-troubleshooting (parent)'));
      // Coins helpline for parent
      this.coinsFaqs = PROFILE_FAQS.filter(f => ((f.section || '').toLowerCase().includes('coins') && (f.screen || '').toLowerCase().includes('parent')) || (f.screen || '').toLowerCase().includes('helpline (parent)'));
    } else {
      // child or self
      this.accountFaqs = PROFILE_FAQS.filter(f => (f.screen || '').toLowerCase().includes('help-account (child)'));
      this.petsFaqs = PROFILE_FAQS.filter(f => (f.screen || '').toLowerCase().includes('help-pets & rewards (child)') || (f.screen || '').toLowerCase().includes('help-pets') || (f.section || '').toLowerCase().includes('coins'));
      // Ensure Pets section does NOT include coin/helpline entries (coins are parent-only)
      this.petsFaqs = this.petsFaqs.filter(f => {
        const s = (f.screen || '').toLowerCase();
        const sec = (f.section || '').toLowerCase();
        return !sec.includes('coin') && !s.includes('coin') && !s.includes('helpline');
      });
      this.habitsChildFaqs = PROFILE_FAQS.filter(f => (f.screen || '').toLowerCase().includes('help-habits (child)'));
      this.habitsParentFaqs = [];
      this.parentControlsFaqs = PROFILE_FAQS.filter(f => (f.screen || '').toLowerCase().includes('help-parent controls (child)') || (f.screen || '').toLowerCase().includes('help-parent controls'));
      this.troubleshootingFaqs = PROFILE_FAQS.filter(f => (f.screen || '').toLowerCase().includes('help-troubleshooting (child)'));
      // coinsFaqs left empty for child/self
      this.coinsFaqs = [];
    }

    // Fallbacks: if any section is empty, try looser matching by keywords
    const tryFallback = (arr: FaqItem[], keywords: string[]) => {
      if (arr && arr.length) return arr;
      const k = keywords.map(s => s.toLowerCase());
      return PROFILE_FAQS.filter(f => {
        const s = (f.screen || f.section || '').toLowerCase();
        return k.some(kw => s.includes(kw));
      });
    };

    this.accountFaqs = tryFallback(this.accountFaqs, ['help-account', 'help-account (child)', 'help-account (parent)']);
    this.petsFaqs = tryFallback(this.petsFaqs, ['pets', 'rewards', 'coins']);
    this.coinsFaqs = tryFallback(this.coinsFaqs, ['coins', 'helpline (parent)', 'helpline parent']);
    this.habitsChildFaqs = tryFallback(this.habitsChildFaqs, ['habits', 'help-habits', 'help-habits (child)']);
    this.habitsParentFaqs = tryFallback(this.habitsParentFaqs, ['habits', 'help-habits', 'help-habits (parent)']);
    this.parentControlsFaqs = tryFallback(this.parentControlsFaqs, ['parent controls', 'help-parent controls']);
    this.securityFaqs = tryFallback(this.securityFaqs, ['security', 'help-security']);
    this.troubleshootingFaqs = tryFallback(this.troubleshootingFaqs, ['troubleshooting', 'help-troubleshooting']);
  }
}
