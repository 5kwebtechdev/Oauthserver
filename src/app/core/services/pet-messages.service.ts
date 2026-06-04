import { Injectable } from '@angular/core';

export type PetMood = 'happy' | 'playful' | 'curious' | 'base' | 'tired' | 'anger';
export type PageLocation =
    | 'home'
    | 'habit-card'
    | 'task-card'
    | 'coins'
    | 'content'
    | 'tutors'
    | 'streaks-leaderboard'
    | 'academy'
    | 'add-task-post-onboarding'
    | 'all-tasks-pending-blank'
    | 'all-tasks-ongoing-blank'
    | 'morning-routine-blank'
    | 'evening-routine-blank'
    | 'night-routine-blank'
    | 'learning-results'
    | 'learning-for-you-blank'
    | 'my-reels-blank'
    | 'my-family-disconnected'
    | 'my-family-self-mode'
    | 'parental-control-free-time'
    | 'parental-control-all-apps'
    | 'bonus-coins-first-time'
    | 'set-mood-prompt'
    | 'introduction'
    | 'daily-login-coins'
    | 'completed-all-activities'
    | 'streak-coins'
    | 'many-coins'
    | 'few-coins'
    | 'academy-home';

export type DisplayType = 'overlay' | 'header' | 'card' | 'corner';

export interface PetMessage {
    message: string;
    mood: PetMood;
    displayType: DisplayType;
    timing?: string;
}

export interface MessageContext {
    userName?: string;
    avatarName?: string;
    tasksCount?: number;
    habitsCount?: number;
    challengesCount?: number;
    totalCoins?: number;
    streakDays?: number;
    ranking?: number;
    userNote?: string;
    parentNote?: string;
    isFirstTime?: boolean;
    hasActivities?: boolean;
    completedCount?: number;
    totalCount?: number;
    score?: string;
}

@Injectable({ providedIn: 'root' })
export class PetMessagesService {

    private readonly MOOD_MAP: Record<string, PetMood> = {
        happiness: 'happy',
        playful: 'playful',
        curious: 'curious',
        base: 'base',
        tired: 'tired',
        anger: 'anger'
    };

    private readonly MESSAGES: Record<PageLocation, Array<{
        msg: string;
        mood: PetMood;
        type: DisplayType;
        timing?: string;
        check?: (ctx: MessageContext) => boolean;
    }>> = {
            // POST ONBOARDING
            'add-task-post-onboarding': [
                {
                    msg: "What's One Thing You'd Like to Do? Add something to keep track of – for now, soon, or later. It's your call. Begin my journey",
                    mood: 'playful',
                    type: 'header'
                }
            ],

            // ALL TASKS/HABITS - BLANK STATES
            'all-tasks-pending-blank': [
                {
                    msg: "All caught up! Nothing's waiting for you right now. Great job staying on top of things!",
                    mood: 'happy',
                    type: 'header'
                }
            ],
            'all-tasks-ongoing-blank': [
                {
                    msg: "Fresh start ahead! No ongoing activities right now",
                    mood: 'base',
                    type: 'header'
                }
            ],
            'morning-routine-blank': [
                {
                    msg: "No morning routine yet. Add morning routine to your habits and tasks to view them here",
                    mood: 'base',
                    type: 'header'
                }
            ],
            'evening-routine-blank': [
                {
                    msg: "No evening routine yet. Add evening routine to your habits and tasks to view them here",
                    mood: 'base',
                    type: 'header'
                }
            ],
            'night-routine-blank': [
                {
                    msg: "No night routine yet. Add night routine to your habits and tasks to view them here",
                    mood: 'base',
                    type: 'header'
                }
            ],

            // LEARNING
            'learning-results': [
                {
                    msg: "Great Work. <score>",
                    mood: 'happy',
                    type: 'header'
                }
            ],
            'learning-for-you-blank': [
                {
                    msg: "Fresh Content Coming Soon! Nothing recently added yet, but check back soon – new things will start appearing here once they're live!",
                    mood: 'curious',
                    type: 'header'
                }
            ],

            // REELS
            'my-reels-blank': [
                {
                    msg: "Create your first reel and share awesome things with everyone!",
                    mood: 'playful',
                    type: 'header'
                }
            ],

            // MY FAMILY
            'my-family-disconnected': [
                {
                    msg: "You're now in Self mode! The family connection has been removed by the creator. Your account is still safe and all data is saved.",
                    mood: 'base',
                    type: 'header'
                }
            ],
            'my-family-self-mode': [
                {
                    msg: "Using Self mode. No family is linked to this account right now. Everything here is private to this profile.",
                    mood: 'base',
                    type: 'header'
                }
            ],

            // PARENTAL CONTROL
            'parental-control-free-time': [
                {
                    msg: "Free screen time!",
                    mood: 'happy',
                    type: 'header'
                }
            ],
            'parental-control-all-apps': [
                {
                    msg: "All apps are available. No app restrictions right now. Your parents trust you to use apps wisely",
                    mood: 'happy',
                    type: 'header'
                }
            ],

            // MAIN SCENARIOS FROM PRD PET MESSAGES
            'bonus-coins-first-time': [
                {
                    msg: "Wow! Look what you've earned already! Your first steps just scored you 10 coins. You're off to an amazing start!",
                    mood: 'happy',
                    type: 'overlay',
                    timing: 'Shown till the user clicks on the screen'
                }
            ],
            'set-mood-prompt': [
                {
                    msg: "Hey <Name>! \n\nHow are you feeling today? Let's set your mood!",
                    mood: 'playful',
                    type: 'overlay',
                    timing: 'Till the user selects a mood'
                }
            ],
            'introduction': [
                {
                    msg: "Hey, <Name>! I'll be right here helping you grow, learn, and celebrate every step!",
                    mood: 'happy',
                    type: 'header',
                    timing: 'Till the user does not have any habits/tasks',
                    check: (c) => !c.hasActivities
                }
            ],
            'daily-login-coins': [
                {
                    msg: "Look at you go! Another day, another step forward. You've just earned 5 coins for being here with me!",
                    mood: 'happy',
                    type: 'overlay',
                    timing: 'Shown till the user clicks on the screen'
                }
            ],
            'completed-all-activities': [
                {
                    msg: "Hurray!\n🌟 You've completed all your tasks and habits for the day. Complete your today's quiz to stay ahead",
                    mood: 'playful',
                    type: 'header',
                    timing: 'Till he adds new activity'
                }
            ],
            'streak-coins': [
                {
                    msg: "Look what your streak earned you - 10 special coins! Every single day you chose to stay consistent, you were building something incredible.",
                    mood: 'happy',
                    type: 'overlay',
                    timing: 'Shown till the user clicks on the screen'
                }
            ],
            'many-coins': [
                {
                    msg: "Whoa! That's a lot of coins! Let's go dress me up or grab something shiny!",
                    mood: 'curious',
                    type: 'header',
                    timing: 'Till the user purchases something from store or uses the coins in general',
                    check: (c) => (c.totalCoins || 0) >= 400
                }
            ],
            'few-coins': [
                {
                    msg: "I know it feels like we don't have much right now, but that just means we're on an exciting journey! Every coin we earn makes us stronger together!",
                    mood: 'base',
                    type: 'header',
                    timing: 'Till user has around 400 coins',
                    check: (c) => (c.totalCoins || 0) < 400
                }
            ],

            // HOME (Dynamic based on activity count)
            home: [
                {
                    msg: "Hey there, <DisplayName>! \n\n🌟 You've got <tasksCount> tasks, <habitsCount> habits, and a challenge waiting for you today. Let's go!",
                    mood: 'playful',
                    type: 'header',
                    timing: 'On the screen till all the activities are completed for that day',
                    check: (c) => (c.tasksCount || 0) > 0 || (c.habitsCount || 0) > 0
                },
                {
                    msg: "Hurray!\n🌟 You've completed all your tasks and habits for the day. Complete your today's quiz to stay ahead",
                    mood: 'playful',
                    type: 'header',
                    timing: 'Till he adds new activity',
                    check: (c) => !!c.hasActivities && (c.tasksCount || 0) === 0 && (c.habitsCount || 0) === 0
                },
                {
                    msg: "Hey, <Name>! I'll be right here helping you grow, learn, and celebrate every step!",
                    mood: 'happy',
                    type: 'header',
                    timing: 'Till the user does not have any habits/tasks',
                    check: (c) => !c.hasActivities
                }
            ],

            // COINS
            coins: [
                {
                    msg: "Whoa! That's a lot of coins! Let's go dress me up or grab something shiny!",
                    mood: 'curious',
                    type: 'header',
                    check: (c) => (c.totalCoins || 0) >= 400
                },
                {
                    msg: "I know it feels like we don't have much right now, but that just means we're on an exciting journey! Every coin we earn makes us stronger together!",
                    mood: 'base',
                    type: 'header',
                    check: (c) => (c.totalCoins || 0) < 400
                }
            ],

            // HABIT/TASK CARDS
            'habit-card': [
                {
                    msg: 'You did it!',
                    mood: 'happy',
                    type: 'card',
                    timing: 'Always on the activity card, till card is removed'
                }
            ],
            'task-card': [
                {
                    msg: "I see there's a special note created by you: '<userNote>'",
                    mood: 'base',
                    type: 'corner',
                    check: (c) => !!c.userNote
                },
                {
                    msg: "Your parent left you a message: '<parentNote>'",
                    mood: 'base',
                    type: 'corner',
                    check: (c) => !!c.parentNote
                }
            ],

            // CONTENT
            content: [
                {
                    msg: "I'm cheering for you! Let's get things done!",
                    mood: 'playful',
                    type: 'header'
                }
            ],

            // TUTORS
            tutors: [
                {
                    msg: "Sniffed out the best tutors just for you, ready to fetch your favorite?",
                    mood: 'happy',
                    type: 'header'
                }
            ],

            // ACADEMY
            academy: [
                {
                    msg: 'These lessons are like superpowers for your real world!',
                    mood: 'happy',
                    type: 'header',
                    timing: 'All the time, till some special messages need to be shown'
                }
            ],
            'academy-home': [
                {
                    msg: 'These lessons are like superpowers for your real world!',
                    mood: 'happy',
                    type: 'header'
                }
            ],

            // STREAKS LEADERBOARD
            'streaks-leaderboard': [
                {
                    msg: "You're ranked <ranking>, Keep going champ!",
                    mood: 'playful',
                    type: 'corner',
                    check: (c) => (c.ranking || 0) > 0 && (c.ranking || 0) <= 10
                },
                {
                    msg: "No spot on the board…yet! \nBuild your streak and show them how it's done!",
                    mood: 'tired',
                    type: 'corner'
                }
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
                    displayType: m.type,
                    timing: m.timing
                };
            }
        }

        const fallback = msgs[0];
        return {
            message: this.interpolate(fallback.msg, context),
            mood: fallback.mood,
            displayType: fallback.type,
            timing: fallback.timing
        };
    }

    getPetMood(mood: string): PetMood {
        return this.MOOD_MAP[mood.toLowerCase()] || 'base';
    }

    private interpolate(msg: string, ctx: MessageContext): string {
        const displayName = ctx.avatarName || ctx.userName || 'there';

        return msg
            .replace(/<Name>/g, ctx.userName || 'there')
            .replace(/<DisplayName>/g, displayName)
            .replace(/<tasksCount>/g, String(ctx.tasksCount || 0))
            .replace(/<habitsCount>/g, String(ctx.habitsCount || 0))
            .replace(/<challengesCount>/g, String(ctx.challengesCount || 0))
            .replace(/<ranking>/g, String(ctx.ranking || ''))
            .replace(/<score>/g, ctx.score || '5/5')
            .replace(/<userNote>/g, ctx.userNote || '')
            .replace(/<parentNote>/g, ctx.parentNote || '');
    }
}
