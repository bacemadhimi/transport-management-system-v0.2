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
import { Http } from '../../../services/http';

import Swal from 'sweetalert2';
import { ICreateZoneDto, IUpdateZoneDto, IZone } from '../../../types/zone';
import { Translation } from '../../../services/Translation';

interface DialogData {
  zoneId?: number;
}

@Component({
  selector: 'app-zone-form',
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
    MatProgressSpinnerModule
  ],
  templateUrl: './zone-form.html',
  styleUrls: ['./zone-form.scss']
})
export class ZoneFormComponent implements OnInit {
  zoneForm!: FormGroup;
  loading = false;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private http: Http,
    private dialogRef: MatDialogRef<ZoneFormComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  ngOnInit(): void {
    this.initForm();
    
    if (this.data.zoneId) {
      this.loadZone(this.data.zoneId);
    }
  }

  private initForm(): void {
    this.zoneForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      isActive: [true]
    });
  }

private loadZone(zoneId: number): void {
  this.loading = true;

  this.http.getZone(zoneId).subscribe({
    next: (response) => {
      this.zoneForm.patchValue({
        name: response.data.name,
        isActive: response.data.isActive
      });
      this.loading = false;
    },
    error: (error) => {
      console.error('Error loading zone:', error);
      this.snackBar.open(
        'Erreur lors du chargement de la zone',
        'Fermer',
        { duration: 3000 }
      );
      this.loading = false;
      this.dialogRef.close();
    }
  });
}
     private translation = inject(Translation);
   t(key: string): string { return this.translation.t(key); }


  onSubmit(): void {
    if (this.zoneForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    const formValue = this.zoneForm.value;
    
    if (this.data.zoneId) {
      this.updateZone(formValue);
    } else {
      this.createZone(formValue);
    }
  }

  // private createZone(formValue: any): void {
  //   const zoneData: ICreateZoneDto = {
  //     name: formValue.name.trim(),
  //     isActive: formValue.isActive
  //   };

  //   this.http.createZone(zoneData).subscribe({
  //     next: (zone: IZone) => {
  //       this.isSubmitting = false;
  //       Swal.fire({
  //         icon: 'success',
  //         title: 'Zone créée avec succès',
  //         confirmButtonText: 'OK',
  //         allowOutsideClick: false,
  //         customClass: {
  //           popup: 'swal2-popup-custom',
  //           title: 'swal2-title-custom',
  //           icon: 'swal2-icon-custom',
  //           confirmButton: 'swal2-confirm-custom'
  //         }
  //       }).then(() => this.dialogRef.close(zone));
  //     },
  //     error: (error) => {
  //       console.error('Create zone error:', error);
  //       const errorMessage = error.error?.message || 'Erreur lors de la création de la zone';
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


   //Update method for Multilanguage support
  private createZone(formValue: any): void {
  const zoneData: ICreateZoneDto = {
    name: formValue.name.trim(),
    isActive: formValue.isActive
  };

  this.isSubmitting = true;

  this.http.createZone(zoneData).subscribe({
    next: (zone: IZone) => {
      this.isSubmitting = false;
      Swal.fire({
        icon: 'success',
        title: this.t('ZONE_CREATED_SUCCESS'),
        confirmButtonText: this.t('OK'),
        allowOutsideClick: false,
        customClass: {
          popup: 'swal2-popup-custom',
          title: 'swal2-title-custom',
          icon: 'swal2-icon-custom',
          confirmButton: 'swal2-confirm-custom'
        }
      }).then(() => this.dialogRef.close(zone));
    },
    error: (error) => {
      console.error('Create zone error:', error);
      const errorMessage = error.error?.message || this.t('ZONE_CREATION_FAILED');
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


  // private updateZone(formValue: any): void {
  //   const zoneData: IUpdateZoneDto = {
  //     name: formValue.name.trim(),
  //     isActive: formValue.isActive
  //   };

  //   this.http.updateZone(this.data.zoneId!, zoneData).subscribe({
  //     next: (zone: IZone) => {
  //       this.isSubmitting = false;
  //       Swal.fire({
  //         icon: 'success',
  //         title: 'Zone modifiée avec succès',
  //         confirmButtonText: 'OK',
  //         allowOutsideClick: false,
  //         customClass: {
  //           popup: 'swal2-popup-custom',
  //           title: 'swal2-title-custom',
  //           icon: 'swal2-icon-custom',
  //           confirmButton: 'swal2-confirm-custom'
  //         }
  //       }).then(() => this.dialogRef.close(zone));
  //     },
  //     error: (error) => {
  //       console.error('Update zone error:', error);
  //       const errorMessage = error.error?.message || 'Erreur lors de la modification de la zone';
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

  //Update method for Multilanguage support
   private updateZone(formValue: any): void {
  const zoneData: IUpdateZoneDto = {
    name: formValue.name.trim(),
    isActive: formValue.isActive
  };
  this.isSubmitting = true;
  this.http.updateZone(this.data.zoneId!, zoneData).subscribe({
    next: (zone: IZone) => {
      this.isSubmitting = false;
      Swal.fire({
        icon: 'success',
        title: this.t('ZONE_UPDATED_SUCCESS'),
        confirmButtonText: this.t('OK'),
        allowOutsideClick: false,
        customClass: {
          popup: 'swal2-popup-custom',
          title: 'swal2-title-custom',
          icon: 'swal2-icon-custom',
          confirmButton: 'swal2-confirm-custom'
        }
      }).then(() => this.dialogRef.close(zone));
    },
    error: (error) => {
      console.error('Update zone error:', error);
      const errorMessage = error.error?.message || this.t('ZONE_UPDATE_FAILED');
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
    const control = this.zoneForm.get(controlName);
    
    if (control?.hasError('required')) {
       //return 'Le nom de la zone est obligatoire';
       return this.t('ZONE_NAME_REQUIRED')
    }
    
    if (control?.hasError('maxlength')) {
      return 'Le nom ne peut pas dépasser 100 caractères';
    }
    
    return '';
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}