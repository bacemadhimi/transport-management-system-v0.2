import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Http } from '../../../services/http';
import { IFuel } from '../../../types/fuel';
import Swal from 'sweetalert2';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { IMarque } from '../../../types/marque'; // ✅ Add this import

@Component({
  selector: 'app-fuel-form',
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
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './fuel-form.html',
  styleUrls: ['./fuel-form.scss']
})
export class FuelForm implements OnInit {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<FuelForm>);
  data = inject<{ fuelId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  fuelForm = this.fb.group({
    truckId: this.fb.control<number>(0, [Validators.required, Validators.min(1)]),
    driverId: this.fb.control<number>(0, [Validators.required, Validators.min(1)]),
    fillDate: this.fb.control<Date | null>(null, Validators.required),
    quantity: this.fb.control<number | null>(null, [Validators.required, Validators.min(1)]),
    odometerReading: this.fb.control<string>('', Validators.required),
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0)]),
    comment: this.fb.control<string>(''),
    fuelTank: this.fb.control<string>('', Validators.required),
    fuelVendorId: this.fb.control<number>(0, [Validators.required, Validators.min(1)])
  });

  trucks: any[] = [];
  drivers: any[] = [];
  fuelVendors: any[] = [];
  statuses = ['Disponible', 'En mission', 'Indisponible'];
  fuelTypes = ['Diesel', 'Essence', 'GPL', 'AdBlue'];

  
  marques: IMarque[] = [];
  marqueMap: Map<number, string> = new Map();

  ngOnInit() {
    this.loadMarques(); 
    this.loadTrucks();
    this.loadDrivers();
    this.loadFuelVendors();

    if (this.data.fuelId) {
      this.loadFuel(this.data.fuelId);
    }
  }

  
  private loadMarques(): void {
    this.httpService.getMarqueTrucks().subscribe({
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

        this.marqueMap.clear();
        this.marques.forEach(marque => {
          this.marqueMap.set(marque.id, marque.name);
        });

        console.log('✅ Marques loaded for FuelForm:', this.marques.length);
      },
      error: (error) => {
        console.error('Error loading marques:', error);
      }
    });
  }


  getMarqueName(marqueId?: number): string {
    if (!marqueId) return 'N/A';
    return this.marqueMap.get(marqueId) || `Marque #${marqueId}`;
  }

  getTruckDisplayName(truck: any): string {
    if (!truck) return 'N/A';
    const brandName = this.getMarqueName(truck.marqueTruckId || truck.typeTruck?.marqueTruckId);
    return `${brandName} - ${truck.immatriculation}`;
  }

  private loadTrucks() {
    this.httpService.getTrucks().subscribe({
      next: (trucks) => {
        this.trucks = trucks;
        console.log('✅ Trucks loaded:', trucks.length);
      },
      error: (error) => {
        console.error('Error loading trucks:', error);
      }
    });
  }

  private loadDrivers() {
    this.httpService.getDrivers().subscribe({
      next: (drivers) => {
        this.drivers = drivers;
      },
      error: (error) => {
        console.error('Error loading drivers:', error);
      }
    });
  }

  private loadFuelVendors() {
    this.httpService.getFuelVendors().subscribe({
      next: (vendors) => {
        this.fuelVendors = vendors;
      },
      error: (error) => {
        console.error('Error loading fuel vendors:', error);
      }
    });
  }

  private loadFuel(id: number) {
    this.httpService.getFuel(id).subscribe({
      next: (fuel: IFuel) => {
        console.log("Fuel returned from API:", fuel);
        this.fuelForm.patchValue({
          truckId: fuel.truckId,
          driverId: fuel.driverId,
          fillDate: fuel.fillDate ? new Date(fuel.fillDate) : null,
          quantity: fuel.quantity,
          odometerReading: fuel.odometerReading,
          amount: fuel.amount,
          comment: fuel.comment || '',
          fuelTank: fuel.fuelTank,
          fuelVendorId: fuel.fuelVendorId
        });
      },
      error: (error) => {
        console.error('Error loading fuel:', error);
      }
    });
  }

  onSubmit() {
    if (!this.fuelForm.valid) return;

    const formatDate = (date: Date | null): string => {
      if (!date) return '';
      return date.toISOString().split('T')[0];
    };

    const value = {
      id: this.data.fuelId || 0,
      truckId: this.fuelForm.value.truckId!,
      driverId: this.fuelForm.value.driverId!,
      fillDate: formatDate(this.fuelForm.value.fillDate!),
      quantity: this.fuelForm.value.quantity!,
      odometerReading: this.fuelForm.value.odometerReading!,
      amount: this.fuelForm.value.amount!,
      comment: this.fuelForm.value.comment || '',
      fuelTank: this.fuelForm.value.fuelTank!,
      fuelVendorId: this.fuelForm.value.fuelVendorId!
    };

    if (this.data.fuelId) {
      this.httpService.updateFuel(this.data.fuelId, value).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Remplissage de carburant modifié avec succès',
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
          Swal.fire({ icon: 'error', title: 'Erreur', text: err?.message || 'Impossible de modifier le remplissage', confirmButtonText: 'OK' });
        }
      });
    } else {
      this.httpService.addFuel(value).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Remplissage de carburant ajouté avec succès',
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
          Swal.fire({ icon: 'error', title: 'Erreur', text: err?.message || 'Impossible d\'ajouter le remplissage', confirmButtonText: 'OK' });
        }
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}