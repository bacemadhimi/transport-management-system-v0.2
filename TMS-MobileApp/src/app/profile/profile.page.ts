import { Component, OnInit, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { 
  IonContent, 
  IonButton, IonIcon, IonCardHeader, 
  IonLabel, IonInput,
  IonSegment, IonSegmentButton,
  IonSpinner, 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { 
  personOutline, mailOutline, callOutline, lockClosedOutline, 
  eyeOutline, eyeOffOutline, cameraOutline, logOutOutline,
  checkmarkCircleOutline, alertCircleOutline, saveOutline,
  shieldOutline, settingsOutline, keyOutline, personCircleOutline,
  timeOutline, calendarOutline, listOutline, bookOutline, refreshOutline
} from 'ionicons/icons';

import { AuthService } from '../services/auth.service';
import { HttpService, UserDto, ChangePasswordDto } from '../services/http.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    IonContent,
    IonButton, IonIcon,
    IonLabel, IonInput,
    IonSegment, IonSegmentButton,
    IonSpinner, 
  ]
})
export class ProfilePage implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  

  private authService = inject(AuthService);
  private httpService = inject(HttpService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  
 
  user: any = null;
  

  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  

  selectedSegment: 'profile' | 'password' = 'profile';
  
 
  isLoading = false;
  isUpdatingProfile = false;
  isChangingPassword = false;
  

  profileImageSrc = 'assets/avatar-default.png';
  

  showoldPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;
  

  currentUserGroupIds: number[] = [];
  
 
  showPasswordStrength = false;
  passwordStrength = {
    text: 'Weak',
    class: 'strength-weak',
    color: 'danger',
    score: 0
  };
  
  passwordRequirements = {
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false
  };

  constructor() {
  
    addIcons({
      personOutline, mailOutline, callOutline, lockClosedOutline,
      eyeOutline, eyeOffOutline, cameraOutline, logOutOutline,
      checkmarkCircleOutline, alertCircleOutline, saveOutline,
      shieldOutline, settingsOutline, keyOutline, personCircleOutline,
      timeOutline, calendarOutline, listOutline, bookOutline, refreshOutline
    });
  }

  ngOnInit() {
    this.initializeForms();
    this.loadUserProfile();
  }

  initializeForms() {
  
    this.profileForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.pattern(/^[+]?[0-9\s\-]+$/)]],
      profileImage: ['']
    });

   
    this.passwordForm = this.fb.group({
      oldPassword: ['', [Validators.required]],
      newPassword: ['', [
        Validators.required,
        Validators.minLength(7),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{7,}$/)
      ]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    
    this.passwordForm.get('newPassword')?.valueChanges.subscribe(() => {
      this.checkPasswordStrength();
    });
  }

  async loadUserProfile() {
   
    this.user = this.authService.currentUser();
    
 
    if (!this.authService.isLoggedIn() || !this.user) {
      this.router.navigate(['/login']);
      return;
    }

    this.isLoading = true;
    
    try {
     
      const profileData = await this.httpService.getUserById(this.user.id).toPromise();
      
      if (profileData) {
        
        this.currentUserGroupIds = profileData.userGroupIds || [];
        
       
        this.profileForm.patchValue({
          name: profileData.name || this.user.name || '',
          email: profileData.email || this.user.email || '',
          phone: profileData.phone || this.user.phone || '',
          profileImage: profileData.profileImage || ''
        });

      
        if (profileData.profileImage) {
          this.profileImageSrc = this.httpService.createDataUrlFromBase64(profileData.profileImage);
        } else if (this.user.profileImage) {
          this.profileImageSrc = this.user.profileImage;
        } else {
          this.profileImageSrc = 'assets/avatar-default.png';
        }

       
        const updatedUser = {
          ...this.user,
          name: profileData.name || this.user.name,
          phone: profileData.phone || this.user.phone,
          profileImage: profileData.profileImage || this.user.profileImage,
          userGroupIds: this.currentUserGroupIds 
        };
        
       
        this.saveUpdatedUserToLocalStorage(updatedUser);
        this.user = updatedUser;
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      await this.showAlert('Error', 'Failed to load profile data');
    } finally {
      this.isLoading = false;
    }
  }


  private saveUpdatedUserToLocalStorage(updatedUser: any) {
    localStorage.setItem('authToken', JSON.stringify(updatedUser));
    
    this.authService.currentUser.set(updatedUser);
  }

 
  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  }

  get passwordMismatch(): boolean {
    return this.passwordForm.hasError('passwordMismatch');
  }

 
  checkPasswordStrength() {
    const password = this.passwordForm.get('newPassword')?.value || '';
    
    if (!password) {
      this.showPasswordStrength = false;
      return;
    }
    
    this.showPasswordStrength = true;
    
   
    this.passwordRequirements = {
      minLength: password.length >= 7,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[@$!%*?&]/.test(password)
    };

  
    const metCount = Object.values(this.passwordRequirements).filter(Boolean).length;
    
    if (metCount <= 2) {
      this.passwordStrength = {
        text: 'Weak',
        class: 'strength-weak',
        color: 'danger',
        score: 1
      };
    } else if (metCount <= 4) {
      this.passwordStrength = {
        text: 'Medium',
        class: 'strength-medium',
        color: 'warning',
        score: 2
      };
    } else {
      this.passwordStrength = {
        text: 'Strong',
        class: 'strength-strong',
        color: 'success',
        score: 3
      };
    }
  }

 
  togglePasswordVisibility(field: 'current' | 'new' | 'confirm') {
    switch (field) {
      case 'current':
        this.showoldPassword = !this.showoldPassword;
        break;
      case 'new':
        this.showNewPassword = !this.showNewPassword;
        break;
      case 'confirm':
        this.showConfirmPassword = !this.showConfirmPassword;
        break;
    }
  }


  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    
   
    if (file.size > 2 * 1024 * 1024) {
      await this.showAlert('Error', 'Image must be less than 2MB');
      return;
    }

    if (!file.type.match(/image\/(jpeg|jpg|png|gif)/)) {
      await this.showAlert('Error', 'Only JPG, PNG, and GIF images are allowed');
      return;
    }

 
    if (!this.user) {
      await this.showAlert('Error', 'You must be logged in to upload an image');
      return;
    }

    this.isUpdatingProfile = true;
    
    try {
      
      const base64Image = await this.fileToBase64(file);
      const pureBase64 = this.extractPureBase64(base64Image);

     
      const updateData: UserDto = {
        name: this.profileForm.value.name || this.user.name || '',
        email: this.profileForm.value.email || this.user.email || '',
        phone: this.profileForm.value.phone || this.user.phone || '',
        profileImage: pureBase64,
        userGroupIds: this.currentUserGroupIds 
      };

      await this.httpService.updateUser(this.user.id, updateData).toPromise();
      
     
      this.profileImageSrc = base64Image;
      this.profileForm.patchValue({ profileImage: pureBase64 });
      
     
      const updatedUser = {
        ...this.user,
        profileImage: pureBase64
      };
      this.saveUpdatedUserToLocalStorage(updatedUser);
      this.user = updatedUser;
      
      await this.showToast('Profile image updated successfully!', 'success');
    } catch (error) {
      console.error('Error uploading image:', error);
      await this.showAlert('Error', 'Failed to upload image');
    } finally {
      this.isUpdatingProfile = false;
    }
  }

  
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private extractPureBase64(dataUrl: string): string {
    if (!dataUrl.startsWith('data:image/')) return dataUrl;
    const base64Marker = 'base64,';
    const base64Index = dataUrl.indexOf(base64Marker);
    return base64Index !== -1 ? dataUrl.substring(base64Index + base64Marker.length) : '';
  }


  async updateProfile() {
    if (this.profileForm.invalid || this.isUpdatingProfile || !this.user) return;

    this.isUpdatingProfile = true;
    
    try {
      const updateData: UserDto = {
        name: this.profileForm.value.name,
        email: this.profileForm.value.email,
        phone: this.profileForm.value.phone || '',
        profileImage: this.profileForm.value.profileImage || '',
        userGroupIds: this.currentUserGroupIds 
      };

      await this.httpService.updateUser(this.user.id, updateData).toPromise();
      
    
      const updatedUser = {
        ...this.user,
        name: updateData.name,
        email: updateData.email,
        phone: updateData.phone,
        profileImage: updateData.profileImage
      };
      this.saveUpdatedUserToLocalStorage(updatedUser);
      this.user = updatedUser;

      await this.showToast('Profile updated successfully!', 'success');
    } catch (error: any) {
      console.error('Update error:', error);
      const errorMessage = error.error || error.message || 'Failed to update profile';
      await this.showAlert('Error', errorMessage);
    } finally {
      this.isUpdatingProfile = false;
    }
  }


  async changePassword() {
    if (this.passwordForm.invalid || this.isChangingPassword || this.passwordMismatch || !this.user) return;

    this.isChangingPassword = true;
    
    try {
      const passwordData: ChangePasswordDto = {
        email: this.user.email,
        oldPassword: this.passwordForm.value.oldPassword,
        newPassword: this.passwordForm.value.newPassword
      };

      await this.httpService.changePassword(passwordData).toPromise();
      
    
      this.passwordForm.reset();
      this.showPasswordStrength = false;
      
      await this.showToast('Password changed successfully!', 'success');
    } catch (error: any) {
      console.error('Password change error:', error);
      const errorMessage = error.error?.message || error.message || 'Failed to change password';
      await this.showAlert('Error', errorMessage);
    } finally {
      this.isChangingPassword = false;
    }
  }


  onSegmentChange(event: any) {
    this.selectedSegment = event.detail.value;
  }


  async logout() {
    const alert = document.createElement('ion-alert');
    alert.header = 'Logout';
    alert.message = 'Are you sure you want to logout?';
    alert.buttons = [
      { text: 'Cancel', role: 'cancel' },
      { 
        text: 'Logout', 
        role: 'confirm',
        handler: () => {
          this.authService.logout();
          this.router.navigate(['/login']);
        }
      }
    ];
    
    document.body.appendChild(alert);
    await alert.present();
  }


  async showAlert(header: string, message: string) {
    const alert = document.createElement('ion-alert');
    alert.header = header;
    alert.message = message;
    alert.buttons = ['OK'];
    document.body.appendChild(alert);
    await alert.present();
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = document.createElement('ion-toast');
    toast.message = message;
    toast.duration = 3000;
    toast.color = color;
    toast.position = 'top';
    document.body.appendChild(toast);
    await toast.present();
  }


  getProfileFieldError(field: string): string {
    const control = this.profileForm.get(field);
    
    if (control?.hasError('required')) {
      return 'This field is required';
    }
    
    if (control?.hasError('email')) {
      return 'Please enter a valid email';
    }
    
    if (control?.hasError('minlength')) {
      return 'Minimum 2 characters required';
    }
    
    if (control?.hasError('pattern')) {
      return 'Invalid format';
    }
    
    return '';
  }

  getPasswordFieldError(field: string): string {
    const control = this.passwordForm.get(field);
    
    if (control?.hasError('required')) {
      return 'This field is required';
    }
    
    if (field === 'newPassword' && control?.hasError('pattern')) {
      return 'Password does not meet requirements';
    }
    
    if (this.passwordMismatch && field === 'confirmPassword') {
      return 'Passwords do not match';
    }
    
    return '';
  }

  hasRole(role: string): boolean {
    return this.user?.role === role;
  }
  
  returnHome() {
    this.router.navigate(['/home']);
  }
}