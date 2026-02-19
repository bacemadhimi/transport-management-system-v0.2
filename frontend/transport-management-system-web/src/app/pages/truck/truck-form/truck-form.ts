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
import { IMarque } from '../../../types/marque'; // Import IMarque
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
import { ITypeTruck } from '../../../types/type-truck';

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
  

  imageBase64: string | null = null;
  imagePreview: string | null = null;
  fileError: string | null = null;
  originalImageBase64: string | null = null; 
  hasExistingImage = false;
  selectedFile: File | null = null;
  

  loadingZones = false;
  loadingTypeTrucks = false;
  loadingMarques = false; // Add this
  zones: IZone[] = [];
  typeTrucks: ITypeTruck[] = [];
  marques: IMarque[] = []; // Add this
  isSubmitting = false;
  selectedCapacityUnitLabel: string = '';
  private subscriptions: Subscription[] = [];

  capacityUnits: { value: string; label: string }[] = [];

  truckForm = this.fb.group({
    immatriculation: this.fb.control<string>('', [Validators.required, Validators.minLength(2)]),
    // Replace 'brand' with 'marqueTruckId'
    marqueTruckId: this.fb.control<number | null>(null, Validators.required),
    technicalVisitDate: this.fb.control<Date | null>(null, Validators.required),
    status: this.fb.control<string>('Disponible'),
    color: this.fb.control<string>('#ffffff', Validators.required),
    zoneId: this.fb.control<number | null>(null, [Validators.required]),
    typeTruckId: this.fb.control<number | null>(null, [Validators.required]),
  });

  statuses = ['Disponible', 'En mission', 'Maintenance', 'Hors service'];

  ngOnInit() {
    this.loadActiveZones();
    this.loadTypeTrucks();
    this.loadMarques(); 

    if (this.data.truckId) {
      this.loadTruck(this.data.truckId);
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // Add this method to load marques
  private loadMarques(): void {
    this.loadingMarques = true;
    
    const marquesSub = this.httpService.getMarqueTrucks().subscribe({
      next: (response) => {
        let marquesData: IMarque[];
        
        if (response && typeof response === 'object' && 'data' in response) {
          marquesData = (response as any).data;
        } else if (Array.isArray(response)) {
          marquesData = response;
        } else {
          marquesData = [];
        }
        
        this.marques = marquesData;
        this.loadingMarques = false;
      },
      error: (error) => {
        console.error('Error loading marques:', error);
        this.loadingMarques = false;
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Impossible de charger les marques de véhicules',
          confirmButtonText: 'OK'
        });
      }
    });
    
    this.subscriptions.push(marquesSub);
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

  private loadTypeTrucks(): void {
    this.loadingTypeTrucks = true;
    
    const typeTrucksSub = this.httpService.getTypeTrucksList({ pageIndex: 0, pageSize: 100 }).subscribe({
      next: (response) => {
        let typeTrucksData: ITypeTruck[];
        
        if (response && typeof response === 'object' && 'data' in response) {
          typeTrucksData = (response as any).data;
        } else if (Array.isArray(response)) {
          typeTrucksData = response;
        } else {
          typeTrucksData = [];
        }
        
        this.typeTrucks = typeTrucksData;
        this.loadingTypeTrucks = false;
      },
      error: (error) => {
        console.error('Error loading type trucks:', error);
        this.loadingTypeTrucks = false;
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Impossible de charger les types de véhicules',
          confirmButtonText: 'OK'
        });
      }
    });
    
    this.subscriptions.push(typeTrucksSub);
  }

private loadTruck(id: number) {
  const truckSub = this.httpService.getTruck(id).subscribe({
    next: (response: any) => {
      // Check if response has a data property (your API wrapper)
      const truckData = response.data || response;
      
      console.log('Truck data received:', truckData);
      
      const dateValue = truckData.technicalVisitDate
        ? new Date(truckData.technicalVisitDate)
        : null;

      this.truckForm.patchValue({
        immatriculation: truckData.immatriculation,
        marqueTruckId: truckData.marqueTruckId || null,
        technicalVisitDate: dateValue,   
        status: truckData.status,
        color: truckData.color || '#ffffff',
        zoneId: truckData.zoneId || null,
        typeTruckId: truckData.typeTruckId || null, 
      });
      
      if (truckData.imageBase64) {
        this.imageBase64 = truckData.imageBase64;
        this.originalImageBase64 = truckData.imageBase64;
        this.imagePreview = `data:image/png;base64,${truckData.imageBase64}`;
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
      // Replace 'brand' with 'marqueTruckId'
      marqueTruckId: 'La marque',
      technicalVisitDate: 'La date de visite technique',
      status: 'Le statut',
      color: 'La couleur',
      zoneId: 'La zone',
      typeTruckId: 'Le type de véhicule'
    };
    return labels[controlName] || controlName;
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
    if (!this.truckForm.valid || this.isSubmitting || this.loadingZones || this.loadingTypeTrucks || this.loadingMarques) return;

    this.isSubmitting = true;

    const selectedDate: Date | null = this.truckForm.value.technicalVisitDate ?? null;

    const technicalVisitDate = selectedDate
      ? `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1)
          .toString()
          .padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`
      : null;

    const value: any = {
      id: this.data.truckId || 0,
      immatriculation: this.truckForm.value.immatriculation!,
      // Replace 'brand' with 'marqueTruckId'
      marqueTruckId: this.truckForm.value.marqueTruckId!,
      technicalVisitDate: technicalVisitDate, 
      status: this.truckForm.value.status!,
      color: this.truckForm.value.color!,
      imageBase64: this.imageBase64,
      zoneId: this.truckForm.value.zoneId!,
      typeTruckId: this.truckForm.value.typeTruckId!,
    };

    if (this.data.truckId) {
      this.httpService.updateTruck(this.data.truckId, value).subscribe({
        next: () => {
          this.isSubmitting = false;
          Swal.fire({
            icon: 'success',
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
}