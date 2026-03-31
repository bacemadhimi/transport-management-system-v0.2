import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Http } from '../../../services/http';
import { ICategorys } from '../../../types/categorys';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatDialogModule
  ],
  templateUrl: './categories-form.html',
  styleUrls: ['./categories-form.scss']
})
export class CategoryForm implements OnInit {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<CategoryForm>);
  data = inject<{ categoryId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  categoryForm = this.fb.group({
    name: this.fb.control<string>('', [Validators.required])
  });

  ngOnInit() {
    if (this.data.categoryId) {
      this.httpService.getCategory(this.data.categoryId).subscribe((category: ICategorys) => {
        this.categoryForm.patchValue({
          name: category.name
        });
      });
    }
  }

  onSubmit() {
    if (!this.categoryForm.valid) return;

    const value = {
      id: this.data.categoryId || 0,
      name: this.categoryForm.value.name!
    };

    if (this.data.categoryId) {
      this.httpService.updateCategory(this.data.categoryId, value).subscribe(() => {
        Swal.fire({
          icon: 'success',
          title: 'Catégorie modifiée avec succès',
          confirmButtonText: 'OK',
          allowOutsideClick: false,
          customClass: {
            popup: 'swal2-popup-custom',
            title: 'swal2-title-custom',
            icon: 'swal2-icon-custom',
            confirmButton: 'swal2-confirm-custom'
          }
        }).then(() => this.dialogRef.close(true));
      });
    } else {
      this.httpService.addCategory(value).subscribe(() => {
        Swal.fire({
          icon: 'success',
          title: 'Catégorie ajoutée avec succès',
          confirmButtonText: 'OK',
          allowOutsideClick: false,
          customClass: {
            popup: 'swal2-popup-custom',
            title: 'swal2-title-custom',
            icon: 'swal2-icon-custom',
            confirmButton: 'swal2-confirm-custom'
          }
        }).then(() => this.dialogRef.close(true));
      });
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}