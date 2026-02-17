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
import { ICity, ICreateCityDto, IUpdateCityDto } from '../../../types/city';
import { IZone } from '../../../types/zone';
import Swal from 'sweetalert2';
import { Translation } from '../../../services/Translation';

interface DialogData {
  cityId?: number;
}

interface IZoneOption {
  id: number;
  name: string;
}

@Component({
  selector: 'app-city-form',
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
  templateUrl: './city-form.html',
  styleUrls: ['./city-form.scss']
})
export class cityformComponent implements OnInit {
  cityForm!: FormGroup;
  loading = false;
  isSubmitting = false;
  zones: IZoneOption[] = [];
  loadingZones = false;

  constructor(
    private fb: FormBuilder,
    private http: Http,
    private dialogRef: MatDialogRef<cityformComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadActiveZones();
    
    if (this.data.cityId) {
      this.loadCity(this.data.cityId);
    }
  }

  private initForm(): void {
    this.cityForm = this.fb.group({
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



  private loadCity(cityId: number): void {
    this.loading = true;

    this.http.getCity(cityId).subscribe({
      next: (response) => {
        this.cityForm.patchValue({
          name: response.data.name,
          zoneId: response.data.zoneId,
          isActive: response.data.isActive
        });
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading location:', error);
        this.snackBar.open(
          'Erreur lors du chargement de la ville',
          'Fermer',
          { duration: 3000 }
        );
        this.loading = false;
        this.dialogRef.close();
      }
    });
  }

  onSubmit(): void {
    if (this.cityForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    const formValue = this.cityForm.value;
    
    const locationData = {
      name: formValue.name.trim(),
      zoneId: formValue.zoneId,
      isActive: formValue.isActive
    };
    
    if (this.data.cityId) {
      // this.updateCity(locationData);
      this.updateCity(locationData);
    } else {
      // this.createLocation(locationData);
      this.createCity(locationData);
    }
  }

  private createCity(formValue: any): void {
    const locationData: ICreateCityDto = {
      name: formValue.name.trim(),
      zoneId: formValue.zoneId,
      isActive: formValue.isActive
    };

    this.http.createCity(locationData).subscribe({
      next: (location: ICity) => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'success',
          title: 'ville créé avec succès',
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
        console.error('Create city error:', error);
        const errorMessage = error.error?.message || 'Erreur lors de la création une ville';
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

  // private updateCity(formValue: any): void {
  //   const locationData: IUpdateCityDto = {
  //     name: formValue.name.trim(),
  //     zoneId: formValue.zoneId,
  //     isActive: formValue.isActive
  //   };

  //   this.http.updateCity(this.data.cityId!, locationData).subscribe({
  //     next: (location: ICity) => {
  //       this.isSubmitting = false;
  //       Swal.fire({
  //         icon: 'success',
  //         title: 'Ville modifié avec succès',
  //         confirmButtonText: 'OK',
  //         allowOutsideClick: false,
  //         customClass: {
  //           popup: 'swal2-popup-custom',
  //           title: 'swal2-title-custom',
  //           icon: 'swal2-icon-custom',
  //           confirmButton: 'swal2-confirm-custom'
  //         }
  //       }).then(() => this.dialogRef.close(location));
  //     },
  //     error: (error) => {
  //       console.error('Update location error:', error);
  //       const errorMessage = error.error?.message || 'Erreur lors de la modification du lieu';
  //       Swal.fire({
  //         icon: 'error',
  //         title: 'Erreur',
  //         text: errorMessage,
  //         confirmButtonText: 'OK'
  //       });
  //       this.isSubmitting = false;
  //     }
  //   });
  // }

  //Translation of the updateCity method
  private updateCity(formValue: any): void {
  const cityData: IUpdateCityDto = {
    name: formValue.name.trim(),
    zoneId: formValue.zoneId,
    isActive: formValue.isActive
  };
  this.isSubmitting = true;
  this.http.updateCity(this.data.cityId!, cityData).subscribe({
    next: (city: ICity) => {
      this.isSubmitting = false;
      Swal.fire({
        icon: 'success',
        title: this.t('CITY_UPDATED_SUCCESS'),
        confirmButtonText: this.t('OK'),
        allowOutsideClick: false,
        customClass: {
          popup: 'swal2-popup-custom',
          title: 'swal2-title-custom',
          icon: 'swal2-icon-custom',
          confirmButton: 'swal2-confirm-custom'
        }
      }).then(() => this.dialogRef.close(city));
    },
    error: (error) => {
      console.error('Update city error:', error);
      const errorMessage = error.error?.message || this.t('CITY_UPDATE_FAILED');
      Swal.fire({
        icon: 'error',
        title: this.t('ERROR'),
        text: errorMessage,
        confirmButtonText: this.t('OK'),
        allowOutsideClick: false,
        customClass: {
          popup: 'swal2-popup-custom',
          title: 'swal2-title-custom',
          icon: 'swal2-icon-custom',
          confirmButton: 'swal2-confirm-custom'
        }
      });
      this.isSubmitting = false;
    }
  });
}


  getErrorMessage(controlName: string): string {
    const control = this.cityForm.get(controlName);
    
    if (control?.hasError('required')) {
      return 'Ce champ est obligatoire';
    }
    
    if (control?.hasError('maxlength')) {
      return 'Le nom ne peut pas dépasser 100 caractères';
    }
    
    return '';
  }

  get isEditMode(): boolean {
    return !!this.data.cityId;
  }

  onCancel(): void {
    this.dialogRef.close();
  }
   
  //Call the services for the transalations Languages
   private translation = inject(Translation);
  t(key: string): string { return this.translation.t(key); }
}