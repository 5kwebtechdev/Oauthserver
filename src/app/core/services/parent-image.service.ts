import { Injectable } from '@angular/core';

export type AvatarStyle = { [key: string]: string };

@Injectable({ providedIn: 'root' })
export class ParentImageService {
    // 24-letter palette mapping (A - X). Each entry is a two-tone gradient pair.
    // Lighter, more distinct dark 24-letter palette (A - X). Each entry is a two-tone gradient pair tuned
    // to be visibly different while keeping a refined dark aesthetic and good contrast with white text.
    private palette: Record<string, [string, string]> = {
        A: ['#243149', '#2E4166'], // deep navy -> indigo
        B: ['#3B2B58', '#5B3B8A'], // dark purple -> medium purple
        C: ['#1E4B4B', '#2A6B6B'], // deep teal -> teal
        D: ['#4A3128', '#7A4A34'], // warm cocoa -> rust
        E: ['#2B3E45', '#316E78'], // slate -> teal-blue
        F: ['#4A2836', '#7C3F5A'], // plum -> dusty magenta
        G: ['#324525', '#4C7A3F'], // olive-dark -> olive
        H: ['#4B2951', '#6E3F83'], // aubergine -> purple
        I: ['#1E5A5F', '#238B90'], // deep aqua -> bright aqua
        J: ['#5A3528', '#8A5A3F'], // brown-red -> amber-brown
        K: ['#233746', '#2F5B72'], // steel-blue -> muted blue
        L: ['#3A2440', '#7A3F7A'], // deep magenta -> rose
        M: ['#50331E', '#8A5A33'], // dark caramel -> warm amber
        N: ['#113A3A', '#0F6B6B'], // midnight teal -> teal
        O: ['#4A262C', '#7A3A4A'], // burgundy-dark -> wine
        P: ['#18323A', '#2E6E77'], // sea green -> teal
        Q: ['#3B2A3F', '#7A5A90'], // muted violet -> lavender
        R: ['#17362A', '#2E7A50'], // forest -> emerald
        S: ['#0E345A', '#2D5AA3'], // royal navy -> royal blue
        T: ['#3B2836', '#6B3F6C'], // dark orchid -> orchid
        U: ['#3A3424', '#7C6A2E'], // deep khaki -> gold-brown
        V: ['#11323A', '#1F6B7A'], // teal-blue -> sea
        W: ['#3A2328', '#7A3D47'], // dark wine -> rosewood
        X: ['#412E2F', '#6A3C3E'], // mahogany -> warm mahogany
    };

    constructor() { }

    // Normalize input to single uppercase letter and clamp to our palette.
    private normalize(letter: string): string {
        if (!letter) return 'A';
        const ch = letter.trim().charAt(0).toUpperCase();
        return this.palette[ch] ? ch : 'A';
    }

    // Returns CSS style object to apply via [ngStyle] for the avatar circle.
    // If `isFemale` is true the gradient is lightened subtly.
    getAvatarStyle(letterOrChar: string, isFemale: boolean = false, size: number = 64): AvatarStyle {
        const letter = this.normalize(letterOrChar);
        let [c1, c2] = this.palette[letter];

        const mixWithWhite = (hex: string, factor: number) => {
            const v = hex.replace('#', '');
            const r = parseInt(v.substring(0, 2), 16);
            const g = parseInt(v.substring(2, 4), 16);
            const b = parseInt(v.substring(4, 6), 16);
            const nr = Math.round(r + (255 - r) * factor);
            const ng = Math.round(g + (255 - g) * factor);
            const nb = Math.round(b + (255 - b) * factor);
            const toHex = (n: number) => n.toString(16).padStart(2, '0');
            return `#${toHex(nr)}${toHex(ng)}${toHex(nb)}`;
        };

        if (isFemale) {
            c1 = mixWithWhite(c1, 0.22);
            c2 = mixWithWhite(c2, 0.12);
        }

        // Create a lighter concave effect: increase top highlight, soften bottom shadow, and reduce heavy inset.
        const baseGradient = `linear-gradient(135deg, ${c1} 7%, ${c2} 93%)`;

        // Concave overlay: slightly stronger light on top and much softer shadow at bottom
        const concaveOverlayTop = `radial-gradient(circle at 40% 26%, rgba(255,255,255,0.10), rgba(255,255,255,0) 45%)`;
        const concaveOverlayBottom = `radial-gradient(circle at 50% 72%, rgba(0,0,0,0.18), rgba(0,0,0,0) 60%)`;

        const boxShadow = `0 6px 14px rgba(0,0,0,0.36), inset 0 8px 12px rgba(255,255,255,0.04), inset 0 -6px 12px rgba(0,0,0,0.28)`;

        // Very subtle noise texture tuned lighter for the new look
        const textureSvg = encodeURIComponent(`
            <svg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'>
                <rect width='10' height='10' fill='none' />
                <circle cx='2' cy='2' r='0.6' fill='rgba(255,255,255,0.02)' />
            </svg>
        `);
        const textureUrl = `url("data:image/svg+xml;utf8,${textureSvg}")`;

        // Compose backgrounds: subtle texture, top highlight, bottom shadow, then base gradient
        const backgroundImage = `${textureUrl}, ${concaveOverlayTop}, ${concaveOverlayBottom}, ${baseGradient}`;

        return {
            'background-image': backgroundImage,
            'background-blend-mode': 'overlay, overlay, multiply, normal',
            'background-size': 'auto, cover, cover, cover',
            'border-radius': '50%',
            'box-shadow': boxShadow,
            'border': '1px solid rgba(255,255,255,0.06)',
            'color': '#ffffff',
            'display': 'flex',
            'align-items': 'center',
            'justify-content': 'center',
            'font-weight': '700',
            'font-family': 'Nunito',
            'font-size': Math.round(size * 0.60) + 'px',
            'width': size + 'px',
            'height': '100%',
            'text-transform': 'uppercase',
            'user-select': 'none',
            'overflow': 'hidden'
        };
    }

    // Simple luminance-based contrast: choose white or deep-brown text.
    private getContrastText(c1: string, c2: string): string {
        // compute average luminance of two hex colors
        const lum = (hex: string) => {
            const v = hex.replace('#', '');
            const r = parseInt(v.substring(0, 2), 16) / 255;
            const g = parseInt(v.substring(2, 4), 16) / 255;
            const b = parseInt(v.substring(4, 6), 16) / 255;
            const srgb = [r, g, b].map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
            return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
        };

        const l = (lum(c1) + lum(c2)) / 2;
        // threshold tuned for this palette
        return l > 0.5 ? '#2f150c' : '#ffffff';
    }
}
