import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { ITripSettings } from '../../types/trip';
import { TripSettingsService } from '../../services/trips-settings.service';
import { Translation } from '../../services/Translation';

@Component({
  selector: 'app-trips-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule
  ],
  templateUrl: './trips-settings.html',
  styleUrls: ['./trips-settings.scss']
})
export class TripsSettingsComponent implements OnInit {

  settings: ITripSettings = {
    allowEditTrips: true,
    allowDeleteTrips: true,
    linkDriverToTruck: true,  
    editTimeLimit: 30,
    maxTripsPerDay: 10,
    tripOrder: 'chronological',
    requireDeleteConfirmation: true,
    notifyOnTripEdit: true,
    notifyOnTripDelete: true
  };

  defaultSettings: ITripSettings = { ...this.settings };

  constructor(private TripSettingsService: TripSettingsService) {}

      //TRANSLATE LANGUAGE 
 private translation = inject(Translation);
  t(key: string): string { return this.translation.t(key); }
      //
      
  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.TripSettingsService.getSettings().subscribe({
      next: (res) => {
        this.settings = res;
        this.defaultSettings = { ...res };
      },
      error: (err) => {
        console.error('Erreur récupération des paramètres de tournées :', err);
      }
    });
  }

  // saveSettings() {
  //   this.TripSettingsService.updateSettings(this.settings).subscribe({
  //     next: () => {
  //       alert('Paramètres des tournées enregistrés avec succès !');
  //       this.defaultSettings = { ...this.settings };
  //     },
  //     error: (err) => {
  //       console.error("Erreur lors de l'enregistrement :", err);
  //       alert('Erreur lors de l’enregistrement des paramètres des tournées');
  //     }
  //   });
  // }

  saveSettings() {
  this.TripSettingsService.updateSettings(this.settings).subscribe({
    next: () => {
      alert(this.t('TRIP_SETTINGS_SAVE_SUCCESS'));
      this.defaultSettings = { ...this.settings };
    },
    error: (err) => {
      console.error("Erreur lors de l'enregistrement :", err);
      alert(this.t('TRIP_SETTINGS_SAVE_ERROR'));
    }
  });
}



  // resetToDefaults() {
  //   if (confirm('Voulez-vous réinitialiser tous les paramètres par défaut ?')) {
  //     this.settings = { ...this.defaultSettings };
  //   }
  // }

  resetToDefaults() {
  if (confirm(this.t('TRIP_SETTINGS_RESET_CONFIRM'))) {
    this.settings = { ...this.defaultSettings };
  }
}

}