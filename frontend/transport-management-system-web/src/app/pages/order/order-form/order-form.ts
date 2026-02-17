import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { Http } from '../../../services/http';
import { CreateOrderDto, IOrder, OrderStatus } from '../../../types/order';
import Swal from 'sweetalert2';
import { ICustomer } from '../../../types/customer';
import { MatIconModule } from '@angular/material/icon';
import { DateAdapter, MatNativeDateModule } from '@angular/material/core';
import { MatDatepicker } from '@angular/material/datepicker';

import { MatDatepickerModule } from '@angular/material/datepicker';

import { MAT_DATE_LOCALE, MAT_DATE_FORMATS } from '@angular/material/core';
import { FrDateAdapter } from '../../../types/fr-date-adapter';
import { OrderSettingsService } from '../../../services/order-settings.service';
import { Translation } from '../../../services/Translation';


@Component({
  selector: 'app-order-form',
  standalone: true,
   providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' },
    { provide: DateAdapter, useClass: FrDateAdapter }
  ],
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
    MatIconModule,
     MatDatepickerModule, 
  ],
  templateUrl: './order-form.html',
  styleUrls: ['./order-form.scss']
})


export class OrderFormComponent implements OnInit {
    @ViewChild('picker') picker!: MatDatepicker<Date>;
  fb = inject(FormBuilder);
  httpService = inject(Http);
  settingsService = inject(OrderSettingsService);
  dialogRef = inject(MatDialogRef<OrderFormComponent>);
data = inject<{ orderId?: number; loadingUnit?: string }>(MAT_DIALOG_DATA, { optional: true }) ?? {};


  isSubmitting = false;
  showingAlert = false;
  customers: ICustomer[] = [];
  orderStatusEnum = OrderStatus;
  loadingUnit: string = 'palette';
  minDate: Date = new Date(); 
   maxDeliveryDate: Date = new Date(); 
    allowEditDeliveryDate: boolean = true;
  planningHorizon: number = 3; 
  orderForm = this.fb.group({
    customerId: this.fb.control<number | null>(null, [Validators.required]),
    reference: this.fb.control<string>(''),
    weight: this.fb.control<number>(0, [Validators.required, Validators.min(0.1)]),
  weightUnit: this.fb.control<string>('palette', [Validators.required]),

    deliveryAddress: this.fb.control<string>(''),
    notes: this.fb.control<string>(''),
  
    deliveryDate: this.fb.control<Date | null>(null, [Validators.required])
  });

  ngOnInit() {
    this.loadCustomers();
     if (this.data?.loadingUnit) {
      this.loadingUnit = this.data.loadingUnit;
    }
      this.settingsService.getSettings().subscribe({
    next: (res) => {
      this.allowEditDeliveryDate = res.allowEditDeliveryDate;
        this.planningHorizon = res.planningHorizon;
                this.updateMaxDeliveryDate(); // calculer max date
      // Désactiver le contrôle si nécessaire
      if (!this.allowEditDeliveryDate) {
        this.orderForm.get('deliveryDate')?.disable();
      }
    },
    error: (err) => console.error('Erreur récupération settings:', err)
  });
    if (this.data.orderId) {
      this.loadOrder(this.data.orderId);
    }
  }

    // Calcul de la date max selon l'horizon et la date existante
  updateMaxDeliveryDate(orderDate?: Date) {
    const today = new Date();
    const horizonDate = new Date();
    horizonDate.setDate(today.getDate() + this.planningHorizon);

    // si date existante > horizon, on la garde
    if (orderDate && orderDate > horizonDate) {
      this.maxDeliveryDate = orderDate;
    } else {
      this.maxDeliveryDate = horizonDate;
    }
  }
private formatDateLocal(date: Date | null | undefined): string | undefined {
  if (!date) return undefined; 

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); 
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

  private translation = inject(Translation);
   t(key: string): string { return this.translation.t(key); }

loadCustomers() {
 this.httpService.getCustomers().subscribe({
  next: (res) => {
    console.log('Customers loaded:', res); 
    this.customers = res;
  },
  error: (err) => console.error(err)
});

}


loadOrder(id: number) {
  this.httpService.getOrderById(id).subscribe({
    next: (response: any) => {

      
      const order = response.data;

this.orderForm.patchValue({
  customerId: order.customerId,
  reference: order.reference,
  weight: order.weight,
    weightUnit: order.weightUnit, 
  deliveryAddress: order.deliveryAddress || '',
  notes: order.notes || '',
deliveryDate: order.deliveryDate ? new Date(order.deliveryDate) : null,
 
});
 // mettre à jour maxDeliveryDate selon date existante
        this.updateMaxDeliveryDate(order.deliveryDate ? new Date(order.deliveryDate) : undefined);
      
      Object.keys(this.orderForm.controls).forEach(key => {
        const control = this.orderForm.get(key);
        console.log(`📋 ${key}:`, control?.value, 'valid:', control?.valid);
      });
    },
    error: (err) => {
      console.error('Error:', err);
  
    }
  });
}

  onSubmit() {
    if (!this.orderForm.valid || this.isSubmitting) return;

    this.isSubmitting = true;

    const formValue = this.orderForm.value;

    const selectedCustomer = this.customers.find(c => c.id === formValue.customerId);
    const orderData: CreateOrderDto = {
      customerId: formValue.customerId!,
      reference: formValue.reference || undefined,
      weight: formValue.weight!,
      weightUnit: formValue.weightUnit!,
      deliveryAddress: formValue.deliveryAddress || undefined,
      notes: formValue.notes || undefined,
     customerCity: selectedCustomer?.gouvernorat ,
deliveryDate: this.formatDateLocal(formValue.deliveryDate)


    };

    if (this.data.orderId) {
      this.httpService.updateOrder(this.data.orderId, orderData).subscribe({
        next: () => {
          //this.showSuccessAlert('Commande modifiée avec succès');
           this.showSuccessAlert(this.t('ORDER_UPDATED_SUCCESS'));
        },
        error: (err) => {
          this.handleError(err, 'modifier');
        }
      });
    } else {
      this.httpService.createOrder(orderData).subscribe({
        next: () => {
          
          //this.showSuccessAlert('Commande ajoutée avec succès');
          this.showSuccessAlert(this.t('ADDED_SUCCESS'));
        },
        error: (err) => {
          this.handleError(err, 'ajouter');
        }
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }

  getErrorMessage(controlName: string): string {
    const control = this.orderForm.get(controlName);
    
    if (control?.hasError('required')) {
      return `${this.getFieldLabel(controlName)} est obligatoire`;
    }
    
    if (control?.hasError('min')) {
      return `${this.getFieldLabel(controlName)} doit être supérieur à 0`;
    }
    
    if (control?.hasError('minlength')) {
      const requiredLength = control.errors?.['minlength'].requiredLength;
      return `${this.getFieldLabel(controlName)} doit comporter au moins ${requiredLength} caractères`;
    }
    
    return '';
  }

  private getFieldLabel(controlName: string): string {
    const labels: { [key: string]: string } = {
      customerId: 'Le client',
      type: 'Le type',
      weight: 'Le poids'
    };
    return labels[controlName] || controlName;
  }

  private showSuccessAlert(message: string) {
    this.isSubmitting = false;
    this.showingAlert = true;
    
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
    }).then(() => this.dialogRef.close(true));
  }

  private handleError(err: any, action: string) {
    this.isSubmitting = false;
    
    Swal.fire({
      icon: 'error',
      title: 'Erreur',
      text: err?.message || `Impossible de ${action} la commande`,
      confirmButtonText: 'OK'
    });
  }
}