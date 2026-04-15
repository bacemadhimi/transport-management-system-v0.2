import {
  Component,
  inject,
  OnInit,
  AfterViewInit,
  ViewChild,
  ElementRef,
  OnDestroy
} from '@angular/core';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  FormsModule,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { DragDropModule, CdkDragDrop, transferArrayItem } from '@angular/cdk/drag-drop';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import Swal from 'sweetalert2';

import { Http } from '../../../services/http';
import { IUser } from '../../../types/user';
import { IUserGroup } from '../../../types/userGroup';
import { Translation } from '../../../services/Translation';

@Component({
  selector: 'app-user-form',
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
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatTabsModule,
    DragDropModule,
    MatTooltipModule,
  ],
  templateUrl: './user-form.html',
  styleUrls: ['./user-form.scss']
})
export class UserForm implements OnInit, AfterViewInit, OnDestroy {
  private fb = inject(FormBuilder);
  private httpService = inject(Http);
  private dialogRef = inject(MatDialogRef<UserForm>);
  private destroy$ = new Subject<void>();

  data = inject<{ userId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  @ViewChild('phoneInput', { static: true }) phoneInput!: ElementRef<HTMLInputElement>;
  @ViewChild('fileInput', { static: true }) fileInput!: ElementRef<HTMLInputElement>;

  private iti: any;

  isSubmitting = false;
  loadingRoles = false;
  searchTerm = '';

  allRoles: IUserGroup[] = [];
  availableRoles: IUserGroup[] = [];
  memberRoles: IUserGroup[] = [];
  filteredAvailableRoles: IUserGroup[] = [];
  filteredMemberRoles: IUserGroup[] = [];

  hasPhoto = false;
  isPhotoChanged = false;
  imagePreview: string | null = null;
  fileError: string | null = null;
  originalImageBase64: string | null = null;

  userForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [this.validatePhone.bind(this)]],
    profileImage: [''],
    password: [''],
    userGroupIds: [[] as number[], Validators.required]
  });

  ngOnInit(): void {
    this.loadRoles();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.loadIntlTelInput());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadRoles(): void {
    this.loadingRoles = true;
    this.httpService.getAllRoles().pipe(takeUntil(this.destroy$)).subscribe({
      next: (roles) => {
        this.allRoles = roles;
        this.availableRoles = [...roles];
        this.filteredAvailableRoles = [...roles];
        this.loadingRoles = false;

        if (this.data.userId) this.loadUserData();
      },
      error: () => {
        this.loadingRoles = false;
        Swal.fire('Erreur', 'Impossible de charger les rôles', 'error');
      }
    });
  }

  drop(event: CdkDragDrop<IUserGroup[]>): void {
    if (event.previousContainer === event.container) return;
    transferArrayItem(
      event.previousContainer.data,
      event.container.data,
      event.previousIndex,
      event.currentIndex
    );
    this.syncFormRoles();
    this.filterRoles();
  }

  addToMemberRoles(role: IUserGroup): void {
    if (!this.memberRoles.includes(role)) {
      this.memberRoles.push(role);
      this.availableRoles = this.availableRoles.filter(r => r.id !== role.id);
      this.syncFormRoles();
      this.filterRoles();
    }
  }

  removeFromMemberRoles(role: IUserGroup): void {
    this.memberRoles = this.memberRoles.filter(r => r.id !== role.id);
    this.availableRoles.push(role);
    this.syncFormRoles();
    this.filterRoles();
  }

  addAllRoles(): void {
    this.availableRoles.forEach(role => this.addToMemberRoles(role));
  }

  removeAllRoles(): void {
    this.availableRoles.push(...this.memberRoles);
    this.memberRoles = [];
    this.syncFormRoles();
    this.filterRoles();
  }

  private syncFormRoles(): void {
    this.userForm.patchValue({
      userGroupIds: this.memberRoles.map(r => r.id)
    });
  }

  filterRoles(): void {
    const term = this.searchTerm.toLowerCase().trim();
    this.filteredAvailableRoles = this.availableRoles.filter(r => r.name.toLowerCase().includes(term));
    this.filteredMemberRoles = this.memberRoles.filter(r => r.name.toLowerCase().includes(term));
  }

  private loadIntlTelInput(): void {
    this.iti = (window as any).intlTelInput(this.phoneInput.nativeElement, {
      initialCountry: 'tn',
      separateDialCode: true
    });
  }

  private validatePhone(control: AbstractControl): ValidationErrors | null {
    if (!this.iti || !control.value) return null;
    return this.iti.isValidNumber() ? null : { invalidPhone: true };
  }

  getErrorMessage(field: string): string {
    const control = this.userForm.get(field);
    if (!control) return '';
    if (control.hasError('required')) return 'Champ obligatoire';
    if (control.hasError('email')) return 'Email invalide';
    if (control.hasError('minlength')) return `Minimum ${control.errors!['minlength'].requiredLength} caractères`;
    if (control.hasError('invalidPhone')) return 'Numéro invalide';
    return '';
  }

onSubmit(): void {
  if (this.userForm.invalid || this.isSubmitting) return;
  if (this.memberRoles.length === 0) {
    Swal.fire('Erreur', 'Veuillez sélectionner au moins un rôle', 'error');
    return;
  }

  this.isSubmitting = true;

  const phoneNumber = this.iti ? this.iti.getNumber() : this.userForm.value.phone;


  let profileImage = this.userForm.value.profileImage;


  if (profileImage && typeof profileImage === 'string' && profileImage.startsWith('data:image/')) {
    profileImage = this.extractPureBase64(profileImage);
  }

  const payload = {
    name: this.userForm.value.name,
    email: this.userForm.value.email,
    phone: phoneNumber,
    userGroupIds: this.userForm.value.userGroupIds,
    profileImage: profileImage,
    password: this.userForm.value.password
  };

  const request$ = this.data.userId
    ? this.httpService.UpdateUserById(this.data.userId, payload)
    : this.httpService.addUser(payload);

  request$.pipe(takeUntil(this.destroy$)).subscribe({
    next: () => {
      Swal.fire('Succès', 'Utilisateur enregistré', 'success');
      this.dialogRef.close(true);
    },
    error: (error) => {
      console.error('Error:', error);
      this.isSubmitting = false;
      Swal.fire('Erreur', error.error?.message || 'Échec de l\'opération', 'error');
    }
  });
}
  onCancel(): void {
    this.dialogRef.close();
  }

onFileSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (!input.files?.length) return;

  const file = input.files[0];


  if (file.size > 2 * 1024 * 1024) {
    this.fileError = 'L\'image est trop volumineuse. Maximum 2MB.';
    input.value = '';
    return;
  }

  if (!file.type.match(/image\/(jpeg|jpg|png|gif)/)) {
    this.fileError = 'Format d\'image non supporté. Utilisez JPEG, PNG ou GIF.';
    input.value = '';
    return;
  }


  this.fileError = null;
  this.hasPhoto = true;
  this.isPhotoChanged = true;

  const reader = new FileReader();
  reader.onload = () => {

    const dataUrl = reader.result as string;
    this.imagePreview = dataUrl;


    const pureBase64 = this.extractPureBase64(dataUrl);
    this.userForm.patchValue({ profileImage: pureBase64 });
  };

  reader.onerror = () => {
    this.fileError = 'Erreur lors de la lecture du fichier';
    input.value = '';
  };

  reader.readAsDataURL(file);
}


private extractPureBase64(dataUrl: string): string {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return '';

  const base64Marker = 'base64,';
  const base64Index = dataUrl.indexOf(base64Marker);

  if (base64Index === -1) return '';

  return dataUrl.substring(base64Index + base64Marker.length);
}

 private translation = inject(Translation);
  t(key: string): string { return this.translation.t(key); }

private loadUserData(): void {
  if (!this.data.userId) return;
  this.httpService.getUserById(this.data.userId).pipe(takeUntil(this.destroy$)).subscribe({
    next: (user: IUser) => {
      this.userForm.patchValue({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        userGroupIds: user.userGroupIds || [],
        profileImage: user.profileImage || ''
      });

      this.memberRoles = this.allRoles.filter(r => user.userGroupIds?.includes(r.id));
      this.availableRoles = this.allRoles.filter(r => !user.userGroupIds?.includes(r.id));
      this.filteredMemberRoles = [...this.memberRoles];
      this.filteredAvailableRoles = [...this.availableRoles];

      if (user.profileImage) {

        if (this.isPureBase64(user.profileImage)) {

          this.imagePreview = this.createDataUrl(user.profileImage);
        } else {

          this.imagePreview = user.profileImage;
        }
        this.hasPhoto = true;
        this.originalImageBase64 = user.profileImage;
      }
    },
    error: () => Swal.fire('Erreur', 'Impossible de charger l\'utilisateur', 'error')
  });
}



private createDataUrl(base64: string): string {
  if (!base64) return 'default-avatar.png';


  let mimeType = 'image/jpeg';

  if (base64.startsWith('iVBORw0KGg')) {
    mimeType = 'image/png';
  } else if (base64.startsWith('/9j/')) {
    mimeType = 'image/jpeg';
  } else if (base64.startsWith('R0lGOD')) {
    mimeType = 'image/gif';
  }

  return `data:${mimeType};base64,${base64}`;
}

private isPureBase64(str: string): boolean {
  if (!str || typeof str !== 'string') return false;


  const trimmed = str.replace(/\s/g, '');


  if (trimmed.startsWith('data:image/')) return false;


  const base64Pattern = /^[A-Za-z0-9+/=]+$/;

  if (!base64Pattern.test(trimmed)) return false;


  if (trimmed.length % 4 !== 0) return false;


  try {
    const decoded = atob(trimmed);

    const reEncoded = btoa(decoded);
    return reEncoded === trimmed;
  } catch {
    return false;
  }
}

onImageError(event: any): void {
  event.target.src = 'default-avatar.png';
  event.target.onerror = null;
}

  onDeletePhoto(): void {
    this.hasPhoto = false;
    this.isPhotoChanged = true;
    this.imagePreview = null;
    this.userForm.patchValue({ profileImage: null });
  }
}