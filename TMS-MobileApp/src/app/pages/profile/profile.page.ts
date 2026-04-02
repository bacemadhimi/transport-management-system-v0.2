import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonicModule
  ]
})
export class ProfilePage implements OnInit {
  user: any = null;
  profilePhoto: string | null = null;
  profileForm: any = {
    name: '',
    email: '',
    phone: '',
    currentPassword: '',
    newPassword: ''
  };

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.user = this.authService.currentUser();
    if (this.user) {
      this.profileForm.name = this.user.name || '';
      this.profileForm.email = this.user.email || '';
      this.profileForm.phone = this.user.phone || '';
    }
  }

  async updateProfile() {
    // TODO: Call API to update profile
    alert('Profil mis à jour avec succès!');
  }

  async changePassword() {
    if (!this.profileForm.currentPassword || !this.profileForm.newPassword) {
      alert('Veuillez remplir tous les champs');
      return;
    }
    // TODO: Call API to change password
    alert('Mot de passe changé avec succès!');
    this.profileForm.currentPassword = '';
    this.profileForm.newPassword = '';
  }

  onPhotoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.profilePhoto = e.target.result;
        // TODO: Upload to server
      };
      reader.readAsDataURL(file);
    }
  }

  async logout() {
    await this.authService.logout();
    this.router.navigate(['/login']);
  }
}
