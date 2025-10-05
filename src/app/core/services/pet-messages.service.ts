import { Injectable } from '@angular/core';

export type PetMood = 'happy' | 'playful' | 'curious' | 'default' | 'tired';
export type PageLocation = 'home' | 'habit-card' | 'task-card' | 'coins' | 'content' | 'tutors' | 'streaks-leaderboard' | 'academy';
export type DisplayType = 'overlay' | 'header' | 'card' | 'corner';

export interface PetMessage {
    message: string;
    mood: PetMood;
    displayType: DisplayType;
}

export interface MessageContext {
    userName?: string;
    tasksCount?: number;
    habitsCount?: number;
    totalCoins?: number;
    streakDays?: number;
    ranking?: number;
    userNote?: string;
    parentNote?: string;
}

@Injectable({ providedIn: 'root' })
export class PetMessagesService {

    private readonly MOOD_MAP: Record<string, PetMood> = {
        happiness: 'happy',
        playful: 'playful',
        curious: 'curious',
        base: 'default',
        tired: 'tired'
    };

    private readonly MESSAGES: Record<PageLocation, Array<{
        msg: string;
        mood: PetMood;
        type: DisplayType;
        check?: (ctx: MessageContext) => boolean;
    }>> = {
            home: [
                { msg: "Hey, <Name>! I'll be right here helping you grow, learn, and celebrate every step!", mood: 'happy', type: 'header' },
                { msg: "Hey there, <Name>! 🌟 You've got <tasksCount> tasks, <habitsCount> habits, and a challenge waiting for you today. Let's go!", mood: 'playful', type: 'header', check: (c) => (c.tasksCount || 0) > 0 || (c.habitsCount || 0) > 0 },
                { msg: "Hurray! 🌟 You've completed all your tasks and habits for the day. Complete your today's quiz to stay ahead", mood: 'playful', type: 'header', check: (c) => (c.tasksCount || 0) === 0 && (c.habitsCount || 0) === 0 },
                { msg: "Look at you go! Another day, another step forward. You've just earned 5 coins for being here with me!", mood: 'happy', type: 'overlay', check: (c) => (c.streakDays || 0) > 0 },
                { msg: "Look what your streak earned you - 10 special coins! Every single day you chose to stay consistent, you were building something incredible.", mood: 'happy', type: 'overlay', check: (c) => (c.streakDays || 0) >= 7 }
            ],
            coins: [
                { msg: "I know it feels like we don't have much right now, but that just means we're on an exciting journey! Every coin we earn makes us stronger together!", mood: 'default', type: 'header' },
                { msg: "Whoa! That's a lot of coins! Let's go dress me up or grab something shiny!", mood: 'curious', type: 'header', check: (c) => (c.totalCoins || 0) >= 1000 }
            ],
            content: [
                { msg: "I'm cheering for you! Let's get things done!", mood: 'playful', type: 'header' }
            ],
            tutors: [
                { msg: "Sniffed out the best tutors just for you, ready to fetch your favorite?", mood: 'happy', type: 'header' }
            ],
            academy: [
                { msg: 'These lessons are like superpowers for your real world!', mood: 'happy', type: 'header' }
            ],
            'streaks-leaderboard': [
                { msg: "No spot on the board…yet! \nBuild your streak and show them how it's done!", mood: 'tired', type: 'corner' },
                { msg: "You're ranked <ranking>, Keep going champ!", mood: 'playful', type: 'corner', check: (c) => (c.ranking || 0) > 0 && (c.ranking || 0) <= 10 }
            ],
            'habit-card': [
                { msg: 'You did it!', mood: 'happy', type: 'card' }
            ],
            'task-card': [
                { msg: "I see there's a special notes created by you: '<userNote>'", mood: 'default', type: 'corner', check: (c) => !!c.userNote },
                { msg: "Your parent left you a message: '<parentNote>'", mood: 'default', type: 'corner', check: (c) => !!c.parentNote }
            ]
        };

    getMessage(location: PageLocation, context: MessageContext = {}): PetMessage {
        const msgs = this.MESSAGES[location] || this.MESSAGES.home;

        for (let i = msgs.length - 1; i >= 0; i--) {
            const m = msgs[i];
            if (!m.check || m.check(context)) {
                return {
                    message: this.interpolate(m.msg, context),
                    mood: m.mood,
                    displayType: m.type
                };
            }
        }

        const fallback = msgs[0];
        return {
            message: this.interpolate(fallback.msg, context),
            mood: fallback.mood,
            displayType: fallback.type
        };
    }


    getPetMood(mood: string): PetMood {
        return this.MOOD_MAP[mood] || 'default';
    }


    private interpolate(msg: string, ctx: MessageContext): string {
        return msg
            .replace(/<Name>/g, ctx.userName || 'there')
            .replace(/<tasksCount>/g, String(ctx.tasksCount || 0))
            .replace(/<habitsCount>/g, String(ctx.habitsCount || 0))
            .replace(/<ranking>/g, String(ctx.ranking || ''))
            .replace(/<userNote>/g, ctx.userNote || '')
            .replace(/<parentNote>/g, ctx.parentNote || '');
    }
}
