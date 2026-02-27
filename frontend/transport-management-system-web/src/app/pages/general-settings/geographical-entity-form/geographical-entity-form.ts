import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Http } from '../../../services/http';
import { IGeographicalLevel, IGeographicalEntity } from '../../../types/general-settings';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-geographical-entity-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    MatDialogModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCheckboxModule
  ],
  templateUrl: './geographical-entity-form.html',
  styleUrls: ['./geographical-entity-form.scss']
})
export class GeographicalEntityForm implements OnInit {
  entityForm: FormGroup;
  isSubmitting = false;
  levels: IGeographicalLevel[] = [];
  allEntities: IGeographicalEntity[] = [];
  availableParents: IGeographicalEntity[] = [];
  selectedLevelIsMappable = false;

  constructor(
    private fb: FormBuilder,
    private httpService: Http,
    public dialogRef: MatDialogRef<GeographicalEntityForm>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      entityId?: number;
      levels: IGeographicalLevel[];
      entities: IGeographicalEntity[];
    }
  ) {
    this.levels = data.levels || [];
    this.allEntities = data.entities || [];

    this.entityForm = this.fb.group({
      levelId: [null, Validators.required],
      name: ['', [Validators.required, Validators.maxLength(100)]],
      parentId: [null],
      latitude: [null],
      longitude: [null],
      isActive: [true]
    });
  }

  ngOnInit(): void {
    if (this.data.entityId) {
      this.loadEntity();
    }
  }

  loadEntity(): void {
    this.httpService.getGeographicalEntity(this.data.entityId!).subscribe({
      next: (entity) => {
        this.entityForm.patchValue({
          levelId: entity.levelId,
          name: entity.name,
          parentId: entity.parentId,
          latitude: entity.latitude,
          longitude: entity.longitude,
          isActive: entity.isActive
        });
        this.onLevelChange();
      },
      error: (error) => {
        console.error('Error loading entity:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Impossible de charger les données de l\'entité',
          confirmButtonText: 'OK'
        }).then(() => this.dialogRef.close());
      }
    });
  }

  onLevelChange(): void {
    const levelId = this.entityForm.get('levelId')?.value;
    const selectedLevel = this.levels.find(l => l.id === levelId);
    
    this.selectedLevelIsMappable = selectedLevel?.isMappable || false;

    // Update validators based on level mappability
    const latitudeControl = this.entityForm.get('latitude');
    const longitudeControl = this.entityForm.get('longitude');

    if (this.selectedLevelIsMappable) {
      latitudeControl?.setValidators([Validators.required, Validators.min(-90), Validators.max(90)]);
      longitudeControl?.setValidators([Validators.required, Validators.min(-180), Validators.max(180)]);
    } else {
      latitudeControl?.clearValidators();
      longitudeControl?.clearValidators();
    }
    
    latitudeControl?.updateValueAndValidity();
    longitudeControl?.updateValueAndValidity();

    // Update available parents
    this.updateAvailableParents();
  }

  updateAvailableParents(): void {
    const currentLevelId = this.entityForm.get('levelId')?.value;
    const currentLevel = this.levels.find(l => l.id === currentLevelId);
    const currentEntityId = this.data.entityId;

    if (!currentLevel) {
      this.availableParents = [];
      return;
    }

    // Parents must be from levels with lower number (higher in hierarchy)
    this.availableParents = this.allEntities.filter(entity => {
      const entityLevel = this.levels.find(l => l.id === entity.levelId);
      return entityLevel && 
             entityLevel.levelNumber < currentLevel.levelNumber && 
             entity.isActive &&
             (!currentEntityId || entity.id !== currentEntityId);
    });
  }

  getLevelName(levelId: number): string {
    const level = this.levels.find(l => l.id === levelId);
    return level ? level.name : 'Inconnu';
  }

  getGoogleMapsUrl(): string {
    const lat = this.entityForm.get('latitude')?.value;
    const lng = this.entityForm.get('longitude')?.value;
    return `https://www.google.com/maps?q=${lat},${lng}`;
  }

 onSubmit(): void {
  if (this.entityForm.invalid) {
    Object.keys(this.entityForm.controls).forEach(key => {
      const control = this.entityForm.get(key);
      control?.markAsTouched();
    });
    return;
  }

  this.isSubmitting = true;
  const formValue = this.entityForm.value;

  // Create DTO that matches what backend expects
  const entityData: any = {
    name: formValue.name.trim(),
    levelId: formValue.levelId,
    isActive: formValue.isActive
  };

  // Add ID for updates
  if (this.data.entityId) {
    entityData.id = this.data.entityId;
  }

  // Add parentId only if selected
  if (formValue.parentId) {
    entityData.parentId = formValue.parentId;
  }

  // Add coordinates if provided
  if (formValue.latitude !== null && formValue.latitude !== undefined) {
    entityData.latitude = Number(formValue.latitude);
  }
  if (formValue.longitude !== null && formValue.longitude !== undefined) {
    entityData.longitude = Number(formValue.longitude);
  }

  console.log('Submitting entity data:', entityData);

  const request = this.data.entityId
    ? this.httpService.updateGeographicalEntity(this.data.entityId, entityData)
    : this.httpService.addGeographicalEntity(entityData);

  request.subscribe({
    next: (response) => {
      console.log('Entity saved successfully:', response);
      this.isSubmitting = false;
      Swal.fire({
        icon: 'success',
        title: 'Succès',
        text: this.data.entityId ? 'Entité modifiée avec succès' : 'Entité ajoutée avec succès',
        timer: 2000,
        showConfirmButton: false
      }).then(() => this.dialogRef.close(true));
    },
    error: (error) => {
      this.isSubmitting = false;
      console.error('Error saving entity:', error);
      console.error('Error details:', error.error);
      
      let errorMessage = 'Erreur lors de l\'enregistrement';
      
      if (error.status === 400) {
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.error?.title) {
          errorMessage = error.error.title;
        }
      } else if (error.status === 409) {
        errorMessage = 'Une entité avec ce nom existe déjà pour ce niveau';
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: errorMessage,
        confirmButtonText: 'OK'
      });
    }
  });
}

  onCancel(): void {
    this.dialogRef.close();
  }
}