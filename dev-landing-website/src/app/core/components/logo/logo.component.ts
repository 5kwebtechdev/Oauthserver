import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-logo',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './logo.component.html',
    styleUrls: ['./logo.component.scss']
})
export class LogoComponent {
    @Input() appName = 'SuperMe App';
    @Input() tagline = 'SuperApp for the SuperYou';
    /** Optional HTML subtitle (allows <span> or other inline markup). Use with caution. */
    @Input() taglineHtml?: string | null = null;
}
