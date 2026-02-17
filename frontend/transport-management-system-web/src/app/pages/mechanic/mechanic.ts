import { Component, inject, OnInit } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { IMechanic } from '../../types/mechanic';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MechanicForm } from './mechanic-form/mechanic-form';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mechanic',
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
  templateUrl: './mechanic.html',
  styleUrls: ['./mechanic.scss']
})
export class Mechanic implements OnInit {
      constructor(public auth: Auth) {}  
    
      getActions(row: any, actions: string[]) {
        const permittedActions: string[] = [];
    
        for (const a of actions) {
          if (a === 'Modifier' && this.auth.hasPermission('MECHANIC_EDIT')) {
            permittedActions.push(a);
          }
          if (a === 'Supprimer' && this.auth.hasPermission('MECHANIC_DISABLE')) {
            permittedActions.push(a);
          }
        }
    
        return permittedActions;
      }
      
  httpService = inject(Http);
  pagedMechanicData!: PagedData<IMechanic>;
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
      format: (row: IMechanic) => {
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
    this.httpService.getMechanicsList(this.filter).subscribe(result => {
      this.pagedMechanicData = result;
      this.totalData = result.totalData;
    });
  }

  add() {
    this.openDialog();
  }

  edit(mechanic: IMechanic) {
    const ref = this.dialog.open(MechanicForm, {
      panelClass: 'm-auto',
      width: '500px',
      data: { mechanicId: mechanic.id }
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  delete(mechanic: IMechanic) {
    if (confirm(`Voulez-vous vraiment supprimer le mécanicien "${mechanic.name}"?`)) {
      this.httpService.deleteMechanic(mechanic.id).subscribe(() => {
        alert("Mécanicien supprimé avec succès");
        this.getLatestData();
      });
    }
  }

  openDialog(): void {
    const ref = this.dialog.open(MechanicForm, {
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