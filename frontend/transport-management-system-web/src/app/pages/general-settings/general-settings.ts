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
import { LogoService } from '../../services/logo.service';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

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
  showHelp = true; 
  httpService = inject(Http);
  readonly dialog = inject(MatDialog);

  
  orderSettingsForm!: FormGroup;
  tripSettingsForm!: FormGroup;
  geographicalLevelsForm!: FormGroup;


  orderSettings: IGeneralSettings[] = [];
  tripSettings: IGeneralSettings[] = [];
  employeeCategories: IGeneralSettings[] = [];
  geographicalLevels: IGeographicalLevel[] = [];
  geographicalEntities: IGeographicalEntity[] = [];
  filteredEntities: IGeographicalEntity[] = [];
  

  savedUnits: string[] = []; 
  workingUnits: string[] = []; 
  

  unitInputControl = new FormControl('');


  isLoading = false;
  isSaving = false;
  loadingCategories = false;
  loadingEntities = false;
  isSavingGeographical = false;
  isSavingLogo = false;
  isSavingUnits = false;
  isImporting = false;


hasAtLeastOneActiveLevel(): boolean {
  const levelsArray = this.geographicalLevelsForm.get('levels') as FormArray;
  return levelsArray.controls.some(level => level.get('isActive')?.value === true);
}


saveGeographicalLevels() {
  
  if (!this.hasAtLeastOneActiveLevel()) {
    this.showError('Au moins un niveau géographique doit être actif pour pouvoir enregistrer');
    return;
  }
  
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


hasAtLeastOneActiveEntity(): boolean {
  return this.filteredEntities.some(entity => entity.isActive);
}
  entityLevelFilter = new FormControl('all');


  showMaxCapacityField = false;


  employeeColumns: string[] = ['code', 'description', 'value', 'actions'];
  entityColumns: string[] = ['name', 'level', 'parent', 'coordinates', 'status', 'actions'];

 
  @ViewChild('companyFileInput') companyFileInput!: ElementRef;
  @ViewChild('fileInput') fileInput!: ElementRef;
  companyLogoPreview: string | null = null;
  companyFileError: string | null = null;
  hasCompanyLogo = false;
  private logoService = inject(LogoService);

  private orderControlMap: { [key: string]: string } = {
    'ALLOW_EDIT_ORDER': 'ALLOW_EDIT_ORDER',
    'ALLOW_DELIVERY_DATE_EDIT': 'ALLOW_DELIVERY_DATE_EDIT',
    'ALLOW_LOAD_LATE_ORDERS': 'ALLOW_LOAD_LATE_ORDERS',
    'ACCEPT_ORDERS_WITHOUT_ADDRESS': 'ACCEPT_ORDERS_WITHOUT_ADDRESS',
    'LOADING_UNIT': 'LOADING_UNIT',
    'PLANNING_HORIZON': 'PLANNING_HORIZON',
    'ALLOW_MIXING_ORDER_TYPES': 'ALLOW_MIXING_ORDER_TYPES'
  };

  private tripControlMap: { [key: string]: string } = {
    'ALLOW_EDIT_TRIPS': 'ALLOW_EDIT_TRIPS',
    'ALLOW_DELETE_TRIPS': 'ALLOW_DELETE_TRIPS',
    'MAX_TRIPS_PER_DAY': 'MAX_TRIPS_PER_DAY',
    'REQUIRE_DELETE_CONFIRMATION': 'REQUIRE_DELETE_CONFIRMATION',
    'NOTIFY_ON_TRIP_EDIT': 'NOTIFY_ON_TRIP_EDIT',
    'NOTIFY_ON_TRIP_DELETE': 'NOTIFY_ON_TRIP_DELETE',
    'LINK_DRIVER_TO_TRUCK': 'LINK_DRIVER_TO_TRUCK',
    'ALLOW_EXCEED_MAX_CAPACITY': 'ALLOW_EXCEED_MAX_CAPACITY',
    'MAX_CAPACITY_PERCENTAGE': 'MAX_CAPACITY_PERCENTAGE',
    'USE_GPS_IN_TRIPS': 'USE_GPS_IN_TRIPS',
    'MODE_ADRESSE_TRIP': 'MODE_ADRESSE_TRIP',
  };

  ngOnInit() {
    this.initForms();
    this.loadAllSettings();
    this.loadUnits();

    this.entityLevelFilter.valueChanges.subscribe(levelId => {
      this.filterEntities(levelId);
    });
  }

  initForms() {
    this.orderSettingsForm = this.fb.group({
      ALLOW_EDIT_ORDER: [false],
      ALLOW_DELIVERY_DATE_EDIT: [false],
      ALLOW_LOAD_LATE_ORDERS: [false],
      ACCEPT_ORDERS_WITHOUT_ADDRESS: [false],
      LOADING_UNIT: ['', Validators.required],
      PLANNING_HORIZON: [30, [Validators.min(1), Validators.max(365)]],
      ALLOW_MIXING_ORDER_TYPES: [false]
    });

    this.tripSettingsForm = this.fb.group({
      ALLOW_EDIT_TRIPS: [false],
      ALLOW_DELETE_TRIPS: [false],
      MAX_TRIPS_PER_DAY: [10, [Validators.min(1)]],
      REQUIRE_DELETE_CONFIRMATION: [true],
      NOTIFY_ON_TRIP_EDIT: [false],
      NOTIFY_ON_TRIP_DELETE: [false],
      LINK_DRIVER_TO_TRUCK: [false],
      USE_GPS_IN_TRIPS: [true], // ✅ Checked by default
      ALLOW_EXCEED_MAX_CAPACITY: [false],
      MAX_CAPACITY_PERCENTAGE: [{ value: 100, disabled: true }, [Validators.min(1), Validators.max(200)]],
      MODE_ADRESSE_TRIP: ['MANUEL'], // ✅ Default to MANUAL mode
    });

    this.geographicalLevelsForm = this.fb.group({
      levels: this.fb.array([])
    });

    this.tripSettingsForm.get('ALLOW_EXCEED_MAX_CAPACITY')?.valueChanges.subscribe(value => {
      this.onAllowExceedChange(value);
    });
  }

 
  loadUnits() {
    this.httpService.getAllSettingsByType('UNITS').subscribe({
      next: (settings) => {
        const unitSettings = settings.find(s => s.parameterType === 'UNITS');
        
        if (unitSettings) {
          try {
            const parameterCode = unitSettings.parameterCode;
            
            if (parameterCode.startsWith('AVAILABLE_UNITS=')) {
              const unitsJson = parameterCode.substring('AVAILABLE_UNITS='.length);
              
              if (unitsJson === '[]') {
                this.savedUnits = [];
                this.workingUnits = [];
              } else {
                try {
                  const units = JSON.parse(unitsJson);
                  if (Array.isArray(units)) {
                    this.savedUnits = units;
                    this.workingUnits = [...units]; 
                  } else {
                    this.savedUnits = [];
                    this.workingUnits = [];
                  }
                } catch (e) {
                  console.error('Error parsing units JSON:', e);
                  this.savedUnits = [];
                  this.workingUnits = [];
                }
              }
            } else {
              this.savedUnits = [];
              this.workingUnits = [];
            }
          } catch (e) {
            console.error('Error processing unit settings:', e);
            this.savedUnits = [];
            this.workingUnits = [];
          }
        } else {
          this.savedUnits = [];
          this.workingUnits = [];
        }
      },
      error: (error) => {
        console.error('Error loading units:', error);
        this.savedUnits = [];
        this.workingUnits = [];
      }
    });
  }

  
  addUnit(): void {
    const value = this.unitInputControl.value?.trim() || '';
    
    if (value && value.length > 0) {
     
      if (this.workingUnits.includes(value)) {
        this.showWarning(`L'unité "${value}" existe déjà`);
      } else {
  
        this.workingUnits.push(value);
        console.log('Unit added to working:', this.workingUnits);
      }
    }
    
   
    this.unitInputControl.setValue('');
  }

 
  removeUnit(unit: string): void {
    const index = this.workingUnits.indexOf(unit);
    if (index >= 0) {
      this.workingUnits.splice(index, 1);
      console.log('Unit removed from working:', this.workingUnits);
      
   
      const loadingUnitControl = this.orderSettingsForm.get('LOADING_UNIT');
      if (loadingUnitControl && loadingUnitControl.value === unit) {
        if (this.workingUnits.length > 0) {
          loadingUnitControl.setValue(this.workingUnits[0]);
        } else {
          loadingUnitControl.setValue('');
        }
      }
    }
  }

 
  cancelUnits() {
    this.workingUnits = [...this.savedUnits];
    this.showTemporarySuccess('Modifications annulées');
  }

 
  saveUnits() {
    if (this.workingUnits.length === 0) {
      this.showWarning('Ajoutez au moins une unité avant d\'enregistrer');
      return;
    }
    
    this.isSavingUnits = true;
    
    const unitsJson = JSON.stringify(this.workingUnits);
    const parameterCode = `AVAILABLE_UNITS=${unitsJson}`;
    
    this.httpService.getAllSettingsByType('UNITS').subscribe({
      next: (settings) => {
        const existingUnitSetting = settings.find(s => s.parameterType === 'UNITS');
        
        if (existingUnitSetting) {
          const updatePayload: any = {
            id: existingUnitSetting.id,
            parameterType: 'UNITS',
            parameterCode: parameterCode,
            description: 'Available units for loading and capacity'
          };
          
          this.httpService.updateGeneralSettings(existingUnitSetting.id, updatePayload).subscribe({
            next: (response) => {
              this.isSavingUnits = false;
            
              this.savedUnits = [...this.workingUnits];
              this.showSuccess('Unités enregistrées avec succès');
            },
            error: (error) => {
              this.isSavingUnits = false;
              this.handleError(error);
            }
          });
        } else {
          const createPayload: any = {
            parameterType: 'UNITS',
            parameterCode: parameterCode,
            description: 'Available units for loading and capacity'
          };
          
          this.httpService.addGeneralSettings(createPayload).subscribe({
            next: (response) => {
              this.isSavingUnits = false;
             
              this.savedUnits = [...this.workingUnits];
              this.showSuccess('Unités enregistrées avec succès');
            },
            error: (error) => {
              this.isSavingUnits = false;
              this.handleError(error);
            }
          });
        }
      },
      error: (error) => {
        this.isSavingUnits = false;
        this.handleError(error);
      }
    });
  }

 
  hasUnsavedChanges(): boolean {
    return JSON.stringify(this.savedUnits) !== JSON.stringify(this.workingUnits);
  }

  onAllowExceedChange(allowExceed: boolean) {
    const maxCapacityControl = this.tripSettingsForm.get('MAX_CAPACITY_PERCENTAGE');
    
    if (allowExceed) {
      maxCapacityControl?.enable();
      this.showMaxCapacityField = true;
    } else {
      maxCapacityControl?.disable();
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
        if (key === 'LOADING_UNIT') {
          formValues[controlName] = value;
        } else {
          formValues[controlName] = this.parseSettingValue(value);
        }
      }
    });

    this.orderSettingsForm.patchValue(formValues);
  }

  populateTripForm(settings: IGeneralSettings[]) {
    const formValues: any = {};

    settings.forEach(setting => {
      const [key, value] = this.parseParameterCode(setting.parameterCode);

      switch(key) {
        case 'ALLOW_EXCEED_MAX_CAPACITY':
          formValues.ALLOW_EXCEED_MAX_CAPACITY = this.parseSettingValue(value);
          break;
        
        case 'MAX_CAPACITY_PERCENTAGE':
          formValues.MAX_CAPACITY_PERCENTAGE = this.parseSettingValue(value);
          break;
        
        default:
          const controlName = this.tripControlMap[key];
          if (controlName && this.tripSettingsForm.contains(controlName)) {
            formValues[controlName] = this.parseSettingValue(value);
          }
          break;
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
    if (value === null || value === undefined) {
      return '';
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    return value.toString();
  }

 
  onCompanyFileSelected(event: any) {
    const file: File = event.target.files[0];

    if (!file) return;

    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      this.companyFileError = `Type de fichier non autorisé. Types acceptés: ${allowedExtensions.join(', ')}`;
      return;
    }

    const maxSize = 1024 * 1024;
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
               this.logoService.refresh();
            },
            error: (error) => {
              this.isSavingLogo = false;
              this.handleError(error);
            }
          });
        }
      });
    } else {
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
            this.logoService.refresh();
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
      if (!setting.id || setting.id === 0) {
        const { id, ...newSetting } = setting;
        console.log(setting)
        return this.httpService.addGeneralSettings(newSetting).toPromise();
      } else {
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
      'MAX_CAPACITY_PERCENTAGE': 'Maximum capacity percentage',
      'USE_GPS_IN_TRIPS': 'Use GPS in trips (auto coordinates)',
      'MODE_ADRESSE_TRIP': 'Mode de gestion des destinations (MANUEL/AUTOMATIQUE)'
    };
    return descriptions[key] || key;
  }


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


  exportCategoriesToExcel() {
    if (this.employeeCategories.length === 0) {
      this.showWarning('Aucune catégorie à exporter');
      return;
    }

    try {
     
      const exportData = this.employeeCategories.map(category => ({
        'Code': this.extractCode(category.parameterCode),
        'Description': category.description,
        'Valeur': this.extractValue(category.parameterCode),
        'ID': category.id,
        'Type': category.parameterType
      }));

      
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
     
      worksheet['!cols'] = [
        { wch: 25 }, // Code
        { wch: 40 }, // Description
        { wch: 20 }, // Valeur
        { wch: 10 }, // ID
        { wch: 20 }  // Type
      ];

      // Créer un classeur
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Categories_Employes');

      // Générer le fichier Excel
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      
      // Sauvegarder le fichier avec la date
      const fileName = `categories_employes_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), fileName);
      
      this.showSuccess('Export réussi');
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      this.showError('Erreur lors de l\'export des données');
    }
  }

  /**
   * Télécharge un modèle Excel vide pour les catégories d'employés
   */
  downloadEmptyTemplate() {
    try {
      // Créer un modèle vide avec seulement les en-têtes
      const templateData = [
        {
          'Code': '',
          'Description': '',
          'Valeur': ''
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateData);
      
      // Définir la largeur des colonnes
      worksheet['!cols'] = [
        { wch: 25 }, // Code
        { wch: 40 }, // Description
        { wch: 20 }  // Valeur
      ];

      // Ajouter une feuille d'instructions
      const instructions = [
        ['📋 INSTRUCTIONS D\'UTILISATION DU MODÈLE'],
        [''],
        ['1. Colonne "Code" :', 'Code unique de la catégorie (ex: INGENIEUR, CHAUFFEUR, MANUTENTIONNAIRE)'],
        ['   - Utilisez des majuscules, chiffres et underscores uniquement'],
        ['   - Maximum 50 caractères'],
        ['   - Doit être unique dans le système'],
        [''],
        ['2. Colonne "Description" :', 'Description complète de la catégorie'],
        ['   - Exemple: "Ingénieur en logistique", "Chauffeur poids lourd"'],
        ['   - Maximum 255 caractères'],
        [''],
        ['3. Colonne "Valeur" :', 'Code court ou abréviation (ex: ING, CHF, MAN)'],
        ['   - Utilisez des majuscules, chiffres et underscores uniquement'],
        ['   - Maximum 50 caractères'],
        [''],
        ['⚠️ RÈGLES IMPORTANTES :'],
        ['• Tous les champs sont obligatoires'],
        ['• Ne modifiez pas les noms des colonnes'],
        ['• Supprimez la ligne d\'exemple avant de remplir vos données'],
        ['• Le système créera automatiquement les catégories avec le format: Code=Valeur'],
        [''],
        ['📝 EXEMPLE DE DONNÉES VALIDES :'],
        ['Code           | Description                    | Valeur'],
        ['INGENIEUR      | Ingénieur en logistique        | ING'],
        ['CHAUFFEUR      | Chauffeur poids lourd          | CHF'],
        ['MANUTENTIONNAIRE| Agent de manutention           | MAN'],
        ['SUPERVISEUR    | Superviseur d\'exploitation     | SUP'],
        [''],
        ['✅ APRÈS REMPLISSAGE :'],
        ['1. Sauvegardez votre fichier'],
        ['2. Cliquez sur "Importer" dans l\'application'],
        ['3. Sélectionnez votre fichier rempli'],
        ['4. Confirmez l\'importation']
      ];
      
      const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
      
      // Ajuster la largeur des colonnes pour les instructions
      instructionsSheet['!cols'] = [
        { wch: 25 },
        { wch: 60 }
      ];

      // Créer le classeur avec deux feuilles
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Modele_Categories');
      XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
      
      // Générer et sauvegarder le fichier
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), 'modele_categories_employes_vide.xlsx');
      
      this.showSuccess('Modèle téléchargé avec succès');
    } catch (error) {
      console.error('Erreur lors du téléchargement du modèle:', error);
      this.showError('Erreur lors du téléchargement du modèle');
    }
  }

  /**
   * Déclenche le sélecteur de fichier pour l'import
   */
  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  /**
   * Gère la sélection du fichier pour l'import
   */
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;

    // Vérifier l'extension du fichier
    const allowedExtensions = ['xlsx', 'xls', 'csv'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      this.showError('Format de fichier non supporté. Utilisez .xlsx, .xls ou .csv');
      this.clearFileInput();
      return;
    }

    this.isImporting = true;
    
    // Afficher une notification de chargement
    Swal.fire({
      title: 'Import en cours...',
      text: 'Veuillez patienter pendant le traitement du fichier',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    const reader = new FileReader();
    
    reader.onload = (e: any) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        Swal.close();
        
        if (jsonData.length === 0) {
          this.showWarning('Le fichier est vide');
          this.isImporting = false;
          this.clearFileInput();
          return;
        }
        
        // Filtrer les lignes vides
        const validData = jsonData.filter((row: any) => {
          const code = row['Code']?.trim();
          const description = row['Description']?.trim();
          const value = row['Valeur']?.trim();
          return code && description && value;
        });
        
        if (validData.length === 0) {
          this.showWarning('Aucune donnée valide trouvée dans le fichier');
          this.isImporting = false;
          this.clearFileInput();
          return;
        }
        
        // Valider et importer les données
        this.importCategoriesFromData(validData);
      } catch (error) {
        console.error('Erreur lors de la lecture du fichier:', error);
        Swal.close();
        this.showError('Erreur lors de la lecture du fichier');
        this.isImporting = false;
        this.clearFileInput();
      }
    };
    
    reader.onerror = () => {
      Swal.close();
      this.showError('Erreur lors de la lecture du fichier');
      this.isImporting = false;
      this.clearFileInput();
    };
    
    reader.readAsArrayBuffer(file);
  }

  /**
   * Importe les catégories à partir des données du fichier
   */
  async importCategoriesFromData(data: any[]) {
    try {
      // Valider les données
      const validation = this.validateImportData(data);
      if (!validation.isValid) {
        this.showError(`Erreur de validation:\n${validation.errors.join('\n')}`);
        this.isImporting = false;
        this.clearFileInput();
        return;
      }

      // Prévisualiser les données à importer
      const previewData = data.slice(0, 5).map((row, index) => ({
        '#': index + 1,
        'Code': row['Code']?.trim().toUpperCase(),
        'Description': row['Description']?.trim(),
        'Valeur': row['Valeur']?.trim().toUpperCase()
      }));

      const previewHtml = `
        <div style="max-height: 400px; overflow: auto;">
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f5f5f5;">
                <th style="padding: 8px; border: 1px solid #ddd;">#</th>
                <th style="padding: 8px; border: 1px solid #ddd;">Code</th>
                <th style="padding: 8px; border: 1px solid #ddd;">Description</th>
                <th style="padding: 8px; border: 1px solid #ddd;">Valeur</th>
               </tr>
            </thead>
            <tbody>
              ${previewData.map(item => `
                 <tr>
                  <td style="padding: 8px; border: 1px solid #ddd;">${item['#']}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;"><strong>${item['Code']}</strong></td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${item['Description']}</td>
                  <td style="padding: 8px; border: 1px solid #ddd;">${item['Valeur']}</td>
                 </tr>
              `).join('')}
            </tbody>
           </table>
          ${data.length > 5 ? `<p style="margin-top: 10px; text-align: center;">... et ${data.length - 5} autre(s) ligne(s)</p>` : ''}
        </div>
      `;

      // Vérifier les doublons avec les données existantes
      const existingCodes = new Set(this.employeeCategories.map(c => this.extractCode(c.parameterCode)));
      const duplicates = data.filter(row => {
        const code = row['Code']?.trim().toUpperCase();
        return existingCodes.has(code);
      });

      let warningMessage = '';
      if (duplicates.length > 0) {
        warningMessage = `
          <p style="margin-top: 10px; color: #f59e0b;">
            <strong>⚠️ Attention:</strong> ${duplicates.length} catégorie(s) existent déjà dans le système.
            Ces catégories ne seront pas importées pour éviter les doublons.
          </p>
          <p style="color: #f59e0b; font-size: 12px;">
            Codes existants: ${duplicates.map(d => d['Code']).join(', ')}
          </p>
        `;
      }

      // Demander confirmation avec aperçu
      const result = await Swal.fire({
        title: 'Confirmation d\'import',
        html: `
          <div style="text-align: left;">
            <p>Vous allez importer <strong>${data.length}</strong> nouvelle(s) catégorie(s) d'employés.</p>
            ${warningMessage}
            <p style="margin-top: 10px;"><strong>Aperçu des données:</strong></p>
            ${previewHtml}
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Oui, importer',
        cancelButtonText: 'Annuler',
        width: '800px'
      });

      if (!result.isConfirmed) {
        this.isImporting = false;
        this.clearFileInput();
        return;
      }

      // Afficher la progression
      Swal.fire({
        title: 'Import en cours...',
        html: 'Veuillez patienter pendant l\'importation des données',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Filtrer les doublons pour ne garder que les nouvelles catégories
      const newCategories = data.filter(row => {
        const code = row['Code']?.trim().toUpperCase();
        return !existingCodes.has(code);
      });

      // Préparer et importer les nouvelles catégories
      const categoriesToImport = this.prepareCategoriesForImport(newCategories);
      
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const category of categoriesToImport) {
        try {
          // Créer le paramètre avec le format Code=Valeur (sans le =true)
          const categoryData: any = {
            parameterType: 'EMPLOYEE_CATEGORY',
            parameterCode: `${category.code}=${category.value}`,
            description: category.description
          };

          await this.httpService.addGeneralSettings(categoryData).toPromise();
          successCount++;
        } catch (error) {
          errorCount++;
          errors.push(`${category.code}: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
          console.error(`Erreur lors de l'import de ${category.code}:`, error);
        }
      }

      Swal.close();

      // Afficher le résultat détaillé
      if (successCount > 0) {
        let resultMessage = `✅ ${successCount} catégorie(s) importée(s) avec succès`;
        if (duplicates.length > 0) {
          resultMessage += `\n⚠️ ${duplicates.length} doublon(s) ignoré(s)`;
        }
        if (errorCount > 0) {
          resultMessage += `\n❌ ${errorCount} erreur(s)`;
        }
        this.showSuccess(resultMessage);
        this.loadEmployeeCategories(); // Recharger les données
      } else {
        if (duplicates.length > 0) {
          this.showWarning(`${duplicates.length} doublon(s) trouvé(s). Aucune nouvelle catégorie à importer.`);
        } else {
          this.showError('Aucune catégorie n\'a pu être importée');
        }
      }

      if (errors.length > 0 && errors.length <= 5) {
        setTimeout(() => {
          Swal.fire({
            title: 'Détails des erreurs',
            html: `<div style="text-align: left;">${errors.map(e => `• ${e}`).join('<br>')}</div>`,
            icon: 'warning',
            confirmButtonText: 'OK'
          });
        }, 500);
      }
    } catch (error) {
      console.error('Erreur lors de l\'import:', error);
      Swal.close();
      this.showError('Erreur lors de l\'import des données');
    } finally {
      this.isImporting = false;
      this.clearFileInput();
    }
  }

  /**
   * Valide les données d'import
   */
  validateImportData(data: any[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const requiredColumns = ['Code', 'Description', 'Valeur'];
    const codesSet = new Set<string>();
    
    if (data.length === 0) {
      errors.push('Le fichier est vide');
      return { isValid: false, errors };
    }

    // Vérifier les colonnes requises
    const firstRow = data[0];
    const missingColumns = requiredColumns.filter(col => !firstRow.hasOwnProperty(col));
    
    if (missingColumns.length > 0) {
      errors.push(`Colonnes manquantes: ${missingColumns.join(', ')}`);
      return { isValid: false, errors };
    }

    // Valider chaque ligne
    data.forEach((row, index) => {
      const code = row['Code']?.trim();
      const description = row['Description']?.trim();
      const value = row['Valeur']?.trim();
      const lineNum = index + 1;

      // Validation du code
      if (!code) {
        errors.push(`Ligne ${lineNum}: Code requis`);
      } else {
        if (code.length > 50) {
          errors.push(`Ligne ${lineNum}: Code trop long (max 50 caractères)`);
        }
        if (!/^[A-Z0-9_]+$/i.test(code)) {
          errors.push(`Ligne ${lineNum}: Code doit contenir uniquement des lettres, chiffres et underscores`);
        }
        if (codesSet.has(code.toUpperCase())) {
          errors.push(`Ligne ${lineNum}: Code dupliqué "${code}" dans le fichier`);
        }
        codesSet.add(code.toUpperCase());
      }

      // Validation de la description
      if (!description) {
        errors.push(`Ligne ${lineNum}: Description requise`);
      } else if (description.length > 255) {
        errors.push(`Ligne ${lineNum}: Description trop longue (max 255 caractères)`);
      }

      // Validation de la valeur
      if (!value) {
        errors.push(`Ligne ${lineNum}: Valeur requise`);
      } else if (value.length > 50) {
        errors.push(`Ligne ${lineNum}: Valeur trop longue (max 50 caractères)`);
      } else if (!/^[A-Z0-9_]+$/i.test(value)) {
        errors.push(`Ligne ${lineNum}: Valeur doit contenir uniquement des lettres, chiffres et underscores`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors: errors.slice(0, 20)
    };
  }

  /**
   * Prépare les catégories pour l'import
   */
  prepareCategoriesForImport(data: any[]): Array<{code: string, description: string, value: string}> {
    return data.map(row => ({
      code: row['Code'].trim().toUpperCase(),
      description: row['Description'].trim(),
      value: row['Valeur'].trim().toUpperCase()
    }));
  }

  /**
   * Nettoie l'input file
   */
  clearFileInput() {
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  // ==================== FIN MÉTHODES D'IMPORT/EXPORT ====================

  /**
   * Affiche un message de succès
   */
  showSuccess(message: string) {
    Swal.fire({
      icon: 'success',
      title: 'Succès',
      text: message,
      timer: 3000,
      showConfirmButton: false
    });
  }

  /**
   * Affiche un message de succès temporaire
   */
  showTemporarySuccess(message: string) {
    Swal.fire({
      icon: 'success',
      title: message,
      timer: 1000,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  }

  /**
   * Affiche un message d'erreur
   */
  showError(message: string) {
    Swal.fire({
      icon: 'error',
      title: 'Erreur',
      text: message,
      confirmButtonText: 'OK'
    });
  }

  /**
   * Affiche un message d'avertissement
   */
  showWarning(message: string) {
    Swal.fire({
      icon: 'warning',
      title: 'Attention',
      text: message,
      confirmButtonText: 'OK'
    });
  }

  /**
   * Gère les erreurs HTTP
   */
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

  /**
   * Getter pour le FormArray des niveaux géographiques
   */
  get geographicalLevelsArray(): FormArray {
    return this.geographicalLevelsForm.get('levels') as FormArray;
  }
}