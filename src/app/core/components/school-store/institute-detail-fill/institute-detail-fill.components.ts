import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { SupermeNavigatorComponent } from '../../superme-navigator/superme-navigator.component';
import { SupermeButtonComponent } from '../../superme-button/superme-button.component';
import { FooterComponent } from '../../footer/footer.component';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../../environments/environment';

// ── India States → Cities map ────────────────────────────────────────────────
const INDIA_STATES: Record<string, string[]> = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Tirupati', 'Kakinada', 'Rajahmundry', 'Anantapur', 'Eluru'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Tawang', 'Ziro'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Tezpur', 'Nagaon', 'Tinsukia'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia', 'Arrah', 'Bihar Sharif'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Korba', 'Bilaspur', 'Durg', 'Rajnandgaon', 'Jagdalpur'],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar', 'Junagadh', 'Anand', 'Navsari'],
  'Haryana': ['Faridabad', 'Gurugram', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat'],
  'Himachal Pradesh': ['Shimla', 'Mandi', 'Solan', 'Dharamshala', 'Kullu', 'Manali'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh', 'Giridih'],
  'Karnataka': ['Bengaluru', 'Mysuru', 'Hubballi', 'Mangaluru', 'Belagavi', 'Kalaburagi', 'Ballari', 'Vijayapura', 'Davangere', 'Shivamogga'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Alappuzha', 'Palakkad'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik', 'Aurangabad', 'Solapur', 'Kolhapur', 'Amravati', 'Navi Mumbai'],
  'Manipur': ['Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur'],
  'Meghalaya': ['Shillong', 'Tura', 'Jowai'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Champhai'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore'],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Hoshiarpur'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Alwar', 'Bhilwara', 'Sikar'],
  'Sikkim': ['Gangtok', 'Namchi', 'Gyalshing'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Vellore', 'Erode', 'Thoothukudi', 'Thanjavur'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Khammam', 'Karimnagar', 'Ramagundam', 'Nalgonda'],
  'Tripura': ['Agartala', 'Udaipur', 'Dharmanagar'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Allahabad', 'Meerut', 'Noida', 'Bareilly', 'Aligarh'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Rishikesh', 'Nainital', 'Haldwani'],
  'West Bengal': ['Kolkata', 'Howrah', 'Asansol', 'Siliguri', 'Durgapur', 'Bardhaman', 'Malda'],
  'Andaman & Nicobar Islands': ['Port Blair'],
  'Chandigarh': ['Chandigarh'],
  'Dadra & Nagar Haveli and Daman & Diu': ['Silvassa', 'Daman', 'Diu'],
  'Delhi': ['New Delhi', 'Dwarka', 'Rohini', 'Lajpat Nagar', 'Janakpuri', 'Pitampura'],
  'Jammu & Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur'],
  'Ladakh': ['Leh', 'Kargil'],
  'Lakshadweep': ['Kavaratti'],
  'Puducherry': ['Puducherry', 'Karaikal', 'Mahe'],
};

const ALL_STATES = Object.keys(INDIA_STATES).sort();

export interface SchoolItem {
  id: number;
  name: string;
  branch: string;
  city: string;
  state: string;
  logoUrl: string;
}

@Component({
  standalone: true,
  selector: 'institute-detail-fill',
  templateUrl: './institute-detail-fill.components.html',
  styleUrls: ['./institute-detail-fill.components.scss'],
  imports: [CommonModule, IonicModule, FormsModule, SupermeNavigatorComponent, SupermeButtonComponent, FooterComponent]
})
export class InstituteDetailFillComponent {

  // categoryId this page was opened for (from Student-Store), forwarded to the product page on submit
  categoryId: number | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private authService: AuthService
  ) {
    const cat = this.route.snapshot.queryParamMap.get('categoryId');
    const parsed = cat ? Number(cat) : NaN;
    this.categoryId = isNaN(parsed) ? null : parsed;
  }

  goBack(): void {
    this.router.navigate(['/authed/user-dashboard']).catch(() => this.router.navigateByUrl('/authed'));
  }

  // form field definitions
  fields = [
    { key: 'state',  label: 'State',          placeholder: 'Select your state',           aria: 'Select your state' },
    { key: 'city',   label: 'City / District', placeholder: 'Select your city / district', aria: 'Select your city or district' },
    { key: 'school', label: 'School Name',     placeholder: 'Select school',               aria: 'Select school' },
    { key: 'class',  label: 'Class',           placeholder: 'Select class',                aria: 'Select class' }
  ];

  // popup state
  showFieldPopup = false;
  activeField: string | null = null;

  // selected display values
  selectedValues: Record<string, string> = {};

  // school API state
  schools: SchoolItem[] = [];
  schoolsLoading = false;
  schoolsError = false;
  selectedSchool: SchoolItem | null = null;

  // numeric class id for the currently selected class name, resolved from the classes API
  selectedClassId: number | null = null;
  private classIdByName: Record<string, number> = {};

  // ── Dynamic options (state / city) ────────────────────────────────────────
  get options(): Record<string, string[]> {
    const selectedState = this.selectedValues['state'];
    return {
      state: ALL_STATES,
      city:  selectedState ? (INDIA_STATES[selectedState] ?? []) : []
    };
  }

  // ── Classes for the selected school (API driven) ──────────────────────────
  classOptions: string[] = [];
  classesLoading = false;
  classesError = false;

  openFieldPopup(key: string): void {
    if (key === 'city'   && !this.selectedValues['state']) return;
    if (key === 'school' && !this.selectedValues['city'])  return;
    if (key === 'class'  && !this.selectedSchool)          return;

    this.activeField     = key;
    this.showFieldPopup  = true;

    if (key === 'school') {
      this.loadSchools();
    }
  }

  closeFieldPopup(): void {
    this.showFieldPopup = false;
    this.activeField    = null;
  }

  // ── School API ───────────────────────────────────────────────────────────
  loadSchools(): void {
    this.schoolsLoading = true;
    this.schoolsError   = false;
    this.schools        = [];

    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token}`,
      'Accept': 'application/json',
      'x-skip-loading': '1'
    });

    this.http
      .get<any>(`${environment.apiUrl}/user/schools`, { headers })
      .subscribe({
        next: (res) => {
          this.schools        = Array.isArray(res?.content) ? res.content : [];
          this.schoolsLoading = false;
        },
        error: () => {
          this.schoolsLoading = false;
          this.schoolsError   = true;
        }
      });
  }

  selectSchoolItem(school: SchoolItem): void {
    const prevSchoolId = this.selectedSchool?.id;
    this.selectedSchool = school;
    const label = school.branch ? `${school.name} — ${school.branch}` : school.name;
    this.selectedValues['school'] = label;
    const f = this.fields.find(x => x.key === 'school');
    if (f) f.placeholder = label;
    if (prevSchoolId !== school.id) {
      this.resetField('class');
      this.loadClasses(school.id);
    }
    this.closeFieldPopup();
  }

  // ── Classes API (per selected school) ─────────────────────────────────────
  loadClasses(schoolId: number): void {
    this.classesLoading = true;
    this.classesError = false;
    this.classOptions = [];
    this.classIdByName = {};

    const token = this.authService.getToken();
    const headers = new HttpHeaders({
      'Authorization': token?.startsWith('Bearer ') ? token : `Bearer ${token}`,
      'Accept': 'application/json',
      'x-skip-loading': '1'
    });

    this.http
      .get<any[]>(`${environment.apiUrl}/user/schools/${schoolId}/classes`, { headers })
      .subscribe({
        next: (res) => {
          const list = Array.isArray(res) ? res : [];
          this.classIdByName = {};
          this.classOptions = list
            .map((c: any) => {
              const name: string | undefined = Array.isArray(c?.name) ? c.name[0] : c?.name;
              if (!name) return name;
              // Prefer a real id from the API; otherwise fall back to the number
              // embedded in the class label itself (e.g. "Class 3" -> 3), since
              // classes are commonly just named by grade number.
              const explicitId = c?.id ?? c?.classId ?? c?.class_id ?? c?._id;
              const resolvedId = explicitId != null ? Number(explicitId) : this.parseClassNumber(name);
              if (resolvedId != null) this.classIdByName[name] = resolvedId;
              return name;
            })
            .filter((n): n is string => !!n);
          this.classesLoading = false;
        },
        error: () => {
          this.classesLoading = false;
          this.classesError = true;
        }
      });
  }

  private parseClassNumber(name: string): number | null {
    const match = name.match(/\d+/);
    return match ? Number(match[0]) : null;
  }

  // ── Generic option select (state / city / class) ─────────────────────────
  selectOption(opt: string): void {
    if (!this.activeField) return;
    const prev = this.selectedValues[this.activeField];
    this.selectedValues[this.activeField] = opt;
    const f = this.fields.find(x => x.key === this.activeField);
    if (f) f.placeholder = opt;

    if (this.activeField === 'class') {
      this.selectedClassId = this.classIdByName[opt] ?? null;
    }

    if (this.activeField === 'state' && prev !== opt) {
      this.resetField('city');
      this.resetField('school');
      this.selectedSchool = null;
    }
    if (this.activeField === 'city' && prev !== opt) {
      this.resetField('school');
      this.selectedSchool = null;
    }
    this.closeFieldPopup();
  }

  private resetField(key: string): void {
    delete this.selectedValues[key];
    if (key === 'class') this.selectedClassId = null;
    const defaults: Record<string, string> = {
      city:   'Select your city / district',
      school: 'Select school',
      class:  'Select class'
    };
    const f = this.fields.find(x => x.key === key);
    if (f) f.placeholder = defaults[key] ?? `Select ${key}`;
  }

  getActiveLabel(): string {
    return this.fields.find(x => x.key === this.activeField)?.label ?? '';
  }

  getActiveOptions(): string[] {
    if (!this.activeField || this.activeField === 'school') return [];
    if (this.activeField === 'class') return this.classOptions;
    return this.options[this.activeField] ?? [];
  }

  // ── Request-to-add modal ─────────────────────────────────────────────────
  showRequestPopup = false;
  requestForm: Record<string, string> = { schoolName: '', city: '', branch: '' };
  requestFields = [
    { key: 'schoolName', placeholder: 'Enter School Name' },
    { key: 'city',       placeholder: 'Enter City' },
    { key: 'branch',     placeholder: 'Enter Branch e.g. Gandhi Road' }
  ];

  openRequestPopup(): void  { this.showRequestPopup = true; }
  closeRequestPopup(): void { this.showRequestPopup = false; }

  sendRequest(): void {
    this.closeRequestPopup();
    this.goToProductStore();
  }

  // This page only ever opens for categories that require both a school and a
  // class, so require both to be picked before the user can proceed.
  get canEnterStore(): boolean {
    return !!this.selectedSchool && !!this.selectedValues['class'];
  }

  enterStore(): void {
    if (!this.canEnterStore) return;
    this.goToProductStore();
  }

  private goToProductStore(): void {
    const queryParams: Record<string, string> = {};
    if (this.categoryId != null) queryParams['category'] = String(this.categoryId);
    if (this.selectedSchool) {
      queryParams['schoolId'] = String(this.selectedSchool.id);
      queryParams['schoolName'] = this.selectedValues['school'] ?? this.selectedSchool.name;
    }
    if (this.selectedValues['class']) queryParams['className'] = this.selectedValues['class'];
    if (this.selectedClassId != null) queryParams['classId'] = String(this.selectedClassId);

    this.router.navigate(['/authed', 'school-store', 'product'], { queryParams }).catch(() => {});
  }
}
