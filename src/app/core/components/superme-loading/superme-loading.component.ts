import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, combineLatest, BehaviorSubject } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { LoadingService } from '../../services/loading.service';

@Component({
    selector: 'app-superme-loading',
    templateUrl: './superme-loading.component.html',
    styleUrls: ['./superme-loading.component.scss'],
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SupermeLoadingComponent {
    private _inputVisible$ = new BehaviorSubject<boolean>(false);

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

        this.visible$ = combineLatest([
            this._inputVisible$.asObservable().pipe(startWith(false)),
            this.loading.isLoading$.pipe(startWith(false))
        ]).pipe(map(([i, s]) => !!i || !!s));

        this.message$ = combineLatest([
            this._inputMessage$.asObservable().pipe(startWith(undefined)),
            this.loading.message$.pipe(startWith(undefined))
        ]).pipe(map(([inputMsg, svcMsg]) => inputMsg ?? svcMsg));
    }
}
