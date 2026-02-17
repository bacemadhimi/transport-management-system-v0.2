import { Component, inject, OnInit } from '@angular/core';
import { OrderSettingsService } from '../../services/order-settings.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { IOrderSettings } from '../../types/order';
import { Translation } from '../../services/Translation';

@Component({
  selector: 'app-order-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule
  ],
  templateUrl: './order-settings.html',
  styleUrls: ['./order-settings.scss']
})
export class OrderSettingsComponent implements OnInit {

  settings: IOrderSettings = {
    allowEditOrder: true,
    allowEditDeliveryDate: true,
    allowLoadLateOrders: true,
    acceptOrdersWithoutAddress: true,
    loadingUnit: 'palette',
    planningHorizon: 3
  };

  constructor(private orderSettingsService: OrderSettingsService) {}
  //TRANSLATE LANGUAGE 
 private translation = inject(Translation);
  t(key: string): string { return this.translation.t(key); }


  ngOnInit() {
    // Charger les paramètres depuis l'API
    this.orderSettingsService.getSettings().subscribe({
      next: (res) => {
        this.settings = res;
      },
      error: (err) => {
        console.error("Erreur récupération des settings :", err);
      }
    });
  }

  // saveSettings() {
  //   this.orderSettingsService.updateSettings(this.settings).subscribe({
  //     next: () => {
  //       alert('Paramètres enregistrés avec succès !');
  //     },
  //     error: (err) => {
  //       console.error("Erreur lors de l'enregistrement :", err);
  //       alert('Erreur lors de l’enregistrement des paramètres');
  //     }
  //   });
  // }

  saveSettings() {
  this.orderSettingsService.updateSettings(this.settings).subscribe({
    next: () => {
      alert(this.t('SETTINGS_SAVED_SUCCESS'));
    },
    error: (err) => {
      console.error(this.t('SAVE_ERROR_LOG'), err);
      alert(this.t('SETTINGS_SAVE_ERROR'));
    }
  });
}

}
