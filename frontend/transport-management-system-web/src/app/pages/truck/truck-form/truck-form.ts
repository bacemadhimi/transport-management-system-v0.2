import { Component, ElementRef, inject, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Http } from '../../../services/http';
import { ITruck } from '../../../types/truck';
import { IZone } from '../../../types/zone';
import { ICity } from '../../../types/city';
import { MatSelectModule } from '@angular/material/select';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon'; 
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import Swal from 'sweetalert2';
import { Translation } from '../../../services/Translation';
import { Subscription } from 'rxjs';
import { OrderSettingsService } from '../../../services/order-settings.service';

@Component({
  selector: 'app-truck-form',
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
    MatNativeDateModule,
    MatDatepickerModule,
    MatIconModule, 
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './truck-form.html',
  styleUrls: ['./truck-form.scss']
})
export class TruckForm implements OnInit, OnDestroy {
  fb = inject(FormBuilder);
  httpService = inject(Http);
   orderSettingsService = inject(OrderSettingsService);
  dialogRef = inject(MatDialogRef<TruckForm>);
  data = inject<{ truckId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};
  @ViewChild('fileInput') fileInput!: ElementRef;
  
  // Image properties
  imageBase64: string | null = null;
  imagePreview: string | null = null;
  fileError: string | null = null;
  originalImageBase64: string | null = null; 
  hasExistingImage = false;
  selectedFile: File | null = null;
  
  // Zone & City properties
  loadingZones = false;
  loadingCities = false;
  zones: IZone[] = [];
  cities: ICity[] = [];
  isSubmitting = false;
  selectedCapacityUnitLabel: string = '';
  private subscriptions: Subscription[] = [];

 capacityUnits: { value: string; label: string }[] = [];

  truckForm = this.fb.group({
    immatriculation: this.fb.control<string>('', [Validators.required, Validators.minLength(2)]),
    brand: this.fb.control<string>('', Validators.required),
      capacityUnit: this.fb.control<string | null>(null, Validators.required),
    capacity: this.fb.control<number>(0, [Validators.required, Validators.min(1)]),
    technicalVisitDate: this.fb.control<Date | null>(null, Validators.required),
    status: this.fb.control<string>('Disponible'),
    color: this.fb.control<string>('#ffffff', Validators.required),
    // New fields for zone and city
    zoneId: this.fb.control<number | null>(null, [Validators.required]),
  });

  statuses = ['Disponible', 'En mission', 'Maintenance', 'Hors service'];

  ngOnInit() {

    this.loadActiveZones();
  this.loadCapacityUnits(); 

    this.orderSettingsService.getSettings().subscribe(settings => {
  // s'assurer que c'est un tableau de strings
  const units: string[] = Array.isArray(settings.loadingUnit)
    ? settings.loadingUnit
    : typeof settings.loadingUnit === 'string'
      ? [settings.loadingUnit]
      : [];
this.truckForm.get('capacityUnit')?.valueChanges.subscribe(value => {

});

  this.capacityUnits = units.length
    ? units.map(u => ({ value: u, label: this.getCapacityUnitLabel(u) }))
    : [
        { value: 'tonnes', label: 'Tonnes' },
        { value: 'colis', label: 'colis' }
      ];
console.log(this.capacityUnits)

 if (!this.truckForm.get('capacityUnit')?.value && this.capacityUnits.length > 0) {
  this.truckForm.get('capacityUnit')?.setValue(this.capacityUnits[0].value); // ici 'palette'
}

});

    if (this.data.truckId) {
      this.loadTruck(this.data.truckId);
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
getSelectedCapacityUnitLabel(): string {
  const selectedValue = this.truckForm.get('capacityUnit')?.value;
  if (!selectedValue) return '';
  const unit = this.capacityUnits.find(u => u.value === selectedValue);
  return unit ? unit.label : selectedValue; // fallback
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
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Impossible de charger les zones',
          confirmButtonText: 'OK'
        });
      }
    });
    
    this.subscriptions.push(zonesSub);
  }

  private loadTruck(id: number) {
    const truckSub = this.httpService.getTruck(id).subscribe({
      next: (truck: ITruck) => {
        const dateValue = truck.technicalVisitDate
          ? new Date(truck.technicalVisitDate)
          : null;

        const capacityUnit = truck.capacityUnit || 'tonnes';

        this.truckForm.patchValue({
          immatriculation: truck.immatriculation,
          brand: truck.brand,
          capacityUnit: capacityUnit,
          capacity: truck.capacity,
          technicalVisitDate: dateValue,   
          status: truck.status,
          color: truck.color || '#ffffff',
          zoneId: truck.zoneId || null,
        });
        
        if (truck.imageBase64) {
          this.imageBase64 = truck.imageBase64;
          this.originalImageBase64 = truck.imageBase64;
          this.imagePreview = `data:image/png;base64,${truck.imageBase64}`;
          this.hasExistingImage = true;
        }
        
      },
      error: (error) => {
        console.error('Error loading truck:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Impossible de charger les informations du camion',
          confirmButtonText: 'OK'
        }).then(() => this.dialogRef.close());
      }
    });
    
    this.subscriptions.push(truckSub);
  }

  getErrorMessage(controlName: string): string {
    const control = this.truckForm.get(controlName);
    
    if (control?.hasError('required')) {
      return `${this.getFieldLabel(controlName)} est obligatoire`;
    }
    
    if (control?.hasError('minlength')) {
      const requiredLength = control.errors?.['minlength'].requiredLength;
      return `${this.getFieldLabel(controlName)} doit comporter au moins ${requiredLength} caractères`;
    }
    
    if (control?.hasError('min')) {
      return 'La valeur doit être supérieure à 0';
    }
    
    return '';
  }

  private getFieldLabel(controlName: string): string {
    const labels: { [key: string]: string } = {
      immatriculation: 'L\'immatriculation',
      brand: 'La marque',
      capacityUnit: 'L\'unité de capacité',
      capacity: 'La capacité',
      technicalVisitDate: 'La date de visite technique',
      status: 'Le statut',
      color: 'La couleur',
      zoneId: 'La zone',
      cityId: 'La ville'
    };
    return labels[controlName] || controlName;
  }

  getCapacityPlaceholder(): string {
    const unit = this.truckForm.get('capacityUnit')?.value;
    switch(unit) {
      case 'palettes':
        return 'Ex: 20';
      case 'cartons':
        return 'Ex: 1000';
      case 'tonnes':
        return 'Ex: 12';
      default:
        return 'Ex: 12';
    }
  }

  formatImmatriculation() {
    let value = this.truckForm.get('immatriculation')?.value || '';
    const digits = value.replace(/\D/g, '');
    const limited = digits.substring(0, 7);
    let before = limited.substring(0, Math.min(3, limited.length));
    let after = limited.length > 3 ? limited.substring(3) : '';
    const formatted = `${before} TUN ${after}`.trim();
    
    this.truckForm.get('immatriculation')?.setValue(formatted, {
      emitEvent: false
    });
  }

  onSubmit() {
    if (!this.truckForm.valid || this.isSubmitting || this.loadingZones) return;

    this.isSubmitting = true;

    const selectedDate: Date | null = this.truckForm.value.technicalVisitDate ?? null;

    const technicalVisitDate = selectedDate
      ? `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1)
          .toString()
          .padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`
      : null;

    const value: ITruck = {
      id: this.data.truckId || 0,
      immatriculation: this.truckForm.value.immatriculation!,
      brand: this.truckForm.value.brand!,
      capacityUnit: this.truckForm.value.capacityUnit!,
      capacity: this.truckForm.value.capacity!,
      technicalVisitDate: technicalVisitDate, 
      status: this.truckForm.value.status!,
      color: this.truckForm.value.color!,
      imageBase64: this.imageBase64,
      zoneId: this.truckForm.value.zoneId!,
    };

    if (this.data.truckId) {
      this.httpService.updateTruck(this.data.truckId, value).subscribe({
        next: () => {
          this.isSubmitting = false;
          Swal.fire({
            icon: 'success',
            //title: 'Camion modifié avec succès',
            title: this.t('TRUCK_UPDATED_SUCCESS'),
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
    } else {
      this.httpService.addTruck(value).subscribe({
        next: () => {
          this.isSubmitting = false;
          Swal.fire({
            icon: 'success',
            //title: 'Camion ajouté avec succès',
            title: this.t('TRUCK_ADDED_SUCCESS'),
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

  // onDeletePhoto() {
  //   if (confirm('Voulez-vous vraiment supprimer cette photo ?')) {
  //     this.imagePreview = null;
  //     this.imageBase64 = null;
  //     this.selectedFile = null;
  //     this.resetFileInput();
      
  //     if (this.hasExistingImage && this.originalImageBase64) {
  //       this.imageBase64 = ''; 
  //     }
  //   }
  // }

    onDeletePhoto() {
  if (confirm(this.t('PHOTO_DELETE_CONFIRM'))) {
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

   private translation = inject(Translation);
   t(key: string): string { return this.translation.t(key); }

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


private loadCapacityUnits(): void {
  this.orderSettingsService.getSettings().subscribe({
    next: (config: any) => {
      const units: string[] = Array.isArray(config.loadingUnit)
        ? config.loadingUnit
        : typeof config.loadingUnit === 'string'
          ? [config.loadingUnit]
          : [];

      this.capacityUnits = units.length
        ? units.map(u => ({ value: u, label: this.getCapacityUnitLabel(u) }))
        : [{ value: 'tonnes', label: 'Tonnes' }];

      // Définir la valeur par défaut du FormControl si elle est vide
      const currentValue = this.truckForm.get('capacityUnit')?.value;
      if (!currentValue && this.capacityUnits.length > 0) {
        this.truckForm.get('capacityUnit')?.setValue(this.capacityUnits[0].value);
      }
    },
    error: (err) => {
      console.error('Erreur récupération unités de capacité', err);
      this.capacityUnits = [{ value: 'tonnes', label: 'Tonnes' }];
    }
  });
}


private getCapacityUnitLabel(unit: string): string {
  switch(unit) {
    case 'palettes': return 'Palettes';
    case 'cartons': return 'Cartons';
    case 'tonnes': return 'Tonnes';
    default: return unit;
  }
}

}