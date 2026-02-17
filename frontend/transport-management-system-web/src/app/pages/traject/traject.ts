// traject.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { Http } from '../../services/http';
import { Table } from '../../components/table/table';
import { ITraject } from '../../types/traject'; 
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { TrajectForm } from './traject-form/traject-form';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { Auth } from '../../services/auth';

@Component({
  selector: 'app-traject',
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
    MatFormFieldModule
  ],
  templateUrl: './traject.html',
  styleUrls: ['./traject.scss']
})
export class TrajectComponent implements OnInit {
      constructor(public auth: Auth) {}  
    
      getActions(row: any, actions: string[]) {
        const permittedActions: string[] = [];
    
        for (const a of actions) {
          if (a === 'Modifier' && this.auth.hasPermission('TRAVEL_EDIT')) {
            permittedActions.push(a);
          }
          if (a === 'Supprimer' && this.auth.hasPermission('TRAVEL_DISABLE')) {
            permittedActions.push(a);
          }
        }
    
        return permittedActions;
      }
      
  private sanitizer = inject(DomSanitizer);
  httpService = inject(Http);
  pagedTrajectData!: PagedData<ITraject>;
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
      label: 'Nom du traject'
    },
    { 
      key: 'pointsCount',
      label: 'Nombre de points',
      format: (row: ITraject): SafeHtml => {
        return this.sanitizer.bypassSecurityTrustHtml(`
          <div style="display: flex; align-items: center; gap: 8px;">
            <mat-icon style="font-size: 18px; color: #3f51b5;">location_on</mat-icon>
            <span style="font-weight: 500;">${row.points?.length || 0}</span>
          </div>
        `);
      },
      html: true
    },
    { 
      key: 'pointsPreview',
      label: 'Points de passage',
      format: (row: ITraject): SafeHtml => {
        const points = row.points || [];
        const sortedPoints = [...points].sort((a, b) => a.order - b.order);
        const previewPoints = sortedPoints.slice(0, 2);
        
        let previewHtml = previewPoints.map(point => 
          `<div style="margin-bottom: 4px;">
            <span style="color: #666; font-size: 12px;">${point.order}.</span>
            <span style="margin-left: 4px;">${point.location}</span>
          </div>`
        ).join('');
        
        if (points.length > 2) {
          previewHtml += `<div style="color: #666; font-size: 12px;">
            + ${points.length - 2} autres points
          </div>`;
        }
        
        return this.sanitizer.bypassSecurityTrustHtml(previewHtml);
      },
      html: true
    },
    { 
      key: 'estimatedStats',
      label: 'Estimations',
      format: (row: ITraject): SafeHtml => {
        const pointsCount = row.points?.length || 0;
        const estimatedDistance = pointsCount * 10; // 10km par point
        const estimatedDuration = pointsCount * 0.5; // 30min par point
        
        return this.sanitizer.bypassSecurityTrustHtml(`
          <div>
            <div style="margin-bottom: 4px;">
              <span style="color:#666; font-size:12px;">Distance: </span>
              <span style="font-weight:500;">${estimatedDistance} km</span>
            </div>
            <div>
              <span style="color:#666; font-size:12px;">Durée: </span>
              <span style="font-weight:500;">${estimatedDuration} h</span>
            </div>
          </div>
        `);
      },
      html: true
    },
    {
      key: 'Action',
      format: (row: any) => ["Modifier", "Supprimer"]
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
    this.httpService.getTrajectsList(this.filter).subscribe({
      next: (result) => {
        this.pagedTrajectData = result;
        this.totalData = result.totalData;
      },
      error: (error) => {
        console.error('Error loading trajects:', error);
        alert('Erreur lors du chargement des trajects');
      }
    });
  }

  add() {
    this.openDialog();
  }

  edit(traject: ITraject) {
    const ref = this.dialog.open(TrajectForm, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      panelClass: ['dialog-overlay', 'wide-dialog'],
      data: { trajectId: traject.id }
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  delete(traject: ITraject) {
    const confirmation = confirm(`Voulez-vous vraiment supprimer le traject "${traject.name}" ?`);
    
    if (confirmation) {
      this.httpService.deleteTraject(traject.id).subscribe({
        next: () => {
          alert("Traject supprimé avec succès");
          this.getLatestData();
        },
        error: (error) => {
          console.error('Error deleting traject:', error);
          alert("Erreur lors de la suppression du traject");
        }
      });
    }
  }

  openDialog(): void {
    const ref = this.dialog.open(TrajectForm, {
      width: '800px', 
      maxWidth: '95vw', 
      maxHeight: '90vh', 
      panelClass: ['dialog-overlay', 'wide-dialog'], 
      data: {}
    });

    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  pageChange(event: any) {
    this.filter.pageIndex = event.pageIndex;
    this.getLatestData();
  }

  onRowClick(event: any) {
    switch(event.btn) {
      case "Modifier":
        this.edit(event.rowData);
        break;
      case "Supprimer":
        this.delete(event.rowData);
        break;
    }
  }

  exportCSV() {
    const rows: ITraject[] = this.pagedTrajectData?.data || [];

    const csvContent = [
      [
        'ID',
        'Nom',
        'Nombre de points',
        'Points de passage',
        'Distance estimée (km)',
        'Durée estimée (h)'
      ],
      ...rows.map(t => {
        const pointsCount = t.points?.length || 0;
        const pointsList = t.points?.sort((a, b) => a.order - b.order)
          .map(p => `${p.order}. ${p.location}`)
          .join('; ') || '';
        
        return [
          t.id,
          t.name,
          pointsCount,
          pointsList,
          pointsCount * 10,
          pointsCount * 0.5
        ];
      })
    ]
    .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'trajects.csv';
    link.click();
  }

  exportExcel() {
    const data: ITraject[] = this.pagedTrajectData?.data || [];

    const excelData = data.map(t => {
      const pointsCount = t.points?.length || 0;
      return {
        ID: t.id,
        'Nom': t.name,
        'Nombre de points': pointsCount,
        'Distance estimée (km)': pointsCount * 10,
        'Durée estimée (h)': pointsCount * 0.5,
        'Points': t.points?.sort((a, b) => a.order - b.order)
          .map(p => `${p.order}. ${p.location}`)
          .join(' | ') || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = {
      Sheets: { Trajects: worksheet },
      SheetNames: ['Trajects']
    } as any;

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    saveAs(blob, 'trajects.xlsx');
  }

  exportPDF() {
    const doc = new jsPDF();
    const rows: ITraject[] = this.pagedTrajectData?.data || [];

    autoTable(doc, {
      head: [[
        'ID',
        'Nom',
        'Points',
        'Distance estimée',
        'Durée estimée'
      ]],
      body: rows.map(t => {
        const pointsCount = t.points?.length || 0;
        return [
          t.id,
          t.name,
          pointsCount,
          `${pointsCount * 10} km`,
          `${pointsCount * 0.5} h`
        ];
      }),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [63, 81, 181] }
    });

    doc.save('trajects.pdf');
  }
}