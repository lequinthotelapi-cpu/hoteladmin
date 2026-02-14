import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { map, startWith } from 'rxjs/operators';
import { Guest, Companion } from '../../../../domain/models/guest.model';
import { Country } from '../../../../domain/models/country.model';
import { GuestService } from '../../../../core/services/guest.service';
import { ParametersService } from '../../../../core/services/parameters.service';
import { CountriesService } from '../../../../core/services/countries.service';
import { StorageService } from '../../../../core/services/storage.service';
import { AlertService } from '../../../../core/services/alert.service';

@Component({
  selector: 'fury-guest-create-update',
  templateUrl: './guest-create-update.component.html',
  styleUrls: ['./guest-create-update.component.scss']
})
export class GuestCreateUpdateComponent implements OnInit {
  form: FormGroup;
  mode: 'create' | 'edit';
  guest: Guest | null = null;
  selectedTabIndex = 0;

  documentTypes: any[] = [];
  guestTypes: any[] = [];
  guestStatuses: any[] = [];
  countries: Country[] = [];
  filteredCountriesOrigin: Observable<Country[]>;
  filteredCountriesResidence: Observable<Country[]>;
  genders = [
    { value: 'masculino', label: 'Masculino' },
    { value: 'femenino', label: 'Femenino' }
  ];

  photoPreview: string | null = null;
  selectedPhotoFile: File | null = null;
  uploadingPhoto = false;

  constructor(
    private fb: FormBuilder,
    private guestService: GuestService,
    private parametersService: ParametersService,
    private countriesService: CountriesService,
    private storageService: StorageService,
    private alertService: AlertService,
    private dialogRef: MatDialogRef<GuestCreateUpdateComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.mode = data.mode;
    this.guest = data.guest || null;
  }

  ngOnInit(): void {
    this.loadParameters();
    this.loadCountries();
    this.initForm();
    
    if (this.mode === 'edit' && this.guest) {
      this.populateForm();
    }
  }

  loadParameters(): void {
    this.documentTypes = this.parametersService.getOptions('documentTypes');
    this.guestTypes = this.parametersService.getOptions('guestTypes');
    this.guestStatuses = this.parametersService.getOptions('guestStatuses');
  }

  loadCountries(): void {
    this.countriesService.loadCountries().subscribe(countries => {
      this.countries = countries;
      this.setupAutocomplete();
    });
  }

  setupAutocomplete(): void {
    this.filteredCountriesOrigin = this.form.get('countryOfOrigin')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filterCountries(value || ''))
    );

    this.filteredCountriesResidence = this.form.get('country')!.valueChanges.pipe(
      startWith(''),
      map(value => this._filterCountries(value || ''))
    );
  }

  private _filterCountries(value: string): Country[] {
    if (!value) return this.countries;
    const filterValue = value.toLowerCase();
    return this.countries.filter(country => 
      country.name.toLowerCase().includes(filterValue) ||
      country.iso2.toLowerCase().includes(filterValue) ||
      country.iso3.toLowerCase().includes(filterValue)
    );
  }

  displayCountry(countryName: string): string {
    if (!countryName) return '';
    const country = this.countries.find(c => c.name === countryName);
    return country ? `${country.unicodeFlag} ${country.name}` : countryName;
  }

  initForm(): void {
    this.form = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      documentType: ['', Validators.required],
      documentNumber: ['', Validators.required],
      guestType: ['', Validators.required],
      status: ['active', Validators.required],
      vip: [false],
      dateOfBirth: [''],
      countryOfOrigin: [''],
      gender: [''],
      alternativePhone: [''],
      address: [''],
      city: [''],
      country: [''],
      notes: [''],
      companions: this.fb.array([])
    });
  }

  populateForm(): void {
    if (!this.guest) return;

    this.form.patchValue({
      firstName: this.guest.firstName,
      lastName: this.guest.lastName,
      email: this.guest.email,
      phone: this.guest.phone,
      documentType: this.guest.documentType,
      documentNumber: this.guest.documentNumber,
      guestType: this.guest.guestType,
      status: this.guest.status,
      vip: this.guest.vip,
      dateOfBirth: this.guest.dateOfBirth,
      countryOfOrigin: this.guest.countryOfOrigin,
      gender: this.guest.gender,
      alternativePhone: this.guest.alternativePhone,
      address: this.guest.address,
      city: this.guest.city,
      country: this.guest.country,
      notes: this.guest.notes
    });

    if (this.guest.photoUrl) {
      this.photoPreview = this.guest.photoUrl;
    }

    if (this.guest.companions && this.guest.companions.length > 0) {
      this.guest.companions.forEach(companion => {
        this.addCompanion(companion);
      });
    }
  }

  get companions(): FormArray {
    return this.form.get('companions') as FormArray;
  }

  addCompanion(companion?: Companion): void {
    const companionGroup = this.fb.group({
      firstName: [companion?.firstName || '', Validators.required],
      lastName: [companion?.lastName || '', Validators.required],
      relationship: [companion?.relationship || ''],
      age: [companion?.age || null]
    });
    this.companions.push(companionGroup);
  }

  removeCompanion(index: number): void {
    this.companions.removeAt(index);
  }

  onPhotoSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        this.alertService.error('Por favor seleccione un archivo de imagen válido', 'Error');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        this.alertService.error('La imagen no debe superar los 5MB', 'Error');
        return;
      }

      this.selectedPhotoFile = file;
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.photoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto(): void {
    this.selectedPhotoFile = null;
    this.photoPreview = null;
  }

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.alertService.warning('Por favor complete todos los campos requeridos', 'Formulario incompleto');
      return;
    }

    try {
      this.alertService.loading('Guardando huésped...');

      let photoUrl = this.guest?.photoUrl || null;

      if (this.selectedPhotoFile) {
        this.uploadingPhoto = true;
        photoUrl = await this.storageService.uploadGuestPhoto(this.selectedPhotoFile);
        this.uploadingPhoto = false;

        if (this.guest?.photoUrl && this.guest.photoUrl !== photoUrl) {
          await this.storageService.deleteGuestPhoto(this.guest.photoUrl);
        }
      }

      const formData = {
        ...this.form.value,
        photoUrl
      };

      if (this.mode === 'create') {
        await this.guestService.create(formData);
        this.alertService.success('El huésped ha sido creado correctamente', 'Huésped creado');
      } else if (this.guest) {
        await this.guestService.update(this.guest.id, formData);
        this.alertService.success('El huésped ha sido actualizado correctamente', 'Huésped actualizado');
      }

      this.dialogRef.close(true);
    } catch (error: any) {
      this.uploadingPhoto = false;
      this.alertService.error(error.message, 'Error');
    }
  }

  cancel(): void {
    this.dialogRef.close(false);
  }
}
