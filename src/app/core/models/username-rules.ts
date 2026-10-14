import { usernameLengthError } from './username-length';

export type UsernameRuleError =
  | 'usernameMinLength' | 'usernameMaxLength' | 'usernameSpaces'
  | 'usernameUppercase' | 'usernameInvalidCharacters'
  | 'usernameStartsWithUnderscore' | 'usernameMissingLetter'
  | 'usernameReserved' | 'usernameProfanity' | 'usernameLooksLikeRealName';

const RESERVED = new Set([
  'admin', 'support', 'help', 'moderator', 'mod', 'team', 'staff', 'official',
  'verified', 'superme', 'supermeofficial', 'settings', 'profile', 'home',
  'notifications', 'feed', 'about', 'privacy', 'terms', 'habits', 'goals',
  'rewards', 'leaderboard', 'friends', 'messages', 'activity', 'progress',
  'dashboard', 'stats', 'achievements', 'calendar', 'tutors', 'pets',
  'gamification', 'challenges', 'community', 'discover', 'academy',
  'learnings', 'tasks', 'badges', 'coins', 'parents', 'abuse', 'report',
  'spam', 'fake', 'scam', 'phishing', 'bot', 'superme_official', 'supermeapp',
  'super_me', 'superme_team', 'superme_help'
]);

// This client-side list is immediate feedback, not the authoritative safety
// database. The registration/profile API must enforce the current full list.
const INAPPROPRIATE_TERMS = [
  'fuck', 'shit', 'bitch', 'cunt', 'dick', 'pussy', 'asshole',
  'chutiya', 'madarchod', 'bhenchod', 'behenchod', 'bhosdike', 'randi'
];

export const USERNAME_RULE_MESSAGES: Record<UsernameRuleError, string> = {
  usernameMinLength: 'Username must be at least 3 characters.',
  usernameMaxLength: 'Username cannot exceed 10 characters.',
  usernameSpaces: "Spaces aren't allowed. Use _ instead",
  usernameUppercase: 'Only lowercase letters allowed',
  usernameInvalidCharacters: 'Only lowercase letters, numbers, and underscores are allowed.',
  usernameStartsWithUnderscore: 'Username cannot start with an underscore.',
  usernameMissingLetter: 'Username must include at least one letter.',
  usernameReserved: 'This username is reserved. Choose another.',
  usernameProfanity: 'This username contains inappropriate language. Choose another.',
  usernameLooksLikeRealName: 'This looks like a real name. Try a nickname for privacy.'
};

export function usernameRuleError(value: string, fullName = ''): UsernameRuleError | null {
  if (!value) return null;
  if (/\s/.test(value)) return 'usernameSpaces';
  if (/[A-Z]/.test(value)) return 'usernameUppercase';
  const lengthError = usernameLengthError(value);
  if (lengthError) return lengthError;
  if (!/^[a-z0-9_]+$/.test(value)) return 'usernameInvalidCharacters';
  if (value.startsWith('_')) return 'usernameStartsWithUnderscore';
  if (!/[a-z]/.test(value)) return 'usernameMissingLetter';
  const collapsed = value.replace(/[0-9_]/g, '');
  if (INAPPROPRIATE_TERMS.some(term => collapsed.includes(term))) return 'usernameProfanity';
  if (RESERVED.has(value) || RESERVED.has(value.replace(/_/g, ''))) return 'usernameReserved';

  const nameParts = fullName.toLowerCase().split(/[^a-z]+/).filter(part => part.length >= 3);
  const letters = value.replace(/[0-9_]/g, '');
  if (nameParts.length && (letters === nameParts.join('') || nameParts.some(part => letters === part))) {
    return 'usernameLooksLikeRealName';
  }
  return null;
}
