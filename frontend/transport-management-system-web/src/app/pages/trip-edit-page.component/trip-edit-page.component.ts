import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TripForm } from '../trip/trip-form/trip-form';

@Component({
  selector: 'app-trip-edit-page',
  standalone: true,
  template: `
    <div class="trips-page">
      <div class="trips-header">
        <div class="trips-header__top">
          <button mat-button (click)="goBack()" class="back-button">
            <mat-icon>arrow_back</mat-icon>
            Retour à la liste
          </button>
          <h1 class="trips-title">Modifier le voyage </h1>
        </div>
        <div class="trips-header__actions">
          <div class="trips-header__left">
            <!-- You can add search or other controls here if needed -->
          </div>

          <div class="trips-header__right">
            <!-- Optional: Add additional action buttons -->
          </div>
        </div>
      </div>

      <div class="trip-form-container">
        @if (tripId) {
          <app-trip-form
            [tripId]="tripId"
            [mode]="'edit'"
            (success)="onSuccess()"
            (cancel)="goBack()"
          ></app-trip-form>
        } @else {
          <div class="loading-container">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Chargement du voyage...</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: `

    .trips-page {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: #f8fafc;
      overflow: hidden;
    }

    .trips-header {
      flex-shrink: 0;
      background: white;
      padding: 20px 24px;
      border-bottom: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      z-index: 10;
    }

    .trips-header__top {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
    }

    .back-button {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #64748b;
      padding: 6px 12px;
      border-radius: 6px;
      transition: all 0.2s;
    }

    .back-button:hover {
      color: #334155;
      background: #f1f5f9;
    }

    .trips-title {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: #0f172a;
      flex: 1;
    }

    .trips-header__actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }

    .trips-header__left {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }

    .trips-header__right {
      display: flex;
      gap: 12px;
    }


    .trip-form-container {
      flex: 1;
      overflow: auto;
      padding: 24px;
      background: #f8fafc;

      @media (max-width: 768px) {
        padding: 16px;
      }
    }


    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      min-height: 400px;
      color: #64748b;
      gap: 16px;
    }


    @media (max-width: 768px) {
      .trips-header {
        padding: 16px;
      }

      .trips-title {
        font-size: 20px;
      }

      .trips-header__actions {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;
      }

      .trips-header__left,
      .trips-header__right {
        width: 100%;
      }

      .trips-header__right {
        justify-content: flex-end;
      }
    }
  `,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    TripForm
  ]
})
export class TripEditPageComponent implements OnInit {
  tripId?: number;

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.tripId = +id;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/trips']);
  }

  onSuccess(): void {
    this.router.navigate(['/trips']);
  }
}