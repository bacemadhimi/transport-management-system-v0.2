import { Component, inject, Inject, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Http } from '../../../services/http';
import { ILocation, ICreateLocationDto, IUpdateLocationDto } from '../../../types/location';
import { IGeographicalEntity, IGeographicalLevel } from '../../../types/general-settings';
import Swal from 'sweetalert2';
import { Translation } from '../../../services/Translation';
import { Subscription } from 'rxjs';

interface DialogData {
  locationId?: number;
}

@Component({
  selector: 'app-location-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatSelectModule
  ],
  templateUrl: './location-form.html',
  styleUrls: ['./location-form.scss']
})
export class LocationForm implements OnInit, OnDestroy {
  locationForm!: FormGroup;
  loading = false;
  isSubmitting = false;

  // Données géographiques
  geographicalEntities: IGeographicalEntity[] = [];
  geographicalLevels: IGeographicalLevel[] = [];
  loadingGeographicalEntities = false;

  // Sélecteurs hiérarchiques
  level1Entities: IGeographicalEntity[] = [];
  level2Entities: IGeographicalEntity[] = [];
  level3Entities: IGeographicalEntity[] = [];
  level4Entities: IGeographicalEntity[] = [];
  level5Entities: IGeographicalEntity[] = [];

  level1Control = new FormControl<number | null>(null);
  level2Control = new FormControl<number | null>(null);
  level3Control = new FormControl<number | null>(null);
  level4Control = new FormControl<number | null>(null);
  level5Control = new FormControl<number | null>(null);

  selectedEntities: number[] = [];
  private entityMap: Map<number, IGeographicalEntity> = new Map();

  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private http: Http,
    private cdr: ChangeDetectorRef,
    private dialogRef: MatDialogRef<LocationForm>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadGeographicalEntities();

    if (this.data.locationId) {
      this.loadLocation(this.data.locationId);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private initForm(): void {
    this.locationForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      geographicalEntityIds: [[], [Validators.required, Validators.minLength(1)]],
      isActive: [true]
    });
  }

  private setupLevelControls(): void {
    this.level1Control.valueChanges.subscribe((value) => {
      if (!value) {
        this.level2Control.reset();
        this.level3Control.reset();
        this.level4Control.reset();
        this.level5Control.reset();
      }
      this.updateSelectedEntities();
    });

    this.level2Control.valueChanges.subscribe((value) => {
      if (!value) {
        this.level3Control.reset();
        this.level4Control.reset();
        this.level5Control.reset();
      }
      this.updateSelectedEntities();
    });

    this.level3Control.valueChanges.subscribe((value) => {
      if (!value) {
        this.level4Control.reset();
        this.level5Control.reset();
      }
      this.updateSelectedEntities();
    });

    this.level4Control.valueChanges.subscribe((value) => {
      if (!value) {
        this.level5Control.reset();
      }
      this.updateSelectedEntities();
    });

    this.level5Control.valueChanges.subscribe(() => {
      this.updateSelectedEntities();
    });
  }

  private updateSelectedEntities(): void {
    const selected: number[] = [];

    if (this.level1Control.value) selected.push(this.level1Control.value);
    if (this.level2Control.value) selected.push(this.level2Control.value);
    if (this.level3Control.value) selected.push(this.level3Control.value);
    if (this.level4Control.value) selected.push(this.level4Control.value);
    if (this.level5Control.value) selected.push(this.level5Control.value);

    this.selectedEntities = selected;

    this.locationForm.patchValue({
      geographicalEntityIds: this.selectedEntities
    });
    this.locationForm.get('geographicalEntityIds')?.markAsDirty();
  }

private organizeEntitiesByLevel() {
  this.entityMap.clear();
  
  console.log('Organizing entities by level...');
  console.log('Total entities:', this.geographicalEntities.length);

  // Créer un map des entités par ID
  this.geographicalEntities.forEach(e => {
    if (e.id !== undefined && e.id !== null) {
      this.entityMap.set(e.id, e);
    }
  });

  // Regrouper par niveau
  const levelGroups: { [key: number]: IGeographicalEntity[] } = {
    1: [],
    2: [],
    3: [],
    4: [],
    5: []
  };

  this.geographicalEntities.forEach(entity => {
    if (entity.id === undefined || entity.id === null) return;

    const level = this.geographicalLevels.find(l => l.id === entity.levelId);
    if (level) {
      console.log(`Entity ${entity.name} -> Level ${level.levelNumber} (${level.name})`);
      if (!levelGroups[level.levelNumber]) {
        levelGroups[level.levelNumber] = [];
      }
      levelGroups[level.levelNumber].push(entity);
    }
  });

  this.level1Entities = levelGroups[1] || [];
  this.level2Entities = levelGroups[2] || [];
  this.level3Entities = levelGroups[3] || [];
  this.level4Entities = levelGroups[4] || [];
  this.level5Entities = levelGroups[5] || [];

  console.log('Level 1 entities:', this.level1Entities.length);
  console.log('Level 2 entities:', this.level2Entities.length);
  console.log('Level 3 entities:', this.level3Entities.length);
  console.log('Level 4 entities:', this.level4Entities.length);
  console.log('Level 5 entities:', this.level5Entities.length);
}

private loadGeographicalEntities(): void {
  this.loadingGeographicalEntities = true;

  const levelsSub = this.http.getGeographicalLevels().subscribe({
    next: (levels) => {
      this.geographicalLevels = levels.filter(l => l.isActive);

      const entitiesSub = this.http.getGeographicalEntities().subscribe({
        next: (entities) => {
          this.geographicalEntities = entities.filter(e => e.isActive);
          this.organizeEntitiesByLevel();
          this.setupLevelControls();
          this.loadingGeographicalEntities = false;
          
          // Rafraîchir la hiérarchie et restaurer les sélections
          this.refreshHierarchy();
          
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error loading geographical entities:', error);
          this.loadingGeographicalEntities = false;
        }
      });
      this.subscriptions.push(entitiesSub);
    },
    error: (error) => {
      console.error('Error loading geographical levels:', error);
      this.loadingGeographicalEntities = false;
    }
  });

  this.subscriptions.push(levelsSub);
}
private setGeographicalSelections(entityIds: number[]) {
  console.log('Setting geographical selections for IDs:', entityIds);
  
  this.selectedEntities = [...entityIds];

  // Réinitialiser tous les contrôles
  this.level1Control.reset();
  this.level2Control.reset();
  this.level3Control.reset();
  this.level4Control.reset();
  this.level5Control.reset();

  // Pour chaque ID d'entité, trouver son niveau et le définir
  entityIds.forEach((id: number) => {
    const entity = this.geographicalEntities.find(e => e.id === id);
    if (entity) {
      const level = this.geographicalLevels.find(l => l.id === entity.levelId);
      if (level) {
        console.log(`Setting entity ${entity.name} (ID: ${id}) to level ${level.levelNumber}`);
        switch(level.levelNumber) {
          case 1:
            this.level1Control.setValue(id);
            break;
          case 2:
            this.level2Control.setValue(id);
            break;
          case 3:
            this.level3Control.setValue(id);
            break;
          case 4:
            this.level4Control.setValue(id);
            break;
          case 5:
            this.level5Control.setValue(id);
            break;
        }
      } else {
        console.warn(`No level found for entity ${entity.name} with levelId ${entity.levelId}`);
      }
    } else {
      console.warn(`Entity with ID ${id} not found in geographicalEntities`);
    }
  });

  // Mettre à jour le formulaire
  this.locationForm.patchValue({
    geographicalEntityIds: this.selectedEntities
  });
  
  console.log('Final selected entities after restoration:', this.selectedEntities);
  console.log('Level 1 control value:', this.level1Control.value);
  console.log('Level 2 control value:', this.level2Control.value);
  console.log('Level 3 control value:', this.level3Control.value);
  console.log('Level 4 control value:', this.level4Control.value);
  console.log('Level 5 control value:', this.level5Control.value);
}

private loadLocation(locationId: number): void {
  this.loading = true;

  this.http.getLocation(locationId).subscribe({
    next: (response) => {
      const location = response.data;
      console.log('Loaded location:', location);

      this.locationForm.patchValue({
        name: location.name,
        isActive: location.isActive
      });

      // Charger les entités géographiques associées
      if (location.geographicalEntities && location.geographicalEntities.length > 0) {
        const entityIds = location.geographicalEntities.map((ge: any) => ge.geographicalEntityId);
        console.log('Entity IDs to restore:', entityIds);
        
        // Attendre que les entités géographiques soient chargées
        if (this.geographicalEntities.length > 0) {
          this.setGeographicalSelections(entityIds);
        } else {
          // Si les entités ne sont pas encore chargées, attendre
          const checkInterval = setInterval(() => {
            if (this.geographicalEntities.length > 0) {
              clearInterval(checkInterval);
              this.setGeographicalSelections(entityIds);
            }
          }, 100);
          
          // Timeout après 5 secondes
          setTimeout(() => {
            clearInterval(checkInterval);
            if (this.geographicalEntities.length === 0) {
              console.error('Geographical entities still not loaded after timeout');
              Swal.fire({
                icon: 'warning',
                title: 'Attention',
                text: 'Impossible de charger les entités géographiques',
                confirmButtonText: 'OK'
              });
            }
          }, 5000);
        }
      }

      this.loading = false;
      this.cdr.detectChanges();
    },
    error: (error) => {
      console.error('Error loading location:', error);
      this.loading = false;
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Impossible de charger les données de la location',
        confirmButtonText: 'OK'
      });
    }
  });
}
// Appeler cette méthode après le chargement des entités
private refreshHierarchy(): void {
  this.organizeEntitiesByLevel();
  
  // Si on est en mode édition et qu'il y a des entités sélectionnées
  if (this.data.locationId && this.selectedEntities.length > 0) {
    this.setGeographicalSelections(this.selectedEntities);
  }
}
  removeEntity(entityId: number): void {
    const entity = this.geographicalEntities.find(e => e.id === entityId);
    if (entity) {
      const level = this.geographicalLevels.find(l => l.id === entity.levelId);
      if (level) {
        switch(level.levelNumber) {
          case 1: this.level1Control.reset(); break;
          case 2: this.level2Control.reset(); break;
          case 3: this.level3Control.reset(); break;
          case 4: this.level4Control.reset(); break;
          case 5: this.level5Control.reset(); break;
        }
      }
    }

    const newSelection = this.selectedEntities.filter(id => id !== entityId);
    this.selectedEntities = newSelection;

    this.locationForm.patchValue({
      geographicalEntityIds: this.selectedEntities
    });
    this.locationForm.get('geographicalEntityIds')?.markAsDirty();
  }

  getEntityName(entityId: number): string {
    return this.entityMap.get(entityId)?.name || `ID: ${entityId}`;
  }

  getLevelName(levelNumber: number): string {
    const level = this.geographicalLevels.find(l => l.levelNumber === levelNumber);
    return level ? level.name : `Niveau ${levelNumber}`;
  }

  onSubmit(): void {
    if (this.locationForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    const formValue = this.locationForm.value;

    const geographicalEntities = (formValue.geographicalEntityIds || []).map((id: number) => ({
      geographicalEntityId: id
    }));

    const locationData = {
      name: formValue.name,
      geographicalEntities: geographicalEntities,
      isActive: formValue.isActive
    };

    if (this.data.locationId) {
      this.updateLocation(locationData);
    } else {
      this.createLocation(locationData);
    }
  }

  private createLocation(formValue: any): void {
    const locationData: ICreateLocationDto = {
      name: formValue.name,
      geographicalEntities: formValue.geographicalEntities,
      isActive: formValue.isActive
    };

    this.http.createLocation(locationData).subscribe({
      next: (location: ILocation) => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'success',
          title: this.t('CITY_CREATED_SUCCESS'),
          confirmButtonText: 'OK',
          allowOutsideClick: false
        }).then(() => this.dialogRef.close(location));
      },
      error: (error) => {
        console.error('Create location error:', error);
        const errorMessage = error.error?.message || this.t('CITY_CREATION_FAILED');
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: errorMessage,
          confirmButtonText: 'OK'
        });
        this.isSubmitting = false;
      }
    });
  }

  private updateLocation(formValue: any): void {
    const locationData: IUpdateLocationDto = {
      name: formValue.name,
      geographicalEntities: formValue.geographicalEntities,
      isActive: formValue.isActive
    };

    this.http.updateLocation(this.data.locationId!, locationData).subscribe({
      next: (location: ILocation) => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'success',
          title: this.t('LOCATION_UPDATED_SUCCESS'),
          confirmButtonText: 'OK',
          allowOutsideClick: false
        }).then(() => this.dialogRef.close(location));
      },
      error: (error) => {
        console.error('Update location error:', error);
        const errorMessage = error.error?.message || this.t('LOCATION_UPDATE_FAILED');
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: errorMessage,
          confirmButtonText: 'OK'
        });
        this.isSubmitting = false;
      }
    });
  }

  getErrorMessage(controlName: string): string {
    const control = this.locationForm.get(controlName);

    if (control?.hasError('required')) {
      if (controlName === 'name') {
        return this.t('LOCATION_NAME_REQUIRED') || 'Le nom de la location est requis';
      }
      if (controlName === 'geographicalEntityIds') {
        return 'Au moins une localisation géographique doit être sélectionnée';
      }
      return this.t('FIELD_REQUIRED') || 'Ce champ est obligatoire';
    }

    if (control?.hasError('maxlength')) {
      return this.t('MAX_LENGTH_EXCEEDED') || 'Le nom ne peut pas dépasser 100 caractères';
    }

    if (controlName === 'geographicalEntityIds' && control?.hasError('minlength')) {
      return 'Au moins une localisation doit être sélectionnée';
    }

    return '';
  }

  get isEditMode(): boolean {
    return !!this.data.locationId;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private translation = inject(Translation);
  t(key: string): string { return this.translation.t(key); }
}