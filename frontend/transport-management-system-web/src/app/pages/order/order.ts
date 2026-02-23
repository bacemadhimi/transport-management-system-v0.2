import { Component, OnInit, inject, OnDestroy, ChangeDetectorRef, computed, Output, EventEmitter, Input, ViewChild, ElementRef, HostListener } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { MatButtonModule } from '@angular/material/button';

import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime, Subject, Subscription, takeUntil } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { IOrder, OrderStatus, UpdateOrderDto, getOrderStatusText } from '../../types/order';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CommonModule } from '@angular/common';
import { OrderFormComponent } from './order-form/order-form';
import { MatIconModule } from '@angular/material/icon';
import { Auth } from '../../services/auth'; 
import { SettingsService } from '../../services/settings.service'; 
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatNativeDateModule } from '@angular/material/core';
import { IZone } from '../../types/zone';
import { FrDateAdapter } from '../../types/fr-date-adapter';
import { MatSortModule } from '@angular/material/sort';
import { MatSort } from '@angular/material/sort';
import { Translation } from '../../services/Translation';
export const FR_DATE_FORMATS = {
  parse: { dateInput: 'DD/MM/YYYY' },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMM YYYY',
    dateA11yLabel: 'LL',
    monthYearA11yLabel: 'MMMM YYYY',
  }
};
@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [
     CommonModule,
    MatIconModule,
    MatButtonModule,
    MatPaginatorModule,
    MatIconModule,
    MatSortModule,
    MatSnackBarModule,
    MatTableModule,
    MatCheckboxModule,
    CommonModule,
    Table,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatDatepickerModule,    
    MatNativeDateModule ,    
    MatChipsModule   
  ],
   providers: [
    { provide: DateAdapter, useClass: FrDateAdapter },
    { provide: MAT_DATE_LOCALE, useValue: 'fr-FR' },
    { provide: MAT_DATE_FORMATS, useValue: FR_DATE_FORMATS }
  ],
  templateUrl: './order.html',
  styleUrls: ['./order.scss']
})
export class OrdersComponent implements OnInit, OnDestroy {
    @ViewChild(MatSort) sort!: MatSort;
    dataSource = new MatTableDataSource<IOrder>([]);
  ngAfterViewInit() {
  // Désactivé pour tri serveur
  this.dataSource.sort = this.sort;
  
  // Écoute le tri côté serveur
  this.sort.sortChange
    .pipe(takeUntil(this.destroy$))
    .subscribe(sort => {
      this.filter.sortField = sort.active;
      this.filter.sortDirection = sort.direction; // 'asc' | 'desc' | ''
      this.filter.pageIndex = 0; // retourne à la première page
      this.getLatestData();
    });
}


  activeFilter: string | null = null;
    @ViewChild('referenceFilter') referenceFilterDiv!: ElementRef;
 @ViewChild('customerNameFilter') customerNameFilterDiv!: ElementRef;
     @ViewChild('customerCityFilter') customerCityFilterDiv!: ElementRef;
   
    
  columnFilters: { [key: string]: string } = {
  reference: '',
  customerName: '',
   customerCity: '',
};
deliveryDateStartControl = new FormControl<Date | null>(null);
deliveryDateEndControl   = new FormControl<Date | null>(null);
lateControl = new FormControl<boolean | null>(null);


isSelectAllActive = false;
selectAllFiltered: boolean = false;  
allFilteredIds: number[] = [];    
allOrders: IOrder[] = []; // toutes les commandes récupérées côté client  
zones: IZone[] = [];
toggleFilter(column: string) {
  if (this.activeFilter === column) {
    this.activeFilter = null;
  } else {
    this.activeFilter = column;
    // Optionnel : mettre le focus sur le champ input après ouverture
    setTimeout(() => {
      const el: any = document.querySelector(`input[ngModel][ngModelChange]`);
      el?.focus();
    }, 0);
  }
}
// Nouvelle fonction pour gérer le blur
onFilterBlur(column: string) {
  // On ne ferme le filtre que si le champ est vide (ou selon ton besoin)
  if (!this.columnFilters[column]) {
    this.activeFilter = null;
  }
}
 @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (this.activeFilter === 'reference' && this.referenceFilterDiv) {
      const clickedInside = this.referenceFilterDiv.nativeElement.contains(event.target);
      if (!clickedInside) {
        this.activeFilter = null;
      }
    }

    if (this.activeFilter === 'customerName' && this.customerNameFilterDiv) {
      const clickedInside = this.customerNameFilterDiv.nativeElement.contains(event.target);
      if (!clickedInside) {
        this.activeFilter = null;
      }
    }

      if (this.activeFilter === 'customerCity' && this.customerCityFilterDiv) {
      const clickedInside = this.customerCityFilterDiv.nativeElement.contains(event.target);
      if (!clickedInside) {
        this.activeFilter = null;
      }
    }

  }
  displayedColumns: string[] = [
    'select',
    'reference',
    'client',
    'zone',           
    'customerCity',          
    'weight',
    'deliveryAddress',
    'status',
    'source',
    'deliveryDate',
    'action'
  ];

  
applyAllFilters() {
  this.filter.pageIndex = 0;

  this.filter.reference     = this.columnFilters['reference'] || null;
  this.filter.customerName  = this.columnFilters['customerName'] || null;
  this.filter.customerCity  = this.columnFilters['customerCity'] || null;


  this.getLatestData();
}


   OrderStatus = OrderStatus; 
   

zoneControl = new FormControl<number | null>(null);
  deliveryDateControl = new FormControl('');
  statusControl = new FormControl('');
sourceControl = new FormControl('');
  searchControl = new FormControl('');

allowEditOrder: boolean = false;
allowLoadLateOrders: boolean = false;
acceptOrdersWithoutAddress: boolean = false;
loadingUnit: string = 'palette';

private settingsSubscription: Subscription | null = null;

    constructor(public auth: Auth, private snackBar: MatSnackBar, private settingsService: SettingsService) {}  

     showSuccess() {
    this.snackBar.open('Succès', 'OK', { duration: 2000,  verticalPosition: 'top' });
     
  }
    @Output() rowClick = new EventEmitter<any>();
     @Input() showApproveButton: boolean = false;
     
getActions(row: any, actions: string | string[] | undefined): string[] {
  if (!actions) return [];
  return Array.isArray(actions) ? actions : [actions];
}


  
  private destroy$ = new Subject<void>();
  private cdr = inject(ChangeDetectorRef);
  
  httpService = inject(Http);
  pagedOrderData: PagedData<IOrder> = {
    data: [],
    totalData: 0
  };
  
  totalData: number = 0;

filter: any = {
  pageIndex: 0,
  pageSize: 10,
  search: null,
  status: null,
  sourceSystem: null,
  deliveryDateStart: null,
  deliveryDateEnd: null,
  zoneId: null,
    reference: null,
  customerName: null,
  customerCity: null,
    isLate: null,         
    sortField: null,       
  sortDirection: null   
};

  readonly dialog = inject(MatDialog);

get allOrdersCount(): number {
  return this.pagedOrderData?.totalData || 0;
}

get pendingOrdersCount(): number {
  if (!this.pagedOrderData?.data?.length) return 0;
  return this.pagedOrderData.data.filter(o => o.status === OrderStatus.Pending).length;
}

get readyToLoadOrdersCount(): number {
  if (!this.pagedOrderData?.data?.length) return 0;
  return this.pagedOrderData.data.filter(o => o.status === OrderStatus.ReadyToLoad).length;
}

get inProgressOrdersCount(): number {
  if (!this.pagedOrderData?.data?.length) return 0;
  return this.pagedOrderData.data.filter(o => o.status === OrderStatus.InProgress).length;
}

get receivedOrdersCount(): number {
  if (!this.pagedOrderData?.data?.length) return 0;
  return this.pagedOrderData.data.filter(o => o.status === OrderStatus.Received).length;
}

get closedOrdersCount(): number {
  if (!this.pagedOrderData?.data?.length) return 0;
  return this.pagedOrderData.data.filter(o => o.status === OrderStatus.Closed).length;
}

get cancelledOrdersCount(): number {
  if (!this.pagedOrderData?.data?.length) return 0;
  return this.pagedOrderData.data.filter(o => o.status === OrderStatus.Cancelled).length;
}
get currentPagePendingCount(): number {
  if (!this.pagedOrderData?.data?.length) return 0;
  return this.pagedOrderData.data.filter(o => o.status === OrderStatus.Pending).length;
}
  get totalPendingCount(): number {

    return this.currentPagePendingCount;
  }

  ngOnInit() {
 
    this.loadSettingsOnce();
    this.subscribeToSettings();
    this.initializeData();
  
      this.loadZones(); 
    this.searchControl.valueChanges
      .pipe(debounceTime(300), takeUntil(this.destroy$))
      .subscribe((value: string | null) => {
        this.filter.search = value || '';
        this.filter.pageIndex = 0;
        this.getLatestData();
      });

 this.statusControl.valueChanges
  .pipe(debounceTime(300), takeUntil(this.destroy$))
  .subscribe(value => {
    this.filter.status = value || null;
    this.filter.pageIndex = 0;
    this.getLatestData();
  });

  
this.sourceControl.valueChanges
  .pipe(debounceTime(300), takeUntil(this.destroy$))
  .subscribe(value => {
  this.filter.sourceSystem = value || null;
  this.filter.pageIndex = 0;
  this.getLatestData();
});


this.zoneControl.valueChanges
  .pipe(takeUntil(this.destroy$))
  .subscribe((zoneId: number | null) => {
    this.filter.zoneId = zoneId ?? null;
    this.filter.pageIndex = 0;
    this.getLatestData();
  });

this.lateControl.valueChanges
  .pipe(takeUntil(this.destroy$))
  .subscribe(value => {
    this.filter.isLate = value;
    this.filter.pageIndex = 0;
    this.getLatestData();
  });

this.deliveryDateStartControl.valueChanges
  .pipe(takeUntil(this.destroy$))
  .subscribe(date => {

    if (this.isDeliveryDateRangeInvalid()) {
      this.snackBar.open(
        "La date de début doit être inférieure à la date de fin",
        "OK",
        { duration: 3000 ,  verticalPosition: 'top'}
      );
      return;
    }

       this.filter.deliveryDateStart = date ? this.formatDateLocal(date) : null;
    this.filter.pageIndex = 0;
    this.getLatestData();
  });

this.deliveryDateEndControl.valueChanges
  .pipe(takeUntil(this.destroy$))
  .subscribe(date => {

    if (this.isDeliveryDateRangeInvalid()) {
      this.snackBar.open(
        "La date de fin doit être supérieure à la date de début",
        "OK",
        { duration: 3000,  verticalPosition: 'top' }
      );
      return;
    }

 this.filter.deliveryDateEnd = date ? this.formatDateLocal(date) : null;
    this.filter.pageIndex = 0;
    this.getLatestData();
  });
  }
private loadSettingsOnce(): void {
    this.settingsService.getOrderSettings().subscribe({
      next: (settings) => {
        this.loadingUnit = settings.loadingUnit;
        this.allowEditOrder = settings.allowEditOrder;
        this.allowLoadLateOrders = settings.allowLoadLateOrders;
        this.acceptOrdersWithoutAddress = settings.acceptOrdersWithoutAddress;
        
        console.log('Loading unit from settings:', this.loadingUnit);
      },
      error: (err) => {
        console.error('Error loading settings:', err);
        // Use defaults
        this.loadingUnit = 'palette';
      }
    });
  }

  // Subscribe to reactive changes (auto-updates when settings change)
  private subscribeToSettings(): void {
    this.settingsSubscription = this.settingsService.orderSettings$.subscribe(settings => {
      if (settings) {
        this.loadingUnit = settings.loadingUnit;
        this.allowEditOrder = settings.allowEditOrder;
        this.allowLoadLateOrders = settings.allowLoadLateOrders;
        this.acceptOrdersWithoutAddress = settings.acceptOrdersWithoutAddress;
        
        console.log('Loading unit updated:', this.loadingUnit);
      }
    });
  }
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
     if (this.settingsSubscription) {
      this.settingsSubscription.unsubscribe();
    }
  }

  initializeData() {
    this.getLatestData();
  }

getLatestData() {
  this.httpService.getOrdersList(this.filter).subscribe({
    next: (result: any) => {
      const dataArray = result?.data?.data || [];
      const totalCount = result?.data?.totalData || 0;

      this.pagedOrderData = { data: dataArray, totalData: totalCount };
      this.dataSource.data = dataArray;
          this.allOrders = dataArray; 


      if (this.isSelectAllActive) {
        this.fetchAllFilteredIds();
      }

      this.totalData = totalCount;
      this.cdr.detectChanges();
    },
    error: () => {
      this.pagedOrderData = { data: [], totalData: 0 };
      this.dataSource.data = [];
      this.selectedOrders.clear();
      this.allFilteredIds = [];
    }
  });
}


getStatusText(status: any): string {
  const statusStr = String(status).trim().toLowerCase();

  if (statusStr === 'completed' || statusStr === 'delivered') {
    return 'Terminée';
  }
  if (statusStr === 'pending') {
    return 'En attente';
  }
  if (statusStr === 'readytoload' || statusStr === 'readytoload') {
    return 'À charger';
  }
  if (statusStr === 'inprogress') {
    return 'En cours';
  }
  if (statusStr === 'received') {
    return 'Réception';
  }
  if (statusStr === 'cancelled') {
    return 'Annulée';
  }

  return statusStr;
}
//Call services to get translation 
  private translation = inject(Translation);
 t(key: string): string { return this.translation.t(key); }

getStatusClass(status: any): string {
  const statusStr = String(status).trim().toLowerCase();

  if (statusStr === 'completed' || statusStr === 'delivered') {
    return 'status-completed';
  }
  if (statusStr === 'pending') {
    return 'status-pending';
  }
  if (statusStr === 'readytoload') {
        return 'status-ready'; 
  }
  if (statusStr === 'inprogress') {
    return 'status-in-progress';
  }
  if (statusStr === 'cancelled') {
    return 'status-cancelled';
  }

  return '';
}


formatDate(date: any): string {
  if (!date) return '-';
  
  try {
  
    let dateObj: Date;
    
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
     
      dateObj = new Date(date);
    } else if (typeof date === 'number') {
      
      dateObj = new Date(date);
    } else {
  
      dateObj = new Date();
    }
    
   
    if (isNaN(dateObj.getTime())) {
      console.warn('Invalid date:', date);
      return '-';
    }
    
    return dateObj.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    
  } catch (error) {
    console.error('Error formatting date:', date, error);
    return '-';
  }
}

  add() {
    const ref = this.dialog.open(OrderFormComponent, {
      width: '900px', 
      maxWidth: '95vw', 
      maxHeight: '90vh', 
      panelClass: ['dialog-overlay', 'wide-dialog'], 
         data: {
      loadingUnit: this.loadingUnit  
    }
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.getLatestData();
      }
    });
  }

  edit(order: IOrder) {
    const ref = this.dialog.open(OrderFormComponent, {
      width: '900px', 
      maxWidth: '95vw', 
      maxHeight: '90vh', 
      panelClass: ['dialog-overlay', 'wide-dialog'], 
       data: { 
      orderId: order.id,
      loadingUnit: this.loadingUnit   
    }
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.getLatestData();
      }
    });
  }

  delete(order: IOrder) {
      const message = this
    .t('ORDER_DELETE_CONFIRM')
    .replace('{{reference}}', order.reference);
      
    // if (confirm(`Voulez-vous vraiment supprimer la commande "${order.reference}"? Cette action est irréversible.`)) {
    if (confirm(message)) {
      this.httpService.deleteOrder(order.id).subscribe({
        next: () => {
          // alert("Commande supprimée avec succès");
          alert(this.t('ORDER_DELETE_SUCCESS'));
          this.getLatestData();
        },
        error: (error) => {
          console.error('Error deleting order:', error);
          // alert("Erreur lors de la suppression de la commande");
           alert(this.t('ORDER_DELETE_ERROR'));
        }
      });
    }
  }

pageChange(event: any) {
  this.filter.pageIndex = event.pageIndex;
  this.filter.pageSize = event.pageSize;
  this.getLatestData();
}


  onRowClick(event: any) {
    
    if (event.btn === "Modifier" && event.rowData) {
      this.edit(event.rowData);
    }
    if (event.btn === "Supprimer" && event.rowData) {
      this.delete(event.rowData);
    }
    if (event.btn === "À charger" && event.rowData) {
  this.markReadyToLoad(event.rowData);
}

  }

  exportCSV() {
    if (!this.pagedOrderData?.data?.length) {
      alert('Aucune donnée à exporter');
      return;
    }
    
    const rows = this.pagedOrderData.data;
    
    const csvContent = [
      ['ID', 'Référence', 'Client', 'Poids (kg)', 'Statut', 'Date création', 'Adresse', 'Notes'],
      ...rows.map(o => [
        o.id,
        `"${o.reference}"`,
        `"${o.customerName}"`,
        o.weight || 0,
        `"${this.getStatusText(o.status)}"`,
     
        `"${o.deliveryAddress || ''}"`,
        `"${o.notes || ''}"`
      ])
    ]
      .map(e => e.join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `commandes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  }

  exportExcel() {
    if (!this.pagedOrderData?.data?.length) {
      alert('Aucune donnée à exporter');
      return;
    }
    
    const data = this.pagedOrderData.data.map(order => ({
      'ID': order.id,
      'Référence': order.reference,
      'Client': order.customerName,
      'Poids (kg)': order.weight || 0,
      'Statut': this.getStatusText(order.status),
     
      'Adresse livraison': order.deliveryAddress || '',
      'Notes': order.notes || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = {
      Sheets: { 'Commandes': worksheet },
      SheetNames: ['Commandes']
    };

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/octet-stream'
    });

    saveAs(blob, `commandes_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  exportPDF() {
    if (!this.pagedOrderData?.data?.length) {
      alert('Aucune donnée à exporter');
      return;
    }
    
    const doc = new jsPDF('landscape');
    
    const headers = [['ID', 'Référence', 'Client', 'Poids (kg)', 'Statut', 'Date création']];
    const body = this.pagedOrderData.data.map(o => [
      o.id.toString(),
      o.reference,
      o.customerName,
      (o.weight || 0).toString(),
      this.getStatusText(o.status),
     
    ]);

    doc.setFontSize(16);
    doc.text('Liste des Commandes', 14, 15);
    
    doc.setFontSize(10);
    const dateStr = new Date().toLocaleDateString('fr-FR');
    doc.text(`Date d'export: ${dateStr}`, 14, 25);

    autoTable(doc, {
      startY: 30,
      head: headers,
      body: body,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      margin: { left: 14, right: 14 }
    });

    doc.save(`commandes_${new Date().toISOString().split('T')[0]}.pdf`);
  }

selectedOrders = new Set<any>();
cols: any[] = [];



isSelected(element: IOrder) {
  return this.selectedOrders.has(element.id);
}

toggleSelection(element: IOrder) {
  if (this.selectedOrders.has(element.id)) {
    this.selectedOrders.delete(element.id);
  } else {
    this.selectedOrders.add(element.id);
  }

  this.isSelectAllActive = this.isAllSelected();
}


isIndeterminate() {
  return this.selectedOrders.size > 0 && !this.isAllSelected();
}

isAllSelected() {
  return this.selectedOrders.size === this.allFilteredIds.length && this.allFilteredIds.length > 0;
}

fetchAllFilteredIds() {
  const filterCopy = { ...this.filter, pageIndex: 0, pageSize: this.totalData }; // récupérer tout
  this.httpService.getOrdersList(filterCopy).subscribe({
    next: (result: any) => {
      this.allFilteredIds = result?.data?.data?.map((o: any) => o.id) || [];
      // si Select All était actif, on sélectionne tous
      if (this.isSelectAllActive) {
        this.selectedOrders = new Set(this.allFilteredIds);
      }
    },
    error: () => {
      this.allFilteredIds = [];
    }
  });
}


toggleSelectAll(event: any) {
  if (event.checked) {
    this.isSelectAllActive = true;
    //  récupérer tous les IDs filtrés côté serveur
    this.fetchAllFilteredIds();
  } else {
    this.isSelectAllActive = false;
    this.selectedOrders.clear();
  }
}






// Pour cocher/décocher une seule commande
toggleOrderSelection(orderId: number) {
  if (this.selectedOrders.has(orderId)) {
    this.selectedOrders.delete(orderId);
  } else {
    this.selectedOrders.add(orderId);
  }
}



markReadyToLoad(order: IOrder) {
  this.httpService.markOrdersReadyToLoad([order.id]).subscribe({
    next: () => {
      this.snackBar.open("Commande chargée avec succès", "OK", { duration: 3000 ,  verticalPosition: 'top'});
      this.getLatestData();
    },
    error: (err) => {
      console.error('Erreur chargement commande:', err);
      this.snackBar.open("Erreur lors du chargement", "OK", { duration: 3000,  verticalPosition: 'top' });
    }
  });
}


hasPendingSelected(): boolean {
  return this.selectedOrders.size > 0;
}


markSelectedReadyToLoad() {
  if (this.selectedOrders.size === 0) {
    this.snackBar.open("Aucune commande sélectionnée", "OK", { duration: 3000, verticalPosition: 'top' });
    return;
  }

  // Récupérer toutes les commandes filtrées côté serveur
  const filterCopy = { ...this.filter, pageIndex: 0, pageSize: this.totalData };
  this.httpService.getOrdersList(filterCopy).subscribe({
    next: (result: any) => {
      const allFilteredOrders: IOrder[] = result?.data?.data || [];

        // On filtre selon les paramètres globaux
      const ids = Array.from(this.selectedOrders)
        .map(id => allFilteredOrders.find(o => o.id === id))
        .filter(o => {
          if (!o) return false;

          // Si les paramètres permettent tout charger, on ne filtre rien
          if (this.allowLoadLateOrders && this.acceptOrdersWithoutAddress) {
            return true;
          }

          // Sinon on applique les règles actuelles
          if (!this.allowLoadLateOrders && this.isLate(o)) return false;
          if (!this.acceptOrdersWithoutAddress && !o.deliveryAddress) return false;

          return true;
        })
        .map(o => o!.id);

      if (ids.length === 0) {
        this.snackBar.open("Aucune commande sélectionnée n'est chargable (en retard)", "OK", { duration: 3000, verticalPosition: 'top' });
        return;
      }

      this.httpService.markOrdersReadyToLoad(ids).subscribe({
        next: () => {
          this.snackBar.open("Commandes chargées avec succès", "OK", { duration: 3000, verticalPosition: 'top' });
          // Décocher uniquement les commandes chargées
          ids.forEach(id => this.selectedOrders.delete(id));
          this.selectAllFiltered = false;
          this.getLatestData();
        },
        error: () => {
          this.snackBar.open("Erreur lors du chargement", "OK", { duration: 3000, verticalPosition: 'top' });
        }
      });

    },
    error: () => {
      this.snackBar.open("Erreur lors de la récupération des commandes", "OK", { duration: 3000, verticalPosition: 'top' });
    }
  });
}

onButtonClick(btn: string, rowData: any, event: MouseEvent) {
  event.stopPropagation(); 
  this.rowClick.emit({ btn, rowData });
}
canMarkReadyToLoad(order: any): boolean {
  const s = String(order.status).toLowerCase();
  return s == 'pending';
}

get filteredOrders(): IOrder[] {
  let data = this.pagedOrderData.data || [];
  if (this.filter.status) {
    data = data.filter(o => o.status === this.filter.status);
  }
  if (this.filter.sourceSystem) {
    data = data.filter(o => o.sourceSystem === this.filter.sourceSystem);
  }
  return data;
}
  getSourceClass(source: string): string {
    if (!source) return 'source-other';
    switch (source.toUpperCase()) {
      case 'TMS': return 'source-TMS';
      case 'QAD': return 'source-QAD';
      default: return 'source-other';
    }
  }

//   statusOptions = [
//   { value: '', label: 'Tous' },
//   { value: OrderStatus.Pending, label: 'En attente' },
//   { value: OrderStatus.ReadyToLoad, label: 'À charger' },
//   { value: OrderStatus.InProgress, label: 'En cours de livraison' },
//   { value: OrderStatus.Received, label: 'Réception' },
//   { value: OrderStatus.Closed, label: 'Clôturée' },
//   { value: OrderStatus.Cancelled, label: 'Annulée' }
// ];

statusOptions = [
  { value: '', label: this.t('STATUS_ALL') },
  { value: OrderStatus.Pending, label: this.t('STATUS_PENDING') },
  { value: OrderStatus.ReadyToLoad, label: this.t('STATUS_READY_TO_LOAD') },
  { value: OrderStatus.InProgress, label: this.t('STATUS_IN_PROGRESS') },
  { value: OrderStatus.Received, label: this.t('STATUS_RECEIVED') },
  { value: OrderStatus.Closed, label: this.t('STATUS_CLOSED') },
  { value: OrderStatus.Cancelled, label: this.t('STATUS_CANCELLED') }
];
 

sourceOptions = [
  { value: '', label: 'Toutes' },
  { value: 'TMS', label: 'TMS' },
  { value: 'QAD', label: 'QAD' }
];
resetFilters() {

  this.columnFilters = {
    reference: '',
    customerName: '',
    customerCity: ''
  };


  this.searchControl.setValue('');
  this.statusControl.setValue('');
  this.sourceControl.setValue('');
  this.deliveryDateStartControl.setValue(null);
  this.deliveryDateEndControl.setValue(null);
this.lateControl.setValue(null);

this.zoneControl.setValue(null);


  this.filter = {
    pageIndex: 0,
    pageSize: 10,
    search: '',
  status: null,         
  sourceSystem: null,   
    deliveryDateStart: '',
    deliveryDateEnd: '',
    isLate: null,
      zoneId: null 
  };

  this.isSelectAllActive = false;  
  this.selectedOrders.clear();
  this.selectAllFiltered = false;
  this.allFilteredIds = [];


  this.applyAllFilters();

  this.getLatestData();
}

isDeliveryDateRangeInvalid(): boolean {
  const start = this.deliveryDateStartControl.value;
  const end = this.deliveryDateEndControl.value;

  if (!start || !end) {
    return false; // pas de contrôle si une des deux dates est vide
  }

  return new Date(start) > new Date(end);
}
loadZones() {
  this.httpService.getActiveZones().subscribe({
    next: res => {
      this.zones = res.data; // ApiResponse<IZone[]>
    },
    error: () => {
      this.zones = [];
    }
  });
}
private formatDateLocal(date: Date | null | undefined): string | undefined {
  if (!date) return undefined; // null ou undefined → undefined

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // mois 0-indexé
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}
// --- DATE UTILS ---
private normalizeDate(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

// --- EN RETARD ---
isLate(order: IOrder): boolean {
  if (!order.deliveryDate) return false;

  const today = this.normalizeDate(new Date());
  const delivery = this.normalizeDate(new Date(order.deliveryDate));

  const status = String(order.status).toLowerCase();
  const isClosed = status === 'closed' || status === 'delivered';

  return delivery < today && !isClosed;
}

// --- AUJOURD’HUI ---
isToday(order: IOrder): boolean {
  if (!order.deliveryDate) return false;

  const today = this.normalizeDate(new Date());
  const delivery = this.normalizeDate(new Date(order.deliveryDate));

  return delivery.getTime() === today.getTime();
}

// --- ACTIONS BLOQUÉES ---
canInteract(order: IOrder): boolean {
  return !this.isLate(order);
}
toggleSort(column: string) {
  // Si on reclique sur la même colonne, on inverse le sens
  if (this.filter.sortField === column) {
    this.filter.sortDirection = this.filter.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    // Si nouvelle colonne, tri croissant par défaut
    this.filter.sortField = column;
    this.filter.sortDirection = 'asc';
  }

  // On retourne à la première page après changement de tri
  this.filter.pageIndex = 0;

  // Recharge les données avec le tri appliqué
  this.getLatestData();
}

getSortIcon(column: string): string | null {
  if (this.filter.sortField === column) {
    return this.filter.sortDirection === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }
  return null;
}
getLoadingUnitImage(unit: string): string {
  switch (unit?.toLowerCase()) {
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

}