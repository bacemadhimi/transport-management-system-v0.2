// driver-form.ts
import { Component, ElementRef, inject, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { Http } from '../../../services/http';
import { IDriver } from '../../../types/driver';
import { IZone } from '../../../types/zone';
import Swal from 'sweetalert2';
import { MatSelectModule } from '@angular/material/select';
import { Subscription } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ICity } from '../../../types/city';
import { Translation } from '../../../services/Translation';
import { TripSettingsService } from '../../../services/trips-settings.service';
import { ITripSettings } from '../../../types/trip';

@Component({
  selector: 'app-driver-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatDialogModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatIconModule
  ],
  templateUrl: './driver-form.html',
  styleUrls: ['./driver-form.scss']
})
export class DriverForm implements OnInit, OnDestroy {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<DriverForm>);
  data = inject<{ driverId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};
  tripSettingsService = inject(TripSettingsService);
  translation = inject(Translation);

  @ViewChild('phoneInput') phoneInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInput') fileInput!: ElementRef;
  
  private iti: any;
  
 
  tripSettings: ITripSettings | null = null;
  private settingsSubscription: Subscription | null = null;


  imageBase64: string | null = null;
  imagePreview: string | null = null;
  fileError: string | null = null;
  originalImageBase64: string | null = null;
  hasExistingImage = false;
  selectedFile: File | null = null;
  
 
  trucks: any[] = [];
  loadingTrucks: boolean = false;
  isSubmitting = false;
  showingAlert = false;
  loadingZones = false;
  zones: IZone[] = [];
  private subscriptions: Subscription[] = [];
  loadingCities = false;
  cities: ICity[] = [];

  
  driverForm = this.fb.group({
    name: this.fb.control<string>('', [Validators.required]),
    email: this.fb.control<string>('', [Validators.required, Validators.email]),
    permisNumber: this.fb.control<string>('', [Validators.required]),
    phone: this.fb.control<string>('', [Validators.required, this.validatePhone.bind(this)]),
    status: this.fb.control<string>('Disponible'),
    zoneId: this.fb.control<number | null>(null, [Validators.required]),
    cityId: this.fb.control<number | null>(null, [Validators.required]),
    idCamion: this.fb.control<number | null>(null) 
  });

  statuses = ['Disponible', 'En mission', 'Indisponible'];

 
  ngOnInit() {
    this.loadActiveZones();
    this.loadTrucks();
    this.loadTripSettings();
    this.listenToSettingsChanges();

    this.driverForm.get('zoneId')?.valueChanges.subscribe(zoneId => {
      this.onZoneChange(zoneId);
    });
    
    if (this.data.driverId) {
      this.loadDriver(this.data.driverId);
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.settingsSubscription) {
      this.settingsSubscription.unsubscribe();
    }
    if (this.iti) {
      this.iti.destroy();
    }
  }

  
  private loadTripSettings() {
    this.tripSettingsService.getSettings().subscribe({
      next: (settings) => {
        this.tripSettings = settings;
        this.updateTruckFieldValidation();
      },
      error: (error) => {
        console.error('Erreur chargement paramètres:', error);
   
        this.tripSettings = {
          linkDriverToTruck: true,
          allowEditTrips: true,
          allowDeleteTrips: true,
          editTimeLimit: 30,
          maxTripsPerDay: 10,
          tripOrder: 'chronological',
          requireDeleteConfirmation: true,
          notifyOnTripEdit: true,
          notifyOnTripDelete: true
        };
        this.updateTruckFieldValidation();
      }
    });
  }

  private listenToSettingsChanges() {
    this.settingsSubscription = this.tripSettingsService.settingsChanges$.subscribe({
      next: (updatedSettings) => {
        console.log('🔄 Paramètres mis à jour:', updatedSettings);
        this.tripSettings = updatedSettings;
        this.updateTruckFieldValidation();
      }
    });
  }

  private updateTruckFieldValidation() {
    const truckControl = this.driverForm.get('idCamion');
    
    if (!truckControl) return;
    
    if (this.tripSettings?.linkDriverToTruck) {
     
      truckControl.setValidators([Validators.required]);
      truckControl.enable({ emitEvent: false });
      console.log('🚛 Champ camion REQUIS');
    } else {
     
      truckControl.clearValidators();
      truckControl.setValue(null, { emitEvent: false }); 
      truckControl.disable({ emitEvent: false });
      console.log('🚛 Champ camion OPTIONNEL (désactivé)');
    }
    
    truckControl.updateValueAndValidity({ emitEvent: false });
  }


  private loadTrucks() {
    this.loadingTrucks = true;
    this.httpService.getTrucks().subscribe({
      next: (trucks) => {
        this.trucks = trucks;
        this.loadingTrucks = false;
      },
      error: (error) => {
        console.error('Error loading trucks:', error);
        this.loadingTrucks = false;
      }
    });
  }

  private loadActiveZones(): void {
    this.loadingZones = true;

    const zonesSub = this.httpService.getActiveZones().subscribe({
      next: (response) => {
        let zonesData: IZone[];

        if (response && typeof response === 'object' && 'data' in response) {
          zonesData = (response as any).data;
        } else if (Array.isArray(response)) {
          zonesData = response;
        } else if (response && typeof response === 'object' && 'zones' in response) {
          zonesData = (response as any).zones || (response as any).items || [];
        } else {
          zonesData = [];
        }

        this.zones = zonesData;
        this.loadingZones = false;
      },
      error: (error) => {
        console.error('Error loading active zones:', error);
        this.loadingZones = false;
      }
    });

    this.subscriptions.push(zonesSub);
  }

  private loadDriver(id: number) {
    const driverSub = this.httpService.getDriver(id).subscribe({
      next: (driver: IDriver) => {
        this.driverForm.patchValue({
          name: driver.name,
          email: driver.email || '',
          permisNumber: driver.permisNumber,
          phone: driver.phone?.toString() ?? "",
          status: driver.status,
          zoneId: driver.zoneId || null,
          cityId: driver.cityId || null,
          idCamion: driver.idCamion || null 
        });

        if (driver.imageBase64) {
          this.imageBase64 = driver.imageBase64;
          this.originalImageBase64 = driver.imageBase64;
          this.imagePreview = `data:image/png;base64,${driver.imageBase64}`;
          this.hasExistingImage = true;
        }

        if (driver.zoneId) {
          this.onZoneChange(driver.zoneId);
        }
        
        setTimeout(() => {
          if (driver.phoneCountry && this.iti) {
            this.iti.setCountry(driver.phoneCountry);
          }
          if (driver.phone) {
            this.iti.setNumber(driver.phone.toString());
          }

          this.updateTruckFieldValidation();
        }, 0);
      },
      error: (error) => {
        console.error('Error loading driver:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Impossible de charger les informations du chauffeur',
          confirmButtonText: 'OK'
        }).then(() => this.dialogRef.close());
      }
    });

    this.subscriptions.push(driverSub);
  }


  onSubmit() {
    if (!this.driverForm.valid || this.isSubmitting) return;

    this.isSubmitting = true;

    const formValue = this.driverForm.value;

    const value: IDriver = {
      id: this.data.driverId || 0,
      name: formValue.name!,
      email: formValue.email!,
      permisNumber: formValue.permisNumber!,
      phone: this.iti ? this.iti.getNumber() : formValue.phone!,
      phoneCountry: this.iti ? this.iti.getSelectedCountryData().iso2 : 'tn',
      status: formValue.status!,
      zoneId: formValue.zoneId!,
      cityId: formValue.cityId!,
      idCamion: formValue.idCamion || 0,
      imageBase64: this.imageBase64
    };

    if (this.data.driverId) {
      const updateSub = this.httpService.updateDriver(this.data.driverId, value).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showingAlert = true;
          Swal.fire({
            icon: 'success',
           // title: 'Chauffeur modifié avec succès',
            title: this.t('DRIVER_UPDATED_SUCCESS'),
            confirmButtonText: 'OK',
            allowOutsideClick: false,
            customClass: {
              popup: 'swal2-popup-custom',
              title: 'swal2-title-custom',
              icon: 'swal2-icon-custom',
              confirmButton: 'swal2-confirm-custom'
            }
          }).then(() => this.dialogRef.close(true));
        },
        error: (err) => {
          this.isSubmitting = false;
          this.handleApiError(err);
        }
      });

      this.subscriptions.push(updateSub);
    } else {
      const createSub = this.httpService.addDriver(value).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showingAlert = true;
          Swal.fire({
            icon: 'success',
            //title: 'Chauffeur ajouté avec succès',
            title: this.t('DRIVER_ADDED_SUCCESS'),
            confirmButtonText: 'OK',
            allowOutsideClick: false,
            customClass: {
              popup: 'swal2-popup-custom',
              title: 'swal2-title-custom',
              icon: 'swal2-icon-custom',
              confirmButton: 'swal2-confirm-custom'
            }
          }).then(() => this.dialogRef.close(true));
        },
        error: (err) => {
          this.isSubmitting = false;
          this.handleApiError(err);
        }
      });

      this.subscriptions.push(createSub);
    }
  }

  onCancel() {
    this.dialogRef.close();
  }


  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const maxSize = 2 * 1024 * 1024; 
    if (file.size > maxSize) {
      this.fileError = 'Image trop volumineuse (max 2MB).';
      this.imagePreview = null;
      this.imageBase64 = null;
      return;
    }

    this.fileError = null;
    const reader = new FileReader();
    reader.onload = () => {
      this.imagePreview = reader.result as string;
      this.imageBase64 = this.imagePreview.split(',')[1];
    };
    reader.readAsDataURL(file);
  }

  onDeletePhoto(event?: Event) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (confirm('Voulez-vous vraiment supprimer cette photo ?')) {
      this.imagePreview = null;
      this.imageBase64 = null;
      this.selectedFile = null;
      this.resetFileInput();

      if (this.hasExistingImage && this.originalImageBase64) {
        this.imageBase64 = '';
      }
    }
  }

  private resetFileInput() {
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  get hasPhoto(): boolean {
    return !!this.imagePreview || this.hasExistingImage;
  }

  get isPhotoChanged(): boolean {
    return this.imageBase64 !== this.originalImageBase64;
  }

  getErrorMessage(controlName: string): string {
    const control = this.driverForm.get(controlName);

    if (control?.hasError('required')) {
      return `${this.getFieldLabel(controlName)} est obligatoire`;
    }

    if (control?.hasError('minlength')) {
      const requiredLength = control.errors?.['minlength'].requiredLength;
      return `${this.getFieldLabel(controlName)} doit comporter au moins ${requiredLength} caractères`;
    }

    if (control?.hasError('pattern')) {
      return 'Format de téléphone invalide';
    }

    if (control?.hasError('email')) {
      return 'Format d\'email invalide';
    }

    return '';
  }

  private getFieldLabel(controlName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Le nom',
      email: 'L\'email',
      phone: 'Le téléphone',
      permisNumber: 'Le numéro de permis',
      status: 'Le statut',
      zoneId: 'La zone',
      cityId: 'La ville',
      idCamion: 'Le camion' 
    };
    return labels[controlName] || controlName;
  }

  private validatePhone(control: any) {
    if (!this.iti) return null;
    return this.iti.isValidNumber() ? null : { pattern: true };
  }

  private handleApiError(err: any) {
    let errorMessage = 'Une erreur est survenue';

    if (err.error && err.error.message) {
      errorMessage = err.error.message;
    } else if (err.message) {
      errorMessage = err.message;
    }

    Swal.fire({
      icon: 'error',
      title: 'Erreur',
      text: errorMessage,
      confirmButtonText: 'OK'
    });
  }


  private onZoneChange(zoneId: number | null): void {
    if (!zoneId) {
      this.cities = [];
      this.driverForm.get('cityId')?.setValue(null);
      this.driverForm.get('cityId')?.disable();
      return;
    }

    this.loadingCities = true;
    this.driverForm.get('cityId')?.disable();

    const citiesSub = this.httpService.getCitiesByZone(zoneId).subscribe({
      next: (response) => {
        let citiesData: ICity[];

        if (response && typeof response === 'object' && 'data' in response) {
          citiesData = (response as any).data;
        } else if (Array.isArray(response)) {
          citiesData = response;
        } else {
          citiesData = [];
        }

        this.cities = citiesData;
        this.loadingCities = false;

        if (this.cities.length > 0) {
          this.driverForm.get('cityId')?.enable();
        }
      },
      error: (error) => {
        console.error('Error loading cities for zone:', zoneId, error);
        this.loadingCities = false;
        this.cities = [];
      }
    });

    this.subscriptions.push(citiesSub);
  }

 
  ngAfterViewInit() {
    const loadScript = (src: string) =>
      new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject();
        document.body.appendChild(script);
      });

    const loadCSS = (href: string) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    };

    loadCSS(
      'https://cdn.jsdelivr.net/npm/intl-tel-input@19.1.1/build/css/intlTelInput.min.css'
    );

    loadScript(
      'https://cdn.jsdelivr.net/npm/intl-tel-input@19.1.1/build/js/intlTelInput.min.js'
    )
      .then(() =>
        loadScript(
          'https://cdn.jsdelivr.net/npm/intl-tel-input@19.1.1/build/js/utils.js'
        )
      )
      .then(() => {
        this.iti = (window as any).intlTelInput(
          this.phoneInput.nativeElement,
          {
            initialCountry: 'tn',
            separateDialCode: true,
            nationalMode: false,
            formatOnDisplay: true,
            utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@19.1.1/build/js/utils.js'
          }
        );

        this.phoneInput.nativeElement.addEventListener('blur', () => {
          const number = this.iti.getNumber();
          this.driverForm.get('phone')?.setValue(number);
        });
      })
      .catch(() => {
        console.error('Failed to load intl-tel-input scripts.');
      });
  }


  t(key: string): string {
    return this.translation.t(key);
  }
}