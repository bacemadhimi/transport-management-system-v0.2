import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  FormsModule
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import {
  MatDialogModule,
  MAT_DIALOG_DATA,
  MatDialogRef
} from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatDividerModule } from '@angular/material/divider';
import { trigger, transition, style, animate } from '@angular/animations';

import Swal from 'sweetalert2';
import { Http } from '../../../services/http';
import { IUserGroup } from '../../../types/userGroup';

@Component({
  selector: 'app-role-form',
  standalone: true,
  animations: [
    trigger('slideFade', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-out')
      ]),
      transition(':leave', [
        animate('200ms ease-in',
          style({ opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatDialogModule,
    MatSelectModule,
    MatRadioModule,
    MatDividerModule
  ],
  templateUrl: './role-form.html',
  styleUrls: ['./role-form.scss']
})
export class RoleForm implements OnInit {

  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<RoleForm>);
  data = inject<{ groupId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  groups: IUserGroup[] = [];
  parentPermissions: string[] = [];

  roleForm = this.fb.group({
    name: ['', Validators.required],
    inherit: [false],
    parentGroupId: [null]
  });

  ngOnInit(): void {

    // Chargement groupes existants
    if (!this.data.groupId) {
      this.httpService.getAllRoles().subscribe(res => {
        this.groups = res;
      });
    }

    // Edition
    if (this.data.groupId) {
      this.httpService.getRole(this.data.groupId).subscribe(group => {
        this.roleForm.patchValue({ name: group.name });
      });
    }
  }

  onParentChange(groupId: number) {
    this.httpService.getGroupPermissions(groupId)
      .subscribe(perms => {
        this.parentPermissions = perms;
      });
  }

onSubmit() {
  if (this.roleForm.invalid) return;

  // MODIFICATION
  if (this.data.groupId) {
    this.httpService.updateRole(this.data.groupId, {
      id: this.data.groupId,
      name: this.roleForm.value.name
    }).subscribe({
      next: () => this.success('Groupe modifié avec succès'),
      error: () => this.error()
    });
    return;
  }

  // CRÉATION AVEC OU SANS HÉRITAGE
  const payload = {
    name: this.roleForm.value.name,
    parentGroupId: this.roleForm.value.inherit
      ? this.roleForm.value.parentGroupId
      : null
  };

this.httpService.createRoleWithInheritance(payload)
  .subscribe({
    next: () => {
      this.success('Groupe ajouté avec succès');
    },
    error: (err) => {
      console.error('Erreur HTTP mais création OK ?', err);

      // 🔥 CAS PARTICULIER : le backend a créé mais Angular râle
      if (err?.status === 200 || err?.status === 201) {
        this.success('Groupe ajouté avec succès');
      } else {
        this.error();
      }
    }
  });

}
error() {
  Swal.fire({
    icon: 'error',
    title: 'Erreur',
    text: 'Une erreur est survenue lors de l’enregistrement',
    confirmButtonText: 'OK'
  });
}

  success(message: string) {
    Swal.fire({
      icon: 'success',
      title: message,
      confirmButtonText: 'OK',
      allowOutsideClick: false
    }).then(() => this.dialogRef.close(true));
  }

  onCancel() {
    this.dialogRef.close();
  }
}
