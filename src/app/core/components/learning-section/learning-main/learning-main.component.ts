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

  // Plain arrays — bound directly in the template
  forYouItems: LearningCardData[] = [];
  puzzleItems: LearningCardData[] = [];
  quizItems: LearningCardData[] = [];
  articleItems: LearningCardData[] = [];
  searchItems: LearningCardData[] = [];

  isLoading = false;
  searchKeyword = '';
  isSearching = false;
  isListening = false;

  private destroy$ = new Subject<void>();
  private recognition: any = null;

  constructor(
    private learningService: LearningService,
    private toastService: CustomToastService,
    private zone: NgZone
  ) { }

  ngOnInit(): void {
    this.loadData();
  }

  ionViewWillEnter(): void { this.loadData(); }

  private loadData(): void {
    this.isLoading = true;
    this.forYouItems = [];
    this.puzzleItems = [];
    this.quizItems = [];
    this.articleItems = [];

    // Single call fetches GET /challenges + GET /articles, then filter per tab
    this.learningService.getAllContent()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (items) => {
          const all = items || [];
          // Client-side age-group guard: the API uses ?age= when available,
          // but filter again here so any items outside the user's group are
          // excluded even if the server returns them (e.g. when age is unknown)
          const userAgeGroup = this.getUserAgeGroup();
          const ageFiltered = userAgeGroup
            ? all.filter(item => this.itemMatchesAgeGroup(item, userAgeGroup))
            : all;
          this.forYouItems  = ageFiltered;
          this.puzzleItems  = ageFiltered.filter(c => c.type === 'puzzle');
          this.quizItems    = ageFiltered.filter(c => c.type === 'quiz');
          this.articleItems = ageFiltered.filter(c => c.type === 'article');
          if (this.searchKeyword.trim()) {
            this.updateSearchResults();
          }
          this.isLoading = false;
        },
        error: () => { this.isLoading = false; }
      });
  }

  ngOnDestroy(): void {
    this.stopVoiceSearch();
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectCategory(cat: 'for-you' | 'puzzles' | 'quizzes' | 'articles') {
    this.selectedCategory = cat;
    if (this.isSearching && this.searchKeyword.trim()) {
      this.updateSearchResults();
    }
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

    const userAgeGroup = this.getUserAgeGroup();
    this.isSearching = true;
    this.searchItems = this.getCurrentCategoryItems().filter(item => {
      if (userAgeGroup && !this.itemMatchesAgeGroup(item, userAgeGroup)) return false;
      return this.matchesSearch(item, keyword);
    });
  }

  private getCurrentCategoryItems(): LearningCardData[] {
    switch (this.selectedCategory) {
      case 'puzzles':
        return this.puzzleItems;
      case 'quizzes':
        return this.quizItems;
      case 'articles':
        return this.articleItems;
      case 'for-you':
      default:
        return this.forYouItems;
    }
  }

  private matchesSearch(item: LearningCardData, keyword: string): boolean {
    const searchableText = [
      item.title,
      item.description,
      item.type,
      item.category,
      item.subType,
      item.buttonText,
      ...(item.tags || [])
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return searchableText.includes(keyword);
  }

  private getUserAgeGroup(): string | null {
    try {
      const raw = localStorage.getItem('user_data');
      if (!raw) return null;
      const profile = JSON.parse(raw);
      // Prefer the ageGroup field the login response stores directly — avoids
      // any off-by-one errors from client-side DOB timezone arithmetic
      if (profile?.ageGroup) return profile.ageGroup as string;
      // Fall back to calculating from DOB
      const dob = profile?.dateOfBirth || profile?.dob;
      if (!dob) return null;
      const birth = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      if (age < 11) return 'BELOW_11';
      if (age <= 13) return 'AGE_11_TO_13';
      if (age <= 15) return 'AGE_14_TO_15';
      if (age <= 17) return 'AGE_16_TO_17';
      return 'AGE_18_PLUS';
    } catch {
      return null;
    }
  }

  private itemMatchesAgeGroup(item: LearningCardData, userAgeGroup: string): boolean {
    const raw = item.rawData as any;
    if (!raw) return true;
    // Challenge: ageGroups is an array
    if (Array.isArray(raw.ageGroups)) return raw.ageGroups.includes(userAgeGroup);
    // Article: ageGroup is a single string
    if (raw.ageGroup) return raw.ageGroup === userAgeGroup;
    return true;
  }

  clearSearch(): void {
    this.searchKeyword = '';
    this.isSearching = false;
    this.searchItems = [];
  }

  onCardClick(event: any) { }
}
