import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class ChildSelfImageService {
    private avatars = [
        { key: 1, gender: 'Female', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Female1.png', alt: 'Avatar 1' },
        { key: 2, gender: 'Female', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Female2.png', alt: 'Avatar 2' },
        { key: 3, gender: 'Female', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Female3.png', alt: 'Avatar 3' },
        { key: 4, gender: 'Female', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Female4.png', alt: 'Avatar 4' },
        { key: 5, gender: 'Female', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Female5.png', alt: 'Avatar 5' },
        { key: 6, gender: 'Female', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Female6.png', alt: 'Avatar 6' },
        { key: 7, gender: 'Male', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male1.png', alt: 'Avatar 7' },
        { key: 8, gender: 'Male', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male2.png', alt: 'Avatar 8' },
        { key: 9, gender: 'Male', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male3.png', alt: 'Avatar 9' },
        { key: 10, gender: 'Male', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male4.png', alt: 'Avatar 10' },
        { key: 11, gender: 'Male', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male5.png', alt: 'Avatar 11' },
        { key: 12, gender: 'Male', value: '/assets/Images-Transparent/Image-Onboarding-Avatar-Male6.png', alt: 'Avatar 12' },
    ];

    constructor() { }

    /**
     * Simple resolver: given a user object, return avatar URL and alt text
     */
    resolveAvatarFromUser(user: any): { url: string | null; alt: string | null } {
        try {
            if (!user) return { url: null, alt: null };
            // Always resolve image from avatarImageName (or common variations).
            // Ignore backend-provided `avatar.url` to maintain consistent client-side assets.
            let avatarKey: number | null = null;
            const imageName = this.extractAvatarImageName(user);
            if (imageName) {
                const match = String(imageName).match(/\d+/);
                if (match) {
                    avatarKey = Number(match[0]);
                }
            }

            if (avatarKey && avatarKey >= 1 && avatarKey <= 12) {
                const avatarEntry = this.avatars.find(a => a.key === avatarKey);
                if (avatarEntry) {
                    return { url: avatarEntry.value, alt: avatarEntry.alt };
                }
            }

            // Fallback: no avatar found
            return { url: null, alt: user.name ? `${user.name} avatar` : null };
        } catch (e) {
            console.error('[ChildSelfImageService] Error resolving avatar:', e);
            return { url: null, alt: null };
        }
    }

    /**
     * Resolve avatar for a family member
     */
    resolveAvatarForMember(member: any): { url: string | null; alt: string | null } {
        try {
            if (!member) return { url: null, alt: null };
            // Always resolve by avatar image name (support a few common property names).
            let avatarKey: number | null = null;
            const imageName = this.extractAvatarImageName(member);
            if (imageName) {
                const match = String(imageName).match(/\d+/);
                if (match) {
                    avatarKey = Number(match[0]);
                }
            }

            if (avatarKey && avatarKey >= 1 && avatarKey <= 12) {
                const avatarEntry = this.avatars.find(a => a.key === avatarKey);
                if (avatarEntry) {
                    return { url: avatarEntry.value, alt: avatarEntry.alt };
                }
            }

            return { url: null, alt: member.name ? `${member.name} avatar` : null };
        } catch (e) {
            console.error('[ChildSelfImageService] Error resolving member avatar:', e);
            return { url: null, alt: null };
        }
    }

    /**
     * Robust extractor for avatar image name. Accepts multiple possible shapes
     * that might appear in `user_data` or API responses (e.g. `avatarImageName`,
     * `imageName`, `avatarName`, nested under `avatar`, etc.).
     */
    private extractAvatarImageName(obj: any): string {
        if (!obj) return '';

        // Common keys we've seen in various payloads
        const candidates = [
            obj.avatar?.avatarImageName,
            obj.avatarImageName,
            obj.avatar?.imageName,
            obj.avatar?.avatarName,
            obj.avatar?.name,
            obj.avatarName,
            obj.imageName,
            obj.avatar?.image?.name
        ];

        for (const c of candidates) {
            if (c && String(c).trim().length > 0) return String(c).trim();
        }

        return '';
    }
}
