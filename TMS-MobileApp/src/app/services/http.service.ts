import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { PagedData } from '../types/paged-data';
import { ITrip, CreateTripDto, UpdateTripDto } from '../types/trip';
import { ITruck } from '../types/truck';
import { IDriver } from '../types/driver';
import { map, Observable, switchMap } from 'rxjs';


export interface UserDto {
  name: string;
  email: string;
  phone?: string;
  profileImage?: string;
  password?: string;
  userGroupIds?: number[];
  userGroups?: { id: number; name: string }[]; 
  
}

export interface SearchOptions {
  search?: string;
  pageIndex?: number;
  pageSize?: number;
}

export interface ChangePasswordDto {
  email: string;
  oldPassword: string;
  newPassword: string;
}

@Injectable({
  providedIn: 'root'
})
export class HttpService {
  http = inject(HttpClient);
  constructor() {}

  getUserById(id: number): Observable<UserDto> {
    return this.http.get<UserDto>(`${environment.apiUrl}/api/User/${id}`);
  }

 
  updateUser(id: number, userData: UserDto): Observable<any> {
    return this.http.put(`${environment.apiUrl}/api/User/${id}`, userData);
  }

  
  updateProfile(id: number, profileData: {
    name?: string;
    email?: string;
    phone?: string;
    profileImage?: string;
    password?: string;
  }): Observable<any> {
    const userDto: UserDto = {
      name: profileData.name || '',
      email: profileData.email || '',
      phone: profileData.phone,
      profileImage: profileData.profileImage,
      password: profileData.password,
      userGroupIds: [] // Empty array since we're not changing groups
    };
    return this.updateUser(id, userDto);
  }

  
  changePassword(passwordData: ChangePasswordDto): Observable<any> {
    return this.http.post(`${environment.apiUrl}/api/Auth/change-password`, passwordData);
  }

  uploadProfileImage(userId: number, file: File): Observable<any> {
    return new Observable(observer => {
      const reader = new FileReader();
      
      reader.onload = (event: any) => {
        const base64Image = event.target.result;
        
     
        const pureBase64 = this.extractPureBase64(base64Image);
        
     
        this.getUserById(userId).subscribe({
          next: (user) => {
            const updateData: UserDto = {
              name: user.name,
              email: user.email,
              phone: user.phone || '',
              profileImage: pureBase64,
              userGroupIds: user.userGroupIds || []
            };
            
            this.updateUser(userId, updateData).subscribe({
              next: (response) => {
                observer.next({ 
                  success: true, 
                  imageUrl: base64Image,
                  profileImage: pureBase64 
                });
                observer.complete();
              },
              error: (error) => {
                observer.error(error);
              }
            });
          },
          error: (error) => {
            observer.error(error);
          }
        });
      };
      
      reader.onerror = (error) => {
        observer.error(error);
      };
      
      reader.readAsDataURL(file);
    });
  }


  deleteProfileImage(userId: number): Observable<any> {
    return this.getUserById(userId).pipe(
      switchMap((user) => {
        const updateData: UserDto = {
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          profileImage: '', 
          userGroupIds: user.userGroupIds || []
        };
        return this.updateUser(userId, updateData);
      })
    );
  }

  
  checkEmailAvailability(email: string, currentUserId?: number): Observable<boolean> {
    const params = new HttpParams().set('search', email);
    
    return this.http.get<PagedData<any>>(`${environment.apiUrl}/api/User`, { params }).pipe(
      map(response => {
        if (response.data && Array.isArray(response.data)) {
      
          const users = currentUserId 
            ? response.data.filter((user: any) => user.id !== currentUserId)
            : response.data;
          
          return users.length === 0; 
        }
        return true;
      })
    );
  }


  private extractPureBase64(dataUrl: string): string {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) {
      return dataUrl; // Return as-is if not a data URL
    }
    
    const base64Marker = 'base64,';
    const base64Index = dataUrl.indexOf(base64Marker);
    
    if (base64Index === -1) return '';
    
    return dataUrl.substring(base64Index + base64Marker.length);
  }

 
  createDataUrlFromBase64(base64: string, mimeType: string = 'image/jpeg'): string {
    if (!base64) return '';
    
    
    if (base64.startsWith('data:image/')) {
      return base64;
    }
    
    return `data:${mimeType};base64,${base64}`;
  }

 
  isPureBase64(str: string): boolean {
    if (!str || typeof str !== 'string') return false;
    
  
    if (str.startsWith('data:image/')) return false;
    

    const trimmed = str.replace(/\s/g, '');
    
  
    const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;
    
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


  compressImage(file: File, maxSizeKB: number = 500): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event: any) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          let width = img.width;
          let height = img.height;
          
    
          const maxDimension = 1024; 
          if (width > height) {
            if (width > maxDimension) {
              height *= maxDimension / width;
              width = maxDimension;
            }
          } else {
            if (height > maxDimension) {
              width *= maxDimension / height;
              height = maxDimension;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          
          ctx?.drawImage(img, 0, 0, width, height);
          
        
          let quality = 0.8;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          
         
          while (this.getBase64SizeKB(dataUrl) > maxSizeKB && quality > 0.1) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          
          resolve(dataUrl);
        };
        
        img.onerror = reject;
        img.src = event.target.result;
      };
      
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

 
  private getBase64SizeKB(base64: string): number {
    if (!base64) return 0;
    
  
    const pureBase64 = this.extractPureBase64(base64) || base64;
    
  
    const sizeInBytes = (pureBase64.length * 3) / 4;
    return sizeInBytes / 1024;
  }

 
  validatePasswordComplexity(password: string): {
    isValid: boolean;
    errors: string[];
    strength: 'weak' | 'medium' | 'strong';
  } {
    const errors: string[] = [];
    const requirements = {
      length: password.length >= 7,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[@$!%*?&]/.test(password)
    };

    if (!requirements.length) errors.push('Minimum 7 characters required');
    if (!requirements.uppercase) errors.push('At least one uppercase letter (A-Z)');
    if (!requirements.lowercase) errors.push('At least one lowercase letter (a-z)');
    if (!requirements.number) errors.push('At least one number (0-9)');
    if (!requirements.special) errors.push('At least one special character (@$!%*?&)');

    const metCount = Object.values(requirements).filter(Boolean).length;
    let strength: 'weak' | 'medium' | 'strong' = 'weak';
    
    if (metCount <= 2) strength = 'weak';
    else if (metCount <= 4) strength = 'medium';
    else strength = 'strong';

    return {
      isValid: errors.length === 0,
      errors,
      strength
    };
  }

 
  validatePhoneNumber(phone: string): boolean {
    if (!phone) return false;
    
    
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    const cleanPhone = phone.replace(/\s+/g, '');
    
    return phoneRegex.test(cleanPhone);
  }

  getTripsList(filter: any) {
    const params = new HttpParams({ fromObject: filter });
    return this.http.get<PagedData<ITrip>>(environment.apiUrl + '/api/Trips?' + params.toString());
  }

  getTrip(id: number) {
    return this.http.get<ITrip>(environment.apiUrl + '/api/Trips/' + id);
  }

  deleteTrip(id: number) {
    return this.http.delete(environment.apiUrl + '/api/Trips/' + id);
  }

  getTrucks() {
    return this.http.get<ITruck[]>(environment.apiUrl + '/api/Trucks/list');
  }

  getDrivers() {
    return this.http.get<IDriver[]>(environment.apiUrl + '/api/Driver/ListOfDrivers');
  }

  getAllTrips() {
    return this.http.get<ITrip[]>(environment.apiUrl + '/api/Trips/list');
  }

  createTrip(trip: CreateTripDto) {
    return this.http.post<ITrip>(environment.apiUrl + '/api/Trips', trip);
  }

  updateTrip(tripId: number, data: UpdateTripDto): Observable<any> {
    return this.http.put(`${environment.apiUrl}/api/trips/${tripId}`, data);
  }

  updateTripStatus(tripId: number, statusDto: { status: string }) {
    return this.http.put(`${environment.apiUrl}/api/Trips/${tripId}/status`, statusDto);
  }


}