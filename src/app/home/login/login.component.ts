import { Component, OnInit } from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from "@angular/forms";

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  standalone: false,
})
export class LoginComponent  implements OnInit {
  public signInForm: FormGroup;
  public loginMode: 'email' | 'phone' = 'email';
  public hidePassword = true;
  public whatsappConsent = true;


  constructor(private fb: FormBuilder) {
    this.signInForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', []],
      phone: ['', []],
    });
  }

  get email() {
    return this.signInForm.get('email');
  }

  get phone(){
    return this.signInForm.get('phone');
  }
  get password(){
    return this.signInForm.get('password');
  }

  switchMode(mode: 'email' | 'phone') {
    this.loginMode = mode;
  }

  onSubmit() {
    if (this.signInForm.valid) {
      console.log(this.signInForm.value);
    }
  }

  ngOnInit(): void {
    console.log('LoginComponent initialized');
  }
}
