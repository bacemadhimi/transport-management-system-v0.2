import { Component, OnInit, inject } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';

import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ConvoyeurForm } from './convoyeur-form/convoyeur-form';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { Router } from '@angular/router';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { IConvoyeur } from '../../types/convoyeur';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { Translation } from '../../services/Translation';
import { ICustomer } from '../../types/customer';

@Component({
  selector: 'app-convoyeur',
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
  templateUrl: './convoyeur.html',
  styleUrls: ['./convoyeur.scss']
})
export class Convoyeur implements OnInit {
      constructor(public auth: Auth) {}  
      //add this service for translate language 
        private translation = inject(Translation);
        t(key:string):string { return this.translation.t(key); }
      //end translation service
      
      getActions(row: any, actions: string[]) {
        const permittedActions: string[] = [];
    
        for (const a of actions) {
          if (a === 'Modifier' && this.auth.hasPermission('CONVOYEUR_EDIT')) {
            permittedActions.push(a);
          }
          if (a === 'Supprimer' && this.auth.hasPermission('CONVOYEUR_DISABLE')) {
            permittedActions.push(a);
          }
        }
    
        return permittedActions;
      }
      
  httpService = inject(Http);
  pagedConvoyeurData!: PagedData<IConvoyeur>;
  totalData!: number;

  filter: any = {
    pageIndex: 0,
    pageSize: 10
  };

  searchControl = new FormControl('');
  router = inject(Router);
  readonly dialog = inject(MatDialog);

  // showCols = [
 
  //   { key: 'name', label: 'Nom' },
  //   { key: 'permisNumber', label: 'Numéro Permis' },
  //   { key: 'phone', label: 'Téléphone' },
  //   { key: 'status', label: 'Status' },
  //   {
  //     key: 'Action',
  //     format: () => ["Modifier", "Supprimer"]
  //   }
  // ];

  //TRANSLATE LANGUAGE 
//   showCols = [
//   { key: 'name', label: 'Nom' },
//   { key: 'permisNumber', label: 'Numéro Permis' },
//   { key: 'phone', label: 'Téléphone' },
//   { key: 'status', label: 'Status' },
//   {
//     key: 'Action',
//     format: () => [this.t('ACTION_EDIT'), this.t('ACTION_DELETE')]
//   }
// ];
showCols = [
  { key: 'name', label: this.t('TABLE_NAME') },
  { key: 'permisNumber', label: this.t('TABLE_LICENSE_NUMBER') },
  { key: 'phone', label: this.t('CUSTOMER_PHONE') },
  { key: 'status', label: this.t('TABLE_STATUS') },
  {
    key: 'Action',
    format: (row: IConvoyeur) =>
      [this.t('ACTION_EDIT'), this.t('ACTION_DELETE')]
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
          console.log('bb'+ this.auth.hasPermission('CONVOYEUR_ADD'));
  }

  getLatestData() {
    this.httpService.getConvoyeursList(this.filter).subscribe(result => {
      this.pagedConvoyeurData = result;
      this.totalData = result.totalData;
    });
  }

  add() {
    this.openDialog();
  }

  edit(convoyeur: IConvoyeur) {
    const ref = this.dialog.open(ConvoyeurForm, {
      panelClass: 'm-auto',
      data: { convoyeurId: convoyeur.id }
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  // delete(convoyeur: IConvoyeur) {
  //   if (confirm(`Voulez-vous vraiment supprimer le chauffeur ${convoyeur.name}?`)) {
  //     this.httpService.deleteConvoyeur(convoyeur.id).subscribe(() => {
  //       alert("Convoyeur supprimé avec succès");
  //       this.getLatestData();
  //     });
  //   }
  // }
delete(convoyeur: IConvoyeur) {
  const confirmMessage = this.t('CONVOYEUR_DELETE_CONFIRM_TEXT').replace('{{name}}', convoyeur.name);
  if (confirm(confirmMessage)) {
    this.httpService.deleteConvoyeur(convoyeur.id).subscribe(() => {
      alert(this.t('CONVOYEUR_DELETED_SUCCESS'));
      this.getLatestData();
    });
  }
}



  openDialog(): void {
    const ref = this.dialog.open(ConvoyeurForm, {
      panelClass: 'm-auto',
      data: {}
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  pageChange(event: any) {
    this.filter.pageIndex = event.pageIndex;
    this.getLatestData();
  }

  // onRowClick(event: any) {
  //   if (event.btn === "Modifier") this.edit(event.rowData);
  //   if (event.btn === "Supprimer") this.delete(event.rowData);
  // }

onRowClick(event: any) {
  const convoyeur: IConvoyeur = event.rowData;
  const btnLabel = event.btn;

  if (btnLabel === this.t('ACTION_EDIT')) this.edit(convoyeur);
  if (btnLabel === this.t('ACTION_DELETE')) this.delete(convoyeur);
}


  exportCSV() {
  const rows = this.pagedConvoyeurData?.data || [];

  const csvContent = [
    ['ID', 'Nom', 'Permis', 'Téléphone', 'Status'],
    ...rows.map(d => [
      d.id,
      d.name,
      d.permisNumber,
      d.phone,
      d.status
    ])
  ]
    .map(e => e.join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'convoyeur.csv';
  link.click();
}
exportExcel() {
  const data = this.pagedConvoyeurData?.data || [];

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = {
    Sheets: { Convoyeurs: worksheet },
    SheetNames: ['Convoyeurs']
  };

  const excelBuffer = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array'
  });

  const blob = new Blob([excelBuffer], {
    type: 'application/octet-stream'
  });

  saveAs(blob, 'convoyeur.xlsx');
}


exportPDF() {
  const doc = new jsPDF();

  const rows = this.pagedConvoyeurData?.data || [];

  autoTable(doc, {
    head: [['ID', 'Nom', 'Permis', 'Téléphone', 'Status']],
    body: rows.map(d => [
      d.id,
      d.name,
      d.permisNumber,
      d.phone,
      d.status
    ])
  });

  doc.save('convoyeur.pdf');
}

}
