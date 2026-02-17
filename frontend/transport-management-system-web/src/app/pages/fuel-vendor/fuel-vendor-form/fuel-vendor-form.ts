import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Http } from '../../../services/http';
import { IFuelVendor } from '../../../types/fuel-vendor';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-fuel-vendor-form',
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
  templateUrl: './fuel-vendor-form.html',
  styleUrls: ['./fuel-vendor-form.scss']
})
export class FuelVendorForm implements OnInit {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<FuelVendorForm>);
  data = inject<{ vendorId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  vendorForm = this.fb.group({
    name: this.fb.control<string>('', [Validators.required])
  });

  ngOnInit() {
    if (this.data.vendorId) {
      this.httpService.getFuelVendor(this.data.vendorId).subscribe((vendor: IFuelVendor) => {
        console.log("Fuel vendor returned from API:", vendor);
        this.vendorForm.patchValue({
          name: vendor.name
        });
      });
    }
  }

  onSubmit() {
    if (!this.vendorForm.valid) return;

    const value = {
      id: this.data.vendorId || 0,
      name: this.vendorForm.value.name!
    };

    if (this.data.vendorId) {
      this.httpService.updateFuelVendor(this.data.vendorId, value).subscribe(() => {
        Swal.fire({
          icon: 'success',
          title: 'Fournisseur modifié avec succès',
          confirmButtonText: 'OK',
          allowOutsideClick: false,
          customClass: {
            popup: 'swal2-popup-custom',
            title: 'swal2-title-custom',
            icon: 'swal2-icon-custom',
            confirmButton: 'swal2-confirm-custom'
          }
        }).then(() => this.dialogRef.close(true));
      });
    } else {
      this.httpService.addFuelVendor(value).subscribe(() => {
        Swal.fire({
          icon: 'success',
          title: 'Fournisseur ajouté avec succès',
          confirmButtonText: 'OK',
          allowOutsideClick: false,
          customClass: {
            popup: 'swal2-popup-custom',
            title: 'swal2-title-custom',
            icon: 'swal2-icon-custom',
            confirmButton: 'swal2-confirm-custom'
          }
        }).then(() => this.dialogRef.close(true));
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}