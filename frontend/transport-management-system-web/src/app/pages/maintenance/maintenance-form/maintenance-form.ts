// maintenance-form.ts
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
import { IMechanic } from '../../../types/mechanic';
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

  trips: ITrip[] = [];
  vendors: IVendor[] = [];
  mechanics: IMechanic[] = [];

  maintenanceForm = this.fb.group({
    tripId: this.fb.control<number>(0, [Validators.required, Validators.min(1)]),
    vendorId: this.fb.control<number>(0, [Validators.required, Validators.min(1)]),
    mechanicId: this.fb.control<number>(0, [Validators.required, Validators.min(1)]), // Correction: "mechaicId" -> "mechanicId"
    status: this.fb.control<string>('Planifié', [Validators.required]),
    startDate: this.fb.control<string>('', [Validators.required]),
    endDate: this.fb.control<string>('', [Validators.required]),
    odometerReading: this.fb.control<number>(0, [Validators.required, Validators.min(0)]),
    totalCost: this.fb.control<number>(0, [Validators.required, Validators.min(0)]),
    serviceDetails: this.fb.control<string>('', [Validators.required]),
    partsName: this.fb.control<string>(''),
    quantity: this.fb.control<number>(0, [Validators.min(0)]), // Assurez-vous que c'est cohérent avec le backend
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
    // Load trips for dropdown
    this.httpService.getAllTrips().subscribe(trips => {
      this.trips = trips;
    });

    // Load vendors for dropdown
    this.httpService.getAllVendors().subscribe(vendors => {
      this.vendors = vendors;
    });

    // Load mechanics for dropdown
    this.httpService.getMechanics().subscribe(mechanics => {
      this.mechanics = mechanics;
    });
  }

  loadMaintenanceData() {
    if (!this.data.maintenanceId) return;

    this.httpService.getMaintenance(this.data.maintenanceId).subscribe((maintenance: IMaintenance) => {
      console.log("Maintenance returned from API:", maintenance);
      
      // Convert dates to proper format for mat-datepicker
      const startDate = maintenance.startDate ? new Date(maintenance.startDate) : '';
      const endDate = maintenance.endDate ? new Date(maintenance.endDate) : '';
      
      this.maintenanceForm.patchValue({
        tripId: maintenance.tripId,
        vendorId: maintenance.vendorId,
        mechanicId: maintenance.mechanicId, // Correction: "mechaicId" -> "mechanicId"
        status: maintenance.status,
        startDate: startDate ? startDate.toISOString().split('T')[0] : '',
        endDate: endDate ? endDate.toISOString().split('T')[0] : '',
        odometerReading: maintenance.odometerReading,
        totalCost: maintenance.totalCost,
        serviceDetails: maintenance.serviceDetails,
        partsName: maintenance.partsName || '',
        quantity: maintenance.quantity || 0, // Assurez-vous que c'est "quantity" et pas "qty"
        notificationType: maintenance.notificationType,
        members: maintenance.members || ''
      });
    });
  }

  onSubmit() {
    if (!this.maintenanceForm.valid) return;

    const formValue = this.maintenanceForm.value;
    
    // Format dates for API
    const startDate = formValue.startDate ? new Date(formValue.startDate).toISOString() : '';
    const endDate = formValue.endDate ? new Date(formValue.endDate).toISOString() : '';
    
    const maintenanceData: IMaintenance = {
      id: this.data.maintenanceId || 0,
      tripId: formValue.tripId!,
      vendorId: formValue.vendorId!,
      mechanicId: formValue.mechanicId!, // Correction: "mechaicId" -> "mechanicId"
      status: formValue.status!,
      startDate: startDate,
      endDate: endDate,
      odometerReading: formValue.odometerReading!,
      totalCost: formValue.totalCost!,
      serviceDetails: formValue.serviceDetails!,
      partsName: formValue.partsName || '',
      quantity: formValue.quantity || 0, // Assurez-vous que c'est "quantity" et pas "qty"
      notificationType: formValue.notificationType!,
      members: formValue.members || ''
    };

    if (this.data.maintenanceId) {
      this.httpService.updateMaintenance(this.data.maintenanceId, maintenanceData).subscribe({
        next: () => {
          this.showSuccessMessage('Maintenance modifiée avec succès');
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.showErrorMessage('Erreur lors de la modification de la maintenance', error);
        }
      });
    } else {
      this.httpService.addMaintenance(maintenanceData).subscribe({
        next: () => {
          this.showSuccessMessage('Maintenance ajoutée avec succès');
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.showErrorMessage('Erreur lors de l\'ajout de la maintenance', error);
        }
      });
    }
  }

  showSuccessMessage(message: string) {
    Swal.fire({
      icon: 'success',
      title: message,
      confirmButtonText: 'OK',
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
      text: error?.error?.message || 'Une erreur est survenue',
      confirmButtonText: 'OK',
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
        title: 'Voulez-vous annuler?',
        text: 'Les modifications non enregistrées seront perdues',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Oui, annuler',
        cancelButtonText: 'Non, rester'
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
    // Auto-fill some values
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