import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter, OnChanges, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Share } from '@capacitor/share';
import { Tutor, TutorCategory, formatContactModes, formatExperience } from '../../../models/tutor.model';
import { teachingSummary } from '../../../models/teaching-display';
import { TeachingDisplayService } from '../../../services/teaching-display.service';
import { TutorLikeService } from '../../../services/tutor-like.service';
import { CoreService } from '../../../services/core.service';
import { ShareLinkService } from '../../../services/share-link.service';
import { ProfileImageComponent } from '../../profile-image/profile-image.component';
@Component({ selector:'app-counselor-card', standalone:true, imports:[CommonModule, ProfileImageComponent], templateUrl:'./counselor-card.component.html', styleUrls:['./counselor-card.component.scss'] })
export class CounselorCardComponent implements OnChanges, OnDestroy {
  @Input({ required:true }) counselor!: Tutor;
  @Input() guest = false;
  @Input() education = false;
  @Input() categoryKey = '';
  private categories: TutorCategory[] = [];
  private categorySubscription?: Subscription;
  @Output() viewProfile = new EventEmitter<Tutor>();
  private watch?: Subscription;
  private pending = false;
  constructor(private likes: TutorLikeService, private core: CoreService, private links: ShareLinkService, private teaching: TeachingDisplayService) {}
  ngOnChanges(): void {
    if (this.education && !this.categorySubscription) {
      this.categorySubscription = this.teaching.categories$.subscribe(categories => this.categories = categories);
    }
    this.watch?.unsubscribe();
    this.likes.initFromServer(this.counselor);
    this.watch = this.likes.watch(this.counselor.id).subscribe(state => { this.counselor.likedByUser = state.liked; this.pending = state.pending; });
  }
  ngOnDestroy(): void { this.watch?.unsubscribe(); this.categorySubscription?.unsubscribe(); }
  isLiked(item: Tutor): boolean { return !!item.likedByUser; }
  isLikePending(_: Tutor): boolean { return this.pending; }
  toggleLike(event: Event, item: Tutor): void {
    event.stopPropagation();
    if (this.pending) return;
    this.likes.toggleLike(item, !item.likedByUser)?.catch(() => this.core.triggerToasrt('Unable to update like. Please try again.', 'error'));
  }
  async shareCounselor(item: Tutor): Promise<void> {
    try { await Share.share({ title:this.getName(item), text:'View '+this.getName(item)+' on SuperMe EduHub.', url:this.links.buildListingLink('counselor', item.id) }); }
    catch(error: any) { if (!/cancel|dismiss|abort/i.test(String(error?.message || error))) this.core.triggerToasrt('Unable to share this listing.', 'error'); }
  }
  getName(counselor: Tutor): string {
    return counselor.name?.trim() || counselor.entityName?.trim() || 'Counselor';
  }

  getProfileImage(counselor: Tutor): string | null {
    return counselor.profilePicUrl?.trim() || null;
  }

  getSpecializationLabel(counselor: Tutor): string {
    if (this.education) return teachingSummary(counselor, this.categories, this.categoryKey) || 'Teaching details not specified';
    const values = this.getSpecializations(counselor);
    if (!values.length) return counselor.qualification?.trim() || 'Specialization not specified';
    if (values.length <= 2) return values.join(', ');
    return `${values.slice(0, 2).join(', ')} + ${values.length - 2}`;
  }

  getAvailability(counselor: Tutor): string {
    const modes = counselor.contactModes?.length ? formatContactModes(counselor.contactModes) : '';
    return modes;
  }

  getExperience(counselor: Tutor): string {
    const years = Math.max(0, ...(counselor.categoryMappings || []).map(mapping => mapping.yearsOfExperience || 0));
    return years > 0 ? `${years} years exp` : formatExperience(counselor.experience || 'FRESHER').replace('Exp', 'exp');
  }

  getFee(counselor: Tutor): string {
    const mappingFee = (counselor.categoryMappings || []).find(mapping => mapping.categoryHourlyRate > 0)?.categoryHourlyRate;
    const fee = Number(mappingFee || counselor.hourlyRate || counselor.fees || 0);
    if (!Number.isFinite(fee) || fee <= 0) return 'Pricing on request';
    const labels: Record<string, string> = {
      PER_SESSION: 'Per Session',
      PER_HOUR: 'Per Hour',
      PER_MONTH: 'Per Month'
    };
    return `₹ ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(fee)} / ${labels[String(counselor.feeType)] || (this.education ? 'Per Hour' : 'Per Session')}`;
  }

  private getSpecializations(counselor: Tutor): string[] {
    const direct = ((counselor as Tutor & { specializations?: string[] }).specializations || counselor.subjects || []).map(value => String(value).trim()).filter(Boolean);
    const configured = (counselor.categoryMappings || []).reduce<string[]>(
      (all, mapping) => all.concat(this.getMappedSpecializations(mapping.selectedFieldOptions)),
      []
    );
    return Array.from(new Set(direct.concat(configured)));
  }

  private getMappedSpecializations(value: unknown): string[] {
    if (!value) return [];
    let selected: Record<string, unknown> = {};
    try {
      selected = typeof value === 'string' ? JSON.parse(value) : value as Record<string, unknown>;
    } catch {
      return [];
    }
    if (!selected || typeof selected !== 'object' || Array.isArray(selected)) return [];
    return Object.keys(selected)
      .filter(key => /special|subject|expert/i.test(key))
      .reduce<string[]>((items, key) => {
        const raw = selected[key];
        const values = Array.isArray(raw) ? raw : String(raw ?? '').split(',');
        return items.concat(values.map(item => String(item).replace(/[_-]+/g, ' ').trim()).filter(Boolean));
      }, []);
  }

  isVerified(counselor: Tutor): boolean {
    // `isVerified` is the current API source of truth. Some older records can
    // contain a stale, conflicting `verified` alias; OR-ing both values makes
    // an explicitly unverified tutor appear verified and breaks this filter.
    const primary = this.toOptionalBoolean((counselor as any).isVerified);
    if (primary !== null) return primary;

    const legacy = this.toOptionalBoolean((counselor as any).verified);
    if (legacy !== null) return legacy;

    return this.toOptionalBoolean((counselor as any).documentsVerified) === true;
  }

  private toOptionalBoolean(value: unknown): boolean | null {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1 ? true : value === 0 ? false : null;
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
    return null;
  }


}
