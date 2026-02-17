import { Component, Input } from '@angular/core';
import { IonicModule, ModalController } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { ITrip } from '../../types/trip';

@Component({
  selector: 'app-trip-details-modal',
  templateUrl: './trip-details-modal.component.html',
  styleUrls: ['./trip-details-modal.component.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule]
})
export class TripDetailsModalComponent {
  @Input() trip!: ITrip;
  

  constructor(private modalCtrl: ModalController) {}

  close() {
    this.modalCtrl.dismiss();
     console.log('Trip Details:', this.trip);
  }

  getDataUrl(base64?: string | null): string | null {
    console.log('Trip Details:', this.trip);
    if (!base64) return null;
    
    if (base64.startsWith('/9j')) return 'data:image/jpeg;base64,' + base64;
    if (base64.startsWith('iVBORw0KG')) return 'data:image/png;base64,' + base64;
    return 'data:image/jpeg;base64,' + base64;
  }
}
