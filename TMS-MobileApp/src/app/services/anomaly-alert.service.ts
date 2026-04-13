import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { SignalrService } from './signalr.service';

export interface AnomalyAlert {
  type: string;
  niveau_urgence: 'info' | 'attention' | 'critique';
  action_recommandee: string;
  score: number;
  timestamp?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class AnomalyAlertService {
  private hubConnection: any;

  constructor(
    private signalrService: SignalrService,
    private toastCtrl: ToastController
  ) {
    this.setupAnomalyListener();
  }

  /**
   * Configure l'écouteur d'anomalies via SignalR
   */
  private setupAnomalyListener(): void {
    // Écouter les anomalies poussées par le backend
    this.signalrService.connection$.subscribe({
      next: (connection) => {
        if (connection) {
          connection.on('AnomalieDetectee', (alert: AnomalyAlert) => {
            console.warn('⚠️ Anomalie détectée:', alert);
            this.showAnomalyToast(alert);
          });

          console.log('✓ Écouteur d\'anomalies SignalR configuré');
        }
      },
      error: (err) => {
        console.error('❌ Erreur configuration écouteur anomalies:', err);
      }
    });
  }

  /**
   * Affiche une alerte d'anomalie en toast
   */
  private async showAnomalyToast(alert: AnomalyAlert): Promise<void> {
    const colorMap = {
      'info': 'primary',
      'attention': 'warning',
      'critique': 'danger'
    };

    const iconMap = {
      'info': 'ℹ️',
      'attention': '⚠️',
      'critique': '🚨'
    };

    const toast = await this.toastCtrl.create({
      message: `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 24px;">${iconMap[alert.niveau_urgence]}</span>
          <div>
            <strong>Anomalie détectée</strong><br/>
            <small>${alert.type}</small><br/>
            <small>${alert.action_recommandee}</small>
          </div>
        </div>
      `,
      duration: alert.niveau_urgence === 'critique' ? 10000 : 5000,
      color: colorMap[alert.niveau_urgence],
      position: 'top',
      cssClass: 'anomaly-toast'
    });

    await toast.present();
  }

  /**
   * Vérifie manuellement une anomalie (appel API direct)
   */
  async checkAnomaly(telemetrie: {
    chauffeur_id: string;
    vitesse_kmh?: number;
    acceleration_m_s2?: number;
    lat?: number;
    lon?: number;
    deviation_itineraire_m?: number;
    duree_arret_s?: number;
  }): Promise<AnomalyAlert | null> {
    try {
      const response = await fetch(`${environment.apiUrl}/api/Anomaly/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(telemetrie)
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.anomalie_detectee) {
          const alert: AnomalyAlert = {
            type: data.type,
            niveau_urgence: data.niveau_urgence,
            action_recommandee: data.action_recommandee,
            score: data.score,
            timestamp: new Date()
          };

          this.showAnomalyToast(alert);
          return alert;
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Erreur vérification anomalie:', error);
      return null;
    }
  }
}
