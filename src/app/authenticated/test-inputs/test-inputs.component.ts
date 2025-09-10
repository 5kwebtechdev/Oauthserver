import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MindfulInputsModule } from '../../core/components/mindful-inputs/mindful-inputs.module';

@Component({
  selector: 'test-inputs',
  standalone: true,
  imports: [CommonModule, MindfulInputsModule],
  template: `
    <section style="padding:1rem;">
      <h2>Mindful Inputs — Preview</h2>

      <div style="margin:12px 0">
        <h3>Birthday Picker</h3>
        <mindful-birthdaypicker></mindful-birthdaypicker>
      </div>

      <div style="margin:12px 0">
        <h3>Completion</h3>
        <mindful-completion></mindful-completion>
      </div>

      <div style="margin:12px 0">
        <h3>Date Picker</h3>
        <mindful-datepicker></mindful-datepicker>
      </div>

      <div style="margin:12px 0">
        <h3>Time Picker</h3>
        <mindful-timepicker></mindful-timepicker>
      </div>

      <div style="margin:12px 0">
        <h3>Week Picker</h3>
        <mindful-week></mindful-week>
      </div>

    </section>
  `
})
export class TestInputsComponent {}
