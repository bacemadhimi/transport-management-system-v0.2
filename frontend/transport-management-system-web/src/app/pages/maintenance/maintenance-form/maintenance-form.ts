import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Http } from '../../../services/http';
import { IMaintenance } from '../../../types/maintenance';
import { ITrip } from '../../../types/trip';
import { IVendor } from '../../../types/vendor';
import { IEmployee } from '../../../types/employee';
import { Translation } from '../../../services/Translation';
import Swal from 'sweetalert2';
import { MatNativeDateModule } from '@angular/material/core';

@Component({
  selector: 'app-maintenance-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './maintenance-form.html',
  styleUrls: ['./maintenance-form.scss']
})
export class MaintenanceForm implements OnInit {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<MaintenanceForm>);
  data = inject<{ maintenanceId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};
  private translation = inject(Translation);

  t(key: string): string { return this.translation.t(key); }

  trips: ITrip[] = [];
  vendors: IVendor[] = [];
  mechanics: IEmployee[] = []; // Changed to IEmployee since mechanics are employees

  maintenanceForm = this.fb.group({
    tripId: this.fb.control<number>(0, [Validators.required, Validators.min(1)]),
    vendorId: this.fb.control<number>(0, [Validators.required, Validators.min(1)]),
    mechanicId: this.fb.control<number>(0, [Validators.required, Validators.min(1)]),
    status: this.fb.control<string>('Planifié', [Validators.required]),
    startDate: this.fb.control<string>('', [Validators.required]),
    endDate: this.fb.control<string>('', [Validators.required]),
    odometerReading: this.fb.control<number>(0, [Validators.required, Validators.min(0)]),
    totalCost: this.fb.control<number>(0, [Validators.required, Validators.min(0)]),
    serviceDetails: this.fb.control<string>('', [Validators.required]),
    partsName: this.fb.control<string>(''),
    quantity: this.fb.control<number>(0, [Validators.min(0)]),
    notificationType: this.fb.control<'Email' | 'SMS' | 'Both'>('Email', [Validators.required]),
    members: this.fb.control<string>(''),
    maintenanceType: this.fb.control<string>('Général'),
    isVidange: this.fb.control<boolean>(false),
    oilType: this.fb.control<string>(''),
    oilQuantity: this.fb.control<number>(0),
    oilFilter: this.fb.control<string>(''),
    nextVidangeKm: this.fb.control<number>(0),
    nextVidangeDate: this.fb.control<string>('')
  });

  ngOnInit() {
    this.loadDropdownData();

    if (this.data.maintenanceId) {
      this.loadMaintenanceData();
    }
  }

  loadDropdownData() {
    // Load trips
    this.httpService.getAllTrips().subscribe({
      next: (trips) => {
        this.trips = trips;
      },
      error: (error) => {
        console.error('Error loading trips:', error);
      }
    });

    // Load vendors
    this.httpService.getAllVendors().subscribe({
      next: (vendors) => {
        this.vendors = vendors;
      },
      error: (error) => {
        console.error('Error loading vendors:', error);
      }
    });

   
    this.loadMechanics();
  }

loadMechanics() {
  this.httpService.getMechanics().subscribe({
    next: (mechanics) => {
      this.mechanics = mechanics;
      console.log('✅ Mechanics loaded:', mechanics.length);
    },
    error: (error) => {
      console.error('Error loading mechanics:', error);
      this.mechanics = [];
    }
  });
}

  loadMaintenanceData() {
    if (!this.data.maintenanceId) return;

    this.httpService.getMaintenance(this.data.maintenanceId).subscribe((maintenance: IMaintenance) => {
      console.log("Maintenance returned from API:", maintenance);

      const startDate = maintenance.startDate ? new Date(maintenance.startDate) : '';
      const endDate = maintenance.endDate ? new Date(maintenance.endDate) : '';

      this.maintenanceForm.patchValue({
        tripId: maintenance.tripId,
        vendorId: maintenance.vendorId,
        mechanicId: maintenance.mechanicId,
        status: maintenance.status,
        startDate: startDate ? startDate.toISOString().split('T')[0] : '',
        endDate: endDate ? endDate.toISOString().split('T')[0] : '',
        odometerReading: maintenance.odometerReading,
        totalCost: maintenance.totalCost,
        serviceDetails: maintenance.serviceDetails,
        partsName: maintenance.partsName || '',
        quantity: maintenance.quantity || 0,
        notificationType: maintenance.notificationType,
        members: maintenance.members || ''
      });
    });
  }

  onSubmit() {
    if (!this.maintenanceForm.valid) {
      this.maintenanceForm.markAllAsTouched();
      return;
    }

    const formValue = this.maintenanceForm.value;

    const startDate = formValue.startDate ? new Date(formValue.startDate).toISOString() : '';
    const endDate = formValue.endDate ? new Date(formValue.endDate).toISOString() : '';

    const maintenanceData: IMaintenance = {
      id: this.data.maintenanceId || 0,
      tripId: formValue.tripId!,
      vendorId: formValue.vendorId!,
      mechanicId: formValue.mechanicId!,
      status: formValue.status!,
      startDate: startDate,
      endDate: endDate,
      odometerReading: formValue.odometerReading!,
      totalCost: formValue.totalCost!,
      serviceDetails: formValue.serviceDetails!,
      partsName: formValue.partsName || '',
      quantity: formValue.quantity || 0,
      notificationType: formValue.notificationType!,
      members: formValue.members || ''
    };

    if (this.data.maintenanceId) {
      this.httpService.updateMaintenance(this.data.maintenanceId, maintenanceData).subscribe({
        next: () => {
          this.showSuccessMessage(this.t('MAINTENANCE_UPDATE_SUCCESS'));
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.showErrorMessage(this.t('MAINTENANCE_UPDATE_ERROR'), error);
        }
      });
    } else {
      this.httpService.addMaintenance(maintenanceData).subscribe({
        next: () => {
          this.showSuccessMessage(this.t('MAINTENANCE_ADD_SUCCESS'));
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.showErrorMessage(this.t('MAINTENANCE_ADD_ERROR'), error);
        }
      });
    }
  }

  showSuccessMessage(message: string) {
    Swal.fire({
      icon: 'success',
      title: message,
      confirmButtonText: this.t('OK'),
      allowOutsideClick: false,
      customClass: {
        popup: 'swal2-popup-custom',
        title: 'swal2-title-custom',
        icon: 'swal2-icon-custom',
        confirmButton: 'swal2-confirm-custom'
      }
    });
  }

  showErrorMessage(title: string, error: any) {
    Swal.fire({
      icon: 'error',
      title: title,
      text: error?.error?.message || this.t('OPERATION_ERROR'),
      confirmButtonText: this.t('OK'),
      customClass: {
        popup: 'swal2-popup-custom',
        title: 'swal2-title-custom',
        icon: 'swal2-icon-custom',
        confirmButton: 'swal2-confirm-custom'
      }
    });
  }

  onCancel() {
    if (this.maintenanceForm.dirty) {
      Swal.fire({
        title: this.t('CANCEL_CONFIRM_TITLE'),
        text: this.t('CANCEL_CONFIRM_TEXT'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: this.t('YES_CANCEL'),
        cancelButtonText: this.t('NO_STAY')
      }).then((result) => {
        if (result.isConfirmed) {
          this.dialogRef.close(false);
        }
      });
    } else {
      this.dialogRef.close(false);
    }
  }

  onMaintenanceTypeChange(type: string) {
    if (type === 'Vidange') {
      this.maintenanceForm.get('isVidange')?.setValue(true);
      this.maintenanceForm.get('oilType')?.setValidators([Validators.required]);
      this.maintenanceForm.get('oilQuantity')?.setValidators([Validators.required, Validators.min(0)]);
    } else {
      this.maintenanceForm.get('isVidange')?.setValue(false);
      this.maintenanceForm.get('oilType')?.clearValidators();
      this.maintenanceForm.get('oilQuantity')?.clearValidators();
    }
    this.maintenanceForm.get('oilType')?.updateValueAndValidity();
    this.maintenanceForm.get('oilQuantity')?.updateValueAndValidity();
  }
}