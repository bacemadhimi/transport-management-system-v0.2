import { Component, EventEmitter, Input, Output, output, ViewChild } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { PagedData } from '../../types/paged-data';
import { MatPaginator } from "@angular/material/paginator";
import { CommonModule } from '@angular/common';
import { Auth } from '../../services/auth';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-table',
    standalone: true, 
  imports: [MatTableModule, MatCardModule, MatButtonModule, MatButtonModule, MatPaginator, CommonModule,MatSortModule,MatIconModule],
  templateUrl: './table.html',
  styleUrls: ['./table.scss']  
})
export class Table {
  constructor(public auth: Auth) {}
  
getActions(row: any, actions: any): string[] {
  if (!actions) return [];
  return Array.isArray(actions) ? actions : [actions];
}


  
  @Input() PagedData!: PagedData<any>;
  @Input() displayedColumns: any[] = [];
  @Output() onEdit = new EventEmitter<any>();
  @Output() onDelete = new EventEmitter<any>();
  @Output() onPageChange = new EventEmitter<any>();
  @Output() rowClick = new EventEmitter<any>();
  @Input() pageIndex!: number;
  @Input() pageSize!: number;
  @Input() showPage= true;
  @Input() showApproveButton: boolean = false;
  @Input() sortableColumns: string[] = []; 
  @Output() sortChange = new EventEmitter<any>(); 
  @ViewChild(MatSort) sort!: MatSort;


  cols: any[] = []
  ngOnInit() {
    this.cols = this.displayedColumns.map(x => x.key || x)
  }
  edit(rowData: any) {
    this.onEdit.emit(rowData);
  }
  delete(rowData: any) {
    this.onDelete.emit(rowData);
  }
  pageChange(event: any) {
    console.log(event);
    this.onPageChange.emit(event);
  }
onButtonClick(btn: string, rowData: any, event: MouseEvent) {
  event.stopPropagation(); 
  this.rowClick.emit({ btn, rowData });
}

onCellClick(column: string, rowData: any, event: MouseEvent) {
 
  const target = event.target as HTMLElement;
  if (target.closest('.attachment-cell')) {
    event.stopPropagation();
    this.rowClick.emit({ column, rowData });
  }
}

  getStatusText(status: any): string {
  const s = String(status).toLowerCase();
  if (s === 'pending') return 'En attente';
  if (s === 'inprogress') return 'En cours';
  if (s === 'delivered' || s === 'completed') return 'Terminée';
  if (s === 'cancelled') return 'Annulée';
  return status;
}

getStatusClass(status: any): string {
  const s = String(status).toLowerCase();
  if (s === 'pending') return 'status-pending';
  if (s === 'inprogress') return 'status-in-progress';
  if (s === 'delivered' || s === 'completed') return 'status-completed';
  if (s === 'cancelled') return 'status-cancelled';
  return '';
}


isColumnSortable(columnKey: string): boolean {
 
  return this.sortableColumns.includes(columnKey);
}
onSortChange(sort: Sort): void {
  console.log('Sort changed:', sort); 
  if (sort.active && sort.direction) {
    this.sortChange.emit({
      column: { key: sort.active },
      direction: sort.direction
    });
  } else {
    
    this.sortChange.emit({ column: null, direction: null });
  }
}
getActionClass(action: string): string {
  switch (action) {
    case 'Modifier':
    case 'Edit':
    case 'edit': return 'ACTION_EDIT';
    
    case 'Supprimer':
    case 'Delete':
    case 'delete': return 'ACTION_DELETE';
    
    case 'Désactiver':
    case 'Disable':
    case 'disable': return 'ACTION_DISABLE';
    
    case 'Activer':
    case 'Enable':
    case 'enable': return 'ACTION_ENABLE';
    
    case 'Voir détails':
    case 'View details':
    case 'view': return 'ACTION_VIEW';
    
    default: return '';
  }
}

getActionIcon(action: string): string {
  switch (action) {
    case 'Modifier':
    case 'Edit':
    case 'edit': return 'edit_note';
    
    case 'Supprimer':
    case 'Delete':
    case 'delete': return 'delete';
    
    case 'Désactiver':
    case 'Disable':
    case 'disable': return 'block';
    
    case 'Activer':
    case 'Enable':
    case 'enable': return 'check_circle';
    
    case 'Voir détails':
    case 'View details':
    case 'view': return 'visibility';
    
    default: return action.toLowerCase();
  }
}
}