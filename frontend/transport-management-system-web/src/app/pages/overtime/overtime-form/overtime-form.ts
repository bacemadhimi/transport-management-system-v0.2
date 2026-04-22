import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Http } from '../../../services/http';
import { ICreateOvertimeSetting, IOvertimeSetting } from '../../../types/overtime';
import { IDriver } from '../../../types/driver';
import Swal from 'sweetalert2';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Translation } from '../../../services/Translation';

@Component({
  selector: 'app-overtime-form',
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
    MatCheckboxModule
  ],
  templateUrl: './overtime-form.html',
  styleUrls: ['./overtime-form.scss']
})
export class OvertimeForm implements OnInit {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<OvertimeForm>);
  data = inject<{ overtimeId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  isSubmitting = false;
  showingAlert = false;
  drivers: IDriver[] = [];


   private translation = inject(Translation);
   t(key: string): string { return this.translation.t(key); }


  overtimeForm = this.fb.group({
    driverId: this.fb.control<number | null>(null, [Validators.required]),
    isActive: this.fb.control<boolean>(true),
    maxDailyHours: this.fb.control<number>(12, [
      Validators.required,
      Validators.min(0),
      Validators.max(24)
    ]),
    maxWeeklyHours: this.fb.control<number>(60, [
      Validators.required,
      Validators.min(0),
      Validators.max(168)
    ]),
    overtimeRatePerHour: this.fb.control<number>(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(1000)
    ]),
    allowWeekendOvertime: this.fb.control<boolean>(true),
    allowHolidayOvertime: this.fb.control<boolean>(true),
    weekendRateMultiplier: this.fb.control<number | null>(1.5, [
      Validators.min(0),
      Validators.max(100)
    ]),
    holidayRateMultiplier: this.fb.control<number | null>(2.0, [
      Validators.min(0),
      Validators.max(100)
    ]),
    notes: this.fb.control<string>('')
  });

  ngOnInit() {
    this.loadDrivers();

    if (this.data.overtimeId) {
      this.loadOvertimeSetting(this.data.overtimeId);
    }
  }

  loadDrivers() {
    this.httpService.getDrivers().subscribe(result => {
      this.drivers = result;
    });
  }

  onSubmit() {
    if (!this.overtimeForm.valid || this.isSubmitting) return;

    this.isSubmitting = true;

    const value: ICreateOvertimeSetting = {
      driverId: this.overtimeForm.value.driverId!,
      isActive: this.overtimeForm.value.isActive!,
      maxDailyHours: this.overtimeForm.value.maxDailyHours!,
      maxWeeklyHours: this.overtimeForm.value.maxWeeklyHours!,
      overtimeRatePerHour: this.overtimeForm.value.overtimeRatePerHour!,
      allowWeekendOvertime: this.overtimeForm.value.allowWeekendOvertime!,
      allowHolidayOvertime: this.overtimeForm.value.allowHolidayOvertime!,
      weekendRateMultiplier: this.overtimeForm.value.weekendRateMultiplier || undefined,
      holidayRateMultiplier: this.overtimeForm.value.holidayRateMultiplier || undefined,
      notes: this.overtimeForm.value.notes || undefined
    };

    if (this.data.overtimeId) {
      this.httpService.updateOvertimeSetting(this.data.overtimeId, value).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showingAlert = true;
          Swal.fire({
            icon: 'success',
            title: 'Paramètres modifiés avec succès',
            confirmButtonText: 'OK',
            allowOutsideClick: false
          }).then(() => this.dialogRef.close(true));
        },
        error: (err) => {
          this.isSubmitting = false;
          Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: err?.message || 'Impossible de modifier les paramètres',
            confirmButtonText: 'OK'
          });
        }
      });
    } else {
      this.httpService.addOvertimeSetting(value).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.showingAlert = true;
          Swal.fire({
            icon: 'success',
            title: 'Paramètres ajoutés avec succès',
            confirmButtonText: 'OK',
            allowOutsideClick: false
          }).then(() => this.dialogRef.close(true));
        },
        error: (err) => {
          this.isSubmitting = false;
          Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: err?.message || 'Impossible d\'ajouter les paramètres',
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
    const control = this.overtimeForm.get(controlName);

    if (control?.hasError('required')) {
      return `${this.getFieldLabel(controlName)} est obligatoire`;
    }

    if (control?.hasError('min')) {
      return `${this.getFieldLabel(controlName)} doit être positif`;
    }

    if (control?.hasError('max')) {
      const max = control.errors?.['max'].max;
      return `${this.getFieldLabel(controlName)} ne peut pas dépasser ${max}`;
    }

    return '';
  }

  private getFieldLabel(controlName: string): string {
    const labels: { [key: string]: string } = {
      driverId: 'Le chauffeur',
      maxDailyHours: 'Les heures maximales par jour',
      maxWeeklyHours: 'Les heures maximales par semaine',
      overtimeRatePerHour: 'Le taux horaire'
    };
    return labels[controlName] || controlName;
  }

  private loadOvertimeSetting(id: number) {
    this.httpService.getOvertimeSetting(id).subscribe((overtime: IOvertimeSetting) => {
      this.overtimeForm.patchValue({
        driverId: overtime.driverId,
        isActive: overtime.isActive,
        maxDailyHours: overtime.maxDailyHours,
        maxWeeklyHours: overtime.maxWeeklyHours,
        overtimeRatePerHour: overtime.overtimeRatePerHour,
        allowWeekendOvertime: overtime.allowWeekendOvertime,
        allowHolidayOvertime: overtime.allowHolidayOvertime,
        weekendRateMultiplier: overtime.weekendRateMultiplier || null,
        holidayRateMultiplier: overtime.holidayRateMultiplier || null,
        notes: overtime.notes || ''
      });
    });
  }
}