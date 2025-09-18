import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-content-articles',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './content-articles.component.html',
  styleUrls: ['./content-articles.component.scss']
})
export class ContentArticlesComponent implements OnInit {
  @Input() data: any;
  @Output() open = new EventEmitter<any>();

  defaultData = {
    title: '5 Science-Backed Study Hacks That Actually Work',
    category: 'Academic Performance',
    description: 'Boost focus and retention in 10 minutes or less. Backed by standford researchers.',
    image: '/assets/app-assets/Flux_Dev_a_mesmerizing_surreal_and_vibrantly_colored_cinematic_2 1.svg',
    rewards: {
      points: 20,
      trophies: 0
    },
    durationLabel: 'Read 5 min'
  };

  articles = [
    this.defaultData,
    {
      title: 'Mindfulness for beginners',
      category: 'Wellness',
      description: 'Simple daily exercises to reduce stress and improve focus',
      image: '/assets/app-assets/Flux_Dev_a_mesmerizing_surreal_and_vibrantly_colored_cinematic_2 1.svg',
      rewards: { points: 30, trophies: 1 },
      durationLabel: 'Read 5 min'
    },
    {
      title: '5 Science-Backed Study Hacks That Actually Work',
      category: 'Academic Performance',
      description: 'Boost focus and retention in 10 minutes or less. Backed by standford researchers.',
      image: '/assets/app-assets/Flux_Dev_a_mesmerizing_surreal_and_vibrantly_colored_cinematic_2 1.svg',
      rewards: { points: 25, trophies: 0 },
      durationLabel: 'Read 5 min'
    }
  ];

  onOpen(article: any){
    this.open.emit(article);
  }

  constructor() { }

  ngOnInit(): void {
  }

}
