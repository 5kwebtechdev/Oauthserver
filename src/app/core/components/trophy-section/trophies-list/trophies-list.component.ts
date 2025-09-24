import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Trophy } from '../models/trophy.model';
import { TrophyService } from '../trophy.service';

@Component({
  selector: 'app-trophies-list',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './trophies-list.component.html',
  styleUrls: ['./trophies-list.component.scss']
})
export class TrophiesListComponent implements OnInit {
  @Input() items?: Trophy[];
  trophies: Trophy[] = [];

  constructor(private trophyService: TrophyService) { }

  ngOnInit(): void {
    if (this.items && this.items.length) {
      this.trophies = this.items.slice().sort((a,b) => +b.earnedOn - +a.earnedOn);
      return;
    }

    // fetch all if no items supplied
    this.trophyService.fetchTrophies().then(list => {
      this.trophies = list.sort((a,b) => +b.earnedOn - +a.earnedOn);
    });
  }
}
