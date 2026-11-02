import { Component, OnInit } from '@angular/core';
import { PublicNavbarComponent } from 'src/app/core/components/public-navbar/public-navbar.component';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FooterComponent } from '../../../components/footer/footer.component';
import { SupermeButtonComponent } from '../../../components/superme-button/superme-button.component';
import { LearningService } from '../learning.service';
import { Challenge } from '../learning.models';

@Component({
    selector: 'sm-learning-description',
    standalone: true,
    imports: [CommonModule, PublicNavbarComponent, FooterComponent, SupermeButtonComponent],
    templateUrl: './description-page.component.html',
    styleUrls: ['./description-page.component.scss']
})
export class DescriptionPageComponent implements OnInit {
    challenge: Challenge | null = null;
    isLoading = true;

    constructor(public router: Router, private route: ActivatedRoute, private learningService: LearningService) { }

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.learningService.fetchChallengeById(Number(id)).subscribe({
                next: (c) => { this.challenge = c; this.isLoading = false; },
                error: () => this.isLoading = false
            });
        } else {
            this.isLoading = false;
        }
    }

    startJourney(): void {
        if (this.challenge) {
            this.router.navigate(['/home/learning/questions', this.challenge.challengeId], {
                state: { challenge: this.challenge }
            });
        }
    }

    goBack(): void {
        this.router.navigate(['/home/learning']);
    }
}
