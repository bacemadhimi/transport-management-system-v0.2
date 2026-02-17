import { Injectable } from '@angular/core';
import { BehaviorSubject, interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { TripService } from './trip.service';
import { PagedData } from '../types/paged-data';
import { ITrip } from '../types/trip';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private cancelledCount = new BehaviorSubject<number>(0);
  cancelledCount$ = this.cancelledCount.asObservable();

  private pollSub: Subscription | null = null;

  constructor(private tripService: TripService) {}

  startPolling(intervalMs: number = 5000) {
    if (this.pollSub) return; 
    this.pollSub = interval(intervalMs)
      .pipe(
        switchMap(() => this.tripService.getTripsList({ status: 'Cancelled', page: 1, pageSize: 1 }))
      )
      .subscribe({
        next: (paged: PagedData<ITrip>) => {
          const count = paged?.totalData ?? 0;
          this.cancelledCount.next(count);
        },
        error: (err) => {
          console.error('NotificationService polling error', err);
        }
      });
  }

  stopPolling() {
    if (this.pollSub) {
      this.pollSub.unsubscribe();
      this.pollSub = null;
    }
  }
}
