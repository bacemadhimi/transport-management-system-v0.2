import { Component, inject, OnInit } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { IVendor } from '../../types/vendor';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { VendorForm } from './vendor-form/vendor-form';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vendor',
  standalone: true,
  imports: [
    Table,
    CommonModule,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './vendor.html',
  styleUrls: ['./vendor.scss']
})
export class Vendor implements OnInit {
      constructor(public auth: Auth) {}  
    
      getActions(row: any, actions: string[]) {
        const permittedActions: string[] = [];
    
        for (const a of actions) {
          if (a === 'Modifier' && this.auth.hasPermission('VENDOR_EDIT')) {
            permittedActions.push(a);
          }
          if (a === 'Supprimer' && this.auth.hasPermission('VENDOR_DISABLE')) {
            permittedActions.push(a);
          }
        }
    
        return permittedActions;
      }
      
  httpService = inject(Http);
  pagedvendorData!: PagedData<IVendor>;
  totalData!: number;
  
  filter: any = {
    pageIndex: 0,
    pageSize: 10
  };
  
  searchControl = new FormControl('');
  readonly dialog = inject(MatDialog);

  showCols = [
   
    { key: 'name', label: 'Nom' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Téléphone' },
    { 
      key: 'createdDate', 
      label: 'Date de Création',
      format: (row: IVendor) => {
        if (!row.createdDate) return 'N/A';
        const date = new Date(row.createdDate);
        return date.toLocaleDateString('fr-FR', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric' 
        });
      }
    },
    {
      key: 'Action',
      format: () => ["Modifier", "Supprimer"]
    }
  ];

  ngOnInit() {
    this.getLatestData();

    this.searchControl.valueChanges.pipe(debounceTime(250))
      .subscribe((value: string | null) => {
        this.filter.search = value;
        this.filter.pageIndex = 0;
        this.getLatestData();
      });
  }

  getLatestData() {
    this.httpService.getVendorsList(this.filter).subscribe(result => {
      this.pagedvendorData = result;
      this.totalData = result.totalData;
    });
  }

  add() {
    this.openDialog();
  }

  edit(vendor: IVendor) {
    const ref = this.dialog.open(VendorForm, {
      panelClass: 'm-auto',
      width: '500px',
      data: { vendorId: vendor.id }
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  delete(vendor: IVendor) {
    if (confirm(`Voulez-vous vraiment supprimer le vendeur "${vendor.name}"?`)) {
      this.httpService.deleteVendor(vendor.id).subscribe(() => {
        alert("Vendeur supprimé avec succès");
        this.getLatestData();
      });
    }
  }

  openDialog(): void {
    const ref = this.dialog.open(VendorForm, {
      panelClass: 'm-auto',
      width: '500px',
      data: {}
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  pageChange(event: any) {
    this.filter.pageIndex = event.pageIndex;
    this.getLatestData();
  }

  onRowClick(event: any) {
    if (event.btn === "Modifier") this.edit(event.rowData);
    if (event.btn === "Supprimer") this.delete(event.rowData);
  }
}