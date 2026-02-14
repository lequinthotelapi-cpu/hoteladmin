import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ParametersService } from '../../../../core/services/parameters.service';
import { ParameterCategory, PARAMETER_CATEGORIES, ParameterCategoryId } from '../../../../domain/models/parameter.model';

@Component({
  selector: 'fury-parameters-list',
  templateUrl: './parameters-list.component.html',
  styleUrls: ['./parameters-list.component.scss']
})
export class ParametersListComponent implements OnInit {
  categories: ParameterCategory[] = [];
  displayedColumns = ['icon', 'name', 'description', 'count', 'updatedAt', 'actions'];

  constructor(
    private parametersService: ParametersService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.categories = this.parametersService.getAllCategories();
  }

  editCategory(category: ParameterCategory) {
    this.router.navigate(['/parameters', category.id]);
  }

  getCategoryIcon(categoryId: string): string {
    const icons: Record<string, string> = {
      documentTypes: 'badge',
      guestTypes: 'people',
      guestStatuses: 'toggle_on',
      roomTypes: 'hotel',
      roomStatuses: 'meeting_room',
      bedTypes: 'bed',
      amenities: 'star',
      countries: 'public',
      currencies: 'attach_money',
      paymentMethods: 'payment',
      reservationSources: 'source',
      reservationStatuses: 'event'
    };
    return icons[categoryId] || 'settings';
  }

  getActiveCount(category: ParameterCategory): number {
    return category.options.filter(opt => opt.active).length;
  }
}
