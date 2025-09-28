import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MindfulCardHeaderComponent } from '../../mindful-navigator/mindful-card-header/mindful-card-header.component';
import { MindfulButtonComponent } from '../../mindful-button/mindful-button.component';

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
  // Controls whether the attach permission popup is visible
  showAttachPopup = false;

  constructor(private router: Router) { }

  ngOnInit(): void {
    this.text = this.initialText || '';
  }

  submit(): void {
    this.save.emit(this.text);
    this.text = '';
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
    // TODO: integrate a proper file picker or Capacitor Filesystem/Camera plugin here
    console.log('User allowed attachment access');
  }

  // Handle the user denying access
  onDenyAttach(): void {
    this.showAttachPopup = false;
    console.log('User denied attachment access');
  }
}
