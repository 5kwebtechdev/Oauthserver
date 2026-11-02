import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { SupremePetComponent } from '../superme-pet/superme-pet.component';
import { PetBubbleConfig, BubblePosition } from './pet-bubble.types';

@Component({
  selector: 'superme-pet-bubble',
  standalone: true,
  imports: [NgClass, NgIf, SupremePetComponent],
  templateUrl: './superme-pet-bubble.component.html',
  styleUrls: ['./superme-pet-bubble.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SupremePetBubbleComponent {
  @Input() petName: string = '';
  @Input() petType: 'panda' | 'dragon' | 'llama' | 'owl' = 'panda';
  @Input() petMood: 'happy' | 'playful' | 'curious' | 'base' | 'tired' | 'anger' = 'base';
  @Input() petAge: number = 1;
  @Input() message: string = '';
  @Input() bubblePosition: BubblePosition = 'center';
  @Input() petImageSize: number = 62;
  /** Explicit image dimensions (optional). If provided, `petImageHeight` is forwarded to `superme-pet`'s `size` input
   * and width/height are enforced via component styles. Defaults match Figma: 107x168.
   */
  @Input() petImageWidth: number = 107;
  @Input() petImageHeight: number = 168;
  @Input() animated: boolean = false;
  @Input() clickable: boolean = false;
  /** When true, render the text bubble first (left) and the pet on the right. */
  @Input() bubbleFirst: boolean = true;

  @Output() petClick = new EventEmitter<void>();
  @Output() bubbleClick = new EventEmitter<void>();

  constructor(private cdr: ChangeDetectorRef) {}

  onPetClick(): void {
    if (this.clickable) {
      this.petClick.emit();
      this.cdr.markForCheck();
    }
  }

  onBubbleClick(): void {
    this.bubbleClick.emit();
    this.cdr.markForCheck();
  }

  getPetBubbleClass(): Record<string, boolean> {
    return {
      'pet-bubble-container': true,
      'bubble-first': this.bubbleFirst,
      'pet-first': !this.bubbleFirst,
      'position-top': this.bubblePosition === 'top',
      'position-center': this.bubblePosition === 'center',
      'position-bottom': this.bubblePosition === 'bottom',
      'clickable': this.clickable
    };
  }

  getTailClass(): Record<string, boolean> {
    return {
      'bubble-tail': true,
      'tail-top': this.bubblePosition === 'top',
      'tail-center': this.bubblePosition === 'center',
      'tail-bottom': this.bubblePosition === 'bottom'
    };
  }
}
