import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { Http } from '../../services/http';
import { Translation } from '../../services/Translation';

export interface SyncStatus {
  status: string;
  totalRecords: number;
  processedRecords: number;
}

@Component({
  selector: 'app-sync',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressBarModule,
    MatButtonModule,
    MatTableModule
  ],
  templateUrl: './sync.html'
})
export class SyncComponent {

  progress = 0;
  status: SyncStatus | null = null;
  history: any[] = [];
  isSyncing = false;

  displayedColumns: string[] = ['date', 'status', 'total', 'processed'];

  constructor(private http: Http) {}

 private translation = inject(Translation);
  t(key: string): string { return this.translation.t(key); }

  startSync() {
    if (this.isSyncing) return;

    this.isSyncing = true;

    this.status = {
      status: 'Running',
      totalRecords: 0,
      processedRecords: 0
    };

    this.progress = 0;

    this.http.startSync().subscribe(() => {
      this.updateProgress();
      this.loadHistory();
    });
  }

  updateProgress() {
    const interval = setInterval(() => {
      this.http.getSyncStatus().subscribe((res) => {
        this.status = res;

        if (res.totalRecords > 0) {
          const calculated = (res.processedRecords / res.totalRecords) * 100;
          this.progress = Math.max(this.progress, Math.round(calculated));
        }

        if (res.status !== 'Running') {
          clearInterval(interval);
          this.progress = 100;
          this.isSyncing = false;
          this.loadHistory();
        }
      });
    }, 1000);
  }

  loadHistory() {
    this.http.getSyncHistory().subscribe((res) => {
      this.history = res;
    });
  }
}