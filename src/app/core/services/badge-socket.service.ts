import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Subject, BehaviorSubject, Observable } from 'rxjs';
import { AuthApi } from '../api/auth.api';
import { environment } from '../../../environments/environment';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import * as SockJS from 'sockjs-client';

/**
 * Badge data received from WebSocket
 */
export interface BadgePopupData {
    badgeId: number;
    title: string;
    name: string;
    levelText: string;
    description: string;
    achievementText: string;
    iconUrl: string;
    celebrationTitle: string;
    celebrationMessage: string;
    shareMessage: string;
    currentLevel: number;
    totalLevels: number;
    isMaxLevel: boolean;
}

/**
 * Connection state for the WebSocket
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

/**
 * Singleton service to manage WebSocket connection for real-time badge notifications.
 * 
 * Features:
 * - Single connection per user (deduplication)
 * - Automatic reconnection with exponential backoff
 * - Badge queue management (one popup at a time)
 * - Pending popup check on reconnect
 */
@Injectable({ providedIn: 'root' })
export class BadgeSocketService implements OnDestroy {
    private stompClient: Client | null = null;
    private connectedUserId: string | null = null;

    // Badge queue - FIFO, show one at a time
    private badgeQueue: BadgePopupData[] = [];
    private isShowingPopup = false;

    // Subjects for reactive updates
    private badgeReceived$ = new Subject<BadgePopupData>();
    private connectionState$ = new BehaviorSubject<ConnectionState>('disconnected');

    // Track processed badge IDs to avoid duplicates
    private processedBadgeIds = new Set<number>();

    // STOMP subscription reference
    private stompSubscription: StompSubscription | null = null;

    // Icon mapping (same as badge-section)
    private readonly BADGE_ICON_MAP: Readonly<Record<string, string>> = {
        'Coin Collector': 'assets/Icons-Neutral/Icon-Badge-CoinCollector.png',
        'Quiz Ace': 'assets/Icons-Neutral/Icon-Badge-QuizAce.png',
        'Pet Collector': 'assets/Icons-Neutral/Icon-Badge-PetCollector.png',
        'Content Creator': 'assets/Icons-Neutral/Icon-Badge-ContentCreator.png',
        'Knowledge Seeker': 'assets/Icons-Neutral/Icon-Badge-KnowledgeSeeker.png',
        'Habit Master': 'assets/Icons-Neutral/Icon-Badge-HabitMaster.png',
        'Daily Champion': 'assets/Icons-Neutral/Icon-Badge-DailyChampion.png',
        'Feature Explorer': 'assets/Icons-Neutral/Icon-Badge-FeatureExploerer.png',
        'Puzzle Master': 'assets/Icons-Neutral/Icon-Badge-PuzzleMaster.png',
        'Pet Stylist': 'assets/Icons-Neutral/Icon-Badge-PetStylist.png',
        'Task Terminator': 'assets/Icons-Neutral/Icon-Badges-TaskTerminator.png',
        'Learning Enthusiast': 'assets/Icons-Neutral/Icon-Badge-LearningEnthusiast.png',
        'Social Star': 'assets/Icons-Neutral/Icon-Badge-SocialStar.png',
        'Streak Keeper': 'assets/Icons-Neutral/Icon-Badge-StreakKeeper.png'
    };

    constructor(
        private authApi: AuthApi,
        private ngZone: NgZone
    ) { }

    ngOnDestroy(): void {
        this.disconnect();
    }

    /**
     * Get observable for badge received events
     */
    onBadgeReceived(): Observable<BadgePopupData> {
        return this.badgeReceived$.asObservable();
    }

    /**
     * Get observable for connection state changes
     */
    onConnectionStateChange(): Observable<ConnectionState> {
        return this.connectionState$.asObservable();
    }

    /**
     * Get current connection state
     */
    getConnectionState(): ConnectionState {
        return this.connectionState$.value;
    }

    /**
     * Check if currently connected
     */
    isConnected(): boolean {
        return !!(this.stompClient && this.stompClient.connected);
    }

    /**
     * Connect to the badge WebSocket server.
     * Prevents duplicate connections for the same user.
     */
    connect(userId?: string): void {
        const token = this.authApi.getToken();
        if (!token) {
            console.warn('[BadgeSocket] No auth token available, skipping connection');
            return;
        }

        const effectiveUserId = userId || this.extractUserIdFromToken(token);
        if (!effectiveUserId) {
            console.warn('[BadgeSocket] Could not determine userId, skipping connection');
            return;
        }

        // Prevent duplicate connections
        if (this.connectedUserId === effectiveUserId && this.isConnected()) {
            console.log('[BadgeSocket] Already connected for user:', effectiveUserId);
            return;
        }

        if (this.connectedUserId && this.connectedUserId !== effectiveUserId) {
            this.disconnect();
        }

        this.connectedUserId = effectiveUserId;
        this.connectionState$.next('connecting');
        this.establishStompConnection(token, effectiveUserId);
    }

    /**
     * Disconnect from WebSocket and cleanup
     */
    disconnect(): void {
        try {
            if (this.stompSubscription) {
                this.stompSubscription.unsubscribe();
                this.stompSubscription = null;
            }

            if (this.stompClient) {
                try { this.stompClient.deactivate(); } catch (e) { console.warn('[BadgeSocket] error deactivating stomp', e); }
                this.stompClient = null;
            }
        } finally {
            this.connectedUserId = null;
            this.connectionState$.next('disconnected');
            console.log('[BadgeSocket] Disconnected');
        }
    }

    /**
     * Mark popup as shown - call this when user closes the popup
     */
    popupClosed(): void {
        this.isShowingPopup = false;
        this.showNextBadge();
    }

    /**
     * Add a badge to the queue (used for pending popups from API)
     */
    enqueueBadge(badge: BadgePopupData): void {
        if (this.processedBadgeIds.has(badge.badgeId)) {
            console.log('[BadgeSocket] Badge already processed, skipping:', badge.badgeId);
            return;
        }

        this.processedBadgeIds.add(badge.badgeId);
        this.badgeQueue.push(badge);
        this.showNextBadge();
    }

    /**
     * Clear the badge queue (e.g., on logout)
     */
    clearQueue(): void {
        this.badgeQueue = [];
        this.processedBadgeIds.clear();
        this.isShowingPopup = false;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Private methods
    // ─────────────────────────────────────────────────────────────────────────────

    private establishStompConnection(token: string, userId: string): void {
        // Build SockJS endpoint from apiUrl (strip /v1 if present)
        const apiUrl = environment.apiUrl || '';
        const wsBase = apiUrl.replace(/^http/, 'ws');
        const sockJsUrl = `${wsBase}/ws`;

        // Clean token
        const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;

        // Create STOMP client
        this.stompClient = new Client({
            webSocketFactory: () => new SockJS(sockJsUrl),
            connectHeaders: { Authorization: `Bearer ${cleanToken}` },
            debug: (str) => { /* console.log('[STOMP]', str); */ },
            heartbeatIncoming: 20000,
            heartbeatOutgoing: 20000,
            reconnectDelay: 5000,
            onConnect: (frame) => {
                this.ngZone.run(() => {
                    console.log('[BadgeSocket] STOMP connected');
                    this.connectionState$.next('connected');
                    // Subscribe to user-specific topic
                    try {
                        const topic = `/topic/badges/${userId}`;
                        this.stompSubscription = this.stompClient!.subscribe(topic, (msg: IMessage) => {
                            this.ngZone.run(() => {
                                try {
                                    const body = msg.body ? JSON.parse(msg.body) : {};
                                    this.handleMessage(body);
                                } catch (err) {
                                    console.error('[BadgeSocket] Failed to parse STOMP message body', err);
                                }
                            });
                        });
                    } catch (err) {
                        console.error('[BadgeSocket] STOMP subscribe error', err);
                    }
                });
            },
            onStompError: (frame) => {
                this.ngZone.run(() => {
                    console.error('[BadgeSocket] STOMP error', frame.headers, frame.body);
                });
            },
            onDisconnect: (frame) => {
                this.ngZone.run(() => {
                    console.log('[BadgeSocket] STOMP disconnected');
                    this.connectionState$.next('disconnected');
                });
            }
        });

        // Activate connection
        try {
            this.stompClient.activate();
        } catch (err) {
            console.error('[BadgeSocket] Failed to activate STOMP client', err);
            this.connectionState$.next('disconnected');
        }
    }

    // buildWebSocketUrl no longer used when using SockJS+STOMP

    private handleMessage(data: any): void {
        try {
            const message = data;
            // If message wraps payload
            const payload = message.payload || message.data || message;

            if (payload && (payload.badgeId || payload.id)) {
                const badge = this.parseBadgeData(payload);
                if (badge) this.enqueueBadge(badge);
            } else {
                console.log('[BadgeSocket] Ignored message:', message);
            }
        } catch (error) {
            console.error('[BadgeSocket] Failed to handle message:', error, data);
        }
    }

    private parseBadgeData(message: any): BadgePopupData | null {
        // Handle both direct badge data and wrapped payload
        const data = message.payload || message.data || message;

        if (!data.badgeId && !data.id) {
            console.warn('[BadgeSocket] Badge data missing ID:', data);
            return null;
        }

        const badgeId = data.badgeId || data.id;
        const title = data.title || data.name || 'Badge Earned';

        return {
            badgeId: badgeId,
            title: title,
            name: data.name || title,
            levelText: data.levelText || '',
            description: data.description || '',
            achievementText: data.achievementText || '',
            iconUrl: data.iconUrl || data.icon || this.getBadgeIcon(title),
            celebrationTitle: data.celebrationTitle || 'Badge Unlocked!',
            celebrationMessage: data.celebrationMessage || `You earned the ${title} badge!`,
            shareMessage: data.shareMessage || `I earned the ${title} badge on SuperMe! 🚀`,
            currentLevel: data.currentLevel || 1,
            totalLevels: data.totalLevels || 1,
            isMaxLevel: data.isMaxLevel || false
        };
    }

    private getBadgeIcon(title: string): string {
        return this.BADGE_ICON_MAP[title] || 'assets/Icons-Neutral/Icon-Badge-CoinCollector.png';
    }

    private showNextBadge(): void {
        if (this.isShowingPopup || this.badgeQueue.length === 0) {
            return;
        }

        const badge = this.badgeQueue.shift();
        if (badge) {
            this.isShowingPopup = true;
            this.badgeReceived$.next(badge);
        }
    }
    

    private extractUserIdFromToken(token: string): string | null {
        try {
            const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
            const parts = cleanToken.split('.');
            if (parts.length !== 3) return null;

            const payload = JSON.parse(atob(parts[1]));
            return payload.id?.toString() || payload.sub || null;
        } catch (error) {
            console.error('[BadgeSocket] Failed to extract userId from token:', error);
            return null;
        }
    }
}
