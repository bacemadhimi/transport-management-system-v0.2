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
import { SettingsService } from '../../../services/settings.service'; 
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
  SettingsService = inject(SettingsService);
  dialogRef = inject(MatDialogRef<TruckForm>);
  data = inject<{ truckId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};
  @ViewChild('fileInput') fileInput!: ElementRef;
  

  images: string[] = []; 
  imagePreviews: string[] = []; 
  fileError: string | null = null;
  originalImages: string[] = []; 
  selectedFiles: File[] = [];
  maxImages = 10; 
  

  loadingZones = false;
  loadingTypeTrucks = false;
  loadingMarques = false; 
  zones: IZone[] = [];
  typeTrucks: ITypeTruck[] = [];
  marques: IMarque[] = []; 
  isSubmitting = false;
  selectedCapacityUnitLabel: string = '';
  private subscriptions: Subscription[] = [];

  capacityUnits: { value: string; label: string }[] = [];

  truckForm = this.fb.group({
    immatriculation: this.fb.control<string>('', [Validators.required, Validators.minLength(2)]),
   
    marqueTruckId: this.fb.control<number | null>(null, Validators.required),
    technicalVisitDate: this.fb.control<Date | null>(null, Validators.required),
    dateOfFirstRegistration: this.fb.control<Date | null>(null, Validators.required),
    emptyWeight: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
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
      
      const truckData = response.data || response;
      
      console.log('Truck data received:', truckData);
      
      const dateValue = truckData.technicalVisitDate
        ? new Date(truckData.technicalVisitDate)
        : null;

      const firstRegDate = truckData.dateOfFirstRegistration
        ? new Date(truckData.dateOfFirstRegistration)
        : null;

      this.truckForm.patchValue({
        immatriculation: truckData.immatriculation,
        marqueTruckId: truckData.marqueTruckId || null,
        technicalVisitDate: dateValue,
        dateOfFirstRegistration: firstRegDate,
        emptyWeight: truckData.emptyWeight || null,
        status: truckData.status,
        color: truckData.color || '#ffffff',
        zoneId: truckData.zoneId || null,
        typeTruckId: truckData.typeTruckId || null, 
      });
      
     
      if (truckData.images && Array.isArray(truckData.images) && truckData.images.length > 0) {
        this.images = [...truckData.images];
        this.originalImages = [...truckData.images];
        this.imagePreviews = truckData.images.map((base64: string) => 
          `data:image/png;base64,${base64}`
        );
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
     
      marqueTruckId: 'La marque',
      technicalVisitDate: 'La date de visite technique',
      dateOfFirstRegistration: 'La date de première immatriculation',
      emptyWeight: 'Le poids à vide',
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

    const selectedFirstRegDate: Date | null = this.truckForm.value.dateOfFirstRegistration ?? null;

    const dateOfFirstRegistration = selectedFirstRegDate
      ? `${selectedFirstRegDate.getFullYear()}-${(selectedFirstRegDate.getMonth() + 1)
          .toString()
          .padStart(2, '0')}-${selectedFirstRegDate.getDate().toString().padStart(2, '0')}`
      : null;

    const value: any = {
      id: this.data.truckId || 0,
      immatriculation: this.truckForm.value.immatriculation!,
     
      marqueTruckId: this.truckForm.value.marqueTruckId!,
      technicalVisitDate: technicalVisitDate,
      dateOfFirstRegistration: dateOfFirstRegistration,       emptyWeight: this.truckForm.value.emptyWeight!,      status: this.truckForm.value.status!,
      color: this.truckForm.value.color!,
      images: this.images.length > 0 ? this.images : null,
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
    const files = (event.target as HTMLInputElement).files;
    if (!files || files.length === 0) return;
    
    
    if (this.images.length + files.length > this.maxImages) {
      this.fileError = `Vous ne pouvez ajouter que ${this.maxImages} images maximum. Actuellement: ${this.images.length}`;
      return;
    }
    
    const maxSize = 2 * 1024 * 1024; // 2MB per image
    
    Array.from(files).forEach(file => {
      if (file.size > maxSize) {
        this.fileError = `Image "${file.name}" trop volumineuse (max 2MB).`;
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        
        this.images.push(base64);
        this.imagePreviews.push(dataUrl);
        this.fileError = null;
      };
      reader.readAsDataURL(file);
    });
    
    
    this.resetFileInput();
  }

  onDeletePhoto(index: number) {
    if (confirm(this.t('PHOTO_DELETE_CONFIRM'))) {
      this.images.splice(index, 1);
      this.imagePreviews.splice(index, 1);
    }
  }

  onDeleteAllPhotos() {
    if (confirm('Êtes-vous sûr de vouloir supprimer toutes les photos ?')) {
      this.images = [];
      this.imagePreviews = [];
      this.resetFileInput();
    }
  }

  private resetFileInput() {
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  get hasPhotos(): boolean {
    return this.images.length > 0;
  }

  get canAddMorePhotos(): boolean {
    return this.images.length < this.maxImages;
  }

  get arePhotosChanged(): boolean {
    if (this.images.length !== this.originalImages.length) return true;
    return !this.images.every((img, idx) => img === this.originalImages[idx]);
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