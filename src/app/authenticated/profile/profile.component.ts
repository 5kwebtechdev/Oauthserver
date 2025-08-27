import { Component, OnInit } from '@angular/core';
import {ActivatedRoute} from "@angular/router";

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  standalone: false,
})

export class ProfileComponent{
  public section: string = 'home';
  constructor(
    private route: ActivatedRoute,
  ) {
    this.route.params.subscribe(params => {
      this.section = params['section'];
    });
  }
}
