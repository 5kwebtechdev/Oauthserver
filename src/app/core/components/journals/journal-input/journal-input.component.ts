import { Component, EventEmitter, Input, OnInit, Output, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MindfulCardHeaderComponent } from '../../mindful-navigator/mindful-card-header/mindful-card-header.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { AuthApi } from '../../../api/auth.api';

@Component({
  selector: 'app-journal-input',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, MindfulCardHeaderComponent, MindfulButtonComponent],
  templateUrl: './journal-input.component.html',
  styleUrls: ['./journal-input.component.scss']
})
export class JournalInputComponent implements OnInit {
  @Input() initialText: string = '';
  @Input() placeholder: string = 'Write your thoughts...';
  @Output() save = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  text: string = '';
  showAttachPopup = false;
  // Track selected option index per section (e.g., { emotions: 0, sleep: 2 })
  public selected: { [section: string]: number | null } = {};

  public selectedFile: File | null = null;

  // Option label arrays to map selected index to a string payload
  emotionsOptions = ['Happy', 'Excited', 'Angry', 'Sad'];
  sleepOptions = ['Good', 'Bad', 'Medium', 'Early'];
  healthOptions = ['Good', 'Bad', 'Sick', 'Healthy'];
  hobbiesOptions = ['Reading', 'Sports', 'Music', 'Travel'];
  foodOptions = ['Healthy', 'Unhealthy', 'Home cooked', 'Fast Food'];
  socialOptions = ['Friends', 'Family', 'Alone', 'Party'];
  schoolOptions = ['Good', 'Bad', 'Study', 'Exam'];

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(private router: Router, private http: HttpClient, private authApi: AuthApi) { }

  ngOnInit(): void {
    this.text = this.initialText || '';
  }

  submit(): void {
    // Build payload from selections and notes
    const payload: any = {
      emotions: this.selected['emotions'] != null ? this.emotionsOptions[this.selected['emotions'] as number] : null,
      sleep: this.selected['sleep'] != null ? this.sleepOptions[this.selected['sleep'] as number] : null,
      health: this.selected['health'] != null ? this.healthOptions[this.selected['health'] as number] : null,
      hobbies: this.selected['hobbies'] != null ? this.hobbiesOptions[this.selected['hobbies'] as number] : null,
      food: this.selected['food'] != null ? this.foodOptions[this.selected['food'] as number] : null,
      social: this.selected['social'] != null ? this.socialOptions[this.selected['social'] as number] : null,
      school: this.selected['school'] != null ? this.schoolOptions[this.selected['school'] as number] : null,
      notes: this.text || ''
    };

    const url = `${environment.apiUrl}/journal/add`;

  // Always send JSON. If there's a selected file, convert it to base64 and include as `attachment`.
    const postJson = async () => {
      const body: any = { ...payload };
      if (this.selectedFile) {
        try {
          const base64 = await this.readFileAsBase64(this.selectedFile);
          body.attachment = {
            name: this.selectedFile.name,
            type: this.selectedFile.type || 'application/octet-stream',
            content: base64.replace(/^data:\w+\/[-+.\w]+;base64,/, '')
          };
        } catch (e) {
          console.error('Failed to read selected file as base64:', e);
        }
      }

      this.http.post(url, body, this.authHeaders(true)).subscribe({
        next: (res) => {
          console.log('Journal added:', res);
          this.save.emit(this.text);
          this.resetForm();
          // Navigate to the journal output page to show entries after successful save
          try {
            this.router.navigate(['/authed/journal-output']);
          } catch (e) {
            console.warn('Navigation to journal-output failed', e);
          }
        },
        error: (err) => {
          console.error('Failed to add journal:', err);
        }
      });
    };

    postJson();
  }

  private readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => { reader.abort(); reject(new Error('Problem reading file')); };
      reader.onload = () => {
        const result = reader.result as string | ArrayBuffer | null;
        if (typeof result === 'string') resolve(result);
        else if (result instanceof ArrayBuffer) {
          let binary = '';
          const bytes = new Uint8Array(result);
          for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
          resolve('data:' + (file.type || 'application/octet-stream') + ';base64,' + btoa(binary));
        } else reject(new Error('Unsupported file reader result'));
      };
      reader.readAsDataURL(file);
    });
  }

  private resetForm(): void {
    this.text = '';
    this.selected = {};
    this.selectedFile = null;
    if (this.fileInput && this.fileInput.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  onCancel(): void {
    this.cancel.emit();
    this.text = this.initialText || '';
  }

  /**
   * Navigate back to the journals listing (user dashboard home).
   */
  goBack(): void {
    // The journals list is displayed in the authenticated user dashboard at /authed/user-dashboard
    this.router.navigate(['/authed/user-dashboard']);
  }

  // Open the attachment chooser popup (simulates native permission dialog)
  openAttachPopup(): void {
    this.showAttachPopup = true;
  }

  // Handle the user allowing access - stub for now to integrate with file picker
  onAllowAttach(): void {
    this.showAttachPopup = false;
    // trigger the hidden file input to open system file picker
    setTimeout(() => {
      try {
        this.fileInput?.nativeElement?.click();
      } catch (e) {
        console.warn('file input not available', e);
      }
    }, 50);
  }

  // Handle the user denying access
  onDenyAttach(): void {
    this.showAttachPopup = false;
    console.log('User denied attachment access');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input && input.files && input.files.length) {
      const f = input.files[0];
      const maxBytes = 5 * 1024 * 1024; // 5 MB
      if (f.size > maxBytes) {
        console.warn('Selected file too large:', f.size);
        alert('Selected file is too large. Please choose a file smaller than 5 MB.');
        input.value = '';
        this.selectedFile = null;
        return;
      }
      this.selectedFile = f;
      console.log('Selected file:', this.selectedFile.name, 'size:', this.selectedFile.size);
    }
  }

  private authHeaders(contentTypeJson = false): { headers: HttpHeaders } {
    const token = this.authApi.getToken();
    let headers = new HttpHeaders();
    if (token) {
      const value = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      headers = headers.set('Authorization', value);
    }
    if (contentTypeJson) {
      headers = headers.set('Content-Type', 'application/json');
    }
    return { headers };
  }

  /**
   * Select an option in a given section. If the same option is clicked again, toggle off.
   */
  selectOption(section: string, index: number): void {
    const prev = this.selected[section];
    if (prev === index) {
      this.selected[section] = null;
    } else {
      this.selected[section] = index;
    }
  }

  isSelected(section: string, index: number): boolean {
    return this.selected[section] === index;
  }
}
