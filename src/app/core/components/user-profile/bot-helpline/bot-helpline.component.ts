import { AfterViewChecked, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';

interface ChatCta {
  label: string;
  route: string;
}

interface ChatMessage {
  from: 'bot' | 'user';
  text: string;
  cta: ChatCta | null;
}

interface FaqTopic {
  id: string;
  label: string;
  keywords: string[];
  answer: string;
  cta?: ChatCta;
}

const ECOMMERCE_FAQ_TOPICS: FaqTopic[] = [
  {
    id: 'track-order',
    label: 'Track my order',
    keywords: ['track', 'order status', 'where is my order', 'delivery status', 'shipped'],
    answer: "You can track any order's live delivery status from My Orders. Tap the order to see its full timeline.",
    cta: { label: 'Go to My Orders', route: '/authed/school-store/my-orders' }
  },
  {
    id: 'return-exchange',
    label: 'Return or exchange',
    keywords: ['return', 'exchange', 'wrong size', 'wrong item', 'damaged', 'defective'],
    answer: 'Returns and exchanges are available on delivered orders. Open the order in My Orders and tap Return/Exchange to start a request.',
    cta: { label: 'Go to My Orders', route: '/authed/school-store/my-orders' }
  },
  {
    id: 'cancel-order',
    label: 'Cancel an order',
    keywords: ['cancel'],
    answer: 'You can cancel an order before it ships from My Orders. Once it has shipped, cancellation is not available. You can request a return after delivery.',
    cta: { label: 'Go to My Orders', route: '/authed/school-store/my-orders' }
  },
  {
    id: 'payment-refund',
    label: 'Payment and refunds',
    keywords: ['refund', 'payment', 'money', 'charged', 'cod', 'transaction'],
    answer: 'Refunds for cancelled or returned orders are sent back to your original payment method, usually within 5 to 7 business days.'
  },
  {
    id: 'delivery-charges',
    label: 'Delivery charges',
    keywords: ['delivery charge', 'shipping fee', 'free delivery', 'delivery fee'],
    answer: 'Delivery charges are shown clearly at checkout before payment. If anything looks wrong, share your order details with support.'
  },
  {
    id: 'contact-support',
    label: 'Talk to a person',
    keywords: ['human', 'agent', 'call', 'contact', 'talk', 'support'],
    answer: 'Of course. Email our support team below with your order ID and we will get back to you as soon as we can.'
  }
];

const GENERAL_FAQ_TOPICS: FaqTopic[] = [
  {
    id: 'account-login',
    label: 'Account or login',
    keywords: ['login', 'sign in', 'password', 'otp', 'account', 'email', 'phone'],
    answer: 'For login or account trouble, check your email or phone number first, then try again. If it still does not work, email us and we will help you safely.'
  },
  {
    id: 'coins-rewards',
    label: 'Coins and rewards',
    keywords: ['coin', 'coins', 'reward', 'rewards', 'badge', 'redeem'],
    answer: 'Coins are earned by completing activities and learning tasks. You can check your coins from the Coins screen and use them wherever rewards are available.'
  },
  {
    id: 'habits-tasks',
    label: 'Habits and tasks',
    keywords: ['habit', 'habits', 'task', 'tasks', 'routine', 'calendar', 'done'],
    answer: 'Habits and tasks appear on your home screen and activity calendar. If something does not update, refresh the screen or reopen the app once.'
  },
  {
    id: 'family-parent',
    label: 'Family and parent',
    keywords: ['family', 'parent', 'child', 'code', 'link', 'unlink'],
    answer: 'Family linking uses your family code or QR. If you joined the wrong family or cannot link, ask the family creator to check the code and member limit.'
  },
  {
    id: 'app-issue',
    label: 'App issue',
    keywords: ['bug', 'crash', 'not working', 'issue', 'error', 'slow'],
    answer: 'Try refreshing or reopening the app. If the issue continues, email us with the screen name and a screenshot so we can fix it faster.'
  },
  {
    id: 'contact-support',
    label: 'Talk to a person',
    keywords: ['human', 'agent', 'call', 'contact', 'talk', 'support'],
    answer: 'Of course. Email our support team below and we will get back to you as soon as we can.'
  }
];

@Component({
  standalone: true,
  selector: 'bot-helpline',
  imports: [CommonModule, FormsModule, IonicModule, SupermeNavigatorComponent],
  templateUrl: './bot-helpline.component.html',
  styleUrls: ['./bot-helpline.component.scss']
})
export class BotHelplineComponent implements OnInit, AfterViewChecked {
  email = 'supermeappofficial@gmail.com';
  topics: FaqTopic[] = GENERAL_FAQ_TOPICS;
  isEcommerceHelp = false;
  messages: ChatMessage[] = [];
  draft = '';
  sending = false;

  @ViewChild('scrollAnchor') private scrollAnchor?: ElementRef<HTMLElement>;

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.configureHelpMode();
    const intro = this.isEcommerceHelp
      ? "Hi! I'm the SuperMe store help bot. Choose an order topic below, or type your question and I'll help with store support."
      : "Hi! I'm the SuperMe help bot. Pick a topic below, or type your question and I'll do my best to help.";
    this.pushBot(intro);
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private configureHelpMode(): void {
    const source = (this.route.snapshot.queryParamMap.get('source') || '').toLowerCase();
    const context = (this.route.snapshot.queryParamMap.get('context') || '').toLowerCase();
    const mode = source || context;

    this.isEcommerceHelp = ['store', 'school-store', 'ecommerce', 'orders', 'order'].includes(mode);
    this.topics = this.isEcommerceHelp ? ECOMMERCE_FAQ_TOPICS : GENERAL_FAQ_TOPICS;
  }

  private pushBot(text: string, cta: ChatCta | null = null): void {
    this.messages.push({ from: 'bot', text, cta });
  }

  private pushUser(text: string): void {
    this.messages.push({ from: 'user', text, cta: null });
  }

  selectTopic(topic: FaqTopic): void {
    this.pushUser(topic.label);
    this.pushBot(topic.answer, topic.cta ?? null);
  }

  send(): void {
    const text = this.draft.trim();
    if (!text) return;
    this.pushUser(text);
    this.draft = '';

    const match = this.matchTopic(text);
    if (match) {
      this.pushBot(match.answer, match.cta ?? null);
    } else {
      const fallback = this.isEcommerceHelp
        ? `I couldn't quite find an order answer for that. Try a store topic below, or email us at ${this.email} with your order details.`
        : `I couldn't quite find an answer for that. Try a topic below, or email us at ${this.email} and we'll help directly.`;
      this.pushBot(fallback);
    }
  }

  private matchTopic(text: string): FaqTopic | null {
    const lower = text.toLowerCase();
    return this.topics.find(t => t.keywords.some(k => lower.includes(k))) ?? null;
  }

  goTo(route: string): void {
    this.router.navigateByUrl(route);
  }

  private scrollToBottom(): void {
    try { this.scrollAnchor?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'end' }); } catch { }
  }
}
