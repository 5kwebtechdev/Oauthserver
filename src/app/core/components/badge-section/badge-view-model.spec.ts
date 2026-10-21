import { mapBadgeResponse } from './badge-view-model';
import { BADGE_CATALOG, TIERS } from './badge-catalog';
import { BADGE_ART } from './badge-art.generated';

// Synthetic contract fixtures, never shipped as user data.
const badge = (title = 'Quiz Ace', extra: object = {}) => ({ title, description: 'API description', progress: 3, target: 10, levelText: 'Level 1', isEarned: false, ...extra });
const v2 = (badges: unknown[], extra: object = {}) => ({ schemaVersion: 2, tierHistoryComplete: true, badges, individualBadges: [], ...extra });
describe('Badge presentation adapter', () => {
  it('does not invent dates, Type 2, or a zero total for legacy data', () => {
    const result = mapBadgeResponse({ badges: [badge()] });
    expect(result.total).toBeNull(); expect(result.individualAvailable).toBeFalse();
    expect(result.progress[0].tier).toBeNull(); expect(result.progress[0].levelLabel).toBe('Level 1');
    expect(result.progress[0].tiers.every(t => t.earned === null && t.earnedDate === null)).toBeTrue();
  });
  it('uses original API values, never resets cumulative totals at a threshold', () => {
    const result = mapBadgeResponse(v2([badge('Coin Chaser', { progress: 1500, target: 2000, nextTier: 'Builder' })]));
    expect(result.progress[0].progress).toBe(1500); expect(result.progress[0].percent).toBe(75);
  });
  it('sorts Builder 10% ahead of Starter 90%', () => {
    const result = mapBadgeResponse(v2([badge('Quiz Ace', { nextTier: 'Starter', progress: 9 }), badge('Coin Chaser', { nextTier: 'Builder', progress: 1 })]));
    expect(result.progress.map(b => b.name)).toEqual(['Coin Chaser','Quiz Ace']);
  });
  it('sorts percentage then alphabetical within a tier', () => {
    const result = mapBadgeResponse(v2([badge('Quiz Ace', { nextTier: 'Starter', progress: 3 }), badge('Coin Chaser', { nextTier: 'Starter', progress: 3 }), badge('Task Crusher', { nextTier: 'Starter', progress: 9 })]));
    expect(result.progress.map(b => b.name)).toEqual(['Task Crusher','Coin Chaser','Quiz Ace']);
  });
  it('does not award tiers when progress reaches milestones', () => {
    expect(mapBadgeResponse({ badges: [badge('Quiz Ace', { progress: 500, target: 500 })] }).top).toEqual([]);
  });
  it('keeps earned history when a streak progress resets', () => {
    const result = mapBadgeResponse(v2([badge('Streak Peak', { progress: 0, target: 7, nextTier: 'Builder', tiers: [{ tier:'Starter', earned:true, earnedDate:'2026-10-12' }] })]));
    expect(result.progress[0].percent).toBe(0); expect(result.top[0].tier).toBe('Starter');
  });
  it('removes a confirmed Legend from progress without removing earned tiers', () => {
    const result = mapBadgeResponse(v2([badge('Quiz Ace', { tiers: TIERS.map(tier => ({ tier, earned:true })) })]));
    expect(result.progress.length).toBe(0); expect(result.top.length).toBe(4); expect(result.other.length).toBe(1);
    expect(result.top[0].tier).toBe('Legend');
  });
  it('sorts equal-tier awards by most recent earned date', () => {
    const result = mapBadgeResponse(v2([badge('Quiz Ace', { tiers:[{ tier:'Starter',earned:true,earnedDate:'2026-10-01' }] }), badge('Coin Chaser', { tiers:[{ tier:'Starter',earned:true,earnedDate:'2026-10-12' }] })]));
    expect(result.top[0].name).toBe('Coin Chaser');
  });
  it('does not pad Top Earned with made-up badges', () => {
    expect(mapBadgeResponse({ badges:[badge('Quiz Ace',{ isEarned:true })] }).top.length).toBe(1);
  });
  it('keeps Type 2 separate and only includes confirmed earned records', () => {
    const result = mapBadgeResponse(v2([badge('Hidden',{ type:'TYPE_2' })], { totalEarnedType1:2, individualBadges:[
      { badgeId:'one',activityId:'deleted-activity',activityName:'Reading',activityType:'HABIT',earned:true,earnedDate:'2026-10-12' },
      { badgeId:'two',activityName:'Not completed',activityType:'TASK',earned:false },
    ] }));
    expect(result.progress.length).toBe(0); expect(result.individual.length).toBe(1); expect(result.total).toBe(2);
    expect(result.top.length).toBe(0);
  });
  it('preserves same-name individual badges with distinct badge IDs', () => {
    const result = mapBadgeResponse(v2([], { individualBadges:['a','b'].map(badgeId => ({ badgeId,activityName:'Reading',activityType:'HABIT',earned:true })) }));
    expect(result.individual.length).toBe(2);
  });
  it('does not interpret missing progress as zero or divide by zero', () => {
    const result = mapBadgeResponse({ badges:[badge('Quiz Ace',{ progress:null,target:0 })] });
    expect(result.progress[0].percent).toBeNull(); expect(result.progress[0].progress).toBeNull();
  });
  it('bounds the visual bar without mutating raw progress', () => {
    const result = mapBadgeResponse({ badges:[badge('Quiz Ace',{ progress:12 })] });
    expect(result.progress[0].percent).toBe(100); expect(result.progress[0].progress).toBe(12);
  });
  it('ignores invalid dates and totals', () => {
    const result = mapBadgeResponse(v2([badge('Quiz Ace',{isEarned:true,earnedDate:'yesterday'})],{totalEarnedType1:90}));
    expect(result.total).toBeNull(); expect(result.progress[0].earnedDate).toBeNull();
  });
  it('omits inactive badges, duplicate records, and unsafe image URLs', () => {
    const result = mapBadgeResponse({badges:[badge('Unknown',{icon:'javascript:alert(1)'}),badge('Unknown'),badge('Quiz Ace',{isActive:false})]});
    expect(result.progress.length).toBe(1); expect(result.progress[0].icon).toBeNull();
  });
  it('has exact artwork for all 75 core tiers and both individual types', () => {
    expect(BADGE_CATALOG.length * TIERS.length).toBe(75);
    for(const def of BADGE_CATALOG) for(let i=1;i<=5;i++) expect(BADGE_ART[`${def.id}-${i}`]).toBeDefined();
    expect(BADGE_ART['individual-habit']).toBeDefined(); expect(BADGE_ART['individual-task']).toBeDefined();
  });
  it('uses supplied final milestones rather than old Figma Make placeholders', () => {
    expect(BADGE_CATALOG.find(b => b.id==='coin-chaser')?.milestones).toEqual([500,2000,6000,15000,40000]);
    expect(BADGE_CATALOG.find(b => b.id==='pet-squad')?.milestones[4]).toBe(20);
    expect(TIERS[3]).toBe('Champion');
  });
});
