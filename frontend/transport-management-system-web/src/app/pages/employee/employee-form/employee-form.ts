import { Component, ElementRef, inject, OnInit, ViewChild, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule, FormGroup, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Http } from '../../../services/http';
import { SettingsService } from '../../../services/settings.service'; 
import { IEmployee } from '../../../types/employee';
import { ITypeTruck } from '../../../types/type-truck';
import { IGeographicalEntity, IGeographicalLevel } from '../../../types/general-settings';
import Swal from 'sweetalert2';
import { Translation } from '../../../services/Translation';
import { Subscription } from 'rxjs';
import { IGeneralSettings } from '../../../types/general-settings'; 

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatIconModule,
    MatSelectModule,
    MatCheckboxModule 
  ],
  templateUrl: './employee-form.html',
  styleUrls: ['./employee-form.scss']
})
export class EmployeeForm implements OnInit, AfterViewInit, OnDestroy {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  settingsService = inject(SettingsService);
  dialogRef = inject(MatDialogRef<EmployeeForm>);
  data = inject<{ employeeId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};
  translation = inject(Translation);
  countryPlaceholder: string = '+216 12 345 678';
  
  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('phoneInput') phoneInput!: ElementRef<HTMLInputElement>;

  private iti: any; // intl-tel-input instance
  private phoneCountry: string = 'tn'; // Default country
  private employeeData: any = null; // Store employee data when editing

  t(key: string): string { return this.translation.t(key); }

  isSubmitting = false;
  selectedFile: File | null = null;
  filePreview: string | null = null;
  fileError: string | null = null;
  originalFileName: string | null = null;
  hasExistingFile = false;
  private subscriptions: Subscription[] = [];
  typeTrucks: ITypeTruck[] = [];
  loadingTypeTrucks = false;

  employeeCategories: IGeneralSettings[] = [];
  loadingCategories = false;
  private cdr = inject(ChangeDetectorRef);
  // Geographical entities
  loadingGeographicalEntities = false;
  geographicalEntities: IGeographicalEntity[] = [];
  geographicalLevels: IGeographicalLevel[] = [];

  // Selected entities
  selectedEntities: number[] = [];

  // Entity hierarchies by level
  level1Entities: IGeographicalEntity[] = [];
  level2Entities: IGeographicalEntity[] = [];
  level3Entities: IGeographicalEntity[] = [];
  level4Entities: IGeographicalEntity[] = [];
  level5Entities: IGeographicalEntity[] = [];

  // Form controls for each level
  level1Control = new FormControl<number | null>(null);
  level2Control = new FormControl<number | null>(null);
  level3Control = new FormControl<number | null>(null);
  level4Control = new FormControl<number | null>(null);
  level5Control = new FormControl<number | null>(null);

  // Map for quick entity lookup
  private entityMap: Map<number, IGeographicalEntity> = new Map();

  // Available categories (filtered to just 3)
  availableCategories = ['DRIVER', 'MECHANIC', 'CONVOYEUR'];

  // Define form type
  employeeForm: FormGroup;

  constructor() {
    // Initialize form with proper typing
    this.employeeForm = this.fb.group({
      idNumber: ['', [Validators.required]],
      name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', [Validators.required]],
      phoneCountry: ['tn'],
      drivingLicense: [''],
      typeTruckId: [null],
      employeeCategory: ['', [Validators.required]],
      isInternal: [false],
      geographicalEntityIds: [[], [Validators.required, Validators.minLength(1)]] // For drivers
    });
  }

  ngOnInit() {
    this.loadTypeTrucks();
    this.loadEmployeeCategories();
    this.loadGeographicalEntities(); // Load geographical entities
    
    // Subscribe to category changes
    this.employeeForm.get('employeeCategory')?.valueChanges.subscribe((category: string) => {
      this.onCategoryChange(category);
      this.updateGeographicalValidation(category);
    });
    
    this.setupLevelControls();
    
    if (this.data.employeeId) {
      this.loadEmployee(this.data.employeeId);
    }
  }

  ngAfterViewInit() {
    this.loadIntlTelInput();
  }

  private setupLevelControls() {
    // Level 1 changes
    this.level1Control.valueChanges.subscribe((value) => {
      if (!value) {
        this.level2Control.reset();
        this.level3Control.reset();
        this.level4Control.reset();
        this.level5Control.reset();
        this.loadLevel2Entities(null);
      } else {
        this.loadLevel2Entities(value);
      }
      this.updateSelectedEntities();
    });

    // Level 2 changes
    this.level2Control.valueChanges.subscribe((value) => {
      if (!value) {
        this.level3Control.reset();
        this.level4Control.reset();
        this.level5Control.reset();
        this.loadLevel3Entities(null);
      } else {
        this.loadLevel3Entities(value);
      }
      this.updateSelectedEntities();
    });

    // Level 3 changes
    this.level3Control.valueChanges.subscribe((value) => {
      if (!value) {
        this.level4Control.reset();
        this.level5Control.reset();
        this.loadLevel4Entities(null);
      } else {
        this.loadLevel4Entities(value);
      }
      this.updateSelectedEntities();
    });

    // Level 4 changes
    this.level4Control.valueChanges.subscribe((value) => {
      if (!value) {
        this.level5Control.reset();
        this.loadLevel5Entities(null);
      } else {
        this.loadLevel5Entities(value);
      }
      this.updateSelectedEntities();
    });

    // Level 5 changes
    this.level5Control.valueChanges.subscribe(() => {
      this.updateSelectedEntities();
    });
  }

  private loadLevel2Entities(parentId: number | null) {
    if (!parentId) {
      this.level2Entities = [];
      return;
    }
    // Filter entities of level 2 that have the selected level 1 as parent
    this.level2Entities = this.geographicalEntities.filter(e => {
      const level = this.geographicalLevels.find(l => l.id === e.levelId);
      return level?.levelNumber === 2 && e.parentId === parentId;
    });
  }

  private loadLevel3Entities(parentId: number | null) {
    if (!parentId) {
      this.level3Entities = [];
      return;
    }
    this.level3Entities = this.geographicalEntities.filter(e => {
      const level = this.geographicalLevels.find(l => l.id === e.levelId);
      return level?.levelNumber === 3 && e.parentId === parentId;
    });
  }

  private loadLevel4Entities(parentId: number | null) {
    if (!parentId) {
      this.level4Entities = [];
      return;
    }
    this.level4Entities = this.geographicalEntities.filter(e => {
      const level = this.geographicalLevels.find(l => l.id === e.levelId);
      return level?.levelNumber === 4 && e.parentId === parentId;
    });
  }

  private loadLevel5Entities(parentId: number | null) {
    if (!parentId) {
      this.level5Entities = [];
      return;
    }
    this.level5Entities = this.geographicalEntities.filter(e => {
      const level = this.geographicalLevels.find(l => l.id === e.levelId);
      return level?.levelNumber === 5 && e.parentId === parentId;
    });
  }

  private updateSelectedEntities() {
    const selected: number[] = [];
    
    if (this.level1Control.value) selected.push(this.level1Control.value);
    if (this.level2Control.value) selected.push(this.level2Control.value);
    if (this.level3Control.value) selected.push(this.level3Control.value);
    if (this.level4Control.value) selected.push(this.level4Control.value);
    if (this.level5Control.value) selected.push(this.level5Control.value);
    
    this.selectedEntities = selected;
    
    // Update form control
    this.employeeForm.patchValue({
      geographicalEntityIds: this.selectedEntities
    });
    this.employeeForm.get('geographicalEntityIds')?.markAsDirty();
  }

private loadGeographicalEntities(): void {
  this.loadingGeographicalEntities = true;
  
  // First load levels
  const levelsSub = this.httpService.getGeographicalLevels().subscribe({
    next: (levels) => {
      this.geographicalLevels = levels.filter(l => l.isActive);
      
      // Then load active entities
      const entitiesSub = this.httpService.getGeographicalEntities().subscribe({
        next: (entities) => {
          // Filter only active entities
          this.geographicalEntities = entities.filter(e => e.isActive);
          this.organizeEntitiesByLevel();
          this.loadingGeographicalEntities = false;
          
          // If we have employee data waiting and it's a driver, set the selections now
          if (this.employeeData && this.employeeData.employeeCategory === 'DRIVER') {
            this.setGeographicalSelections(this.employeeData);
          }
          
          // Trigger change detection
          this.cdr?.detectChanges();
        },
        error: (error) => {
          console.error('Error loading geographical entities:', error);
          this.loadingGeographicalEntities = false;
          Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: 'Impossible de charger les localisations',
            confirmButtonText: 'OK'
          });
        }
      });
      this.subscriptions.push(entitiesSub);
    },
    error: (error) => {
      console.error('Error loading geographical levels:', error);
      this.loadingGeographicalEntities = false;
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Impossible de charger les niveaux géographiques',
        confirmButtonText: 'OK'
      });
    }
  });
  
  this.subscriptions.push(levelsSub);
}

  private organizeEntitiesByLevel() {
    this.entityMap.clear();
    
    // Only add entities with valid IDs to the map
    this.geographicalEntities.forEach(e => {
      if (e.id !== undefined && e.id !== null) {
        this.entityMap.set(e.id, e);
      }
    });
    
    // Group by level number
    const levelGroups: { [key: number]: IGeographicalEntity[] } = {};
    
    this.geographicalEntities.forEach(entity => {
      if (entity.id === undefined || entity.id === null) return; // Skip entities without ID
      
      const level = this.geographicalLevels.find(l => l.id === entity.levelId);
      if (level) {
        if (!levelGroups[level.levelNumber]) {
          levelGroups[level.levelNumber] = [];
        }
        levelGroups[level.levelNumber].push(entity);
      }
    });
    
    // Assign to level arrays (only top-level entities for level 1)
    this.level1Entities = levelGroups[1]?.filter(e => !e.parentId) || [];
    // Other levels will be populated dynamically based on parent selection
  }

private setGeographicalSelections(employeeData: any) {
  // The employee data might have driverGeographicalEntities or geographicalEntities
  const geoEntities = employeeData.driverGeographicalEntities || employeeData.geographicalEntities || [];
  
  // Extract geographical entity IDs
  const geographicalEntityIds = geoEntities.map((ge: any) => 
    ge.geographicalEntityId || ge.id
  ).filter((id: number) => id != null);
  
  console.log('Setting geographical selections with IDs:', geographicalEntityIds);
  
  // Set selected entities
  this.selectedEntities = [...geographicalEntityIds];
  
  // Reset all level controls first
  this.level1Control.reset();
  this.level2Control.reset();
  this.level3Control.reset();
  this.level4Control.reset();
  this.level5Control.reset();
  
  // Set level controls based on the level of each entity
  geographicalEntityIds.forEach((id: number) => {
    const entity = this.geographicalEntities.find(e => e.id === id);
    if (entity) {
      const level = this.geographicalLevels.find(l => l.id === entity.levelId);
      if (level) {
        // Set the current level control
        switch(level.levelNumber) {
          case 1: 
            this.level1Control.setValue(id, { emitEvent: false }); 
            break;
          case 2: 
            this.level2Control.setValue(id, { emitEvent: false }); 
            break;
          case 3: 
            this.level3Control.setValue(id, { emitEvent: false }); 
            break;
          case 4: 
            this.level4Control.setValue(id, { emitEvent: false }); 
            break;
          case 5: 
            this.level5Control.setValue(id, { emitEvent: false }); 
            break;
        }
      }
    }
  });
  
  // Update form control
  this.employeeForm.patchValue({
    geographicalEntityIds: this.selectedEntities
  }, { emitEvent: false });
  
  console.log('Selected entities after setting:', this.selectedEntities);
  this.cdr.detectChanges();
}
  removeEntity(entityId: number) {
    const entity = this.geographicalEntities.find(e => e.id === entityId);
    if (entity) {
      const level = this.geographicalLevels.find(l => l.id === entity.levelId);
      if (level) {
        switch(level.levelNumber) {
          case 1: 
            this.level1Control.reset(); 
            break;
          case 2: 
            this.level2Control.reset(); 
            break;
          case 3: 
            this.level3Control.reset(); 
            break;
          case 4: 
            this.level4Control.reset(); 
            break;
          case 5: 
            this.level5Control.reset(); 
            break;
        }
      }
    }
    
    let newSelection = this.selectedEntities.filter(id => id !== entityId);
    this.selectedEntities = newSelection;
    
    // Update form control
    this.employeeForm.patchValue({
      geographicalEntityIds: this.selectedEntities
    });
    this.employeeForm.get('geographicalEntityIds')?.markAsDirty();
  }

  getEntityName(entityId: number): string {
    return this.entityMap.get(entityId)?.name || `ID: ${entityId}`;
  }

  getLevelName(levelNumber: number): string {
    const level = this.geographicalLevels.find(l => l.levelNumber === levelNumber);
    return level ? level.name : `Niveau ${levelNumber}`;
  }

  private updateGeographicalValidation(category: string | null) {
    const geoControl = this.employeeForm.get('geographicalEntityIds');
    
    if (category === 'DRIVER') {
      // Drivers require at least one geographical entity
      geoControl?.setValidators([Validators.required, Validators.minLength(1)]);
    } else {
      // Other categories don't require geographical entities
      geoControl?.clearValidators();
    }
    
    geoControl?.updateValueAndValidity();
  }

  private loadIntlTelInput() {
    const loadScript = (src: string) =>
      new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject();
        document.body.appendChild(script);
      });

    const loadCSS = (href: string) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
    };

    // Load CSS
    loadCSS('https://cdn.jsdelivr.net/npm/intl-tel-input@19.1.1/build/css/intlTelInput.min.css');

    // Load scripts
    loadScript('https://cdn.jsdelivr.net/npm/intl-tel-input@19.1.1/build/js/intlTelInput.min.js')
      .then(() => loadScript('https://cdn.jsdelivr.net/npm/intl-tel-input@19.1.1/build/js/utils.js'))
      .then(() => {
        this.iti = (window as any).intlTelInput(this.phoneInput.nativeElement, {
          initialCountry: this.phoneCountry,
          separateDialCode: true,
          nationalMode: false,
          utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@19.1.1/build/js/utils.js',
          preferredCountries: ['tn', 'fr', 'dz', 'ma', 'ly'],
          placeholderNumberType: 'MOBILE',
        });

        // Set initial placeholder
        this.updatePlaceholder();

        // Update form when phone changes
        this.phoneInput.nativeElement.addEventListener('blur', () => {
          const number = this.iti.getNumber();
          const countryData = this.iti.getSelectedCountryData();
          this.employeeForm.get('phoneNumber')?.setValue(number);
          this.employeeForm.get('phoneCountry')?.setValue(countryData.iso2);
        });

        this.phoneInput.nativeElement.addEventListener('countrychange', () => {
          const countryData = this.iti.getSelectedCountryData();
          this.employeeForm.get('phoneCountry')?.setValue(countryData.iso2);
          this.updatePlaceholder();
        });

        // If editing, set the number
        if (this.employeeForm.get('phoneNumber')?.value) {
          setTimeout(() => {
            this.iti.setNumber(this.employeeForm.get('phoneNumber')?.value || '');
            this.updatePlaceholder();
          }, 100);
        }
      })
      .catch(() => console.error('Failed to load intl-tel-input scripts.'));
  }

  private updatePlaceholder() {
    if (!this.iti) return;
    
    const countryData = this.iti.getSelectedCountryData();

    const countryPlaceholders: {[key: string]: string} = {
      'tn': '+216 12 345 678',
      'fr': '+33 6 12 34 56 78',
      'dz': '+213 5 55 55 55 55',
      'ma': '+212 6 12 34 56 78',
      'ly': '+218 21 123 4567',
      'us': '+1 (123) 456-7890',
      'gb': '+44 7911 123456',
      'de': '+49 151 1234567',
      'it': '+39 312 345 6789',
      'es': '+34 612 34 56 78',
      'be': '+32 471 12 34 56',
      'ch': '+41 79 123 45 67',
      'ca': '+1 416 123 4567',
      'eg': '+20 100 123 4567',
      'sa': '+966 50 123 4567',
      'ae': '+971 50 123 4567',
      'pt': '+351 912 345 678',
      'nl': '+31 6 12345678',
      'se': '+46 70 123 45 67',
      'no': '+47 412 34 567',
      'dk': '+45 20 12 34 56',
      'fi': '+358 40 123 4567',
      'pl': '+48 601 234 567',
      'cz': '+420 601 234 567',
      'hu': '+36 20 123 4567',
      'at': '+43 664 1234567',
      'gr': '+30 691 234 5678',
      'tr': '+90 532 123 45 67',
      'ru': '+7 912 345-67-89',
      'cn': '+86 131 2345 6789',
      'jp': '+81 90 1234 5678',
      'kr': '+82 10 1234 5678',
      'in': '+91 98765 43210',
      'br': '+55 11 91234-5678',
      'mx': '+52 1 55 1234 5678',
      'au': '+61 412 345 678'
    };
    
    const countryCode = countryData.iso2;
    this.countryPlaceholder = countryPlaceholders[countryCode] || 
      `+${countryData.dialCode} 123 456 789`;
  }

  private validatePhone(control: any) {
    if (!this.iti) return null;
    return this.iti.isValidNumber() ? null : { pattern: true };
  }

  // Category change handler
  onCategoryChange(category: string | null) {
    // Update validators based on category
    this.updateValidatorsForCategory(category);
  }

  private updateValidatorsForCategory(category: string | null) {
    const drivingLicenseControl = this.employeeForm.get('drivingLicense');
    const typeTruckIdControl = this.employeeForm.get('typeTruckId');
    
    if (category === 'DRIVER') {
      // Driver: needs both driving license and truck type
      drivingLicenseControl?.setValidators([Validators.required]);
      typeTruckIdControl?.setValidators([Validators.required]);
    } else if (category === 'MECHANIC') {
      // Mechanic: needs driving license
      drivingLicenseControl?.setValidators([Validators.required]);
      typeTruckIdControl?.clearValidators();
    } else if (category === 'CONVOYEUR') {
      // Convoyeur: neither is required
      drivingLicenseControl?.clearValidators();
      typeTruckIdControl?.clearValidators();
    } else {
      drivingLicenseControl?.clearValidators();
      typeTruckIdControl?.clearValidators();
    }
    
    drivingLicenseControl?.updateValueAndValidity();
    typeTruckIdControl?.updateValueAndValidity();
  }

  // Helper methods for template
  shouldShowDrivingLicense(): boolean {
    const category = this.employeeForm.get('employeeCategory')?.value;
    return ['DRIVER', 'MECHANIC'].includes(category || '');
  }

  isDrivingLicenseRequired(): boolean {
    const category = this.employeeForm.get('employeeCategory')?.value;
    return category === 'DRIVER' || category === 'MECHANIC';
  }

  shouldShowTruckType(): boolean {
    const category = this.employeeForm.get('employeeCategory')?.value;
    return category === 'DRIVER';
  }

  isTruckTypeRequired(): boolean {
    const category = this.employeeForm.get('employeeCategory')?.value;
    return category === 'DRIVER';
  }

  shouldShowLicenseAttachment(): boolean {
    const category = this.employeeForm.get('employeeCategory')?.value;
    return ['DRIVER', 'MECHANIC'].includes(category || '');
  }

  isLicenseAttachmentRequired(): boolean {
    const category = this.employeeForm.get('employeeCategory')?.value;
    return category === 'DRIVER' || category === 'MECHANIC';
  }

  shouldShowGeographicalEntities(): boolean {
    const category = this.employeeForm.get('employeeCategory')?.value;
    return category === 'DRIVER';
  }

  getCategoryLabel(categoryCode: string): string {
    const categoryMap: {[key: string]: string} = {
      'DRIVER': 'Chauffeur',
      'MECHANIC': 'Mécanicien',
      'CONVOYEUR': 'Convoyeur'
    };
    return categoryMap[categoryCode] || categoryCode;
  }

  private loadEmployeeCategories(): void {
    this.loadingCategories = true;
    
    const categoriesSub = this.settingsService.getEmployeeCategories().subscribe({
      next: (categories) => {
        // Filter to only show DRIVER, MECHANIC, CONVOYEUR
        this.employeeCategories = categories.filter(cat => 
          this.availableCategories.includes(cat.parameterCode)
        );
        this.loadingCategories = false;
        console.log('✅ Employee categories loaded:', this.employeeCategories);
      },
      error: (error) => {
        console.error('Error loading employee categories:', error);
        this.loadingCategories = false;
      }
    });
    
    this.subscriptions.push(categoriesSub);
  }

  private loadTypeTrucks(): void {
    this.loadingTypeTrucks = true;
    
    const typeTrucksSub = this.httpService.getTypeTrucksList({ pageIndex: 0, pageSize: 100 }).subscribe({
      next: (response) => {
        let typeTrucksData: ITypeTruck[];
        
        if (response && typeof response === 'object' && 'data' in response) {
          typeTrucksData = (response as any).data;
        } else if (Array.isArray(response)) {
          typeTrucksData = response;
        } else {
          typeTrucksData = [];
        }
        
        this.typeTrucks = typeTrucksData;
        this.loadingTypeTrucks = false;
      },
      error: (error) => {
        console.error('Error loading type trucks:', error);
        this.loadingTypeTrucks = false;
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Impossible de charger les types de véhicules',
          confirmButtonText: 'OK'
        });
      }
    });
    
    this.subscriptions.push(typeTrucksSub);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.iti) {
      this.iti.destroy();
    }
  }

loadEmployee(employeeId: number) {
  const sub = this.httpService.getEmployee(employeeId).subscribe({
    next: (response: any) => {
      // Handle the ApiResponse wrapper - the employee data is in response.data
      const employee = response.data || response;
      
      console.log('Employee data received:', employee);
      console.log('Geographical entities:', employee.driverGeographicalEntities);
      
      // Store employee data for later use
      this.employeeData = employee;
      
      // Patch base form values
      this.employeeForm.patchValue({
        idNumber: employee.idNumber,
        name: employee.name,
        email: employee.email,
        phoneNumber: employee.phoneNumber,
        phoneCountry: employee.phoneCountry || 'tn',
        drivingLicense: employee.drivingLicense || '',
        typeTruckId: employee.typeTruckId || null,
        employeeCategory: employee.employeeCategory || '',
        isInternal: employee.isInternal || false
      });

      this.phoneCountry = employee.phoneCountry || 'tn';

      // Set geographical selections for drivers
      if (employee.employeeCategory === 'DRIVER') {
        // Map driverGeographicalEntities to the format expected by setGeographicalSelections
        if (employee.driverGeographicalEntities && employee.driverGeographicalEntities.length > 0) {
          // Transform to the expected format
          employee.geographicalEntities = employee.driverGeographicalEntities.map((dge: any) => ({
            geographicalEntityId: dge.geographicalEntityId
          }));
        }
        
        // If geographical entities are already loaded, set selections immediately
        if (this.geographicalEntities.length > 0 && this.geographicalLevels.length > 0) {
          this.setGeographicalSelections(employee);
        } else {
          // Otherwise, store the employee data to process after loading
          this.employeeData = employee;
        }
      }

      if (employee.attachmentFileName) {
        this.hasExistingFile = true;
        this.originalFileName = employee.attachmentFileName;
      }

      // Update intl-tel-input if it's already loaded
      if (this.iti && employee.phoneNumber) {
        setTimeout(() => {
          this.iti.setNumber(employee.phoneNumber);
        }, 200);
      }
      
      // Trigger change detection
      this.cdr.detectChanges();
    },
    error: (error) => {
      console.error('Error loading employee:', error);
      Swal.fire('Error', 'Failed to load employee data', 'error');
      this.dialogRef.close();
    }
  });
  this.subscriptions.push(sub);
}
  onFileSelected(event: any) {
    const file: File = event.target.files[0];

    if (!file) return;

    const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'gif', 'bmp'];

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      this.fileError = `Invalid file type. Allowed: ${allowedExtensions.join(', ')}`;
      this.selectedFile = null;
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      this.fileError = 'File size exceeds 5 MB limit';
      this.selectedFile = null;
      return;
    }

    this.selectedFile = file;
    this.fileError = null;
    this.originalFileName = file.name;

    if (fileExtension && ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(fileExtension)) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.filePreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  removeFile() {
    this.selectedFile = null;
    this.filePreview = null;
    this.fileError = null;
    this.originalFileName = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  submit() {
    // Check if category is selected
    if (!this.employeeForm.get('employeeCategory')?.value) {
      Swal.fire('Error', 'Please select an employee category', 'error');
      return;
    }

    if (this.employeeForm.invalid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.employeeForm.controls).forEach(key => {
        this.employeeForm.get(key)?.markAsTouched();
      });
      Swal.fire('Error', 'Please fill all required fields correctly', 'error');
      return;
    }

    // Check file attachment requirement for drivers and mechanics
    const category = this.employeeForm.get('employeeCategory')?.value;
    if ((category === 'DRIVER' || category === 'MECHANIC') && !this.selectedFile && !this.hasExistingFile) {
      Swal.fire('Error', 'License attachment is required for drivers and mechanics', 'error');
      return;
    }

    // Get the full international number from intl-tel-input
    if (this.iti) {
      const number = this.iti.getNumber();
      const countryData = this.iti.getSelectedCountryData();
      this.employeeForm.patchValue({
        phoneNumber: number,
        phoneCountry: countryData.iso2
      });
    }

    this.isSubmitting = true;

    if (this.data.employeeId) {
      this.updateEmployee();
    } else {
      this.createEmployee();
    }
  }

 createEmployee() {
  const formData = new FormData();
  
  // Get form values with safe access
  const formValues = this.employeeForm.value;
  
  // Base fields
  formData.append('idNumber', formValues.idNumber || '');
  formData.append('name', formValues.name || '');
  formData.append('email', formValues.email || '');
  formData.append('phoneNumber', formValues.phoneNumber || '');
  formData.append('phoneCountry', formValues.phoneCountry || 'tn');
  formData.append('drivingLicense', formValues.drivingLicense || '');
  
  const employeeCategory = formValues.employeeCategory;
  if (employeeCategory) {
    formData.append('employeeCategory', employeeCategory);
  }

  const isInternal = formValues.isInternal;
  formData.append('isInternal', isInternal ? 'true' : 'false');
  
  const typeTruckId = formValues.typeTruckId;
  if (typeTruckId && employeeCategory === 'DRIVER') {
    formData.append('typeTruckId', typeTruckId.toString());
  }

  // Add geographical entities for drivers - IMPORTANT: Send as JSON string
  if (employeeCategory === 'DRIVER' && this.selectedEntities.length > 0) {
    // Create an array of objects with geographicalEntityId
    const geographicalEntities = this.selectedEntities.map(id => ({
      geographicalEntityId: id
    }));
    
    // Send as JSON string - this is crucial!
    formData.append('geographicalEntities', JSON.stringify(geographicalEntities));
    
    console.log('Sending geographical entities:', geographicalEntities);
    console.log('JSON string:', JSON.stringify(geographicalEntities));
  }

  // File attachment
  if (this.selectedFile) {
    formData.append('drivingLicenseFile', this.selectedFile, this.selectedFile.name);
  }

  // Log the FormData contents for debugging
  for (let pair of (formData as any).entries()) {
    console.log(pair[0] + ': ' + pair[1]);
  }

  const sub = this.httpService.addEmployee(formData).subscribe({
    next: () => {
      Swal.fire('Success', 'Employee created successfully', 'success');
      this.isSubmitting = false;
      this.dialogRef.close(true);
    },
    error: (error) => {
      console.error('Error creating employee:', error);
      const errorMessage = error.error?.message || 'Failed to create employee';
      Swal.fire('Error', errorMessage, 'error');
      this.isSubmitting = false;
    }
  });
  this.subscriptions.push(sub);
}

updateEmployee() {
  if (!this.data.employeeId) {
    Swal.fire('Error', 'Employee ID is missing', 'error');
    return;
  }

  const formData = new FormData();
  
  // Get form values with safe access
  const formValues = this.employeeForm.value;
  
  // Base fields
  formData.append('idNumber', formValues.idNumber || '');
  formData.append('name', formValues.name || '');
  formData.append('email', formValues.email || '');
  formData.append('phoneNumber', formValues.phoneNumber || '');
  formData.append('phoneCountry', formValues.phoneCountry || 'tn');
  formData.append('drivingLicense', formValues.drivingLicense || '');
  formData.append('isEnable', 'true');
  
  const employeeCategory = formValues.employeeCategory;
  if (employeeCategory) {
    formData.append('employeeCategory', employeeCategory);
  }

  const isInternal = formValues.isInternal;
  formData.append('isInternal', isInternal ? 'true' : 'false');
   
  const typeTruckId = formValues.typeTruckId;
  if (typeTruckId && employeeCategory === 'DRIVER') {
    formData.append('typeTruckId', typeTruckId.toString());
  }

  // Add geographical entities for drivers - IMPORTANT: Send as JSON string
  if (employeeCategory === 'DRIVER') {
    if (this.selectedEntities.length > 0) {
      // Create an array of objects with geographicalEntityId
      const geographicalEntities = this.selectedEntities.map(id => ({
        geographicalEntityId: id
      }));
      
      // Send as JSON string
      formData.append('geographicalEntities', JSON.stringify(geographicalEntities));
      
      console.log('Sending geographical entities:', geographicalEntities);
      console.log('JSON string:', JSON.stringify(geographicalEntities));
    } else {
      // If no entities selected, send empty array to clear existing ones
      formData.append('geographicalEntities', JSON.stringify([]));
    }
  }

  if (this.selectedFile) {
    formData.append('drivingLicenseFile', this.selectedFile, this.selectedFile.name);
  }

  // Log the FormData contents for debugging
  for (let pair of (formData as any).entries()) {
    console.log(pair[0] + ': ' + pair[1]);
  }

  const sub = this.httpService.updateEmployee(this.data.employeeId, formData).subscribe({
    next: () => {
      Swal.fire('Success', 'Employee updated successfully', 'success');
      this.isSubmitting = false;
      this.dialogRef.close(true);
    },
    error: (error) => {
      console.error('Error updating employee:', error);
      const errorMessage = error.error?.message || 'Failed to update employee';
      Swal.fire('Error', errorMessage, 'error');
      this.isSubmitting = false;
    }
  });
  this.subscriptions.push(sub);
}

  closeDialog() {
    this.dialogRef.close();
  }

  getErrorMessage(controlName: string): string {
    const control = this.employeeForm.get(controlName);
    
    if (control?.hasError('required')) {
      if (controlName === 'geographicalEntityIds') {
        return 'Au moins une localisation doit être sélectionnée';
      }
      return `${controlName} est obligatoire`;
    }
    
    if (control?.hasError('minlength') && controlName === 'geographicalEntityIds') {
      return 'Au moins une localisation doit être sélectionnée';
    }
    
    return '';
  }
}