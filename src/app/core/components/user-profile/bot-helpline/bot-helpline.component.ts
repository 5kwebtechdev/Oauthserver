import { AfterViewChecked, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
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

const FAQ_TOPICS: FaqTopic[] = [
  {
    id: 'track-order',
    label: '📦 Track my order',
    keywords: ['track', 'order status', 'where is my order', 'delivery status', 'shipped'],
    answer: "You can track any order's live delivery status from My Orders — tap the order to see its full timeline.",
    cta: { label: 'Go to My Orders', route: '/authed/school-store/my-orders' }
  },
  {
    id: 'return-exchange',
    label: '🔄 Return or exchange',
    keywords: ['return', 'exchange', 'wrong size', 'wrong item', 'damaged', 'defective'],
    answer: "Returns and exchanges are available on delivered orders. Open the order in My Orders and tap “Return/Exchange” to start a request.",
    cta: { label: 'Go to My Orders', route: '/authed/school-store/my-orders' }
  },
  {
    id: 'cancel-order',
    label: '❌ Cancel an order',
    keywords: ['cancel'],
    answer: "You can cancel an order before it ships from My Orders. Once it's shipped, cancellation isn't available — you can request a return instead after it's delivered.",
    cta: { label: 'Go to My Orders', route: '/authed/school-store/my-orders' }
  },
  {
    id: 'payment-refund',
    label: '💳 Payment & refunds',
    keywords: ['refund', 'payment', 'money', 'charged', 'cod', 'transaction'],
    answer: "Refunds for cancelled or returned orders are sent back to your original payment method, usually within 5–7 business days."
  },
  {
    id: 'delivery-charges',
    label: '🚚 Delivery charges',
    keywords: ['delivery charge', 'shipping fee', 'free delivery', 'delivery fee'],
    answer: "Delivery is free on orders above ₹500. Orders below that have a flat ₹99 delivery fee, shown at checkout before you pay."
  },
  {
    id: 'contact-support',
    label: '🙋 Talk to a person',
    keywords: ['human', 'agent', 'call', 'contact', 'talk'],
    answer: "Of course — email our support team below and we'll get back to you as soon as we can."
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
  topics = FAQ_TOPICS;
  messages: ChatMessage[] = [];
  draft = '';
  sending = false;

  @ViewChild('scrollAnchor') private scrollAnchor?: ElementRef<HTMLElement>;

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.pushBot("Hi! 👋 I'm the SuperMe help bot. Pick a topic below, or type your question and I'll do my best to help.");
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
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
      this.pushBot(`I couldn't quite find an answer for that. Try a topic below, or email us at ${this.email} and we'll help directly.`);
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
