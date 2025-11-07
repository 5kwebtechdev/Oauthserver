# Avatar Implementation Guide

## Overview
This guide documents the centralized avatar management system implemented across the MindfulBuddy app.

## What Was Implemented

### 1. User Service (`src/app/core/services/user.service.ts`)
A centralized service to manage user profile data including avatar across the entire application.

**Key Features:**
- Stores user profile in localStorage for persistence
- Provides Observable stream for reactive updates
- Manages avatar URL mapping from selection to actual image paths
- Handles user profile CRUD operations

**Key Methods:**
- `getUserProfile$()` - Observable stream of user profile
- `getUserAvatarUrl()` - Returns current user's avatar URL
- `updateUserAvatar(avatarUrl, avatarName)` - Update user avatar
- `setUserProfile(profile)` - Set complete user profile
- `loadFromSignupSession()` - Load profile from signup session storage

### 2. Updated Components

#### User Dashboard (`src/app/authenticated/user-dashboard/`)
- **TypeScript**: Injects `UserService` and subscribes to user profile changes
- **HTML**: Uses `[src]="userAvatarUrl"` binding for dynamic avatar display
- Avatar automatically updates when user profile changes

#### Streaks List (`src/app/core/components/streaks-section/streaks-list/`)
- Injects `UserService` to get current user's avatar
- Updates "You" item in leaderboard with user's actual avatar
- Subscribes to profile changes for real-time updates

#### User Profile (`src/app/core/components/user-profile/`)
- Uses `UserService` to display current user avatar
- Automatically updates when profile changes
- Provides consistent avatar display across profile views

#### Signup Component (`src/app/home/signup/`)
- Saves selected avatar to `UserService` after successful registration
- Maps avatar selection number to actual image URL
- Persists avatar data for use throughout the app

## How It Works

### Avatar Selection Flow
1. User selects avatar during signup (step 2)
2. Avatar selection stored in `sessionStorage` as `signup_avatar`
3. On registration success, avatar saved to `UserService`
4. `UserService` maps avatar number to actual image path
5. Avatar URL stored in localStorage for persistence

### Avatar Display Flow
1. Components inject `UserService`
2. Subscribe to `getUserProfile$()` observable
3. Call `getUserAvatarUrl()` to get current avatar
4. Bind avatar URL to `<img [src]="userAvatarUrl">`
5. Avatar updates automatically when profile changes

## Avatar URL Mapping

Avatar images follow this naming convention:
```
/assets/Images-Transparent/Image-Onboarding-Avatar-{Gender}{Number}.png
```

Examples:
- Male avatar 1: `/assets/Images-Transparent/Image-Onboarding-Avatar-Male1.png`
- Female avatar 2: `/assets/Images-Transparent/Image-Onboarding-Avatar-Female2.png`

## Usage in New Components

To use user avatar in any component:

```typescript
import { UserService } from '../../core/services/user.service';

export class YourComponent implements OnInit {
  userAvatarUrl: string = '';
  
  constructor(private userService: UserService) {}
  
  ngOnInit() {
    // Get current avatar
    this.userAvatarUrl = this.userService.getUserAvatarUrl();
    
    // Subscribe to changes (optional)
    this.userService.getUserProfile$().subscribe(profile => {
      if (profile) {
        this.userAvatarUrl = this.userService.getUserAvatarUrl();
      }
    });
  }
}
```

In template:
```html
<img [src]="userAvatarUrl" alt="User avatar">
```

## Default Avatars

If no avatar is selected, the service returns defaults based on gender:
- Male: `/assets/Images-Transparent/Image-Onboarding-Avatar-Male1.png`
- Female: `/assets/Images-Transparent/Image-Onboarding-Avatar-Female1.png`
- Unknown: `/assets/app-assets/Default-avatar-home.svg`

## Persistence

User profile (including avatar) is stored in:
- **localStorage** key: `user_profile`
- **Format**: JSON object with UserProfile interface
- **Cleared on**: Logout via `clearUserProfile()`

## Integration Points

The avatar system integrates with:
1. **Signup flow** - Avatar selection and storage
2. **Dashboard** - User profile display
3. **Leaderboards** - User identification in streaks
4. **Profile pages** - Avatar display and editing
5. **Navigation** - User avatar in headers/menus

## Known Issues to Fix

The signup component (`src/app/home/signup/signup.component.ts`) has duplicate code that needs cleanup:
- Lines 978-1367 contain duplicate method implementations
- The `calculateAge()` method at line 621 is incomplete
- There's corrupted code between lines 625-658

**To fix**: Remove duplicate methods and complete the `calculateAge()` implementation.

## Next Steps

1. Clean up signup component duplicate code
2. Add avatar upload functionality (optional)
3. Implement avatar editing in profile page
4. Add avatar validation (file size, format)
5. Consider CDN storage for user-uploaded avatars
