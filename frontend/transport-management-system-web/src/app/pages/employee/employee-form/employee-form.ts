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
import { IEmployee } from '../../../types/employee';
import { ITypeTruck } from '../../../types/type-truck';
import Swal from 'sweetalert2';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Translation } from '../../../services/Translation';
import { Subscription } from 'rxjs';

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
    MatSelectModule
  ],
  templateUrl: './employee-form.html',
  styleUrls: ['./employee-form.scss']
})
export class EmployeeForm implements OnInit, OnDestroy {
  fb = inject(FormBuilder);
  httpService = inject(Http);
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
  truckTypes: ITypeTruck[] = [];
  loadingTruckTypes = false;

  employeeForm = this.fb.group({
    idNumber: this.fb.control<string>('', [Validators.required]),
    name: this.fb.control<string>('', [Validators.required]),
    email: this.fb.control<string>('', [Validators.required, Validators.email]),
    phoneNumber: this.fb.control<string>('', [Validators.required]),
    drivingLicense: this.fb.control<string>(''),
    truckTypeId: this.fb.control<number | null>(null)
  });

  ngOnInit() {
    this.loadTruckTypes();
    if (this.data.employeeId) {
      this.loadEmployee(this.data.employeeId);
    }
  }

  loadTruckTypes() {
    this.loadingTruckTypes = true;
    const sub = this.httpService.getTruckTypes().subscribe({
      next: (truckTypes: ITypeTruck[]) => {
        this.truckTypes = truckTypes;
        this.loadingTruckTypes = false;
      },
      error: (error) => {
        console.error('Error loading truck types:', error);
        this.loadingTruckTypes = false;
      }
    });
    this.subscriptions.push(sub);
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
          truckTypeId: employee.truckTypeId || null
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
    
    const truckTypeId = this.employeeForm.get('truckTypeId')?.value;
    if (truckTypeId) {
      formData.append('truckTypeId', truckTypeId.toString());
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
    
    const truckTypeId = this.employeeForm.get('truckTypeId')?.value;
    if (truckTypeId) {
      formData.append('truckTypeId', truckTypeId.toString());
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
