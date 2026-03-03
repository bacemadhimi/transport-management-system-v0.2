import { Component, EventEmitter, HostListener, Inject, Input, OnInit, Output, Optional, ViewChild, inject } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { CreateDeliveryDto, CreateTripDto, DeliveryStatusOptions, TripStatus, UpdateTripDto } from '../../../types/trip';
import { ITruck } from '../../../types/truck';
import { IDriver } from '../../../types/driver';
import { IConvoyeur } from '../../../types/convoyeur';
import { ICustomer } from '../../../types/customer';
import { IOrder, OrderStatus } from '../../../types/order';
import { Http } from '../../../services/http';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { catchError, debounceTime, forkJoin, interval, map, Observable, of, shareReplay, Subscription, tap } from 'rxjs';
import { ITraject, ITrajectPoint } from '../../../types/traject';
import { TrajectFormSimpleComponent } from './traject-form-simple.component';
import { CdkDragDrop, CdkDrag, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { animate, style, transition, trigger } from '@angular/animations';
import Swal from 'sweetalert2';
import { ILocation } from '../../../types/location';
import { MatChipsModule } from '@angular/material/chips';
import { WeatherData } from '../../../types/weather';
import { MatDividerModule } from '@angular/material/divider';
import { TruncatePipe } from '../../../../truncate.pipe';
import { IZone } from '../../../types/zone';
import { CdkVirtualScrollViewport, ScrollingModule } from '@angular/cdk/scrolling';
import { Translation } from '../../../services/Translation';
import { SettingsService } from '../../../services/settings.service'; 
import { ITripSettings } from '../../../types/general-settings';

interface DialogData {
  tripId?: number;
}

@Component({
  selector: 'app-trip-form',
  standalone: true,
  templateUrl: './trip-form.html',
  styleUrls: ['./trip-form.scss'],
  imports: [ 
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatCheckboxModule,
    MatRadioModule,
    CdkDrag,
    CdkDragHandle,
    CdkDropList,
    MatChipsModule,
    MatDividerModule,
    TruncatePipe,
    ScrollingModule
  ], 
  providers: [DatePipe],
  animations: [
    trigger('sequenceUpdate', [
      transition('* => updated', [
        animate('0.5s ease', style({ 
          transform: 'scale(1.1)',
          color: '#f59e0b'
        }))
      ])
    ])
  ]
})
export class TripForm implements OnInit {
  @ViewChild(CdkVirtualScrollViewport) viewport!: CdkVirtualScrollViewport;
  tripForm!: FormGroup;
  deliveries: FormArray;
  
  // Driver properties
  availableDrivers: IDriver[] = [];
  unavailableDrivers: any[] = [];
  loadingAvailableDrivers = false;
  drivers: IDriver[] = [];
  
  // Convoyeur properties
  convoyeurs: IConvoyeur[] = [];
  loadingConvoyeurs = false;
  
  // Truck properties
  trucks: ITruck[] = [];
  availableTrucks: ITruck[] = [];
  unavailableTrucks: any[] = [];
  loadingAvailableTrucks = false;
  
  customers: ICustomer[] = [];
  allOrders: IOrder[] = [];
  ordersForQuickAdd: IOrder[] = [];
  searchControl = new FormControl('');
  filteredOrders: IOrder[] = [];
  isDragging = false;
  previousOrder: number[] = [];
  dragDisabled = false;
  
  trajects: ITraject[] = [];
  selectedTraject: ITraject | null = null;
  selectedTrajectControl = new FormControl<number | null>(null);
  trajectMode: 'predefined' | 'new' | null = null;
  saveAsPredefined = false; 
  trajectName = '';
  loadingTrajects = false;
  hasMadeTrajectChoice = false;
  isEditingTrajectName = false;
  editingTrajectName = '';
  isEditingPoint: number | null = null;
  editingPointAddress = '';
  savingTrajectChanges = false;
  hasUnsavedTrajectChanges = false;
  debounceTimer: any;
  clientsToShowCount = 20; 
  showAllClients = false;
  maxInitialClients = 20; 
  itemSize = 120; 
  minBufferPx = 200;
  maxBufferPx = 400;
  saveAsTrajectControl = new FormControl(false);
  predefinedTrajectCheckbox = new FormControl(false);
  weatherLoading = false;
  startLocationWeather: WeatherData | null = null;
  endLocationWeather: WeatherData | null = null;
  weatherError = false;
  showWeatherForecast = false;
  startLocationForecast: any[] = [];
  endLocationForecast: any[] = [];
  isEditMode = false; 
  today = new Date();
  private availabilityCheckTimeout: any;
  private readonly DRAFT_KEY = 'trip_draft_v1';
  tripSettings: ITripSettings | null = null;
  private settingsSubscription: Subscription = new Subscription();
  private autoSaveSubscription: Subscription = new Subscription();

  @ViewChild('leftViewport') leftViewport!: CdkVirtualScrollViewport;
  @ViewChild('rightViewport') rightViewport!: CdkVirtualScrollViewport;
  driverTruckMap: Map<number, number> = new Map();

  //Call the services for translation lauguage
  private translation = inject(Translation);
  t(key: string): string { return this.translation.t(key); }
  //
  leftSectionItems: any[] = []; 
  rightSectionItems: any[] = []; 
  leftItemSize = 100; 
  rightItemSize = 150; 
  
  tripStatuses = [
    { value: 'Planned', label: 'Planifié' },
    { value: 'Accepted', label: 'Accepté' },
    { value: 'LoadingInProgress', label: 'Chargement en cours' },
    { value: 'DeliveryInProgress', label: 'Livraison en cours' },
    { value: 'Receipt', label: 'Réception' },
    { value: 'Cancelled', label: 'Annulé' }
  ];
  
  @ViewChild('deliveriesViewport') deliveriesViewport!: CdkVirtualScrollViewport;
  @ViewChild('capacityViewport') capacityViewport!: CdkVirtualScrollViewport;
  @ViewChild('timelineViewport') timelineViewport!: CdkVirtualScrollViewport;

  trajectCustomers: any[] = [];
  showTrajectOrderSelection = false;
  selectedTrajectOrders: Map<number, number[]> = new Map(); 
  deliveryItemSize = 100; 
  capacityItemSize = 120; 
  timelineItemSize = 150; 

  virtualLoading = false;
  deliveryStatuses = DeliveryStatusOptions;
  public Math = Math; 
  allCustomers: ICustomer[] = [];
  loading = false;
  loadingTrucks = false;
  loadingDrivers = false;
  loadingCustomers = false;
  loadingOrders = false;
  displayMode: 'grid' | 'list' = 'grid';
  deletingTraject = false;
  locations: ILocation[] = [];
  activeLocations: ILocation[] = [];
  loadingLocations = false;
  showDeliveriesSection = false;
  arrivalEqualsDeparture = new FormControl(false);
  arrivalEqualsDepartureChangeSub: Subscription | undefined;
  currentQuickAddStep: 1 | 2 | 3 = 1;
  selectedClient: ICustomer | null = null;
  selectedOrders: number[] = [];
  clientSearchControl = new FormControl('');
  filteredClients: ICustomer[] = [];
  allClientsWithPendingOrders: ICustomer[] = [];
  lastAddedOrdersCount = 0;
  showSaveAsPredefinedOption = false;
  submitted = false;
  checkingDriverAvailability = false;
  driverAvailabilityResult: any = null;
  driverAvailabilityWarning = false;
  driverAvailabilityError = false;
  dateStatsLoading = false;
  showDateStatsModal = false;
  zoneFilterControl = new FormControl(null);
  zones: any[] = []; 
  filteredClientsByZone: any[] = [];
  selectedDateStats: any = {
    date: null,
    totalClients: 0,
    totalOrders: 0,
    plannedTrips: 0,
    availableDrivers: 0,
    allReadyOrders: 0,
    ordersInTrips: 0,
    weightInTrips: 0,
    assignedDrivers: 0,
    availableTrucks: 0,
    isWeekend: false,
    dayOfWeek: '',
    recommendations: [],
    clients: [],
    plannedTripsDetails: [],
    resourceStatus: {
      driversAvailable: 0,
      driversNeeded: 0,
      driversShortage: 0,
      trucksAvailable: 0,
      trucksNeeded: 0,
      trucksShortage: 0
    }
  };

 
  loadingUnit: string = 'palette'; 
  allowEditOrder: boolean = false;
  allowLoadLateOrders: boolean = false;
  acceptOrdersWithoutAddress: boolean = false;
  
  @Input() tripId?: number;
  @Input() mode: 'create' | 'edit' = 'create';
  @Output() success = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  dropdownFilters: { client: string[], order: string[] } = {
    client: [],
    order: []
  };

  showCalendarModal = false;
  selectedDateField: 'start' | 'end' | null = null;
  calendarTitle = '';
  currentMonth = new Date().getMonth();
  currentYear = new Date().getFullYear();
  calendarDays: (Date | null)[] = [];
  weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  showDateRangeModal = false;
  calendarMode: 'single' | 'range' = 'range';
  selectedRangeStart: Date | null = null;
  selectedRangeEnd: Date | null = null;
  isSelectingRange = false;

  expandedGroups: Set<number> = new Set();

  private initialFormState: any = null;
  private initialDeliveriesState: any = null;
  private initialTrajectState: any = null;

  constructor(
    private fb: FormBuilder,
    private http: Http,
    private snackBar: MatSnackBar,
    private datePipe: DatePipe,
    private dialog: MatDialog,
    private settingsService: SettingsService, 
    @Optional() private dialogRef?: MatDialogRef<TripForm>, 
    @Optional() @Inject(MAT_DIALOG_DATA) public data?: DialogData
  ) {
    this.deliveries = this.fb.array([]);
    this.loadingUnit = 'palette';
  }

  ngOnInit(): void {
    this.initForm();
    this.loadMarques();
    this.availabilityCheckTimeout = null;
    
    // Handle empty customers case gracefully
    this.filteredClients = this.allClientsWithPendingOrders || [];
    
    this.setupSubscriptions();
    this.loadConfiguration();
    
    setTimeout(() => {
      this.captureInitialState();
    }, 100);
    
    setTimeout(() => {
      this.checkAndRestoreDraft();
    }, 500);
    
    this.setupAutoSave();
    this.initializeSections();
    this.markFormAsTouched();
    this.checkForDraftToRestore();
  }

  private setupSubscriptions(): void {
    // Client search with null check
    this.clientSearchControl.valueChanges.subscribe(() => {
      this.filterClients();
    });
    
    this.zoneFilterControl.valueChanges.subscribe(() => {
      this.filterClients();
    });

    const tripIdToUse = this.tripId || this.tripId;
    console.log('Trip ID:', this.tripId);
    
    this.isEditMode = !!(this.mode === 'edit' && tripIdToUse);
    
    // Start location changes
    this.tripForm.get('startLocationId')?.valueChanges.subscribe(() => {
      this.checkForSimilarTrajects();
      const date = this.tripForm.get('estimatedStartDate')?.value;
      if (date) {
        this.loadAvailableDrivers(date);
        this.loadTrucks();
      }
    });
    
    // End location changes
    this.tripForm.get('endLocationId')?.valueChanges.subscribe(() => {
      this.checkForSimilarTrajects();
    });
    
    // Deliveries changes
    this.deliveries.valueChanges.subscribe(() => {
      this.checkForSimilarTrajects();
    });
    
    // Driver changes
    this.tripForm.get('driverId')?.valueChanges.subscribe((driverId: number | null) => {
      if (driverId) {
        this.checkSelectedDriverAvailability(driverId);
        this.autoSelectTruckForDriver(driverId);
      }
    });
    
    // Arrival equals departure
    this.arrivalEqualsDepartureChangeSub = this.arrivalEqualsDeparture.valueChanges.subscribe(
      (checked: boolean | null) => {
        this.onArrivalEqualsDepartureChange(checked ?? false);
      }
    );
    
    // Search filters
    this.searchControl.valueChanges
      .pipe(debounceTime(300))
      .subscribe(() => {
        this.applySearchFilter();
      });

    this.clientSearchControl.valueChanges
      .subscribe(() => {
        this.applyClientSearchFilter();
      });

  // In setupSubscriptions() method, update the weather subscriptions:

// Weather updates - using location IDs
this.tripForm.get('startLocationId')?.valueChanges.subscribe(locationId => {
  console.log('📍 Start location changed to:', locationId);
  
  // Clear existing weather
  this.startLocationWeather = null;
  
  // Fetch weather for new location
  if (locationId) {
    this.fetchWeatherForStartLocation();
    
    // Also fetch for end location if it exists
    const endLocationId = this.tripForm.get('endLocationId')?.value;
    if (endLocationId) {
      setTimeout(() => this.fetchWeatherForBothLocations(), 100);
    }
  }
});

this.tripForm.get('endLocationId')?.valueChanges.subscribe(locationId => {
  console.log('📍 End location changed to:', locationId);
  
  // Clear existing weather
  this.endLocationWeather = null;
  
  // Fetch weather for new location
  if (locationId) {
    this.fetchWeatherForEndLocation();
    
    // Also fetch for start location if it exists
    const startLocationId = this.tripForm.get('startLocationId')?.value;
    if (startLocationId) {
      setTimeout(() => this.fetchWeatherForBothLocations(), 100);
    }
  }
});

// Fetch forecast when date changes
this.tripForm.get('estimatedStartDate')?.valueChanges.subscribe(() => {
  if (this.tripForm.get('estimatedStartDate')?.value) {
    this.fetchWeatherForecast();
  }
});
    
    // Driver availability
    this.tripForm.get('estimatedStartDate')?.valueChanges.subscribe(() => {
      this.checkDriverAvailabilityOnChange();
    });
    
    this.tripForm.get('estimatedDuration')?.valueChanges.subscribe(() => {
      this.checkDriverAvailabilityOnChange();
    });
    
    this.tripForm.get('driverId')?.valueChanges.subscribe(() => {
      this.checkDriverAvailabilityOnChange();
    });
  }

  private loadConfiguration(): void {
    this.loadTripSettings();
    this.listenToSettingsChanges();

 this.settingsService.orderSettings$.subscribe(settings => {
    if (settings) {
      this.loadingUnit = settings?.loadingUnit || 'palette';
      this.allowEditOrder = settings?.allowEditOrder || false;
      this.allowLoadLateOrders = settings?.allowLoadLateOrders || false;
      this.acceptOrdersWithoutAddress = settings?.acceptOrdersWithoutAddress || false;
    }
  });
    
    // Load all data with empty state handling
    this.loadAllCustomers().then(() => {
      // Even if no customers, continue loading other data
      this.loadData();
      this.loadLocations();
      this.loadZones();
      
      const tripIdToUse = this.tripId || this.tripId;
      if (!tripIdToUse) {
        this.trajectMode = 'new'; 
        this.hasMadeTrajectChoice = true;
      }
      
      // Load trucks immediately after locations are loaded
      const startDate = this.tripForm.get('estimatedStartDate')?.value;
      if (startDate) {
        console.log('Loading trucks with date:', startDate);
        this.loadTrucks();
      } else {
        console.log('No start date, loading all trucks');
        this.loadAllTrucks();
      }
      
      this.loadAllDrivers().then(() => {
        this.setupDateChangeSubscription();
      });
      
      this.loadAllConvoyeurs();
      
      if (tripIdToUse) {
        this.isEditMode = true;
        this.loadTrip(tripIdToUse).then(() => {
          setTimeout(() => {
            this.refreshDriversByDate();
          }, 300);
        });
      } else {
        this.isEditMode = false; 
        this.loadTrajects();
      }
    }).catch(error => {
      console.error('Error loading customers:', error);
      // Continue with other data loading even if customers fail
      this.loadData();
      this.loadLocations();
      this.loadZones();
      
      const tripIdToUse = this.tripId || this.tripId;
      if (!tripIdToUse) {
        this.trajectMode = 'new'; 
        this.hasMadeTrajectChoice = true;
      }
      
      // Load trucks even if customers failed
      const startDate = this.tripForm.get('estimatedStartDate')?.value;
      if (startDate) {
        console.log('Loading trucks with date (after error):', startDate);
        this.loadTrucks();
      } else {
        console.log('No start date, loading all trucks (after error)');
        this.loadAllTrucks();
      }
      
      this.loadAllDrivers().then(() => {
        this.setupDateChangeSubscription();
      });
      
      this.loadAllConvoyeurs();
      
      if (tripIdToUse) {
        this.isEditMode = true;
        this.loadTrip(tripIdToUse).then(() => {
          setTimeout(() => {
            this.refreshDriversByDate();
          }, 300);
        });
      } else {
        this.isEditMode = false; 
        this.loadTrajects();
      }
    });
  }

  private loadAllConvoyeurs(): void {
    this.loadingConvoyeurs = true;
    this.http.getConvoyeurs().subscribe({
      next: (convoyeurs) => {
        this.convoyeurs = convoyeurs;
        this.loadingConvoyeurs = false;
      },
      error: (error) => {
        console.error('Error loading convoyeurs:', error);
        this.loadingConvoyeurs = false;
      }
    });
  }

  private loadTrucks(): void {
    const startDate = this.tripForm.get('estimatedStartDate')?.value;
    
    console.log('Loading trucks with params:', { startDate });
    
    if (!startDate) {
      console.log('No start date, loading all trucks');
      this.loadAllTrucks();
      return;
    }
    
    const excludeTripId = this.tripId;
    const dateStr = this.formatDateForAPI(startDate);
    
    this.http.getAvailableTrucksByDate(dateStr, excludeTripId).subscribe({
      next: (response: any) => {
        console.log('Trucks loaded by date:', response);
        
        this.processTruckResponse(response, startDate);
      },
      error: (error) => {
        console.error('Error loading trucks by date:', error);
        this.trucks = [];
        this.availableTrucks = [];
        this.unavailableTrucks = [];
      }
    });
  }

  private setupZoneFilter(): void {
    this.zoneFilterControl.valueChanges
      .pipe(debounceTime(300))
      .subscribe(() => {
        this.applyZoneFilter();
      });
  }

  private setupDateChangeSubscription(): void {
    this.tripForm.get('estimatedStartDate')?.valueChanges.subscribe((date: Date | null) => {
      console.log('Date changed to:', date);
      if (date) {
        this.loadTrucks();
        this.loadAvailableDrivers(date);
      } else {
        console.log('Date cleared, loading all trucks');
        this.loadAllTrucks();
        this.availableDrivers = this.drivers ? [...this.drivers] : [];
        this.unavailableDrivers = [];
      }
    });
  }

  private markFormAsTouched(): void {
    this.markFormGroupTouched(this.tripForm);
    
    this.deliveries.controls.forEach(control => {
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  private formatDateForAPI(date: Date): string {
    if (!date) return '';
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  private initForm(): void {
    this.tripForm = this.fb.group({
      estimatedStartDate: [null, Validators.required],
      estimatedEndDate: [null, [Validators.required, this.dateSequenceValidator.bind(this)]],
      truckId: ['', Validators.required],
      driverId: ['', Validators.required],
      estimatedDistance: ['', [Validators.required, Validators.min(0.1)]],
      estimatedDuration: ['', [Validators.required, Validators.min(0.1)]],
      tripStatus: [{ value: TripStatus.Planned, disabled: true }],
      deliveries: this.deliveries,
      startLocationId: [null, Validators.required],
      endLocationId: [null, Validators.required],
      convoyeurId: [null], 
      trajectId: [null]
    });
    
    const startDateControl = this.tripForm.get('estimatedStartDate');
    const endDateControl = this.tripForm.get('estimatedEndDate');
  
    if (startDateControl && endDateControl) {
      startDateControl.valueChanges.subscribe(() => {
        endDateControl.updateValueAndValidity();
      });
    }
  }

  private loadData(): void {
    this.loadTrucks();
    this.loadAllDrivers();
    this.loadConvoyeurs();
    this.loadCustomers();
    this.loadAvailableOrders();
  }

  private loadTrajects(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadingTrajects = true;
      this.http.getAllTrajects().subscribe({
        next: (trajects: ITraject[]) => {
          this.trajects = trajects
            .filter(t => t.isPredefined)
            .sort((a, b) => a.name.localeCompare(b.name));
          this.loadingTrajects = false;
          resolve();
        },
        error: (error) => {
          console.error('Error loading trajects:', error);
          this.loadingTrajects = false;
          this.snackBar.open('Erreur lors du chargement des trajects prédéfinis', 'Fermer', { duration: 3000 });
          reject(error);
        }
      });
    });
  }

  private loadAllTrucks(): void {
    this.loadingAvailableTrucks = true;
    
    this.http.getTrucks().subscribe({
      next: (trucks: ITruck[]) => {
        this.trucks = trucks
          .filter(truck => truck.isEnable)
          .map(truck => ({
            ...truck,
            disabled: false,
            availabilityMessage: 'Disponible',
            tooltip: 'Tous les camions (aucune date sélectionnée)',
            isAvailable: true
          }));
        
        this.availableTrucks = [...this.trucks];
        this.unavailableTrucks = [];
        
        this.loadingAvailableTrucks = false;
      },
      error: (error) => {
        console.error('Error loading all trucks:', error);
        this.snackBar.open('Erreur lors du chargement des camions', 'Fermer', { duration: 3000 });
        this.loadingAvailableTrucks = false;
      }
    });
  }

  private processTruckResponse(response: any, date: Date): void {
    console.log('🔄 Processing truck response...');
    console.log('Raw response:', response);
    
    this.availableTrucks = [];
    this.unavailableTrucks = [];
    this.trucks = [];
    
    if (!response || !response.data) {
      console.warn('❌ No data in response');
      return;
    }
    
    const data = response.data;
    const currentTruckId = this.tripForm.get('truckId')?.value;
    
    // Process available trucks
    if (data.availableTrucks && Array.isArray(data.availableTrucks)) {
      console.log(`✅ Processing ${data.availableTrucks.length} available trucks`);
      
      this.availableTrucks = data.availableTrucks.map((apiTruck: any) => {
        const typeTruckData = apiTruck.typeTruck || null;
        return {
          id: apiTruck.Id || apiTruck.id,
          immatriculation: apiTruck.Immatriculation || apiTruck.immatriculation || 'N/A',
          marqueTruckId: apiTruck.marqueTruckId || null,
          model: apiTruck.Model || apiTruck.model || '',
          capacity: apiTruck.typeTruck?.capacity || 0,
          capacityUnit: this.loadingUnit || 'tonnes',
          status: apiTruck.Status || apiTruck.status || 'active',
          isEnable: apiTruck.IsEnable || apiTruck.isEnable || true,
          color: apiTruck.Color || apiTruck.color || '',
          disabled: false,
          availabilityMessage: 'Disponible',
          tooltip: `Disponible le ${this.formatDateForDisplay(date)}`,
          isAvailable: true,
          availabilityDate: date,
          zoneId: apiTruck.ZoneId || apiTruck.zoneId || apiTruck.Zone?.id || null, 
          typeTruck: typeTruckData ? {
            id: typeTruckData.Id || typeTruckData.id,
            type: typeTruckData.type || '',
            capacity: typeTruckData.capacity,
            unit: typeTruckData.unit
          } : null
        };
      });
    }
    
    // Process unavailable trucks
    if (data.unavailableTrucks && Array.isArray(data.unavailableTrucks)) {
      console.log(`⚠️ Processing ${data.unavailableTrucks.length} unavailable trucks`);
      
      this.unavailableTrucks = data.unavailableTrucks.map((truck: any) => {
        return {
          id: truck.Id || truck.id,
          immatriculation: truck.Immatriculation || truck.immatriculation || 'N/A',
          marqueTruckId: truck.marqueTruckId || null,
          model: truck.Model || truck.model || '',
          capacity: truck.typeTruck?.capacity || 0,
          capacityUnit: this.loadingUnit,
          reason: truck.reason || 'Non disponible',
          status: truck.Status || truck.status || 'inactive',
          disabled: true,
          availabilityMessage: truck.reason || 'Non disponible',
          tooltip: `Indisponible le ${this.formatDateForDisplay(date)} - ${truck.reason || 'Raison inconnue'}`,
          isAvailable: false,
          zoneId: truck.ZoneId || truck.zoneId || null
        };
      });
    }
    
    // IMPORTANT: Si nous sommes en mode édition, forcer l'ajout du camion actuel
    if (this.tripId && currentTruckId) {
      this.forceAddCurrentTruck(currentTruckId, date);
    }
    
    this.trucks = [...this.availableTrucks, ...this.unavailableTrucks];
    
    console.log('📊 Final state:', {
      availableCount: this.availableTrucks.length,
      unavailableCount: this.unavailableTrucks.length,
      totalCount: this.trucks.length,
      currentTruckId: currentTruckId,
      isInAvailable: this.availableTrucks.some(t => t.id === currentTruckId),
      isInUnavailable: this.unavailableTrucks.some(t => t.id === currentTruckId)
    });
  }

  /**
   * Force l'ajout du camion actuel dans la liste des camions disponibles
   */
  private forceAddCurrentTruck(truckId: number, date: Date): void {
    // Vérifier si le camion est déjà dans la liste
    const alreadyInAvailable = this.availableTrucks.some(t => t.id === truckId);
    const alreadyInUnavailable = this.unavailableTrucks.some(t => t.id === truckId);
    
    if (alreadyInAvailable || alreadyInUnavailable) {
      // S'il est dans unavailable, le déplacer vers available
      if (alreadyInUnavailable) {
        const truckIndex = this.unavailableTrucks.findIndex(t => t.id === truckId);
        if (truckIndex !== -1) {
          const truck = this.unavailableTrucks[truckIndex];
          this.unavailableTrucks.splice(truckIndex, 1);
          
          this.availableTrucks.push({
            ...truck,
            disabled: false,
            availabilityMessage: 'Camion actuel du voyage',
            tooltip: `Camion actuellement assigné à ce voyage (disponible pour modification)`,
            isAvailable: true,
            isCurrentTripTruck: true
          });
        }
      }
      return;
    }
    
    // Si le camion n'est pas dans la réponse, le récupérer depuis l'API
    this.loadingAvailableTrucks = true;
    this.http.getTruck(truckId).subscribe({
      next: (truck: ITruck) => {
        const currentTruck = {
          ...truck,
          disabled: false,
          availabilityMessage: 'Camion actuel du voyage',
          tooltip: `Camion actuellement assigné à ce voyage le ${this.formatDateForDisplay(date)}`,
          isAvailable: true,
          isCurrentTripTruck: true,
          availabilityDate: date
        };
        
        this.availableTrucks.push(currentTruck);
        this.trucks = [...this.availableTrucks, ...this.unavailableTrucks];
        this.loadingAvailableTrucks = false;
        
        console.log('✅ Camion actuel ajouté manuellement:', currentTruck);
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement du camion actuel:', error);
        this.loadingAvailableTrucks = false;
      }
    });
  }

  private loadCustomers(): void {
    this.loadingCustomers = true;
    
    this.http.getCustomersWithReadyToLoadOrders().subscribe({
      next: (customers) => {
        this.customers = customers;
        this.allClientsWithPendingOrders = customers;
        this.filteredClients = [...this.allClientsWithPendingOrders];
        this.loadingCustomers = false;
        
        console.log(`Loaded ${customers.length} customers with ReadyToLoad orders`);
      },
      error: (error) => {
        console.error('Error loading customers with ready orders:', error);
        this.loadingCustomers = false;
        this.snackBar.open('Erreur lors du chargement des clients', 'Fermer', { duration: 3000 });
      }
    });
  }

  private loadAvailableOrders(): void {
    this.loadingOrders = true;
    this.http.getOrders().subscribe({
      next: (response: any) => {
        const orders = response.data ?? response.orders ?? response;
        this.allOrders = Array.isArray(orders) ? orders : [];
        
        this.ordersForQuickAdd = this.allOrders.filter(order =>
          order.status?.toLowerCase() === OrderStatus.ReadyToLoad?.toLowerCase()
        );
        
        this.filteredOrders = [...this.ordersForQuickAdd];
        
        this.loadClientsWithPendingOrders();
        
        this.loadingOrders = false;
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.loadingOrders = false;
        this.snackBar.open('Erreur lors du chargement des commandes', 'Fermer', { duration: 3000 });
      }
    });
  }

  private loadClientsWithPendingOrders(): void {
    const clientIdsWithPendingOrders = new Set<number>();
    
    this.ordersForQuickAdd.forEach(order => {
      if (order.customerId) {
        clientIdsWithPendingOrders.add(order.customerId);
      }
    });
    
    this.allClientsWithPendingOrders = this.customers.filter(customer => 
      clientIdsWithPendingOrders.has(customer.id)
    );
    
    this.filteredClients = [...this.allClientsWithPendingOrders];
  }

  private loadTrip(tripId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loading = true;
      this.http.getTrip(tripId).subscribe({
        next: (response: any) => {
          const trip = response.data || response;
          
          if (!trip) {
            console.error('No trip data found in response');
            this.snackBar.open('Aucune donnée de voyage trouvée', 'Fermer', { duration: 3000 });
            this.loading = false;
            return;
          }

          const toLocalDate = (iso: string | null): Date | null => {
            if (!iso || iso.startsWith('0001-01-01')) return null;
            const d = new Date(iso);
            return new Date(
              d.getFullYear(),
              d.getMonth(),
              d.getDate()
            );
          };

          const startDate = toLocalDate(trip.estimatedStartDate);
          const endDate = toLocalDate(trip.estimatedEndDate);
        
          const truckId = trip.truckId && trip.truckId !== 0 ? trip.truckId : trip.truck?.id ?? null;
          const driverId = trip.driverId && trip.driverId !== 0 ? trip.driverId : trip.driver?.id ?? null;
          const convoyeurId = trip.convoyeurId && trip.convoyeurId !== 0 ? trip.convoyeurId : trip.convoyeur?.id ?? null;
          const startLocationId = trip.startLocationId || trip.startLocation?.id || null;
          const endLocationId = trip.endLocationId || trip.endLocation?.id || null;
          const trajectId = trip.trajectId || null;
        
          this.tripForm.patchValue({
            estimatedStartDate: startDate,
            estimatedEndDate: endDate,
            truckId: truckId,
            driverId: driverId,
            convoyeurId: convoyeurId,
            estimatedDistance: trip.estimatedDistance || 0,
            estimatedDuration: trip.estimatedDuration || 0,
            tripStatus: trip.tripStatus || TripStatus.Planned,
            startLocationId: startLocationId,
            endLocationId: endLocationId,
            trajectId: trajectId
          }, { emitEvent: false });
   
          this.deliveries.clear();
          
          if (trip.deliveries && trip.deliveries.length > 0) {
            this.trajectMode = 'new';
            this.hasMadeTrajectChoice = true;
            this.loadDeliveriesFromTrip(trip.deliveries || []);
            if (trajectId) 
              this.checkAndDisplayTrajectStatus(trajectId);
          } else {
            this.trajectMode = 'new';
            this.hasMadeTrajectChoice = true;
          }
          
          this.loading = false;
          resolve();
        },
        error: (error) => {
          console.error('Error loading trip:', error);
          this.snackBar.open('Erreur lors du chargement du voyage', 'Fermer', { duration: 3000 });
          this.loading = false;
          reject(error);
        }
      });
    });
  }

  private async checkAndDisplayTrajectStatus(trajectId: number): Promise<void> {
    try {
      this.http.getTrajectById(trajectId).subscribe({
        next: (traject: ITraject) => {
          if (traject) {
            this.selectedTraject = traject;
            this.selectedTrajectControl.setValue(traject.id, { emitEvent: false });
            
            this.trajectMode = 'predefined';
            this.hasMadeTrajectChoice = true;
            
            if (traject.startLocationId) {
              this.tripForm.get('startLocationId')?.setValue(traject.startLocationId, { emitEvent: true });
              this.tripForm.get('startLocationId')?.markAsTouched();
              this.tripForm.get('startLocationId')?.updateValueAndValidity();
            }
            
            if (traject.endLocationId) {
              this.tripForm.get('endLocationId')?.setValue(traject.endLocationId, { emitEvent: true });
              this.tripForm.get('endLocationId')?.markAsTouched();
              this.tripForm.get('endLocationId')?.updateValueAndValidity();
            }
            
            if (!traject.isPredefined) {
              this.saveAsPredefined = false;
              this.showSaveAsPredefinedOption = true;
            } else {
              this.saveAsPredefined = true;
              this.showSaveAsPredefinedOption = false;
            }
            
            this.loadTrajectCustomersForOrderSelection(traject);
          } else {
            this.trajectMode = 'new';
            this.hasMadeTrajectChoice = true;
          }
        },
        error: (error) => {
          console.error('Error loading traject:', error);      
          this.trajectMode = 'new';
          this.hasMadeTrajectChoice = true;
        }
      });
    } catch (error) {
      console.error('Error checking traject:', error);
    }
  }

  private loadDeliveriesFromTrip(deliveries: any[]): void {
    if (deliveries.length === 0) {
      this.showDeliveriesSection = false;
      return;
    }
  
    const sortedDeliveries = [...deliveries].sort((a, b) => 
      (a.sequence || 0) - (b.sequence || 0)
    );
    
    sortedDeliveries.forEach(delivery => {
      const deliveryData = {
        customerId: delivery.customerId || '',
        orderId: delivery.orderId || '', 
        deliveryAddress: delivery.deliveryAddress || '',
        sequence: delivery.sequence || 0,
        plannedTime: delivery.plannedTime,
        notes: delivery.notes || ''
      };
      
      this.addDelivery(deliveryData);
    });
    
    this.showDeliveriesSection = true;
  }

  onTrajectModeChange(): void {
    this.hasMadeTrajectChoice = true;
    
    if (this.trajectMode === 'predefined') {
      this.deliveries.clear();
      this.clearTrajectSelection();
      if (this.trajects.length === 0) {
        this.loadTrajects();
      }
      this.saveAsPredefined = false;
      
    } else if (this.trajectMode === 'new') {
      this.clearTrajectSelection();
    }
    
    this.showDeliveriesSection = false;
  }

  private updateEstimationsFromTraject(traject: ITraject): void {
    const pointsCount = traject.points.length;
    const estimatedDistance = pointsCount * 15;
    const estimatedDuration = pointsCount * 0.75;
    
    this.tripForm.patchValue({
      estimatedDistance: estimatedDistance.toFixed(1),
      estimatedDuration: estimatedDuration.toFixed(1)
    });
  }

  clearTrajectSelection(): void {
    if (this.selectedTraject && this.hasDeliveryData()) {
      const confirmed = confirm('Changer de traject effacera les livraisons que vous avez ajoutées. Voulez-vous continuer ?');
      if (!confirmed) {
        this.selectedTrajectControl.setValue(this.selectedTraject?.id || null);
        return;
      }
    }
    
    this.selectedTraject = null;
    this.selectedTrajectControl.setValue(null);
    this.deliveries.clear();
    this.showSaveAsPredefinedOption = false;
  }

  formatTrajectDate(dateString: string): string {
    return this.datePipe.transform(dateString, 'dd/MM/yyyy') || '';
  }

  calculateTrajectDistance(): number {
    if (!this.selectedTraject || !this.selectedTraject.points) {
      return 0;
    }
    
    const distance = this.selectedTraject.points.length * 15;
    return Math.round(distance);
  }

  onSaveAsPredefinedChange(checked: boolean): void {
    this.saveAsPredefined = checked;
    
    if (this.tripId && this.selectedTraject && checked) {
      Swal.fire({
        title: 'Enregistrer comme traject standard',
        text: 'Voulez-vous enregistrer ce traject comme standard pour pouvoir le réutiliser dans d\'autres voyages ?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Oui, enregistrer',
        cancelButtonText: 'Non',
        confirmButtonColor: '#3b82f6'
      }).then((result) => {
        if (result.isConfirmed) {
          this.saveTrajectAsPredefined();
        } else {
          this.saveAsPredefined = false;
        }
      });
    }
    
    if (checked && this.trajectMode === 'new' && (!this.trajectName || this.trajectName.trim() === '')) {
      const startLocationName = this.getSelectedStartLocationInfo();
      const endLocationName = this.getSelectedEndLocationInfo();
      
      if (startLocationName !== 'Non sélectionné' && 
          endLocationName !== 'Non sélectionné' &&
          startLocationName !== 'Lieu inconnu' && 
          endLocationName !== 'Lieu inconnu') {
        
        this.trajectName = `${startLocationName} - ${endLocationName}`;
        
      } else if (this.deliveries.length > 0) {
        const firstClient = this.getClientName(this.deliveryControls[0]?.get('customerId')?.value);
        const lastClient = this.getClientName(this.deliveryControls[this.deliveries.length - 1]?.get('customerId')?.value);
        
        if (firstClient && lastClient && firstClient !== lastClient) {
          this.trajectName = `${firstClient} - ${lastClient}`;
        } else if (this.deliveries.length > 0) {
          this.trajectName = `Trajet avec ${this.deliveries.length} livraisons`;
        }
      }
    }
  }

  async saveTrajectAsPredefined(): Promise<void> {
    if (!this.selectedTraject) return;

    this.savingTrajectChanges = true;
    
    const trajectData: any = {
      name: this.selectedTraject.name,
      points: this.selectedTraject.points.map(point => ({
        location: point.location,
        order: point.order,
        clientId: point.clientId
      })),
      startLocationId: this.tripForm.get('startLocationId')?.value,
      endLocationId: this.tripForm.get('endLocationId')?.value,
      isPredefined: true 
    };
    
    this.http.updateTraject(this.selectedTraject.id, trajectData).subscribe({
      next: (result) => {
        this.savingTrajectChanges = false;
        this.selectedTraject = result;
        this.saveAsPredefined = true;
        this.showSaveAsPredefinedOption = false;
        
        const index = this.trajects.findIndex(t => t.id === result.id);
        if (index !== -1) {
          this.trajects[index] = result;
        }
        
        this.snackBar.open('Traject enregistré comme standard avec succès', 'Fermer', { duration: 3000 });
      },
      error: (error) => {
        this.savingTrajectChanges = false;
        console.error('Error updating traject:', error);
        this.snackBar.open('Erreur lors de l\'enregistrement du traject', 'Fermer', { duration: 3000 });
      }
    });
  }

  get deliveryControls(): FormGroup[] {
    return this.deliveries.controls as FormGroup[];
  }

  addDelivery(deliveryData?: any): void {
    console.log(deliveryData)
    const sequence = this.deliveries.length + 1;
    let plannedTime = deliveryData?.plannedTime || '';
   
    if (plannedTime && typeof plannedTime === 'string') {
      if (plannedTime.includes('T')) {
        const date = new Date(plannedTime);
        if (!isNaN(date.getTime())) {
          const hours = date.getHours().toString().padStart(2, '0');
          const minutes = date.getMinutes().toString().padStart(2, '0');
          plannedTime = `${hours}:${minutes}`;
        }
      } else if (plannedTime.length > 5) {
        plannedTime = plannedTime.substring(0, 5);
      }
    }

    const deliveryGroup = this.fb.group({
      customerId: [deliveryData?.customerId || '', Validators.required],
      orderId: [deliveryData?.orderId || '', Validators.required],
      deliveryAddress: [deliveryData?.deliveryAddress || '', [Validators.required, Validators.maxLength(500)]],
      sequence: [deliveryData?.sequence || sequence, [Validators.required, Validators.min(1)]],
      plannedTime: [plannedTime], 
      notes: [deliveryData?.notes || '']
    });

    this.deliveries.push(deliveryGroup);
    this.dropdownFilters.client.push('');
    this.dropdownFilters.order.push('');
    if (!this.showDeliveriesSection) {
      this.showDeliveriesSection = true;
    }
  }

  removeDelivery(index: number): void {
    const removedOrderId = this.deliveryControls[index].get('orderId')?.value;
    
    this.deliveries.removeAt(index);
    this.dropdownFilters.client.splice(index, 1);
    this.dropdownFilters.order.splice(index, 1);
    this.updateDeliverySequences();
    
    if (removedOrderId) {
      const order = this.allOrders.find(o => o.id === removedOrderId);
      if (order && order.status?.toLowerCase() === OrderStatus.ReadyToLoad?.toLowerCase()) {
        if (!this.ordersForQuickAdd.some(o => o.id === removedOrderId)) {
          this.ordersForQuickAdd.push(order);
          this.filteredOrders.push(order);
          this.loadClientsWithPendingOrders();
        }
      }
    }
    
    if (this.deliveries.length === 0) {
      this.showDeliveriesSection = false;
    }
  }

  onCustomerChange(index: number): void {
    const deliveryGroup = this.deliveryControls[index];
    const customerId = deliveryGroup.get('customerId')?.value;
    
    if (customerId) {
      deliveryGroup.get('orderId')?.setValue('');
      
      const customer = this.customers.find(c => c.id === customerId);
      if (customer && customer.adress) {
        deliveryGroup.get('deliveryAddress')?.setValue(customer.adress);
      }
    }
  }

  getCustomerOrders(index: number): IOrder[] {
    const deliveryGroup = this.deliveryControls[index];
    const customerId = deliveryGroup.get('customerId')?.value;
    
    if (!customerId) {
      const orderId = deliveryGroup.get('orderId')?.value;
      if (orderId) {
        const order = this.allOrders.find(o => o.id === parseInt(orderId));
        if (order) {
          deliveryGroup.get('customerId')?.setValue(order.customerId);
          return [order];
        }
      }
      return [];
    }
    
    return this.allOrders.filter(order => 
      order.customerId === parseInt(customerId) && 
      (order.status?.toLowerCase() === OrderStatus.ReadyToLoad?.toLowerCase())
    );
  }

  getClientName(customerId: number): string {
    if (!customerId) return '';
    const customer = this.allCustomers.find(c => c.id === customerId);
    return customer ? (customer.name || 'Nom non disponible') : '';
  }

  getClientAddress(customerId: number): string {
    if (!customerId) return '';
    const customer = this.allCustomers.find(c => c.id === customerId);
    return customer ? (customer.adress || 'Adresse non disponible') : '';
  }

  getOrderReference(orderId: number): string {
    if (!orderId) return 'N/A';
    const order = this.allOrders.find(o => o.id === orderId);
    return order ? order.reference : 'Commande inconnue';
  }

  getOrderType(orderId: number): string {
    if (!orderId) return 'N/A';
    const order = this.allOrders.find(o => o.id === orderId);
    return order ? (order.type || 'Non spécifié') : 'N/A';
  }

  getOrderWeight(orderId: number): number {
    if (!orderId) return 0;
    const order = this.allOrders.find(o => o.id === orderId);
    return order ? order.weight : 0;
  }

getSelectedTruckInfo(): string {
  const truckId = this.tripForm.get('truckId')?.value;
  if (!truckId) return 'Non sélectionné';
  
  const truck = this.trucks.find(t => t.id === truckId);
  if (!truck) return 'Camion inconnu';
  
  const marqueName = this.getMarqueName(truck.marqueTruckId);
  return `${truck.immatriculation} - ${marqueName}`;
}

getSelectedConvoyeurInfo(): string {
  const convoyeurId = this.tripForm.get('convoyeurId')?.value;
  if (!convoyeurId) return 'Non sélectionné';
  
  const convoyeur = this.convoyeurs.find(c => c.id === convoyeurId);
  return convoyeur ? `${convoyeur.name} (${convoyeur.matricule})` : 'Convoyeur inconnu';
}

  quickAddOrder(order: IOrder): void {
    const customer = this.customers.find(c => c.id === order.customerId);
    
    const newDelivery = {
      customerId: order.customerId,
      orderId: order.id,
      deliveryAddress: customer?.adress || '',
      sequence: this.deliveries.length + 1,
      notes: `Commande rapide: ${order.reference}`,
    };
    
    this.addDelivery(newDelivery);
    
    this.ordersForQuickAdd = this.ordersForQuickAdd.filter(o => o.id !== order.id);
    this.filteredOrders = this.filteredOrders.filter(o => o.id !== order.id);
    this.loadClientsWithPendingOrders();
    
    this.snackBar.open('Commande ajoutée au trajet', 'Fermer', { duration: 2000 });
  }

  getZoneName(zoneId: number): string {
    if (!zoneId) return '';
    const zone = this.zones.find(z => z.id === zoneId);
    return zone ? zone.name : 'Zone inconnue';
  }

  private applyClientSearchFilter(): void {
    this.applyCombinedFilters();
  }

  clearClientSearch(): void {
    this.clientSearchControl.setValue('');
    this.filteredClients = [...this.allClientsWithPendingOrders];
  }

  getClientPendingOrdersCount(clientId: number): number {
    return this.ordersForQuickAdd.filter(order => 
      order.customerId === clientId
    ).length;
  }

  getClientTotalWeight(clientId: number): number {
    return this.ordersForQuickAdd
      .filter(order => order.customerId === clientId)
      .reduce((total, order) => total + order.weight, 0);
  }

  async selectClientForQuickAdd(client: ICustomer): Promise<void> {
    this.selectedClient = client;
    
    const clientOrders = this.getClientPendingOrders(client.id);
    const alreadyAddedCount = this.getAlreadyAddedOrdersCount(client.id);
    
    if (alreadyAddedCount > 0) {
      const confirmed = await this.showAlreadyAddedAlert(client.name, alreadyAddedCount, clientOrders.length);
      if (!confirmed) {
        this.selectedClient = null;
        return;
      }
    }
    
    this.currentQuickAddStep = 2;
    this.selectedOrders = [];
    
    this.selectAllOrders();
  }

  getClientPendingOrders(clientId: number): IOrder[] {
    return this.ordersForQuickAdd.filter(order => 
      order.customerId === clientId
    );
  }

  getAlreadyAddedOrdersCount(clientId: number): number {
    return this.deliveryControls.filter(delivery => 
      delivery.get('customerId')?.value === clientId
    ).length;
  }

  private async showAlreadyAddedAlert(
    clientName: string, 
    alreadyAdded: number, 
    totalOrders: number
  ): Promise<boolean> {
    const remaining = totalOrders - alreadyAdded;
    
    return new Promise((resolve) => {
      Swal.fire({
        title: 'Commandes déjà ajoutées',
        html: `
          <div style="text-align: left;">
            <p><strong>${clientName}</strong></p>
            <p>${alreadyAdded} commande(s) de ce client sont déjà dans le voyage.</p>
            <p>Il reste ${remaining} commande(s) en attente.</p>
            <p>Voulez-vous continuer avec les commandes restantes ?</p>
          </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Continuer',
        cancelButtonText: 'Annuler',
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#6b7280'
      }).then((result) => {
        resolve(result.isConfirmed);
      });
    });
  }

  goBackToClientSelection(): void {
    this.currentQuickAddStep = 1;
    this.selectedClient = null;
    this.selectedOrders = [];
  }

  toggleOrderSelection(order: IOrder): void {
    const index = this.selectedOrders.indexOf(order.id);
    if (index > -1) {
      this.selectedOrders.splice(index, 1);
    } else {
      this.selectedOrders.push(order.id);
    }
  }

  isOrderSelected(orderId: number): boolean {
    return this.selectedOrders.includes(orderId);
  }

  selectAllOrders(): void {
    this.selectedOrders = this.clientPendingOrders.map(order => order.id);
  }

  deselectAllOrders(): void {
    this.selectedOrders = [];
  }

  get clientPendingOrders(): IOrder[] {
    if (!this.selectedClient) return [];
    return this.getClientPendingOrders(this.selectedClient.id);
  }

  get selectedOrdersCount(): number {
    return this.selectedOrders.length;
  }

  calculateSelectedWeight(): number {
    return this.selectedOrders.reduce((total, orderId) => {
      const order = this.allOrders.find(o => o.id === orderId);
      return total + (order?.weight || 0);
    }, 0);
  }

  async confirmAddOrders(): Promise<void> {
    if (this.selectedOrdersCount === 0 || !this.selectedClient) return;

    const selectedWeight = this.calculateSelectedWeight();
    
    const capacityCheck = await this.checkCapacityBeforeAddingOrders(selectedWeight);
    if (!capacityCheck) {
      return;
    }

    const totalOrders = this.clientPendingOrders.length;
    const notSelectedCount = totalOrders - this.selectedOrdersCount;

    if (notSelectedCount > 0) {
      const result = await this.showPartialSelectionAlert(
        this.selectedClient.name,
        this.selectedOrdersCount,
        notSelectedCount
      );

      if (result === 'cancel') {
        return;
      } else if (result === 'selectAll') {
        this.selectAllOrders();

        const newSelectedWeight = this.calculateSelectedWeight();
        const newCapacityCheck = await this.checkCapacityBeforeAddingOrders(newSelectedWeight);
        if (!newCapacityCheck) {
          return;
        }

        this.addSelectedOrdersToDeliveries();
        this.currentQuickAddStep = 3;
        this.lastAddedOrdersCount = this.selectedOrdersCount;
      } else if (result === 'continuePartial') {
        this.addSelectedOrdersToDeliveries();
        this.currentQuickAddStep = 3;
        this.lastAddedOrdersCount = this.selectedOrdersCount;
      }
    } else {
      this.addSelectedOrdersToDeliveries();
      this.currentQuickAddStep = 3;
      this.lastAddedOrdersCount = this.selectedOrdersCount;
    }
  }

  private async showPartialSelectionAlert(
    clientName: string,
    selectedCount: number,
    notSelectedCount: number
  ): Promise<'selectAll' | 'continuePartial' | 'cancel'> {
    const selectedWeight = this.calculateSelectedWeight();
    const truck = this.getSelectedTruck();
    const currentWeight = this.calculateTotalWeight();
    const totalAfterAddition = currentWeight + selectedWeight;
    const percentageAfter = truck ? (totalAfterAddition / (truck.typeTruck?.capacity || 1)) * 100 : 0;
    
    const result = await Swal.fire({
      title: 'Sélection partielle',
      html: `
        <div style="text-align: left;">
          <p><strong>${clientName}</strong></p>
          <p>Vous avez sélectionné ${selectedCount} commande(s) (${selectedWeight.toFixed(2)} palette).</p>
          <p>${notSelectedCount} commande(s) ne seront pas ajoutées.</p>
          ${truck ? `
            <div style="background-color: #f3f4f6; padding: 10px; border-radius: 5px; margin: 10px 0;">
              <p><strong>Impact sur la capacité:</strong></p>
              <p>Poids actuel: ${currentWeight.toFixed(2)} palette</p>
              <p>+ Ajout: ${selectedWeight.toFixed(2)} palette</p>
              <p>= Total: ${totalAfterAddition.toFixed(2)} palette / ${truck.typeTruck?.capacity} palette</p>
              <p>Utilisation: ${percentageAfter.toFixed(1)}%</p>
            </div>
          ` : ''}
          ${percentageAfter >= 90 ? `
            <p style="color: #f59e0b; font-weight: bold; margin-top: 10px;">
              ⚠️ La capacité sera presque pleine (${percentageAfter.toFixed(1)}%)
            </p>
          ` : ''}
        </div>
      `,
      icon: percentageAfter >= 90 ? 'warning' : 'info',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'Sélectionner toutes',
      denyButtonText: `Continuer avec ${selectedCount} commande(s)`,
      cancelButtonText: 'Annuler',
      confirmButtonColor: '#3b82f6',
      denyButtonColor: percentageAfter >= 90 ? '#f59e0b' : '#10b981',
      cancelButtonColor: '#6b7280'
    });
    
    if (result.isConfirmed) {
      return 'selectAll';
    } else if (result.isDenied) {
      return 'continuePartial';
    } else {
      return 'cancel';
    }
  }

  finishQuickAdd(): void {
    this.currentQuickAddStep = 1;
    this.selectedClient = null;
    this.selectedOrders = [];
    
    if (!this.showDeliveriesSection) {
      this.showDeliveriesSection = true;
    }
  }

  previewOrder(order: IOrder): void {
    const customer = this.customers.find(c => c.id === order.customerId);
    
    Swal.fire({
      title: order.reference,
      html: `
        <div style="text-align: left;">
          <div style="margin-bottom: 1rem;">
            <strong>Client:</strong> ${customer?.name || 'N/A'}<br>
            <strong>Type:</strong> ${order.type || 'Standard'}<br>
            <strong>Poids:</strong> ${order.weight} tonne<br>
            <strong>Statut:</strong> ${order.status || 'N/A'}<br>
          </div>
          ${order.notes ? `
            <div style="background-color: #f8f9fa; padding: 0.5rem; border-radius: 4px;">
              <strong>Notes:</strong> ${order.notes}
            </div>
          ` : ''}
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Fermer'
    });
  }

  formatOrderDate(dateString: string): string {
    return this.datePipe.transform(dateString, 'dd/MM/yyyy') || '';
  }

  async onSubmit(): Promise<void> {
    this.submitted = true;
 
    if (this.trajectMode === 'predefined' && this.selectedTraject) {
      if (!this.selectedTraject.startLocationId && !this.tripForm.get('startLocationId')?.value) {
        Swal.fire({
          icon: 'warning',
          title: 'Attention',
          text: 'Ce traject prédéfini n\'a pas de lieu de départ. Veuillez en sélectionner un.',
          confirmButtonText: 'OK'
        });
        return;
      }
      
      if (!this.selectedTraject.endLocationId && !this.tripForm.get('endLocationId')?.value) {
        Swal.fire({
          icon: 'warning',
          title: 'Attention',
          text: 'Ce traject prédéfini n\'a pas de lieu d\'arrivée. Veuillez en sélectionner un.',
          confirmButtonText: 'OK'
        });
        return;
      }
    }
    
    if (this.tripForm.get('endLocationId')?.disabled) {
      this.tripForm.get('endLocationId')?.enable();
    }
    
    if (!this.tripForm.get('startLocationId')?.value || !this.tripForm.get('endLocationId')?.value) {
      Swal.fire({
        icon: 'warning',
        title: 'Attention',
        text: 'Veuillez sélectionner les lieux de départ et d\'arrivée',
        confirmButtonText: 'OK'
      });
      this.tripForm.get('startLocationId')?.markAsTouched();
      this.tripForm.get('endLocationId')?.markAsTouched();
      return;
    }
    
    if (this.tripForm.invalid || this.deliveries.length === 0) {
      this.markFormGroupTouched(this.tripForm);
      this.deliveryControls.forEach(group => this.markFormGroupTouched(group));
      
      if (this.deliveries.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Attention',
          text: 'Ajoutez au moins une livraison',
          confirmButtonText: 'OK'
        });
      }
      return;
    }
    
    if (this.trajectMode === 'new' && !this.saveAsPredefined) {
      const result = await Swal.fire({
        icon: 'warning',
        title: 'Trajet non défini comme standard',
        html: `
          <div style="text-align: left; padding: 10px;">
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
              <mat-icon style="color: #f59e0b; margin-right: 10px; font-size: 24px;">warning</mat-icon>
              <div>
                <h4 style="margin: 0; color: #1f2937;">Vous n'avez pas défini ce trajet comme standard</h4>
              </div>
            </div>
            
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 0 0 10px 0; color: #92400e; font-weight: 500;">Conséquences :</p>
              <ul style="margin: 0; padding-left: 20px; color: #92400e;">
                <li style="margin-bottom: 5px;">Ce trajet ne sera pas enregistré dans la liste des trajets prédéfinis</li>
                <li style="margin-bottom: 5px;">Vous ne pourrez pas le réutiliser pour d'autres voyages</li>
                <li>Il sera associé uniquement à ce voyage</li>
              </ul>
            </div>
            
            <p style="color: #4b5563; margin-bottom: 20px; font-size: 14px;">
              Voulez-vous quand même continuer sans enregistrer ce trajet comme standard ?
            </p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Oui, continuer sans enregistrer',
        cancelButtonText: 'Non, définir comme standard',
        confirmButtonColor: '#6b7280',
        cancelButtonColor: '#3b82f6',
        reverseButtons: true,
        allowOutsideClick: false,
        allowEscapeKey: false,
        customClass: {
          container: 'traject-warning-swal-container',
          popup: 'traject-warning-swal-popup',
          title: 'traject-warning-swal-title',
          confirmButton: 'traject-warning-confirm-btn',
          cancelButton: 'traject-warning-cancel-btn'
        }
      });

      if (result.isDismissed) {
        this.saveAsPredefined = true;
        
        if (!this.trajectName || this.trajectName.trim() === '') {
          this.generateDefaultTrajectName();
        }
        
        setTimeout(() => {
          const trajectNameInput = document.querySelector('input[placeholder*="Ex: Paris-Lyon-Marseille"]') as HTMLInputElement;
          if (trajectNameInput) {
            trajectNameInput.focus();
            trajectNameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        
        return; 
      }
    }
    
    //if (!this.validateCapacity()) {
    //  return;
    //}
    
    if (this.saveAsPredefined && !this.trajectName.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Attention',
        text: 'Veuillez saisir un nom pour le traject',
        confirmButtonText: 'OK'
      });
      return;
    }
    
    const formValue = this.tripForm.value;
    const deliveries = this.prepareDeliveries(formValue.estimatedStartDate);
    
    try {
      const trajectId = await this.handleTrajectCreation();
      if (this.tripId) {
        this.updateTrip(formValue, deliveries, trajectId);
      } else {
        this.createTrip(formValue, deliveries, trajectId);
      }
    } catch (error) {
      console.error('Error handling traject:', error);
      if (this.tripId) {
        this.updateTrip(formValue, deliveries, null);
      } else {
        this.createTrip(formValue, deliveries, null);
      }
    }
    
    const startDate = this.estimatedStartDateControl?.value;
    const endDate = this.estimatedEndDateControl?.value;
  
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (end < start) {
        Swal.fire({
          icon: 'error',
          title: 'Dates invalides',
          text: 'La date de fin doit être après la date de début',
          confirmButtonText: 'OK'
        });
        return;
      }
    }
  }

  private async handleTrajectCreation(): Promise<number | null> {
    try {
      const existingTrajectId = this.tripForm?.get('trajectId')?.value;
      if (existingTrajectId) {
        return existingTrajectId;
      }
      
      if (this.trajectMode === 'predefined' && this.selectedTraject?.id) {
        return this.selectedTraject.id;
      }
      
      if (!this.deliveries || this.deliveries.length === 0) {
        console.warn('No deliveries to create traject from');
        return null;
      }
      
      let trajectName = '';
      if (this.trajectName && this.trajectName.trim() !== '') {
        trajectName = this.trajectName.trim();
      } else {
        const startLocation = this.getSelectedStartLocationInfo() || 'Départ';
        const endLocation = this.getSelectedEndLocationInfo() || 'Arrivée';
        const dateStr = new Date().toISOString().slice(0, 10);
        trajectName = `Trajet ${dateStr} ${startLocation} → ${endLocation}`;
      }
      
      const trajectId = await this.createTrajectFromDeliveries(trajectName, this.saveAsPredefined);
      
      if (this.tripForm) {
        this.tripForm.patchValue({ trajectId: trajectId });
      }
      
      return trajectId;
      
    } catch (error) {
      console.error('Failed to create traject:', error);
      return null;
    }
  }

  private createTrajectFromDeliveries(trajectName: string, isPredefined: boolean = false): Promise<number> {
    return new Promise((resolve, reject) => {
      const points = this.deliveryControls.map((group, index) => {
        const address = group.get('deliveryAddress')?.value;
        const customerId = group.get('customerId')?.value;
        const clientName = customerId ? this.getClientName(customerId) : undefined;
        const orderId = group.get('orderId')?.value;
        
        const point: any = {
          location: address || `Point ${index + 1}`,
          order: index + 1
        };
        
        if (customerId) {
          point.clientId = parseInt(customerId);
          point.clientName = clientName;
        }
        
        if (orderId) {
          point.order = parseInt(orderId);
        }
        
        return point;
      });

      const startLocationId = this.tripForm.get('startLocationId')?.value;
      const endLocationId = this.tripForm.get('endLocationId')?.value;

      const trajectData: any = {
        name: trajectName,
        points: points,
        startLocationId: startLocationId,
        endLocationId: endLocationId,
        isPredefined: isPredefined
      };

      this.http.createTraject(trajectData).subscribe({
        next: (traject: ITraject) => {
          resolve(traject.id);
        },
        error: (error) => {
          console.error('Erreur création traject:', error);
          reject(error);
        }
      });
    });
  }

  suggestExistingTraject(): void {
    if (!this.saveAsPredefined || this.trajectMode !== 'new') {
      return;
    }
    
    const startLocationId = this.tripForm.get('startLocationId')?.value;
    const endLocationId = this.tripForm.get('endLocationId')?.value;
    
    if (!startLocationId || !endLocationId) {
      return;
    }
    
    this.http.getAllTrajects().subscribe({
      next: (trajects: ITraject[]) => {
        const similarTrajects = trajects.filter(traject => 
          traject.startLocationId === startLocationId && 
          traject.endLocationId === endLocationId
        );
        
        if (similarTrajects.length > 0) {
          Swal.fire({
            title: 'Trajects similaires trouvés',
            html: `
              <div style="text-align: left; max-height: 300px; overflow-y: auto;">
                <p>Des trajects avec les mêmes lieux de départ/arrivée existent déjà :</p>
                <ul style="margin-left: 20px;">
                  ${similarTrajects.map(t => 
                    `<li><strong>${t.name}</strong> (${t.points.length} points)</li>`
                  ).join('')}
                </ul>
                <p style="margin-top: 15px;">
                  Voulez-vous utiliser un de ces trajects existants ?
                </p>
              </div>
            `,
            icon: 'info',
            showCancelButton: true,
            confirmButtonText: 'Oui, voir les trajets',
            cancelButtonText: 'Non, créer un nouveau'
          }).then((result) => {
            if (result.isConfirmed) {
              this.trajectMode = 'predefined';
              this.hasMadeTrajectChoice = true;
              this.trajects = similarTrajects.sort((a, b) => a.name.localeCompare(b.name));
              this.snackBar.open(`${similarTrajects.length} trajects similaires disponibles`, 'Fermer', { duration: 3000 });
            }
          });
        }
      },
      error: (error) => {
        console.error('Error finding similar trajects:', error);
      }
    });
  }

  checkForSimilarTrajects(): void {
    if (this.deliveries.length > 0 && 
        this.tripForm.get('startLocationId')?.value && 
        this.tripForm.get('endLocationId')?.value) {
      this.suggestExistingTraject();
    }
  }

  getCapacityAlert(): { message: string, color: string, icon: string, showAlert: boolean } {
    const percentage = Number(this.calculateCapacityPercentage().toFixed(2));
    const truckId = this.tripForm.get('truckId')?.value;
    const truck = truckId ? this.trucks.find(t => t.id === truckId) : null;
    
    const unit = this.loadingUnit;
    const unitLabel = this.loadingUnit;

    if (percentage >= 100) {
      return {
        message: `Capacité dépassée ! ${percentage.toFixed(1)}%`,
        color: '#ef4444',
        icon: 'error',
        showAlert: true
      };
    } else if (percentage >= 90) {
      return {
        message: `Capacité presque pleine ${percentage.toFixed(1)}%`,
        color: '#f59e0b',
        icon: 'warning',
        showAlert: true
      };
    } else if (percentage >= 70) {
      return {
        message: `Capacité élevée ${percentage.toFixed(1)}%`,
        color: '#3b82f6',
        icon: 'info',
        showAlert: false
      };
    } else {
      return {
        message: `Capacité normale ${percentage.toFixed(1)}%`,
        color: '#10b981',
        icon: 'check_circle',
        showAlert: false
      };
    }
  }

  private async validateCapacity(): Promise<boolean> {
    const percentage = Number(this.calculateCapacityPercentage().toFixed(2));
    const totalWeight = this.calculateTotalWeight();  
    const capacity = this.getSelectedTruckCapacity(); 
    
    const truckId = this.tripForm.get('truckId')?.value;
    const truck = truckId ? this.trucks.find(t => t.id === truckId) : null;
    
    const unit = this.loadingUnit;
    const unitLabelPlural = this.loadingUnit;
    
    const totalWeightNumber = totalWeight; 
    const capacityNumber = capacity;
    
    // Always allow continuation, just show warning with Yes/No options
    if (percentage >= 100) {
      const truckName = truck ? `${truck.immatriculation} - ${this.getMarqueName(truck.marqueTruckId)}` : 'Camion sélectionné';
      const excess = totalWeightNumber - capacityNumber;
      const excessPercentage = percentage - 100;
      
      const result = await Swal.fire({
        icon: 'warning',
        title: '⚠️ DÉPASSEMENT DE CAPACITÉ !',
        html: `
          <div style="text-align: left; padding: 10px;">
            <p><strong>${truckName}</strong></p>
            <p><strong>ALERTE SÉCURITÉ:</strong> La capacité maximale est dépassée</p>
            <hr style="margin: 10px 0;">
            <div style="background-color: #fee; padding: 15px; border-radius: 5px; margin: 10px 0;">
              <p><strong>Capacité maximum:</strong> ${capacityNumber} ${unitLabelPlural}</p>
              <p><strong>Poids total des livraisons:</strong> ${totalWeightNumber.toFixed(2)} ${unitLabelPlural}</p>
              <p><strong>Dépassement:</strong> <span style="color: #ef4444; font-weight: bold;">
                ${excess.toFixed(2)} ${unitLabelPlural} (${excessPercentage.toFixed(1)}%)
              </span></p>
            </div>
            <p style="color: #ef4444; margin-top: 15px;">
              ⚠️ Ce chargement dépasse la capacité autorisée du camion.
            </p>
            <p><strong>Voulez-vous vraiment continuer ?</strong></p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Oui, continuer',
        cancelButtonText: 'Non, réviser',
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        reverseButtons: true,
        allowOutsideClick: false
      });
      
      return result.isConfirmed;
    } 
    
    if (percentage >= 90) {
      const remainingCapacity = capacityNumber - totalWeightNumber;
      const remainingPercentage = 100 - percentage;
      
      const result = await Swal.fire({
        icon: 'warning',
        title: 'Capacité presque pleine',
        html: `
          <div style="text-align: left; padding: 10px;">
            <p><strong>${truck ? `${truck.immatriculation} - ${this.getMarqueName(truck.marqueTruckId)}` : 'Camion sélectionné'}</strong></p>
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 10px 0;">
              <p><strong>Capacité:</strong> ${capacityNumber} ${unitLabelPlural}</p>
              <p><strong>Poids total:</strong> ${totalWeightNumber.toFixed(2)} ${unitLabelPlural}</p>
              <p><strong>Utilisation:</strong> ${percentage.toFixed(1)}%</p>
              <p><strong>Capacité restante:</strong> ${remainingCapacity.toFixed(2)} ${unitLabelPlural} (${remainingPercentage.toFixed(1)}%)</p>
            </div>
            <p style="color: #f59e0b; font-weight: bold;">
              ⚠️ La capacité est presque pleine
            </p>
            <p>Voulez-vous continuer avec ce chargement ?</p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Oui, continuer',
        cancelButtonText: 'Non, réviser',
        confirmButtonColor: '#f59e0b',
        cancelButtonColor: '#6b7280'
      });
      
      return result.isConfirmed;
    }
    
    return true;
  }

  private async checkCapacityBeforeAddingOrders(selectedWeight: number): Promise<boolean> {
    const truckId = this.tripForm.get('truckId')?.value;
    
    if (!truckId) {
      await Swal.fire({
        icon: 'warning',
        title: 'Sélectionnez d\'abord un camion',
        text: 'Veuillez sélectionner un camion avant d\'ajouter des commandes',
        confirmButtonText: 'OK'
      });
      return false;
    }
    
    const truck = this.trucks.find(t => t.id === truckId);
    if (!truck) {
      return false;
    }
    
    const currentWeight = this.calculateTotalWeight();
    const additionalWeight = selectedWeight;
    const totalWeightAfterAddition = currentWeight + additionalWeight;
    const capacity = truck.typeTruck?.capacity || 0;
    const percentageAfterAddition = (totalWeightAfterAddition / capacity) * 100;
    
    const unit = this.loadingUnit;
    const unitLabelPlural = this.loadingUnit;
    
    if (percentageAfterAddition > 100) {
      const overage = totalWeightAfterAddition - capacity;
      const overagePercentage = percentageAfterAddition - 100;
      
      const result = await Swal.fire({
        icon: 'warning',
        title: 'DÉPASSEMENT DE CAPACITÉ',
        html: `
          <div style="text-align: left; padding: 10px;">
            <p><strong>${truck.immatriculation} - ${this.getMarqueName(truck.marqueTruckId)}</strong></p>
            <div style="background-color: #fee; padding: 15px; border-radius: 5px; margin: 10px 0;">
              <p><strong>Capacité maximum:</strong> ${capacity} ${unitLabelPlural}</p>
              <p><strong>Poids actuel:</strong> ${currentWeight.toFixed(2)} ${unitLabelPlural}</p>
              <p><strong>Poids à ajouter:</strong> ${additionalWeight.toFixed(2)} ${unitLabelPlural}</p>
              <p><strong>Total après ajout:</strong> ${totalWeightAfterAddition.toFixed(2)} ${unitLabelPlural}</p>
              <p><strong>Dépassement:</strong> <span style="color: #ef4444; font-weight: bold;">
                ${overage.toFixed(2)} ${unitLabelPlural} (${overagePercentage.toFixed(1)}%)
              </span></p>
            </div>
            <p style="color: #ef4444; font-weight: bold;">
              ⚠️ Ces commandes dépassent la capacité du camion
            </p>
            <p>Voulez-vous quand même les ajouter ?</p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Oui, ajouter quand même',
        cancelButtonText: 'Non, réduire la sélection',
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280'
      });
      
      return result.isConfirmed;
    }
    
    if (percentageAfterAddition >= 90) {
      const remainingCapacity = capacity - totalWeightAfterAddition;
      const remainingPercentage = 100 - percentageAfterAddition;
      
      const result = await Swal.fire({
        icon: 'warning',
        title: 'Capacité presque pleine',
        html: `
          <div style="text-align: left; padding: 10px;">
            <p><strong>${truck.immatriculation} - ${this.getMarqueName(truck.marqueTruckId)}</strong></p>
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin: 10px 0;">
              <p><strong>Capacité:</strong> ${capacity} ${unitLabelPlural}</p>
              <p><strong>Utilisation actuelle:</strong> ${currentWeight.toFixed(2)} ${unitLabelPlural} (${(currentWeight/capacity*100).toFixed(1)}%)</p>
              <p><strong>Ajout proposé:</strong> ${additionalWeight.toFixed(2)} ${unitLabelPlural}</p>
              <p><strong>Total après ajout:</strong> ${totalWeightAfterAddition.toFixed(2)} ${unitLabelPlural}</p>
              <p><strong>Utilisation après ajout:</strong> ${percentageAfterAddition.toFixed(1)}%</p>
              <p><strong>Capacité restante:</strong> ${remainingCapacity.toFixed(2)} ${unitLabelPlural} (${remainingPercentage.toFixed(1)}%)</p>
            </div>
            <p style="color: #f59e0b; font-weight: bold;">
              ⚠️ La capacité sera presque pleine
            </p>
            <p>Voulez-vous quand même ajouter ces commandes ?</p>
          </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Oui, ajouter',
        cancelButtonText: 'Non, réduire la sélection',
        confirmButtonColor: '#f59e0b',
        cancelButtonColor: '#6b7280'
      });
      
      return result.isConfirmed;
    }
    
    return true;
  }

  private showCapacitySummaryAfterAddition(addedWeight: number): void {
    const truckId = this.tripForm.get('truckId')?.value;
    if (!truckId) return;
    
    const truck = this.trucks.find(t => t.id === truckId);
    if (!truck) return;
    
    const currentWeight = this.calculateTotalWeight();
    const capacity = truck.typeTruck?.capacity || 0;
    const percentage = (currentWeight / capacity) * 100;
    const remainingCapacity = capacity - currentWeight;
    
    const unit = this.loadingUnit;
    const unitLabelPlural = this.loadingUnit;
    
    let message = '';
    let icon: 'success' | 'warning' | 'error' | 'info' = 'success';
    let duration = 5000;
    
    if (percentage >= 100) {
      message = `Capacité dépassée de ${(currentWeight - capacity).toFixed(2)} ${unitLabelPlural}!`;
      icon = 'error';
    } else if (percentage >= 90) {
      message = `Capacité presque pleine (${percentage.toFixed(1)}%). Reste ${remainingCapacity.toFixed(2)} ${unitLabelPlural}.`;
      icon = 'warning';
      duration = 7000;
    } else if (percentage >= 70) {
      message = `Capacité bien remplie (${percentage.toFixed(1)}%). Reste ${remainingCapacity.toFixed(2)} ${unitLabelPlural}.`;
      icon = 'info';
    } else {
      message = `Capacité utilisée: ${percentage.toFixed(1)}%. Reste ${remainingCapacity.toFixed(2)} ${unitLabelPlural}.`;
      icon = 'success';
    }
    
    if (percentage >= 90) {
      Swal.fire({
        icon: icon,
        title: 'État de la capacité',
        text: message,
        confirmButtonText: 'Compris',
        confirmButtonColor: percentage >= 100 ? '#ef4444' : '#f59e0b',
        timer: duration,
        timerProgressBar: true
      });
    } else {
      this.snackBar.open(`✅ Commandes ajoutées. ${message}`, 'Fermer', {
        duration: duration,
        panelClass: percentage >= 90 ? 'warning-snackbar' : 'success-snackbar'
      });
    }
  }

  private createTrip(formValue: any, deliveries: CreateDeliveryDto[], trajectId: number | null): void {
    const createTripData: CreateTripDto = {
      estimatedDistance: parseFloat(formValue.estimatedDistance) || 0,
      estimatedDuration: parseFloat(formValue.estimatedDuration) || 0,
      estimatedStartDate: this.formatDateWithTime(formValue.estimatedStartDate, '08:00:00'),
      estimatedEndDate: this.formatDateWithTime(formValue.estimatedEndDate, '18:00:00'),
      truckId: parseInt(formValue.truckId),
      driverId: parseInt(formValue.driverId),
      convoyeurId: formValue.convoyeurId ? parseInt(formValue.convoyeurId) : null,
      deliveries: deliveries,
      trajectId: trajectId
    };
    
    this.http.createTrip(createTripData).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.clearDraft();
        
        let message = 'Voyage créé avec succès';
        if (trajectId) {
          message += ' et traject enregistré';
        }
        
        Swal.fire({
          icon: 'success',
          title: 'Succès',
          text: message,
          confirmButtonText: 'OK',
          allowOutsideClick: false,
        }).then(() => this.success.emit());
      },
      error: (error) => {
        this.loading = false;
        if (this.hasDraft()) {
          this.clearDraft();
          console.log('Draft cleared after successful submission');
        }
        console.error('Create trip error:', error);
        
        let errorMessage = 'Erreur lors de la création du voyage';
        if (error?.error?.message) {
          errorMessage = error.error.message;
        } else if (error?.message) {
          errorMessage = error.message;
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

  private updateTrip(formValue: any, deliveries: CreateDeliveryDto[], trajectId: number | null): void {
    const updateTripData: UpdateTripDto = {
      estimatedDistance: parseFloat(formValue.estimatedDistance) || 0,
      estimatedDuration: parseFloat(formValue.estimatedDuration) || 0,
      estimatedStartDate: this.formatDateWithTime(formValue.estimatedStartDate, '08:00:00'),
      estimatedEndDate: this.formatDateWithTime(formValue.estimatedEndDate, '18:00:00'),
      truckId: parseInt(formValue.truckId),
      driverId: parseInt(formValue.driverId),
      convoyeurId: formValue.convoyeurId ? parseInt(formValue.convoyeurId) : null,
      tripStatus: formValue.tripStatus,
      deliveries: deliveries,
      trajectId: trajectId
    };
    
    this.loading = true;
    this.http.updateTrip(this.tripId!, updateTripData).subscribe({
      next: (response: any) => {
        this.loading = false;
        this.clearDraft();
        if (response && (response.message || response.Status === 200)) {
          const successMessage = response.message || 'Voyage modifié avec succès';
          
          Swal.fire({
            icon: 'success',
            title: 'Succès',
            text: successMessage,
            confirmButtonText: 'OK',
            allowOutsideClick: false,
            customClass: {
              popup: 'swal2-popup-custom',
              title: 'swal2-title-custom',
              icon: 'swal2-icon-custom',
              confirmButton: 'swal2-confirm-custom'
            }
          }).then(() => this.success.emit());
        } else {
          Swal.fire({
            icon: 'success',
            title: 'Succès',
            text: 'Voyage modifié avec succès',
            confirmButtonText: 'OK',
            allowOutsideClick: false,
            customClass: {
              popup: 'swal2-popup-custom',
              title: 'swal2-title-custom',
              icon: 'swal2-icon-custom',
              confirmButton: 'swal2-confirm-custom'
            }
          }).then(() => this.success.emit());
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Update error:', error);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        
        let errorMessage = 'Erreur lors de la modification du voyage';
        
        if (error?.error?.message) {
          errorMessage = error.error.message;
        } else if (error?.error?.errors) {
          const errors = error.error.errors;
          if (typeof errors === 'object') {
            const errorList = Object.values(errors).flat();
            errorMessage = errorList.join(', ');
          }
        } else if (error?.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error?.error) {
            errorMessage = error.error.error;
          }
        } else if (error?.message) {
          errorMessage = error.message;
        } else if (error?.status === 404) {
          errorMessage = 'Trajet non trouvé';
        } else if (error?.status === 400) {
          errorMessage = 'Données invalides';
        } else if (error?.status === 403) {
          errorMessage = 'Vous n\'avez pas les permissions nécessaires';
        } else if (error?.status === 409) {
          errorMessage = 'Impossible de modifier un trajet en cours ou terminé';
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

  private prepareDeliveries(baseDate: any): any[] {
    return this.deliveryControls.map((group, index) => {
      const delivery = group.value;
      
      const plannedTime = delivery.plannedTime ? 
        this.formatTimeToDateTime(baseDate, delivery.plannedTime) : 
        null;
      
      return {
        customerId: parseInt(delivery.customerId),
        orderId: parseInt(delivery.orderId),
        deliveryAddress: delivery.deliveryAddress,
        sequence: parseInt(delivery.sequence) || (index + 1),
        plannedTime: plannedTime,
        notes: delivery.notes || null
      };
    });
  }

  private formatDateWithTime(date: any, defaultTime: string): string {
    if (!date) return '';
    
    let dateObj: Date;
    
    if (date instanceof Date) {
      dateObj = new Date(date);
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      return '';
    }
    
    const hasTime = dateObj.getHours() !== 0 || dateObj.getMinutes() !== 0 || dateObj.getSeconds() !== 0;
    
    if (!hasTime) {
      const [hours, minutes, seconds] = defaultTime.split(':');
      dateObj.setHours(
        parseInt(hours || '0'),
        parseInt(minutes || '0'),
        parseInt(seconds || '0'),
        0
      );
    }
    
    return dateObj.toISOString();
  }

  private formatTimeToDateTime(baseDate: any, timeString: string): string | null {
    if (!baseDate || !timeString) return null;
    
    let dateObj: Date;
    
    if (baseDate instanceof Date) {
      dateObj = new Date(baseDate);
    } else if (typeof baseDate === 'string') {
      dateObj = new Date(baseDate);
    } else {
      console.error('Invalid baseDate type:', typeof baseDate, baseDate);
      return null;
    }
    
    let timeParts;
    if (timeString.includes(':')) {
      timeParts = timeString.split(':');
    } else if (timeString.includes('T')) {
      const timeDate = new Date(timeString);
      if (!isNaN(timeDate.getTime())) {
        return timeString;
      }
      return null;
    } else {
      console.error('Invalid time format:', timeString);
      return null;
    }
    
    const hours = timeParts[0] ? parseInt(timeParts[0]) : 0;
    const minutes = timeParts[1] ? parseInt(timeParts[1]) : 0;
    
    dateObj.setHours(hours, minutes, 0, 0);
    
    const result = dateObj.toISOString();
    
    return result;
  }

  onDistanceBlur(): void {
    const distanceControl = this.tripForm.get('estimatedDistance');
    if (distanceControl && distanceControl.value) {
      const value = parseFloat(distanceControl.value);
      if (!isNaN(value)) {
        distanceControl.setValue(value.toFixed(1), { emitEvent: false });
      }
    }
  }

  onDurationBlur(): void {
    const durationControl = this.tripForm.get('estimatedDuration');
    if (durationControl && durationControl.value) {
      const value = parseFloat(durationControl.value);
      if (!isNaN(value)) {
        durationControl.setValue(value.toFixed(1), { emitEvent: false });
      }
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  onCancel(): void {
    if (this.hasDraft() && !this.tripId && !this.tripId) {
      const draft = this.loadDraft();
      const deliveryCount = draft?.deliveries?.length || 0;
      const dateStr = draft?.formData?.estimatedStartDate ? 
        new Date(draft.formData.estimatedStartDate).toLocaleDateString() : 'Date non définie';
      
      Swal.fire({
        title: 'Brouillon non sauvegardé',
        html: `
          <div style="text-align: left; padding: 10px;">
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
              <mat-icon style="color: #f59e0b; margin-right: 10px; font-size: 24px;">drafts</mat-icon>
              <div>
                <h4 style="margin: 0 0 5px 0; color: #1f2937;">Vous avez un brouillon en cours</h4>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                  Vos modifications seront perdues si vous quittez sans sauvegarder
                </p>
              </div>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h5 style="margin: 0 0 10px 0; color: #374151;">Détails du brouillon</h5>
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                <div>
                  <span style="color: #6b7280; font-size: 13px;">Livraisons:</span>
                  <div style="font-weight: 600; color: #1f2937;">${deliveryCount}</div>
                </div>
                <div>
                  <span style="color: #6b7280; font-size: 13px;">Date estimée:</span>
                  <div style="font-weight: 600; color: #1f2937;">${dateStr}</div>
                </div>
                <div>
                  <span style="color: #6b7280; font-size: 13px;">Statut:</span>
                  <div style="font-weight: 600; color: #1f2937;">Brouillon</div>
                </div>
                <div>
                  <span style="color: #6b7280; font-size: 13px;">Dernière sauvegarde:</span>
                  <div style="font-weight: 600; color: #1f2937;">${draft?.savedAt ? new Date(draft.savedAt).toLocaleTimeString() : 'N/A'}</div>
                </div>
              </div>
            </div>
            
            <p style="color: #4b5563; margin-bottom: 20px; font-size: 14px;">
              Que souhaitez-vous faire avec ce brouillon ?
            </p>
          </div>
        `,
        icon: 'question',
        showDenyButton: true,
        showCancelButton: true,
        showConfirmButton: true,
        confirmButtonText: '<mat-icon>save</mat-icon> Sauvegarder et quitter',
        denyButtonText: '<mat-icon>delete</mat-icon> Effacer et quitter',
        cancelButtonText: '<mat-icon>close</mat-icon> Rester sur la page',
        confirmButtonColor: '#3b82f6',
        denyButtonColor: '#ef4444',
        cancelButtonColor: '#6b7280',
        reverseButtons: true,
        backdrop: true,
        allowOutsideClick: false,
        allowEscapeKey: false,
        width: '500px',
        customClass: {
          container: 'draft-swal-container',
          popup: 'draft-swal-popup',
          title: 'draft-swal-title',
          htmlContainer: 'draft-swal-html',
          confirmButton: 'draft-swal-confirm-btn',
          denyButton: 'draft-swal-deny-btn',
          cancelButton: 'draft-swal-cancel-btn'
        }
      }).then((result) => {
        if (result.isConfirmed) {
          this.saveDraft();
          this.snackBar.open('✅ Brouillon sauvegardé avec succès', 'Fermer', { 
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.closeDialogOrCancel();
        } else if (result.isDenied) {
          this.clearDraft();
          this.snackBar.open('🗑️ Brouillon effacé', 'Fermer', { 
            duration: 2000,
            panelClass: ['warn-snackbar']
          });
          this.closeDialogOrCancel();
        }
      });
    } else {
      this.closeDialogOrCancel();
    }
  }

  private closeDialogOrCancel(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    } else {
      this.cancel.emit();
    }
  }

  formatDateForDisplay(date: any): string {
    return this.datePipe.transform(date, 'dd MMM yyyy') || '';
  }

  getSelectedDriverInfo(): string {
    const driverId = this.tripForm.get('driverId')?.value;
    if (!driverId) return 'Non sélectionné';
    
    const driver = this.drivers.find(d => d.id === driverId);
    return driver ? `${driver.name} (${driver.drivingLicense})` : 'Chauffeur inconnu';
  }

  calculateAverageSpeed(): string {
    const distance = this.tripForm.get('estimatedDistance')?.value;
    const duration = this.tripForm.get('estimatedDuration')?.value;
    
    if (!distance || !duration || duration === 0) return '0';
    
    const speed = parseFloat(distance) / parseFloat(duration);
    return speed.toFixed(1);
  }

  getTripStatusLabel(status: string): string {
    switch (status) {
      case TripStatus.Planned:
        return 'Planifié';
      case TripStatus.Accepted:
        return 'Accepté';
      case TripStatus.LoadingInProgress:
        return 'Chargement en cours';
      case TripStatus.DeliveryInProgress:
        return 'Livraison en cours';
      case TripStatus.Receipt:
        return 'Réception';
      case TripStatus.Cancelled:
        return 'Annulé';
      default:
        return 'Planifié';
    }
  }

  applySearchFilter(): void {
    const searchText = this.searchControl.value?.toLowerCase().trim() || '';
    
    if (!searchText) {
      this.filteredOrders = [...this.ordersForQuickAdd];
      return;
    }

    this.filteredOrders = this.ordersForQuickAdd.filter(order => {
      const customer = this.customers.find(c => c.id === order.customerId);
      if (!customer) return false;

      return (
        customer.name.toLowerCase().includes(searchText) ||
        customer.matricule?.toLowerCase().includes(searchText) ||
        customer.adress?.toLowerCase().includes(searchText) ||
        order.reference.toLowerCase().includes(searchText) ||
        order.type?.toLowerCase().includes(searchText)
      );
    });
  }

  clearSearch(): void {
    this.searchControl.setValue('');
    this.filteredOrders = [...this.ordersForQuickAdd];
  }

  openTrajectForm(): void {
    const dialogRef = this.dialog.open(TrajectFormSimpleComponent, {
      width: '700px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: ['dialog-overlay', 'wide-dialog'],
      data: {
        onTrajectCreated: (traject: ITraject) => {
          this.trajects.push(traject);
          this.trajects.sort((a, b) => a.name.localeCompare(b.name));
          
          this.selectedTrajectControl.setValue(traject.id);
          this.onTrajectSelected(traject.id);
        }
      }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        console.log('Traject créé:', result);
      }
    });
  }

  drop(event: CdkDragDrop<string[]>): void {
    this.isDragging = false;
    
    if (Array.isArray(event.item.data)) {
      const groupIndices = event.item.data as number[];
      this.dropGroupElements(groupIndices, event.currentIndex);
    } else if (typeof event.item.data === 'number') {
      this.dropSingleElement(event);
    }
  }

  dropGroupElements(groupIndices: number[], targetIndex: number): void {
    if (groupIndices.length === 0 || targetIndex < 0) return;

    const groupForms = groupIndices.map(index => this.deliveries.at(index));
    
    groupIndices.sort((a, b) => b - a).forEach(index => {
      this.deliveries.removeAt(index);
    });
    
    const insertIndex = Math.min(targetIndex, this.deliveries.length);
    groupForms.reverse().forEach(form => {
      this.deliveries.insert(insertIndex, form);
    });
    
    this.updateDeliverySequences();
    
    this.snackBar.open(
      `Groupe client déplacé à la position ${insertIndex + 1}`,
      'Fermer',
      { duration: 2000 }
    );
  }

  dropSingleElement(event: CdkDragDrop<string[]>): void {
    if (event.previousIndex === event.currentIndex) return;

    this.previousOrder = this.deliveryControls.map((_, idx) => idx);

    const deliveryArray = this.deliveries;
    const movedDelivery = deliveryArray.at(event.previousIndex);
    
    const deliveryCopy = this.fb.group({
      customerId: [movedDelivery.get('customerId')?.value, Validators.required],
      orderId: [movedDelivery.get('orderId')?.value, Validators.required],
      deliveryAddress: [movedDelivery.get('deliveryAddress')?.value, [Validators.required, Validators.maxLength(500)]],
      sequence: [movedDelivery.get('sequence')?.value, [Validators.required, Validators.min(1)]],
      plannedTime: [movedDelivery.get('plannedTime')?.value],
      notes: [movedDelivery.get('notes')?.value || '']
    });

    deliveryArray.removeAt(event.previousIndex);
    deliveryArray.insert(event.currentIndex, deliveryCopy);

    this.updateDeliverySequences();
    
    const fromPosition = event.previousIndex + 1;
    const toPosition = event.currentIndex + 1;
    const direction = event.previousIndex < event.currentIndex ? 'vers le bas' : 'vers le haut';
    const message = `Livraison ${fromPosition} déplacée ${direction} à la position ${toPosition}`;
    
    this.snackBar.open(message, 'Fermer', { duration: 2000 });
  }

  onDragStarted(): void {
    this.isDragging = true;
    this.dragDisabled = true;
  }

  onDragEnded(): void {
    setTimeout(() => {
      this.isDragging = false;
      this.dragDisabled = false;
    }, 100);
  }

  isDragDisabled(): boolean {
    return false;
  }

  isSequenceUpdated(index: number): boolean {
    if (!this.previousOrder.length || this.previousOrder.length !== this.deliveryControls.length) {
      return false;
    }
    return this.previousOrder[index] !== index;
  }

  hasSequenceChanged(index: number, deliveryGroup: FormGroup): boolean {
    const currentSequence = deliveryGroup.get('sequence')?.value;
    return currentSequence !== (index + 1);
  }

  updateDeliverySequences(): void {
    const sequenceUpdates: { index: number, oldValue: number, newValue: number }[] = [];
    const hasPlannedTimes = this.deliveryControls.some(group => group.get('plannedTime')?.value);
    
    this.deliveryControls.forEach((group, index) => {
      const oldValue = group.get('sequence')?.value;
      const newValue = index + 1;
      
      if (oldValue !== newValue) {
        sequenceUpdates.push({ index, oldValue, newValue });
        group.get('sequence')?.setValue(newValue, { emitEvent: false });
        
        if (hasPlannedTimes) {
          this.updatePlannedTimeForDelivery(group, index);
        }
      }
    });
    
    if (sequenceUpdates.length > 0) {
      console.log('Sequence updates:', sequenceUpdates);
    }
    
    this.updateEstimatedValuesAfterReorder();
  }

  private updatePlannedTimeForDelivery(deliveryGroup: FormGroup, index: number): void {
    const plannedTimeControl = deliveryGroup.get('plannedTime');
    if (plannedTimeControl && plannedTimeControl.value) {
      const currentTime = plannedTimeControl.value;
      const [hours, minutes] = currentTime.split(':').map(Number);
      
      const minutesToAdd = index * 45;
      const newDate = new Date();
      newDate.setHours(hours, minutes + minutesToAdd, 0, 0);
      
      const newHours = newDate.getHours().toString().padStart(2, '0');
      const newMinutes = newDate.getMinutes().toString().padStart(2, '0');
      const newTime = `${newHours}:${newMinutes}`;
      
      if (currentTime !== newTime) {
        plannedTimeControl.setValue(newTime, { emitEvent: false });
      }
    }
  }

  private updateEstimatedValuesAfterReorder(): void {
    const baseDurationPerDelivery = 0.75;
    const travelTimeBetween = 0.25;
    const totalDeliveries = this.deliveries.length;
    
    if (totalDeliveries === 0) return;
    
    const totalDuration = (baseDurationPerDelivery * totalDeliveries) + 
                         (travelTimeBetween * Math.max(0, totalDeliveries - 1));
    
    const distancePerDelivery = 15;
    const distanceBetween = 5;
    const totalDistance = (distancePerDelivery * totalDeliveries) + 
                         (distanceBetween * Math.max(0, totalDeliveries - 1));
    
    const currentDuration = parseFloat(this.tripForm.get('estimatedDuration')?.value || '0');
    const currentDistance = parseFloat(this.tripForm.get('estimatedDistance')?.value || '0');
    
    if (Math.abs(currentDuration - totalDuration) > 0.1) {
      this.tripForm.get('estimatedDuration')?.setValue(totalDuration.toFixed(1), { emitEvent: true });
    }
    
    if (Math.abs(currentDistance - totalDistance) > 0.1) {
      this.tripForm.get('estimatedDistance')?.setValue(totalDistance.toFixed(1), { emitEvent: true });
    }
  }

  startTrajectNameEdit(): void {
    this.isEditingTrajectName = true;
    this.editingTrajectName = this.selectedTraject?.name || '';
    
    setTimeout(() => {
      const input = document.querySelector('.traject-name-edit input') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 100);
  }

  async saveTrajectName(): Promise<void> {
    if (!this.selectedTraject || !this.editingTrajectName.trim()) {
      this.cancelTrajectNameEdit();
      return;
    }

    const newName = this.editingTrajectName.trim();
    if (newName === this.selectedTraject.name) {
      this.cancelTrajectNameEdit();
      return;
    }

    try {
      this.savingTrajectChanges = true;
      
      this.selectedTraject.name = newName;
      
      const index = this.trajects.findIndex(t => t.id === this.selectedTraject!.id);
      if (index !== -1) {
        this.trajects[index].name = newName;
      }
      
      await this.saveTrajectChanges();
      
      this.snackBar.open('Nom du traject mis à jour', 'Fermer', { duration: 2000 });
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour du nom:', error);
      this.snackBar.open('Erreur lors de la mise à jour du nom', 'Fermer', { duration: 3000 });
    } finally {
      this.isEditingTrajectName = false;
      this.savingTrajectChanges = false;
    }
  }

  cancelTrajectNameEdit(): void {
    this.isEditingTrajectName = false;
    this.editingTrajectName = '';
  }

  startPointEdit(index: number, address: string | undefined): void {
    this.isEditingPoint = index;
    this.editingPointAddress = address ?? '';
    
    setTimeout(() => {
      const textarea = document.querySelector('.point-address-edit textarea') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        textarea.select();
      }
    }, 100);
  }

  async savePointAddress(index: number): Promise<void> {
    if (this.isEditingPoint === null || !this.selectedTraject) return;
    
    const newAddress = this.editingPointAddress.trim();
    if (!newAddress || newAddress === this.selectedTraject.points[index].location) {
      this.cancelPointEdit();
      return;
    }

    try {
      this.savingTrajectChanges = true;
      
      this.selectedTraject.points[index].location = newAddress;
      
      this.debouncedSaveTrajectChanges();
      
      this.snackBar.open('Adresse mise à jour', 'Fermer', { duration: 2000 });
      
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'adresse:', error);
      this.snackBar.open('Erreur lors de la mise à jour', 'Fermer', { duration: 3000 });
    } finally {
      this.isEditingPoint = null;
      this.editingPointAddress = '';
      this.savingTrajectChanges = false;
    }
  }

  cancelPointEdit(): void {
    this.isEditingPoint = null;
    this.editingPointAddress = '';
  }

  addNewTrajectPoint(): void {
    if (!this.selectedTraject) return;
    
    const newPoint: ITrajectPoint = {
      location: '',
      order: this.selectedTraject.points.length + 1
    };
    
    this.selectedTraject.points.push(newPoint);
    this.hasUnsavedTrajectChanges = true;
    
    setTimeout(() => {
      this.startPointEdit(this.selectedTraject!.points.length - 1, '');
    }, 100);
  }

  async deleteTrajectPoint(index: number): Promise<void> {
    if (!this.selectedTraject || this.selectedTraject.points.length <= 1) return;
    
    const confirmed = confirm('Êtes-vous sûr de vouloir supprimer ce point du traject ?');
    if (!confirmed) return;

    try {
      this.savingTrajectChanges = true;
      
      this.selectedTraject!.points.splice(index, 1);
      
      this.selectedTraject!.points.forEach((point, i) => {
        point.order = i + 1;
      });
      
      await this.saveTrajectChanges();
      
      this.snackBar.open('Point supprimé', 'Fermer', { duration: 2000 });
      
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      this.snackBar.open('Erreur lors de la suppression', 'Fermer', { duration: 3000 });
    } finally {
      this.savingTrajectChanges = false;
    }
  }

  async dropTrajectPoint(event: CdkDragDrop<ITrajectPoint[]>): Promise<void> {
    if (!this.selectedTraject) return;
    
    if (event.previousIndex === event.currentIndex) return;
    
    moveItemInArray(this.selectedTraject.points, event.previousIndex, event.currentIndex);
    
    this.updateTrajectPointOrders();
    
    this.hasUnsavedTrajectChanges = true;
    this.debouncedSaveTrajectChanges();
  }

  private updateTrajectPointOrders(): void {
    if (!this.selectedTraject) return;
    
    this.selectedTraject.points.forEach((point, index) => {
      point.order = index + 1;
    });
  }

  togglePredefinedStatus(): void {
    if (!this.selectedTraject) return;
    
    const newStatus = !this.selectedTraject.isPredefined;
    const message = newStatus 
      ? 'Voulez-vous définir ce traject comme standard? Il sera disponible pour tous les utilisateurs.'
      : 'Voulez-vous retirer ce traject de la liste des trajects standards?';
      
    Swal.fire({
      title: 'Changer le statut du traject',
      text: message,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Oui',
      cancelButtonText: 'Non'
    }).then((result) => {
      if (result.isConfirmed) {
        this.selectedTraject!.isPredefined = newStatus;
        this.saveTrajectChanges();
      }
    });
  }

  async saveTrajectChanges(): Promise<void> {
    if (!this.selectedTraject) return;
    
    try {
      this.savingTrajectChanges = true;
      
      const trajectData: any = {
        name: this.selectedTraject.name,
        points: this.selectedTraject.points.map(point => ({
          location: point.location,
          order: point.order,
          clientId: point.clientId
        })),
        startLocationId: this.tripForm.get('startLocationId')?.value,
        endLocationId: this.tripForm.get('endLocationId')?.value,
        isPredefined: this.selectedTraject.isPredefined
      };
      
      let result: any;
      if (this.selectedTraject.id) {
        result = await this.http.updateTraject(this.selectedTraject.id, trajectData).toPromise();
      } else {
        result = await this.http.createTraject(trajectData).toPromise();
      }
      
      if (result && result.id) {
        const index = this.trajects.findIndex(t => t.id === result.id);
        if (index !== -1) {
          this.trajects[index] = result;
        } else {
          this.trajects.push(result);
        }
        
        this.trajects = this.trajects
          .filter(t => t && t.name)
          .sort((a, b) => {
            if (!a || !b || !a.name || !b.name) return 0;
            return a.name.localeCompare(b.name);
          });
        
        this.selectedTraject = result;
        
        this.selectedTrajectControl.setValue(result.id);
      }
      
      this.hasUnsavedTrajectChanges = false;
      
      this.snackBar.open('Traject mis à jour avec succès', 'Fermer', { duration: 2000 });
      
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du traject:', error);
      this.snackBar.open('Erreur lors de la sauvegarde', 'Fermer', { duration: 3000 });
    } finally {
      this.savingTrajectChanges = false;
    }
  }

  debouncedSaveTrajectChanges(): void {
    this.hasUnsavedTrajectChanges = true;
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      if (this.hasUnsavedTrajectChanges) {
        this.saveTrajectChanges();
      }
    }, 2000);
  }

  getStatusOrder(status: string): number {
    const orderMap: { [key: string]: number } = {
      'Planned': 1,
      'Accepted': 2,
      'Loading': 3,
      'LoadingInProgress': 4,
      'Delivery': 5,
      'DeliveryInProgress': 6,
      'Receipt': 7,
      'Cancelled': 0
    };
    return orderMap[status] || 0;
  }

  isStatusCompleted(status: string): boolean {
    const currentStatus = this.tripForm.get('tripStatus')?.value;
    const currentOrder = this.getStatusOrder(currentStatus);
    const targetOrder = this.getStatusOrder(status);
    
    return currentOrder > targetOrder && currentStatus !== 'Cancelled';
  }

  canAdvanceStatus(): boolean {
    const currentStatus = this.tripForm.get('tripStatus')?.value;
    
    if (currentStatus === 'Cancelled' || currentStatus === 'Receipt') {
      return false;
    }
    
    switch (currentStatus) {
      case 'Planned':
        const truckId = this.tripForm.get('truckId')?.value;
        const driverId = this.tripForm.get('driverId')?.value;
        const startDate = this.tripForm.get('estimatedStartDate')?.value;
        return !!(truckId && driverId && startDate);
        
      case 'Accepted':
        return true; 
        
      case 'Loading':
        return true;
        
      case 'LoadingInProgress':
        return this.getCompletedDeliveriesCount() === this.deliveries.length;
        
      case 'Delivery':
        return true; 
        
      case 'DeliveryInProgress':
        return this.areAllDeliveriesCompleted();
        
      default:
        return false;
    }
  }

  advanceStatus(): void {
    if (!this.canAdvanceStatus()) {
      const currentStatus = this.tripForm.get('tripStatus')?.value;
      
      switch (currentStatus) {
        case 'Planned':
          if (!this.tripForm.get('truckId')?.value) {
            this.snackBar.open('Veuillez sélectionner un camion', 'Fermer', { duration: 3000 });
          } else if (!this.tripForm.get('driverId')?.value) {
            this.snackBar.open('Veuillez sélectionner un chauffeur', 'Fermer', { duration: 3000 });
          } else if (!this.tripForm.get('estimatedStartDate')?.value) {
            this.snackBar.open('Veuillez sélectionner une date de début', 'Fermer', { duration: 3000 });
          }
          break;
          
        case 'LoadingInProgress':
          const completed = this.getCompletedDeliveriesCount();
          const total = this.deliveries.length;
          if (completed < total) {
            this.snackBar.open(
              `${total - completed} marchandise(s) ne sont pas complètement chargées`,
              'Fermer', 
              { duration: 3000 }
            );
          }
          break;
          
        case 'DeliveryInProgress':
          if (!this.areAllDeliveriesCompleted()) {
            this.snackBar.open(
              'Toutes les livraisons doivent être complétées avant réception',
              'Fermer',
              { duration: 3000 }
            );
          }
          break;
      }
      return;
    }
    
    const currentStatus = this.tripForm.get('tripStatus')?.value;
    let nextStatus: TripStatus;
    
    switch (currentStatus) {
      case 'Planned':
        nextStatus = TripStatus.Accepted;
        this.showAcceptedConfirmation();
        break;
      case 'Accepted':
        nextStatus = TripStatus.LoadingInProgress;
        this.showLoadingConfirmation(); 
        break;
      case 'LoadingInProgress':
        nextStatus = TripStatus.DeliveryInProgress;
        this.showDeliveryConfirmation();
        break;
      case 'DeliveryInProgress':
        nextStatus = TripStatus.Receipt;
        this.showReceiptConfirmation();
        break;
      default:
        return;
    }
    
    this.tripForm.patchValue({ tripStatus: nextStatus });
    this.updateTripStatusInForm(nextStatus);
    this.updateTripStatusOnBackend(nextStatus);
  }

  private updateTripStatusOnBackend(status: TripStatus, notes?: string): void {
    if (!this.tripId) return;
    
    this.loading = true;
    
    const payload = {
      status: status,
      notes: notes || null
    };
    
    this.http.updateTripStatus(this.tripId, payload).subscribe({
      next: (response: any) => {
        this.loading = false;
        
        const statusLabel = this.getTripStatusLabel(status);
        const message = notes 
          ? `Statut mis à jour: ${statusLabel} - Note: ${notes}`
          : `Statut mis à jour: ${statusLabel}`;
        
        this.tripForm.patchValue({ tripStatus: status }, { emitEvent: true });
        
        if (this.tripId) {
          this.loadTrip(this.tripId);
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Error updating trip status:', error);
        this.tripForm.patchValue({ tripStatus: this.getPreviousStatus() }, { emitEvent: true });

        let errorMessage = 'Erreur lors de la mise à jour du statut';
        
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 400) {
          errorMessage = 'Transition de statut invalide';
        }
        
        this.snackBar.open(errorMessage, 'Fermer', { duration: 4000 });
      }
    });
  }

  areAllDeliveriesCompleted(): boolean {
    return this.deliveries.length > 0 && 
           this.getCompletedDeliveriesCount() === this.deliveries.length;
  }
 
  cancelTrip(): void {
    if (!this.tripId) {
      this.snackBar.open('Erreur: ID du voyage non trouvé', 'Fermer', { duration: 3000 });
      return;
    }

    Swal.fire({
      title: 'Annuler le voyage ?',
      text: 'Êtes-vous sûr de vouloir annuler ce voyage ? Cette action est irréversible.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Oui, annuler',
      cancelButtonText: 'Non, garder',
      reverseButtons: true,
      backdrop: true,
      allowOutsideClick: false,
      allowEscapeKey: false
    }).then((result) => {
      if (result.isConfirmed) {
        this.updateTripStatusOnBackend(TripStatus.Cancelled, 'Voyage annulé par l\'utilisateur');
      }
    });
  }

  private showDeliveryConfirmation(): void {
    const completedDeliveries = this.getCompletedDeliveriesCount();
    const totalDeliveries = this.deliveries.length;
    
    Swal.fire({
      title: 'Début des livraisons',
      html: `
        <div style="text-align: left;">
          <p><strong>Résumé des livraisons:</strong></p>
          <ul>
            <li>Livraisons préparées: <strong>${completedDeliveries}/${totalDeliveries}</strong></li>
            <li>Statut du camion: <strong>Chargé</strong></li>
            <li>Chauffeur: <strong>${this.getSelectedDriverInfo()}</strong></li>
            <li>Convoyeur: <strong>${this.getSelectedConvoyeurInfo()}</strong></li>
          </ul>
          ${completedDeliveries < totalDeliveries ? 
            `<p style="color: #ef4444; margin-top: 1rem;">
              <mat-icon style="vertical-align: middle;">error</mat-icon>
              Attention: ${totalDeliveries - completedDeliveries} livraisons ne sont pas complètement préparées.
            </p>` : ''}
        </div>
      `,
      icon: completedDeliveries === totalDeliveries ? 'success' : 'warning',
      showCancelButton: true,
      confirmButtonText: 'Commencer les livraisons',
      cancelButtonText: 'Revoir'
    });
  }

  private showReceiptConfirmation(): void {
    const completedDeliveries = this.getCompletedDeliveriesCount();
    const totalDeliveries = this.deliveries.length;
    
    Swal.fire({
      title: 'Générer la réception',
      html: `
        <div style="text-align: left;">
          <p><strong>Résumé final:</strong></p>
          <ul>
            <li>Livraisons complétées: <strong>${completedDeliveries}/${totalDeliveries}</strong></li>
            <li>Distance parcourue: <strong>${this.tripForm.get('estimatedDistance')?.value || 0} km</strong></li>
            <li>Durée totale: <strong>${this.tripForm.get('estimatedDuration')?.value || 0} heures</strong></li>
          </ul>
          <p style="color: #10b981; margin-top: 1rem;">
            <mat-icon style="vertical-align: middle;">check_circle</mat-icon>
            Prêt à générer la réception final.
          </p>
        </div>
      `,
      icon: 'success',
      showCancelButton: true,
      confirmButtonText: 'Générer le bon de réception',
      cancelButtonText: 'Revoir'
    });
  }

  shouldShowTimelineSummary(): boolean {
    return this.deliveries.length > 0  && this.trajectMode !== null;
  }

  getDeliveryStepClass(index: number, deliveryGroup: FormGroup): string {
    const classes = ['timeline-step', 'delivery-step'];
    
    if (this.isSequenceUpdated(index)) {
      classes.push('sequence-updated');
    }
    
    if (this.isDragging) {
      classes.push('dragging-active');
    }
    
    const customerId = deliveryGroup.get('customerId')?.value;
    const orderId = deliveryGroup.get('orderId')?.value;
    const address = deliveryGroup.get('deliveryAddress')?.value;
    
    if (customerId && orderId && address) {
      classes.push('delivery-complete');
    } else {
      classes.push('delivery-incomplete');
    }
    
    return classes.join(' ');
  }

  getStepMarkerStyle(deliveryGroup: FormGroup): any {
    const customerId = deliveryGroup.get('customerId')?.value;
    const orderId = deliveryGroup.get('orderId')?.value;
    const address = deliveryGroup.get('deliveryAddress')?.value;
    
    if (customerId && orderId && address) {
      return {
        'background': 'linear-gradient(135deg, #10b981, #059669)',
        'border': '3px solid white',
        'box-shadow': '0 4px 12px rgba(16, 185, 129, 0.3)'
      };
    } else {
      return {
        'background': 'linear-gradient(135deg, #94a3b8, #64748b)',
        'border': '3px solid white',
        'box-shadow': '0 4px 12px rgba(148, 163, 184, 0.3)'
      };
    }
  }

  formatTimeForDisplay(timeString: string): string {
    if (!timeString) return '';
    
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    
    return this.datePipe.transform(date, 'HH:mm') || timeString;
  }

  calculateDeliveryTime(sequence: number): string {
    const startHour = 8;
    const intervalMinutes = 45;
    
    const totalMinutes = startHour * 60 + ((sequence - 1) * intervalMinutes);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  getDeliveryStatus(deliveryGroup: FormGroup): string {
    const customerId = deliveryGroup.get('customerId')?.value;
    const orderId = deliveryGroup.get('orderId')?.value;
    const address = deliveryGroup.get('deliveryAddress')?.value;
    
    if (!customerId && !orderId) return 'À compléter';
    if (!customerId) return 'Client manquant';
    if (!orderId) return 'Commande manquante';
    if (!address || address.trim().length < 5) return 'Adresse incomplète';
    
    return 'Prête';
  }

  getDeliveryStatusColor(deliveryGroup: FormGroup): string {
    const status = this.getDeliveryStatus(deliveryGroup);
    
    switch (status) {
      case 'Prête':
        return 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))';
      case 'À compléter':
        return 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))';
      case 'Client manquant':
        return 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1))';
      case 'Commande manquante':
        return 'linear-gradient(135 deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1))';
      case 'Adresse incomplète':
        return 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.1))';
      default:
        return 'linear-gradient(135deg, rgba(148, 163, 184, 0.1), rgba(100, 116, 139, 0.1))';
    }
  }

  resetSequences(): void {
    this.deliveryControls.forEach((group, index) => {
      group.get('sequence')?.setValue(index + 1, { emitEvent: false });
    });
    
    this.snackBar.open('Ordres réinitialisés', 'Fermer', { duration: 2000 });
  }

  sortDeliveriesBySequence(): void {
    const sortedDeliveries = [...this.deliveryControls]
      .sort((a, b) => {
        const seqA = a.get('sequence')?.value || 0;
        const seqB = b.get('sequence')?.value || 0;
        return seqA - seqB;
      });
    
    this.deliveries.clear();
    sortedDeliveries.forEach(delivery => {
      this.deliveries.push(delivery);
    });
    
    this.snackBar.open('Livraisons triées par ordre', 'Fermer', { duration: 2000 });
  }

  validateDeliverySequence(): boolean {
    const sequences = this.deliveryControls.map(group => group.get('sequence')?.value);
    const uniqueSequences = new Set(sequences);
    
    if (uniqueSequences.size !== sequences.length) {
      this.snackBar.open('Attention: Des numéros d\'ordre sont en double', 'Fermer', { duration: 3000 });
      return false;
    }
    
    const minSequence = Math.min(...sequences);
    const maxSequence = Math.max(...sequences);
    
    if (minSequence !== 1) {
      this.snackBar.open('Attention: L\'ordre doit commencer à 1', 'Fermer', { duration: 3000 });
      return false;
    }
    
    if (maxSequence !== sequences.length) {
      this.snackBar.open('Attention: L\'ordre n\'est pas continu', 'Fermer', { duration: 3000 });
      return false;
    }
    
    return true;
  }

  autoCalculatePlannedTimes(): void {
    this.deliveryControls.forEach((group, index) => {
      const calculatedTime = this.calculateDeliveryTime(index + 1);
      group.get('plannedTime')?.setValue(calculatedTime, { emitEvent: false });
    });
    
    this.snackBar.open('Heures planifiées calculées automatiquement', 'Fermer', { duration: 2000 });
  }

  calculateArrivalTime(): string {
    const startDate = this.tripForm.get('estimatedStartDate')?.value;
    const duration = parseFloat(this.tripForm.get('estimatedDuration')?.value || '0');
    
    if (!startDate || !duration) return 'Non calculable';
    
    const start = new Date(startDate);
    start.setHours(8, 0, 0, 0);
    
    const arrival = new Date(start.getTime() + (duration * 60 * 60 * 1000));
    return this.datePipe.transform(arrival, 'HH:mm') || '';
  }

  getCompletedDeliveriesCount(): number {
    return this.deliveryControls.filter(group => {
      const customerId = group.get('customerId')?.value;
      const orderId = group.get('orderId')?.value;
      const address = group.get('deliveryAddress')?.value;
      return customerId && orderId && address && address.trim().length > 5;
    }).length;
  }

  editDelivery(index: number): void {
    const deliveryElement = document.querySelector(`[formGroupName="${index}"]`);
    if (deliveryElement) {
      deliveryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      deliveryElement.classList.add('editing');
      setTimeout(() => {
        deliveryElement.classList.remove('editing');
      }, 2000);
    }
    
    this.snackBar.open(`Modification de la livraison ${index + 1}`, 'Fermer', { duration: 2000 });
  }

  getDeliveryCompletionPercentage(): number {
    const total = this.deliveries.length * 3;
    if (total === 0) return 0;
    
    let completed = 0;
    this.deliveryControls.forEach(group => {
      if (group.get('customerId')?.value) completed++;
      if (group.get('orderId')?.value) completed++;
      if (group.get('deliveryAddress')?.value?.trim().length > 5) completed++;
    });
    
    return Math.round((completed / total) * 100);
  }

  exportTimeline(): void {
    this.snackBar.open('Export du récapitulatif en cours...', 'Fermer', { duration: 2000 });
  }

  printTimeline(): void {
    window.print();
  }

  @HostListener('window:beforeunload', ['$event'])
  beforeUnloadHandler(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedTrajectChanges) {
      event.preventDefault();
      event.returnValue = 'Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter ?';
    }
  }

  ngOnDestroy(): void {
    if (this.availabilityCheckTimeout) {
      clearTimeout(this.availabilityCheckTimeout);
      this.availabilityCheckTimeout = null;
    }
    
    if (this.autoSaveSubscription) {
      this.autoSaveSubscription.unsubscribe();
    }
    
    if (this.shouldSaveDraft()) {
      this.saveDraft();
    }
    
    if (this.arrivalEqualsDepartureChangeSub) {
      this.arrivalEqualsDepartureChangeSub.unsubscribe();
    }
  }

  changeTraject(): void {
    if (this.selectedTraject && this.hasUnsavedTrajectChanges) {
      const confirmed = confirm('Vous avez des modifications non sauvegardées dans le traject. Voulez-vous vraiment changer sans sauvegarder ?');
      if (!confirmed) {
        return;
      }
    }
  }

  hasDeliveryData(): boolean {
    return this.deliveries.length > 0;
  }

  deleteTraject(): void {
    if (!this.selectedTraject || !this.selectedTraject.id) {
      return;
    }

    Swal.fire({
      title: 'Supprimer le traject ?',
      text: `Êtes-vous sûr de vouloir supprimer le traject "${this.selectedTraject.name}" ? Cette action est irréversible.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler',
      reverseButtons: true,
      backdrop: true,
      allowOutsideClick: false,
      allowEscapeKey: false
    }).then((result) => {
      if (result.isConfirmed) {
        this.performTrajectDeletion();
      }
    });
  }

  private performTrajectDeletion(): void {
    const trajectId = this.selectedTraject?.id;
    
    this.http.deleteTraject(trajectId).subscribe({
      next: () => {
        Swal.fire({
          title: 'Succès',
          text: 'Traject supprimé avec succès',
          icon: 'success',
          showConfirmButton: false,
          timer: 1500
        }).then(() => {
          this.selectedTraject = null;
          this.selectedTrajectControl.setValue(null);
          this.loadTrajects();
        });
      },
      error: (error) => {
        console.error('Erreur lors de la suppression:', error);
        
        let errorMessage = 'Erreur lors de la suppression du traject';
        
        if (error.status === 404) {
          errorMessage = 'Traject non trouvé';
        } else if (error.status === 403) {
          errorMessage = 'Vous n\'avez pas les permissions nécessaires';
        } else if (error.status === 409) {
          errorMessage = 'Ce traject est utilisé dans des voyages, suppression impossible';
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.error?.errors?.[0]?.message) {
          errorMessage = error.error.errors[0].message;
        }
        
        Swal.fire('Erreur', errorMessage, 'error');
      }
    });
  }

  private loadLocations(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadingLocations = true;
      this.http.getLocations().subscribe({
        next: (response: any) => {
          const locations = response.data || response.locations || response;
          
          if (Array.isArray(locations)) {
            this.locations = locations.map(location => ({
              ...location,
              zoneId: location.zoneId || location.zone?.id || null,
              zoneName: location.zoneName || location.zone?.name || ''
            }));
            
            this.activeLocations = this.locations.filter(loc => loc.isActive);
          }
          
          this.loadingLocations = false;
          resolve();
        },
        error: (error) => {
          console.error('Error loading locations:', error);
          this.loadingLocations = false;
          reject(error);
        }
      });
    });
  }

  getStartLocationId(): number | null {
    if (this.selectedTraject?.startLocationId) {
      return this.selectedTraject.startLocationId;
    }
    return this.tripForm.get('startLocationId')?.value || null;
  }

  getEndLocationId(): number | null {
    if (this.selectedTraject?.endLocationId) {
      return this.selectedTraject.endLocationId;
    }
    return this.tripForm.get('endLocationId')?.value || null;
  }

  onTrajectSelected(trajectId: number): void {
    console.log('Traject sélectionné avec ID:', trajectId);
    const traject = this.trajects.find(t => t.id === trajectId);
    if (!traject) {
      this.selectedTraject = null;
      return;
    }

    this.selectedTraject = { ...traject };
    
    // ✅ FIX: Set locations with explicit update and validity
    if (traject.startLocationId) {
      this.tripForm.get('startLocationId')?.setValue(traject.startLocationId, { emitEvent: true });
      this.tripForm.get('startLocationId')?.markAsTouched();
      this.tripForm.get('startLocationId')?.updateValueAndValidity();
    }
    
    if (traject.endLocationId) {
      this.tripForm.get('endLocationId')?.setValue(traject.endLocationId, { emitEvent: true });
      this.tripForm.get('endLocationId')?.markAsTouched();
      this.tripForm.get('endLocationId')?.updateValueAndValidity();
    }
    
    // Update arrival equals departure checkbox
    if (traject.startLocationId && traject.endLocationId && 
        traject.startLocationId === traject.endLocationId) {
      this.arrivalEqualsDeparture.setValue(true, { emitEvent: true });
    } else {
      this.arrivalEqualsDeparture.setValue(false, { emitEvent: true });
    }
    
    if (!traject.isPredefined && this.tripId) {
      this.showSaveAsPredefinedOption = true;
      this.saveAsPredefined = false;
    } else {
      this.showSaveAsPredefinedOption = false;
      this.saveAsPredefined = traject.isPredefined;
    }
    
    this.loadTrajectCustomersForOrderSelection(traject);
    
    setTimeout(() => {
      if (traject.startLocationId) {
        this.fetchWeatherForStartLocation();
      }
      if (traject.endLocationId) {
        this.fetchWeatherForEndLocation();
      }
    }, 500);
  }

  private loadTrajectCustomersForOrderSelection(traject: ITraject): void {
    const customerPoints = traject.points
      .filter(point => point.clientId)
      .map(point => ({
        clientId: point.clientId!,
        order: point.order,
        clientName: point.clientName || ''
      }))
      .reduce((unique, point) => {
        if (!unique.some(p => p.clientId === point.clientId)) {
          unique.push(point);
        }
        return unique;
      }, [] as { clientId: number, order: number, clientName: string }[])
      .sort((a, b) => a.order - b.order); 

    if (customerPoints.length === 0) {
      this.snackBar.open('Ce traject ne contient pas de clients', 'Fermer', { duration: 3000 });
      return;
    }

    const trajectCustomers: ICustomer[] = [];
    
    customerPoints.forEach(customerPoint => {
      const customer = this.allCustomers.find(c => c.id === customerPoint.clientId);
      if (customer) {
        const customerWithOrder = {
          ...customer,
          trajectOrder: customerPoint.order,
          displayName: `${customerPoint.order}. ${customer.name}`
        };
        trajectCustomers.push(customerWithOrder);
      }
    });

    this.trajectCustomers = trajectCustomers;
    
    this.showTrajectOrderSelection = true;
    this.trajectMode = 'predefined';
    this.hasMadeTrajectChoice = true;
    
    setTimeout(() => {
      const section = document.querySelector('.traject-order-selection');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
    
    this.snackBar.open(
      `Traject "${traject.name}" sélectionné. Choisissez les commandes pour ${trajectCustomers.length} client(s)`,
      'Fermer',
      { duration: 4000 }
    );
  }

  calculateTotalWeight(): number {
    return this.deliveryControls.reduce((total, deliveryGroup) => {
      const orderId = deliveryGroup.get('orderId')?.value;
      if (orderId) {
        const order = this.allOrders.find(o => o.id === orderId);
        return total + (order?.weight || 0);
      }
      return total;
    }, 0);
  }

  calculateCapacityPercentage(): number {
    const truckId = this.tripForm.get('truckId')?.value;
    if (!truckId) return 0;
    
    const truck = this.trucks.find(t => t.id === truckId);
    if (!truck || !truck.typeTruck?.capacity) return 0;
    
    const totalWeight = this.calculateTotalWeight();
    return Math.min(100, (totalWeight / truck.typeTruck?.capacity) * 100);
  }

  getSelectedTruckCapacity(): number {
    const truckId = this.tripForm.get('truckId')?.value;
    if (!truckId) return 0;
    const truck = this.trucks.find(t => t.id === truckId);
    return truck?.typeTruck?.capacity || 0;
  }

  getProgressBarColor(): string {
    const percentage = Number(this.calculateCapacityPercentage().toFixed(2));
    if (percentage >= 100) {
      return '#ef4444'; 
    } else if (percentage >= 90) {
      return '#f59e0b'; 
    } else if (percentage >= 70) {
      return '#3b82f6'; 
    } else {
      return '#10b981'; 
    }
  }

  calculateDeliveryPercentage(index: number): number {
    const truckId = this.tripForm.get('truckId')?.value;
    if (!truckId) return 0;
    
    const truck = this.trucks.find(t => t.id === truckId);
    if (!truck?.typeTruck?.capacity) return 0;
    
    const deliveryGroup = this.deliveryControls[index];
    const orderId = deliveryGroup.get('orderId')?.value;
    if (!orderId) return 0;
    
    const order = this.allOrders.find(o => o.id === orderId);
    const weight = order?.weight || 0;
    
    return (weight / truck.typeTruck?.capacity) * 100;
  }

  private loadConvoyeurs(): void {
    this.loadingConvoyeurs = true;

    this.http.getConvoyeurs().subscribe({
      next: (convoyeurs) => {
        this.convoyeurs = convoyeurs;
        this.loadingConvoyeurs = false;
      },
      error: (error) => {
        console.error('Error loading convoyeurs:', error);
        this.snackBar.open('Erreur lors du chargement des convoyeurs', 'Fermer', { duration: 3000 });
        this.loadingConvoyeurs = false;
      }
    });
  }

  onArrivalEqualsDepartureChange(checked: boolean | null): void {
    const isChecked = checked ?? false;
    if (isChecked) {
      const startLocationId = this.tripForm.get('startLocationId')?.value;
      if (startLocationId) {
        this.tripForm.get('endLocationId')?.setValue(startLocationId);
        this.tripForm.get('endLocationId')?.clearValidators();
        this.tripForm.get('endLocationId')?.updateValueAndValidity();
      }
    } else {
      this.tripForm.get('endLocationId')?.setValidators(Validators.required);
      this.tripForm.get('endLocationId')?.updateValueAndValidity();
    }
  }

  private loadAllDrivers(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadingDrivers = true;
      this.http.getDrivers().subscribe({
        next: (drivers) => {
          this.drivers = drivers;
          this.driverTruckMap.clear();
          drivers.forEach(driver => {
            if (driver.idCamion) {
              this.driverTruckMap.set(driver.id, driver.idCamion);
            }
          });
          
          console.log('🚛 Mapping chauffeur-camion:', 
            Array.from(this.driverTruckMap.entries())
          );
          
          this.loadingDrivers = false;
          resolve();
        },
        error: (error) => {
          console.error('Error loading drivers:', error);
          this.snackBar.open('Erreur lors du chargement des chauffeurs', 'Fermer', { duration: 3000 });
          this.loadingDrivers = false;
          reject(error);
        }
      });
    });
  }

  getCurrentDriverName(): string {
    const driverId = this.tripForm.get('driverId')?.value;
    if (!driverId) return '';
    
    const driver = this.drivers.find(d => d.id === driverId);
    return driver?.name || 'Chauffeur actuel';
  }

  getCurrentDriverPermis(): string {
    const driverId = this.tripForm.get('driverId')?.value;
    if (!driverId) return '';
    
    const driver = this.drivers.find(d => d.id === driverId);
    return driver?.drivingLicense || '';
  }

  isDriverInList(driverId: number): boolean {
    return this.drivers.some(d => d.id === driverId);
  }

  isCurrentDriverInAvailableList(): boolean {
    const driverId = this.tripForm.get('driverId')?.value;
    if (!driverId) return false;
    
    return this.availableDrivers.some(d => d.id === driverId);
  }

  getDriverNameById(id: number | null): string {
    if (!id) return '';
    const driver = this.availableDrivers.find(d => d.id === id) || 
                   this.drivers.find(d => d.id === id);
    return driver ? driver.name : '';
  }

  get displayedClients(): ICustomer[] {
    if (this.showAllClients) {
      return this.filteredClients;
    }
    return this.filteredClients.slice(0, this.clientsToShowCount);
  }

  get shouldShowMoreButton(): boolean {
    return this.filteredClients.length > this.clientsToShowCount && !this.showAllClients;
  }

  get shouldShowLessButton(): boolean {
    return this.showAllClients && this.filteredClients.length > this.clientsToShowCount;
  }

  showMoreClients(): void {
    this.showAllClients = true;
    
    setTimeout(() => {
      const clientGrid = document.querySelector('.client-grid');
      if (clientGrid) {
        clientGrid.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 100);
  }

  showLessClients(): void {
    this.showAllClients = false;
   
    setTimeout(() => {
      const clientGrid = document.querySelector('.client-grid');
      if (clientGrid) {
        clientGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  toggleClientsDisplay(): void {
    if (this.showAllClients) {
      this.showLessClients();
    } else {
      this.showMoreClients();
    }
  }

  updateClientsToShowCount(): void {
    if (window.innerWidth < 768) {
      this.clientsToShowCount = 3;
    } else if (window.innerWidth < 1024) {
      this.clientsToShowCount = 4;
    } else {
      this.clientsToShowCount = this.maxInitialClients;
    }
    
    if (this.showAllClients && this.filteredClients.length <= this.clientsToShowCount) {
      this.showAllClients = false;
    }
  }

  getSaveButtonTooltip(): string {
    const reasons = [];
    
    if (this.tripForm.invalid) {
      reasons.push('Formulaire invalide');
      
      if (this.tripForm.get('estimatedStartDate')?.invalid) reasons.push('Date début requise');
      if (this.tripForm.get('estimatedEndDate')?.invalid) reasons.push('Date fin requise');
      if (this.tripForm.get('truckId')?.invalid) reasons.push('Camion requis');
      if (this.tripForm.get('driverId')?.invalid) reasons.push('Chauffeur requis');
      if (this.tripForm.get('estimatedDistance')?.invalid) reasons.push('Distance invalide');
      if (this.tripForm.get('estimatedDuration')?.invalid) reasons.push('Durée invalide');
      if (this.tripForm.get('startLocationId')?.invalid) reasons.push('Lieu départ requis');
      if (this.tripForm.get('endLocationId')?.invalid) reasons.push('Lieu arrivée requis');
    }
    
    if (this.deliveries.length === 0) {
      reasons.push('Aucune livraison');
    } else if (this.deliveries.invalid) {
      reasons.push('Livraisons invalides');
    }
    
    if (this.loading) {
      reasons.push('Chargement en cours');
    }
    
    if (this.saveAsPredefined && !this.trajectName?.trim()) {
      reasons.push('Nom du traject requis');
    }
    
    return reasons.length > 0 ? `Impossible de sauvegarder: ${reasons.join(', ')}` : '';
  }
  
  private showAcceptedConfirmation(): void {
    Swal.fire({
      title: 'Accepter le voyage',
      html: `
        <div style="text-align: left;">
          <p><strong>Confirmation d'acceptation:</strong></p>
          <ul>
            <li>Camion: <strong>${this.getSelectedTruckInfo()}</strong></li>
            <li>Chauffeur: <strong>${this.getSelectedDriverInfo()}</strong></li>
            <li>Convoyeur: <strong>${this.getSelectedConvoyeurInfo()}</strong></li>
            <li>Date de début: <strong>${this.formatDateForDisplay(this.tripForm.get('estimatedStartDate')?.value)}</strong></li>
          </ul>
          <p>Voulez-vous accepter ce voyage ?</p>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Accepter',
      cancelButtonText: 'Revoir'
    });
  }

  private showLoadingConfirmation(): void {
    const totalWeight = this.calculateTotalWeight();
    const capacity = this.getSelectedTruckCapacity();
    const percentage = Number(this.calculateCapacityPercentage().toFixed(2));
    
    Swal.fire({
      title: 'Début du chargement',
      html: `
        <div style="text-align: left;">
          <p><strong>Prêt pour le chargement:</strong></p>
          <ul>
            <li>Poids total: <strong>${totalWeight.toFixed(2)} tonne</strong></li>
            <li>Capacité du camion: <strong>${capacity} tonne</strong></li>
            <li>Utilisation: <strong>${percentage.toFixed(1)}%</strong></li>
            <li>Nombre de livraisons: <strong>${this.deliveries.length}</strong></li>
            <li>Chauffeur: <strong>${this.getSelectedDriverInfo()}</strong></li>
            <li>Convoyeur: <strong>${this.getSelectedConvoyeurInfo()}</strong></li>
          </ul>
          <p>Démarrer le processus de chargement ?</p>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: 'Commencer le chargement',
      cancelButtonText: 'Revoir'
    });
  }
  
  private getPreviousStatus(): string {
    const current = this.tripForm.get('tripStatus')?.value;
    switch(current) {
      case 'Accepted': return 'Planned';
      case 'LoadingInProgress': return 'Accepted';
      case 'DeliveryInProgress': return 'LoadingInProgress';
      case 'Receipt': return 'DeliveryInProgress';
      default: return 'Planned';
    }
  }
  
  private updateTripStatusInForm(status: TripStatus): void {
    const statusControl = this.tripForm.get('tripStatus');
    if (statusControl?.disabled) {
      statusControl.enable();
    }
    
    this.tripForm.patchValue({ tripStatus: status });
    
    statusControl?.markAsTouched();
    statusControl?.updateValueAndValidity();
    
    this.tripForm.updateValueAndValidity();
  }
  
  initializeDropdownFilters(): void {
    this.dropdownFilters.client = new Array(this.deliveries.length).fill('');
    this.dropdownFilters.order = new Array(this.deliveries.length).fill('');
  }

  filterDropdown(type: 'client' | 'order', index: number, event: any): void {
    this.dropdownFilters[type][index] = event.target.value.toLowerCase().trim();
  }

  getFilteredCustomers(index: number): ICustomer[] {
    const filterText = this.dropdownFilters.client[index] || '';
    
    if (!filterText) {
      return this.customers;
    }
    
    return this.customers.filter(customer => 
      customer.name.toLowerCase().includes(filterText) ||
      customer.matricule?.toLowerCase().includes(filterText) ||
      customer.email?.toLowerCase().includes(filterText)
    );
  }

  getFilteredOrders(index: number): IOrder[] {
    const deliveryGroup = this.deliveryControls[index];
    const customerId = deliveryGroup.get('customerId')?.value;
    
    if (!customerId) {
      return [];
    }
    
    const filterText = this.dropdownFilters.order[index] || '';
    const customerOrders = this.allOrders.filter(order => 
      order.customerId === parseInt(customerId) && 
      (order.status?.toLowerCase() === OrderStatus.ReadyToLoad?.toLowerCase())
    );
    
    if (!filterText) {
      return customerOrders;
    }
    
    return customerOrders.filter(order => 
      order.reference.toLowerCase().includes(filterText) ||
      order.type?.toLowerCase().includes(filterText)
    );
  }



  


  getSelectedStartLocationInfo(): string {
    const locationId = this.getStartLocationId();
    if (!locationId) return 'Non sélectionné';
    
    const location = this.locations.find(l => l.id === locationId);
    if (!location) return 'Lieu inconnu';
    
    let display = location.name;
    if (location.zoneName) {
      display += ` (Zone: ${location.zoneName})`;
    }
    
    return display;
  }

  getSelectedEndLocationInfo(): string {
    const locationId = this.getEndLocationId();
    if (!locationId) return 'Non sélectionné';
    
    const location = this.locations.find(l => l.id === locationId);
    if (!location) return 'Lieu inconnu';
    
    let display = location.name;
    if (location.zoneName) {
      display += ` (Zone: ${location.zoneName})`;
    }
    
    return display;
  }

  getStartZoneName(): string | null {
    const locationId = this.tripForm.get('startLocationId')?.value;
    return this.getZoneNameForLocation(locationId);
  }

  getEndZoneName(): string | null {
    const locationId = this.tripForm.get('endLocationId')?.value;
    return this.getZoneNameForLocation(locationId);
  }

  hasZone(locationId: number): boolean {
    if (!locationId) return false;
    const location = this.locations.find(l => l.id === locationId);
    return !!(location && location.zoneName);
  }

  getStartWeatherInfo(): string {
    if (!this.startLocationWeather) return 'Aucune donnée météo';
    
    const zoneName = this.getStartZoneName();
    const locationName = this.getSelectedStartLocationInfo();
    
    return `Météo ${zoneName ? `pour la zone ${zoneName}` : `à ${locationName}`}: ${this.startLocationWeather.description}, ${this.startLocationWeather.temperature}°C`;
  }

  getEndWeatherInfo(): string {
    if (!this.endLocationWeather) return 'Aucune donnée météo';
    
    const zoneName = this.getEndZoneName();
    const locationName = this.getSelectedEndLocationInfo();
    
    return `Météo ${zoneName ? `pour la zone ${zoneName}` : `à ${locationName}`}: ${this.endLocationWeather.description}, ${this.endLocationWeather.temperature}°C`;
  }
  
  getWeatherIconClass(iconCode: string): string {
    return this.http.getWeatherIconClass(iconCode);
  }
  

 

 

  toggleWeatherForecast(): void {
    this.showWeatherForecast = !this.showWeatherForecast;
    
    if (this.showWeatherForecast && this.startLocationForecast.length === 0 && this.endLocationForecast.length === 0) {
      this.fetchWeatherForecast();
    }
  }

  

  private fetchForecasts(): void {
    const startZoneName = this.getStartZoneName();
    const endZoneName = this.getEndZoneName();

    const requests: any[] = [];

    if (startZoneName) {
      requests.push(
        this.http
          .getWeatherForecast(startZoneName)
          .pipe(map(forecast => ({ forecast, type: 'start' })))
      );
    }

    if (endZoneName) {
      requests.push(
        this.http
          .getWeatherForecast(endZoneName)
          .pipe(map(forecast => ({ forecast, type: 'end' })))
      );
    }

    if (!requests.length) return;

    forkJoin(requests).subscribe({
      next: results => {
        results.forEach(r => {
          if (r.type === 'start') {
            this.startLocationForecast = r.forecast;
          }
          if (r.type === 'end') {
            this.endLocationForecast = r.forecast;
          }
        });
      },
      error: err => console.error('Error fetching forecasts:', err)
    });
  }

  get getCurrentTime(): string {
    return this.datePipe.transform(new Date(), 'HH:mm') || '';
  }

  private getZoneNameForLocation(locationId: number): string | null {
    if (!locationId) return null;
    
    const location = this.locations.find(l => l.id === locationId);
    if (!location) return null;
    
    if (location.zoneName) {
      return location.zoneName;
    }
    
    return location.name;
  }

  private refreshDriversByDate(): void {
    if (this.locations.length === 0) {
      console.warn('Locations not loaded yet');
      return;
    }
    
    const startDate = this.tripForm.get('estimatedStartDate')?.value;
    
    if (startDate) {
      this.loadAvailableDrivers(startDate);
    } else {
      this.availableDrivers = [...this.drivers];
      this.unavailableDrivers = [];
    }
  }

  private loadAvailableDrivers(date: Date | null): void {
    if (!date) {
      this.availableDrivers = [...this.drivers];
      this.unavailableDrivers = [];
      return;
    }
    
    const dateStr = this.formatDateForAPI(date);
    const excludeTripId = this.tripId || this.tripId;
    
    this.loadingAvailableDrivers = true;
    
    this.http.getAvailableDriversByDateAndZone(dateStr, undefined, excludeTripId).subscribe({
      next: (response: any) => {
        this.processDriverResponse(response, date);
        this.loadingAvailableDrivers = false;
      },
      error: (error) => {
        console.error('Error loading available drivers:', error);
        this.handleDriverLoadError(date, excludeTripId);
        this.loadingAvailableDrivers = false;
      }
    });
  }

  private handleDriverLoadError(date: Date, excludeTripId?: number): void {
    console.error('Driver load error - Date:', date, 'ExcludeTrip:', excludeTripId);
    
    if (date) {
      const dateStr = this.formatDateForAPI(date);
      
      this.http.getAvailableDriversByDateAndZone(dateStr, undefined, excludeTripId).subscribe({
        next: (response: any) => {
          this.processDriverResponse(response, date);
        },
        error: (fallbackError) => {
          console.error('Fallback also failed:', fallbackError);
          this.availableDrivers = [...this.drivers];
          this.unavailableDrivers = [];
        }
      });
    } else {
      this.availableDrivers = [...this.drivers];
      this.unavailableDrivers = [];
    }
  }

  private processDriverResponse(response: any, date: Date): void {
    this.availableDrivers.forEach(driver => {
      driver.availabilityStatus = undefined;
      driver.availabilityMessage = undefined;
      driver.requiresApproval = undefined;
      driver.totalHours = undefined;
    });
   
    this.availableDrivers = (response.availableDrivers || []).map((apiDriver: any) => ({
      id: apiDriver.driverId,
      name: apiDriver.driverName,
      permisNumber: apiDriver.permisNumber || '',
      phone: apiDriver.phone || '',
      email: apiDriver.email || '',
      phoneCountry: apiDriver.phoneCountry || '+216',
      status: apiDriver.status || 'active',
      idCamion: apiDriver.idCamion || null,
      isActive: true,
      zoneId: apiDriver.zoneId || null,
      zoneName: apiDriver.zoneName || '',
      availabilityStatus: undefined,
      availabilityMessage: undefined,
      requiresApproval: undefined,
      totalHours: undefined
    }));
    
    this.unavailableDrivers = response.unavailableDrivers || [];
    
    this.handleCurrentDriverForEdit(response);
    
    this.checkNoDriversWarning(date, response);
  }

  private handleCurrentDriverForEdit(response: any): void {
    const driverId = this.tripForm.get('driverId')?.value;
    if (driverId && !this.tripId) {
      const currentDriverInResponse = response.availableDrivers?.find((d: any) => d.driverId === driverId);
      if (currentDriverInResponse) {
        const driver = this.drivers.find(d => d.id === driverId);
        if (driver && !this.availableDrivers.some(d => d.id === driverId)) {
          this.availableDrivers.push(driver);
        }
      }
    }
  }

  private checkNoDriversWarning(date: Date, response: any): void {
    if (this.availableDrivers.length === 0 && this.drivers.length > 0) {
      const zoneName = this.getStartZoneName();
      
      let warningMessage = `Aucun chauffeur disponible le ${this.formatDateForDisplay(date)}`;
      if (zoneName) {
        warningMessage += ` dans la zone ${zoneName}`;
      }
      
      if (response.unavailableDrivers && response.unavailableDrivers.length > 0) {
        warningMessage += ` (${response.unavailableDrivers.length} chauffeur(s) indisponible(s))`;
      }
      
      console.warn(warningMessage);
    }
  }


  getFormattedDay(date: Date): string {
    if (!date) return 'JJ';
    return this.datePipe.transform(date, 'dd') || '';
  }

  getFormattedMonth(date: Date): string {
    if (!date) return 'MMM';
    return this.datePipe.transform(date, 'MMM')?.toUpperCase() || '';
  }

  getFormattedYear(date: Date): string {
    if (!date) return 'AAAA';
    return this.datePipe.transform(date, 'yyyy') || '';
  }

  openStartDatePicker(): void {
    this.selectedDateField = 'start';
    this.calendarTitle = 'Sélectionner la date de début';
    this.showCalendarModal = true;
    this.generateCalendar();
  }

  openEndDatePicker(): void {
    this.selectedDateField = 'end';
    this.calendarTitle = 'Sélectionner la date de fin';
    this.showCalendarModal = true;
    this.generateCalendar();
  }

  closeCalendarModal(): void {
    this.showCalendarModal = false;
    this.selectedDateField = null;
  }

  generateCalendar(): void {
    this.calendarDays = [];
    
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    for (let i = 0; i < startDay; i++) {
      this.calendarDays.push(null);
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      this.calendarDays.push(new Date(this.currentYear, this.currentMonth, i));
    }
  }

  getCurrentMonthYear(): string {
    return this.datePipe.transform(new Date(this.currentYear, this.currentMonth), 'MMMM yyyy') || '';
  }

  previousMonth(): void {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.generateCalendar();
  }

  nextMonth(): void {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.generateCalendar();
  }

  isDaySelected(day: Date | null): boolean {
    if (!day || !this.selectedDateField) return false;
    
    const formDate = this.selectedDateField === 'start' 
      ? this.tripForm.get('estimatedStartDate')?.value
      : this.tripForm.get('estimatedEndDate')?.value;
    
    if (!formDate) return false;
    
    return this.datePipe.transform(formDate, 'yyyy-MM-dd') === this.datePipe.transform(day, 'yyyy-MM-dd');
  }

  isDayDisabled(day: Date | null): boolean {
    if (!day) return true;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (day < today) return true;
    
    if (this.calendarMode === 'range') {
      if (this.selectedRangeStart && day < this.selectedRangeStart) {
        return true;
      }
    } else if (this.selectedDateField === 'end') {
      const startDate = this.estimatedStartDateControl?.value;
      if (startDate && day < new Date(startDate)) {
        return true;
      }
    }
    
    return false;
  }

  selectToday(): void {
    const today = new Date();
    
    if (this.calendarMode === 'single') {
      this.selectDate(today);
    } else if (this.calendarMode === 'range') {
      this.selectDateRange(today);
      
      if (!this.selectedRangeEnd) {
        this.selectedRangeEnd = new Date(today);
        this.isSelectingRange = false;
      }
    }
  }

  clearDate(): void {
    if (this.calendarMode === 'single') {
      if (this.selectedDateField === 'start') {
        this.estimatedStartDateControl?.setValue(null);
      } else if (this.selectedDateField === 'end') {
        this.estimatedEndDateControl?.setValue(null);
      }
    } else if (this.calendarMode === 'range') {
      this.clearDateRange();
    }
  }

  confirmDate(): void {
    this.closeCalendarModal();
  }

  private dateSequenceValidator(control: AbstractControl): ValidationErrors | null {
    const startDate = this.estimatedStartDateControl?.value;
    const endDate = control.value;
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      
      if (end < start) {
        return { 
          dateSequence: {
            message: 'La date de fin doit être après la date de début',
            startDate: startDate,
            endDate: endDate
          }
        };
      }
    }
    
    return null;
  }

  get estimatedStartDateControl(): FormControl | null {
    return this.tripForm?.get('estimatedStartDate') as FormControl || null;
  }

  get estimatedEndDateControl(): FormControl | null {
    return this.tripForm?.get('estimatedEndDate') as FormControl || null;
  }

  calculateDateDuration(): number {
    const start = this.estimatedStartDateControl?.value;
    const end = this.estimatedEndDateControl?.value;
    
    if (!start || !end) return 0;
    
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return 0;
    }
    
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  openDateRangePicker(): void {
    this.calendarMode = 'range';
    this.showDateRangeModal = true;
    
    this.selectedRangeStart = this.estimatedStartDateControl?.value;
    this.selectedRangeEnd = this.estimatedEndDateControl?.value;
    
    if (this.selectedRangeStart && !this.selectedRangeEnd) {
      this.selectedRangeEnd = new Date(this.selectedRangeStart);
      this.isSelectingRange = false;
    } else if (!this.selectedRangeStart) {
      this.isSelectingRange = true;
    } else {
      this.isSelectingRange = false;
    }
    
    this.generateCalendar();
  }

  selectDateRange(day: Date | null): void {
    if (!day || this.isDayDisabled(day)) return;
    
    if (!this.selectedRangeStart || (this.selectedRangeStart && this.selectedRangeEnd)) {
      this.selectedRangeStart = day;
      this.selectedRangeEnd = null;
      this.isSelectingRange = true;
    } else if (this.selectedRangeStart && !this.selectedRangeEnd) {
      if (day < this.selectedRangeStart) {
        this.snackBar.open(
          'La date de fin ne peut pas être avant la date de début',
          'Fermer',
          { duration: 3000 }
        );
        return;
      }
      
      this.selectedRangeEnd = day;
      this.isSelectingRange = false;
      
      if (this.isSameDay(this.selectedRangeStart, this.selectedRangeEnd)) {
        this.applyDateRange();
      }
    }
  }

  applyDateRange(): void {
    if (this.selectedRangeStart && this.selectedRangeEnd) {
      if (this.selectedRangeEnd < this.selectedRangeStart) {
        this.snackBar.open(
          'La date de fin ne peut pas être avant la date de début',
          'Fermer',
          { duration: 3000 }
        );
        return;
      }
    }
    
    if (this.selectedRangeStart) {
      this.estimatedStartDateControl?.setValue(this.selectedRangeStart);
      
      if (!this.selectedRangeEnd) {
        this.selectedRangeEnd = new Date(this.selectedRangeStart);
      }
      
      this.estimatedEndDateControl?.setValue(this.selectedRangeEnd);    
      this.estimatedEndDateControl?.updateValueAndValidity();
    }
    
    this.closeDateRangeModal();
  }

  closeDateRangeModal(): void {
    this.showDateRangeModal = false;
    this.selectedRangeStart = null;
    this.selectedRangeEnd = null;
    this.isSelectingRange = false;
  }

  isDateInRange(day: Date | null): boolean {
    if (!day || !this.selectedRangeStart) return false;
    
    if (this.selectedRangeStart && this.selectedRangeEnd) {
      return day >= this.selectedRangeStart && day <= this.selectedRangeEnd;
    } else if (this.selectedRangeStart && !this.selectedRangeEnd && this.isSelectingRange) {
      return this.isSameDay(day, this.selectedRangeStart);
    }
    
    return false;
  }

  isRangeStart(day: Date | null): boolean {
    return day && this.selectedRangeStart ? this.isSameDay(day, this.selectedRangeStart) : false;
  }

  isRangeEnd(day: Date | null): boolean {
    return day && this.selectedRangeEnd ? this.isSameDay(day, this.selectedRangeEnd) : false;
  }

  isSameDay(date1: Date | null, date2: Date | null): boolean {
    if (!date1 || !date2) return false;
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  selectDate(day: Date | null): void {
    if (!day || this.isDayDisabled(day)) return;
    
    this.loadDateStats(day);
    
    if (this.calendarMode === 'single') {
      if (this.selectedDateField === 'start') {
        this.estimatedStartDateControl?.setValue(day);
        this.estimatedEndDateControl?.setValue(new Date(day));
      } else if (this.selectedDateField === 'end') {
        this.estimatedEndDateControl?.setValue(day);
      }
    } else if (this.calendarMode === 'range') {
      this.selectDateRange(day);
    }
  }

  calculateRangeDuration(start: Date, end: Date): number {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
  }

  clearDateRange(): void {
    this.selectedRangeStart = null;
    this.selectedRangeEnd = null;
    this.isSelectingRange = false;
    
    this.estimatedStartDateControl?.setValue(null);
    this.estimatedEndDateControl?.setValue(null);
  }

  goBackToOrderSelection(): void {
    this.removeRecentlyAddedDeliveries();
    this.currentQuickAddStep = 2;
    this.restoreOrdersToSelection();
    
    setTimeout(() => {
      const orderSelectionSection = document.querySelector('.order-selection-step');
      if (orderSelectionSection) {
        orderSelectionSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  private removeRecentlyAddedDeliveries(): void {
    if (!this.selectedClient) return;
    
    const deliveriesToRemove: number[] = [];
    
    this.deliveryControls.forEach((delivery, index) => {
      const customerId = delivery.get('customerId')?.value;
      if (customerId && parseInt(customerId) === this.selectedClient!.id) {
        deliveriesToRemove.push(index);
      }
    });
    
    deliveriesToRemove.sort((a, b) => b - a).forEach(index => {
      this.removeDelivery(index);
    });
  }

  private restoreOrdersToSelection(): void {
    if (!this.selectedClient) return;
    
    const clientOrderIds = this.clientPendingOrders.map(order => order.id);
    this.selectedOrders = [...clientOrderIds];
  }

  private checkDriverAvailabilityOnChange(): void {
    const driverId = this.tripForm.get('driverId')?.value;
    const startDate = this.tripForm.get('estimatedStartDate')?.value;
    const duration = this.tripForm.get('estimatedDuration')?.value;
    const excludeTripId = this.tripId;
    
    if (this.availabilityCheckTimeout) {
      clearTimeout(this.availabilityCheckTimeout);
    }
    
    if (!driverId || !startDate || !duration || duration <= 0) {
      this.driverAvailabilityResult = null;
      return;
    }
    
    this.checkingDriverAvailability = true;
    
    this.availabilityCheckTimeout = setTimeout(() => {
      this.checkDriverAvailabilityWithParams(driverId, startDate, duration, excludeTripId);
    }, 500);
  }

  checkSelectedDriverAvailability(driverId: number): void {
    const startDate = this.tripForm.get('estimatedStartDate')?.value;
    const duration = this.tripForm.get('estimatedDuration')?.value;
    const excludeTripId = this.tripId;
    
    if (driverId && startDate && duration && duration > 0) {
      this.checkDriverAvailabilityWithParams(driverId, startDate, duration, excludeTripId);
    }
  }

  private checkDriverAvailabilityWithParams(driverId: number, startDate: Date, duration: number, excludeTripId?: number): void {
    this.checkingDriverAvailability = true;
    this.driverAvailabilityWarning = false;
    this.driverAvailabilityError = false;
    
    const dateStr = this.formatDateForAPI(startDate);
    
    const finalExcludeTripId = this.tripId || this.tripId || excludeTripId;
    
    this.http.checkDriverAvailabilityWithTripDuration(driverId, dateStr, duration, finalExcludeTripId).subscribe({
      next: (response: any) => {
        this.driverAvailabilityResult = response;
        
        if (!response.isAvailable) {
          this.driverAvailabilityWarning = true;
          
          this.showDriverAvailabilityWarning(response);
          
          if (response.status === 'exceeded') {
            this.suggestAlternativeDriver(startDate, duration, finalExcludeTripId);
          }
        } else if (response.requiresApproval) {
          this.driverAvailabilityWarning = true;
          this.showOvertimeWarning(response);
        }
        
        this.checkingDriverAvailability = false;
      },
      error: (error) => {
        console.error('Error checking driver availability:', error);
        this.checkingDriverAvailability = false;
        this.driverAvailabilityError = true;
      }
    });
  }

  private showDriverAvailabilityWarning(response: any): void {
    const driverName = response.driverName;
    const message = response.message;
    const status = response.status;
    
    let icon = 'warning';
    let color = 'warn';
    
    if (status === 'exceeded') {
      icon = 'error';
      color = 'error';
    } else if (status === 'overtime') {
      icon = 'schedule';
      color = 'accent';
    }
    
    this.snackBar.open(`${driverName}: ${message}`, 'Fermer', {
      duration: 5000,
      panelClass: [`${color}-snackbar`]
    });
  }

  private showOvertimeWarning(response: any): void {
    Swal.fire({
      title: 'Heures supplémentaires requises',
      html: `
        <div style="text-align: left;">
          <p><strong>${response.driverName}</strong></p>
          <p>Ce voyage nécessitera des heures supplémentaires.</p>
          <div style="background-color: #fef3c7; padding: 10px; border-radius: 5px; margin: 10px 0;">
            <p><strong>Détails:</strong></p>
            <ul>
              <li>Heures normales utilisées: ${response.normalHoursUsed}h</li>
              <li>Heures supplémentaires utilisées: ${response.overtimeHoursUsed}h</li>
              <li>Nouvelles heures supplémentaires: ${response.newOvertimeHours}h</li>
              <li>Total avec nouveau voyage: ${response.totalWithNewTrip || response.totalDailyHours}h</li>
            </ul>
          </div>
          <p>Une approbation sera nécessaire pour ce voyage.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Continuer',
      cancelButtonText: 'Changer de chauffeur',
      confirmButtonColor: '#f59e0b'
    }).then((result) => {
      if (result.isDismissed) {
        this.openDriverChangeDialog(response.driverId);
      }
    });
  }

  private suggestAlternativeDriver(startDate: Date, duration: number, excludeTripId?: number): void {
    const dateStr = this.formatDateForAPI(startDate);
    const finalExcludeTripId = this.tripId || this.tripId || excludeTripId;
    
    this.http.getAvailableDriversByDateAndZone(dateStr, undefined, finalExcludeTripId).subscribe({
      next: (response: any) => {
        if (response.availableDrivers && response.availableDrivers.length > 0) {
          const availableDrivers = response.availableDrivers;
          
          if (availableDrivers.length > 0) {
            Swal.fire({
              title: 'Chauffeur non disponible',
              html: `
                <div style="text-align: left;">
                  <p>Le chauffeur sélectionné n'est pas disponible pour la durée demandée.</p>
                  <p><strong>${availableDrivers.length}</strong> chauffeur(s) disponible(s):</p>
                  <div style="max-height: 200px; overflow-y: auto; margin: 10px 0;">
                    ${availableDrivers.map((driver: any) => `
                      <div style="padding: 5px; border-bottom: 1px solid #eee;">
                        <strong>${driver.driverName}</strong> (${driver.permisNumber})
                        ${driver.zoneName ? `<br><small>Zone: ${driver.zoneName}</small>` : ''}
                      </div>
                    `).join('')}
                  </div>
                  <p>Voulez-vous sélectionner un autre chauffeur ?</p>
                </div>
              `,
              icon: 'question',
              showCancelButton: true,
              confirmButtonText: 'Changer',
              cancelButtonText: 'Garder le chauffeur'
            }).then((result) => {
              if (result.isConfirmed) {
                const driverSelect = document.querySelector('mat-select[formControlName="driverId"]') as HTMLElement;
                if (driverSelect) {
                  driverSelect.click();
                }
              }
            });
          }
        }
      }
    });
  }

  private openDriverChangeDialog(currentDriverId: number): void {
    const driverSelectElement = document.querySelector('[formControlName="driverId"]') as HTMLElement;
    if (driverSelectElement) {
      driverSelectElement.click();
    }
  }

  private async loadDateStats(date: Date): Promise<void> {
    if (!date) return;
    
    this.dateStatsLoading = true;
    
    const dateStr = this.datePipe.transform(date, 'yyyy-MM-dd') || '';
    
    try {
      const response = await this.http.getDateStatistics(dateStr).toPromise();
      
      if (response && response.success) {
        const data = response.data;
        
        this.selectedDateStats = {
          date: date,
          totalClients: data.summary?.totalClients || 0,
          totalOrders: data.summary?.totalOrdersReady || 0,
          plannedTrips: data.summary?.plannedTrips || 0,
          availableDrivers: data.summary?.disponibleDrivers || 0,
          allReadyOrders: data.summary?.allReadyOrders || 0,
          ordersInTrips: data.summary?.ordersInTrips || 0,
          weightInTrips: data.summary?.weightInTrips || 0,
          assignedDrivers: data.summary?.disponibleDrivers || 0,
          availableTrucks: data.summary?.disponibleTrucks || 0,
          isWeekend: data.isWeekend || false,
          dayOfWeek: data.dayOfWeek || '',
          recommendations: data.recommendations || [],
          clients: data.clients || [],
          plannedTripsDetails: data.plannedTripsDetails || [],
          resourceStatus: data.resourceStatus || {
            driversAvailable: 0,
            driversNeeded: 0,
            driversShortage: 0,
            trucksAvailable: 0,
            trucksNeeded: 0,
            trucksShortage: 0
          }
        };
      }
    } catch (error) {
      console.error('Erreur lors du chargement des statistiques:', error);
      
      this.loadLocalDateStats(date);
    } finally {
      this.dateStatsLoading = false;
      this.showDateStatsModal = true;
    }
  }

  private loadLocalDateStats(date: Date): void {
    const dateStr = this.datePipe.transform(date, 'yyyy-MM-dd') || '';
    
    const clientsWithOrders = this.customers.filter(customer => 
      this.getClientPendingOrdersCount(customer.id) > 0
    );
    
    const assignedOrderIds: number[] = [];
    
    this.deliveryControls.forEach(delivery => {
      const orderId = delivery.get('orderId')?.value;
      if (orderId) {
        assignedOrderIds.push(orderId);
      }
    });
    
    const ordersNotAssigned = this.ordersForQuickAdd.filter(order => 
      !assignedOrderIds.includes(order.id)
    );
    
    const clientsWithOrdersNotAssigned = this.customers.filter(customer => 
      ordersNotAssigned.some(order => order.customerId === customer.id)
    );
    
    this.selectedDateStats = {
      date: date,
      totalClients: clientsWithOrdersNotAssigned.length,
      totalOrders: ordersNotAssigned.length,
      plannedTrips: this.deliveries.length > 0 ? 1 : 0,
      availableDrivers: this.availableDrivers.length,
      allReadyOrders: this.ordersForQuickAdd.length,
      ordersInTrips: this.deliveries.length,
      weightInTrips: this.calculateTotalWeight(),
      assignedDrivers: this.tripForm.get('driverId')?.value ? 1 : 0,
      availableTrucks: this.trucks.filter(t => t.status === 'Disponible').length,
      isWeekend: date.getDay() === 0 || date.getDay() === 6,
      dayOfWeek: this.getDayName(date),
      recommendations: this.generateLocalRecommendations(
        ordersNotAssigned.length,
        this.deliveries.length,
        this.availableDrivers.length
      ),
      clients: clientsWithOrdersNotAssigned.map(c => ({
        id: c.id,
        name: c.name,
        ordersCount: ordersNotAssigned.filter(o => o.customerId === c.id).length
      })),
      plannedTripsDetails: this.deliveries.length > 0 ? [{
        id: this.tripId || 0,
        tripReference: this.tripForm.get('tripReference')?.value || 'Nouveau',
        deliveriesCount: this.deliveries.length,
        ordersCount: this.deliveries.length,
        totalWeight: this.calculateTotalWeight()
      }] : [],
      resourceStatus: {
        driversAvailable: this.availableDrivers.length,
        driversNeeded: this.deliveries.length > 0 ? 1 : 0,
        driversShortage: Math.max(0, (this.deliveries.length > 0 ? 1 : 0) - this.availableDrivers.length),
        trucksAvailable: this.trucks.filter(t => t.status === 'Disponible').length,
        trucksNeeded: this.deliveries.length > 0 ? 1 : 0,
        trucksShortage: Math.max(0, (this.deliveries.length > 0 ? 1 : 0) - this.trucks.filter(t => t.status === 'Disponible').length)
      }
    };
  }

  private getDayName(date: Date): string {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return days[date.getDay()];
  }

  private generateLocalRecommendations(ordersReady: number, plannedTrips: number, availableDrivers: number): string[] {
    const recommendations: string[] = [];
    
    if (ordersReady > 0 && plannedTrips === 0) {
      recommendations.push(`${ordersReady} commande(s) prête(s) - Créez un nouveau voyage`);
    }
    
    if (availableDrivers === 0 && plannedTrips > 0) {
      recommendations.push('Aucun chauffeur disponible');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Statistiques locales chargées');
    }
    
    return recommendations;
  }

  continueWithDateSelection(): void {
    if (!this.selectedDateStats.date) return;
    
    this.showDateStatsModal = false;
    
    const day = this.selectedDateStats.date;
    
    if (this.calendarMode === 'single') {
      if (this.selectedDateField === 'start') {
        this.estimatedStartDateControl?.setValue(day);
        this.estimatedEndDateControl?.setValue(new Date(day));
      } else if (this.selectedDateField === 'end') {
        this.estimatedEndDateControl?.setValue(day);
      }
    } else if (this.calendarMode === 'range') {
      this.selectDateRange(day);
    }
  }

  get availableTrucksCount(): number {
    return this.availableTrucks.length;
  }

  get unavailableTrucksCount(): number {
    return this.unavailableTrucks.length;
  }

  selectTruck(truck: ITruck): void {
    if (!truck.disabled) {
      this.tripForm.get('truckId')?.setValue(truck.id);
    }
  }

  isLightColor(colorCode: string): boolean {
    const hex = colorCode.replace('#', '');
    
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    return luminance > 0.5;
  }



  private loadZones(): void {
   
  }

  private applyZoneFilter(): void {
    const zoneId = this.zoneFilterControl.value;
    
    this.applyCombinedFilters();
  }

  private applyCombinedFilters(): void {
    const searchText = this.clientSearchControl.value?.toLowerCase().trim() || '';
    const zoneId = this.zoneFilterControl.value;
    
    let filtered = [...this.allClientsWithPendingOrders];
    
    if (zoneId) {
      filtered = filtered.filter(client => client.zoneId === zoneId);
    }
    
    if (searchText) {
      filtered = filtered.filter(client => {
        return (
          client.name.toLowerCase().includes(searchText) ||
          client.matricule?.toLowerCase().includes(searchText) ||
          client.adress?.toLowerCase().includes(searchText) ||
          client.email?.toLowerCase().includes(searchText)
        );
      });
    }
    
    this.filteredClients = filtered;
    
    this.showAllClients = false;
  }

  clearZoneFilter(): void {
    this.zoneFilterControl.setValue(null);
  }

  getClientZoneName(clientId: number): string {
    const client = this.allClientsWithPendingOrders.find(c => c.id === clientId);
    return client?.zoneName || '';
  }

  trackByClientId(index: number, client: any): string {
    return client.id;
  }
  
  filterClients(): void {
    let filtered = this.allClientsWithPendingOrders;
    
    const searchTerm = this.clientSearchControl.value;
    if (searchTerm) {
      filtered = filtered.filter(client => 
        client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (client.matricule && client.matricule.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    const zoneId = this.zoneFilterControl.value;
    if (zoneId) {
      filtered = filtered.filter(client => client.zoneId === zoneId);
    }
    
    this.filteredClients = filtered;
    
    if (this.viewport) {
      this.viewport.scrollToIndex(0);
    }
  }
  
  onClientSearchChange(): void {
    this.filterClients();
  }
  
  onZoneFilterChange(): void {
    this.filterClients();
  }
  
  clearFilters(): void {
    this.clientSearchControl.setValue('');
    this.zoneFilterControl.setValue(null);
    this.filterClients();
  }

  private checkAndRestoreDraft(): void {
    if (this.tripId || this.tripId) return;
    
    const draft = this.loadDraft();
    
    if (draft) {
      this.showDraftRestoreNotification(draft);
    }
  }

  showDraftRestoreNotification(draft: any): void {
    const deliveryCount = draft.deliveries?.length || 0;
    const dateStr = draft.formData?.estimatedStartDate ? 
      new Date(draft.formData.estimatedStartDate).toLocaleDateString() : 'Date non définie';
    const lastSaved = draft.savedAt ? new Date(draft.savedAt).toLocaleTimeString() : 'Inconnue';
    
    Swal.fire({
      title: 'Brouillon disponible',
      html: `
        <div style="text-align: left; padding: 10px;">
          <div style="display: flex; align-items: flex-start; margin-bottom: 20px;">
            <div style="color: #3b82f6; margin-right: 15px; font-size: 32px;">📋</div>
            <div>
              <h4 style="margin: 0 0 8px 0; color: #1f2937;">Un brouillon a été trouvé</h4>
              <p style="margin: 0; color: #6b7280;">
                Vous avez un voyage en cours de création non terminé
              </p>
            </div>
          </div>
          
          <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h5 style="margin: 0 0 12px 0; color: #0369a1;">Détails du brouillon</h5>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
              <div>
                <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">Livraisons</div>
                <div style="font-weight: 700; font-size: 18px; color: #1f2937;">${deliveryCount}</div>
              </div>
              <div>
                <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">Date prévue</div>
                <div style="font-weight: 700; font-size: 18px; color: #1f2937;">${dateStr}</div>
              </div>
              <div>
                <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">Dernière sauvegarde</div>
                <div style="font-weight: 700; font-size: 18px; color: #1f2937;">${lastSaved}</div>
              </div>
              <div>
                <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">Statut</div>
                <div style="font-weight: 700; font-size: 18px; color: #059669;">Brouillon</div>
              </div>
            </div>
          </div>
          
          <p style="color: #4b5563; margin-bottom: 20px; font-size: 14px; line-height: 1.5;">
            Voulez-vous restaurer ce brouillon pour continuer votre travail ou 
            préférez-vous commencer un nouveau voyage ?
          </p>
        </div>
      `,
      icon: 'info',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: '📥 Restaurer le brouillon',
      denyButtonText: '🗑️ Effacer et recommencer',
      cancelButtonText: '✕ Plus tard',
      confirmButtonColor: '#3b82f6',
      denyButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      reverseButtons: true,
      width: '550px',
      backdrop: true,
      allowOutsideClick: false,
      allowEscapeKey: false,
    }).then((result) => {
      if (result.isConfirmed) {
        this.restoreDraft(draft);
      } else if (result.isDenied) {
        this.clearDraft();
        this.snackBar.open('Brouillon effacé, création d\'un nouveau voyage', 'Fermer', { 
          duration: 3000,
          panelClass: ['info-snackbar']
        });
      } else {
        this.snackBar.open('Brouillon conservé pour plus tard', 'Fermer', { duration: 2000 });
      }
    });
  }
  
  private restoreDraft(draft: any): void {
    try {
      console.log('Restauration du draft:', draft);
      
      if (draft.formData) {
        const formData = { ...draft.formData };
        
        if (formData.estimatedStartDate && typeof formData.estimatedStartDate === 'string') {
          formData.estimatedStartDate = new Date(formData.estimatedStartDate);
        }
        
        if (formData.estimatedEndDate && typeof formData.estimatedEndDate === 'string') {
          formData.estimatedEndDate = new Date(formData.estimatedEndDate);
        }
        
        this.tripForm.patchValue(formData, { emitEvent: false });
      }
      
      if (draft.deliveries && draft.deliveries.length > 0) {
        this.deliveries.clear();
        
        draft.deliveries.forEach((delivery: any, index: number) => {
          const sequence = delivery.sequence || index + 1;
          
          const deliveryGroup = this.fb.group({
            customerId: [delivery.customerId || '', Validators.required],
            orderId: [delivery.orderId || '', Validators.required],
            deliveryAddress: [delivery.deliveryAddress || '', [Validators.required, Validators.maxLength(500)]],
            sequence: [sequence, [Validators.required, Validators.min(1)]],
            plannedTime: [delivery.plannedTime || ''],
            notes: [delivery.notes || '']
          });
          
          this.deliveries.push(deliveryGroup);
        });
        
        this.showDeliveriesSection = true;
      }
      
      if (draft.selectedTraject) {
        this.selectedTraject = draft.selectedTraject;
        if (draft.selectedTraject.id) {
          this.selectedTrajectControl.setValue(draft.selectedTraject.id);
        }
      }
      
      if (draft.trajectMode) {
        this.trajectMode = draft.trajectMode;
      }
      
      this.snackBar.open('✅ Brouillon restauré', 'Fermer', { duration: 3000 });
      
      setTimeout(() => {
        const startDate = this.tripForm.get('estimatedStartDate')?.value;
        if (startDate) {
          this.loadTrucks();
          this.loadAvailableDrivers(startDate);
        }
      }, 500);
      
      setTimeout(() => {
        this.fetchWeatherForBothLocations();
      }, 1000);
      
      setTimeout(() => {
        this.resetInitialState();
      }, 100);
    } catch (error) {
      console.error('Erreur restauration draft:', error);
      this.snackBar.open('❌ Erreur restauration brouillon', 'Fermer', { duration: 3000 });
      this.clearDraft();
    }
  }
  
  private setupAutoSave(): void {
    setTimeout(() => {
      const formChanges$ = this.tripForm.valueChanges
        .pipe(debounceTime(3000))
        .subscribe(() => {
          if (this.shouldSaveDraft()) {
            this.saveDraft();
          }
        });
      
      const deliveriesChanges$ = this.deliveries.valueChanges
        .pipe(debounceTime(3000))
        .subscribe(() => {
          if (this.shouldSaveDraft()) {
            this.saveDraft();
          }
        });
      
      const trajectChanges$ = this.selectedTrajectControl.valueChanges
        .pipe(debounceTime(3000))
        .subscribe(() => {
          if (this.shouldSaveDraft()) {
            this.saveDraft();
          }
        });
      
      this.autoSaveSubscription.add(formChanges$);
      this.autoSaveSubscription.add(deliveriesChanges$);
      this.autoSaveSubscription.add(trajectChanges$);
      
      const interval$ = interval(60000).subscribe(() => {
        if (this.shouldSaveDraft()) {
          this.saveDraft();
        }
      });
      
      this.autoSaveSubscription.add(interval$);
    }, 200);
  }
  
  private saveDraft(): void {
    if (!this.shouldSaveDraft()) {
      console.log('No changes detected, skipping draft save');
      return;
    }
    
    try {
      const draft = {
        formData: this.tripForm.value,
        deliveries: this.deliveryControls.map(group => group.value),
        selectedTraject: this.selectedTraject,
        trajectMode: this.trajectMode,
        saveAsPredefined: this.saveAsPredefined,
        trajectName: this.trajectName,
        selectedClient: this.selectedClient,
        selectedOrders: this.selectedOrders,
        currentQuickAddStep: this.currentQuickAddStep,
        clientSearch: this.clientSearchControl.value,
        zoneFilter: this.zoneFilterControl.value,
        savedAt: new Date().toISOString(),
        tripReference: this.tripForm.get('tripReference')?.value || 'Nouveau voyage'
      };
      
      localStorage.setItem(this.DRAFT_KEY, JSON.stringify(draft));
      console.log('Draft saved at:', draft.savedAt, 'Deliveries:', draft.deliveries.length);
      
      this.initialFormState = this.getFormState();
      this.initialDeliveriesState = this.getDeliveriesState();
      this.initialTrajectState = this.getTrajectState();
      
    } catch (error) {
      console.error('Error saving draft:', error);
      this.saveMinimalDraft();
    }
  }

  public resetInitialState(): void {
    this.captureInitialState();
  }

  private saveMinimalDraft(): void {
    try {
      const minimalDraft = {
        formData: this.tripForm.value,
        deliveries: this.deliveryControls.map(group => group.value),
        savedAt: new Date().toISOString()
      };
      
      localStorage.setItem(this.DRAFT_KEY, JSON.stringify(minimalDraft));
    } catch (e) {
      console.error('Erreur sauvegarde minimal:', e);
    }
  }
  
  private loadDraft(): any {
    try {
      const saved = localStorage.getItem(this.DRAFT_KEY);
      if (!saved) return null;
      
      const draft = JSON.parse(saved);
      
      if (draft.savedAt) {
        const savedDate = new Date(draft.savedAt);
        const now = new Date();
        const diffHours = (now.getTime() - savedDate.getTime()) / (1000 * 60 * 60);
        
        if (diffHours > 24) {
          console.log('Draft trop vieux, effacé');
          this.clearDraft();
          return null;
        }
      }
      
      return draft;
    } catch (error) {
      console.error('Erreur chargement draft:', error);
      this.clearDraft();
      return null;
    }
  }
  
  clearDraft(): void {
    localStorage.removeItem(this.DRAFT_KEY);
    console.log('Draft effacé');
  }
  
  hasDraft(): boolean {
    return !!localStorage.getItem(this.DRAFT_KEY);
  }
  
  clearDraftManually(): void {
    if (confirm('Êtes-vous sûr de vouloir effacer le brouillon ?')) {
      this.clearDraft();
      this.snackBar.open('Brouillon effacé', 'Fermer', { duration: 2000 });
    }
  }
  
  saveDraftManually(): void {
    this.saveDraft();
    this.snackBar.open('💾 Brouillon sauvegardé', 'Fermer', { duration: 2000 });
  }

  getGroupedDeliveries(): {customerId: number, orders: any[], deliveryGroup: FormGroup, totalWeight: number}[] {
    const groups = new Map<number, {customerId: number, orders: any[], deliveryGroup: FormGroup, totalWeight: number}>();
    
    this.deliveryControls.forEach((deliveryGroup, index) => {
      const customerId = deliveryGroup.get('customerId')?.value;
      const orderId = deliveryGroup.get('orderId')?.value;
      
      if (customerId && orderId) {
        const order = this.allOrders.find(o => o.id === orderId);
        const orderWeight = order?.weight || 0;
        
        if (!groups.has(customerId)) {
          groups.set(customerId, {
            customerId,
            orders: [],
            deliveryGroup: deliveryGroup,
            totalWeight: 0
          });
        }
        
        const group = groups.get(customerId)!;
        group.orders.push({
          id: orderId,
          reference: order?.reference || 'N/A',
          weight: orderWeight,
          type: order?.type || '',
          deliveryIndex: index 
        });
        
        group.totalWeight += orderWeight;
      }
    });
    
    return Array.from(groups.values());
  }

  showGroupDetails: boolean[] = [];
  useGroupedView = true;

  get groupedDeliveries(): any[] {
    console.log(this.getGroupedDeliveries());
    return this.getGroupedDeliveries();
  }

  toggleGroupDetails(index: number): void {
    if (!this.showGroupDetails[index]) {
      this.showGroupDetails[index] = true;
    } else {
      this.showGroupDetails[index] = false;
    }
    this.showGroupDetails = [...this.showGroupDetails];
  }

  removeCustomerDeliveries(customerId: number): void {
    const indicesToRemove: number[] = [];
    
    this.deliveryControls.forEach((deliveryGroup, index) => {
      if (deliveryGroup.get('customerId')?.value === customerId) {
        indicesToRemove.push(index);
      }
    });
    
    indicesToRemove.sort((a, b) => b - a).forEach(index => {
      this.removeDelivery(index);
    });
    
    this.snackBar.open(`Toutes les commandes du client ont été retirées`, 'Fermer', { duration: 3000 });
  }

  removeSingleOrder(deliveryIndex: number): void {
    console.log('Suppression de la livraison à l\'index:', deliveryIndex);
    if (deliveryIndex >= 0 && deliveryIndex < this.deliveries.length) {
      this.removeDelivery(deliveryIndex);
    }
  }

  private addSelectedOrdersToDeliveries(): void {
    const customer = this.selectedClient;
    if (!customer) return;

    let sequence = this.deliveries.length + 1;

    const ordersByCustomer = new Map<number, number[]>();
    
    this.selectedOrders.forEach(orderId => {
      const order = this.allOrders.find(o => o.id === orderId);
      if (!order) return;
      
      if (!ordersByCustomer.has(order.customerId)) {
        ordersByCustomer.set(order.customerId, []);
      }
      ordersByCustomer.get(order.customerId)!.push(orderId);
    });

    ordersByCustomer.forEach((orderIds, customerId) => {
      const customer = this.customers.find(c => c.id === customerId);
      if (!customer) return;

      orderIds.forEach(orderId => {
        const newDelivery = {
          customerId: customerId,
          orderId: orderId,
          deliveryAddress: customer.adress || '',
          sequence: sequence++,
          notes: `Commande: ${this.getOrderReference(orderId)}`
        };

        this.addDelivery(newDelivery);
        
        this.ordersForQuickAdd = this.ordersForQuickAdd.filter(o => o.id !== orderId);
        this.filteredOrders = this.filteredOrders.filter(o => o.id !== orderId);
      });
    });

    this.applyClientSearchFilter();
    this.applySearchFilter();
    this.showCapacitySummaryAfterAddition(this.calculateSelectedWeight());
    this.snackBar.open(
      `${this.selectedOrdersCount} commande(s) ajoutée(s) au voyage`,
      'Fermer',
      { duration: 3000 }
    );
  }

  private loadAllCustomers(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('🔄 Loading ALL customers...');
      
      this.http.getAllCustomers().subscribe({
        next: (customers) => {
          this.allCustomers = customers;
          console.log(`✅ Loaded ${customers.length} ALL customers`);
          console.log('Customer ID 3 in allCustomers:', this.allCustomers.find(c => c.id === 3));
          resolve();
        },
        error: (error) => {
          console.error('❌ Error loading all customers:', error);
          reject(error);
        }
      });
    });
  }

  getGroupDeliveryIndices(customerId: number): number[] {
    const indices: number[] = [];
    
    this.deliveryControls.forEach((deliveryGroup, index) => {
      if (deliveryGroup.get('customerId')?.value === customerId) {
        indices.push(index);
      }
    });
    
    return indices;
  }

  toggleGroupExpanded(customerId: number): void {
    if (this.expandedGroups.has(customerId)) {
      this.expandedGroups.delete(customerId);
    } else {
      this.expandedGroups.add(customerId);
    }
  }

  isGroupExpanded(customerId: number): boolean {
    return this.expandedGroups.has(customerId);
  }

  calculateClientCapacityPercentage(customerId: number): number {
    const truckId = this.tripForm.get('truckId')?.value;
    if (!truckId) return 0;
    
    const truck = this.trucks.find(t => t.id === truckId);
    if (!truck?.typeTruck?.capacity) return 0;
    
    const clientWeight = this.getGroupedDeliveries()
      .find(g => g.customerId === customerId)
      ?.totalWeight || 0;
    
    return (clientWeight / truck.typeTruck?.capacity) * 100;
  }

  calculateOrderPercentage(orderWeight: number): number {
    const truckId = this.tripForm.get('truckId')?.value;
    if (!truckId) return 0;
    
    const truck = this.trucks.find(t => t.id === truckId);
    if (!truck?.typeTruck?.capacity) return 0;
    
    return (orderWeight / truck.typeTruck?.capacity) * 100;
  }

  dropGroup(event: CdkDragDrop<string[]>): void {
    const customerId = event.item.data;
    if (!customerId) return;
    
    const groupIndices = this.getGroupDeliveryIndices(customerId);
    if (groupIndices.length === 0) return;
    
    const firstIndex = groupIndices[0];
    
    console.log('Déplacement du groupe client:', customerId, 'depuis', firstIndex);
    
    this.updateDeliverySequences();
  }

  trackByGroupId(index: number, group: any): number {
    return group.customerId;
  }

  onDeliveriesScroll(index: number): void {
    console.log('Deliveries scroll to index:', index);
  }

  onCapacityScroll(index: number): void {
    console.log('Capacity scroll to index:', index);
  }

  onTimelineScroll(index: number): void {
    console.log('Timeline scroll to index:', index);
  }

  scrollDeliveriesToTop(): void {
    if (this.deliveriesViewport) {
      this.deliveriesViewport.scrollToIndex(0, 'smooth');
    }
  }

  scrollDeliveriesToBottom(): void {
    if (this.deliveriesViewport) {
      const lastIndex = this.getGroupedDeliveries().length - 1;
      this.deliveriesViewport.scrollToIndex(lastIndex, 'smooth');
    }
  }

  scrollCapacityToTop(): void {
    if (this.capacityViewport) {
      this.capacityViewport.scrollToIndex(0, 'smooth');
    }
  }

  scrollCapacityToBottom(): void {
    if (this.capacityViewport) {
      const lastIndex = this.getGroupedDeliveries().length - 1;
      this.capacityViewport.scrollToIndex(lastIndex, 'smooth');
    }
  }

  scrollTimelineToTop(): void {
    if (this.timelineViewport) {
      this.timelineViewport.scrollToIndex(0, 'smooth');
    }
  }

  scrollTimelineToBottom(): void {
    if (this.timelineViewport) {
      const lastIndex = this.getGroupedDeliveries().length + 1;
      this.timelineViewport.scrollToIndex(lastIndex, 'smooth');
    }
  }

  scrollTimelineUp(): void {
    if (this.timelineViewport) {
      const currentOffset = this.timelineViewport.measureScrollOffset();
      this.timelineViewport.scrollToOffset(currentOffset - 200, 'smooth');
    }
  }

  scrollTimelineDown(): void {
    if (this.timelineViewport) {
      const currentOffset = this.timelineViewport.measureScrollOffset();
      this.timelineViewport.scrollToOffset(currentOffset + 200, 'smooth');
    }
  }

  getVisibleDeliveryRange(): string {
    if (!this.deliveriesViewport || this.getGroupedDeliveries().length === 0) return '';
    
    const renderedRange = this.deliveriesViewport.getRenderedRange();
    const total = this.getGroupedDeliveries().length;
    
    const start = renderedRange.start + 1;
    const end = Math.min(renderedRange.end, total);
    
    return `${start}-${end} sur ${total}`;
  }

  getVisibleCapacityRange(): string {
    if (!this.capacityViewport || this.getGroupedDeliveries().length === 0) return '';
    
    const renderedRange = this.capacityViewport.getRenderedRange();
    const total = this.getGroupedDeliveries().length;
    
    const start = renderedRange.start + 1;
    const end = Math.min(renderedRange.end, total);
    
    return `Clients ${start}-${end} sur ${total}`;
  }

  getVisibleTimelineRange(): string {
    if (!this.timelineViewport || this.getGroupedDeliveries().length === 0) return '';
    
    const renderedRange = this.timelineViewport.getRenderedRange();
    const total = this.getGroupedDeliveries().length + 2; 
    
    const start = Math.max(1, renderedRange.start);
    const end = Math.min(renderedRange.end, total);
    
    return `Étapes ${start}-${end} sur ${total}`;
  }

  getTimelineScrollProgress(): number {
    if (!this.timelineViewport || this.getGroupedDeliveries().length === 0) return 0;
    
    const scrollOffset = this.timelineViewport.measureScrollOffset();
    const viewportSize = this.timelineViewport.getViewportSize();
    const contentSize = (this.getGroupedDeliveries().length + 2) * 150;
    
    const maxScroll = Math.max(0, contentSize - viewportSize);
    if (maxScroll === 0) return 100;
    
    const progress = (scrollOffset / maxScroll) * 100;
    return Math.min(100, Math.max(0, Math.round(progress)));
  }

  scrollToDeliveryGroup(groupIndex: number): void {
    if (this.timelineViewport) {
      this.timelineViewport.scrollToIndex(groupIndex + 1, 'smooth');
    }
  }

  calculateGroupDeliveryTime(groupIndex: number): string {
    const startHour = 8;
    const intervalMinutes = 60; 
    
    const totalMinutes = startHour * 60 + (groupIndex * intervalMinutes);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  calculateGroupTotalWeight(customerId: number): number {
    const group = this.getGroupedDeliveries().find(g => g.customerId === customerId);
    if (!group) return 0;
    
    return group.orders.reduce((total, order) => total + (order.weight || 0), 0);
  }

  calculateOrderCapacityPercentage(orderWeight: number): number {
    const truckId = this.tripForm.get('truckId')?.value;
    if (!truckId) return 0;
    
    const truck = this.trucks.find(t => t.id === truckId);
    if (!truck?.typeTruck?.capacity) return 0;
    
    return (orderWeight / truck.typeTruck?.capacity) * 100;
  }

  calculateGroupCapacityPercentage(customerId: number): number {
    const groupWeight = this.calculateGroupTotalWeight(customerId);
    const truckId = this.tripForm.get('truckId')?.value;
    
    if (!truckId || groupWeight === 0) return 0;
    
    const truck = this.trucks.find(t => t.id === truckId);
    if (!truck?.typeTruck?.capacity) return 0;
    
    return (groupWeight / truck.typeTruck?.capacity) * 100;
  }

  getCapacityLevelClass(percentage: number): string {
    if (percentage >= 100) return 'level-critical';
    if (percentage >= 90) return 'level-warning';
    if (percentage >= 70) return 'level-high';
    return 'level-normal';
  }

  getCapacityDistributionSummary(): string {
    if (this.getGroupedDeliveries().length === 0) return 'Aucune charge';
    
    const totalWeight = this.calculateTotalWeight();
    const avgPerClient = totalWeight / this.getGroupedDeliveries().length;
    
    return `${avgPerClient.toFixed(1)} palette/client en moyenne`;
  }

  getGroupMarkerStyle(group: any): any {
    const customerId = group.customerId;
    const hasOrders = group.orders.length > 0;
    
    if (hasOrders) {
      return {
        'background': 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        'border': '3px solid white',
        'box-shadow': '0 4px 12px rgba(59, 130, 246, 0.3)'
      };
    } else {
      return {
        'background': 'linear-gradient(135deg, #94a3b8, #64748b)',
        'border': '3px solid white',
        'box-shadow': '0 4px 12px rgba(148, 163, 184, 0.3)'
      };
    }
  }

  getSelectedTruck(): ITruck | undefined {
    const truckId = this.tripForm.get('truckId')?.value;
    return truckId ? this.trucks.find(t => t.id === truckId) : undefined;
  }

  getProgressBarColorForPercentage(percentage: number): string {
    if (percentage >= 100) {
      return '#ef4444';  
    } else if (percentage >= 90) {
      return '#f59e0b';
    } else if (percentage >= 70) {
      return '#3b82f6'; 
    } else {
      return '#10b981'; 
    }
  }

  getSelectedTruckDisplay(): string {
    const truckId = this.tripForm.get('truckId')?.value;
    if (!truckId) return '';
    
    const availableTruck = this.availableTrucks.find(t => t.id === truckId);
    if (availableTruck) {
      return `${availableTruck.immatriculation} - ${this.getMarqueName(availableTruck.marqueTruckId)}`;
    }
    
    const unavailableTruck = this.unavailableTrucks.find(t => t.id === truckId);
    if (unavailableTruck) {
      return `${unavailableTruck.immatriculation} - ${this.getMarqueName(unavailableTruck.marqueTruckId)}`;
    }
    
    return '';
  }

  toggleTrajectOrderSelection(customerId: number, orderId: number): void {
    const selectedOrders = this.selectedTrajectOrders.get(customerId) || [];
    
    if (selectedOrders.includes(orderId)) {
      const index = selectedOrders.indexOf(orderId);
      selectedOrders.splice(index, 1);
    } else {
      selectedOrders.push(orderId);
    }
    
    if (selectedOrders.length === 0) {
      this.selectedTrajectOrders.delete(customerId);
    } else {
      this.selectedTrajectOrders.set(customerId, selectedOrders);
    }
  }

  isTrajectOrderSelected(customerId: number, orderId: number): boolean {
    const selectedOrders = this.selectedTrajectOrders.get(customerId) || [];
    return selectedOrders.includes(orderId);
  }

  selectAllOrdersForTrajectCustomer(customerId: number): void {
    const customerOrders = this.getClientPendingOrders(customerId);
    const orderIds = customerOrders.map(order => order.id);
    
    if (orderIds.length > 0) {
      this.selectedTrajectOrders.set(customerId, orderIds);
    }
  }

  deselectAllOrdersForTrajectCustomer(customerId: number): void {
    this.selectedTrajectOrders.delete(customerId);
  }

  getSelectedOrdersForTrajectCustomer(customerId: number): number[] {
    return this.selectedTrajectOrders.get(customerId) || [];
  }

  getSelectedOrdersWeightForTrajectCustomer(customerId: number): number {
    const selectedOrderIds = this.selectedTrajectOrders.get(customerId) || [];
    return selectedOrderIds.reduce((total, orderId) => {
      const order = this.allOrders.find(o => o.id === orderId);
      return total + (order?.weight || 0);
    }, 0);
  }

  getSelectedTrajectOrdersCount(): number {
    let total = 0;
    this.selectedTrajectOrders.forEach(orderIds => {
      total += orderIds.length;
    });
    return total;
  }

  getTotalSelectedTrajectOrdersWeight(): number {
    let totalWeight = 0;
    
    this.selectedTrajectOrders.forEach((orderIds, customerId) => {
      orderIds.forEach(orderId => {
        const order = this.allOrders.find(o => o.id === orderId);
        if (order) {
          totalWeight += order.weight;
        }
      });
    });
    
    return totalWeight;
  }

  deselectAllTrajectOrders(): void {
    this.selectedTrajectOrders.clear();
  }
  
  async addSelectedTrajectOrders(): Promise<void> {
    if (this.selectedTrajectOrders.size === 0) {
      this.snackBar.open('Aucune commande sélectionnée', 'Fermer', { duration: 3000 });
      return;
    }

    const totalWeight = this.getTotalSelectedTrajectOrdersWeight();
    if (!await this.checkCapacityBeforeAddingOrders(totalWeight)) {
      return;
    }

    let sequence = this.deliveries.length + 1;
    let addedCount = 0;

    this.trajectCustomers.forEach(customer => {
      const selectedOrderIds = this.selectedTrajectOrders.get(customer.id) || [];
      
      selectedOrderIds.forEach(orderId => {
        const order = this.allOrders.find(o => o.id === orderId);
        if (!order) return;

        const newDelivery = {
          customerId: customer.id,
          orderId: orderId,
          deliveryAddress: customer.adress || '',
          sequence: sequence++,
          notes: `Traject: ${this.selectedTraject?.name} - ${order.reference}`
        };

        this.addDelivery(newDelivery);
        addedCount++;
      });
    });

    this.showCapacitySummaryAfterAddition(totalWeight);
    
    Swal.fire({
      icon: 'success',
      title: 'Commandes ajoutées',
      html: `
        <div style="text-align: left;">
          <p><strong>${addedCount}</strong> commande(s) ajoutée(s) au voyage</p>
          <p>Traject: <strong>${this.selectedTraject?.name}</strong></p>
          <p>Clients: <strong>${this.selectedTrajectOrders.size}</strong></p>
        </div>
      `,
      confirmButtonText: 'OK'
    });

    this.showTrajectOrderSelection = false;
    this.showDeliveriesSection = true;

    this.selectedTrajectOrders.forEach((orderIds, customerId) => {
      orderIds.forEach(orderId => {
        this.ordersForQuickAdd = this.ordersForQuickAdd.filter(o => o.id !== orderId);
      });
    });

    this.selectedTrajectOrders.clear();
  }

  getVisibleLeftRange(): string {
    if (!this.leftViewport) return '';
    
    const viewport = this.leftViewport;
    const startIndex = Math.floor(
      (this.leftViewport?.getOffsetToRenderedContentStart() ?? 0) / this.leftItemSize
    );

    const endIndex = Math.min(startIndex + Math.ceil(viewport.getViewportSize() / this.leftItemSize), this.leftSectionItems.length);
    
    return `Éléments ${startIndex + 1}-${endIndex} sur ${this.leftSectionItems.length}`;
  }

  getVisibleRightRange(): string {
    if (!this.rightViewport) return '';
    
    const viewport = this.rightViewport;
    const startIndex = Math.floor(
      (this.rightViewport?.getOffsetToRenderedContentStart() ?? 0) / this.rightItemSize
    );

    const endIndex = Math.min(startIndex + Math.ceil(viewport.getViewportSize() / this.rightItemSize), this.rightSectionItems.length);
    
    return `Éléments ${startIndex + 1}-${endIndex} sur ${this.rightSectionItems.length}`;
  }

  scrollLeftToTop(): void {
    if (this.leftViewport) {
      this.leftViewport.scrollToIndex(0);
    }
  }

  scrollLeftToBottom(): void {
    if (this.leftViewport) {
      this.leftViewport.scrollToIndex(this.leftSectionItems.length - 1);
    }
  }

  scrollRightToTop(): void {
    if (this.rightViewport) {
      this.rightViewport.scrollToIndex(0);
    }
  }

  scrollRightToBottom(): void {
    if (this.rightViewport) {
      this.rightViewport.scrollToIndex(this.rightSectionItems.length - 1);
    }
  }

  initializeSections(): void {
    this.leftSectionItems = this.createLeftSectionItems();
    this.rightSectionItems = this.createRightSectionItems();
  }

  private createLeftSectionItems(): any[] {
    const sections = [];
    
    if (this.trajectMode === 'new') {
      sections.push({ type: 'location' });
    }
    
    sections.push(
      { type: 'date' },
      { type: 'truck-driver' },
      { type: 'distance-duration' }
    );
    
    if (this.driverAvailabilityResult && !this.checkingDriverAvailability) {
      sections.push({ type: 'driver-availability' });
    }
    
    sections.push({ type: 'status-convoyeur' });
    
    if (!this.tripId) {
      sections.push({ type: 'traject' });
    }
    
    if (this.showTrajectOrderSelection && this.selectedTraject) {
      sections.push({ type: 'traject-order' });
    }
    
    if (this.trajectMode === 'new') {
      sections.push({ type: 'quick-add' });
    }
    
    if (this.trajectMode !== null && (!this.showDeliveriesSection || this.deliveries.length === 0)) {
      sections.push({ type: 'add-delivery-button' });
    }
    
    if (this.showDeliveriesSection) {
      sections.push({ type: 'deliveries' });
    }
    
    if (this.selectedTraject) {
      sections.push({ type: 'traject-preview' });
    }
    
    if (this.tripForm.get('tripStatus')?.value === 'Cancelled') {
      sections.push({ type: 'cancelled-info' });
    }
    
    return sections;
  }

  private createRightSectionItems(): any[] {
    const sections = [];
    
    if (this.shouldShowWeather()) {
      sections.push({ type: 'weather' });
    }
    
    if (!this.shouldShowWeather() && this.shouldShowWeatherPrompt()) {
      sections.push({ type: 'weather-prompt' });
    }
    
    if (this.tripId) {
      sections.push({ type: 'status-workflow' });
    }
    
    if (this.tripForm.get('truckId')?.value) {
      sections.push({ type: 'capacity' });
    }
    
    if (this.shouldShowTimelineSummary()) {
      sections.push({ type: 'timeline-summary' });
    }
    
    return sections;
  }

  showDateErrors(): boolean | undefined {
    const startInvalid = this.estimatedStartDateControl?.invalid && 
                        (this.estimatedStartDateControl?.dirty || this.estimatedStartDateControl?.touched);
    
    const endInvalid = this.estimatedEndDateControl?.invalid && 
                      (this.estimatedEndDateControl?.dirty || this.estimatedEndDateControl?.touched);
    
    return startInvalid || endInvalid;
  }

  private checkForDraftToRestore(): void {
    try {
      const draftToRestore = localStorage.getItem('trip_draft_to_restore');
      
      if (draftToRestore) {
        const draft = JSON.parse(draftToRestore);
        
        this.showDraftRestoreConfirmation(draft);
      }
    } catch (error) {
      console.error('Error checking for draft to restore:', error);
      localStorage.removeItem('trip_draft_to_restore');
    }
  }

  private showDraftRestoreConfirmation(draft: any): void {
    const deliveryCount = draft.deliveries?.length || 0;
    const dateStr = draft.formData?.estimatedStartDate ? 
      new Date(draft.formData.estimatedStartDate).toLocaleDateString() : 'Date non définie';
    
    Swal.fire({
      title: 'Restaurer le brouillon ?',
      html: `
        <div style="text-align: left; padding: 10px;">
          <p>Un brouillon précédent a été détecté avec :</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
            <p>📦 <strong>${deliveryCount}</strong> livraison(s)</p>
            <p>📅 <strong>${dateStr}</strong></p>
          </div>
          <p>Voulez-vous restaurer ce brouillon ?</p>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Oui, restaurer',
      cancelButtonText: 'Non, commencer à nouveau',
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      backdrop: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.restoreDraftFromStorage(draft);
      } else {
        localStorage.removeItem('trip_draft_to_restore');
      }
    });
  }

  private restoreDraftFromStorage(draft: any): void {
    try {
      if (draft.formData) {
        const formData = { ...draft.formData };
        
        if (formData.estimatedStartDate && typeof formData.estimatedStartDate === 'string') {
          formData.estimatedStartDate = new Date(formData.estimatedStartDate);
        }
        
        if (formData.estimatedEndDate && typeof formData.estimatedEndDate === 'string') {
          formData.estimatedEndDate = new Date(formData.estimatedEndDate);
        }
        
        this.tripForm.patchValue(formData, { emitEvent: false });
      }
      
      if (draft.deliveries && draft.deliveries.length > 0) {
        this.deliveries.clear();
        
        draft.deliveries.forEach((delivery: any, index: number) => {
          const sequence = delivery.sequence || index + 1;
          
          const deliveryGroup = this.fb.group({
            customerId: [delivery.customerId || '', Validators.required],
            orderId: [delivery.orderId || '', Validators.required],
            deliveryAddress: [delivery.deliveryAddress || '', [Validators.required, Validators.maxLength(500)]],
            sequence: [sequence, [Validators.required, Validators.min(1)]],
            plannedTime: [delivery.plannedTime || ''],
            notes: [delivery.notes || '']
          });
          
          this.deliveries.push(deliveryGroup);
        });
        
        this.showDeliveriesSection = true;
      }
      
      if (draft.selectedTraject) {
        this.selectedTraject = draft.selectedTraject;
        if (draft.selectedTraject.id) {
          this.selectedTrajectControl.setValue(draft.selectedTraject.id);
        }
      }
      
      if (draft.trajectMode) {
        this.trajectMode = draft.trajectMode;
      }
      
      if (draft.selectedClient) {
        this.selectedClient = draft.selectedClient;
      }
      
      if (draft.selectedOrders) {
        this.selectedOrders = draft.selectedOrders;
      }
      
      if (draft.currentQuickAddStep) {
        this.currentQuickAddStep = draft.currentQuickAddStep;
      }
      
      if (draft.clientSearch) {
        this.clientSearchControl.setValue(draft.clientSearch);
      }
      
      if (draft.zoneFilter) {
        this.zoneFilterControl.setValue(draft.zoneFilter);
      }
      
      if (draft.saveAsPredefined !== undefined) {
        this.saveAsPredefined = draft.saveAsPredefined;
      }
      
      if (draft.trajectName) {
        this.trajectName = draft.trajectName;
      }
      
      localStorage.removeItem('trip_draft_to_restore');
      
      this.snackBar.open('✅ Brouillon restauré avec succès', 'Fermer', { 
        duration: 3000,
        panelClass: ['success-snackbar']
      });
      
      this.refreshWeatherForRestoredDraft();
      
      this.refreshResourcesForRestoredDraft(draft);
      
    } catch (error) {
      console.error('Error restoring draft from storage:', error);
      localStorage.removeItem('trip_draft_to_restore');
      this.snackBar.open('❌ Erreur lors de la restauration du brouillon', 'Fermer', { duration: 3000 });
    }
  }

  private refreshWeatherForRestoredDraft(): void {
    const startLocationId = this.tripForm.get('startLocationId')?.value;
    const endLocationId = this.tripForm.get('endLocationId')?.value;
    const startDate = this.tripForm.get('estimatedStartDate')?.value;
    
    if (!startLocationId || !endLocationId) {
      console.log('No locations selected, skipping weather refresh');
      return;
    }
    
    this.startLocationWeather = null;
    this.endLocationWeather = null;
    this.weatherLoading = true;
    
    this.snackBar.open('🔄 Mise à jour de la météo...', 'Fermer', { 
      duration: 2000,
      panelClass: ['info-snackbar']
    });
    
    setTimeout(() => {
      this.fetchWeatherForBothLocations();
      
      if (startDate) {
        setTimeout(() => {
          this.fetchWeatherForecast();
        }, 1000);
      }
    }, 500);
  }

  private refreshResourcesForRestoredDraft(draft: any): void {
    const startDate = this.tripForm.get('estimatedStartDate')?.value;
    
    if (startDate) {
      setTimeout(() => {
        this.loadTrucks();
      }, 600);
    }
    
    if (startDate) {
      setTimeout(() => {
        this.loadAvailableDrivers(startDate);
      }, 800);
    }
    
    setTimeout(() => {
      if (this.tripForm.get('truckId')?.value) {
        this.tripForm.get('truckId')?.updateValueAndValidity();
      }
    }, 1000);
  }

  private captureInitialState(): void {
    this.initialFormState = this.getFormState();
    this.initialDeliveriesState = this.getDeliveriesState();
    this.initialTrajectState = this.getTrajectState();
  }

  private getFormState(): any {
    return this.tripForm ? this.tripForm.getRawValue() : null;
  }

  private getDeliveriesState(): any {
    return this.deliveryControls.map(group => group.value);
  }

  private getTrajectState(): any {
    return {
      selectedTraject: this.selectedTraject ? { ...this.selectedTraject } : null,
      trajectMode: this.trajectMode,
      saveAsPredefined: this.saveAsPredefined,
      trajectName: this.trajectName
    };
  }

  private shouldSaveDraft(): boolean {
    if (this.tripId || this.tripId) return false;
    
    if (!this.tripForm || this.tripForm.pristine && this.deliveries.length === 0) {
      return false;
    }
    
    const currentFormState = this.getFormState();
    const currentDeliveriesState = this.getDeliveriesState();
    const currentTrajectState = this.getTrajectState();
    
    const formChanged = JSON.stringify(this.initialFormState) !== JSON.stringify(currentFormState);
    const deliveriesChanged = JSON.stringify(this.initialDeliveriesState) !== JSON.stringify(currentDeliveriesState);
    const trajectChanged = JSON.stringify(this.initialTrajectState) !== JSON.stringify(currentTrajectState);
    
    const hasFormData = Object.values(currentFormState || {}).some(
      val => val !== null && val !== '' && val !== undefined
    );
    const hasDeliveries = (currentDeliveriesState?.length || 0) > 0;
    
    const hasChanged = formChanged || deliveriesChanged || trajectChanged;
    const hasData = hasFormData || hasDeliveries;
    
    return hasChanged && hasData;
  }

  patchValue(value: any, options?: any): void {
    this.tripForm.patchValue(value, options);
    
    this.initialFormState = this.getFormState();
  }

  clearDraftIfUnchanged(): void {
    if (!this.shouldSaveDraft()) {
      this.clearDraft();
      this.snackBar.open('Brouillon effacé (aucune modification)', 'Fermer', { duration: 2000 });
    }
  }

  /**
   * Génère un nom de traject par défaut basé sur les lieux de départ/arrivée
   */
  private generateDefaultTrajectName(): void {
    const startLocationName = this.getSelectedStartLocationInfo();
    const endLocationName = this.getSelectedEndLocationInfo();
    const today = new Date();
    const dateStr = this.datePipe.transform(today, 'dd/MM/yyyy') || '';
    
    if (startLocationName !== 'Non sélectionné' && 
        endLocationName !== 'Non sélectionné' &&
        startLocationName !== 'Lieu inconnu' && 
        endLocationName !== 'Lieu inconnu') {
      
      const cleanStart = startLocationName.replace(/\s*\(.*?\)\s*/g, '').trim();
      const cleanEnd = endLocationName.replace(/\s*\(.*?\)\s*/g, '').trim();
      
      this.trajectName = `${cleanStart} → ${cleanEnd} (${dateStr})`;
      
    } else if (this.deliveries.length > 0) {
      const firstClient = this.getClientName(this.deliveryControls[0]?.get('customerId')?.value);
      const lastClient = this.getClientName(this.deliveryControls[this.deliveries.length - 1]?.get('customerId')?.value);
      
      if (firstClient && lastClient) {
        this.trajectName = `${firstClient} → ${lastClient} (${dateStr})`;
      } else if (this.deliveries.length > 0) {
        this.trajectName = `Trajet avec ${this.deliveries.length} livraisons (${dateStr})`;
      }
    } else {
      this.trajectName = `Nouveau trajet ${dateStr}`;
    }
  }

  getCapacityUnitLabel(unit?: string): string {
    const unitToUse = this.loadingUnit;
    
    switch(unitToUse?.toLowerCase()) {
      case 'tonnes':
      case 'tonne':
        return 'tonne';
      case 'palettes':
      case 'palette':
        return 'palette';
      case 'cartons':
      case 'carton':
        return 'carton';
      case 'kg':
        return 'kg';
      case 'bouteilles':
        return 'bouteille';
      default:
        return this.loadingUnit || 'palette';
    }
  }

  getSelectedTruckCapacityDisplay(): string {
    const truckId = this.tripForm.get('truckId')?.value;
    if (!truckId) return '0';
    
    const truck = this.trucks.find(t => t.id === truckId);
    if (!truck) return '0';
    
    const unit = this.loadingUnit;
    return `${truck.typeTruck?.capacity} ${this.loadingUnit}`;
  }

  getTotalWeightDisplay(): string {
    const total = this.calculateTotalWeight();
    const unit = this.loadingUnit;
    
    return `${total.toFixed(2)} ${unit}`;
  }

  getLoadingUnitImage(): string {
    switch (this.loadingUnit?.toLowerCase()) {
      case 'palettes':
        return '/palette.jpg';
      case 'cartons':
        return '/carton.webp';
      case 'tonnes':
        return '/tonne.png';
      case 'kg':
        return '/kg.png';
      case 'bouteilles':
        return '/b.png';
      default:
        return '/palette.jpg';
    }
  }
private loadTripSettings(): void {
  this.settingsService.getTripSettings().subscribe({
    next: (settings) => {
      this.tripSettings = settings;
      this.updateTruckFieldBasedOnSettings();
    },
    error: (error) => {
      console.error('Erreur chargement paramètres:', error);
    }
  });
}

private listenToSettingsChanges(): void {
  this.settingsSubscription = this.settingsService.tripSettings$.subscribe({
    next: (updatedSettings) => {
      if (updatedSettings) {
        console.log('🔄 Paramètres mis à jour:', updatedSettings);
        this.tripSettings = updatedSettings;
        this.updateTruckFieldBasedOnSettings();
      }
    }
  });
}

  private updateTruckFieldBasedOnSettings(): void {
    const truckControl = this.tripForm.get('truckId');
    
    if (!truckControl) return;
    
    if (this.tripSettings?.linkDriverToTruck === false) {
      truckControl.clearValidators();
      truckControl.setErrors(null);
      console.log('🚛 Champ camion rendu optionnel (paramètre désactivé)');
    } else {
      truckControl.setValidators([Validators.required]);
      console.log('🚛 Champ camion requis (par défaut)');
    }
    
    truckControl.updateValueAndValidity();
  }

  private autoSelectTruckForDriver(driverId: number | null): void {
    if (!driverId) return;
    
    const truckId = this.driverTruckMap.get(driverId);
    
    if (!truckId) {
      console.log(`ℹ️ Aucun camion associé au chauffeur ${driverId}`);
      return;
    }
    
    console.log(`🔄 Sélection auto du camion ${truckId} pour le chauffeur ${driverId}`);
    
    this.tripForm.get('truckId')?.setValue(truckId, { emitEvent: false });
    
    const truck = this.trucks.find(t => t.id === truckId);
    if (truck) {
      this.snackBar.open(
        `🚛 Camion ${truck.immatriculation} sélectionné automatiquement`,
        'Fermer',
        { duration: 2000 }
      );
    }
  }

  getTruckImmatriculation(truckId: number | undefined): string {
    if (!truckId) return '';
    const truck = this.trucks.find(t => t.id === truckId);
    return truck ? truck.immatriculation : '';
  }

  marqueMap: Map<number, string> = new Map();
private loadMarques(): void {
  this.http.getMarqueTrucks().subscribe({
    next: (response) => {
      // Handle different response formats
      let marquesData: any[] = [];
      
      if (response && typeof response === 'object') {
        // Check if response has a data property (ApiResponse wrapper)
        if ('data' in response && Array.isArray((response as any).data)) {
          marquesData = (response as any).data;
        } 
        // Check if response is directly an array
        else if (Array.isArray(response)) {
          marquesData = response;
        }
      }
      
      this.marqueMap.clear();
      marquesData.forEach(marque => {
        if (marque && marque.id && marque.name) {
          this.marqueMap.set(marque.id, marque.name);
        }
      });
      
      console.log('✅ Marques loaded:', this.marqueMap.size, 'marques');
    },
    error: (error) => {
      console.error('Error loading marques:', error);
    }
  });
}

// Add this method to get marque name
getMarqueName(marqueId?: number): string {
  console.log(marqueId)
  if (!marqueId) return 'N/A';
  return this.marqueMap.get(marqueId) || 'N/A';
}
// ========== WEATHER METHODS ==========

/**
 * Fetch weather for start location using location ID
 */
private fetchWeatherForStartLocation(): void {
  const locationId = this.tripForm.get('startLocationId')?.value;
  if (!locationId) {
    console.log('No start location selected, clearing weather');
    this.startLocationWeather = null;
    return;
  }
  
  this.weatherLoading = true;
  
  this.http.getWeatherByLocation(locationId).subscribe({
    next: (weather) => {
      console.log('Start location weather received:', weather);
      if (weather) {
        this.startLocationWeather = this.mapWeatherData(weather, this.getSelectedStartLocationInfo());
      } else {
        this.startLocationWeather = null;
      }
      this.weatherLoading = false;
    },
    error: (error) => {
      console.error('Error fetching weather for start location:', error);
      this.startLocationWeather = null;
      this.weatherLoading = false;
    }
  });
}

/**
 * Fetch weather for end location using location ID
 */
private fetchWeatherForEndLocation(): void {
  const locationId = this.tripForm.get('endLocationId')?.value;
  if (!locationId) {
    console.log('No end location selected, clearing weather');
    this.endLocationWeather = null;
    return;
  }
  
  this.http.getWeatherByLocation(locationId).subscribe({
    next: (weather) => {
      console.log('End location weather received:', weather);
      if (weather) {
        this.endLocationWeather = this.mapWeatherData(weather, this.getSelectedEndLocationInfo());
      } else {
        this.endLocationWeather = null;
      }
    },
    error: (error) => {
      console.error('Error fetching weather for end location:', error);
      this.endLocationWeather = null;
    }
  });
}

/**
 * Fetch weather for both locations in one call
 */
fetchWeatherForBothLocations(): void {
  const startLocationId = this.tripForm.get('startLocationId')?.value;
  const endLocationId = this.tripForm.get('endLocationId')?.value;
  
  console.log('Fetching weather for both locations:', { startLocationId, endLocationId });
  
  if (!startLocationId || !endLocationId) {
    console.log('Missing locations, cannot fetch both');
    return;
  }
  
  this.weatherLoading = true;
  this.startLocationWeather = null;
  this.endLocationWeather = null;
  
  this.http.getWeatherForTrip(startLocationId, endLocationId).subscribe({
    next: (result) => {
      console.log('Weather for both locations received:', result);
      
      if (result.start) {
        this.startLocationWeather = this.mapWeatherData(result.start, this.getSelectedStartLocationInfo());
      }
      
      if (result.end) {
        this.endLocationWeather = this.mapWeatherData(result.end, this.getSelectedEndLocationInfo());
      }
      
      this.weatherLoading = false;
    },
    error: (error) => {
      console.error('Error fetching weather for both locations:', error);
      this.weatherLoading = false;
      
      // Fallback to individual calls
      this.fetchWeatherForStartLocation();
      this.fetchWeatherForEndLocation();
    }
  });
}

/**
 * Fetch weather forecast for a location
 */
fetchWeatherForecast(): void {
  const startLocationId = this.tripForm.get('startLocationId')?.value;
  const endLocationId = this.tripForm.get('endLocationId')?.value;
  
  if (!startLocationId || !endLocationId) return;
  
  this.startLocationForecast = [];
  this.endLocationForecast = [];
  
  // Fetch forecasts for both locations
  forkJoin({
    startForecast: this.http.getWeatherForecastByLocation(startLocationId).pipe(catchError(() => of([]))),
    endForecast: this.http.getWeatherForecastByLocation(endLocationId).pipe(catchError(() => of([])))
  }).subscribe({
    next: ({ startForecast, endForecast }) => {
      this.startLocationForecast = Array.isArray(startForecast) ? startForecast : [];
      this.endLocationForecast = Array.isArray(endForecast) ? endForecast : [];
    },
    error: (error) => {
      console.error('Error fetching forecasts:', error);
    }
  });
}

/**
 * Map weather data from API to WeatherData interface
 */
private mapWeatherData(weather: any, locationInfo: string): WeatherData {
  // Handle OpenWeatherMap format (from coordinates/city endpoint)
  if (weather.main) {
    return {
      temperature: weather.main.temp,
      feels_like: weather.main.feels_like,
      humidity: weather.main.humidity,
      description: weather.weather?.[0]?.description || '',
      icon: weather.weather?.[0]?.icon 
        ? `https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`
        : '',
      wind_speed: weather.wind?.speed || 0,
      precipitation: weather.rain?.precipitation || weather.rain?.['1h'] || 0,
      location: locationInfo
    };
  } 
  // Handle custom API format (from your backend)
  else {
    return {
      temperature: weather.temperature || 0,
      feels_like: weather.feels_like || 0,
      humidity: weather.humidity || 0,
      description: weather.description || '',
      icon: weather.icon || '',
      wind_speed: weather.wind_speed || 0,
      precipitation: weather.precipitation || 0,
      location: locationInfo
    };
  }
}

/**
 * Refresh weather data
 */
refreshWeather(): void {
  this.weatherLoading = true;
  
  this.startLocationWeather = null;
  this.endLocationWeather = null;
  this.startLocationForecast = [];
  this.endLocationForecast = [];
  
  this.fetchWeatherForBothLocations();
  
  setTimeout(() => {
    this.fetchWeatherForecast();
  }, 500);
}

/**
 * Get weather warning message based on conditions
 */
getWeatherWarningMessage(): string {
  if (!this.startLocationWeather && !this.endLocationWeather) {
    return 'Données météo indisponibles';
  }
  
  const warnings = [];
  
  if (this.startLocationWeather) {
    if (this.startLocationWeather.temperature < 0) {
      warnings.push('gel au départ');
    }
    if (this.startLocationWeather.wind_speed > 50) {
      warnings.push('vent fort au départ');
    }
    if (this.startLocationWeather.precipitation && this.startLocationWeather.precipitation > 10) {
      warnings.push('fortes précipitations au départ');
    }
  }
  
  if (this.endLocationWeather) {
    if (this.endLocationWeather.temperature < 0) {
      warnings.push('gel à l\'arrivée');
    }
    if (this.endLocationWeather.wind_speed > 50) {
      warnings.push('vent fort à l\'arrivée');
    }
    if (this.endLocationWeather.precipitation && this.endLocationWeather.precipitation > 10) {
      warnings.push('fortes précipitations à l\'arrivée');
    }
  }
  
  if (warnings.length === 0) {
    return 'Conditions favorables pour le trajet';
  }
  
  return 'Conditions difficiles: ' + warnings.join(', ');
}

/**
 * Check if weather should be shown
 */
shouldShowWeather(): boolean {
  return !!(this.startLocationWeather || this.endLocationWeather) || this.weatherLoading;
}

/**
 * Check if weather warning should be shown
 */
shouldShowWeatherWarning(): boolean {
  if (!this.startLocationWeather && !this.endLocationWeather) {
    return false;
  }

  const weatherConditionsToCheck = [];
  if (this.startLocationWeather) weatherConditionsToCheck.push(this.startLocationWeather);
  if (this.endLocationWeather) weatherConditionsToCheck.push(this.endLocationWeather);

  const warningThresholds = {
    heavyRain: 10, 
    strongWind: 40, 
    extremeTemperature: { min: -10, max: 35 }, 
  };

  return weatherConditionsToCheck.some(weather => {
    if (weather.precipitation && weather.precipitation > warningThresholds.heavyRain) {
      return true;
    }

    if (weather.wind_speed > warningThresholds.strongWind) {
      return true;
    }

    if (
      weather.temperature < warningThresholds.extremeTemperature.min ||
      weather.temperature > warningThresholds.extremeTemperature.max
    ) {
      return true;
    }

    const severeKeywords = [
      'orage', 'thunderstorm',
      'tempête', 'storm',
      'forte pluie', 'heavy rain',
      'neige', 'snow',
      'grêle', 'hail',
      'brouillard', 'fog'
    ];
    
    const hasSevereCondition = severeKeywords.some(keyword => 
      weather.description.toLowerCase().includes(keyword.toLowerCase())
    );
    
    return hasSevereCondition;
  });
}

/**
 * Check if weather prompt should be shown
 */
shouldShowWeatherPrompt(): boolean {
  const hasLocations = this.tripForm.get('startLocationId')?.value || this.tripForm.get('endLocationId')?.value;
  const weatherNotLoaded = !this.startLocationWeather && !this.endLocationWeather && !this.weatherLoading;
  return hasLocations && weatherNotLoaded;
}
}