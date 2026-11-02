/**
 * Pet Bubble Component Types and Interfaces
 */

export interface PetBubbleConfig {
  petName: string;
  petType: 'panda' | 'dragon' | 'llama' | 'owl';
  petMood?: 'happy' | 'playful' | 'curious' | 'base' | 'tired' | 'anger';
  petAge?: number;
  message: string;
  bubblePosition?: 'top' | 'center' | 'bottom';
  petImageSize?: number;
}

export type BubblePosition = 'top' | 'center' | 'bottom';
