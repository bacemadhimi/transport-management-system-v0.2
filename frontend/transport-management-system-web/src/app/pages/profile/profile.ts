import { Component, inject, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTabsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './profile.html',
  styleUrls: ['./profile.scss']
})
export class Profile implements OnInit, AfterViewInit {
  authService = inject(Auth);
  fb = inject(FormBuilder);
  
  @ViewChild('phoneInput') phoneInput!: ElementRef<HTMLInputElement>;
  private iti: any;
  
 
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  

  imageSrc!: string;
  isUpdatingProfile = false;
  isChangingPassword = false;
  
 
  showPasswordStrength = false;
  passwordStrengthText = 'Faible';
  passwordStrengthClass = 'strength-weak';
  passwordStrengthColor = 'text-red-600';
  hasMinLength = false;
  hasUpperCase = false;
  hasLowerCase = false;
  hasNumber = false;
  hasSpecialChar = false;

  ngOnInit() {
    
    this.profileForm = this.fb.group({
      email: ['', [Validators.email]],
      profileImage: [''],
      phone: ['', [Validators.required, this.validatePhone.bind(this)]],
      name: ['', [Validators.required, Validators.minLength(2)]],
      specialAdminField: ['']
    });
    
 
    this.passwordForm = this.fb.group({
      oldPassword: [''],
      newPassword: ['', [
        Validators.minLength(7),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{7,}$/)
      ]],
      confirmPassword: ['']
    }, { 
      validators: this.passwordMatchValidator 
    });


    this.loadProfileData();
    
    
    this.passwordForm.get('newPassword')?.valueChanges.subscribe(() => {
      this.checkPasswordStrength();
    });
  }

  
loadProfileData() {
  this.authService.getProfile().subscribe((result: any) => {
    this.profileForm.patchValue({
      email: result.email || '',
      name: result.name || '',
      phone: result.phone || '',
      specialAdminField: result.specialAdminField || ''
    });
    

    const profileImage = result.profileImage || '';
    
    if (profileImage) {
      
      if (this.isPureBase64(profileImage)) {
        
        this.imageSrc = this.createDataUrl(profileImage);
        
        this.profileForm.patchValue({
          profileImage: profileImage
        });
      } else if (profileImage.startsWith('data:image/')) {
       
        this.imageSrc = profileImage;
    
        const pureBase64 = this.extractPureBase64(profileImage);
        this.profileForm.patchValue({
          profileImage: pureBase64
        });
      } else {
        
        this.imageSrc = profileImage;
        this.profileForm.patchValue({
          profileImage: ''
        });
      }
    } else {
      this.imageSrc = '/default-avatar.png';
      this.profileForm.patchValue({
        profileImage: ''
      });
    }
  });
}
  
  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      group.get('confirmPassword')?.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    return null;
  }

 
  get passwordMismatch(): boolean {
    const newPassword = this.passwordForm.get('newPassword')?.value;
    const confirmPassword = this.passwordForm.get('confirmPassword')?.value;
    return newPassword && confirmPassword && newPassword !== confirmPassword;
  }

 
  checkPasswordStrength() {
    const password = this.passwordForm.get('newPassword')?.value || '';
    
    if (!password) {
      this.showPasswordStrength = false;
      return;
    }
    
    this.showPasswordStrength = true;
    
  
    this.hasMinLength = password.length >= 7;
    this.hasUpperCase = /[A-Z]/.test(password);
    this.hasLowerCase = /[a-z]/.test(password);
    this.hasNumber = /\d/.test(password);
    this.hasSpecialChar = /[@$!%*?&]/.test(password);
    

    const criteriaMet = [
      this.hasMinLength,
      this.hasUpperCase,
      this.hasLowerCase,
      this.hasNumber,
      this.hasSpecialChar
    ].filter(Boolean).length;
    
    
    if (criteriaMet <= 2) {
      this.passwordStrengthText = 'Faible';
      this.passwordStrengthClass = 'strength-weak';
      this.passwordStrengthColor = 'text-red-600';
    } else if (criteriaMet <= 4) {
      this.passwordStrengthText = 'Moyen';
      this.passwordStrengthClass = 'strength-medium';
      this.passwordStrengthColor = 'text-yellow-600';
    } else {
      this.passwordStrengthText = 'Fort';
      this.passwordStrengthClass = 'strength-strong';
      this.passwordStrengthColor = 'text-green-600';
    }
  }

 
  ngAfterViewInit() {
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
        if (this.phoneInput?.nativeElement) {
          this.iti = (window as any).intlTelInput(
            this.phoneInput.nativeElement,
            {
              initialCountry: 'tn',
              separateDialCode: true,
              nationalMode: false,
              formatOnDisplay: true,
              utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@19.1.1/build/js/utils.js'
            }
          );

          
          this.phoneInput.nativeElement.addEventListener('blur', () => {
            const number = this.iti.getNumber();
            this.profileForm.get('phone')?.setValue(number);
          });

        
          setTimeout(() => {
            const currentPhone = this.profileForm.get('phone')?.value;
            if (currentPhone && this.iti) {
              this.iti.setNumber(currentPhone);
            }
          }, 0);
        }
      })
      .catch(() => {
        console.error('Failed to load intl-tel-input scripts.');
      });
  }
private validatePhone(control: any) {
    if (!this.iti) return null;
    return this.iti.isValidNumber() ? null : { pattern: true };
  }
  
fileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    
    if (file.size > 2 * 1024 * 1024) {
      alert('L\'image est trop volumineuse. Maximum 2MB.');
      return;
    }
    
    if (!file.type.match(/image\/(jpeg|jpg|png|gif)/)) {
      alert('Format d\'image non supporté. Utilisez JPEG, PNG ou GIF.');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.imageSrc = dataUrl; 
      
      
      const pureBase64 = this.extractPureBase64(dataUrl);
      
      this.profileForm.patchValue({
        profileImage: pureBase64, 
      });
    };
    reader.readAsDataURL(file);
  }
}
  // Update profile
 onUpdateProfile() {
  if (!this.profileForm.valid || this.isUpdatingProfile) return;

  this.isUpdatingProfile = true;
  
  const profileImageValue = this.profileForm.value.profileImage;
  let pureBase64 = '';
  
  if (profileImageValue) {
  
    if (typeof profileImageValue === 'string' && profileImageValue.startsWith('data:image/')) {
     
      const base64Index = profileImageValue.indexOf('base64,');
      if (base64Index !== -1) {
        pureBase64 = profileImageValue.substring(base64Index + 7); 
      } else {
    
        console.warn('Malformed data URL, using as-is');
        pureBase64 = profileImageValue;
      }
    } else {
 
      pureBase64 = profileImageValue;
    }
  }
  
  const formData = {
    name: this.profileForm.value.name,
    email: this.profileForm.value.email,
    phone: this.iti?.getNumber() || this.profileForm.value.phone,
    profileImage: pureBase64, 
    specialAdminField: this.profileForm.value.specialAdminField
  };

  this.authService.updateProfile(formData).subscribe({
    next: () => {
      this.isUpdatingProfile = false;
      alert('Profil mis à jour avec succès');
      
      this.authService.loadLoggedInUser();
    },
    error: (error) => {
      console.error('Error updating profile:', error);
      this.isUpdatingProfile = false;
      alert(error.error?.message || 'Erreur lors de la mise à jour du profil');
    }
  });
}

  // Change password
  onChangePassword() {
    if (!this.passwordForm.valid || this.isChangingPassword || this.passwordMismatch) return;

    const oldPassword = this.passwordForm.value.oldPassword;
    const newPassword = this.passwordForm.value.newPassword;

   
    if (!oldPassword && !newPassword) {
      alert('Veuillez remplir les champs pour changer le mot de passe');
      return;
    }

    this.isChangingPassword = true;

    this.authService.changePassword({
      oldPassword: oldPassword,
      newPassword: newPassword
    }).subscribe({
      next: () => {
        this.isChangingPassword = false;
        alert('Mot de passe changé avec succès');
        this.resetPasswordForm();
      },
      error: (error) => {
        console.error('Error changing password:', error);
        this.isChangingPassword = false;
        alert(error.error?.message || 'Erreur lors du changement de mot de passe');
      }
    });
  }

  
  resetPasswordForm() {
    this.passwordForm.reset();
    this.showPasswordStrength = false;
  }


  getErrorMessage(controlName: string): string {
    const control = this.profileForm.get(controlName);
    
    if (control?.hasError('required')) {
      return 'Ce champ est requis';
    }
    
    if (control?.hasError('minlength')) {
      return 'Minimum 2 caractères';
    }
    
    if (control?.hasError('email')) {
      return 'Email invalide';
    }
    
    return '';
  }
   ngOnDestroy() {
    if (this.iti) {
      this.iti.destroy();
    }
  }

private extractPureBase64(dataUrl: string): string {
  if (!dataUrl || !dataUrl.startsWith('data:image/')) return '';
  
  const base64Marker = 'base64,';
  const base64Index = dataUrl.indexOf(base64Marker);
  
  if (base64Index === -1) return '';
  
  return dataUrl.substring(base64Index + base64Marker.length);
}


private createDataUrl(base64: string): string {
  if (!base64) return '/default-avatar.png';
  
 
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
}