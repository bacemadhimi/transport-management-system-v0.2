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
import { IGeneralSettings, IGeneralSettingsDto } from '../../../types/general-settings';
import { MatIconModule } from '@angular/material/icon';
import Swal from 'sweetalert2';
import { MatTooltipModule } from '@angular/material/tooltip';

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
    MatIconModule,
    MatTooltipModule
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


  readonly parameterType = 'EMPLOYEE_CATEGORY';


  readonly suggestedCodes = [
    'DRIVER',
    'CONVOYEUR',
    'MECHANIC',
    'ADMIN',
    'MANAGER',
    'SUPERVISOR',
    'OPERATOR',
    'LOADER',
    'DISPATCHER',
    'PLANNER'
  ];


  parameterForm = this.fb.group({
    parameterCode: this.fb.control<string>('', [
      Validators.required,
      Validators.maxLength(50),
      Validators.pattern(/^[A-Z0-9_]+$/)
    ]),
    description: this.fb.control<string>('', [
      Validators.required,
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



        const [code] = this.parseParameterCode(parameter.parameterCode);

        this.parameterForm.patchValue({
          parameterCode: code,
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


  private parseParameterCode(parameterCode: string): [string, string] {
    const parts = parameterCode.split('=');
    if (parts.length === 2) {
      return [parts[0], parts[1]];
    }

    return [parameterCode, ''];
  }

  selectSuggestedCode(code: string) {
    this.parameterForm.patchValue({
      parameterCode: code
    });
  }

  onSubmit() {
    if (this.parameterForm.invalid || this.isSubmitting) {
      this.markFormGroupTouched(this.parameterForm);
      return;
    }

    this.isSubmitting = true;

    const formValue = this.parameterForm.value;



    const fullParameterCode = `${formValue.parameterCode!.trim().toUpperCase()}=true`;


    const parameterDto: IGeneralSettingsDto = {
      parameterType: this.parameterType,
      parameterCode: fullParameterCode,
      description: formValue.description!.trim()
    };

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
          title: this.data.parameterId ? 'Catégorie modifiée' : 'Catégorie ajoutée',
          text: this.data.parameterId ? 'La catégorie a été modifiée avec succès' : 'La catégorie a été ajoutée avec succès',
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

            if (errors.parameterCode) {
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
          errorMessage = 'Ce code de catégorie existe déjà';
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

    if (controlName === 'parameterCode') {
      if (control?.hasError('required')) return 'Le code est obligatoire';
      if (control?.hasError('maxlength')) return 'Le code ne doit pas dépasser 50 caractères';
      if (control?.hasError('pattern')) return 'Utilisez uniquement des majuscules, chiffres et underscores';
    }

    if (controlName === 'description') {
      if (control?.hasError('required')) return 'La description est obligatoire';
      if (control?.hasError('maxlength')) return 'La description ne doit pas dépasser 200 caractères';
    }

    return '';
  }
}