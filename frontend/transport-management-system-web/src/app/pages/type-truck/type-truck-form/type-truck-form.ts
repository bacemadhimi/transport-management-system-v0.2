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

  isSubmitting = false;

  typeTruckForm = this.fb.group({
    type: ['', [Validators.required]],
    capacity: [0, [Validators.required, Validators.min(0.1)]],
    unit: ['', [Validators.required]]
  });

  ngOnInit() {
    if (this.data.typeTruckId) {
      this.httpService.getTypeTruck(this.data.typeTruckId).subscribe((typeTruck: ITypeTruck) => {
        console.log("typeTruck returned from API:", typeTruck);
        this.typeTruckForm.patchValue({
          type: typeTruck.type,
          capacity: typeTruck.capacity,
          unit: typeTruck.unit
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
      unit: this.typeTruckForm.value.unit!
    };

    const request = this.data.typeTruckId
      ? this.httpService.updateTypeTruck(this.data.typeTruckId, value)
      : this.httpService.addTypeTruck(value);

    request.subscribe({
      next: () => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'success',
          title: this.data.typeTruckId ? 'Type de Truck modifié avec succès' : 'Type de Truck ajouté avec succès',
          confirmButtonText: 'OK'
        }).then(() => this.dialogRef.close(true));
      },
      error: (error) => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Une erreur est survenue lors de l\'opération',
          confirmButtonText: 'OK'
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
      if (controlName === 'type') return 'Le type est obligatoire';
      if (controlName === 'capacity') return 'La capacity est obligatoire';
      if (controlName === 'unit') return 'L\'unit est obligatoire';
    }
    if (control?.hasError('min')) return 'La capacity doit être supérieure à 0';
    return '';
  }
}