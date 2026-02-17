import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Http } from '../../../services/http';
import { IDayOff } from '../../../types/dayoff';
import Swal from 'sweetalert2';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

@Component({
  selector: 'app-dayoff-form',
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
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './day-off-form.html',
  styleUrls: ['./day-off-form.scss']
})
export class DayOffForm implements OnInit {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<DayOffForm>);
  data = inject<{ dayOffId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  isSubmitting = false;
  showingAlert = false;

  dayOffForm = this.fb.group({
    name: this.fb.control<string>('', [Validators.required]),
    country: this.fb.control<string>('', [Validators.required]),
    date: this.fb.control<Date | null>(null, [Validators.required]),
    description: this.fb.control<string>('')
  });

  ngOnInit() {
    if (this.data.dayOffId) {
      this.loadDayOff(this.data.dayOffId);
    }
  }

  onSubmit() {
    if (!this.dayOffForm.valid || this.isSubmitting) return;

  this.isSubmitting = true;
  const formDate = this.dayOffForm.value.date!;
  

  const noonDate = new Date(formDate);
  noonDate.setHours(12, 0, 0, 0);
  
  // Format as YYYY-MM-DD string
  const dateStr = noonDate.toISOString().split('T')[0];
    const value: IDayOff = {
      id: this.data.dayOffId || 0,
      name: this.dayOffForm.value.name!,
      country: this.dayOffForm.value.country!,
      date: dateStr,
      description: this.dayOffForm.value.description || undefined,
      createdDate: new Date()
    };

    if (this.data.dayOffId) {
      this.httpService.updateDayOff(this.data.dayOffId, value).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showingAlert = true;
          Swal.fire({
            icon: 'success',
            title: 'Jour férié modifié avec succès',
            confirmButtonText: 'OK',
            allowOutsideClick: false
          }).then(() => this.dialogRef.close(true));
        },
        error: (err) => {
          this.isSubmitting = false;
          Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: err?.message || 'Impossible de modifier le jour férié',
            confirmButtonText: 'OK'
          });
        }
      });
    } else {
      this.httpService.addDayOff(value).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showingAlert = true;
          Swal.fire({
            icon: 'success',
            title: 'Jour férié ajouté avec succès',
            confirmButtonText: 'OK',
            allowOutsideClick: false
          }).then(() => this.dialogRef.close(true));
        },
        error: (err) => {
          this.isSubmitting = false;
          Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: err?.message || 'Impossible d\'ajouter le jour férié',
            confirmButtonText: 'OK'
          });
        }
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  getErrorMessage(controlName: string): string {
    const control = this.dayOffForm.get(controlName);
    
    if (control?.hasError('required')) {
      return `${this.getFieldLabel(controlName)} est obligatoire`;
    }
    
    return '';
  }

  private getFieldLabel(controlName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Le nom',
      country: 'Le pays',
      date: 'La date',
      description: 'La description'
    };
    return labels[controlName] || controlName;
  }

  private loadDayOff(id: number) {
    this.httpService.getDayOff(id).subscribe((dayOff: IDayOff) => {
      this.dayOffForm.patchValue({
        name: dayOff.name,
        country: dayOff.country,
        date: new Date(dayOff.date),
        description: dayOff.description || ''
      });
    });
  }
}