import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Http } from '../../../services/http';
import { IGeneralSettings, IGeneralSettingsDto, ParameterType } from '../../../types/general-settings';
import { MatIconModule } from '@angular/material/icon';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-general-settings-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  templateUrl: './general-settings-form.html',
  styleUrls: ['./general-settings-form.scss']
})
export class GeneralSettingsForm implements OnInit {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<GeneralSettingsForm>);
  data = inject<{ parameterId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  isSubmitting = false;

  // Available parameter types
  parameterTypes = Object.values(ParameterType);

  // Form with fields matching GeneralSettings entity
  parameterForm = this.fb.group({
    parameterType: this.fb.control<ParameterType | null>(null, [Validators.required]),
    parameterCode: this.fb.control<string>('', [
      Validators.required, 
      Validators.maxLength(50)
    ]),
    value: this.fb.control<string>('', [
    Validators.maxLength(100)
    ]),
    description: this.fb.control<string>('', [
      Validators.maxLength(200)
    ])
  });

  ngOnInit() {
    if (this.data.parameterId) {
      this.loadParameter();
    }
  }

  loadParameter() {
    this.httpService.getGeneralSetting(this.data.parameterId!).subscribe({
      next: (parameter: IGeneralSettings) => {
        console.log("Parameter loaded:", parameter);
        this.parameterForm.patchValue({
          parameterType: parameter.parameterType,
          parameterCode: parameter.parameterCode,
          value: parameter.value,
          description: parameter.description
        });
      },
      error: (error) => {
        console.error('Error loading parameter:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Impossible de charger les données du paramètre',
          confirmButtonText: 'OK'
        }).then(() => this.dialogRef.close());
      }
    });
  }

  onSubmit() {
    if (this.parameterForm.invalid || this.isSubmitting) {
      this.markFormGroupTouched(this.parameterForm);
      return;
    }

    this.isSubmitting = true;

    // Create DTO matching backend entity
    const parameterDto: IGeneralSettingsDto = {
      parameterType: this.parameterForm.value.parameterType!,
      parameterCode: this.parameterForm.value.parameterCode!.trim().toUpperCase(),
      description: this.parameterForm.value.description!.trim(),
      value: this.parameterForm.value.value?.trim() || '',
    };

    // Add id for update if needed
    if (this.data.parameterId) {
      parameterDto.id = this.data.parameterId;
    }

    console.log('Submitting DTO:', parameterDto);

    const request = this.data.parameterId
      ? this.httpService.updateGeneralSettings(this.data.parameterId, parameterDto)
      : this.httpService.addGeneralSettings(parameterDto);

    request.subscribe({
      next: (response) => {
        console.log('Save successful:', response);
        this.isSubmitting = false;
        Swal.fire({
          icon: 'success',
          title: this.data.parameterId ? 'Paramètre modifié' : 'Paramètre ajouté',
          text: this.data.parameterId ? 'Le paramètre a été modifié avec succès' : 'Le paramètre a été ajouté avec succès',
          timer: 2000,
          showConfirmButton: false
        }).then(() => this.dialogRef.close(true));
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Error saving parameter:');
        console.error('Status:', error.status);
        console.error('URL:', error.url);
        console.error('Error object:', error);
        console.error('Error response:', error.error);
        
        let errorMessage = 'Une erreur est survenue lors de l\'enregistrement';
        
        if (error.status === 400) {
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.error?.title) {
            errorMessage = error.error.title;
          } else if (error.error?.errors) {
            const errors = error.error.errors;
            console.log('Validation errors:', errors);
            
            if (errors.parameterType) {
              errorMessage = `Type: ${errors.parameterType.join(', ')}`;
            } else if (errors.parameterCode) {
              errorMessage = `Code: ${errors.parameterCode.join(', ')}`;
            } else if (errors.description) {
              errorMessage = `Description: ${errors.description.join(', ')}`;
            } else {
              const firstKey = Object.keys(errors)[0];
              if (firstKey) {
                errorMessage = errors[firstKey][0];
              }
            }
          }
        } else if (error.status === 409 || (error.status === 400 && error.error?.message?.includes('existe déjà'))) {
          errorMessage = 'Ce code de paramètre existe déjà pour ce type';
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

  onCancel() {
    this.dialogRef.close();
  }

  private markFormGroupTouched(formGroup: any) {
    Object.keys(formGroup.controls).forEach(field => {
      const control = formGroup.get(field);
      control.markAsTouched({ onlySelf: true });
    });
  }

  getErrorMessage(controlName: string): string {
    const control = this.parameterForm.get(controlName);
    
    if (controlName === 'parameterType') {
      if (control?.hasError('required')) return 'Le type de paramètre est obligatoire';
    }
    
    if (controlName === 'parameterCode') {
      if (control?.hasError('required')) return 'Le code est obligatoire';
      if (control?.hasError('maxlength')) return 'Le code ne doit pas dépasser 50 caractères';
    }
    
    return '';
  }

formatParameterType(type: string): string {
  const typeMap: { [key: string]: string } = {
    'GOVERNORATE': 'Gouvernorat',
    'REGION': 'Région',
    'ZONE': 'Zone',
    'EMPLOYEE_CATEGORY': 'Catégorie d\'employé',
    'ORDER': 'Commande',
    'TRIP': 'Voyage'
  };
  return typeMap[type] || type;
}
}