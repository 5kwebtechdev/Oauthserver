import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router } from '@angular/router';
import { FamilyConnectionComponent } from './family-connection.component';
import { AuthService as ApiAuth } from '../../../../../package/api/auth.service';
import { AuthService } from '../../../services/auth.service';
import { ParentImageService } from '../../../services/parent-image.service';
import { ChildSelfImageService } from '../../../services/child-self-image.service';
import { FamilyActionsService } from '../../../services/family-actions.service';
import { PROFILE_FAQS } from '../profile-facts/profile-facts.component';

describe('Parent My Family design and existing actions', () => {
  let fixture: ComponentFixture<FamilyConnectionComponent>;
  let component: FamilyConnectionComponent;
  let actions: jasmine.SpyObj<FamilyActionsService>;
  const parent = { id: 1, name: 'Parent Name', age: 35, relationship: 'Parent', you: true, coParent: false };
  const child = { id: 2, name: 'Child Name', age: 13, relationship: 'Child', you: false, coParent: false };

  beforeEach(async () => {
    actions = jasmine.createSpyObj('FamilyActionsService', ['openAddChild', 'shareFamilyCodeWithCoParent']);
    await TestBed.configureTestingModule({
      imports: [FamilyConnectionComponent],
      providers: [
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        { provide: ApiAuth, useValue: { getFamilyStatus: () => of({}) } },
        { provide: AuthService, useValue: { getUserData: () => ({ id: 1, relationship: 'PARENT' }), isParentUser: () => true } },
        { provide: ParentImageService, useValue: { getAvatarStyle: () => ({}) } },
        { provide: ChildSelfImageService, useValue: { resolveAvatarForMember: () => ({ url: 'assets/figma/avatars/18-plus-male-1.webp' }) } },
        { provide: FamilyActionsService, useValue: actions }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(FamilyConnectionComponent);
    document.body.appendChild(fixture.nativeElement);
    component = fixture.componentInstance;
    spyOn(component, 'loadFamilyDetails').and.stub();
    Object.assign(component, {
      embedded: true, isLoading: false, familyHasFamily: true, familyRelationship: 'PARENT',
      creator: parent, members: [child], familyName: 'Dynamic Family', familyCode: 'CODE123',
      createdOn: 'Mar 15 2025', qrCodeData: 'GROUP:CODE123',
      familyFaqs: PROFILE_FAQS.filter(f => f.section === 'My Family' && f.screen === 'Parent')
    });
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.destroy();
    fixture.nativeElement.remove();
  });

  it('embeds the same component without a nested ion-content or navigator', () => {
    expect(fixture.nativeElement.querySelector('ion-content')).toBeNull();
    expect(fixture.nativeElement.querySelector('superme-navigator')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Dynamic Family');
    expect(fixture.nativeElement.textContent).toContain('CODE123');
  });

  it('renders member data, creator badge and only the permitted removal', () => {
    expect(fixture.nativeElement.querySelectorAll('.parent-family__member').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Parent /Creator/You');
    expect(fixture.nativeElement.querySelectorAll('.parent-family__remove').length).toBe(1);
    fixture.nativeElement.querySelector('.parent-family__remove').click();
    expect(component.memberToRemove).toEqual(child as any);
    expect(component.showRemovePopup).toBeTrue();
    component.cancelRemoveMember();
    expect(component.showRemovePopup).toBeFalse();
  });

  it('uses the existing member switching action when the child profile is tapped', () => {
    spyOn(component, 'viewChildMember');
    fixture.nativeElement.querySelectorAll('.parent-family__member-profile')[1].click();
    expect(component.viewChildMember).toHaveBeenCalledWith(child as any);
  });

  it('uses shared Parent Home actions for invite and add child', () => {
    const buttons = fixture.nativeElement.querySelectorAll('.parent-family__add');
    buttons[0].click();
    buttons[1].click();
    expect(actions.shareFamilyCodeWithCoParent).toHaveBeenCalledWith('CODE123');
    expect(actions.openAddChild).toHaveBeenCalledWith('CODE123');
  });

  it('does not show invite/add placeholders for a populated family', () => {
    component.members = [
      { ...parent, id: 3, you: false, coParent: true },
      child, { ...child, id: 4 }
    ] as any;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.parent-family__add').length).toBe(0);
    expect(fixture.nativeElement.querySelectorAll('.parent-family__member').length).toBe(4);
    expect(fixture.nativeElement.textContent).toContain('Co Parent');
  });

  it('expands existing FAQs and keeps their answers', () => {
    const toggle = fixture.nativeElement.querySelector('.parent-family__faq-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    toggle.click(); fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelectorAll('details').length).toBe(component.familyFaqs.length);
    expect(fixture.nativeElement.querySelector('.fact-answer').textContent).toContain(component.familyFaqs[0].answer);
  });

  it('opens the dynamic QR with the family code and closes it', async () => {
    fixture.nativeElement.querySelector('[aria-label="Open family QR code"]').click();
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(component.showQrModal).toBeTrue();
    expect(component.qrCodeData).toBe('GROUP:CODE123');
    expect(fixture.nativeElement.querySelector('ion-modal')).not.toBeNull();
    component.closeQrModal();
    fixture.detectChanges();
    expect(component.showQrModal).toBeFalse();
  });

  for (const width of [360, 375, 390, 414]) {
    it('fits dynamic long names and expanded FAQs at ' + width + 'px', () => {
      fixture.nativeElement.style.width = (width - 32) + 'px';
      component.creator = { ...parent, name: 'A very long parent name for responsive testing' } as any;
      component.familyName = 'A very long dynamic family name';
      component.showFamilyFaqs = true;
      fixture.detectChanges();
      const card = fixture.nativeElement.querySelector('.parent-family');
      expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth + 1);
      for (const member of fixture.nativeElement.querySelectorAll('.parent-family__member')) {
        expect(member.scrollWidth).toBeLessThanOrEqual(member.clientWidth + 1);
        expect(getComputedStyle(member).minHeight).toBe('162px');
      }
    });
  }
});

