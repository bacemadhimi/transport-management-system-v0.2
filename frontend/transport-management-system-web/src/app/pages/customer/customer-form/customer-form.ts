import { Component, inject, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Http } from '../../../services/http';
import { ICustomer } from '../../../types/customer';
import { IGeographicalEntity, IGeographicalLevel } from '../../../types/general-settings';
import Swal from 'sweetalert2';
import { Subscription } from 'rxjs';
import { Translation } from '../../../services/Translation';
import { GpsAddressService } from '../../../services/gps-address.service';
import { SettingsService } from '../../../services/settings.service';
import { GpsMapPickerComponent } from '../gps-map-picker/gps-map-picker';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatSelectModule,
    MatDialogModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatAutocompleteModule
  ],
  templateUrl: './customer-form.html',
  styleUrls: ['./customer-form.scss']
})
export class CustomerFormComponent implements OnInit, AfterViewInit, OnDestroy {
  fb = inject(FormBuilder);
  httpService = inject(Http);
  dialogRef = inject(MatDialogRef<CustomerFormComponent>);
  data = inject<{ customerId?: number }>(MAT_DIALOG_DATA, { optional: true }) ?? {};
  private cdr = inject(ChangeDetectorRef);
  private gpsAddressService = inject(GpsAddressService);
  private settingsService = inject(SettingsService);
  private dialog = inject(MatDialog);
  isGeocoding = false;
  isAutoAddressMode = false;

  @ViewChild('phoneInput') phoneInput!: ElementRef<HTMLInputElement>;
  private iti: any;

  isLoading = false;
  isSubmitting = false;


  loadingGeographicalEntities = false;
  geographicalEntities: IGeographicalEntity[] = [];
  geographicalLevels: IGeographicalLevel[] = [];


  selectedEntities: number[] = [];


  level1Entities: IGeographicalEntity[] = [];
  level2Entities: IGeographicalEntity[] = [];
  level3Entities: IGeographicalEntity[] = [];
  level4Entities: IGeographicalEntity[] = [];
  level5Entities: IGeographicalEntity[] = [];


  level1Control = new FormControl<number | null>(null);
  level2Control = new FormControl<number | null>(null);
  level3Control = new FormControl<number | null>(null);
  level4Control = new FormControl<number | null>(null);
  level5Control = new FormControl<number | null>(null);


  private entityMap: Map<number, IGeographicalEntity> = new Map();
  private customerData: any = null;

  private subscriptions: Subscription[] = [];

  // ===== Smart Address Search Properties =====
  customerAddressSearch = new FormControl('');
  customerAddressSuggestions: any[] = [];
  selectedCustomerAddress: string | null = null;
  hoveredCustomerSuggestion: any = null;
  private geocodeDebounceTimer: any = null;
  // ===== END: Smart Address Search Properties =====

  customerForm = this.fb.group({
    matricule: ['', [Validators.maxLength(50)]],
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
    phone: ['', [Validators.maxLength(20)]],
    email: ['', [Validators.email, Validators.maxLength(100)]],
    contact: ['', [Validators.maxLength(100)]],
    address: ['', [Validators.maxLength(255)]],
    latitude: ['', [Validators.maxLength(50)]],
    longitude: ['', [Validators.maxLength(50)]],
    geographicalEntityIds: [[], [Validators.required, Validators.minLength(1)]]
  });

  ngOnInit() {
    this.loadGeographicalEntities();
    this.setupLevelControls();
    
    // Subscribe to settings to check address mode
    this.subscriptions.push(
      this.settingsService.tripSettings$.subscribe(settings => {
        console.log('📌 Trip Address Mode received:', settings?.tripAddressMode);
        this.isAutoAddressMode = settings?.tripAddressMode === 'AUTOMATIQUE';
        this.cdr.markForCheck();
        this.cdr.detectChanges();
      })
    );

    // Force initial load of settings
    this.settingsService.getTripSettings().subscribe();

    if (this.data.customerId) {
      this.loadCustomer(this.data.customerId);
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.geocodeDebounceTimer) {
      clearTimeout(this.geocodeDebounceTimer);
    }
  }

  private setupLevelControls() {

    this.level1Control.valueChanges.subscribe((value) => {
      if (!value) {
        this.level2Control.reset();
        this.level3Control.reset();
        this.level4Control.reset();
        this.level5Control.reset();
        this.loadLevel2Entities(null);
      } else {
        this.loadLevel2Entities(value);
      }
      this.updateSelectedEntities();
    });


    this.level2Control.valueChanges.subscribe((value) => {
      if (!value) {
        this.level3Control.reset();
        this.level4Control.reset();
        this.level5Control.reset();
        this.loadLevel3Entities(null);
      } else {
        this.loadLevel3Entities(value);
      }
      this.updateSelectedEntities();
    });


    this.level3Control.valueChanges.subscribe((value) => {
      if (!value) {
        this.level4Control.reset();
        this.level5Control.reset();
        this.loadLevel4Entities(null);
      } else {
        this.loadLevel4Entities(value);
      }
      this.updateSelectedEntities();
    });


    this.level4Control.valueChanges.subscribe((value) => {
      if (!value) {
        this.level5Control.reset();
        this.loadLevel5Entities(null);
      } else {
        this.loadLevel5Entities(value);
      }
      this.updateSelectedEntities();
    });


    this.level5Control.valueChanges.subscribe(() => {
      this.updateSelectedEntities();
    });
  }

  private loadLevel2Entities(parentId: number | null) {
    if (!parentId) {
      this.level2Entities = [];
      return;
    }
    this.level2Entities = this.geographicalEntities.filter(e => {
      const level = this.geographicalLevels.find(l => l.id === e.levelId);
      return level?.levelNumber === 2 && e.parentId === parentId;
    });
  }

  private loadLevel3Entities(parentId: number | null) {
    if (!parentId) {
      this.level3Entities = [];
      return;
    }
    this.level3Entities = this.geographicalEntities.filter(e => {
      const level = this.geographicalLevels.find(l => l.id === e.levelId);
      return level?.levelNumber === 3 && e.parentId === parentId;
    });
  }

  private loadLevel4Entities(parentId: number | null) {
    if (!parentId) {
      this.level4Entities = [];
      return;
    }
    this.level4Entities = this.geographicalEntities.filter(e => {
      const level = this.geographicalLevels.find(l => l.id === e.levelId);
      return level?.levelNumber === 4 && e.parentId === parentId;
    });
  }

  private loadLevel5Entities(parentId: number | null) {
    if (!parentId) {
      this.level5Entities = [];
      return;
    }
    this.level5Entities = this.geographicalEntities.filter(e => {
      const level = this.geographicalLevels.find(l => l.id === e.levelId);
      return level?.levelNumber === 5 && e.parentId === parentId;
    });
  }

  private updateSelectedEntities() {
    const selected: number[] = [];

    if (this.level1Control.value) selected.push(this.level1Control.value);
    if (this.level2Control.value) selected.push(this.level2Control.value);
    if (this.level3Control.value) selected.push(this.level3Control.value);
    if (this.level4Control.value) selected.push(this.level4Control.value);
    if (this.level5Control.value) selected.push(this.level5Control.value);

    this.selectedEntities = selected;

    this.customerForm.patchValue({
      geographicalEntityIds: this.selectedEntities as any
    });
    this.customerForm.get('geographicalEntityIds')?.markAsDirty();
  }

  private loadGeographicalEntities(): void {
    this.loadingGeographicalEntities = true;

    const levelsSub = this.httpService.getGeographicalLevels().subscribe({
      next: (levels) => {
        this.geographicalLevels = levels.filter(l => l.isActive);

        const entitiesSub = this.httpService.getGeographicalEntities().subscribe({
          next: (entities) => {
            this.geographicalEntities = entities.filter(e => e.isActive);
            this.organizeEntitiesByLevel();
            this.loadingGeographicalEntities = false;

            if (this.customerData) {
              this.setGeographicalSelections(this.customerData);
            }

            this.cdr.detectChanges();
          },
          error: (error) => {
            console.error('Error loading geographical entities:', error);
            this.loadingGeographicalEntities = false;
            Swal.fire({
              icon: 'error',
              title: 'Erreur',
              text: 'Impossible de charger les localisations',
              confirmButtonText: 'OK'
            });
          }
        });
        this.subscriptions.push(entitiesSub);
      },
      error: (error) => {
        console.error('Error loading geographical levels:', error);
        this.loadingGeographicalEntities = false;
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: 'Impossible de charger les niveaux géographiques',
          confirmButtonText: 'OK'
        });
      }
    });

    this.subscriptions.push(levelsSub);
  }

  private organizeEntitiesByLevel() {
    this.entityMap.clear();

    this.geographicalEntities.forEach(e => {
      if (e.id !== undefined && e.id !== null) {
        this.entityMap.set(e.id, e);
      }
    });

    const levelGroups: { [key: number]: IGeographicalEntity[] } = {};

    this.geographicalEntities.forEach(entity => {
      if (entity.id === undefined || entity.id === null) return;

      const level = this.geographicalLevels.find(l => l.id === entity.levelId);
      if (level) {
        if (!levelGroups[level.levelNumber]) {
          levelGroups[level.levelNumber] = [];
        }
        levelGroups[level.levelNumber].push(entity);
      }
    });

    this.level1Entities = levelGroups[1] || [];
    this.level2Entities = levelGroups[2] || [];
    this.level3Entities = levelGroups[3] || [];
    this.level4Entities = levelGroups[4] || [];
    this.level5Entities = levelGroups[5] || [];
  }

  private setGeographicalSelections(customerData: any) {
    const geographicalEntityIds = customerData.geographicalEntities?.map((ge: any) => ge.geographicalEntityId) || [];

    this.selectedEntities = [...geographicalEntityIds];

    this.level1Control.reset();
    this.level2Control.reset();
    this.level3Control.reset();
    this.level4Control.reset();
    this.level5Control.reset();

    geographicalEntityIds.forEach((id: number) => {
      const entity = this.geographicalEntities.find(e => e.id === id);
      if (entity) {
        const level = this.geographicalLevels.find(l => l.id === entity.levelId);
        if (level) {
          switch(level.levelNumber) {
            case 1: this.level1Control.setValue(id); break;
            case 2: this.level2Control.setValue(id); break;
            case 3: this.level3Control.setValue(id); break;
            case 4: this.level4Control.setValue(id); break;
            case 5: this.level5Control.setValue(id); break;
          }
        }
      }
    });

    this.customerForm.patchValue({
      geographicalEntityIds: this.selectedEntities as any
    });

    this.cdr.detectChanges();
  }

  removeEntity(entityId: number) {
    const entity = this.geographicalEntities.find(e => e.id === entityId);
    if (entity) {
      const level = this.geographicalLevels.find(l => l.id === entity.levelId);
      if (level) {
        switch(level.levelNumber) {
          case 1: this.level1Control.reset(); break;
          case 2: this.level2Control.reset(); break;
          case 3: this.level3Control.reset(); break;
          case 4: this.level4Control.reset(); break;
          case 5: this.level5Control.reset(); break;
        }
      }
    }

    let newSelection = this.selectedEntities.filter(id => id !== entityId);
    this.selectedEntities = newSelection;

    this.customerForm.patchValue({
    geographicalEntityIds: this.selectedEntities as any
  });
    this.customerForm.get('geographicalEntityIds')?.markAsDirty();
    this.cdr.detectChanges();
  }

  getEntityName(entityId: number): string {
    return this.entityMap.get(entityId)?.name || `ID: ${entityId}`;
  }

  getLevelName(levelNumber: number): string {
    const level = this.geographicalLevels.find(l => l.levelNumber === levelNumber);
    return level ? level.name : `Niveau ${levelNumber}`;
  }

  private loadCustomer(id: number) {
    this.isLoading = true;
    this.httpService.getCustomer(id).subscribe({
      next: (response: any) => {
        const customer = response.data || response;

        this.customerData = customer;

        // Update form values
        this.customerForm.patchValue({
          matricule: customer.matricule || '',
          name: customer.name,
          phone: customer.phone || '',
          email: customer.email || '',
          contact: customer.contact || '',
          address: customer.address || '',
          latitude: customer.latitude || '',
          longitude: customer.longitude || ''
        });

        // Initialize smart address search fields if address exists
        if (customer.address && customer.address.trim()) {
          this.customerAddressSearch.setValue(customer.address);
          this.selectedCustomerAddress = customer.address;
          
          console.log('✅ Loaded customer with address:', {
            address: customer.address,
            lat: customer.latitude,
            lng: customer.longitude
          });
        }

        if (this.geographicalEntities.length > 0 && this.geographicalLevels.length > 0) {
          this.setGeographicalSelections(customer);
        }

        setTimeout(() => {
          if (customer.phoneCountry && this.iti) {
            this.iti.setCountry(customer.phoneCountry);
          }
          if (customer.phone) {
            this.iti.setNumber(customer.phone);
          }
        }, 0);

        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.dialogRef.close();
      }
    });
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
          this.customerForm.get('phone')?.setValue(number);
        });
      })
      .catch(() => {
        console.error('Failed to load intl-tel-input scripts.');
      });
  }

  onSubmit() {
    if (this.isSubmitting) return;

    const phoneNumber = this.iti ? this.iti.getNumber() : '';

    if (!this.customerForm.valid) {
      Swal.fire({
        icon: 'error',
        title: 'Veuillez remplir tous les champs obligatoires correctement'
      });
      return;
    }

    if (this.selectedEntities.length === 0) {
      Swal.fire({
        icon: 'error',
        title: 'Erreur',
        text: 'Au moins une localisation doit être sélectionnée'
      });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.customerForm.value;

    const customerData: any = {
      matricule: formValue.matricule || '',
      name: formValue.name!,
      phone: phoneNumber || '',
      phoneCountry: this.iti ? this.iti.getSelectedCountryData().iso2 : 'tn',
      email: formValue.email || '',
      contact: formValue.contact || '',
      address: formValue.address || '',
      latitude: formValue.latitude ? Number(formValue.latitude) : null,
      longitude: formValue.longitude ? Number(formValue.longitude) : null,
      geographicalEntities: this.selectedEntities.map(id => ({
        geographicalEntityId: id
      }))
    };

    const action = this.data.customerId
      ? this.httpService.updateCustomer(this.data.customerId, customerData)
      : this.httpService.addCustomer(customerData);

    action.subscribe({
      next: () => {
        this.isSubmitting = false;
        Swal.fire({
          icon: 'success',
          title: this.data.customerId ? this.t('CUSTOMER_UPDATED') : this.t('CUSTOMER_ADDED'),
          confirmButtonText: 'OK',
          allowOutsideClick: false
        }).then(() => this.dialogRef.close(true));
      },
      error: (error) => {
        console.error(error);
        this.isSubmitting = false;
        Swal.fire({
          icon: 'error',
          title: 'Erreur',
          text: error.error?.message || 'Une erreur est survenue lors de l\'enregistrement',
          confirmButtonText: 'OK'
        });
      }
    });
  }

  onCancel() {
    this.dialogRef.close();
  }

  getErrorMessage(controlName: string): string {
    const control = this.customerForm.get(controlName);
    if (control?.hasError('required')) {
      if (controlName === 'geographicalEntityIds') {
        return 'Au moins une localisation doit être sélectionnée';
      }
      return `${this.getFieldLabel(controlName)} est obligatoire`;
    }
    if (control?.hasError('minlength') && controlName === 'geographicalEntityIds') {
      return 'Au moins une localisation doit être sélectionnée';
    }
    if (control?.hasError('minlength')) {
      const requiredLength = control.errors?.['minlength'].requiredLength;
      return `${this.getFieldLabel(controlName)} doit comporter au moins ${requiredLength} caractères`;
    }
    if (control?.hasError('maxlength')) {
      const requiredLength = control.errors?.['maxlength'].requiredLength;
      return `${this.getFieldLabel(controlName)} ne peut pas dépasser ${requiredLength} caractères`;
    }
    if (control?.hasError('email')) {
      return 'Veuillez entrer une adresse email valide';
    }
    return '';
  }

  private getFieldLabel(controlName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Le nom',
      phone: 'Le téléphone',
      email: 'L\'email',
      contact: 'Le contact',
      geographicalEntityIds: 'La localisation'
    };
    return labels[controlName] || controlName;
  }

  get isEditing(): boolean {
    return !!this.data.customerId;
  }


  private translation = inject(Translation);
  t(key: string): string { return this.translation.t(key); }

  geocodeAddress(): void {
    const address = this.customerForm.get('address')?.value?.trim();

    if (!address || address.length < 3) {
      Swal.fire({
        icon: 'warning',
        title: 'Attention',
        text: 'Veuillez entrer une adresse valide (au moins 3 caractères)',
        timer: 2000,
        showConfirmButton: false
      });
      return;
    }

    this.isGeocoding = true;

    this.gpsAddressService.validateAndNormalizeAddress(address).subscribe({
      next: (result: any) => {
        if (result && result.lat && result.lng) {
          this.customerForm.patchValue({
            latitude: result.lat.toString(),
            longitude: result.lng.toString()
          });

          Swal.fire({
            icon: 'success',
            title: '✅ Géocodage réussi !',
            html: `Coordonnées récupérées automatiquement:<br><strong>Latitude: ${result.latitude}</strong><br><strong>Longitude: ${result.longitude}</strong>`,
            timer: 2500,
            showConfirmButton: false
          });
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: 'Impossible de géocoder cette adresse. Veuillez préciser davantage.',
            confirmButtonText: 'OK'
          });
        }

        this.isGeocoding = false;
      },
      error: (error: any) => {
        console.error('Geocoding error:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur de géocodage',
          text: 'Une erreur est survenue lors de la géolocalisation. Veuillez réessayer.',
          confirmButtonText: 'OK'
        });

        this.isGeocoding = false;
      }
    });
  }

  /**
   * Open GPS Map Picker modal to select coordinates on map
   */
  openGpsMapPicker(): void {
    // Get current coordinates if they exist
    const currentLat = this.customerForm.get('latitude')?.value;
    const currentLng = this.customerForm.get('longitude')?.value;
    
    const initialData: { lat?: number; lng?: number } = {};
    if (currentLat && currentLng) {
      initialData.lat = parseFloat(currentLat);
      initialData.lng = parseFloat(currentLng);
      console.log('📍 Passing initial coords to map picker:', initialData);
    }

    const dialogRef = this.dialog.open(GpsMapPickerComponent, {
      width: '900px',
      maxWidth: '95vw',
      panelClass: 'gps-map-picker-dialog',
      data: initialData
    });

    dialogRef.afterClosed().subscribe((coords: { lat: number; lng: number } | null) => {
      if (coords) {
        // Update form with selected coordinates
        this.customerForm.patchValue({
          latitude: coords.lat.toString(),
          longitude: coords.lng.toString()
        });

        Swal.fire({
          icon: 'success',
          title: '📍 Position GPS définie !',
          html: `Coordonnées sélectionnées sur la carte:<br><strong>Latitude: ${coords.lat.toFixed(6)}</strong><br><strong>Longitude: ${coords.lng.toFixed(6)}</strong>`,
          timer: 2500,
          showConfirmButton: false
        });
      }
    });
  }

  /**
   * Check if customer has valid GPS coordinates
   */
  hasGpsCoordinates(): boolean {
    const lat = this.customerForm.get('latitude')?.value;
    const lng = this.customerForm.get('longitude')?.value;
    return !!(lat && lng && lat !== '' && lng !== '');
  }

  // ===== Smart Address Search Methods =====
  
  /**
   * Handle address input with debouncing
   */
  onCustomerAddressInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    
    // Clear previous timer
    if (this.geocodeDebounceTimer) {
      clearTimeout(this.geocodeDebounceTimer);
    }
    
    // Set new timer for debouncing (500ms)
    this.geocodeDebounceTimer = setTimeout(() => {
      if (value && value.trim().length >= 3) {
        this.searchCustomerAddressAutocomplete(value.trim());
      } else {
        this.customerAddressSuggestions = [];
      }
    }, 500);
  }

  /**
   * Search address with autocomplete using getAddressSuggestions
   */
  searchCustomerAddressAutocomplete(query: string): void {
    this.gpsAddressService.getAddressSuggestions(query).subscribe({
      next: (results) => {
        this.customerAddressSuggestions = results.map(r => ({
          display_name: r.address,
          lat: r.lat.toString(),
          lon: r.lng.toString(),
          address: r.address
        }));
      },
      error: (error) => {
        console.error('❌ Error searching address:', error);
        this.customerAddressSuggestions = [];
      }
    });
  }

  /**
   * Manual search button click
   */
  searchCustomerAddress(): void {
    const query = this.customerAddressSearch.value;
    if (!query || query.trim().length < 3) {
      Swal.fire({
        icon: 'warning',
        title: 'Recherche invalide',
        text: 'Veuillez entrer au moins 3 caractères pour rechercher une adresse',
        confirmButtonText: 'OK'
      });
      return;
    }

    this.isGeocoding = true;
    this.gpsAddressService.getAddressSuggestions(query.trim()).subscribe({
      next: (results) => {
        if (results.length > 0) {
          this.customerAddressSuggestions = results.map(r => ({
            display_name: r.address,
            lat: r.lat.toString(),
            lon: r.lng.toString(),
            address: r.address
          }));
          
          // Auto-select first result if only one
          if (results.length === 1) {
            this.onCustomerAddressSelected(this.customerAddressSuggestions[0]);
          }
        } else {
          Swal.fire({
            icon: 'info',
            title: 'Aucun résultat',
            text: 'Aucune adresse trouvée. Essayez avec une autre recherche.',
            confirmButtonText: 'OK'
          });
          this.customerAddressSuggestions = [];
        }
        this.isGeocoding = false;
      },
      error: (error) => {
        console.error('❌ Error searching address:', error);
        Swal.fire({
          icon: 'error',
          title: 'Erreur de recherche',
          text: 'Une erreur est survenue lors de la recherche. Veuillez réessayer.',
          confirmButtonText: 'OK'
        });
        this.isGeocoding = false;
      }
    });
  }

  /**
   * Handle address selection from suggestions
   */
  onCustomerAddressSelected(suggestion: any): void {
    const lat = parseFloat(suggestion.lat);
    const lon = parseFloat(suggestion.lon);
    
    if (isNaN(lat) || isNaN(lon)) {
      Swal.fire({
        icon: 'error',
        title: 'Coordonnées invalides',
        text: 'Les coordonnées GPS de cette adresse ne sont pas valides.',
        confirmButtonText: 'OK'
      });
      return;
    }

    // Update form fields
    this.customerForm.patchValue({
      address: suggestion.display_name || suggestion.address,
      latitude: lat.toString(),
      longitude: lon.toString()
    });

    // Update display values
    this.selectedCustomerAddress = suggestion.display_name || suggestion.address;
    this.customerAddressSearch.setValue(suggestion.display_name || suggestion.address);
    this.customerAddressSuggestions = [];

    console.log('✅ Customer address selected:', {
      address: this.selectedCustomerAddress,
      lat: lat,
      lng: lon
    });
  }

  /**
   * Clear selected address
   */
  clearCustomerAddress(): void {
    this.customerForm.patchValue({
      address: '',
      latitude: null,
      longitude: null
    });
    this.customerAddressSearch.setValue('');
    this.selectedCustomerAddress = null;
    this.customerAddressSuggestions = [];
    
    console.log('🗑️ Customer address cleared');
  }
  // ===== END: Smart Address Search Methods =====
}
