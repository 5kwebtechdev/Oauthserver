import { Component, Input, ViewChild, ElementRef, AfterViewInit, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MindfulNavigatorComponent } from '../../mindful-navigator/mindful-navigator.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { TutorFilterFooterComponent } from '../tutor-filter-footer/tutor-filter-footer.component';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'tutor-all-filter',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, MindfulNavigatorComponent, MindfulButtonComponent, TutorFilterFooterComponent],
  templateUrl: './tutor-all-filter.component.html',
  styleUrls: ['./tutor-all-filter.component.scss']
})
export class TutorAllFilterComponent {
  /** List of available filter labels */
  @Input() filters: string[] = [];

  /** Topbar-slider categories for slider */
  categories = [
    { key: 'School', label: 'School', icon: '/assets/Icons-Neutral/Tutors-School.png' },
    { key: 'College', label: 'College', icon: '/assets/Icons-Neutral/Tutors-College.png' },
    { key: 'Hobbies', label: 'Hobbies', icon: '/assets/Icons-Neutral/Tutors-Hobbies.png' },
    { key: 'Sports', label: 'Sports', icon: '/assets/Icons-Neutral/Tutors-Sports.png' },
    { key: 'Exams', label: 'Exams', icon: '/assets/Icons-Neutral/Tutors-Exams.png' },
    { key: 'Language', label: 'Language', icon: '/assets/Icons-Neutral/Tutors-Language.png' },
    { key: 'Others', label: 'Others', icon: '/assets/Icons-Neutral/Tutors-Others.png' }
  ];

  /** Topbar-slider active category (kept for template compatibility) */
  selectedCategory: string | null = this.categories[0].key;

  /** Sidebar groups generated from selected topbar category */
  sidebarGroups: Array<{ label: string; items: string[] }> = [];
  selectedSidebar: string | null = null;
  selectedSubFilters: string[] = [];
  /** currently checked subfilters */
  selectedSubFilterSet: Set<string> = new Set();

  /** Centralised filter definitions per topbar category */
  private filterDefinitions: Record<string, Array<{ label: string; items: string[] }>> = {
    School: [
      { label: 'Class', items: ['Nursery & KG','Class 1','Class 2','Class 3','Class 4','Class 5','Class 6','Class 7','Class 8','Class 9','Class 10','Class 11','Class 12'] },
      { label: 'Subjects', items: ['Mathematics','Science','English','Physics','Chemistry','Biology','Hindi','Social Studies','Accountancy','Economics','Business Studies','Computer Science','Sanskrit','Environmental Studies (EVS)','Commerce','History','Political Science','Geography','French','Spoken English'] },
      { label: 'Board', items: ['CBSE','ICSE','IB','State Board','IGCSE','NIOS'] }
    ],
    College: [
      { label: 'Degree / Stream', items: ['Engineering (B.E / B.Tech / M.Tech)','Medical (MBBS / BDS / BAMS / BHMS)','Commerce (B.Com / M.Com)','Management (BBA / MBA)','Science (B.Sc / M.Sc)','Arts & Humanities (BA / MA)','Law (LLB / LLM)','Chartered Courses (CA / CS / CMA)','Computer Applications (BCA / MCA)','Pharmacy & Nursing (B.Pharm / B.Sc Nursing)'] },
      { label: 'Year', items: ['1st Year','2nd Year','3rd Year','4th Year','5th Year'] }
    ],
    Language: [
      { label: 'Languages', items: ['English','French','German','Spanish','Hindi','Sanskrit','Japanese','Mandarin (Chinese)','Korean','Tamil','Telugu','Marathi','Bengali','Kannada','Malayalam','Punjabi','Gujarati','Arabic','Russian','IELTS / TOEFL Prep'] },
      { label: 'Level / Proficiency', items: ['Beginner','Intermediate','Advanced','Professional / Business'] }
    ],
    Hobbies: [
      { label: 'Skill', items: ['Guitar','Piano','Violin','Drums','Flute','Indian Classical Vocal','Western Vocals','Bollywood Vocals','Bharatanatyam','Bollywood Dance','Hip Hop','Salsa','Drawing & Sketching','Painting','Calligraphy','Yoga & Meditation','Chess','Cooking','Baking','Photography'] },
      { label: 'Level / Proficiency', items: ['Beginner','Intermediate','Advanced','Certification / Grade Exams'] },
      { label: 'Age Group', items: ['Kids (Below 13)','Teens (13-18)','Adults'] }
    ],
    Exams: [
      { label: 'Target Exam', items: ['JEE Mains / Advanced','NEET','GATE','CET / State Entrances','UPSC (Civil Services)','SSC (CGL / CHSL / MTS)','Banking (IBPS / SBI / RBI)','Railways (RRB)','Defence (NDA / CDS / AFCAT)','Teaching (CTET / NET)','CAT','GMAT','XAT / SNAP / NMAT','IPMAT','IELTS / TOEFL / PTE','GRE','SAT','CLAT','CA / CS / CMA'] }
    ],
    Sports: [
      { label: 'Activities', items: ['Cricket','Badminton','Football','Swimming','Pickleball','Tennis','Table Tennis','Basketball','Martial Arts','Skating','Athletics','Volleyball','Personal Training / Fitness'] },
      { label: 'Age Group', items: ['Kids (Below 13)','Teens (13-18)','Adults'] }
    ],
    Others: [
      { label: 'Skill', items: ['Artificial Intelligence (AI) & Machine Learning','Generative AI Tools','Data Science & Analytics','Digital Marketing','Stock Market & Trading','Web & App Development','Graphic Design','Video Editing','Fashion Designing & Tailoring','Makeup & Hairstyling','Interior Design','Photography'] },
      { label: 'Level', items: ['Beginner','Intermediate','Advanced'] }
    ]
  };

  ngOnInit(): void {
    this.setSidebarForCategory(this.selectedCategory ?? this.categories[0].key);
  }

  private setSidebarForCategory(category: string) {
    const groups = this.filterDefinitions[category] ?? [
      { label: 'Skill', items: ['Default'] },
      { label: 'Level / Proficiency', items: ['Beginner','Intermediate','Advanced'] },
      { label: 'Age Group', items: ['Kids','Teens','Adults'] },
      { label: 'Mode', items: ['Online','Offline'] },
      { label: 'Location', items: ['City 1','City 2'] }
    ];

    this.sidebarGroups = groups;
    this.selectedSidebar = groups.length ? groups[0].label : null;
    this.selectedSubFilters = groups.length ? groups[0].items : [];
  }

  selectSidebar(filterLabel: string) {
    this.selectedSidebar = filterLabel;
    const group = this.sidebarGroups.find(g => g.label === filterLabel);
    this.selectedSubFilters = group ? group.items : [];
  }

  selectCategory(category: string) {
    this.selectedCategory = category;
    this.setSidebarForCategory(category);
  }

  onToggleSubFilter(item: string, checked: boolean) {
    if (checked) {
      this.selectedSubFilterSet.add(item);
    } else {
      this.selectedSubFilterSet.delete(item);
    }
  }

  clearAll() {
    this.selectedSubFilterSet.clear();
  }

  @ViewChild('categoriesSwiper', { read: ElementRef, static: true }) categoriesSwiperRef!: ElementRef;
  private swiperInstance: any | null = null;

  ngAfterViewInit() {
    // initialize global Swiper if available (loaded in index.html)
    const win: any = typeof window !== 'undefined' ? window : null;
    if (win && typeof win.Swiper === 'function' && this.categoriesSwiperRef?.nativeElement) {
      this.swiperInstance = new win.Swiper(this.categoriesSwiperRef.nativeElement, {
        slidesPerView: 'auto',
        spaceBetween: 12,
        freeMode: true,
        watchOverflow: true
      });
    }
  }

  ngOnDestroy() {
    if (this.swiperInstance && typeof this.swiperInstance.destroy === 'function') {
      this.swiperInstance.destroy(true, true);
      this.swiperInstance = null;
    }
  }

  constructor(private modalCtrl: ModalController) { }

  close() {
    this.modalCtrl.dismiss();
  }

  // Filters removed — kept component minimal
}
