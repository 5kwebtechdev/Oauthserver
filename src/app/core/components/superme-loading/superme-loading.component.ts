import { Component, Input, ChangeDetectionStrategy, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, combineLatest, BehaviorSubject, Subscription } from 'rxjs';
import { map, startWith, distinctUntilChanged } from 'rxjs/operators';
import { LoadingService } from '../../services/loading.service';

@Component({
    selector: 'app-superme-loading',
    template: `
<div class="mb-loader-overlay" *ngIf="(visible$ | async)" role="status" aria-live="polite" aria-label="Loading">
    <div class="mb-loader" [style.width.px]="size" [style.height.px]="size">
        <div class="mb-dot-wrap">
            <div class="mb-dot mb-dot--yellow" aria-hidden="true"></div>
        </div>
        <div class="mb-dot-wrap">
            <div class="mb-dot mb-dot--blue" aria-hidden="true"></div>
        </div>
        <div class="mb-dot-wrap">
            <div class="mb-dot mb-dot--red" aria-hidden="true"></div>
        </div>
        <div class="mb-dot-wrap">
            <div class="mb-dot mb-dot--green" aria-hidden="true"></div>
        </div>
    </div>

    <div *ngIf="(message$ | async) as msg" class="mb-loader-message">{{ msg }}</div>
</div>
    `,
    styles: [`
.mb-loader-overlay {
    position: fixed;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: rgba(0, 0, 0, 0.55);
    z-index: 99999;
    pointer-events: auto;
    padding: 12px;
}

.mb-loader {
    position: relative;
    display: inline-block;
    margin: 0 auto;
    width: var(--mb-loader-size, 88px);
    height: var(--mb-loader-size, 88px);
    min-width: 44px;
    min-height: 44px;
}

.mb-dot-wrap {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 80%;
    height: 80%;
    transform: translate(-50%, -50%) rotate(45deg);
    transform-origin: center;
}

.mb-dot {
    width: 60%;
    height: 60%;
    border-radius: 10px;
    position: absolute;
    top: 0;
    left: 0;
    will-change: transform;
    animation: mb-move 2s cubic-bezier(.2, .9, .2, .9) infinite;
}

.mb-dot--yellow {
    background-color: #fac681;
    animation-delay: 0s;
}

.mb-dot--blue {
    background: #989bee;
    animation-delay: -0.5s;
}

.mb-dot--red {
    background: #f4b6bc;
    animation-delay: -1s;
}

.mb-dot--green {
    background: #87abac;
    animation-delay: -1.5s;
}

@keyframes mb-move {
    0% {
        transform: translate(0, 0) scale(1);
    }

    25% {
        transform: translate(100%, 0) scale(0.6);
    }

    50% {
        transform: translate(100%, 100%) scale(1);
    }

    75% {
        transform: translate(0, 100%) scale(0.6);
    }

    100% {
        transform: translate(0, 0) scale(1);
    }
}

.mb-loader-message {
    color: #ffffff;
    font-size: 0.9rem;
    text-align: center;
    opacity: 0.95;
    max-width: 80vw;
}

@media (max-width: 420px) {
    .mb-loader-message {
        font-size: 0.85rem;
    }
}
    `],
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupermeLoadingComponent {
    private _inputVisible$ = new BehaviorSubject<boolean>(false);
    private _forceHide$ = new BehaviorSubject<boolean>(false);
    private _showSub: Subscription | undefined;
    private _timerId: any;

    @Input()
    set visible(v: boolean) {
        this._inputVisible$.next(!!v);
    }

    @Input() size = 100;

    private _inputMessage$ = new BehaviorSubject<string | undefined>(undefined);
    @Input()
    set message(v: string | undefined) {
        this._inputMessage$.next(v);
    }

    visible$: Observable<boolean>;
    message$: Observable<string | undefined>;

    constructor(private loading: LoadingService) {

        const showState$ = combineLatest([
            this._inputVisible$.asObservable().pipe(startWith(false)),
            this.loading.isLoading$.pipe(startWith(false))
        ]).pipe(map(([i, s]) => !!i || !!s), distinctUntilChanged());

        // visible when either input or service requests loading AND not force-hidden
        this.visible$ = combineLatest([showState$, this._forceHide$.asObservable().pipe(startWith(false))]).pipe(
            map(([show, forceHide]) => show && !forceHide)
        );

        // subscribe to show state to start/clear the 15s auto-hide timer
        this._showSub = showState$.subscribe(show => {
            if (show) {
                // reset any previous forced hide and timer
                this._forceHide$.next(false);
                if (this._timerId) { clearTimeout(this._timerId); }
                this._timerId = setTimeout(() => this._forceHide$.next(true), 15000);
            } else {
                // not showing -> clear timer and ensure forceHide reset
                if (this._timerId) { clearTimeout(this._timerId); this._timerId = undefined; }
                this._forceHide$.next(false);
            }
        });

        this.message$ = combineLatest([
            this._inputMessage$.asObservable().pipe(startWith(undefined)),
            this.loading.message$.pipe(startWith(undefined))
        ]).pipe(map(([inputMsg, svcMsg]) => inputMsg ?? svcMsg));
    }

    ngOnDestroy(): void {
        if (this._showSub) { this._showSub.unsubscribe(); }
        if (this._timerId) { clearTimeout(this._timerId); this._timerId = undefined; }
    }
}
