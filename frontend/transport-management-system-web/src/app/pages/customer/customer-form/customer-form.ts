import { Component, inject, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Http } from '../../../services/http';
import { ICustomer } from '../../../types/customer';
import { ICity } from '../../../types/city';
import { IZone } from '../../../types/zone';
import Swal from 'sweetalert2';
import { Subscription } from 'rxjs';
import { Translation } from '../../../services/Translation';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatSelectModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './customer-form.html',
  styleUrls: ['./customer-form.scss']
})
export class CustomerFormComponent implements OnInit, AfterViewInit, OnDestroy {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<CustomerFormComponent>);
  data = inject<{ customerId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  @ViewChild('phoneInput') phoneInput!: ElementRef<HTMLInputElement>;
  private iti: any;
  
  isLoading = false;
  isSubmitting = false;
  loadingZones = false; 
  loadingCities =false;
  zones: IZone[] = []; 
  cities:ICity[]=[];
  
  private subscriptions: Subscription[] = []; 

  customerForm = this.fb.group({
    matricule: ['', [Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    phone: ['', [Validators.maxLength(20), this.validatePhone.bind(this)]], // optional now
    email: ['', [Validators.email, Validators.maxLength(100)]],
    adress: ['', [Validators.maxLength(200)]],
    city: ['', [Validators.maxLength(100)]],
    contact: ['', [Validators.maxLength(100)]],
    zoneId: this.fb.control<number | null>(null, [Validators.required]),
    cityId: this.fb.control<number | null>(null, [Validators.required])
  });

  ngOnInit() {
    this.loadActiveZones(); 
    //Test
     const zoneChangeSub = this.customerForm.get('zoneId')!.valueChanges.subscribe(zoneId => {
    if (zoneId) {
      this.loadCitiesByZone(zoneId);
    } else {
      this.cities = [];
      this.customerForm.get('cityId')?.setValue(null);
    }
  });
  this.subscriptions.push(zoneChangeSub);
  //
    if (this.data.customerId) {
      this.loadCustomer(this.data.customerId);
    }
  }
  
 

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private loadActiveZones(): void {
    this.loadingZones = true;
    const zonesSub = this.httpService.getActiveZones().subscribe({
      next: (response) => {
        let zonesData: IZone[];
        if (response && typeof response === 'object' && 'data' in response) {
          zonesData = (response as any).data;
        } else if (Array.isArray(response)) {
          zonesData = response;
        } else if (response && typeof response === 'object' && 'zones' in response) {
          zonesData = (response as any).zones || (response as any).items || [];
        } else {
          zonesData = [];
        }
        this.zones = zonesData;
        this.loadingZones = false;
      },
      error: (error) => {
        console.error('Error loading active zones:', error);
        this.loadingZones = false;
      }
    });
    this.subscriptions.push(zonesSub);
  }
private loadCitiesByZone(zoneId: number) {
  this.loadingCities = true;
  this.cities = [];
  this.customerForm.get('cityId')?.setValue(null);

  const citiesSub = this.httpService.getActiveCitiesByZone(zoneId).subscribe({
    next: (response) => {
      let citiesData: ICity[] = [];

      if (response && typeof response === 'object' && 'data' in response) {
        citiesData = (response as any).data;
      } else if (Array.isArray(response)) {
        citiesData = response;
      }

      this.cities = citiesData;
      this.loadingCities = false;
    },
    error: (error) => {
      console.error('Error loading cities:', error);
      this.loadingCities = false;
    }
  });

  this.subscriptions.push(citiesSub);
}
  private loadCustomer(id: number) {
    this.isLoading = true;
    this.httpService.getCustomer(id).subscribe({
      next: (customer: ICustomer) => {
        this.customerForm.patchValue({
          matricule: customer.matricule || '',
          name: customer.name,
          phone: customer.phone || '',
          email: customer.email || '',
          adress: customer.adress || '',
          city: customer.city || '',
          contact: customer.contact || '',
          zoneId: customer.zoneId || null 
        });

        setTimeout(() => {
          if (customer.phoneCountry && this.iti) {
            this.iti.setCountry(customer.phoneCountry);
          }
          if (customer.phone) {
            this.iti.setNumber(customer.phone);
          }
        }, 0);

        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.dialogRef.close();
      }
    });
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
        this.iti = (window as any).intlTelInput(
          this.phoneInput.nativeElement,
          {
            initialCountry: 'tn',
            separateDialCode: true,
            nationalMode: false,
            formatOnDisplay: true,
            utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@19.1.1/build/js/utils.js'
          }
        );

        this.phoneInput.nativeElement.addEventListener('blur', () => {
          const number = this.iti.getNumber();
          this.customerForm.get('phone')?.setValue(number);
        });
      })
      .catch(() => {
        console.error('Failed to load intl-tel-input scripts.');
      });
  }

  private validatePhone(control: any) {
    if (!control.value) return null; // skip if empty
    if (!this.iti) return null;
    return this.iti.isValidNumber() ? null : { pattern: true };
  }

  onSubmit() {
    if (this.isSubmitting) return;

    const phoneNumber = this.iti ? this.iti.getNumber() : '';

    if (!this.customerForm.valid) {
      Swal.fire({ 
        icon: 'error', 
        title: 'Veuillez remplir tous les champs obligatoires correctement' 
      });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.customerForm.value;
    const selectedCity = this.cities.find(c => c.id === formValue.cityId);
    const customerData = {
      matricule: formValue.matricule || '', 
      name: formValue.name!,       
      phone: phoneNumber || '',                 
      phoneCountry: this.iti ? this.iti.getSelectedCountryData().iso2 : 'tn', 
      email: formValue.email || '',     
      adress: formValue.adress || '', 
       city: selectedCity?.name || '',
      contact: formValue.contact || '',  
      zoneId: formValue.zoneId!, 
    };

    const action = this.data.customerId
      ? this.httpService.updateCustomer(this.data.customerId, customerData)
      : this.httpService.addCustomer(customerData);

    action.subscribe({
      next: () => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'success',
          //title: this.data.customerId ? 'Client modifié avec succès' : 'Client ajouté avec succès',
          title: this.data.customerId? this.t('CUSTOMER_UPDATED'): this.t('CUSTOMER_ADDED'),

          confirmButtonText: 'OK',
          allowOutsideClick: false
        }).then(() => this.dialogRef.close(true));
      },
      error: (error) => { 
        console.error(error); 
        this.isSubmitting = false;
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: error.error?.message || 'Une erreur est survenue lors de l\'enregistrement',
          confirmButtonText: 'OK'
        });
      }
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

  getErrorMessage(controlName: string): string {
    const control = this.customerForm.get(controlName);
    if (control?.hasError('required')) {
      return `${this.getFieldLabel(controlName)} est obligatoire`;
    }
    if (control?.hasError('minlength')) {
      const requiredLength = control.errors?.['minlength'].requiredLength;
      return `${this.getFieldLabel(controlName)} doit comporter au moins ${requiredLength} caractères`;
    }
    if (control?.hasError('maxlength')) {
      const requiredLength = control.errors?.['maxlength'].requiredLength;
      return `${this.getFieldLabel(controlName)} ne peut pas dépasser ${requiredLength} caractères`;
    }
    if (control?.hasError('pattern')) {
      return 'Format de téléphone invalide';
    }
    if (control?.hasError('email')) {
      return 'Veuillez entrer une adresse email valide';
    }
    return '';
  }

  private getFieldLabel(controlName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Le nom',
      phone: 'Le téléphone',
      email: 'L\'email',
      adress: 'L\'adresse',
      city: 'La ville',
      contact: 'Le contact',
      zoneId: 'La zone'
    };
    return labels[controlName] || controlName;
  }

  get isEditing(): boolean {
    return !!this.data.customerId;
  }
    
  //Call the services to get the translations
    private translation = inject(Translation);
   t(key: string): string { return this.translation.t(key); }
}
