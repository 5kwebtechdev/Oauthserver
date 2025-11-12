import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { TrophiesListComponent } from '../trophies-list/trophies-list.component';
import { TrophyService } from '../trophy.service';
import { Trophy } from '../models/trophy.model';
import { MindfulCardHeaderComponent } from '../../mindful-navigator/mindful-card-header/mindful-card-header.component';
import { Location } from '@angular/common';

@Component({
  selector: 'app-trophy-page',
  standalone: true,
  imports: [CommonModule, IonicModule, TrophiesListComponent, MindfulCardHeaderComponent],
  templateUrl: './trophy-page.component.html',
  styleUrls: ['./trophy-page.component.scss']
})
export class TrophyPageComponent implements OnInit {
  pageTitle = 'Your Trophy Trail';
  grouped: { title: string; items: Trophy[] }[] = [];
  trophyCount: number = 0;

  constructor(private trophyService: TrophyService, private location: Location) {}

  ngOnInit(): void {
    this.trophyService.fetchTrophies().then(list => {
      this.trophyCount = list.length;
      const map = new Map<string, Trophy[]>();
      for (const t of list) {
        const key = t.earnedOn.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(t);
      }
      // convert to array sorted by newest month
      this.grouped = Array.from(map.entries()).map(([title, items]) => ({ title, items }));
      this.grouped.sort((a,b) => new Date(b.items[0].earnedOn).getTime() - new Date(a.items[0].earnedOn).getTime());
    });
  }

  onBack() {
    this.location.back();
  }
}
