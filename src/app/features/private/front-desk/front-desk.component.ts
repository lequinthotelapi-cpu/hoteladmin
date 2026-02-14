import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'fury-front-desk',
  templateUrl: './front-desk.component.html',
  styleUrls: ['./front-desk.component.scss']
})
export class FrontDeskComponent implements OnInit {
  selectedTab = 0;

  constructor() {}

  ngOnInit(): void {}
}
