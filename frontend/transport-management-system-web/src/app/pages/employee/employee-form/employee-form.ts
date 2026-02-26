import { Component, ElementRef, inject, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
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
import { IGeneralSettings, ParameterType } from '../../../types/general-settings'; 
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
export class EmployeeForm implements OnInit, OnDestroy {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  settingsService = inject(SettingsService); // ADD THIS
  dialogRef = inject(MatDialogRef<EmployeeForm>);
  data = inject<{ employeeId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};
  translation = inject(Translation);

  @ViewChild('fileInput') fileInput!: ElementRef;

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

  employeeForm = this.fb.group({
    idNumber: this.fb.control<string>('', [Validators.required]),
    name: this.fb.control<string>('', [Validators.required]),
    email: this.fb.control<string>('', [Validators.required, Validators.email]),
    phoneNumber: this.fb.control<string>('', [Validators.required]),
    drivingLicense: this.fb.control<string>(''),
    typeTruckId: this.fb.control<number | null>(null),
    employeeCategory: this.fb.control<string>('') ,
    isInternal: this.fb.control<boolean>(false)
  });

  ngOnInit() {
    this.loadTypeTrucks();
    this.loadEmployeeCategories(); 
    if (this.data.employeeId) {
      this.loadEmployee(this.data.employeeId);
    }
  }

  // ADD THIS METHOD
  private loadEmployeeCategories(): void {
    this.loadingCategories = true;
    
    const categoriesSub = this.settingsService.getEmployeeCategories().subscribe({
      next: (categories) => {
        this.employeeCategories = categories;
        this.loadingCategories = false;
        console.log('✅ Employee categories loaded:', categories);
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
  }

  loadEmployee(employeeId: number) {
    const sub = this.httpService.getEmployee(employeeId).subscribe({
      next: (employee: IEmployee) => {
        this.employeeForm.patchValue({
          idNumber: employee.idNumber,
          name: employee.name,
          email: employee.email,
          phoneNumber: employee.phoneNumber,
          drivingLicense: employee.drivingLicense || '',
          typeTruckId: employee.typeTruckId || null,
          employeeCategory: employee.employeeCategory || '' ,
          isInternal: employee.isInternal || false
        });

        if (employee.attachmentFileName) {
          this.hasExistingFile = true;
          this.originalFileName = employee.attachmentFileName;
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

   
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 
                         'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
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
    if (this.employeeForm.invalid) {
      Swal.fire('Error', 'Please fill all required fields', 'error');
      return;
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
    formData.append('idNumber', this.employeeForm.get('idNumber')?.value || '');
    formData.append('name', this.employeeForm.get('name')?.value || '');
    formData.append('email', this.employeeForm.get('email')?.value || '');
    formData.append('phoneNumber', this.employeeForm.get('phoneNumber')?.value || '');
    formData.append('drivingLicense', this.employeeForm.get('drivingLicense')?.value || '');
    
   
    const employeeCategory = this.employeeForm.get('employeeCategory')?.value;
    if (employeeCategory) {
      formData.append('employeeCategory', employeeCategory);
    }

    const isInternal = this.employeeForm.get('isInternal')?.value;
     formData.append('isInternal', isInternal ? 'true' : 'false');
    const typeTruckId = this.employeeForm.get('typeTruckId')?.value;

    if (typeTruckId) {
      formData.append('typeTruckId', typeTruckId.toString());
    }

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
    formData.append('idNumber', this.employeeForm.get('idNumber')?.value || '');
    formData.append('name', this.employeeForm.get('name')?.value || '');
    formData.append('email', this.employeeForm.get('email')?.value || '');
    formData.append('phoneNumber', this.employeeForm.get('phoneNumber')?.value || '');
    formData.append('drivingLicense', this.employeeForm.get('drivingLicense')?.value || '');
    formData.append('isEnable', 'true');
    
   
    const employeeCategory = this.employeeForm.get('employeeCategory')?.value;
    if (employeeCategory) {
      formData.append('employeeCategory', employeeCategory);
    }

     const isInternal = this.employeeForm.get('isInternal')?.value;
     formData.append('isInternal', isInternal ? 'true' : 'false');
     
    const typeTruckId = this.employeeForm.get('typeTruckId')?.value;
    if (typeTruckId) {
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