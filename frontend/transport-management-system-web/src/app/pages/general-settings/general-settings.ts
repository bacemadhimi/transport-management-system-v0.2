import { Component, inject, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Http } from '../../services/http';
import { IGeneralSettings, IGeographicalLevel, IGeographicalEntity } from '../../types/general-settings';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators, FormArray, FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { GeneralSettingsForm } from './general-settings-form/general-settings-form';
import { GeographicalEntityForm } from './geographical-entity-form/geographical-entity-form';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-general-settings',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    MatDividerModule
  ],
  templateUrl: './general-settings.html',
  styleUrls: ['./general-settings.scss']
})
export class GeneralSettings implements OnInit {
  constructor(public auth: Auth, private fb: FormBuilder) {}

  httpService = inject(Http);
  readonly dialog = inject(MatDialog);

  // Form Groups
  orderSettingsForm!: FormGroup;
  tripSettingsForm!: FormGroup;
  geographicalLevelsForm!: FormGroup;

  // Data Arrays
  orderSettings: IGeneralSettings[] = [];
  tripSettings: IGeneralSettings[] = [];
  employeeCategories: IGeneralSettings[] = [];
  geographicalLevels: IGeographicalLevel[] = [];
  geographicalEntities: IGeographicalEntity[] = [];
  filteredEntities: IGeographicalEntity[] = [];

  // Loading States
  isLoading = false;
  isSaving = false;
  loadingCategories = false;
  loadingEntities = false;
  isSavingGeographical = false;
  isSavingLogo = false;

  // Filters
  entityLevelFilter = new FormControl('all');

  // Options
  loadingUnitOptions = ['palette', 'kg', 'tonne', 'm³'];
  tripOrderOptions = ['chronologique', 'priorité', 'géographique', 'optimisé'];

  // For max capacity field visibility
  showMaxCapacityField = false;

  // Table Columns
  employeeColumns: string[] = ['code', 'description', 'value', 'actions'];
  entityColumns: string[] = ['name', 'level', 'parent', 'coordinates', 'status', 'actions'];

  // Logo upload properties
  @ViewChild('companyFileInput') companyFileInput!: ElementRef;
  companyLogoPreview: string | null = null;
  companyFileError: string | null = null;
  hasCompanyLogo = false;

  // Control Maps
  private orderControlMap: { [key: string]: string } = {
    'ALLOW_EDIT_ORDER': 'ALLOW_EDIT_ORDER',
    'ALLOW_DELIVERY_DATE_EDIT': 'ALLOW_DELIVERY_DATE_EDIT',
    'ALLOW_LOAD_LATE_ORDERS': 'ALLOW_LOAD_LATE_ORDERS',
    'ACCEPT_ORDERS_WITHOUT_ADDRESS': 'ACCEPT_ORDERS_WITHOUT_ADDRESS',
    'LOADING_UNIT': 'LOADING_UNIT',
    'PLANNING_HORIZON': 'PLANNING_HORIZON'
  };

  private tripControlMap: { [key: string]: string } = {
    'ALLOW_EDIT_TRIPS': 'ALLOW_EDIT_TRIPS',
    'ALLOW_DELETE_TRIPS': 'ALLOW_DELETE_TRIPS',
    'EDIT_TIME_LIMIT': 'EDIT_TIME_LIMIT',
    'MAX_TRIPS_PER_DAY': 'MAX_TRIPS_PER_DAY',
    'TRIP_ORDER': 'TRIP_ORDER',
    'REQUIRE_DELETE_CONFIRMATION': 'REQUIRE_DELETE_CONFIRMATION',
    'NOTIFY_ON_TRIP_EDIT': 'NOTIFY_ON_TRIP_EDIT',
    'NOTIFY_ON_TRIP_DELETE': 'NOTIFY_ON_TRIP_DELETE',
    'LINK_DRIVER_TO_TRUCK': 'LINK_DRIVER_TO_TRUCK',
    'ALLOW_EXCEED_MAX_CAPACITY': 'ALLOW_EXCEED_MAX_CAPACITY',
    'MAX_CAPACITY_PERCENTAGE': 'MAX_CAPACITY_PERCENTAGE'
  };

  ngOnInit() {
    this.initForms();
    this.loadAllSettings();

    this.entityLevelFilter.valueChanges.subscribe(levelId => {
      this.filterEntities(levelId);
    });
  }

  initForms() {
    // Order Settings Form
    this.orderSettingsForm = this.fb.group({
      ALLOW_EDIT_ORDER: [false],
      ALLOW_DELIVERY_DATE_EDIT: [false],
      ALLOW_LOAD_LATE_ORDERS: [false],
      ACCEPT_ORDERS_WITHOUT_ADDRESS: [false],
      LOADING_UNIT: ['palette'],
      PLANNING_HORIZON: [30, [Validators.min(1), Validators.max(365)]]
    });

    // Trip Settings Form with capacity fields
    this.tripSettingsForm = this.fb.group({
      ALLOW_EDIT_TRIPS: [false],
      ALLOW_DELETE_TRIPS: [false],
      EDIT_TIME_LIMIT: [60, [Validators.min(1)]],
      MAX_TRIPS_PER_DAY: [10, [Validators.min(1)]],
      TRIP_ORDER: ['chronologique'],
      REQUIRE_DELETE_CONFIRMATION: [true],
      NOTIFY_ON_TRIP_EDIT: [false],
      NOTIFY_ON_TRIP_DELETE: [false],
      LINK_DRIVER_TO_TRUCK: [false],
      ALLOW_EXCEED_MAX_CAPACITY: [false],
      MAX_CAPACITY_PERCENTAGE: [{ value: 100, disabled: true }, [Validators.min(1), Validators.max(200)]]
    });

    // Geographical Levels Form
    this.geographicalLevelsForm = this.fb.group({
      levels: this.fb.array([])
    });

    // Listen for changes to ALLOW_EXCEED_MAX_CAPACITY
    this.tripSettingsForm.get('ALLOW_EXCEED_MAX_CAPACITY')?.valueChanges.subscribe(value => {
      this.onAllowExceedChange(value);
    });
  }

  onAllowExceedChange(allowExceed: boolean) {
    const maxCapacityControl = this.tripSettingsForm.get('MAX_CAPACITY_PERCENTAGE');
    
    if (allowExceed) {
      maxCapacityControl?.enable();
      this.showMaxCapacityField = true;
      if (!maxCapacityControl?.value || maxCapacityControl?.value === 100) {
        maxCapacityControl?.setValue(110);
      }
    } else {
      maxCapacityControl?.disable();
      maxCapacityControl?.setValue(100);
      this.showMaxCapacityField = false;
    }
    maxCapacityControl?.updateValueAndValidity();
  }

  loadAllSettings() {
    this.isLoading = true;

    this.httpService.getAllSettingsByType('ORDER').subscribe({
      next: (settings) => {
        this.orderSettings = settings;
        this.populateOrderForm(settings);
      },
      error: (error) => {
        console.error('Error loading order settings:', error);
        this.showError('Impossible de charger les paramètres de commande');
      }
    });

    this.httpService.getAllSettingsByType('TRIP').subscribe({
      next: (settings) => {
        this.tripSettings = settings;
        this.populateTripForm(settings);
      },
      error: (error) => {
        console.error('Error loading trip settings:', error);
        this.showError('Impossible de charger les paramètres de voyage');
      }
    });

    // Load company logo
    this.loadCompanyLogo();

    this.loadEmployeeCategories();
    this.loadGeographicalLevels();
  }

  loadCompanyLogo() {
    this.httpService.getAllSettingsByType('COMPANY').subscribe({
      next: (settings) => {
        const companyRecord = settings.find(s => 
          s.parameterCode === 'COMPANY_LOGO'
        );
        
        if (companyRecord?.logoBase64) {
          this.companyLogoPreview = companyRecord.logoBase64;
          this.hasCompanyLogo = true;
        } else {
          this.companyLogoPreview = null;
          this.hasCompanyLogo = false;
        }
      },
      error: (error) => {
        console.error('Error loading company logo:', error);
      }
    });
  }

  loadEmployeeCategories(): void {
    this.loadingCategories = true;

    this.httpService.getAllSettingsByType('EMPLOYEE_CATEGORY').subscribe({
      next: (categories) => {
        this.employeeCategories = categories;
        this.loadingCategories = false;
      },
      error: (error) => {
        console.error('Error loading employee categories:', error);
        this.loadingCategories = false;
        this.showError('Impossible de charger les catégories d\'employés');
      }
    });
  }

  loadGeographicalLevels() {
    this.httpService.getGeographicalLevels().subscribe({
      next: (levels) => {
        this.geographicalLevels = levels;
        this.populateGeographicalLevelsForm(levels);
        this.loadGeographicalEntities();
      },
      error: (error) => {
        console.error('Error loading geographical levels:', error);
        this.geographicalLevels = [];
        this.populateGeographicalLevelsForm([]);
        this.isLoading = false;
      }
    });
  }

  loadGeographicalEntities() {
    this.loadingEntities = true;

    this.httpService.getGeographicalEntities().subscribe({
      next: (entities) => {
        this.geographicalEntities = entities;
        this.filterEntities('all');
        this.loadingEntities = false;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading geographical entities:', error);
        this.geographicalEntities = [];
        this.filteredEntities = [];
        this.loadingEntities = false;
        this.isLoading = false;
      }
    });
  }

  filterEntities(levelId: string | number | null) {
    if (!levelId || levelId === 'all') {
      this.filteredEntities = [...this.geographicalEntities];
    } else {
      this.filteredEntities = this.geographicalEntities.filter(e => e.levelId === Number(levelId));
    }
  }

  populateOrderForm(settings: IGeneralSettings[]) {
    const formValues: any = {};

    settings.forEach(setting => {
      const [key, value] = this.parseParameterCode(setting.parameterCode);
      const controlName = this.orderControlMap[key];

      if (controlName && this.orderSettingsForm.contains(controlName)) {
        formValues[controlName] = this.parseSettingValue(value);
      }
    });

    this.orderSettingsForm.patchValue(formValues);
  }

  populateTripForm(settings: IGeneralSettings[]) {
    const formValues: any = {};

    settings.forEach(setting => {
      const [key, value] = this.parseParameterCode(setting.parameterCode);
      const controlName = this.tripControlMap[key];

      if (controlName && this.tripSettingsForm.contains(controlName)) {
        formValues[controlName] = this.parseSettingValue(value);
      }
    });

    this.tripSettingsForm.patchValue(formValues);
    
    const allowExceed = formValues['ALLOW_EXCEED_MAX_CAPACITY'];
    if (allowExceed !== undefined) {
      setTimeout(() => this.onAllowExceedChange(allowExceed));
    }
  }

  populateGeographicalLevelsForm(levels: IGeographicalLevel[]) {
    const levelsArray = this.geographicalLevelsForm.get('levels') as FormArray;
    levelsArray.clear();

    levels.forEach(level => {
      const levelGroup = this.fb.group({
        id: [level.id],
        name: [level.name, Validators.required],
        levelNumber: [level.levelNumber, [Validators.required, Validators.min(1), Validators.max(5)]],
        isMappable: [level.isMappable],
        isActive: [level.isActive]
      });
      levelsArray.push(levelGroup);
    });
  }

  parseParameterCode(parameterCode: string): [string, string] {
    const parts = parameterCode.split('=');
    if (parts.length === 2) {
      return [parts[0], parts[1]];
    }
    return [parameterCode, ''];
  }

  extractCode(parameterCode: string): string {
    return parameterCode.split('=')[0];
  }

  extractValue(parameterCode: string): string {
    const parts = parameterCode.split('=');
    return parts.length === 2 ? parts[1] : '';
  }

  parseSettingValue(value: string): any {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    const num = Number(value);
    if (!isNaN(num)) return num;
    return value;
  }

  formatSettingValue(value: any): string {
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return value.toString();
    return value;
  }

  // Logo upload methods
  onCompanyFileSelected(event: any) {
    const file: File = event.target.files[0];

    if (!file) return;

    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      this.companyFileError = `Type de fichier non autorisé. Types acceptés: ${allowedExtensions.join(', ')}`;
      return;
    }

    const maxSize = 1024 * 1024; // 1MB
    if (file.size > maxSize) {
      this.companyFileError = 'La taille du fichier dépasse 1 MB. Veuillez choisir un fichier plus petit.';
      return;
    }

    this.companyFileError = null;

    const reader = new FileReader();
    reader.onload = (e) => {
      this.companyLogoPreview = e.target?.result as string;
      this.hasCompanyLogo = true;
    };
    reader.readAsDataURL(file);
  }

  triggerCompanyFileInput() {
    this.companyFileInput.nativeElement.click();
  }

removeCompanyLogo() {
  if (this.hasCompanyLogo) {
    Swal.fire({
      title: 'Êtes-vous sûr?',
      text: 'Voulez-vous vraiment supprimer le logo de l\'entreprise?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer!',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.isSavingLogo = true;
        
        this.httpService.getAllSettingsByType('COMPANY').subscribe({
          next: (settings) => {
            const companyRecord = settings.find(s => 
              s.parameterCode === 'COMPANY_LOGO'
            );
            
            if (companyRecord) {
        
              const updateDto: any = {
                id: companyRecord.id, 
                parameterType: 'COMPANY',
                parameterCode: 'COMPANY_LOGO',
                description: 'Company logo',
                logoBase64: null
              };
              
              this.httpService.updateGeneralSettings(companyRecord.id, updateDto).subscribe({
                next: () => {
                  this.isSavingLogo = false;
                  this.companyLogoPreview = null;
                  this.hasCompanyLogo = false;
                  this.companyFileError = null;
                  if (this.companyFileInput) {
                    this.companyFileInput.nativeElement.value = '';
                  }
                  Swal.fire({
                    icon: 'success',
                    title: 'Succès',
                    text: 'Logo supprimé avec succès',
                    timer: 2000,
                    showConfirmButton: false
                  });
                },
                error: (error) => {
                  this.isSavingLogo = false;
                  this.handleError(error);
                }
              });
            } else {
              this.isSavingLogo = false;
              this.showWarning('Aucun logo à supprimer');
            }
          },
          error: (error) => {
            this.isSavingLogo = false;
            this.handleError(error);
          }
        });
      }
    });
  } else {
    // Just clear the preview if it's a new upload (not saved yet)
    this.companyLogoPreview = null;
    this.companyFileError = null;
    this.hasCompanyLogo = false;
    
    if (this.companyFileInput) {
      this.companyFileInput.nativeElement.value = '';
    }
  }
}
  saveCompanyLogo() {
    if (!this.companyLogoPreview) {
      this.showWarning('Veuillez sélectionner un logo à enregistrer');
      return;
    }

    this.isSavingLogo = true;

    this.httpService.getAllSettingsByType('COMPANY').subscribe({
      next: (settings) => {
        // Find existing company record
        let companyRecord = settings.find(s => 
          s.parameterCode === 'COMPANY_LOGO'
        );

        const companyDto: any = {
          parameterType: 'COMPANY',
          parameterCode: 'COMPANY_LOGO',
          description: 'Company logo',
          logoBase64: this.companyLogoPreview
        };

        const request = companyRecord
          ? this.httpService.updateGeneralSettings(companyRecord.id, companyDto)
          : this.httpService.addGeneralSettings(companyDto);

        request.subscribe({
          next: () => {
            this.isSavingLogo = false;
            this.showSuccess('Logo enregistré avec succès');
            this.loadCompanyLogo();
          },
          error: (error) => {
            this.isSavingLogo = false;
            this.handleError(error);
          }
        });
      },
      error: (error) => {
        this.isSavingLogo = false;
        this.handleError(error);
      }
    });
  }

  // Save methods
  saveOrderSettings() {
    if (this.orderSettingsForm.invalid) {
      this.showError('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    this.isSaving = true;
    const formValue = this.orderSettingsForm.value;
    const updates: IGeneralSettings[] = [];

    Object.keys(formValue).forEach(key => {
      const parameterCode = Object.keys(this.orderControlMap).find(
        code => this.orderControlMap[code] === key
      );

      if (!parameterCode) return;

      const value = this.formatSettingValue(formValue[key]);
      const fullParameterCode = `${parameterCode}=${value}`;

      const existing = this.orderSettings.find(s =>
        s.parameterCode.startsWith(parameterCode + '=')
      );

      if (existing) {
        updates.push({
          ...existing,
          parameterCode: fullParameterCode
        });
      } else {
        updates.push({
          id: 0,
          parameterType: 'ORDER',
          parameterCode: fullParameterCode,
          description: this.getDescriptionForKey(key)
        });
      }
    });

    this.saveSettings(updates, 'Paramètres de commande enregistrés avec succès');
  }

  saveTripSettings() {
    if (this.tripSettingsForm.invalid) {
      this.showError('Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    this.isSaving = true;
    const formValue = this.tripSettingsForm.value;
    const updates: IGeneralSettings[] = [];

    Object.keys(formValue).forEach(key => {
      const parameterCode = Object.keys(this.tripControlMap).find(
        code => this.tripControlMap[code] === key
      );

      if (!parameterCode) return;

      const value = this.formatSettingValue(formValue[key]);
      const fullParameterCode = `${parameterCode}=${value}`;

      const existing = this.tripSettings.find(s =>
        s.parameterCode.startsWith(parameterCode + '=')
      );

      if (existing) {
        updates.push({
          ...existing,
          parameterCode: fullParameterCode
        });
      } else {
        updates.push({
          id: 0,
          parameterType: 'TRIP',
          parameterCode: fullParameterCode,
          description: this.getDescriptionForKey(key)
        });
      }
    });

    this.saveSettings(updates, 'Paramètres de voyage enregistrés avec succès');
  }

saveSettings(updates: IGeneralSettings[], successMessage: string) {
  const updatePromises = updates.map(setting => {
    // For new records, don't include id field or set it to undefined
    if (!setting.id || setting.id === 0) {
      // Create a new object without the id field
      const { id, ...newSetting } = setting;
      return this.httpService.addGeneralSettings(newSetting).toPromise();
    } else {
      // For existing records, update with the full object including id
      return this.httpService.updateGeneralSettings(setting.id, setting).toPromise();
    }
  });

  Promise.all(updatePromises)
    .then(() => {
      this.showSuccess(successMessage);
      this.loadAllSettings();
    })
    .catch((error) => {
      console.error('Error saving settings:', error);
      this.showError('Erreur lors de l\'enregistrement');
    })
    .finally(() => {
      this.isSaving = false;
    });
}

  saveGeographicalLevels() {
    if (this.geographicalLevelsForm.invalid) {
      this.showError('Veuillez remplir tous les champs requis');
      return;
    }

    this.isSavingGeographical = true;
    const levels = this.geographicalLevelsForm.value.levels;

    this.httpService.updateGeographicalLevels(levels).subscribe({
      next: () => {
        this.showSuccess('Niveaux géographiques enregistrés avec succès');
        this.loadGeographicalLevels();
      },
      error: (error) => {
        console.error('Error saving geographical levels:', error);
        this.showError('Erreur lors de l\'enregistrement des niveaux géographiques');
      },
      complete: () => {
        this.isSavingGeographical = false;
      }
    });
  }

  getDescriptionForKey(key: string): string {
    const descriptions: { [key: string]: string } = {
      'ALLOW_EDIT_ORDER': 'Allow editing orders',
      'ALLOW_DELIVERY_DATE_EDIT': 'Allow editing delivery date',
      'ALLOW_LOAD_LATE_ORDERS': 'Allow loading late orders',
      'ACCEPT_ORDERS_WITHOUT_ADDRESS': 'Accept orders without address',
      'LOADING_UNIT': 'Default loading unit',
      'PLANNING_HORIZON': 'Planning horizon in days',
      'ALLOW_EDIT_TRIPS': 'Allow editing trips',
      'ALLOW_DELETE_TRIPS': 'Allow deleting trips',
      'EDIT_TIME_LIMIT': 'Edit limit in minutes',
      'MAX_TRIPS_PER_DAY': 'Maximum trips per day',
      'TRIP_ORDER': 'Trip ordering method',
      'REQUIRE_DELETE_CONFIRMATION': 'Require delete confirmation',
      'NOTIFY_ON_TRIP_EDIT': 'Notify when trip edited',
      'NOTIFY_ON_TRIP_DELETE': 'Notify when trip deleted',
      'LINK_DRIVER_TO_TRUCK': 'Driver must match truck',
      'ALLOW_EXCEED_MAX_CAPACITY': 'Allow exceeding max capacity',
      'MAX_CAPACITY_PERCENTAGE': 'Maximum capacity percentage'
    };
    return descriptions[key] || key;
  }

  // Dialog methods
  openAddParameterDialog(): void {
    const dialogRef = this.dialog.open(GeneralSettingsForm, {
      width: '600px',
      maxWidth: '95vw',
      panelClass: 'settings-form-dialog',
      disableClose: true,
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadAllSettings();
        this.showSuccess('Catégorie ajoutée avec succès');
      }
    });
  }

  openEditParameterDialog(parameter: IGeneralSettings): void {
    const dialogRef = this.dialog.open(GeneralSettingsForm, {
      width: '600px',
      maxWidth: '95vw',
      panelClass: 'settings-form-dialog',
      disableClose: true,
      data: { parameterId: parameter.id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadAllSettings();
        this.showSuccess('Catégorie modifiée avec succès');
      }
    });
  }

  deleteParameter(parameter: IGeneralSettings): void {
    Swal.fire({
      title: 'Êtes-vous sûr?',
      text: `Voulez-vous vraiment supprimer la catégorie "${this.extractCode(parameter.parameterCode)}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer!',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.httpService.deleteGeneralSettings(parameter.id).subscribe({
          next: () => {
            this.showSuccess('Catégorie supprimée avec succès');
            this.loadAllSettings();
          },
          error: (error) => {
            console.error('Error deleting parameter:', error);
            this.showError('Erreur lors de la suppression');
          }
        });
      }
    });
  }

  openAddEntityDialog(): void {
    if (this.geographicalLevels.length === 0) {
      this.showWarning('Veuillez d\'abord créer des niveaux géographiques');
      return;
    }

    const dialogRef = this.dialog.open(GeographicalEntityForm, {
      width: '600px',
      maxWidth: '95vw',
      panelClass: 'settings-form-dialog',
      disableClose: true,
      data: {
        levels: this.geographicalLevels,
        entities: this.geographicalEntities
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadGeographicalEntities();
        this.showSuccess('Entité géographique ajoutée avec succès');
      }
    });
  }

  openEditEntityDialog(entity: IGeographicalEntity): void {
    const dialogRef = this.dialog.open(GeographicalEntityForm, {
      width: '600px',
      maxWidth: '95vw',
      panelClass: 'settings-form-dialog',
      disableClose: true,
      data: {
        entityId: entity.id,
        levels: this.geographicalLevels,
        entities: this.geographicalEntities
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadGeographicalEntities();
        this.showSuccess('Entité géographique modifiée avec succès');
      }
    });
  }

  deleteEntity(entity: IGeographicalEntity): void {
    Swal.fire({
      title: 'Êtes-vous sûr?',
      text: `Voulez-vous vraiment supprimer l'entité "${entity.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer!',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.httpService.deleteGeographicalEntity(entity.id!).subscribe({
          next: () => {
            this.showSuccess('Entité supprimée avec succès');
            this.loadGeographicalEntities();
          },
          error: (error) => {
            console.error('Error deleting entity:', error);
            this.showError('Erreur lors de la suppression');
          }
        });
      }
    });
  }

  // Helper methods
  getLevelName(levelId: number): string {
    const level = this.geographicalLevels.find(l => l.id === levelId);
    return level ? `${level.name} (Niv. ${level.levelNumber})` : 'Inconnu';
  }

  getEntityName(entityId: number): string {
    const entity = this.geographicalEntities.find(e => e.id === entityId);
    return entity ? entity.name : 'Inconnu';
  }

  addGeographicalLevel() {
    const levelsArray = this.geographicalLevelsForm.get('levels') as FormArray;
    const newLevelNumber = levelsArray.length + 1;

    if (newLevelNumber > 5) {
      this.showWarning('Maximum 5 niveaux géographiques autorisés');
      return;
    }

    levelsArray.push(this.fb.group({
      name: ['', Validators.required],
      levelNumber: [newLevelNumber, [Validators.required, Validators.min(1), Validators.max(5)]],
      isMappable: [false],
      isActive: [true]
    }));
  }

  removeGeographicalLevel(index: number) {
    const levelsArray = this.geographicalLevelsForm.get('levels') as FormArray;

    Swal.fire({
      title: 'Êtes-vous sûr?',
      text: 'Voulez-vous vraiment supprimer ce niveau géographique?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer!',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        levelsArray.removeAt(index);
        for (let i = 0; i < levelsArray.length; i++) {
          levelsArray.at(i).get('levelNumber')?.setValue(i + 1);
        }
      }
    });
  }

  // Alert methods
  showSuccess(message: string) {
    Swal.fire({
      icon: 'success',
      title: 'Succès',
      text: message,
      timer: 2000,
      showConfirmButton: false
    });
  }

  showError(message: string) {
    Swal.fire({
      icon: 'error',
      title: 'Erreur',
      text: message,
      confirmButtonText: 'OK'
    });
  }

  showWarning(message: string) {
    Swal.fire({
      icon: 'warning',
      title: 'Attention',
      text: message,
      confirmButtonText: 'OK'
    });
  }

  handleError(error: any) {
    console.error('Error:', error);
    let errorMessage = 'Une erreur est survenue';
    
    if (error.error?.errors) {
      const firstKey = Object.keys(error.error.errors)[0];
      if (firstKey) {
        errorMessage = error.error.errors[firstKey][0];
      }
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    this.showError(errorMessage);
  }

  get geographicalLevelsArray(): FormArray {
    return this.geographicalLevelsForm.get('levels') as FormArray;
  }
}