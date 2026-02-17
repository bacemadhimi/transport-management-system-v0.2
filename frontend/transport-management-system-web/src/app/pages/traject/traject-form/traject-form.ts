// traject-form.component.ts
import { Component, Inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { Http } from '../../../services/http';
import { ICreateTrajectDto, IUpdateTrajectDto, ITraject, ITrajectFormData } from '../../../types/traject';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { debounceTime } from 'rxjs';

@Component({
  selector: 'app-traject-form',
  standalone: true,
  templateUrl: './traject-form.html',
  styleUrls: ['./traject-form.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ]
})
export class TrajectForm implements OnInit {
  trajectForm!: FormGroup;
  points: FormArray;
  
  loading = false;
  searchControl = new FormControl('');

  constructor(
    private fb: FormBuilder,
    private http: Http,
    private dialogRef: MatDialogRef<TrajectForm>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: ITrajectFormData
  ) {
    this.points = this.fb.array([]);
  }

  ngOnInit(): void {
    this.initForm();
    
    if (this.data.trajectId) {
      this.loadTraject(this.data.trajectId);
    }
  }

  private initForm(): void {
    this.trajectForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      points: this.points
    });

    // Ajouter un point par défaut
    this.addPoint();
  }

  private loadTraject(trajectId: number): void {
    this.loading = true;
    this.http.getTrajectById(trajectId).subscribe({
      next: (traject: ITraject) => {
        this.trajectForm.patchValue({
          name: traject.name
        });

        // Effacer les points existants
        this.points.clear();
        
        // Ajouter les points du traject
        if (traject.points && traject.points.length > 0) {
          const sortedPoints = [...traject.points].sort((a, b) => a.order - b.order);
          sortedPoints.forEach(point => {
            this.addPoint(point);
          });
        } else {
          this.addPoint();
        }
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading traject:', error);
        this.snackBar.open('Erreur lors du chargement du traject', 'Fermer', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  // Gestion des points
  get pointControls(): FormGroup[] {
    return this.points.controls as FormGroup[];
  }

  addPoint(pointData?: any): void {
    const order = this.points.length + 1;
    const pointGroup = this.fb.group({
      location: [pointData?.location || '', [Validators.required, Validators.maxLength(200)]],
      order: [pointData?.order || order, [Validators.required, Validators.min(1)]]
    });

    this.points.push(pointGroup);
  }

  removePoint(index: number): void {
    this.points.removeAt(index);
    // Mettre à jour les ordres
    this.updatePointOrders();
  }

  movePointUp(index: number): void {
    if (index > 0) {
      const currentPoint = this.points.at(index);
      const previousPoint = this.points.at(index - 1);
      
      this.points.setControl(index, previousPoint);
      this.points.setControl(index - 1, currentPoint);
      
      this.updatePointOrders();
    }
  }

  movePointDown(index: number): void {
    if (index < this.points.length - 1) {
      const currentPoint = this.points.at(index);
      const nextPoint = this.points.at(index + 1);
      
      this.points.setControl(index, nextPoint);
      this.points.setControl(index + 1, currentPoint);
      
      this.updatePointOrders();
    }
  }

  updatePointOrders(): void {
    this.pointControls.forEach((group, index) => {
      group.get('order')?.setValue(index + 1, { emitEvent: false });
    });
  }

 // traject-form.component.ts
// Modifiez la méthode onSubmit()

onSubmit(): void {
  if (this.trajectForm.invalid || this.points.length === 0) {
    this.markFormGroupTouched(this.trajectForm);
    this.pointControls.forEach(group => this.markFormGroupTouched(group));
    
    if (this.points.length === 0) {
      this.snackBar.open('Ajoutez au moins un point', 'Fermer', { duration: 3000 });
    }
    return;
  }

  const formValue = this.trajectForm.value;
  
  // Préparer les points AVEC trajectId
  const points = this.preparePoints();

  if (this.data.trajectId) {
    // Mise à jour
    const updateTrajectData: IUpdateTrajectDto = {
      name: formValue.name,
      points: points
    };

    console.log('Updating traject with data:', JSON.stringify(updateTrajectData, null, 2));
    
    this.http.updateTraject(this.data.trajectId, updateTrajectData).subscribe({
      next: () => {
        this.snackBar.open('Traject modifié avec succès', 'Fermer', { duration: 3000 });
        this.dialogRef.close(true);
        this.loading = false;
      },
      error: (error) => {
        console.error('Update error:', error);
        this.snackBar.open('Erreur lors de la modification du traject', 'Fermer', { duration: 3000 });
        this.loading = false;
      }
    });
  } else {
    // Création - N'incluez PAS trajectId ici car il sera assigné par le backend
    const createTrajectData: ICreateTrajectDto = {
      name: formValue.name,
      points: points
    };

    console.log('Creating traject with data:', JSON.stringify(createTrajectData, null, 2));
    
    this.http.createTraject(createTrajectData).subscribe({
      next: () => {
        this.snackBar.open('Traject créé avec succès', 'Fermer', { duration: 3000 });
        this.dialogRef.close(true);
        this.loading = false;
      },
      error: (error) => {
        console.error('Create error:', error);
        console.error('Error details:', error.error);
        this.snackBar.open('Erreur lors de la création du traject', 'Fermer', { duration: 3000 });
        this.loading = false;
      }
    });
  }
}

private preparePoints(): any[] {
  return this.pointControls.map((group, index) => {
    const point = group.value;
    return {
      location: point.location,
      order: parseInt(point.order) || (index + 1)
      // NOTE: Ne pas inclure trajectId ici pour la création
      // Le backend l'assignera automatiquement
    };
  });
}

  // Helper pour obtenir des suggestions d'adresses
  suggestAddresses(searchTerm: string): void {
    // Implémentez ici une recherche d'adresses si nécessaire
    // Par exemple avec un service de géocoding
  }

  // Validation helper
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  // Méthode pour ajouter un point depuis la recherche
  addPointFromSearch(location: string): void {
    const pointGroup = this.fb.group({
      location: [location, [Validators.required, Validators.maxLength(200)]],
      order: [this.points.length + 1, [Validators.required, Validators.min(1)]]
    });

    this.points.push(pointGroup);
    this.searchControl.setValue('');
    this.snackBar.open('Point ajouté', 'Fermer', { duration: 2000 });
  }

  // Calculer les estimations
  calculateEstimations(): { distance: number, duration: number } {
    const pointsCount = this.points.length;
    return {
      distance: pointsCount * 10, // 10km par point
      duration: pointsCount * 0.5 // 30min par point
    };
  }
}