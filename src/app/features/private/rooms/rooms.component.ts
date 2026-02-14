import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'fury-rooms',
  templateUrl: './rooms.component.html',
  styleUrls: ['./rooms.component.scss']
})
export class RoomsComponent implements OnInit {
  viewMode: 'list' | 'grid' = 'grid';

  constructor() { }

  ngOnInit(): void {
  }

  toggleView(mode: 'list' | 'grid'): void {
    this.viewMode = mode;
  }
}
