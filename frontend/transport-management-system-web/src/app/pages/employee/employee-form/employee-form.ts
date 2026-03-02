import { Component, ElementRef, inject, OnInit, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule, FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { Http } from '../../../services/http';
import { SettingsService } from '../../../services/settings.service'; 
import { IEmployee } from '../../../types/employee';
import { ITypeTruck } from '../../../types/type-truck';
import Swal from 'sweetalert2';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Translation } from '../../../services/Translation';
import { Subscription } from 'rxjs';
import { IGeneralSettings } from '../../../types/general-settings'; 
import { MatCheckboxModule } from '@angular/material/checkbox';

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
      isInternal: [false]
    });
  }

  ngOnInit() {
    this.loadTypeTrucks();
    this.loadEmployeeCategories(); 
    
    // Subscribe to category changes
    this.employeeForm.get('employeeCategory')?.valueChanges.subscribe((category: string) => {
      this.onCategoryChange(category);
    });
    
    if (this.data.employeeId) {
      this.loadEmployee(this.data.employeeId);
    }
  }

  ngAfterViewInit() {
    this.loadIntlTelInput();
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
        // Custom placeholder
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
      // Mechanic: needs driving license (based on your backend, Mechanic extends Employee)
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
    // Show for DRIVER and MECHANIC only
    return ['DRIVER', 'MECHANIC'].includes(category || '');
  }

  isLicenseAttachmentRequired(): boolean {
    const category = this.employeeForm.get('employeeCategory')?.value;
    // Required for DRIVER and MECHANIC
    return category === 'DRIVER' || category === 'MECHANIC';
  }

  // Note: Mechanic has no additional fields in backend, so no shouldShowMechanicFields method needed

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
      next: (employee: any) => {
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

    // File attachment
    if (this.selectedFile) {
      formData.append('drivingLicenseFile', this.selectedFile, this.selectedFile.name);
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

    if (this.selectedFile) {
      formData.append('drivingLicenseFile', this.selectedFile, this.selectedFile.name);
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
}