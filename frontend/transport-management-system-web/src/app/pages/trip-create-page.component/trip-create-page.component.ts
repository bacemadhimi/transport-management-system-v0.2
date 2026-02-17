import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TripForm } from '../trip/trip-form/trip-form';
import { Translation } from '../../services/Translation';

@Component({
  selector: 'app-trip-create-page',
  standalone: true,
  template: `
    <div class="trips-page">
      <div class="trips-header">
        <div class="trips-header__top">
          <button mat-button (click)="goBack()" class="back-button">
            <mat-icon>arrow_back</mat-icon>
                  {{ t('BACK_TO_LIST') }}
          </button>
          <h1 class="trips-title">{{ t('CREATE_TRIP_TITLE') }}</h1>
        </div>

        <div class="trips-header__actions">
          <div class="trips-header__left">
            <!-- Optional: Add search or filters -->
          </div>

          <div class="trips-header__right">
            <!-- Optional: Add action buttons -->
          </div>
        </div>
      </div>

      <div class="trip-form-container">
        <app-trip-form 
          [mode]="'create'"
          (success)="onSuccess()"
          (cancel)="goBack()"
        ></app-trip-form>
      </div>
    </div>
  `,
  styles: `
    /* Full-screen container like trip list */
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
    
    /* Trip form container - takes remaining space */
    .trip-form-container {
      flex: 1;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    
    /* Force TripForm to fill the container */
    .trip-form-container ::ng-deep app-trip-form {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    
    /* Mobile responsiveness */
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
    TripForm
  ]
})
export class TripCreatePageComponent {
  constructor(private router: Router) {}

  goBack(): void {
    this.router.navigate(['/trips']);
  }

  onSuccess(): void {
    this.router.navigate(['/trips']);
  }
  //
    private translation = inject(Translation);
      t(key: string): string { return this.translation.t(key); }
}