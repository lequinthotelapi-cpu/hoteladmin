import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Booking, AvailableRoom, BookingSearchCriteria, CreateBookingDto } from '../../../../domain/models/booking.model';
import { BookingService } from '../../../../core/services/booking.service';
import { GuestService } from '../../../../core/services/guest.service';
import { ParametersService } from '../../../../core/services/parameters.service';
import { AlertService } from '../../../../core/services/alert.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Guest } from '../../../../domain/models/guest.model';

@Component({
  selector: 'fury-booking-create-update',
  templateUrl: './booking-create-update.component.html',
  styleUrls: ['./booking-create-update.component.scss']
})
export class BookingCreateUpdateComponent implements OnInit {
  currentStep = 0;
  isEditMode = false;
  loading = false;

  searchForm!: FormGroup;
  guestForm!: FormGroup;
  detailsForm!: FormGroup;

  availableRooms: AvailableRoom[] = [];
  guests: Guest[] = [];
  sources: any[] = [];
  selectedRoom: AvailableRoom | null = null;
  selectedGuest: Guest | null = null;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<BookingCreateUpdateComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { booking: Booking | null, preselectedDate?: Date },
    private bookingService: BookingService,
    private guestService: GuestService,
    private parametersService: ParametersService,
    private alertService: AlertService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.isEditMode = !!this.data.booking;
    this.loadData();
    this.buildForms();
  }

  loadData(): void {
    this.guestService.getAll().subscribe(guests => {
      this.guests = guests.filter(g => g.status === 'active');
    });

    this.sources = this.parametersService.getOptions('reservationSources');
  }

  buildForms(): void {
    const booking = this.data.booking;
    const preselectedDate = this.data.preselectedDate;

    this.searchForm = this.fb.group({
      checkInDate: [booking?.checkInDate || preselectedDate || new Date(), Validators.required],
      checkOutDate: [booking?.checkOutDate || new Date(), Validators.required],
      adults: [booking?.adults || 1, [Validators.required, Validators.min(1)]],
      children: [booking?.children || 0, [Validators.min(0)]],
      roomType: ['']
    });

    this.guestForm = this.fb.group({
      guestId: [booking?.guestId || '', Validators.required]
    });

    this.detailsForm = this.fb.group({
      source: [booking?.source || 'direct', Validators.required],
      specialRequests: [booking?.specialRequests || ''],
      notes: [booking?.notes || '']
    });
  }

  async searchRooms(): Promise<void> {
    if (this.searchForm.invalid) {
      this.searchForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    try {
      const criteria: BookingSearchCriteria = this.searchForm.value;
      this.availableRooms = await this.bookingService.searchAvailableRooms(criteria);
      
      if (this.availableRooms.length === 0) {
        this.alertService.warning('Sin Disponibilidad', 'No hay habitaciones disponibles para las fechas seleccionadas');
      } else {
        this.currentStep = 1;
      }
    } catch (error: any) {
      this.alertService.error('Error', error.message);
    } finally {
      this.loading = false;
    }
  }

  selectRoom(room: AvailableRoom): void {
    this.selectedRoom = room;
  }

  selectGuest(): void {
    const guestId = this.guestForm.get('guestId')?.value;
    this.selectedGuest = this.guests.find(g => g.id === guestId) || null;
    this.currentStep = 3;
  }

  async onSubmit(): Promise<void> {
    if (!this.selectedRoom || !this.selectedGuest) {
      return;
    }

    this.loading = true;
    try {
      const userId = this.authService.getCurrentUser()?.uid || '';
      
      const dto: CreateBookingDto = {
        guestId: this.selectedGuest.id!,
        roomId: this.selectedRoom.id,
        checkInDate: this.searchForm.value.checkInDate,
        checkOutDate: this.searchForm.value.checkOutDate,
        adults: this.searchForm.value.adults,
        children: this.searchForm.value.children,
        source: this.detailsForm.value.source,
        specialRequests: this.detailsForm.value.specialRequests,
        notes: this.detailsForm.value.notes
      };

      await this.bookingService.createBooking(dto, userId);
      this.alertService.success('Reserva creada exitosamente');
      this.dialogRef.close(true);
    } catch (error: any) {
      this.alertService.error('Error', error.message);
    } finally {
      this.loading = false;
    }
  }

  goBack(): void {
    if (this.currentStep > 0) {
      this.currentStep--;
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
