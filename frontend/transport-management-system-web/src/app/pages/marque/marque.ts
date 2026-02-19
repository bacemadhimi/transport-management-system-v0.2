import { Component, inject, OnInit } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { IMarque } from '../../types/marque';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MarqueForm } from './marque-form/marque-form';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-marque',
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
  templateUrl: './marque.html',
  styleUrls: ['./marque.scss']
})
export class Marque implements OnInit {
  constructor(public auth: Auth) {}  

  getActions(row: any, actions: string[]) {
    const permittedActions: string[] = [];
    for (const a of actions) {
      if (a === 'Modifier' && this.auth.hasPermission('MARQUE_EDIT')) {
        permittedActions.push(a);
      }
      if (a === 'Supprimer' && this.auth.hasPermission('MARQUE_DISABLE')) {
        permittedActions.push(a);
      }
    }
    return permittedActions;
  }

  httpService = inject(Http);
  pagedMarqueData!: PagedData<IMarque>;
  totalData!: number;

  filter: any = {
    pageIndex: 0,
    pageSize: 10,
    search: ''
  };

  searchControl = new FormControl('');
  readonly dialog = inject(MatDialog);

  showCols = [
    { key: 'name', label: 'Nom de la Marque' },
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
   this.httpService.getMarques(this.filter).subscribe(result => {
      this.pagedMarqueData = result;
      this.totalData = result.totalData;
          console.log('dd'+ this.pagedMarqueData )
    });
  }

  add() {
    this.openDialog();
  }

  edit(marque: IMarque) {
    const ref = this.dialog.open(MarqueForm, {
      panelClass: 'm-auto',
      width: '500px',
      data: { marqueId: marque.id }
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.getLatestData();
      }
    });
  }

  delete(marque: IMarque) {
    Swal.fire({
      title: 'Êtes-vous sûr?',
      text: `Voulez-vous vraiment supprimer la marque "${marque.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Oui, supprimer!',
      cancelButtonText: 'Annuler'
    }).then((result) => {
      if (result.isConfirmed) {
        this.httpService.deleteMarque(marque.id).subscribe({
          next: () => {
            Swal.fire(
              'Supprimée!',
              'La marque a été supprimée avec succès.',
              'success'
            );
            this.getLatestData();
          },
          error: (error) => {
            console.error('Error deleting marque:', error);
            Swal.fire(
              'Erreur!',
              error.error?.message || 'Une erreur est survenue lors de la suppression.',
              'error'
            );
          }
        });
      }
    });
  }

  openDialog(): void {
    const ref = this.dialog.open(MarqueForm, {
      panelClass: 'm-auto',
      width: '500px',
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

  onRowClick(event: any) {
    if (event.btn === "Modifier") this.edit(event.rowData);
    if (event.btn === "Supprimer") this.delete(event.rowData);
  }
}