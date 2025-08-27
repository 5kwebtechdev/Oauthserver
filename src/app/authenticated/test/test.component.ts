import { Component, OnInit } from '@angular/core';
import {NgClass} from "@angular/common";
import {HabitCardComponent} from "../../core/components/habit-card/habit-card.component";
import {IonicModule} from "@ionic/angular";
import {FooterComponent} from "../../core/components/footer/footer.component";
import {MindfulDropdownComponent} from "../../core/components/mindful-dropdown/mindful-dropdown.component";
import {MindfulSelectorsComponent} from "../../core/components/mindful-selectors/mindful-selectors.component";
import {MindfulInputsModule} from "../../core/components/mindful-inputs/mindful-inputs.module";

@Component({
  selector: 'app-test',
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.scss'],
  imports: [
    NgClass,
    HabitCardComponent,
    IonicModule,
    FooterComponent,
    MindfulDropdownComponent,
    MindfulSelectorsComponent,
    MindfulInputsModule
  ]
})
export class TestComponent  implements OnInit {

  public currentActive: any = 'habits';
  constructor() { }

  ngOnInit() {}

  protected readonly console = console;
}
