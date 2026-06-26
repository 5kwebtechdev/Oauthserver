import { Component, Input, OnInit, OnDestroy, NgZone } from '@angular/core';
import { ViewWillEnter } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HttpClientModule } from '@angular/common/http';
import { FooterComponent } from 'src/app/core/components/footer/footer.component';
import { SupermePetComponent } from 'src/app/core/components/superme-pet/superme-pet.component';
import { SupermeSpeechBubbleComponent } from 'src/app/core/components/superme-speech-bubble/superme-speech-bubble.component';
import { LearningChallengeCardComponent } from '../learning-card/learning-challenge-card.component';
import { LearningArticleCardComponent } from '../learning-card/learning-article-card.component';
import { LearningService } from 'src/app/core/services/learning.service';
import { LearningCardData } from 'src/app/core/models/learning.models';
import { EmptyStateComponent } from 'src/app/core/components/empty-state/empty-state.component';
import { CustomToastService } from 'src/app/core/services/custom-toast.service';

@Component({
  selector: 'learning-main',
  templateUrl: './learning-main.component.html',
  styleUrls: ['./learning-main.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, FormsModule, HttpClientModule, FooterComponent, SupermeSpeechBubbleComponent, SupermePetComponent, LearningChallengeCardComponent, LearningArticleCardComponent, EmptyStateComponent],
  providers: [LearningService]
})
export class LearningMainComponent implements OnInit, OnDestroy, ViewWillEnter {
  @Input() title: string = '';
  @Input() body: string = '';

  selectedCategory: 'for-you' | 'puzzles' | 'quizzes' | 'articles' | null = 'for-you';

  forYouItems:  LearningCardData[] = [];
  puzzleItems:  LearningCardData[] = [];
  quizItems:    LearningCardData[] = [];
  articleItems: LearningCardData[] = [];
  searchItems:  LearningCardData[] = [];

  // Per-tab loading flags
  loadingForYou   = false;
  loadingPuzzles  = false;
  loadingQuizzes  = false;
  loadingArticles = false;

  // Track which tabs have been fetched at least once
  private loadedTabs = new Set<string>();

  searchKeyword = '';
  isSearching   = false;
  isListening   = false;

  private destroy$ = new Subject<void>();
  private recognition: any = null;

  get isLoading(): boolean {
    return this.loadingForYou || this.loadingPuzzles || this.loadingQuizzes || this.loadingArticles;
  }

  get activeTabLoading(): boolean {
    switch (this.selectedCategory) {
      case 'for-you':  return this.loadingForYou;
      case 'puzzles':  return this.loadingPuzzles;
      case 'quizzes':  return this.loadingQuizzes;
      case 'articles': return this.loadingArticles;
      default:         return false;
    }
  }

  constructor(
    private learningService: LearningService,
    private toastService: CustomToastService,
    private zone: NgZone
  ) { }

  ngOnInit(): void {
    this.loadTab('for-you');
  }

  ionViewWillEnter(): void {
    // Refresh current tab when returning to the page
    this.loadTab(this.selectedCategory ?? 'for-you', true);
  }

  private loadTab(tab: 'for-you' | 'puzzles' | 'quizzes' | 'articles', forceRefresh = false): void {
    if (!forceRefresh && this.loadedTabs.has(tab)) return;

    switch (tab) {
      case 'for-you':
        this.loadingForYou = true;
        this.learningService.fetchForYouCards()
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: items => {
              this.forYouItems = items;
              this.loadingForYou = false;
              this.loadedTabs.add('for-you');
              if (this.searchKeyword.trim()) this.updateSearchResults();
            },
            error: () => { this.loadingForYou = false; }
          });
        break;

      case 'puzzles':
        this.loadingPuzzles = true;
        this.learningService.fetchPuzzleCards()
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: items => {
              this.puzzleItems = items;
              this.loadingPuzzles = false;
              this.loadedTabs.add('puzzles');
              if (this.searchKeyword.trim()) this.updateSearchResults();
            },
            error: () => { this.loadingPuzzles = false; }
          });
        break;

      case 'quizzes':
        this.loadingQuizzes = true;
        this.learningService.fetchQuizCards()
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: items => {
              this.quizItems = items;
              this.loadingQuizzes = false;
              this.loadedTabs.add('quizzes');
              if (this.searchKeyword.trim()) this.updateSearchResults();
            },
            error: () => { this.loadingQuizzes = false; }
          });
        break;

      case 'articles':
        this.loadingArticles = true;
        this.learningService.fetchArticleCards()
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: items => {
              this.articleItems = items;
              this.loadingArticles = false;
              this.loadedTabs.add('articles');
              if (this.searchKeyword.trim()) this.updateSearchResults();
            },
            error: () => { this.loadingArticles = false; }
          });
        break;
    }
  }

  ngOnDestroy(): void {
    this.stopVoiceSearch();
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectCategory(cat: 'for-you' | 'puzzles' | 'quizzes' | 'articles') {
    this.selectedCategory = cat;
    this.loadTab(cat, true);
    if (this.searchKeyword.trim()) this.updateSearchResults();
  }

  openForYou() { this.selectCategory('for-you'); }
  openPuzzles() { this.selectCategory('puzzles'); }
  openQuizzes() { this.selectCategory('quizzes'); }
  openArticles() { this.selectCategory('articles'); }

  onSearchInput(): void {
    this.updateSearchResults();
  }

  performSearch(): void {
    this.updateSearchResults();
  }

  async onVoiceSearch(): Promise<void> {
    if (this.isListening) {
      this.stopVoiceSearch();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      this.toastService.error('Voice search is not supported on this device.');
      return;
    }

    // Check permission state without consuming the microphone stream.
    // Using getUserMedia before SpeechRecognition.start() competes for the
    // audio resource and causes service-not-allowed on Android WebView.
    const denied = await this.isMicrophoneDenied();
    if (denied) {
      this.toastService.error('Microphone permission is required. Please enable it in your device settings.');
      return;
    }

    this.stopVoiceSearch();

    const recognition = new SpeechRecognition();
    this.recognition = recognition;
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = '';

    recognition.onstart = () => {
      this.zone.run(() => {
        this.isListening = true;
        this.toastService.show('Listening...', 'info', 1500);
      });
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0]?.transcript || '';
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      const spokenText = (finalTranscript || interimTranscript).trim();
      if (spokenText) {
        this.zone.run(() => {
          this.searchKeyword = spokenText;
          this.updateSearchResults();
        });
      }
    };

    recognition.onerror = (event: any) => {
      this.zone.run(() => {
        this.isListening = false;
        this.toastService.error(this.getVoiceSearchErrorMessage(event?.error));
      });
    };

    recognition.onend = () => {
      this.zone.run(() => {
        this.isListening = false;
        if (this.recognition === recognition) {
          this.recognition = null;
        }
      });
    };

    try {
      recognition.start();
    } catch (error) {
      this.isListening = false;
      this.recognition = null;
      this.toastService.error('Voice search could not start. Please try again.');
    }
  }

  /**
   * Returns true only when the microphone permission is explicitly denied.
   * Uses the Permissions API (no microphone stream acquired) so we don't
   * compete with SpeechRecognition for the audio resource — which is the
   * root cause of service-not-allowed on Android WebView when getUserMedia
   * was called immediately before recognition.start().
   */
  private async isMicrophoneDenied(): Promise<boolean> {
    try {
      if (navigator.permissions) {
        const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        return status.state === 'denied';
      }
    } catch {
      // Permissions API unsupported — let SpeechRecognition decide
    }
    return false;
  }

  private stopVoiceSearch(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (error) { }
      this.recognition = null;
    }
    this.isListening = false;
  }

  private getVoiceSearchErrorMessage(error?: string): string {
    switch (error) {
      case 'not-allowed':
        return 'Microphone permission is required. Please enable it in your device settings.';
      case 'service-not-allowed':
        return 'Voice search service is unavailable on this device. Please use the keyboard to search.';
      case 'no-speech':
        return 'No voice detected. Please try again.';
      case 'audio-capture':
        return 'Microphone is not available on this device.';
      case 'network':
        return 'Voice search needs a stable internet connection.';
      default:
        return 'Voice search could not hear that. Please try again.';
    }
  }

  private updateSearchResults(): void {
    const keyword = this.searchKeyword.trim().toLowerCase();
    if (!keyword) {
      this.isSearching = false;
      this.searchItems = [];
      return;
    }
    this.isSearching = true;
    this.searchItems = this.getCurrentCategoryItems().filter(item => this.matchesSearch(item, keyword));
  }

  private getCurrentCategoryItems(): LearningCardData[] {
    switch (this.selectedCategory) {
      case 'puzzles':  return this.puzzleItems;
      case 'quizzes':  return this.quizItems;
      case 'articles': return this.articleItems;
      case 'for-you':
      default:         return this.forYouItems;
    }
  }

  private matchesSearch(item: LearningCardData, keyword: string): boolean {
    return [item.title, item.description, item.type, item.category, item.subType, item.buttonText, ...(item.tags || [])]
      .filter(Boolean).join(' ').toLowerCase().includes(keyword);
  }

  clearSearch(): void {
    this.searchKeyword = '';
    this.isSearching = false;
    this.searchItems = [];
  }

  onCardClick(event: any) { }
}
