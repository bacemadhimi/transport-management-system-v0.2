import { Component, OnInit, Inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Http } from '../../../services/http';
import { ICreateTrajectDto, ITraject } from '../../../types/traject';

@Component({
  selector: 'app-traject-form-complete',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    DragDropModule
  ],
  template: `
    <mat-card class="traject-form-card">
      <header class="traject-form-header">
        <div>
          <h2>Créer un nouveau traject</h2>
          <p class="text-sm text-gray-500">
            Définissez les points de départ, d'arrivée et les points intermédiaires
          </p>
        </div>
      </header>

      <div class="loading-overlay" *ngIf="loading">
        <mat-spinner diameter="50"></mat-spinner>
        <span>Chargement...</span>
      </div>

      <form [formGroup]="trajectForm" (ngSubmit)="onSubmit()">
        <!-- Nom du traject -->
        <div class="form-section">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Nom du traject *</mat-label>
            <input
              matInput
              formControlName="name"
              placeholder="Ex: Paris-Lyon-Marseille"
              maxlength="100"
            />
            <mat-error *ngIf="trajectForm.get('name')?.hasError('required')">
              Le nom est obligatoire
            </mat-error>
            <mat-hint>{{ trajectForm.get('name')?.value?.length || 0 }}/100 caractères</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Description (optionnel)</mat-label>
            <textarea
              matInput
              formControlName="description"
              placeholder="Description du traject..."
              rows="2"
              maxlength="500"
            ></textarea>
            <mat-hint>{{ trajectForm.get('description')?.value?.length || 0 }}/500 caractères</mat-hint>
          </mat-form-field>
        </div>

        <!-- Section Départ -->
        <div class="form-section location-section departure">
          <div class="section-header">
            <div class="section-title">
              <mat-icon class="section-icon">flag</mat-icon>
              <h3>Point de départ *</h3>
            </div>
            <div class="section-badge departure-badge">Départ</div>
          </div>
          
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Lieu de départ</mat-label>
            <textarea
              matInput
              formControlName="departureLocation"
              placeholder="Ex: Entrepôt principal, 123 Rue de l'Industrie, 75000 Paris"
              rows="3"
              required
            ></textarea>
            <mat-error *ngIf="trajectForm.get('departureLocation')?.hasError('required')">
              Le point de départ est obligatoire
            </mat-error>
            <mat-hint>Adresse complète du point de départ</mat-hint>
          </mat-form-field>
        </div>

        <!-- Points intermédiaires avec Drag & Drop -->
        <div class="form-section intermediate-section" formArrayName="points">
          <div class="section-header">
            <div class="section-title">
              <mat-icon class="section-icon">location_on</mat-icon>
              <h3>Points intermédiaires ({{ points.length }})</h3>
            </div>
            <div class="section-actions">
              <button type="button" mat-stroked-button (click)="addPoint()" class="add-point-btn">
                <mat-icon>add_location</mat-icon>
                Ajouter un point
              </button>
            </div>
          </div>

          <!-- Liste des points avec Drag & Drop -->
          <div class="points-container" 
               cdkDropList
               [cdkDropListData]="pointControls"
               (cdkDropListDropped)="dropPoint($event)"
               [cdkDropListDisabled]="points.length <= 1">
            
            <div *ngFor="let pointGroup of pointControls; let i = index" 
                 class="point-card"
                 cdkDrag
                 [cdkDragDisabled]="points.length <= 1">
              
              <!-- Drag Handle -->
              <div class="drag-handle" cdkDragHandle *ngIf="points.length > 1">
                <mat-icon>drag_indicator</mat-icon>
              </div>

              <div class="point-marker">
                <div class="point-order">{{ pointGroup.get('order')?.value }}</div>
              </div>

              <div class="point-content" [formGroup]="pointGroup">
                <mat-form-field appearance="outline" class="full-width">
                  <textarea
                    matInput
                    formControlName="location"
                    placeholder="Ex: Centre de distribution, 456 Avenue de la Logistique, 69000 Lyon"
                    rows="2"
                  ></textarea>
                  <mat-error *ngIf="pointGroup.get('location')?.hasError('required')">
                    La localisation est obligatoire
                  </mat-error>
                  <mat-hint>Point de passage n°{{ i + 1 }}</mat-hint>
                </mat-form-field>
              </div>

              <button mat-icon-button type="button"
                      (click)="removePoint(i)"
                      class="remove-point-btn"
                      *ngIf="points.length > 0"
                      matTooltip="Supprimer ce point">
                <mat-icon>delete</mat-icon>
              </button>
            </div>

            <!-- État vide -->
            <div *ngIf="points.length === 0" class="empty-points">
              <mat-icon class="empty-icon">location_off</mat-icon>
              <h4>Aucun point intermédiaire</h4>
              <p>Ajoutez des points de passage entre le départ et l'arrivée</p>
              <button mat-raised-button color="primary" type="button" (click)="addPoint()">
                <mat-icon>add_location</mat-icon>
                Ajouter le premier point
              </button>
            </div>
          </div>

          <!-- Instructions Drag & Drop -->
          <div class="drag-instructions" *ngIf="points.length > 1">
            <mat-icon class="drag-icon">open_with</mat-icon>
            <span>Glissez-déposez les points pour réorganiser l'ordre</span>
          </div>
        </div>

        <!-- Section Arrivée -->
        <div class="form-section location-section arrival">
          <div class="section-header">
            <div class="section-title">
              <mat-icon class="section-icon">flag</mat-icon>
              <h3>Point d'arrivée *</h3>
            </div>
            <div class="section-badge arrival-badge">Arrivée</div>
          </div>
          
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Lieu d'arrivée</mat-label>
            <textarea
              matInput
              formControlName="arrivalLocation"
              placeholder="Ex: Dépôt final, 789 Boulevard des Livraisons, 13000 Marseille"
              rows="3"
              required
            ></textarea>
            <mat-error *ngIf="trajectForm.get('arrivalLocation')?.hasError('required')">
              Le point d'arrivée est obligatoire
            </mat-error>
            <mat-hint>Adresse complète du point d'arrivée</mat-hint>
          </mat-form-field>
        </div>

        <!-- Informations estimées -->
        <div class="form-section estimates-section">
          <div class="section-header">
            <mat-icon class="section-icon">info</mat-icon>
            <h3>Informations estimées</h3>
          </div>
          
          <div class="estimates-grid">
            <mat-form-field appearance="outline">
              <mat-label>Distance totale estimée</mat-label>
              <input
                matInput
                type="number"
                formControlName="estimatedDistance"
                min="0.1"
                step="0.1"
                placeholder="Ex: 350.5"
              />
              <span matSuffix>km</span>
              <mat-error *ngIf="trajectForm.get('estimatedDistance')?.hasError('min')">
                La distance doit être au moins 0.1 km
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Durée estimée</mat-label>
              <input
                matInput
                type="number"
                formControlName="estimatedDuration"
                min="0.1"
                step="0.1"
                placeholder="Ex: 5.5"
              />
              <span matSuffix>heures</span>
              <mat-error *ngIf="trajectForm.get('estimatedDuration')?.hasError('min')">
                La durée doit être au moins 0.1 heure
              </mat-error>
            </mat-form-field>
          </div>
        </div>

        <!-- Prévisualisation -->
        <div class="form-section preview-section" *ngIf="showPreview()">
          <div class="section-header">
            <mat-icon class="section-icon">preview</mat-icon>
            <h3>Aperçu du traject</h3>
          </div>
          
          <div class="preview-timeline">
            <!-- Départ -->
            <div class="preview-point start">
              <div class="preview-marker">D</div>
              <div class="preview-content">
                <div class="preview-title">Départ</div>
                <div class="preview-address">
                  {{ trajectForm.get('departureLocation')?.value || 'Non défini' }}
                </div>
              </div>
            </div>

            <!-- Points intermédiaires -->
            <div *ngFor="let pointGroup of pointControls; let i = index" class="preview-point intermediate">
              <div class="preview-marker">{{ i + 1 }}</div>
              <div class="preview-content">
                <div class="preview-title">Point {{ i + 1 }}</div>
                <div class="preview-address">
                  {{ pointGroup.get('location')?.value || 'Non défini' }}
                </div>
              </div>
            </div>

            <!-- Arrivée -->
            <div class="preview-point end">
              <div class="preview-marker">A</div>
              <div class="preview-content">
                <div class="preview-title">Arrivée</div>
                <div class="preview-address">
                  {{ trajectForm.get('arrivalLocation')?.value || 'Non défini' }}
                </div>
              </div>
            </div>

            <!-- Ligne de connexion -->
            <div class="preview-connector"></div>
          </div>
        </div>

        <!-- Footer -->
        <div class="form-footer">
          <button
            mat-flat-button
            color="primary"
            type="submit"
            [disabled]="trajectForm.invalid || loading"
          >
            <mat-icon *ngIf="!loading">check_circle</mat-icon>
            <mat-spinner *ngIf="loading" diameter="20"></mat-spinner>
            <span *ngIf="!loading">Créer le traject</span>
            <span *ngIf="loading">Création en cours...</span>
          </button>
          
          <button mat-button type="button" (click)="onCancel()" [disabled]="loading">
            Annuler
          </button>
        </div>
      </form>
    </mat-card>
  `,
  styleUrls: ['./traject-form-simple.component.scss']
})
export class TrajectFormSimpleComponent implements OnInit {
  trajectForm!: FormGroup;
  points: FormArray;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private http: Http,
    private dialogRef: MatDialogRef<TrajectFormSimpleComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { 
      onTrajectCreated: (traject: ITraject) => void,
      deliveryAddresses?: string[]
    }
  ) {
    this.points = this.fb.array([]);
  }

  ngOnInit(): void {
    this.initForm();
    this.prepopulateFromDeliveries();
  }

  private initForm(): void {
    this.trajectForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      departureLocation: ['', [Validators.required, Validators.maxLength(500)]],
      arrivalLocation: ['', [Validators.required, Validators.maxLength(500)]],
      points: this.points,
      estimatedDistance: [null, [Validators.min(0.1)]],
      estimatedDuration: [null, [Validators.min(0.1)]]
    });
  }

  private prepopulateFromDeliveries(): void {
    if (this.data.deliveryAddresses && this.data.deliveryAddresses.length > 0) {
      const addresses = this.data.deliveryAddresses;
      if (addresses[0]) {
        this.trajectForm.patchValue({
          departureLocation: addresses[0]
        });
      }

      if (addresses.length > 1) {
        this.trajectForm.patchValue({
          arrivalLocation: addresses[addresses.length - 1]
        });
      }

      if (addresses.length > 2) {
        for (let i = 1; i < addresses.length - 1; i++) {
          this.addPoint(addresses[i]);
        }
      }
    }
  }

  // Gestion des points avec typage correct
  get pointControls(): FormGroup[] {
    return this.points.controls as FormGroup[];
  }

  addPoint(location: string = ''): void {
    const order = this.points.length + 1;
    const pointGroup = this.fb.group({
      location: [location, [Validators.required, Validators.maxLength(500)]],
      order: [order, [Validators.required, Validators.min(1)]]
    });

    this.points.push(pointGroup);
  }

  removePoint(index: number): void {
    this.points.removeAt(index);
    this.updatePointOrders();
  }

  updatePointOrders(): void {
    this.pointControls.forEach((group, index) => {
      group.get('order')?.setValue(index + 1, { emitEvent: false });
    });
  }

  // Correction du type pour le Drag & Drop
  dropPoint(event: CdkDragDrop<FormGroup[]>): void {
    if (event.previousIndex !== event.currentIndex) {
      // Utiliser moveItemInArray pour réorganiser le FormArray
      const controls = this.pointControls;
      moveItemInArray(controls, event.previousIndex, event.currentIndex);
      
      // Reconstruire le FormArray avec le nouvel ordre
      this.points.clear();
      controls.forEach(control => this.points.push(control));
      
      // Mettre à jour les ordres
      this.updatePointOrders();
    }
  }

  // Prévisualisation
  showPreview(): boolean {
    return !!(this.trajectForm.get('departureLocation')?.value || 
              this.trajectForm.get('arrivalLocation')?.value || 
              this.points.length > 0);
  }

  // Soumission
  onSubmit(): void {
    if (this.trajectForm.invalid) {
      this.markFormGroupTouched(this.trajectForm);
      return;
    }

    const formValue = this.trajectForm.value;
    
    // Préparer tous les points (départ + intermédiaires + arrivée)
    const allPoints = [
      {
        location: formValue.departureLocation,
        order: 1,
        type: 'departure'
      },
      ...this.pointControls.map((group, index) => ({
        location: group.get('location')?.value,
        order: index + 2,
        type: 'intermediate'
      })),
      {
        location: formValue.arrivalLocation,
        order: this.points.length + 2,
        type: 'arrival'
      }
    ];

    const trajectData: ICreateTrajectDto = {
      name: formValue.name,
      points: allPoints.map(p => ({
        location: p.location,
        order: p.order
      })),
     
    };

    this.loading = true;
    this.http.createTraject(trajectData).subscribe({
      next: (traject: ITraject) => {
        this.snackBar.open('Traject créé avec succès', 'Fermer', { 
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        
        if (this.data.onTrajectCreated) {
          this.data.onTrajectCreated(traject);
        }
        
        this.dialogRef.close(traject);
        this.loading = false;
      },
      error: (error) => {
        console.error('Create traject error:', error);
        const errorMessage = error.error?.message || 
                           error.error?.errors?.[0]?.message || 
                           'Erreur lors de la création du traject';
        this.snackBar.open(errorMessage, 'Fermer', { 
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        this.loading = false;
      }
    });
  }

  // Helper pour la validation
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        (control as FormArray).controls.forEach(group => {
          if (group instanceof FormGroup) {
            this.markFormGroupTouched(group);
          }
        });
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}