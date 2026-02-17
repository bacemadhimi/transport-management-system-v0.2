
import { Component, inject, OnInit } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { IUser } from '../../types/user';
import { MatButtonModule } from '@angular/material/button';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  MatDialog,
  MatDialogRef,
} from '@angular/material/dialog';
import { UserForm } from './user-form/user-form';
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
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { Translation } from '../../services/Translation';

@Component({
  selector: 'app-user',
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
  templateUrl: './user.html',
  styleUrl: './user.scss'
})
export class User implements OnInit {
      constructor(public auth: Auth) {}  
    
      getActions(row: any, actions: string[]) {
        const permittedActions: string[] = [];
    
        for (const a of actions) {
          if (a === 'Modifier' && this.auth.hasPermission('USER_EDIT')) {
            permittedActions.push(a);
          }
          if (a === 'Supprimer' && this.auth.hasPermission('USER_DISABLE')) {
            permittedActions.push(a);
          }
        }
    
        return permittedActions;
      }
      
  httpService = inject(Http);
  pagedUserData!: PagedData<IUser>;
  totalData!: number;
  filter: any = {
    pageIndex: 0,
    pageSize: 10
  };
  searchControl = new FormControl('');
  router = inject(Router);
  readonly dialog = inject(MatDialog);

showCols = [
  { key: 'name', label: 'Nom complet' },
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Téléphone' },
  {
    key: 'userGroup',
    label: 'Groupe',
    format: (row: IUser) => {
      console.log('dd'+ row)
      if (!row.userGroups || row.userGroups.length === 0) return '—';
      return row.userGroups.map(g => g.name).join(', ');
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
    this.httpService.getUsersList(this.filter).subscribe(result => {
      this.pagedUserData = result;
      this.totalData = result.totalData;
          console.log('dd'+ this.pagedUserData )
    });
  }

  add() {
    this.openDialog();
  }

  edit(user: IUser) {
    const ref = this.dialog.open(UserForm, {
      width: '900px',
      maxWidth: '95vw',
      height: 'auto',
      maxHeight: '90vh',
      autoFocus: true,
      data: { userId: user.id },
      panelClass: 'user-form-dialog'
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  delete(user: IUser) {
    if (confirm(`Voulez-vous vraiment supprimer l'utilisateur ${user.name}?`)) {
      this.httpService.deleteUser(user.id).subscribe(() => {
        alert("Utilisateur supprimé avec succès");
        this.getLatestData();
      });
    }
  }

openDialog(): void {
  const ref = this.dialog.open(UserForm, {
    data: {},
    width: '900px', 
    maxWidth: '95vw',
    height: 'auto', 
    maxHeight: '90vh', 
    autoFocus: true,
    panelClass: 'user-form-dialog'
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
  exportCSV() {
    const rows = this.pagedUserData?.data || [];

 const csvContent = [
  ['ID', 'Nom', 'Email', 'Téléphone', 'Groupe'],
  ...rows.map(d => [d.id, d.name, d.email, d.phone, d.userGroups?.map(g => g.name).join(', ') ?? ''])
]
  .map(e => e.join(','))
  .join('\n');


    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'utilisateurs.csv';
    link.click();
  }

  exportExcel() {
    const data = this.pagedUserData?.data || [];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = {
      Sheets: { Utilisateurs: worksheet },
      SheetNames: ['Utilisateurs']
    };

    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array'
    });

    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

    saveAs(blob, 'utilisateurs.xlsx');
  }

  exportPDF() {
    const doc = new jsPDF();
    const rows = this.pagedUserData?.data || [];

   autoTable(doc, {
  head: [['ID', 'Nom', 'Email', 'Téléphone', 'Groupe']],
  body: rows.map(d => [
    d.id ?? '',
    d.name ?? '',
    d.email ?? '',
    d.phone ?? '',
  d.userGroups?.map(g => g.name).join(', ') ?? ''

  ])
});


    doc.save('utilisateurs.pdf');
  }
  getGroupBadges(user: IUser): string {
  if (!user.userGroups || user.userGroups.length === 0) return '—';
  return user.userGroups
    .map(g => `<span style="
      background-color: ${this.getGroupColor(g.name)};
      color: white;
      padding: 2px 6px;
      border-radius: 4px;
      margin-right: 4px;
      font-size: 0.8rem;
      display: inline-block;"
      title="${g.name}">
        ${g.name}
    </span>`)
    .join('');
}

getGroupColor(name: string): string {
  const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#009688', '#795548'];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}
    private translation = inject(Translation);
    t(key: string): string { return this.translation.t(key); }
}
