import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-superme-loading',
    templateUrl: './superme-loading.component.html',
    styleUrls: ['./superme-loading.component.scss']
    ,
    standalone: true,
    imports: [CommonModule]
})
export class SupermeLoadingComponent {
    // show/hide via input
    @Input() visible = false;
    /** size in pixels (square) - controls loader width/height */
    @Input() size = 100;
    /** optional accessibility / UI message shown below the loader */
    @Input() message?: string;
}
