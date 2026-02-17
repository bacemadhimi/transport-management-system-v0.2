import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Http } from '../../../services/http';
import { IVendor } from '../../../types/vendor';
import { MatSelectModule } from '@angular/material/select';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-vendor-form',
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
    MatSelectModule
  ],
  templateUrl: './vendor-form.html',
  styleUrls: ['./vendor-form.scss']
})
export class VendorForm implements OnInit {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<VendorForm>);
  data = inject<{ vendorId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};
  @ViewChild('phoneInput') phoneInput!: ElementRef<HTMLInputElement>;
  private iti: any; // intl-tel-input instance

  isSubmitting = false;

  vendorForm = this.fb.group({
    name: this.fb.control<string>('', [Validators.required]),
    email: this.fb.control<string>('', [Validators.required, Validators.email]),
    phone: ['', [Validators.required, this.validatePhone.bind(this)]],
  });

  ngOnInit() {
    if (this.data.vendorId) {
      this.httpService.getVendor(this.data.vendorId).subscribe((vendor: IVendor) => {
        console.log("vendor returned from API:", vendor);
        this.vendorForm.patchValue({
          name: vendor.name,
          email: vendor.email,
          phone: vendor.phone
        });
      });
    }
  }

  onSubmit() {
    if (!this.vendorForm.valid || this.isSubmitting) return;

    this.isSubmitting = true;

    const value: IVendor = {
      id: this.data.vendorId || 0,
      name: this.vendorForm.value.name!,
      email: this.vendorForm.value.email!,
      phone: this.iti.getNumber(),
      createdDate: new Date().toISOString()
    };

    const request = this.data.vendorId
      ? this.httpService.updateVendor(this.data.vendorId, value)
      : this.httpService.addVendor(value);

    request.subscribe({
      next: () => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'success',
          title: this.data.vendorId ? 'vendeur modifié avec succès' : 'vendeur ajouté avec succès',
          confirmButtonText: 'OK'
        }).then(() => this.dialogRef.close(true));
      },
      error: () => {
        this.isSubmitting = false;
      }
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

  ngAfterViewInit() {
    const loadScript = (src: string) =>
      new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject();
        document.body.appendChild(script);
      });

    const loadCSS = (href: string) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    };

    loadCSS('https://cdn.jsdelivr.net/npm/intl-tel-input@19.1.1/build/css/intlTelInput.min.css');

    loadScript('https://cdn.jsdelivr.net/npm/intl-tel-input@19.1.1/build/js/intlTelInput.min.js')
      .then(() => loadScript('https://cdn.jsdelivr.net/npm/intl-tel-input@19.1.1/build/js/utils.js'))
      .then(() => {
        this.iti = (window as any).intlTelInput(this.phoneInput.nativeElement, {
          initialCountry: 'tn',
          separateDialCode: true,
          nationalMode: false,
          utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@19.1.1/build/js/utils.js'
        });

        this.phoneInput.nativeElement.addEventListener('blur', () => {
          const number = this.iti.getNumber();
          this.vendorForm.get('phone')?.setValue(number);
        });
      })
      .catch(() => console.error('Failed to load intl-tel-input scripts.'));
  }

  private validatePhone(control: any) {
    if (!this.iti) return null;
    return this.iti.isValidNumber() ? null : { pattern: true };
  }
   getErrorMessage(controlName: string): string {
    const control = this.vendorForm.get(controlName);
    if (control?.hasError('required')) return `${controlName} est obligatoire`;
    if (control?.hasError('pattern')) return 'Format de téléphone invalide';
    if (control?.hasError('email')) return 'Veuillez entrer un email valide';
    return '';
  }
}