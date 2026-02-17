import { Component, inject, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { Dashboard } from '../../services/dashboard';
import { Table } from '../../components/table/table';
import { TripsMapComponent } from '../trips-map/trips-map.component';
import { PagedData } from '../../types/paged-data';

interface ITripByTruck {
  truckImmatriculation: string;
  tripCount: number;
}

interface ITodayTrip {
  tripId: number;
  driverName: string;
  truckImmatriculation: string;
  customerName: string;
  tripStart: string;
  tripEnd: string;
  tripStatus: string;
  approxTotalKM?: number;
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    MatCardModule, 
    Table, 
    CommonModule,
    TripsMapComponent
  ],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class Home implements OnInit {

  userCount: number = 0;
  driverCount: number = 0;
  truckCount: number = 0;

  tripByTruckData: PagedData<ITripByTruck> = { data: [], totalData: 0 };
  todayTripData: PagedData<ITodayTrip> = { data: [], totalData: 0 };

  showTruckStats: boolean = false;

  todayTripCols = [
    { key: 'driverName', label: 'Chauffeur' },
    { key: 'truckImmatriculation', label: 'Camion' },
    { key: 'customerName', label: 'Client' },
    { key: 'tripStart', label: 'Départ' },
    { key: 'tripEnd', label: 'Arrivée' },
    { key: 'tripStatus', label: 'Statut' },
    { key: 'approxTotalKM', label: 'Km approximatif' }
  ];

  tripByTruckCols = [
    { key: 'truckImmatriculation', label: 'Camion' },
    { key: 'tripCount', label: 'Nombre de trajets' }
  ];

  dashboardService = inject(Dashboard);

  ngOnInit() {
    
    this.tripByTruckData = { data: [], totalData: 0 };
    this.todayTripData = { data: [], totalData: 0 };

    
    this.dashboardService.getDashboardData().subscribe({
      next: (result) => {
        this.userCount = result.userCount || 0;
        this.driverCount = result.driverCount || 0;
        this.truckCount = result.truckCount || 0;
      },
      error: (error) => {
        console.error('Erreur chargement dashboard:', error);
        this.userCount = 0;
        this.driverCount = 0;
        this.truckCount = 0;
      }
    });

    
    this.dashboardService.getTripsByTruck().subscribe({
      next: (result) => {
        this.tripByTruckData = { 
          data: result || [], 
          totalData: result?.length || 0 
        };
      },
      error: (error) => {
        console.error('Erreur chargement trips by truck:', error);
        this.tripByTruckData = { data: [], totalData: 0 };
      }
    });

    
    this.dashboardService.getTodayTrips().subscribe({
      next: (result) => {
        this.todayTripData = { 
          data: result || [], 
          totalData: result?.length || 0 
        };
      },
      error: (error) => {
        console.error('Erreur chargement today trips:', error);
        this.todayTripData = { data: [], totalData: 0 };
      }
    });
  }
}