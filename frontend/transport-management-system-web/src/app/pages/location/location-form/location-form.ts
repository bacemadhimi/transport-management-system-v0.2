import { Component, inject, Inject, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Http } from '../../../services/http';
import { ILocation, ICreateLocationDto, IUpdateLocationDto } from '../../../types/location';
import Swal from 'sweetalert2';
import { Translation } from '../../../services/Translation';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { from, of, Subscription } from 'rxjs';
import * as L from 'leaflet';

interface DialogData {
  locationId?: number;
}

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

@Component({
  selector: 'app-location-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule
  ],
  templateUrl: './location-form.html',
  styleUrls: ['./location-form.scss']
})
export class LocationFormComponent implements OnInit, OnDestroy {
  locationForm!: FormGroup;
  loading = false;
  isSubmitting = false;


  addressSuggestions: NominatimResult[] = [];
  searchingAddress = false;
  addressSearchTerm = '';
  private searchSubscription?: Subscription;


  private map: L.Map | null = null;
  private marker: L.Marker | null = null;

  constructor(
    private fb: FormBuilder,
    private http: Http,
    private cdr: ChangeDetectorRef,
    private dialogRef: MatDialogRef<LocationFormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.setupAddressAutocomplete();

    if (this.data.locationId) {
      this.loadLocation(this.data.locationId);
    }
  }

  ngOnDestroy(): void {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
    if (this.map) {
      this.map.remove();
    }
  }

  private initForm(): void {
    this.locationForm = this.fb.group({
      address: ['', [Validators.required]],
      latitude: [null],
      longitude: [null],
      name: ['', [Validators.maxLength(100)]],
      isActive: [true]
    });


    this.locationForm.get('address')?.valueChanges.subscribe(value => {

      if (!this.locationForm.get('name')?.value && value && !this.addressSuggestions.length) {

        this.locationForm.get('name')?.setValue(value.substring(0, 100));
      }
    });
  }

 private setupAddressAutocomplete(): void {
  this.searchSubscription = this.locationForm.get('address')!.valueChanges
    .pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap(value => {
        if (!value || value.length < 3) {
          this.addressSuggestions = [];
          return of([]);
        }
        this.searchingAddress = true;
        this.addressSearchTerm = value;


        return from(this.searchAddress(value)).pipe(
          catchError(error => {
            console.error('Error searching address:', error);
            this.searchingAddress = false;
            return of([]);
          })
        );
      })
    )
    .subscribe(results => {
      this.addressSuggestions = results;
      this.searchingAddress = false;
    });
}

  private searchAddress(query: string): Promise<NominatimResult[]> {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&addressdetails=1&limit=5&countrycodes=tn`;

    return fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'TransportManagementSystem/1.0'
      }
    })
    .then(response => response.json())
    .catch(error => {
      console.error('Error searching address:', error);
      return [];
    });
  }

  onAddressInput(): void {

  }

onAddressSelected(event: any): void {
  const selectedAddress = this.addressSuggestions.find(
    s => s.display_name === event.option.value
  );
  if (!selectedAddress) return;

  const lat = parseFloat(selectedAddress.lat);
  const lng = parseFloat(selectedAddress.lon);

  this.locationForm.patchValue({
    latitude: lat,
    longitude: lng
  });

  this.cdr.detectChanges();

  setTimeout(() => {
    if (!this.map) {
      this.initMap();
    }
    this.updateMapLocation(lat, lng);
  }, 0);
}

  private initMap(): void {
  const mapElement = document.getElementById('locationMap');
  if (!mapElement) return;

  this.configureLeafletIcons();

  this.map = L.map('locationMap', {
    center: [36.8065, 10.1815],
    zoom: 13
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19
  }).addTo(this.map);
}

  private configureLeafletIcons(): void {
    try {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
    } catch (error) {
      console.warn('Error configuring Leaflet icons:', error);
    }
  }

  private updateMapLocation(lat: number, lng: number): void {
    if (!this.map) return;

    if (this.marker) {
      this.marker.remove();
    }

    this.map.setView([lat, lng], 15);
    this.marker = L.marker([lat, lng]).addTo(this.map);


    this.marker.bindPopup(`
      <div style="font-family: 'Segoe UI', sans-serif; padding: 4px;">
        <strong>Coordonnées:</strong><br/>
        Lat: ${lat.toFixed(6)}<br/>
        Lng: ${lng.toFixed(6)}
      </div>
    `).openPopup();
  }

private loadLocation(locationId: number): void {
  this.loading = true;

  this.http.getLocation(locationId).subscribe({
    next: (response) => {
      const location = response.data;

      this.locationForm.patchValue({
        address: location.address || location.name,
        latitude: location.latitude,
        longitude: location.longitude,
        name: location.name,
        isActive: location.isActive
      });

      this.loading = false;

      if (location.latitude && location.longitude) {
        this.cdr.detectChanges();

        setTimeout(() => {
          if (!this.map) {
            this.initMap();
          }
          this.updateMapLocation(location.latitude, location.longitude);
        }, 0);
      }
    },
    error: (error) => {
      console.error('Error loading location:', error);
      this.loading = false;
    }
  });
}
  onSubmit(): void {
    if (this.locationForm.invalid || this.isSubmitting) return;

    this.isSubmitting = true;
    const formValue = this.locationForm.value;


    const locationName = formValue.name?.trim() || formValue.address?.trim().substring(0, 100);

    const locationData = {
      name: locationName,
      address: formValue.address.trim(),
      latitude: formValue.latitude,
      longitude: formValue.longitude,
      isActive: formValue.isActive
    };

    if (this.data.locationId) {
      this.updateLocation(locationData);
    } else {
      this.createLocation(locationData);
    }
  }

  private createLocation(formValue: any): void {
    const locationData: ICreateLocationDto = {
      name: formValue.name,
      address: formValue.address,
      latitude: formValue.latitude,
      longitude: formValue.longitude,
      isActive: formValue.isActive
    };

    this.http.createLocation(locationData).subscribe({
      next: (location: ILocation) => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'success',
          title: this.t('CITY_CREATED_SUCCESS'),
          confirmButtonText: 'OK',
          allowOutsideClick: false
        }).then(() => this.dialogRef.close(location));
      },
      error: (error) => {
        console.error('Create location error:', error);
        const errorMessage = error.error?.message || this.t('CITY_CREATION_FAILED');
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: errorMessage,
          confirmButtonText: 'OK'
        });
        this.isSubmitting = false;
      }
    });
  }

  private updateLocation(formValue: any): void {
    const locationData: IUpdateLocationDto = {
      name: formValue.name,
      address: formValue.address,
      latitude: formValue.latitude,
      longitude: formValue.longitude,
      isActive: formValue.isActive
    };

    this.http.updateLocation(this.data.locationId!, locationData).subscribe({
      next: (location: ILocation) => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'success',
          title: this.t('LOCATION_UPDATED_SUCCESS'),
          confirmButtonText: 'OK',
          allowOutsideClick: false
        }).then(() => this.dialogRef.close(location));
      },
      error: (error) => {
        console.error('Update location error:', error);
        const errorMessage = error.error?.message || this.t('LOCATION_UPDATE_FAILED');
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: errorMessage,
          confirmButtonText: 'OK'
        });
        this.isSubmitting = false;
      }
    });
  }

  getErrorMessage(controlName: string): string {
    const control = this.locationForm.get(controlName);

    if (control?.hasError('required')) {
      if (controlName === 'address') {
        return this.t('ADDRESS_REQUIRED') || 'L\'adresse est requise';
      }
      return this.t('FIELD_REQUIRED') || 'Ce champ est obligatoire';
    }

    if (control?.hasError('maxlength')) {
      return this.t('MAX_LENGTH_EXCEEDED') || 'Le nom ne peut pas dépasser 100 caractères';
    }

    return '';
  }

  get isEditMode(): boolean {
    return !!this.data.locationId;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private translation = inject(Translation);
  t(key: string): string { return this.translation.t(key); }
}