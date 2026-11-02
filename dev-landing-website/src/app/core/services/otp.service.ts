import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { takeWhile } from 'rxjs/operators';

export interface OtpState {
  digits: string[];
  isComplete: boolean;
  canResend: boolean;
  timer: number;
  isTimerActive: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OtpService {
  private initialState: OtpState = {
    digits: ['', '', '', ''],
    isComplete: false,
    canResend: false,
    timer: 300, // 5 minutes
    isTimerActive: false
  };

  private otpStateSubject = new BehaviorSubject<OtpState>(this.initialState);
  public otpState$ = this.otpStateSubject.asObservable();

  private timerSubscription: Subscription | null = null;

  constructor() { }

  private updateState(newState: Partial<OtpState>): void {
    const currentState = this.otpStateSubject.value;
    this.otpStateSubject.next({ ...currentState, ...newState });
  }

  setInput(index: number, value: string): void {
    const currentState = this.otpStateSubject.value;
    const newDigits = [...currentState.digits];
    newDigits[index] = value;
    
    const isComplete = newDigits.every(digit => digit !== '');
    
    this.updateState({
      digits: newDigits,
      isComplete
    });
  }

  clearInputs(): void {
    this.updateState(this.initialState);
  }

  startTimer(): void {
    // Clear any existing timer
    this.clearTimer();
    
    this.updateState({
      canResend: false,
      timer: 300,
      isTimerActive: true
    });

    this.timerSubscription = interval(1000).pipe(
      takeWhile(() => this.otpStateSubject.value.timer > 0)
    ).subscribe(() => {
      const currentState = this.otpStateSubject.value;
      const newTimer = currentState.timer - 1;
      
      if (newTimer <= 0) {
        this.updateState({
          canResend: true,
          timer: 0,
          isTimerActive: false
        });
        this.clearTimer();
      } else {
        this.updateState({ timer: newTimer });
      }
    });
  }

  clearTimer(): void {
    if (this.timerSubscription) {
      this.timerSubscription.unsubscribe();
      this.timerSubscription = null;
    }
  }

  getOtpValue(): string {
    return this.otpStateSubject.value.digits.join('');
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }
}