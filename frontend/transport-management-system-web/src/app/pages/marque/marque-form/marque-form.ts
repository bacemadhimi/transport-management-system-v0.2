import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Http } from '../../../services/http';
import { IMarque, IMarqueDto } from '../../../types/marque';
import { MatIconModule } from '@angular/material/icon';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-marque-form',
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
    MatIconModule
  ],
  templateUrl: './marque-form.html',
  styleUrls: ['./marque-form.scss']
})
export class MarqueForm implements OnInit {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<MarqueForm>);
  data = inject<{ marqueId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  isSubmitting = false;


  marqueForm = this.fb.group({
    name: this.fb.control<string>('', [Validators.required, Validators.minLength(2)]),
  });

  ngOnInit() {
    if (this.data.marqueId) {
      this.loadMarque();
    }
  }

  loadMarque() {
    this.httpService.getMarque(this.data.marqueId!).subscribe({
      next: (marque: IMarque) => {
        console.log("Marque loaded:", marque);
        this.marqueForm.patchValue({
          name: marque.name
        });
      },
      error: (error) => {
        console.error('Error loading marque:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Impossible de charger les données de la marque',
          confirmButtonText: 'OK'
        }).then(() => this.dialogRef.close());
      }
    });
  }

  onSubmit() {
    if (this.marqueForm.invalid || this.isSubmitting) {
      this.markFormGroupTouched(this.marqueForm);
      return;
    }

    this.isSubmitting = true;


    const marqueDto: IMarqueDto = {
      name: this.marqueForm.value.name!.trim()
    };


    if (this.data.marqueId) {
      marqueDto.id = this.data.marqueId;
    }

    console.log('Submitting DTO:', marqueDto);

    const request = this.data.marqueId
      ? this.httpService.updateMarque(this.data.marqueId, marqueDto)
      : this.httpService.addMarque(marqueDto);

    request.subscribe({
      next: (response) => {
        console.log('Save successful:', response);
        this.isSubmitting = false;
        Swal.fire({
          icon: 'success',
          title: this.data.marqueId ? 'Marque modifiée' : 'Marque ajoutée',
          text: this.data.marqueId ? 'La marque a été modifiée avec succès' : 'La marque a été ajoutée avec succès',
          timer: 2000,
          showConfirmButton: false
        }).then(() => this.dialogRef.close(true));
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Error saving marque:');
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

            if (errors.name) {
              errorMessage = `Name: ${errors.name.join(', ')}`;
            } else if (errors.model) {

              console.warn('Unexpected "model" validation error - check backend DTO');
              errorMessage = 'Erreur de validation. Vérifiez que vous utilisez le bon endpoint.';
            } else {

              const firstKey = Object.keys(errors)[0];
              if (firstKey) {
                errorMessage = errors[firstKey][0];
              }
            }
          }
        } else if (error.status === 409 || error.status === 400 && error.error?.message?.includes('existe déjà')) {
          errorMessage = 'Cette marque existe déjà';
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
    const control = this.marqueForm.get(controlName);
    if (control?.hasError('required')) return 'Le nom de la marque est obligatoire';
    if (control?.hasError('minlength')) return 'Le nom doit contenir au moins 2 caractères';
    return '';
  }
}