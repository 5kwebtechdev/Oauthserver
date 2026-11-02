import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
    providedIn: 'root'
})
export class NavigationContextService {
    private contextStack: any[] = [];

    constructor(private router: Router) { }

    popContext(): any {
        return this.contextStack.pop();
    }

    pushContext(context: any): void {
        this.contextStack.push(context);
    }

    navigateBack(data?: any): void {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            this.router.navigate(['/home'], { queryParams: { view: 'day' } });
        }
    }
}
