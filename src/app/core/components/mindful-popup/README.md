# Mindful Popup Component

A highly reusable and dynamic popup component for the MindfulBuddy app.

## Features

- ✅ Dynamic content (image, heading, subtitle)
- ✅ Configurable CTAs (1 or 2 buttons)
- ✅ Share button option
- ✅ Close button option
- ✅ Backdrop overlay with blur
- ✅ Responsive design
- ✅ Smooth animations
- ✅ TypeScript interfaces
- ✅ Flexible configuration

## Usage

### 1. Import the module

```typescript
import { MindfulPopupModule } from '../core/components/mindful-popup';

@NgModule({
  imports: [MindfulPopupModule]
})
export class YourModule { }
```

### 2. Basic Usage

```html
<app-mindful-popup 
  [isVisible]="showPopup"
  heading="Welcome!"
  subtitle="Get ready for your mindful journey"
  image="assets/images/welcome.png"
  [primaryCTA]="{ text: 'Get Started' }"
  (primaryAction)="onGetStarted()"
  (closeAction)="hidePopup()">
</app-mindful-popup>
```

### 3. Advanced Configuration

```typescript
export class YourComponent {
  showPopup = false;
  
  popupConfig: MindfulPopupConfig = {
    image: 'assets/images/celebration.png',
    imageAlt: 'Celebration',
    heading: 'Congratulations!',
    subtitle: 'You've completed your daily mindfulness practice',
    primaryCTA: {
      text: 'Continue',
      type: 'primary'
    },
    secondaryCTA: {
      text: 'Share Progress',
      type: 'secondary'
    },
    showShareButton: true,
    showCloseButton: true,
    backdrop: true
  };

  onPrimaryAction() {
    // Handle primary action
    this.showPopup = false;
  }

  onSecondaryAction() {
    // Handle secondary action
  }

  onShare() {
    // Handle share action
  }
}
```

```html
<app-mindful-popup 
  [config]="popupConfig"
  [isVisible]="showPopup"
  (primaryAction)="onPrimaryAction()"
  (secondaryAction)="onSecondaryAction()"
  (shareAction)="onShare()"
  (closeAction)="showPopup = false">
</app-mindful-popup>
```

## API Reference

### Interfaces

#### MindfulPopupConfig
```typescript
interface MindfulPopupConfig {
  image?: string;           // Image URL
  imageAlt?: string;        // Image alt text
  heading?: string;         // Main heading
  subtitle?: string;        // Subtitle text
  primaryCTA?: MindfulPopupCTA;
  secondaryCTA?: MindfulPopupCTA;
  showShareButton?: boolean;
  showCloseButton?: boolean;
  backdrop?: boolean;       // Show backdrop overlay
}
```

#### MindfulPopupCTA
```typescript
interface MindfulPopupCTA {
  text: string;            // Button text
  action?: string;         // Action identifier
  callback?: () => void;   // Direct callback function
  type?: 'primary' | 'secondary';
  disabled?: boolean;
}
```

### Inputs

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `config` | `MindfulPopupConfig` | `{}` | Complete configuration object |
| `isVisible` | `boolean` | `false` | Controls popup visibility |
| `image` | `string` | - | Image URL (alternative to config) |
| `imageAlt` | `string` | `'Mindful Buddy'` | Image alt text |
| `heading` | `string` | - | Main heading text |
| `subtitle` | `string` | - | Subtitle text |
| `primaryCTA` | `MindfulPopupCTA` | - | Primary action button |
| `secondaryCTA` | `MindfulPopupCTA` | - | Secondary action button |
| `showShareButton` | `boolean` | `false` | Show share button |
| `showCloseButton` | `boolean` | `true` | Show close button |
| `backdrop` | `boolean` | `true` | Show backdrop overlay |

### Outputs

| Event | Description |
|-------|-------------|
| `primaryAction` | Emitted when primary CTA is clicked |
| `secondaryAction` | Emitted when secondary CTA is clicked |
| `shareAction` | Emitted when share button is clicked |
| `closeAction` | Emitted when close button is clicked |
| `backdropClick` | Emitted when backdrop is clicked |

### Methods

| Method | Description |
|--------|-------------|
| `show()` | Show the popup |
| `hide()` | Hide the popup |
| `toggle()` | Toggle popup visibility |

## Layout Variations

### Single CTA
When only one CTA is provided, it displays as a full-width button.

### Two CTAs  
When both primary and secondary CTAs are provided, they display side by side with equal width.

### Content Only
Can be used with just content (image, heading, subtitle) without any CTAs.

### Share Button
The share button appears as a small icon button below the CTAs when enabled.

## Styling

The component follows the provided CSS specifications:
- Main container: `display: inline-flex; padding: 12px 24px; flex-direction: column; justify-content: center; align-items: center; gap: 24px;`
- Content section: Same layout with image (96px × 88px), heading (Fredoka, 16px), and subtitle (Nunito, 13px)
- CTA layouts: Full width for single, side-by-side with 24px gap for dual
- Backdrop: Linear gradient overlay with blur effect

## Examples

### Success Message
```typescript
const successConfig = {
  image: 'assets/icons/success.svg',
  heading: 'Well Done!',
  subtitle: 'You have successfully completed today\'s challenge',
  primaryCTA: { text: 'Continue' }
};
```

### Confirmation Dialog
```typescript
const confirmConfig = {
  heading: 'Are you sure?',
  subtitle: 'This action cannot be undone',
  primaryCTA: { text: 'Yes, Delete', type: 'primary' },
  secondaryCTA: { text: 'Cancel', type: 'secondary' },
  showCloseButton: false
};
```

### Share Achievement
```typescript
const shareConfig = {
  image: 'assets/images/achievement-badge.png',
  heading: 'Achievement Unlocked!',
  subtitle: 'Share your progress with friends',
  primaryCTA: { text: 'Continue' },
  showShareButton: true
};
```