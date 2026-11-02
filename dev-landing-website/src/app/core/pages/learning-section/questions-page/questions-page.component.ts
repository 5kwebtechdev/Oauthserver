import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { SupermeButtonComponent } from '../../../components/superme-button/superme-button.component';
import { LearningService } from '../learning.service';
import { Challenge, ChallengeQuestion, Question, QuestionAnswer } from '../learning.models';
import { MoodService } from '../../../services/mood.service';

@Component({
    selector: 'sm-questions-page',
    standalone: true,
    imports: [CommonModule, SupermeButtonComponent],
    templateUrl: './questions-page.component.html',
    styleUrls: ['./questions-page.component.scss']
})
export class QuestionsPageComponent implements OnInit, OnDestroy {
    challenge: Challenge | null = null;
    questions: Question[] = [];
    questionAnswers: Record<number, QuestionAnswer> = {};

    currentIndex = 0;
    totalQuestions = 0;
    selectedOption: string | null = null;
    answerChecked = false;
    isCorrect = false;
    showPopup = false;

    // Timer
    totalTimeSeconds = 300;
    remainingTimeSeconds = 300;
    timerDisplay = '05:00';
    private timerInterval: any;

    // Hint
    showHint = false;
    currentHintText = '';
    hintsUsed = 0;
    maxHints = 2;
    coinsPerHint = 3;
    isHintLoading = false;

    // Popups
    showLeavePopup = false;
    showTimeUpPopup = false;
    isSubmitting = false;

    constructor(private router: Router, private route: ActivatedRoute, private learningService: LearningService, private moodService: MoodService) { }

    ngOnInit(): void {
        const navigation = this.router.getCurrentNavigation();
        const state = navigation?.extras?.state as { challenge?: Challenge };

        // Always fetch the full challenge by ID so positiveFeedback/negativeFeedback are present
        const idFromState = state?.challenge?.challengeId;
        const idFromRoute = this.route.snapshot.paramMap.get('id');
        const id = idFromState ?? (idFromRoute ? Number(idFromRoute) : null);

        if (id) {
            this.learningService.fetchChallengeById(id).subscribe({
                next: (c) => {
                    if (c) {
                        this.initQuiz(c);
                    } else if (state?.challenge) {
                        // Fallback to state data if API call fails
                        this.initQuiz(state.challenge);
                    } else {
                        this.goBack();
                    }
                },
                error: () => {
                    if (state?.challenge) {
                        this.initQuiz(state.challenge);
                    } else {
                        this.goBack();
                    }
                }
            });
        } else {
            this.goBack();
        }
    }

    ngOnDestroy(): void {
        this.stopTimer();
    }

    private initQuiz(c: Challenge): void {
        this.challenge = c;
        this.questions = this.transformQuestions(c.questions);
        this.totalQuestions = this.questions.length;

        this.questions.forEach(q => {
            this.questionAnswers[q.id] = { selected: null, correct: false, selectedOptionId: null };
        });

        this.parseTimeDuration(c.timeDuration);
        this.startTimer();
    }

    private transformQuestions(backendQuestions: ChallengeQuestion[]): Question[] {
        return backendQuestions.map(q => {
            let type: 'mcq' | 'true-false' | 'visual' = 'mcq';
            if (q.trueFalse) type = 'true-false';
            else if (q.visual) type = 'visual';

            let contentType: 'text-only' | 'image-only' | 'text-and-image' = 'text-only';
            if (q.questionText && q.questionImageUrl) contentType = 'text-and-image';
            else if (q.questionImageUrl) contentType = 'image-only';

            const correctOpt = q.options.find(o => o.isCorrect);

            return {
                id: q.questionId,
                text: q.questionText,
                options: q.options.map(o => o.optionText),
                correctAnswer: correctOpt?.optionText || q.options[0]?.optionText || '',
                image: q.questionImageUrl || '',
                hint: q.hint || '',
                type,
                optionImages: q.options.map(o => o.optionImageUrl || ''),
                contentType,
                positiveFeedback: q.positiveFeedback || '',
                negativeFeedback: q.negativeFeedback || ''
            };
        });
    }

    private parseTimeDuration(duration: string): void {
        const match = duration.match(/(\d+)\s*min/i);
        if (match) {
            const mins = parseInt(match[1]);
            this.totalTimeSeconds = mins * 60;
            this.remainingTimeSeconds = this.totalTimeSeconds;
            this.updateTimerDisplay();
        }
    }

    private startTimer(): void {
        this.timerInterval = setInterval(() => {
            this.remainingTimeSeconds--;
            this.updateTimerDisplay();
            if (this.remainingTimeSeconds <= 0) {
                this.stopTimer();
                this.showTimeUpPopup = true;
            }
        }, 1000);
    }

    private stopTimer(): void {
        if (this.timerInterval) clearInterval(this.timerInterval);
    }

    private updateTimerDisplay(): void {
        const m = Math.floor(this.remainingTimeSeconds / 60);
        const s = this.remainingTimeSeconds % 60;
        this.timerDisplay = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    get currentQuestion(): Question | null {
        return this.questions[this.currentIndex] || null;
    }

    get isLast(): boolean {
        return this.currentIndex >= this.totalQuestions - 1;
    }

    get progressPercent(): number {
        return ((this.currentIndex + 1) / this.totalQuestions) * 100;
    }

    selectAnswer(option: string): void {
        if (this.answerChecked) return;
        this.selectedOption = option;

        const q = this.currentQuestion;
        if (!q || !this.challenge) return;

        const backendQ = this.challenge.questions.find(bq => bq.questionId === q.id);
        const selectedOpt = backendQ?.options.find(o => o.optionText === option);

        this.questionAnswers[q.id] = {
            selected: option,
            correct: false,
            selectedOptionId: selectedOpt?.optionId || null
        };
    }

    onCheck(): void {
        if (!this.selectedOption || !this.currentQuestion) return;

        this.answerChecked = true;
        this.isCorrect = this.selectedOption === this.currentQuestion.correctAnswer;
        this.questionAnswers[this.currentQuestion.id].correct = this.isCorrect;
        this.showPopup = true;
    }

    onNext(): void {
        this.showPopup = false;

        if (this.isLast) {
            this.submitAnswers();
            return;
        }

        this.currentIndex++;
        this.resetForNextQuestion();
    }

    private resetForNextQuestion(): void {
        this.selectedOption = null;
        this.answerChecked = false;
        this.isCorrect = false;
        this.showHint = false;
        this.currentHintText = '';
    }

    toggleHint(): void {
        if (this.isHintLoading || this.hintsUsed >= this.maxHints || !this.challenge) return;

        this.isHintLoading = true;
        this.learningService.useHint(this.challenge.challengeId).subscribe({
            next: (res) => {
                this.currentHintText = res.hint;
                this.hintsUsed = res.hintCount;
                this.showHint = true;
                this.isHintLoading = false;
            },
            error: () => {
                this.isHintLoading = false;
                // Fallback to local hint
                if (this.currentQuestion?.hint) {
                    this.currentHintText = this.currentQuestion.hint;
                    this.showHint = true;
                    this.hintsUsed++;
                }
            }
        });
    }

    private submitAnswers(): void {
        if (!this.challenge || this.isSubmitting) return;

        this.isSubmitting = true;
        this.stopTimer();

        const questionAnswers: Record<string, string> = {};
        const skippedQuestions: string[] = [];

        this.questions.forEach(q => {
            const ans = this.questionAnswers[q.id];
            if (ans.selected) {
                questionAnswers[q.id.toString()] = ans.selected;
            } else {
                skippedQuestions.push(q.id.toString());
            }
        });

        const payload = {
            questionAnswers,
            timeTaken: this.totalTimeSeconds - this.remainingTimeSeconds,
            skippedQuestions
        };

        this.learningService.submitChallenge(this.challenge.challengeId, payload).subscribe({
            next: (response) => {
                this.moodService.refreshRewardStats();
                this.router.navigate(['/home/learning/result', this.challenge!.challengeId], {
                    state: { submissionResult: response, challenge: this.challenge, timeTaken: payload.timeTaken }
                });
                this.isSubmitting = false;
            },
            error: () => {
                this.isSubmitting = false;
                alert('Failed to submit. Please try again.');
            }
        });
    }

    onCancel(): void {
        this.showLeavePopup = true;
    }

    confirmLeave(): void {
        this.stopTimer();
        this.goBack();
    }

    cancelLeave(): void {
        this.showLeavePopup = false;
    }

    restartQuiz(): void {
        this.showTimeUpPopup = false;
        this.currentIndex = 0;
        this.hintsUsed = 0;
        this.resetForNextQuestion();
        this.remainingTimeSeconds = this.totalTimeSeconds;
        this.updateTimerDisplay();
        this.startTimer();
    }

    goBack(): void {
        this.router.navigate(['/home/learning']);
    }
}
