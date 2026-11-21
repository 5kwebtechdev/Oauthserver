import { Inject, Injectable, InjectionToken } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem, WriteFileOptions, WriteFileResult } from '@capacitor/filesystem';
import { Share, ShareOptions, ShareResult } from '@capacitor/share';
import { firstValueFrom, timeout } from 'rxjs';

import { renderRankCardImage } from './rank-card-image';
import { AuthService } from './auth.service';
import { CoinLeaderboardService } from './coin-leaderboard.service';

// Exact artwork exported from Figma, one original PNG for each eligible rank.
const RANK_CARDS: Readonly<Record<number, string>> = {
  1: 'assets/figma/leaderboard/share/rank-1.png',
  2: 'assets/figma/leaderboard/share/rank-2.png',
  3: 'assets/figma/leaderboard/share/rank-3.png',
  4: 'assets/figma/leaderboard/share/rank-4.png',
  5: 'assets/figma/leaderboard/share/rank-5.png',
  6: 'assets/figma/leaderboard/share/rank-6.png',
  7: 'assets/figma/leaderboard/share/rank-7.png',
  8: 'assets/figma/leaderboard/share/rank-8.png',
  9: 'assets/figma/leaderboard/share/rank-9.png',
  10: 'assets/figma/leaderboard/share/rank-10.png'
};

export interface RankShareNative {
  writeFile(options: WriteFileOptions): Promise<WriteFileResult>;
  share(options: ShareOptions): Promise<ShareResult>;
}

export interface BrowserRankShare {
  file: File;
  text: string;
  canShare: boolean;
}

export const RANK_SHARE_NATIVE = new InjectionToken<RankShareNative>('RankShareNative', {
  providedIn: 'root',
  factory: () => ({
    writeFile: options => Filesystem.writeFile(options),
    share: options => Share.share(options)
  })
});

@Injectable({ providedIn: 'root' })
export class LeaderboardRankShareService {
  constructor(
    private readonly leaderboard: CoinLeaderboardService,
    private readonly auth: AuthService,
    @Inject(RANK_SHARE_NATIVE) private readonly native: RankShareNative
  ) {}

  async share(progress: (message: string) => void = () => {}): Promise<BrowserRankShare | void> {
    const userId = this.auth.getUserId();
    if (!userId) throw new Error('Please sign in to share your rank.');
    progress('Checking your current rank…');
    const result = await this.bounded(firstValueFrom(this.leaderboard.getLeaderboard('GLOBAL', 0, 10).pipe(timeout(15000))),
      16000, 'Your rank could not be loaded in time. Please try again.');
    const rank = result.currentUser?.rank;
    if (result.state !== 'OK' || result.scope !== 'GLOBAL'
        || rank == null || !Number.isInteger(rank) || rank < 1 || rank > 10) {
      throw new Error('Your current rank is outside the top 10. Refresh the leaderboard to see your latest rank.');
    }
    if (String(result.currentUser.userId) !== String(userId)) {
      throw new Error('Please refresh your session before sharing.');
    }

    const card = RANK_CARDS[rank];
    if (!card) throw new Error('Your achievement image could not be loaded. Please try again.');

    progress('Loading your referral code…');
    const referral = await this.bounded(firstValueFrom(this.auth.generateReferralCode().pipe(timeout(15000))),
      16000, 'Your referral code could not be loaded in time. Please try again.');
    const code = referral.referralCode?.trim();
    if (!code) throw new Error('Your referral code could not be loaded. Please try again.');
    progress('Preparing your achievement image…');
    const image = await this.loadImage(card);
    // Android may serve a pixel-identical WebP at the original PNG URL.
    // The renderer always exports a PNG for sharing on every platform.
    if (!image.size || !['image/png', 'image/webp'].includes(image.type.split(';')[0])) {
      throw new Error('Your achievement image could not be loaded. Please try again.');
    }
    if (this.auth.getUserId() !== userId) throw new Error('Your session changed. Please sign in again.');

    const personalizedImage = await this.personalizeImage(image, code);
    if (this.auth.getUserId() !== userId) throw new Error('Your session changed. Please sign in again.');
    const text = this.message(code);
    const title = 'My SuperMeApp rank';
    if (Capacitor.isNativePlatform()) {
      const data = await this.bounded(this.base64(personalizedImage), 10000, 'Your achievement image could not be prepared. Please try again.');
      // Personalized artwork uses at most ten cache files. Keep the file available
      // after the sheet closes so the receiving application can finish reading.
      const file = await this.bounded(this.native.writeFile({
        path: `rank-share/SuperMeApp-rank-${rank}.png`,
        directory: Directory.Cache,
        data,
        recursive: true
      }), 15000, 'Your achievement image could not be saved. Please try again.');
      if (this.auth.getUserId() !== userId) throw new Error('Your session changed. Please sign in again.');
      progress('Opening the share sheet…');
      // The native activity callback can be lost, leaving the bridge call pending.
      // Allow time to finish sharing while ensuring the UI can recover.
      await this.bounded(
        this.native.share({ title, text, files: [file.uri], dialogTitle: 'Share your rank' }),
        60000,
        'Sharing did not finish. Close the share sheet if it is open and try again.'
      );
      return;
    }

    const file = new File([personalizedImage], `SuperMeApp-rank-${rank}.png`, { type: 'image/png' });
    const canShare = this.canShareInBrowser(file, text);
    // Network requests may outlast the browser's user-activation window.
    // Return the prepared file so a fresh, explicit click can share/download it.
    const prepared = { file, text, canShare };
    if (navigator.userActivation?.isActive === false) return prepared;
    try {
      if (!await this.shareInBrowser(file, text)) return prepared;
    } catch (error) {
      // Some desktop/mobile-emulation browsers report AbortError without
      // displaying a sheet. Keep the prepared card instead of silently
      // clearing the only usable download/copy path.
      if (error instanceof DOMException && error.name === 'AbortError') return prepared;
      throw error;
    }
  }

  async shareInBrowser(file: File, text: string): Promise<boolean> {
    if (!this.canShareInBrowser(file, text)) return false;
    try {
      // No asynchronous preparation before this call: the fallback's Share
      // image button must retain its own transient user activation.
      await navigator.share({ title: 'My SuperMeApp rank', text, files: [file] });
      return true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      // Permission policies, missing share targets and file-sharing failures
      // must leave a usable download/copy path on the website.
      return false;
    }
  }

  async copyMessage(text: string): Promise<boolean> {
    try {
      await this.bounded(navigator.clipboard.writeText(text), 3000, 'Clipboard unavailable');
      return true;
    } catch {
      // The page also exposes selectable text for denied clipboard access.
      return false;
    }
  }

  private personalizeImage(image: Blob, code: string): Promise<Blob> {
    return renderRankCardImage(image, code);
  }

  private async loadImage(card: string): Promise<Blob> {
    const controller = new AbortController();
    try {
      // Bound both the headers and body: a server can return headers while the
      // PNG download stalls. Abort the underlying request on timeout as well.
      return await this.bounded((async () => {
        const response = await fetch(new URL(card, document.baseURI).href, { signal: controller.signal });
        if (!response.ok) throw new Error('Your achievement image could not be loaded. Please try again.');
        return response.blob();
      })(), 25000, 'Your achievement image took too long to load. Please try again.');
    } finally {
      controller.abort();
    }
  }

  private bounded<T>(operation: Promise<T>, milliseconds: number, message: string): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(message)), milliseconds);
      operation.then(resolve, error => reject(error?.name === 'TimeoutError' ? new Error(message) : error)).finally(() => clearTimeout(timer));
    });
  }

  private canShareInBrowser(file: File, text: string): boolean {
    try {
      return typeof navigator.share === 'function'
        && navigator.canShare?.({ title: 'My SuperMeApp rank', text, files: [file] }) === true;
    } catch {
      return false;
    }
  }

  message(referralCode: string): string {
    return `🏆 I made it to the TOP 10 on SuperMeApp! 🎉

Think you can beat my rank? 😎 Take on the challenge, climb the leaderboard, and show me what you've got!

📲 Download the app-

Android: https://go.supermeapp.com/google-early-access

iOS: https://go.supermeapp.com/apple-early-access

🎁 Use my referral code: ${referralCode} and earn your 1st reward coins!`;
  }

  private base64(image: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1]);
      reader.onerror = () => reject(new Error('Your achievement image could not be prepared. Please try again.'));
      reader.readAsDataURL(image);
    });
  }
}
