import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private _cancelledTripsCount = new BehaviorSubject<number>(0);
  cancelledTripsCount$ = this._cancelledTripsCount.asObservable();

  setCancelledTripsCount(count: number) {
    this._cancelledTripsCount.next(count);
  }
}
