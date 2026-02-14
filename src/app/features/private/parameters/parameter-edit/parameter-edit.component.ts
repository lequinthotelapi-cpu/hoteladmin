import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ParametersService } from '../../../../core/services/parameters.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AlertService } from '../../../../core/services/alert.service';
import { ParameterCategory, ParameterOption, ParameterCategoryId } from '../../../../domain/models/parameter.model';

@Component({
  selector: 'fury-parameter-edit',
  templateUrl: './parameter-edit.component.html',
  styleUrls: ['./parameter-edit.component.scss']
})
export class ParameterEditComponent implements OnInit {
  categoryId: ParameterCategoryId;
  category: ParameterCategory;
  options: ParameterOption[] = [];
  editingOption: ParameterOption | null = null;
  newOptionValue = '';
  newOptionLabel = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private parametersService: ParametersService,
    private authService: AuthService,
    private alertService: AlertService
  ) {}

  ngOnInit() {
    this.categoryId = this.route.snapshot.params['id'] as ParameterCategoryId;
    this.loadCategory();
  }

  loadCategory() {
    const cat = this.parametersService.getCategory(this.categoryId);
    if (cat) {
      this.category = cat;
      this.options = [...cat.options].sort((a, b) => a.order - b.order);
    } else {
      this.router.navigate(['/parameters']);
    }
  }

  drop(event: CdkDragDrop<ParameterOption[]>) {
    moveItemInArray(this.options, event.previousIndex, event.currentIndex);
    this.options = this.options.map((opt, index) => ({ ...opt, order: index }));
  }

  addOption() {
    if (!this.newOptionValue || !this.newOptionLabel) {
      this.alertService.warning('Complete todos los campos');
      return;
    }

    if (this.options.some(opt => opt.value === this.newOptionValue)) {
      this.alertService.error('El valor ya existe');
      return;
    }

    this.options.push({
      value: this.newOptionValue,
      label: this.newOptionLabel,
      active: true,
      order: this.options.length
    });

    this.newOptionValue = '';
    this.newOptionLabel = '';
  }

  toggleActive(option: ParameterOption) {
    option.active = !option.active;
  }

  deleteOption(option: ParameterOption) {
    this.options = this.options.filter(opt => opt.value !== option.value);
    this.options = this.options.map((opt, index) => ({ ...opt, order: index }));
  }

  async save() {
    const confirmed = await this.alertService.confirm(
      '¿Guardar los cambios en esta categoría?',
      'Confirmar cambios',
      'Sí, guardar'
    );

    if (confirmed) {
      try {
        const currentUser = this.authService.getCurrentUser();
        await this.parametersService.updateCategory(
          this.categoryId,
          this.options,
          currentUser?.uid || 'system'
        );
        this.alertService.success('Parámetros actualizados correctamente');
        this.router.navigate(['/parameters']);
      } catch (error) {
        this.alertService.error('Error al guardar los cambios');
      }
    }
  }

  cancel() {
    this.router.navigate(['/parameters']);
  }
}
