import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { Guest } from '../../../../domain/models/guest.model';
import { GuestService } from '../../../../core/services/guest.service';
import { ParametersService } from '../../../../core/services/parameters.service';
import { AlertService } from '../../../../core/services/alert.service';
import { StorageService } from '../../../../core/services/storage.service';
import { GuestCreateUpdateComponent } from '../guest-create-update/guest-create-update.component';
import { ListColumn } from '../../../../../@fury/shared/list/list-column.model';

@Component({
  selector: 'fury-guests-list',
  templateUrl: './guests-list.component.html',
  styleUrls: ['./guests-list.component.scss']
})
export class GuestsListComponent implements OnInit, AfterViewInit {
  columns: ListColumn[] = [
    { name: 'Foto', property: 'photo', visible: true },
    { name: 'Nombre', property: 'fullName', visible: true },
    { name: 'Email', property: 'email', visible: true },
    { name: 'Teléfono', property: 'phone', visible: true },
    { name: 'Tipo', property: 'guestType', visible: true },
    { name: 'Estado', property: 'status', visible: true },
    { name: 'VIP', property: 'vip', visible: true },
    { name: 'Acciones', property: 'actions', visible: true }
  ];
  dataSource: MatTableDataSource<Guest>;
  
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  guestTypes: any[] = [];
  guestStatuses: any[] = [];
  processingGuestId: string | null = null;

  constructor(
    private guestService: GuestService,
    private parametersService: ParametersService,
    private alertService: AlertService,
    private storageService: StorageService,
    private dialog: MatDialog
  ) {
    this.dataSource = new MatTableDataSource<Guest>([]);
  }

  get visibleColumns() {
    return this.columns.filter(column => column.visible).map(column => column.property);
  }

  ngOnInit(): void {
    this.loadParameters();
    this.loadGuests();
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadParameters(): void {
    this.guestTypes = this.parametersService.getOptions('guestTypes');
    this.guestStatuses = this.parametersService.getOptions('guestStatuses');
  }

  loadGuests(): void {
    this.guestService.getAll().subscribe({
      next: (guests) => {
        this.dataSource.data = guests;
      },
      error: (error) => {
        this.alertService.error('Error al cargar huéspedes', error.message);
      }
    });
  }

  onFilterChange(value: string): void {
    if (!this.dataSource) {
      return;
    }
    value = value.trim().toLowerCase();
    this.dataSource.filter = value;
  }

  createGuest(): void {
    const dialogRef = this.dialog.open(GuestCreateUpdateComponent, {
      width: '900px',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadGuests();
      }
    });
  }

  editGuest(guest: Guest): void {
    const dialogRef = this.dialog.open(GuestCreateUpdateComponent, {
      width: '900px',
      data: { mode: 'edit', guest }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadGuests();
      }
    });
  }

  async toggleVipStatus(guest: Guest, event: any): Promise<void> {
    const newStatus = event.checked;
    event.source.checked = guest.vip;
    this.processingGuestId = guest.id;

    const confirmed = await this.alertService.confirm(
      `¿Cambiar estado VIP?`,
      `¿Está seguro de ${newStatus ? 'activar' : 'desactivar'} el estado VIP para ${guest.firstName} ${guest.lastName}?`
    );

    if (confirmed) {
      try {
        await this.guestService.toggleVipStatus(guest.id, newStatus);
        event.source.checked = newStatus;
        this.alertService.success('Estado VIP actualizado', `El estado VIP ha sido ${newStatus ? 'activado' : 'desactivado'} correctamente`);
        this.loadGuests();
      } catch (error: any) {
        this.alertService.error('Error', error.message);
      }
    }

    this.processingGuestId = null;
  }

  async deleteGuest(guest: Guest): Promise<void> {
    const confirmed = await this.alertService.confirmDelete(
      `¿Eliminar huésped?`,
      `¿Está seguro de eliminar a ${guest.firstName} ${guest.lastName}? Esta acción no se puede deshacer.`
    );

    if (confirmed) {
      try {
        if (guest.photoUrl) {
          await this.storageService.deleteGuestPhoto(guest.photoUrl);
        }
        await this.guestService.delete(guest.id);
        this.alertService.success('Huésped eliminado', 'El huésped ha sido eliminado correctamente');
        this.loadGuests();
      } catch (error: any) {
        this.alertService.error('Error al eliminar huésped', error.message);
      }
    }
  }

  getGuestTypeLabel(value: string): string {
    const type = this.guestTypes.find(t => t.value === value);
    return type ? type.label : value;
  }

  getGuestStatusLabel(value: string): string {
    const status = this.guestStatuses.find(s => s.value === value);
    return status ? status.label : value;
  }

  getStatusBadgeClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      'active': 'badge-success',
      'inactive': 'badge-secondary',
      'blocked': 'badge-danger'
    };
    return statusMap[status] || 'badge-secondary';
  }
}
