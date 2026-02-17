import { Component, inject, OnInit } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { ILocation } from '../../types/location'; 
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime } from 'rxjs';
import { PagedData } from '../../types/paged-data';

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { LocationFormComponent } from './location-form/location-form';
import { Auth } from '../../services/auth';
import { Translation } from '../../services/Translation';


@Component({
  selector: 'app-location',
  standalone: true,
  imports: [
    CommonModule,
    Table,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatCardModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule
  ],
  templateUrl: './location.html',
  styleUrls: ['./location.scss']
})
export class LocationComponent implements OnInit {
      constructor(public auth: Auth) {}  
    
      getActions(row: any, actions: string[]) {
        const permittedActions: string[] = [];
    
        for (const a of actions) {
          if (a === 'Modifier' && this.auth.hasPermission('LOCATION_EDIT')) {
            permittedActions.push(a);
          }
          if (a === 'Supprimer' && this.auth.hasPermission('LOCATION_DISABLE')) {
            permittedActions.push(a);
          }
        }
    
        return permittedActions;
      }
      
  private sanitizer = inject(DomSanitizer);
  httpService = inject(Http);
  pagedLocationData!: PagedData<ILocation>;
  totalData!: number;
  filter: any = {
    pageIndex: 0,
    pageSize: 10,
    search: ''
  };
  searchControl = new FormControl('');
  readonly dialog = inject(MatDialog);

  showCols = [
   
    { 
      key: 'name',
      label: 'Nom de la location'
    },
    { 
      key: 'status',
      label: 'Statut',
      format: (row: ILocation): SafeHtml => {
        const isActive = row.isActive;
        return this.sanitizer.bypassSecurityTrustHtml(`
          <div style="display: flex; align-items: center; gap: 6px;">
            <div style="
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background-color: ${isActive ? '#10b981' : '#ef4444'};
            "></div>
            <span style="
              padding: 4px 12px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 500;
              color: ${isActive ? '#059669' : '#dc2626'};
              background-color: ${isActive ? '#d1fae5' : '#fee2e2'};
              border: 1px solid ${isActive ? '#a7f3d0' : '#fecaca'};
              white-space: nowrap;
            ">
              ${isActive ? 'Actif' : 'Inactif'}
            </span>
          </div>
        `);
      },
      html: true
    },
    { 
      key: 'dates',
      label: 'Dates',
      format: (row: ILocation): SafeHtml => {
        const formatDate = (dateString: string) => {
          if (!dateString) return 'N/A';
          try {
            const date = new Date(dateString);
            return date.toLocaleDateString('fr-FR');
          } catch {
            return 'Date invalide';
          }
        };

        return this.sanitizer.bypassSecurityTrustHtml(`
          <div>
            <div style="margin-bottom: 2px;">
              <span style="color:#666; font-size:11px;">Créé: </span>
              <span style="font-size:12px;">${formatDate(row.createdAt)}</span>
            </div>
            <div>
              <span style="color:#666; font-size:11px;">Modifié: </span>
              <span style="font-size:12px;">${formatDate(row.updatedAt)}</span>
            </div>
          </div>
        `);
      },
      html: true
    },
    {
      key: 'Action',
      //format: (row: ILocation) => ["Modifier", "Supprimer"]
       format: (row: ILocation) => [this.t('EDIT'), this.t('DELETE')]
    }
  ];

  ngOnInit() {
    this.getLatestData();

    this.searchControl.valueChanges.pipe(debounceTime(250))
      .subscribe((value: string | null) => {
        this.filter.search = value || '';
        this.filter.pageIndex = 0;
        this.getLatestData();
      });
  }

  getLatestData() {
    this.httpService.getLocationsList(this.filter).subscribe({
      next: (result) => {
        this.pagedLocationData = result;
        this.totalData = result.totalData;
      },
      error: (error) => {
        console.error('Error loading locations:', error);
        this.showError('Erreur lors du chargement des locations');
      }
    });
  }

  add() {
    this.openDialog();
  }

  edit(location: ILocation) {
    const ref = this.dialog.open(LocationFormComponent, {
      width: '500px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: ['dialog-overlay'],
      data: { locationId: location.id }
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.getLatestData();
      }
    });
  }

  // delete(location: ILocation) {
  //   if (confirm(`Voulez-vous vraiment supprimer la ville "${location.name}" ?`)) {
  //     this.httpService.deleteLocation(location.id).subscribe({
  //       next: () => {
  //         this.showSuccess('Location supprimée avec succès');
  //         this.getLatestData();
  //       },
  //       error: (error) => {
  //         console.error('Error deleting location:', error);
  //         this.showError('Erreur lors de la suppression de la location');
  //       }
  //     });
  //   }
  // }

   delete(location: ILocation) {
  const confirmMessage = this.t('CONFIRM_DELETE_LOCATION').replace('{{name}}', location.name);

  if (confirm(confirmMessage)) {
    this.httpService.deleteLocation(location.id).subscribe({
      next: () => {
        this.showSuccess(this.t('LOCATION_DELETED_SUCCESS'));
        this.getLatestData();
      },
      error: (error) => {
        console.error('Error deleting location:', error);
        this.showError(this.t('LOCATION_DELETE_FAILED'));
      }
    });
  }
}


  openDialog(): void {
    const ref = this.dialog.open(LocationFormComponent, {
      width: '500px', 
      maxWidth: '95vw', 
      maxHeight: '90vh', 
      panelClass: ['dialog-overlay'], 
      data: {}
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.getLatestData();
      }
    });
  }

  pageChange(event: any) {
    this.filter.pageIndex = event.pageIndex;
    this.getLatestData();
  }

  // onRowClick(event: any) {
  //   switch(event.btn) {
  //     case "Modifier":
  //       this.edit(event.rowData);
  //       break;
  //     case "Supprimer":
  //       this.delete(event.rowData);
  //       break;
  //   }
  // }

  onRowClick(event: any) {
  const editLabel = this.t('EDIT');
  const deleteLabel = this.t('DELETE');

  switch(event.btn) {
    case editLabel:
      this.edit(event.rowData);
      break;
    case deleteLabel:
      this.delete(event.rowData);
      break;
  }
}

  exportCSV() {
    const rows: ILocation[] = this.pagedLocationData?.data || [];

    const csvContent = [
      ['ID', 'Nom', 'Statut', 'Date création', 'Date modification'],
      ...rows.map(l => [
        l.id,
        l.name,
        l.isActive ? 'Actif' : 'Inactif',
        new Date(l.createdAt).toLocaleDateString('fr-FR'),
        new Date(l.updatedAt).toLocaleDateString('fr-FR')
      ])
    ]
    .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'locations.csv';
    link.click();
  }

  exportExcel() {
    const data: ILocation[] = this.pagedLocationData?.data || [];

    const excelData = data.map(l => ({
      ID: l.id,
      'Nom': l.name,
      'Statut': l.isActive ? 'Actif' : 'Inactif',
      'Date création': new Date(l.createdAt).toLocaleDateString('fr-FR'),
      'Date modification': new Date(l.updatedAt).toLocaleDateString('fr-FR')
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = {
      Sheets: { Locations: worksheet },
      SheetNames: ['Locations']
    } as any;

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    saveAs(blob, 'locations.xlsx');
  }

  exportPDF() {
    const doc = new jsPDF();
    const rows: ILocation[] = this.pagedLocationData?.data || [];

    autoTable(doc, {
      head: [['ID', 'Nom', 'Statut', 'Créé le', 'Modifié le']],
      body: rows.map(l => [
        l.id,
        l.name,
        l.isActive ? 'Actif' : 'Inactif',
        new Date(l.createdAt).toLocaleDateString('fr-FR'),
        new Date(l.updatedAt).toLocaleDateString('fr-FR')
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save('locations.pdf');
  }

  private showSuccess(message: string): void {
    alert(message);
  }

  private showError(message: string): void {
    alert(message);
  }
   private translation = inject(Translation);
   t(key: string): string { return this.translation.t(key); }
}