import { Component, inject } from '@angular/core';
import { IonicModule, Platform } from '@ionic/angular';
import { DatabaseService } from './services/sqlite.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: true,
  imports: [IonicModule]
})
export class AppComponent {
   private platform = inject(Platform);
  private databaseService = inject(DatabaseService);
  constructor() { this.initializeApp();}

  private async initializeApp() {
    await this.platform.ready();

    try {
      await this.databaseService.initializeDatabase();
      console.log('Database initialized at app startup');
    } catch (error) {
      console.error('Database init failed', error);
    }
  }
}
