import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { BadgeApi } from '../../api/badge.api';
import { BadgeSectionComponent } from './badge-section.component';
import { mapBadgeResponse } from './badge-view-model';
import { BADGE_CATALOG } from './badge-catalog';

describe('Badges screen', () => {
  let fixture: ComponentFixture<BadgeSectionComponent>;
  let component: BadgeSectionComponent;
  let api: jasmine.SpyObj<BadgeApi>;
  let location: jasmine.SpyObj<Location>;
  let router: jasmine.SpyObj<Router>;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let frame: HTMLIFrameElement | undefined;
  beforeEach(async () => {
    api = jasmine.createSpyObj('BadgeApi',['getBadgeProgress']); api.getBadgeProgress.and.returnValue(of({badges:[]}));
    location = jasmine.createSpyObj('Location',['back']); router = jasmine.createSpyObj('Router',['navigate']);
    params = new BehaviorSubject(convertToParamMap({}));
    await TestBed.configureTestingModule({imports:[BadgeSectionComponent,IonicModule.forRoot()], providers:[
      {provide:BadgeApi,useValue:api},{provide:Location,useValue:location},{provide:Router,useValue:router},
      {provide:ActivatedRoute,useValue:{queryParamMap:params}},
    ]}).compileComponents();
    fixture=TestBed.createComponent(BadgeSectionComponent); component=fixture.componentInstance; fixture.detectChanges();
  });
  afterEach(() => { fixture.destroy(); frame?.remove(); frame=undefined; });
  it('fetches the existing API once and shows an unknown total honestly', () => {
    expect(api.getBadgeProgress).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.textContent).toContain('—/75');
    expect(fixture.nativeElement.textContent).not.toContain('0/75');
    expect(fixture.nativeElement.textContent).not.toContain('Backend API required');
    expect(fixture.nativeElement.textContent).not.toContain('Showing available badge data');
  });
  it('shows retry on 401 rather than an empty earned state', () => {
    api.getBadgeProgress.and.returnValue(throwError(() => ({status:401}))); component.loadBadges(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('No badges yet!');
    api.getBadgeProgress.and.returnValue(of({badges:[]})); fixture.nativeElement.querySelector('.retry').click(); fixture.detectChanges();
    expect(component.error).toBeFalse();
  });
  it('does not interpret a malformed success body as an empty collection', () => {
    api.getBadgeProgress.and.returnValue(of({success:false})); component.loadBadges(); expect(component.error).toBeTrue();
  });
  it('switches tabs with buttons and exposes the selected state', () => {
    fixture.nativeElement.querySelector('#earned-tab').click(); fixture.detectChanges();
    expect(component.tab).toBe('earned'); expect(fixture.nativeElement.querySelector('#earned-tab').getAttribute('aria-selected')).toBe('true');
  });
  it('opens Type 1 details but never opens them for Type 2', () => {
    const data=mapBadgeResponse({schemaVersion:2,badges:[{title:'Quiz Ace',progress:2,target:10,nextTier:'Starter'}],individualBadges:[{badgeId:'a',activityName:'Reading',activityType:'HABIT',earned:true}]});
    component.openDetail(data.progress[0]); expect(component.selected?.name).toBe('Quiz Ace');
    component.selected=null; component.openDetail(data.individual[0]); expect(component.selected).toBeNull();
  });
  it('uses a separate URL view for individual badges and ordinary back history', () => {
    component.viewAll(); expect(router.navigate).toHaveBeenCalled();
    params.next(convertToParamMap({view:'individual'})); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.badge-tabs')).toBeNull();
    component.onBackClick(); expect(location.back).toHaveBeenCalledTimes(1);
  });
  it('preserves server-provided achievement sharing without triggering a new popup', () => {
    api.getBadgeProgress.and.returnValue(of({badges:[],celebrationCard:{showCelebration:true,shareMessage:'Verified achievement'}}));
    component.loadBadges(); fixture.detectChanges(); expect(component.shareMessage).toBe('Verified achievement');
    expect(component.sharePopupVisible).toBeFalse(); fixture.nativeElement.querySelector('.share-achievement').click(); expect(component.sharePopupVisible).toBeTrue();
  });
  for(const width of [360,375,390,414,768]) it(`fits progress and earned cards at ${width}px without page overflow`, async () => {
    // Only test fixtures; no synthetic data is installed in the application.
    component.view=mapBadgeResponse({schemaVersion:2,tierHistoryComplete:true,totalEarnedType1:0,
      badges:BADGE_CATALOG.map(d=>({title:d.name,nextTier:'Starter',progress:0,target:d.milestones[0],description:d.describe(d.milestones[0])})),
      individualBadges:[{badgeId:'test-only',activityName:'A very long activity name that must wrap across no more than two rows',activityType:'HABIT',earned:true,earnedDate:'2026-10-12'}]});
    fixture.detectChanges();
    frame=document.createElement('iframe'); frame.style.width=`${width}px`; frame.style.height='844px'; frame.style.border='0'; document.body.appendChild(frame);
    const doc=frame.contentDocument!;
    const base=doc.createElement('base'); base.href=document.baseURI; doc.head.appendChild(base);
    for(const style of Array.from(document.querySelectorAll('style,link[rel=stylesheet]'))) doc.head.appendChild(style.cloneNode(true));
    // Measure the actual screen markup in the viewport, independently of Ionic's
    // router-outlet visibility (there is no app router outlet in this unit test).
    const page=fixture.nativeElement.querySelector('.badges-page') as HTMLElement;
    doc.body.style.margin='0'; doc.body.style.display='block'; doc.body.style.setProperty('--ink','#282527');
    doc.body.style.setProperty('--muted','#6b656a'); doc.body.style.setProperty('--purple','#432477');
    doc.body.appendChild(page);
    await new Promise(resolve=>setTimeout(resolve,60));
    expect(page.getBoundingClientRect().width).toBeLessThanOrEqual(width);
    expect(page.scrollWidth).toBeLessThanOrEqual(width);
    for(const card of Array.from(page.querySelectorAll('.badge-card')) as HTMLElement[]) {
      expect(card.getBoundingClientRect().width).toBeGreaterThan(100);
      expect(card.scrollWidth).toBeLessThanOrEqual(Math.ceil(card.getBoundingClientRect().width));
    }
    component.tab='earned'; fixture.detectChanges();
    expect(page.scrollWidth).toBeLessThanOrEqual(width);
    const name=page.querySelector('.individual-card h3') as HTMLElement;
    expect(name.scrollHeight).toBeGreaterThanOrEqual(name.clientHeight);
    expect(name.getBoundingClientRect().height).toBeLessThanOrEqual(40);
    // Optional, test-only visual QA: open Karma /debug.html?badgePreview=true.
    // These DOM snapshots never enter the app bundle or its API responses.
    if (width === 390 && new URLSearchParams(window.location.search).has('badgePreview')) {
      component.tab='progress'; fixture.detectChanges();
      const preview=document.createElement('iframe');
      preview.title='Badges visual QA — synthetic contract fixture';
      preview.style.cssText='position:fixed;inset:0 auto auto 0;width:390px;height:100vh;border:0;z-index:999999;background:white';
      document.body.appendChild(preview);
      const target=preview.contentDocument!;
      target.head.innerHTML=doc.head.innerHTML;
      target.body.style.cssText=doc.body.style.cssText;
      target.body.appendChild(page.cloneNode(true));
    }
  });
});
