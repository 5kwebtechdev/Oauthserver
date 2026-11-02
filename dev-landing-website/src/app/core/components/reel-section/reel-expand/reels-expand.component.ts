import { CommonModule } from '@angular/common';
import { Component, ChangeDetectionStrategy, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FooterComponent } from '../../footer/footer.component';

interface ReelStats {
  likes: number;
  comments: number;
  saves: number;
  views: number;
}

interface ReelAuthor {
  id: string;
  name: string;
  avatarUrl: string;
  role: string;
}

interface ReelComment {
  id: string;
  authorName: string;
  authorAvatar: string;
  message: string;
  postedAgo: string;
  isCreator: boolean;
}

interface ReelRecommendation {
  id: string;
  title: string;
  thumbnailUrl: string;
  duration: string;
  ownerId: string;
}

interface ReelDetail {
  id: string;
  ownerId: string;
  title: string;
  subtitle: string;
  description: string;
  duration: string;
  videoUrl: string;
  posterUrl: string;
  createdAt: string;
  tags: string[];
  author: ReelAuthor;
  stats: ReelStats;
  comments: ReelComment[];
  recommendations: ReelRecommendation[];
}

const CURRENT_USER_ID = 'user-001';

const REEL_LIBRARY: Record<string, ReelDetail> = {
  'science-volcano': {
    id: 'science-volcano',
    ownerId: CURRENT_USER_ID,
    title: 'Build Your Own Magical Volcano',
    subtitle: 'Turn a science project into a dazzling lava show',
    description:
      'Collect everyday kitchen ingredients and learn the basics of chemical reactions! This project walks you through safe steps to create a foaming lava volcano that you can show off to friends and family.',
    duration: '01:12',
  videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  posterUrl: '/assets/images/Image-Reel-Random.jpg',
    createdAt: '2025-09-12T16:05:00.000Z',
    tags: ['science', 'DIY', 'experiments'],
    author: {
      id: CURRENT_USER_ID,
      name: 'Aanya Patel',
  avatarUrl: '/assets/images/panda.png',
      role: 'Junior Scientist'
    },
    stats: {
      likes: 12540,
      comments: 284,
      saves: 7120,
      views: 98210
    },
    comments: [
      {
        id: 'c1',
        authorName: 'Marco',
  authorAvatar: '/assets/images/Digital-pet-panda.png',
        message: 'We tried this in our science club and it totally worked! Thanks for the clear steps.',
        postedAgo: '2h ago',
        isCreator: false
      },
      {
        id: 'c2',
        authorName: 'Aanya',
  authorAvatar: '/assets/images/panda.png',
        message: 'Love seeing everyone’s volcanoes! Share photos in the community feed!',
        postedAgo: '1h ago',
        isCreator: true
      },
      {
        id: 'c3',
        authorName: 'Sia',
  authorAvatar: '/assets/images/panda-family.png',
        message: 'Added glitter to mine and it looked amazing ✨',
        postedAgo: '20m ago',
        isCreator: false
      }
    ],
    recommendations: [
      {
        id: 'craft-kaleidoscope',
        title: 'DIY Kaleidoscope Magic',
  thumbnailUrl: '/assets/images/article-image.png',
        duration: '00:54',
        ownerId: 'user-002'
      },
      {
        id: 'nature-rainbow',
        title: 'Catch Rainbows Indoors',
  thumbnailUrl: '/assets/images/quiz-image.png',
        duration: '00:41',
        ownerId: 'user-003'
      },
      {
        id: 'robot-friends',
        title: 'Cardboard Robot Buddies',
  thumbnailUrl: '/assets/images/quiz-image.png',
        duration: '01:05',
        ownerId: CURRENT_USER_ID
      }
    ]
  },
  'craft-kaleidoscope': {
    id: 'craft-kaleidoscope',
    ownerId: 'user-002',
    title: 'DIY Kaleidoscope Magic',
    subtitle: 'Turn household items into mesmerizing designs',
    description:
      'Learn how to build a colorful kaleidoscope with cardboard rolls, foil, and beads. Follow along for a fun art-meets-science activity that you can finish in under 10 minutes!',
    duration: '00:54',
  videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  posterUrl: '/assets/images/Image-Reel-Random.jpg',
    createdAt: '2025-10-02T09:45:00.000Z',
    tags: ['art', 'crafts'],
    author: {
      id: 'user-002',
      name: 'Leo Chen',
  avatarUrl: '/assets/images/Digital-pet-panda.png',
      role: 'Maker'
    },
    stats: {
      likes: 8450,
      comments: 120,
      saves: 4210,
      views: 56300
    },
    comments: [
      {
        id: 'c4',
        authorName: 'Aanya',
  authorAvatar: '/assets/images/panda.png',
        message: 'This is stunning Leo! Going to try remixing it with glow beads.',
        postedAgo: '3h ago',
        isCreator: false
      }
    ],
    recommendations: [
      {
        id: 'science-volcano',
        title: 'Build Your Own Magical Volcano',
  thumbnailUrl: '/assets/images/article-image.png',
        duration: '01:12',
        ownerId: CURRENT_USER_ID
      },
      {
        id: 'nature-rainbow',
        title: 'Catch Rainbows Indoors',
  thumbnailUrl: '/assets/images/quiz-image.png',
        duration: '00:41',
        ownerId: 'user-003'
      }
    ]
  },
  'nature-rainbow': {
    id: 'nature-rainbow',
    ownerId: 'user-003',
    title: 'Catch Rainbows Indoors',
    subtitle: 'Make a prism light show in your room',
    description:
      'Use a glass of water, sunlight, and a white sheet of paper to project rainbow beams onto your wall. Simple, safe, and perfect for curious minds!',
    duration: '00:41',
  videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  posterUrl: '/assets/images/Image-Reel-Random.jpg',
    createdAt: '2025-08-21T12:15:00.000Z',
    tags: ['science', 'nature'],
    author: {
      id: 'user-003',
      name: 'Mira Sharma',
  avatarUrl: '/assets/images/panda-family.png',
      role: 'Nature Explorer'
    },
    stats: {
      likes: 15320,
      comments: 312,
      saves: 8043,
      views: 120450
    },
    comments: [
      {
        id: 'c5',
        authorName: 'Zane',
  authorAvatar: '/assets/images/logout-panda.png',
        message: 'This was such a chill afternoon experiment. My cat tried to chase the rainbow!',
        postedAgo: '4h ago',
        isCreator: false
      }
    ],
    recommendations: [
      {
        id: 'science-volcano',
        title: 'Build Your Own Magical Volcano',
  thumbnailUrl: '/assets/images/article-image.png',
        duration: '01:12',
        ownerId: CURRENT_USER_ID
      }
    ]
  },
  'robot-friends': {
    id: 'robot-friends',
    ownerId: CURRENT_USER_ID,
    title: 'Cardboard Robot Buddies',
    subtitle: 'Animate cardboard with simple circuits',
    description:
      'Transform spare cardboard into robot companions with blinking lights. Learn the basics of simple circuits and let your imagination go wild!',
    duration: '01:05',
  videoUrl: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
  posterUrl: '/assets/images/Image-Reel-Random.jpg',
    createdAt: '2025-07-08T18:30:00.000Z',
    tags: ['engineering', 'DIY'],
    author: {
      id: CURRENT_USER_ID,
      name: 'Aanya Patel',
  avatarUrl: '/assets/images/panda.png',
      role: 'Junior Scientist'
    },
    stats: {
      likes: 9650,
      comments: 188,
      saves: 5210,
      views: 77200
    },
    comments: [],
    recommendations: [
      {
        id: 'science-volcano',
        title: 'Build Your Own Magical Volcano',
        thumbnailUrl: '/assets/images/Image-Reel-Random.jpg',
        duration: '01:12',
        ownerId: CURRENT_USER_ID
      }
    ]
  }
};

const FALLBACK_REEL = REEL_LIBRARY['science-volcano'];

@Component({
  selector: 'app-reels-expand',
  standalone: true,
  imports: [CommonModule, RouterModule, FooterComponent],
  templateUrl: './reels-expand.component.html',
  styleUrls: ['./reels-expand.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReelsExpandComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap
  });

  readonly reelId = computed(() => this.getReelId(this.queryParams()));
  readonly reel = computed(() => REEL_LIBRARY[this.reelId()] ?? FALLBACK_REEL);
  readonly showOptions = computed(() => this.reel().ownerId === CURRENT_USER_ID);
  readonly publishedAgo = computed(() => this.relativePublishedText(this.reel().createdAt));

  readonly isVideoMuted = signal(true);
  readonly isPlaying = signal(false);

  togglePlay(videoElement: HTMLVideoElement): void {
    if (!videoElement) {
      return;
    }

    if (videoElement.paused) {
      void videoElement
        .play()
        .then(() => this.isPlaying.set(true))
        .catch(() => this.isPlaying.set(false));
      return;
    }

    videoElement.pause();
    this.isPlaying.set(false);
  }

  toggleMute(videoElement: HTMLVideoElement): void {
    if (!videoElement) {
      return;
    }

    videoElement.muted = !videoElement.muted;
    this.isVideoMuted.set(videoElement.muted);
  }

  handlePlaybackStateChange(isPlaying: boolean): void {
    this.isPlaying.set(isPlaying);
  }

  goBack(): void {
    this.router.navigate(['/reels']);
  }

  openReel(targetId: string): void {
    if (!REEL_LIBRARY[targetId]) {
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { id: targetId },
      replaceUrl: false
    });
  }

  formattedStat(value: number): string {
    if (value >= 1000000) {
      return `${this.trimTrailingZeros(value / 1000000)}M`;
    }

    if (value >= 1000) {
      return `${this.trimTrailingZeros(value / 1000)}K`;
    }

    return value.toString();
  }

  isOwnedByMe(ownerId: string): boolean {
    return ownerId === CURRENT_USER_ID;
  }

  private getReelId(map: ParamMap): string {
    const requestedId = map.get('id');
    return requestedId && REEL_LIBRARY[requestedId] ? requestedId : FALLBACK_REEL.id;
  }

  private relativePublishedText(isoDate: string): string {
    const created = new Date(isoDate);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();

    const timeUnits: Array<[Intl.RelativeTimeFormatUnit, number]> = [
      ['year', 1000 * 60 * 60 * 24 * 365],
      ['month', 1000 * 60 * 60 * 24 * 30],
      ['week', 1000 * 60 * 60 * 24 * 7],
      ['day', 1000 * 60 * 60 * 24],
      ['hour', 1000 * 60 * 60],
      ['minute', 1000 * 60]
    ];

    for (const [unit, unitMs] of timeUnits) {
      const value = diffMs / unitMs;
      if (value >= 1) {
        return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
          -Math.round(value),
          unit
        );
      }
    }

    return 'just now';
  }

  private trimTrailingZeros(value: number): string {
    return value.toFixed(1).replace(/\.0$/, '');
  }
}
