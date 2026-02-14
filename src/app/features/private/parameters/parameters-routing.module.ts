import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ParametersListComponent } from './parameters-list/parameters-list.component';
import { ParameterEditComponent } from './parameter-edit/parameter-edit.component';

const routes: Routes = [
  {
    path: '',
    component: ParametersListComponent
  },
  {
    path: ':id',
    component: ParameterEditComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ParametersRoutingModule { }
