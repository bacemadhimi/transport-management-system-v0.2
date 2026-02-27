import { Component, inject, OnInit } from '@angular/core';
import { Http } from '../../services/http';
import { IGeneralSettings, ParameterType, SearchOptions, IGeographicalLevel } from '../../types/general-settings';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { GeneralSettingsForm } from './general-settings-form/general-settings-form';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { PagedData } from '../../types/paged-data';
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
    MatSlideToggleModule,
    MatExpansionModule,
    MatDividerModule,
    MatIconModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatTooltipModule
  ],
  templateUrl: './general-settings.html',
  styleUrls: ['./general-settings.scss']
})
export class GeneralSettings implements OnInit {
  constructor(public auth: Auth, private fb: FormBuilder) {}

  httpService = inject(Http);
  readonly dialog = inject(MatDialog);

  // Forms
  orderSettingsForm!: FormGroup;
  tripSettingsForm!: FormGroup;
  geographicalLevelsForm!: FormGroup;

  // Data
  orderSettings: IGeneralSettings[] = [];
  tripSettings: IGeneralSettings[] = [];
  geographicalLevels: IGeographicalLevel[] = [];
  allParameters: IGeneralSettings[] = [];
  
  // Table configuration
  displayedColumns: string[] = ['parameterType', 'parameterCode', 'description', 'actions'];
  
  // Available parameter types
  parameterTypes = Object.values(ParameterType);

  // Loading states
  isLoading = false;
  isSaving = false;

  // Options for select inputs
  loadingUnitOptions = ['palette', 'kg', 'tonne', 'm³'];
  tripOrderOptions = ['chronological', 'priority', 'geographical', 'optimized'];

  // Mapping of parameter codes to form control names
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
    'LINK_DRIVER_TO_TRUCK': 'LINK_DRIVER_TO_TRUCK'
  };

  ngOnInit() {
    this.initForms();
    this.loadAllSettings();
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

    // Trip Settings Form
    this.tripSettingsForm = this.fb.group({
      ALLOW_EDIT_TRIPS: [false],
      ALLOW_DELETE_TRIPS: [false],
      EDIT_TIME_LIMIT: [60, [Validators.min(1)]],
      MAX_TRIPS_PER_DAY: [10, [Validators.min(1)]],
      TRIP_ORDER: ['chronological'],
      REQUIRE_DELETE_CONFIRMATION: [true],
      NOTIFY_ON_TRIP_EDIT: [false],
      NOTIFY_ON_TRIP_DELETE: [false],
      LINK_DRIVER_TO_TRUCK: [false]
    });

    // Geographical Levels Form
    this.geographicalLevelsForm = this.fb.group({
      levels: this.fb.array([])
    });
  }

  loadAllSettings() {
    this.isLoading = true;
    
    // Load ORDER settings - get all
    this.httpService.getAllSettingsByType('ORDER').subscribe({
      next: (settings) => {
        this.orderSettings = settings;
        this.populateOrderForm(settings);
        this.updateAllParameters();
      },
      error: (error) => {
        console.error('Error loading order settings:', error);
        this.showError('Impossible de charger les paramètres de commande');
      }
    });

    // Load TRIP settings - get all
    this.httpService.getAllSettingsByType('TRIP').subscribe({
      next: (settings) => {
        this.tripSettings = settings;
        this.populateTripForm(settings);
        this.updateAllParameters();
      },
      error: (error) => {
        console.error('Error loading trip settings:', error);
        this.showError('Impossible de charger les paramètres de voyage');
      }
    });

    // Load Geographical Levels
    this.loadGeographicalLevels();
  }

  updateAllParameters() {
    this.allParameters = [...this.orderSettings, ...this.tripSettings];
  }

  loadGeographicalLevels() {
    this.httpService.getGeographicalLevels().subscribe({
      next: (levels) => {
        this.geographicalLevels = levels;
        this.populateGeographicalLevelsForm(levels);
      },
      error: (error) => {
        console.error('Error loading geographical levels:', error);
        this.showError('Impossible de charger les niveaux géographiques');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  populateOrderForm(settings: IGeneralSettings[]) {
    const formValues: any = {};
    
    settings.forEach(setting => {
      // Parse the ParameterCode which contains "KEY=value"
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
      // Parse the ParameterCode which contains "KEY=value"
      const [key, value] = this.parseParameterCode(setting.parameterCode);
      const controlName = this.tripControlMap[key];
      
      if (controlName && this.tripSettingsForm.contains(controlName)) {
        formValues[controlName] = this.parseSettingValue(value);
      }
    });
    
    this.tripSettingsForm.patchValue(formValues);
  }

  populateGeographicalLevelsForm(levels: IGeographicalLevel[]) {
    // Clear existing controls
    while (this.geographicalLevelsArray.length) {
      this.geographicalLevelsArray.removeAt(0);
    }
    
    // Add new controls
    levels.forEach(level => {
      const levelGroup = this.fb.group({
        id: [level.id || 0],
        name: [level.name, Validators.required],
        levelNumber: [level.levelNumber, [Validators.required, Validators.min(1), Validators.max(5)]],
        isMappable: [level.isMappable || false],
        isActive: [level.isActive !== undefined ? level.isActive : true]
      });
      
      this.geographicalLevelsArray.push(levelGroup);
    });
  }

  parseParameterCode(parameterCode: string): [string, string] {
    const parts = parameterCode.split('=');
    if (parts.length === 2) {
      return [parts[0], parts[1]];
    }
    // Fallback for backward compatibility
    return [parameterCode, parameterCode];
  }

  parseSettingValue(value: string): any {
    // Try to parse as boolean
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
    
    // Try to parse as number
    const num = Number(value);
    if (!isNaN(num)) return num;
    
    // Return as string
    return value;
  }

  formatSettingValue(value: any): string {
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'number') return value.toString();
    return value;
  }

  saveOrderSettings() {
    if (this.orderSettingsForm.invalid) {
      this.showError('Veuillez corriger les erreurs dans le formulaire');
      return;
    }
    
    this.isSaving = true;
    const formValue = this.orderSettingsForm.value;
    const updates: IGeneralSettings[] = [];
    
    // Create or update each setting
    Object.keys(formValue).forEach(key => {
      // Find the parameter code from the control map
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
        // Update existing
        updates.push({
          ...existing,
          parameterCode: fullParameterCode
        });
      } else {
        // Create new
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
      // Find the parameter code from the control map
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

  saveGeographicalLevels() {
    if (this.geographicalLevelsForm.invalid) {
      this.showError('Veuillez remplir tous les champs requis');
      return;
    }
    
    this.isSaving = true;
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
        this.isSaving = false;
      }
    });
  }

  saveSettings(updates: IGeneralSettings[], successMessage: string) {
    // Since your API might not support bulk update, we'll update one by one
    const updatePromises = updates.map(setting => {
      if (setting.id > 0) {
        return this.httpService.updateGeneralSettings(setting.id, setting).toPromise();
      } else {
        return this.httpService.addGeneralSettings(setting).toPromise();
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
      'LINK_DRIVER_TO_TRUCK': 'Driver must match truck'
    };
    return descriptions[key] || key;
  }

  // ========== DIALOG METHODS ==========

  /**
   * Open dialog to add a new parameter
   */
  openAddParameterDialog(): void {
    const dialogRef = this.dialog.open(GeneralSettingsForm, {
      width: '600px',
      maxWidth: '95vw',
      panelClass: 'settings-form-dialog',
      disableClose: true,
      data: {} // Empty data = add mode
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadAllSettings(); // Refresh data
        this.showSuccess('Paramètre ajouté avec succès');
      }
    });
  }

  /**
   * Open dialog to edit an existing parameter
   * @param parameter The parameter to edit
   */
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
        this.loadAllSettings(); // Refresh data
        this.showSuccess('Paramètre mis à jour avec succès');
      }
    });
  }

  /**
   * Delete a parameter with confirmation
   * @param parameter The parameter to delete
   */
  deleteParameter(parameter: IGeneralSettings): void {
    Swal.fire({
      title: 'Êtes-vous sûr?',
      text: `Voulez-vous vraiment supprimer le paramètre "${this.extractCode(parameter.parameterCode)}"?`,
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
            this.showSuccess('Paramètre supprimé avec succès');
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

  /**
   * Extract code from parameterCode (format: "CODE=value")
   */
  extractCode(parameterCode: string): string {
    return parameterCode.split('=')[0];
  }

  /**
   * Extract value from parameterCode (format: "CODE=value")
   */
  extractValue(parameterCode: string): string {
    const parts = parameterCode.split('=');
    return parts.length === 2 ? parts[1] : parameterCode;
  }

  // ========== GEOGRAPHICAL LEVELS METHODS ==========

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
        // Renumber remaining levels
        for (let i = 0; i < levelsArray.length; i++) {
          levelsArray.at(i).get('levelNumber')?.setValue(i + 1);
        }
      }
    });
  }

  // ========== UI HELPER METHODS ==========

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

  // Helper to get form arrays
  get geographicalLevelsArray(): FormArray {
    return this.geographicalLevelsForm.get('levels') as FormArray;
  }
}