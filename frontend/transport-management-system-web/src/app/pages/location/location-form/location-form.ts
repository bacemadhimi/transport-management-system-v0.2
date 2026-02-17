import { Component, inject, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Http } from '../../../services/http';
import { ILocation, ICreateLocationDto, IUpdateLocationDto } from '../../../types/location';
import { IZone } from '../../../types/zone';
import Swal from 'sweetalert2';
import { Translation } from '../../../services/Translation';

interface DialogData {
  locationId?: number;
}

interface IZoneOption {
  id: number;
  name: string;
}

@Component({
  selector: 'app-location-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatSelectModule
  ],
  templateUrl: './location-form.html',
  styleUrls: ['./location-form.scss']
})
export class LocationFormComponent implements OnInit {
  locationForm!: FormGroup;
  loading = false;
  isSubmitting = false;
  zones: IZoneOption[] = [];
  loadingZones = false;

  constructor(
    private fb: FormBuilder,
    private http: Http,
    private dialogRef: MatDialogRef<LocationFormComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadActiveZones();
    
    if (this.data.locationId) {
      this.loadLocation(this.data.locationId);
    }
  }

  private initForm(): void {
    this.locationForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      zoneId: ['', [Validators.required]],
      isActive: [true]
    });
  }

  private loadActiveZones(): void {
    this.loadingZones = true;

    this.http.getActiveZones().subscribe({
      next: (response) => {
        this.zones = response.data.map((zone: IZone) => ({
          id: zone.id,
          name: zone.name
        }));
        this.loadingZones = false;
      },
      error: (error) => {
        console.error('Error loading active zones:', error);
        this.snackBar.open(
          'Erreur lors du chargement des zones actives',
          'Fermer',
          { duration: 3000 }
        );
        this.loadingZones = false;
        
        
        
      }
    });
  }



  private loadLocation(locationId: number): void {
    this.loading = true;

    this.http.getLocation(locationId).subscribe({
      next: (response) => {
        this.locationForm.patchValue({
          name: response.data.name,
          zoneId: response.data.zoneId,
          isActive: response.data.isActive
        });
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading location:', error);
        this.snackBar.open(
          'Erreur lors du chargement du lieu',
          'Fermer',
          { duration: 3000 }
        );
        this.loading = false;
        this.dialogRef.close();
      }
    });
  }

  onSubmit(): void {
    if (this.locationForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    const formValue = this.locationForm.value;
    
    const locationData = {
      name: formValue.name.trim(),
      zoneId: formValue.zoneId,
      isActive: formValue.isActive
    };
    
    if (this.data.locationId) {
      this.updateLocation(locationData);
    } else {
      this.createLocation(locationData);
    }
  }

  private createLocation(formValue: any): void {
    const locationData: ICreateLocationDto = {
      name: formValue.name.trim(),
      zoneId: formValue.zoneId,
      isActive: formValue.isActive
    };

    this.http.createLocation(locationData).subscribe({
      next: (location: ILocation) => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'success',
          //title: 'ville créé avec succès',
          title: this.t('CITY_CREATED_SUCCESS'),
          confirmButtonText: 'OK',
          allowOutsideClick: false,
          customClass: {
            popup: 'swal2-popup-custom',
            title: 'swal2-title-custom',
            icon: 'swal2-icon-custom',
            confirmButton: 'swal2-confirm-custom'
          }
        }).then(() => this.dialogRef.close(location));
      },
      error: (error) => {
        console.error('Create location error:', error);
        //const errorMessage = error.error?.message || 'Erreur lors de la création du lieu';
        const errorMessage = error.error?.message || this.t('CITY_CREATION_FAILED');
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: errorMessage,
          confirmButtonText: 'OK'
        });
        this.isSubmitting = false;
      }
    });
  }

  private updateLocation(formValue: any): void {
    const locationData: IUpdateLocationDto = {
      name: formValue.name.trim(),
      zoneId: formValue.zoneId,
      isActive: formValue.isActive
    };

    this.http.updateLocation(this.data.locationId!, locationData).subscribe({
      next: (location: ILocation) => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'success',
         // title: 'Lieu modifié avec succès',
           title: this.t('LOCATION_UPDATED_SUCCESS'),
          confirmButtonText: 'OK',
          allowOutsideClick: false,
          customClass: {
            popup: 'swal2-popup-custom',
            title: 'swal2-title-custom',
            icon: 'swal2-icon-custom',
            confirmButton: 'swal2-confirm-custom'
          }
        }).then(() => this.dialogRef.close(location));
      },
      error: (error) => {
        console.error('Update location error:', error);
        const errorMessage = error.error?.message || this.t('LOCATION_UPDATE_FAILED');
        //const errorMessage = error.error?.message || 'Erreur lors de la modification du lieu';
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: errorMessage,
          confirmButtonText: 'OK'
        });
        this.isSubmitting = false;
      }
    });
  }

  getErrorMessage(controlName: string): string {
    const control = this.locationForm.get(controlName);
    
    if (control?.hasError('required')) {
      return 'Ce champ est obligatoire';
    }
    
    if (control?.hasError('maxlength')) {
      return 'Le nom ne peut pas dépasser 100 caractères';
    }
    
    return '';
  }

  get isEditMode(): boolean {
    return !!this.data.locationId;
  }

  onCancel(): void {
    this.dialogRef.close();
  }
   private translation = inject(Translation);
   t(key: string): string { return this.translation.t(key); }
}