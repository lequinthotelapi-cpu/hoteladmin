import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HousekeepingContainerComponent } from './housekeeping-container/housekeeping-container.component';

const routes: Routes = [
  {
    path: '',
    component: HousekeepingContainerComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HousekeepingRoutingModule { }
