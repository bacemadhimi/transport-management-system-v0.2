import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Http } from '../../../services/http';
import { ITypeTruck } from '../../../types/type-truck';
import { Translation } from '../../../services/Translation';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-type-truck-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './type-truck-form.html',
  styleUrls: ['./type-truck-form.scss']
})
export class TypeTruckForm implements OnInit {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<TypeTruckForm>);
  data = inject<{ typeTruckId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};
  private translation = inject(Translation);

  t(key: string): string { 
    return this.translation.t(key); 
  }

  isSubmitting = false;

  typeTruckForm = this.fb.group({
    type: ['', [Validators.required]],
    capacity: [0, [Validators.required, Validators.min(0.1)]],
  });

  ngOnInit() {
    if (this.data.typeTruckId) {
      this.httpService.getTypeTruck(this.data.typeTruckId).subscribe((typeTruck: ITypeTruck) => {
        console.log("typeTruck returned from API:", typeTruck);
        this.typeTruckForm.patchValue({
          type: typeTruck.type,
          capacity: typeTruck.capacity,
        });
      });
    }
  }

  onSubmit() {
    if (!this.typeTruckForm.valid || this.isSubmitting) return;

    this.isSubmitting = true;

    const value: ITypeTruck = {
      id: this.data.typeTruckId || 0,
      type: this.typeTruckForm.value.type!,
      capacity: this.typeTruckForm.value.capacity!,
    };

    const request = this.data.typeTruckId
      ? this.httpService.updateTypeTruck(this.data.typeTruckId, value)
      : this.httpService.addTypeTruck(value);

    request.subscribe({
      next: () => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'success',
          title: this.data.typeTruckId 
            ? this.t('TYPE_TRUCK_EDIT_SUCCESS') 
            : this.t('TYPE_TRUCK_ADD_SUCCESS'),
          confirmButtonText: this.t('OK')
        }).then(() => this.dialogRef.close(true));
      },
      error: (error) => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'error',
          title: this.t('ERROR'),
          text: this.t('OPERATION_ERROR'),
          confirmButtonText: this.t('OK')
        });
        console.error('Error:', error);
      }
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

  getErrorMessage(controlName: string): string {
    const control = this.typeTruckForm.get(controlName);
    if (control?.hasError('required')) {
      if (controlName === 'type') return this.t('TYPE_REQUIRED');
      if (controlName === 'capacity') return this.t('CAPACITY_REQUIRED');
      if (controlName === 'unit') return this.t('UNIT_REQUIRED');
    }
    if (control?.hasError('min')) return this.t('CAPACITY_MIN_ERROR');
    return '';
  }
}