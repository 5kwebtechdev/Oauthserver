import { Component, OnInit } from '@angular/core';
import {buttonStyles} from "../core/components/mindful-button/button.types";

@Component({
  selector: 'app-authenticated',
  templateUrl: './authenticated.component.html',
  styleUrls: ['./authenticated.component.scss'],
  standalone: false
})
export class AuthenticatedComponent  implements OnInit {
  public currentActive: any = 'habits';
  buttonStylesArray: buttonStyles[] = [
    'lavendar',
    'lavendar-transparent',
    'violet',
    'orange',
    'orange-transparent',
    'green',
    'magenta',
    'magenta-transparent',
    'mango',
    'plum',
    'red',
    'gold',
    'aqua',
    'coral',
  ];
  constructor() { }

  ngOnInit() {}

    protected readonly console = console;
}
