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

  private iti: any;
  private phoneCountry: string = 'tn';
  private employeeData: any = null;

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

  loadingGeographicalEntities = false;
  geographicalEntities: IGeographicalEntity[] = [];
  geographicalLevels: IGeographicalLevel[] = [];


  selectedEntities: number[] = [];


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


  private entityMap: Map<number, IGeographicalEntity> = new Map();




  employeeForm: FormGroup;

  constructor() {

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
      geographicalEntityIds: [[], [Validators.required, Validators.minLength(1)]]
    });
  }

  ngOnInit() {
    this.loadTypeTrucks();
    this.loadEmployeeCategories();
    this.loadGeographicalEntities();


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


    this.level4Control.valueChanges.subscribe((value) => {
      if (!value) {
        this.level5Control.reset();
        this.loadLevel5Entities(null);
      } else {
        this.loadLevel5Entities(value);
      }
      this.updateSelectedEntities();
    });


    this.level5Control.valueChanges.subscribe(() => {
      this.updateSelectedEntities();
    });
  }

  private loadLevel2Entities(parentId: number | null) {
    if (!parentId) {
      this.level2Entities = [];
      return;
    }

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


    this.employeeForm.patchValue({
      geographicalEntityIds: this.selectedEntities
    });
    this.employeeForm.get('geographicalEntityIds')?.markAsDirty();
  }

private loadGeographicalEntities(): void {
  this.loadingGeographicalEntities = true;


  const levelsSub = this.httpService.getGeographicalLevels().subscribe({
    next: (levels) => {
      this.geographicalLevels = levels.filter(l => l.isActive);


      const entitiesSub = this.httpService.getGeographicalEntities().subscribe({
        next: (entities) => {

          this.geographicalEntities = entities.filter(e => e.isActive);
          this.organizeEntitiesByLevel();
          this.loadingGeographicalEntities = false;


          if (this.employeeData && this.employeeData.employeeCategory === 'DRIVER') {
            this.setGeographicalSelections(this.employeeData);
          } else if (this.employeeData && this.employeeData.employeeCategory !== 'DRIVER') {

            const geoControl = this.employeeForm.get('geographicalEntityIds');
            geoControl?.clearValidators();
            geoControl?.updateValueAndValidity({ emitEvent: false });
          }


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


    this.geographicalEntities.forEach(e => {
      if (e.id !== undefined && e.id !== null) {
        this.entityMap.set(e.id, e);
      }
    });


    const levelGroups: { [key: number]: IGeographicalEntity[] } = {};

    this.geographicalEntities.forEach(entity => {
      if (entity.id === undefined || entity.id === null) return;

      const level = this.geographicalLevels.find(l => l.id === entity.levelId);
      if (level) {
        if (!levelGroups[level.levelNumber]) {
          levelGroups[level.levelNumber] = [];
        }
        levelGroups[level.levelNumber].push(entity);
      }
    });


    this.level1Entities = levelGroups[1]?.filter(e => !e.parentId) || [];

  }

private setGeographicalSelections(employeeData: any) {

  const geoEntities = employeeData.driverGeographicalEntities || employeeData.geographicalEntities || [];


  const geographicalEntityIds = geoEntities.map((ge: any) =>
    ge.geographicalEntityId || ge.id
  ).filter((id: number) => id != null);

  console.log('Setting geographical selections with IDs:', geographicalEntityIds);


  this.selectedEntities = [...geographicalEntityIds];


  this.level1Control.reset(undefined, { emitEvent: false });
  this.level2Control.reset(undefined, { emitEvent: false });
  this.level3Control.reset(undefined, { emitEvent: false });
  this.level4Control.reset(undefined, { emitEvent: false });
  this.level5Control.reset(undefined, { emitEvent: false });


  geographicalEntityIds.forEach((id: number) => {
    const entity = this.geographicalEntities.find(e => e.id === id);
    if (entity) {
      const level = this.geographicalLevels.find(l => l.id === entity.levelId);
      if (level) {

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


  this.employeeForm.patchValue({
    geographicalEntityIds: this.selectedEntities
  }, { emitEvent: false });


  const geoControl = this.employeeForm.get('geographicalEntityIds');
  if (geoControl) {
    geoControl.markAsTouched({ emitEvent: false });
    geoControl.markAsDirty({ emitEvent: false });
    geoControl.updateValueAndValidity({ emitEvent: false });
  }

  console.log('Selected entities after setting:', this.selectedEntities);
  console.log('Geo control valid:', geoControl?.valid);
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

      geoControl?.setValidators([Validators.required, Validators.minLength(1)]);
    } else {

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


    loadCSS('https://cdn.jsdelivr.net/npm/intl-tel-input@19.1.1/build/css/intlTelInput.min.css');


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


        this.updatePlaceholder();


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


  onCategoryChange(category: string | null) {

    this.updateValidatorsForCategory(category);
  }

  private updateValidatorsForCategory(category: string | null) {
    const drivingLicenseControl = this.employeeForm.get('drivingLicense');
    const typeTruckIdControl = this.employeeForm.get('typeTruckId');

    if (category === 'DRIVER') {

      drivingLicenseControl?.setValidators([Validators.required]);
      typeTruckIdControl?.setValidators([Validators.required]);
    } else if (category === 'MECHANIC') {

      drivingLicenseControl?.setValidators([Validators.required]);
      typeTruckIdControl?.clearValidators();
    } else if (category === 'CONVOYEUR') {

      drivingLicenseControl?.clearValidators();
      typeTruckIdControl?.clearValidators();
    } else {
      drivingLicenseControl?.clearValidators();
      typeTruckIdControl?.clearValidators();
    }

    drivingLicenseControl?.updateValueAndValidity();
    typeTruckIdControl?.updateValueAndValidity();
  }


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
  if (!categoryCode) return '';


  let cleanCode = categoryCode;
  if (cleanCode.includes('=')) {
    cleanCode = cleanCode.split('=')[0];
  }

  const categoryMap: {[key: string]: string} = {
    'DRIVER': 'Chauffeur',
    'MECHANIC': 'Mécanicien',
    'CONVOYEUR': 'Convoyeur',
    'MAGASINIER': 'Magasinier',
    'ADMIN': 'Administrateur',
    'MANAGER': 'Gestionnaire'
  };

  return categoryMap[cleanCode] || cleanCode.charAt(0).toUpperCase() + cleanCode.slice(1).toLowerCase();
}

private loadEmployeeCategories(): void {
  this.loadingCategories = true;

  const categoriesSub = this.settingsService.getEmployeeCategories().subscribe({
    next: (categories) => {

      this.employeeCategories = categories;
      this.loadingCategories = false;
      console.log('✅ All employee categories loaded:', this.employeeCategories);
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

      const employee = response.data || response;

      console.log('Employee data received:', employee);
      console.log('Geographical entities:', employee.driverGeographicalEntities);


      this.employeeData = employee;


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
      }, { emitEvent: false });

      this.phoneCountry = employee.phoneCountry || 'tn';


      Object.keys(this.employeeForm.controls).forEach(key => {
        const control = this.employeeForm.get(key);
        if (control && key !== 'geographicalEntityIds') {
          control.markAsTouched({ emitEvent: false });
          control.updateValueAndValidity({ emitEvent: false });
        }
      });


      if (employee.employeeCategory === 'DRIVER') {

        if (employee.driverGeographicalEntities && employee.driverGeographicalEntities.length > 0) {

          employee.geographicalEntities = employee.driverGeographicalEntities.map((dge: any) => ({
            geographicalEntityId: dge.geographicalEntityId
          }));
        }


        if (this.geographicalEntities.length > 0 && this.geographicalLevels.length > 0) {
          this.setGeographicalSelections(employee);
        } else {

          this.employeeData = employee;
        }
      } else {

        const geoControl = this.employeeForm.get('geographicalEntityIds');
        geoControl?.clearValidators();
        geoControl?.setValue([]);
        geoControl?.updateValueAndValidity({ emitEvent: false });
      }

      if (employee.attachmentFileName) {
        this.hasExistingFile = true;
        this.originalFileName = employee.attachmentFileName;
      }


      if (this.iti && employee.phoneNumber) {
        setTimeout(() => {
          this.iti.setNumber(employee.phoneNumber);
        }, 200);
      }


      console.log('Form valid after loading:', this.employeeForm.valid);
      console.log('Form errors:', this.employeeForm.errors);


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
    this.fileError = `Type de fichier non autorisé. Types acceptés: ${allowedExtensions.join(', ')}`;
    this.selectedFile = null;
    return;
  }


  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    this.fileError = 'La taille du fichier dépasse 2 MB. Veuillez choisir un fichier plus petit.';
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

    if (!this.employeeForm.get('employeeCategory')?.value) {
      Swal.fire('Error', 'Please select an employee category', 'error');
      return;
    }

    if (this.employeeForm.invalid) {

      Object.keys(this.employeeForm.controls).forEach(key => {
        this.employeeForm.get(key)?.markAsTouched();
      });
      Swal.fire('Error', 'Please fill all required fields correctly', 'error');
      return;
    }


    const category = this.employeeForm.get('employeeCategory')?.value;
    if ((category === 'DRIVER' || category === 'MECHANIC') && !this.selectedFile && !this.hasExistingFile) {
      Swal.fire('Error', 'License attachment is required for drivers and mechanics', 'error');
      return;
    }


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


  const formValues = this.employeeForm.value;


  formData.append('idNumber', formValues.idNumber || '');
  formData.append('name', formValues.name || '');
  formData.append('email', formValues.email || '');
  formData.append('phoneNumber', formValues.phoneNumber || '');
  formData.append('phoneCountry', formValues.phoneCountry || 'tn');
  formData.append('drivingLicense', formValues.drivingLicense || '');

let employeeCategory = formValues.employeeCategory;
if (employeeCategory) {
  if (employeeCategory.includes('=')) {
    employeeCategory = employeeCategory.split('=')[0];
  }
  formData.append('employeeCategory', employeeCategory);
}

  const isInternal = formValues.isInternal;
  formData.append('isInternal', isInternal ? 'true' : 'false');

  const typeTruckId = formValues.typeTruckId;
  if (typeTruckId && employeeCategory === 'DRIVER') {
    formData.append('typeTruckId', typeTruckId.toString());
  }


  if (employeeCategory === 'DRIVER' && this.selectedEntities.length > 0) {

    const geographicalEntities = this.selectedEntities.map(id => ({
      geographicalEntityId: id
    }));


    formData.append('geographicalEntities', JSON.stringify(geographicalEntities));

    console.log('Sending geographical entities:', geographicalEntities);
    console.log('JSON string:', JSON.stringify(geographicalEntities));
  }


  if (this.selectedFile) {
    formData.append('drivingLicenseFile', this.selectedFile, this.selectedFile.name);
  }


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


  const formValues = this.employeeForm.value;


  formData.append('idNumber', formValues.idNumber || '');
  formData.append('name', formValues.name || '');
  formData.append('email', formValues.email || '');
  formData.append('phoneNumber', formValues.phoneNumber || '');
  formData.append('phoneCountry', formValues.phoneCountry || 'tn');
  formData.append('drivingLicense', formValues.drivingLicense || '');
  formData.append('isEnable', 'true');

let employeeCategory = formValues.employeeCategory;
if (employeeCategory) {

  if (employeeCategory.includes('=')) {
    employeeCategory = employeeCategory.split('=')[0];
  }
  formData.append('employeeCategory', employeeCategory);
}
  const isInternal = formValues.isInternal;
  formData.append('isInternal', isInternal ? 'true' : 'false');

  const typeTruckId = formValues.typeTruckId;
  if (typeTruckId && employeeCategory === 'DRIVER') {
    formData.append('typeTruckId', typeTruckId.toString());
  }


  if (employeeCategory === 'DRIVER') {
    if (this.selectedEntities.length > 0) {

      const geographicalEntities = this.selectedEntities.map(id => ({
        geographicalEntityId: id
      }));


      formData.append('geographicalEntities', JSON.stringify(geographicalEntities));

      console.log('Sending geographical entities:', geographicalEntities);
      console.log('JSON string:', JSON.stringify(geographicalEntities));
    } else {

      formData.append('geographicalEntities', JSON.stringify([]));
    }
  }

  if (this.selectedFile) {
    formData.append('drivingLicenseFile', this.selectedFile, this.selectedFile.name);
  }


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
  isEditMode(): boolean {
  return !!this.data.employeeId;
}
isSubmitButtonDisabled(): boolean {

  if (this.isSubmitting || this.loadingGeographicalEntities) {
    return true;
  }

  const category = this.employeeForm.get('employeeCategory')?.value;


  if (category === 'DRIVER') {

    if (this.selectedEntities.length === 0) {
      return true;
    }
  }


  return this.employeeForm.invalid;
}
}