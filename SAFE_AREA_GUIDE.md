# Safe Area Implementation Guide

This document outlines the safe area handling implementation for the Superme mobile app. Safe areas are crucial for mobile apps, especially on devices with notches, dynamic islands, rounded corners, and home indicators.

## Overview

Safe areas ensure your app's content doesn't get hidden behind:
- **iOS**: Notch, Dynamic Island, home indicator, rounded corners
- **Android**: Status bar, navigation bar, gesture navigation area

## Implementation Details

### 1. HTML Meta Viewport (src/index.html)
```html
<meta name="viewport" 
  content="viewport-fit=cover, width=device-width, initial-scale=1.0, 
  minimum-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```

The `viewport-fit=cover` tells the browser to extend content to the screen edges, then CSS environment variables handle the actual safe padding.

### 2. CSS Environment Variables

Safe area environment variables are natively supported by modern browsers:
- `env(safe-area-inset-top)` - Space for notch/status bar
- `env(safe-area-inset-bottom)` - Space for home indicator
- `env(safe-area-inset-left)` - Space for rounded corners/side notches
- `env(safe-area-inset-right)` - Space for rounded corners/side notches

### 3. Global Safe Area Styles (src/global.scss)

#### Root HTML Element
```scss
html {
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

#### Fixed Elements
- **Headers** (`typical-header`, `header`, `[class*="header"]`): Added safe area padding to top and sides
- **Footers** (`footer`, `footer-component`, `[class*="footer"]`): Added safe area padding to bottom and sides

#### Ion-Content
The ion-content component has comprehensive safe area handling:
- Top padding includes safe-area-inset-top
- Left/right padding for side safe areas
- Bottom padding accounts for footer and safe areas

#### Page Containers
The `.mindful-page-container` class applies safe area padding on all sides:
```scss
padding-top: calc(20px + env(safe-area-inset-top));
padding-bottom: calc(20px + env(safe-area-inset-bottom));
padding-left: calc(20px + env(safe-area-inset-left));
padding-right: calc(20px + env(safe-area-inset-right));
```

### 4. Component-Specific Implementations

#### Footer Component (src/app/core/components/footer/footer.component.scss)
- Added `padding-bottom: env(safe-area-inset-bottom)` for home indicator
- Added left/right padding for side safe areas
- Uses `box-sizing: border-box` to ensure safe area doesn't increase total width

### 5. Status Bar Configuration (src/app/app.component.ts)

The app initializes the Capacitor StatusBar for native platforms:
```typescript
private initializeStatusBar(): void {
  this.platform.ready().then(() => {
    if (this.platform.is('ios') || this.platform.is('android')) {
      StatusBar.setStyle({ style: 'LIGHT' });
      StatusBar.setBackgroundColor({ color: '#FFE9D6' });
      StatusBar.show();
    }
  });
}
```

This ensures the status bar is properly configured and visible, allowing the browser to correctly calculate safe area insets.

## Safe Area Fallbacks

For browsers/devices that don't support safe area insets, the CSS uses standard padding values as fallbacks:
```scss
padding-top: calc(20px + env(safe-area-inset-top, 0px));
```

If `env(safe-area-inset-top)` is 0 or unsupported, the padding defaults to the calculated value.

## Testing Safe Area Implementation

### iOS Testing
1. Run on iPhone with notch/Dynamic Island
2. Open app and verify:
   - Content doesn't go behind notch
   - Footer doesn't overlap home indicator
   - Text remains readable in all areas

### Android Testing
1. Run on device with navigation bar
2. Verify:
   - Content stays above navigation bar
   - Footer properly accounts for gesture navigation area
   - Landscape mode displays correctly

### Browser DevTools Testing
In Chrome DevTools:
1. Open Device Emulation (Ctrl+Shift+M)
2. Select device like "iPhone 14 Pro"
3. Check that content respects safe areas in the device frame

## Common Scenarios Handled

### 1. Full-Screen Content
```scss
.bg-mindful-primary {
  min-height: 100vh;
  min-height: 100dvh; /* dynamic viewport height */
  width: 100vw;
  padding-top: env(safe-area-inset-top);
}
```

### 2. Fixed Headers/Footers
```scss
.typical-header {
  position: fixed;
  top: 0;
  padding-top: env(safe-area-inset-top);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}
```

### 3. Modals/Popovers
```scss
ion-modal, ion-popover {
  ::part(backdrop) {
    padding: env(safe-area-inset-top) env(safe-area-inset-right) 
             env(safe-area-inset-bottom) env(safe-area-inset-left);
  }
}
```

## Responsive Breakpoints

The safe area padding is maintained across all responsive breakpoints:
```scss
@media (max-width: 480px) {
  .mindful-page-container {
    padding: 16px;
    padding-top: calc(16px + env(safe-area-inset-top));
    /* ... */
  }
}
```

## Best Practices

1. **Always use `box-sizing: border-box`** on elements with safe area padding to prevent layout shifts
2. **Test on physical devices** - Safe area values vary by device
3. **Consider landscape orientation** - Safe area values change in landscape
4. **Don't hardcode values** - Use CSS environment variables instead
5. **Provide fallbacks** - Use calc() with default values for unsupported browsers
6. **Update native configs** - Keep Capacitor plugins updated for accurate safe area reporting

## Browser Support

Safe area CSS environment variables are supported on:
- iOS Safari 11.2+
- Android Chrome 69+
- Edge 79+
- Most modern mobile browsers

For older devices, the CSS fallback padding ensures content remains visible.

## Troubleshooting

### Content hidden behind notch
- Check if `viewport-fit=cover` is in HTML
- Verify `padding-top: env(safe-area-inset-top)` is applied
- Ensure StatusBar is initialized on native platforms

### Footer overlapping home indicator
- Add `padding-bottom: env(safe-area-inset-bottom)` to footer
- Use `box-sizing: border-box` on footer element
- Check footer z-index doesn't interfere with navigation

### Excessive padding on unsupported devices
- Safe area insets default to 0 on unsupported devices
- Check CSS fallback values are appropriate
- Test on multiple device types

## Resources

- [CSS Safe Area Documentation](https://www.w3.org/TR/css-round-display-1/#safe-area-insets)
- [Capacitor StatusBar Plugin](https://capacitorjs.com/docs/apis/status-bar)
- [iOS Safe Area Guide](https://developer.apple.com/design/human-interface-guidelines/ios/visual-design/adaptivity-and-layout)
- [Android Safe Insets](https://developer.android.com/develop/ui/views/layout/edge-to-edge#request-edge-to-edge)
