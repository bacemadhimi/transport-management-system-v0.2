import { Component, OnInit, inject, ViewChild, ElementRef } from '@angular/core';
import { Http } from '../../services/http';
import { SettingsService } from '../../services/settings.service';
import { Table } from '../../components/table/table';
import { MatButtonModule } from '@angular/material/button';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { EmployeeForm } from './employee-form/employee-form';
import { MatSelectModule } from '@angular/material/select';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { PagedData } from '../../types/paged-data';
import { Router } from '@angular/router';
import { IEmployee } from '../../types/employee';
import { IGeneralSettings } from '../../types/general-settings';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { Auth } from '../../services/auth';
import { CommonModule } from '@angular/common';
import { Translation } from '../../services/Translation';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-employee',
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
    MatFormFieldModule,
    MatCheckboxModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './employee.html',
  styleUrls: ['./employee.scss']
})
export class Employee implements OnInit {
  constructor(public auth: Auth) {}

  private translation = inject(Translation);
  t(key: string): string { return this.translation.t(key); }

  httpService = inject(Http);
  settingsService = inject(SettingsService);
  pagedEmployeeData!: PagedData<IEmployee>;
  totalData!: number;
  router = inject(Router);
  readonly dialog = inject(MatDialog);
  @ViewChild('fileInput') fileInput!: ElementRef;

  filter: any = { pageIndex: 0, pageSize: 10 };
  searchControl = new FormControl('');
  categoryFilterControl = new FormControl(null);
  showDisabled: boolean = false;
  isImporting = false;

  // Dynamic categories from general settings
  employeeCategories: IGeneralSettings[] = [];
  categoryOptions: { value: string; label: string }[] = [];

  loadingUnit: string = 'tonnes';

  get showCols() {
    return [
      { key: 'idNumber', label: this.t('CUSTOMER_REG_NUMBER') },
      { key: 'name', label: this.t('TABLE_NAME') },
      { key: 'email', label: this.t('Email') },
      { key: 'phoneNumber', label: this.t('TABLE_PHONE') },
      { key: 'drivingLicense', label: this.t('TABLE_LICENSE_NUMBER')},
      { 
        key: 'isInternal', 
        label: this.t('INTERNAL_EMPLOYEE'),
        format: (row: IEmployee) => {
          return row.isInternal ? this.t('YES') : this.t('NO');
        }
      },
      { key: 'employeeCategory', label: this.t('CATEGORY_TABLE')},
      {
        key: 'truckType',
        label: this.t('TYPE_VEHICULE_LABEL'),
        format: (row: IEmployee) => {
          if (!row.typeTruck) return '-';
          
          const capacity = row.typeTruck.capacity || 'N/A';
          const unit = this.loadingUnit || 'tonnes';
          
          return `${row.typeTruck.type || 'N/A'} (${capacity} ${unit})`;
        }
      },
      {
        key: 'attachment',
        label: this.t('TABLE_ATTACHMENT'),
        format: (row: IEmployee) => {
          if (row.attachmentFileType) {
            return `<span class="attachment-cell" data-employee-id="${row.id}">
                      ✓ ${row.attachmentFileType}
                      <span class="view-icon">👁️</span>
                    </span>`;
          }
          return '-';
        }
      },
      {
        key: 'Action',
        format: (row: IEmployee) =>
          row.isEnable
            ? [this.t('ACTION_EDIT'), this.t('ACTION_DISABLE')]
            : [this.t('ACTION_EDIT'), this.t('ACTION_ENABLE')]
      }
    ];
  }

  ngOnInit() {
    this.loadSettings();
    this.loadEmployeeCategories();
    this.getLatestData();
    
    // Search filter
    this.searchControl.valueChanges.pipe(
      debounceTime(250),
      distinctUntilChanged()
    ).subscribe((value: string | null) => {
      this.filter.search = value;
      this.filter.pageIndex = 0;
      this.getLatestData();
    });

    // Category filter
    this.categoryFilterControl.valueChanges.pipe(
      debounceTime(250)
    ).subscribe((value: string | null) => {
      if (value) {
        this.filter.employeeCategory = value;
      } else {
        delete this.filter.employeeCategory;
      }
      this.filter.pageIndex = 0;
      this.getLatestData();
    });
  }

  private loadSettings(): void {
    this.settingsService.getOrderSettings().subscribe({
      next: (settings) => {
        this.loadingUnit = settings.loadingUnit || 'tonnes';
      },
      error: (err) => {
        console.error('Error loading settings:', err);
        this.loadingUnit = 'tonnes';
      }
    });

    this.settingsService.orderSettings$.subscribe(settings => {
      if (settings) {
        this.loadingUnit = settings.loadingUnit || 'tonnes';
      }
    });
  }

  // Load employee categories from general settings
  private loadEmployeeCategories(): void {
    this.httpService.getAllSettingsByType('EMPLOYEE_CATEGORY').subscribe({
      next: (categories) => {
        this.employeeCategories = categories;
        this.transformCategoriesToOptions();
      },
      error: (error) => {
        console.error('Error loading employee categories:', error);
        // Fallback to default categories if API fails
        this.categoryOptions = [
          { value: 'DRIVER', label: 'Chauffeurs' },
          { value: 'MECHANIC', label: 'Mécaniciens' },
          { value: 'CONVOYEUR', label: 'Convoyeurs' },
          { value: 'EMPLOYEE', label: 'Employés' }
        ];
      }
    });
  }

  // Transform categories from general settings to dropdown options
  private transformCategoriesToOptions(): void {
    this.categoryOptions = this.employeeCategories.map(category => {
      const code = this.extractCode(category.parameterCode);
      
      return {
        value: code,
        label: category.description || code
      };
    });
  }

  // Helper method to extract code from parameterCode
  private extractCode(parameterCode: string): string {
    return parameterCode.split('=')[0];
  }

  getLatestData() {
    const apiFilter: any = {
      pageIndex: this.filter.pageIndex || 0,
      pageSize: this.filter.pageSize || 10
    };
    
    if (this.filter.search) {
      apiFilter.search = this.filter.search;
    }
    
    if (this.filter.employeeCategory) {
      apiFilter.employeeCategory = this.filter.employeeCategory;
    }
    
    apiFilter.isEnable = !this.showDisabled;
    
    console.log('Sending to API:', apiFilter);
    
    this.httpService.getEmployeesList(apiFilter).subscribe({
      next: (result) => {
        console.log('API response:', result);
        this.pagedEmployeeData = result;
        this.totalData = result.totalData;
      },
      error: (error) => {
        console.error('Error loading employees:', error);
      }
    });
  }
    
  toggleListe(checked: boolean) {
    this.showDisabled = checked;
    this.filter.pageIndex = 0;
    this.getLatestData();
  }

  add() {
    this.openDialog();
  }

  edit(employee: IEmployee) {
    const ref = this.dialog.open(EmployeeForm, {
      panelClass: 'm-auto',
      data: { employeeId: employee.id, defaultUnit: this.loadingUnit },
      width: '90vw',
      maxWidth: '1200px',
      minWidth: '400px',
      height: 'auto',
      maxHeight: '90vh',
    });
    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  openDialog() {
    const ref = this.dialog.open(EmployeeForm, {
      data: { defaultUnit: this.loadingUnit },
      panelClass: 'm-auto',
      width: '90vw',
      maxWidth: '1200px',
      minWidth: '400px',
      height: 'auto',
      maxHeight: '90vh',
    });
    ref.afterClosed().subscribe(() => this.getLatestData());
  }

  delete(employee: IEmployee) {
    if (confirm(`${this.t('EMPLOYEE_DELETE_CONFIRM')} ${employee.name}?`)) {
      this.httpService.deleteEmployee(employee.id).subscribe(() => {
        alert(this.t('EMPLOYEE_DELETE_SUCCESS'));
        this.getLatestData();
      });
    }
  }

  onRowClick(event: any) {
    if (event.column === 'attachment' && event.rowData.attachmentFileType) {
      this.viewAttachment(event.rowData);
      return;
    }

    if (event.btn === this.t('ACTION_EDIT')) {
      this.edit(event.rowData);
    } else if (event.btn === this.t('ACTION_DISABLE')) {
      this.disableEmployee(event.rowData);
    } else if (event.btn === this.t('ACTION_ENABLE')) {
      this.enableEmployee(event.rowData);
    }
  }

  disableEmployee(employee: IEmployee) {
    Swal.fire({
      title: this.t('CONFIRMATION'),
      text: `${this.t('EMPLOYEE_DISABLE_CONFIRM')} ${employee.name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.t('YES_DISABLE'),
      cancelButtonText: this.t('CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.httpService.deleteEmployee(employee.id).subscribe({
          next: (response: any) => {
            Swal.fire({
              icon: 'success',
              title: this.t('SUCCESS'),
              text: response.message || this.t('EMPLOYEE_DISABLE_SUCCESS'),
              timer: 2000,
              showConfirmButton: false
            });
            this.getLatestData();
          },
          error: (error) => {
            console.error('Error disabling employee:', error);
            let errorMessage = this.t('EMPLOYEE_DISABLE_ERROR');
            
            if (error.error?.message) {
              errorMessage = error.error.message;
            }
            
            Swal.fire({
              icon: 'error',
              title: this.t('ERROR'),
              text: errorMessage,
              confirmButtonText: this.t('OK')
            });
          }
        });
      }
    });
  }

  enableEmployee(employee: IEmployee) {
    Swal.fire({
      title: this.t('CONFIRMATION'),
      text: `${this.t('EMPLOYEE_ENABLE_CONFIRM')} ${employee.name}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.t('YES_ENABLE'),
      cancelButtonText: this.t('CANCEL')
    }).then((result) => {
      if (result.isConfirmed) {
        this.httpService.enableEmployee(employee.id).subscribe({
          next: (response: any) => {
            Swal.fire({
              icon: 'success',
              title: this.t('SUCCESS'),
              text: response.message || this.t('EMPLOYEE_ENABLE_SUCCESS'),
              timer: 2000,
              showConfirmButton: false
            });
            this.getLatestData();
          },
          error: (error) => {
            console.error('Error enabling employee:', error);
            let errorMessage = this.t('EMPLOYEE_ENABLE_ERROR');
            
            if (error.error?.message) {
              errorMessage = error.error.message;
            }
            
            Swal.fire({
              icon: 'error',
              title: this.t('ERROR'),
              text: errorMessage,
              confirmButtonText: this.t('OK')
            });
          }
        });
      }
    });
  }

  pageChange(pageEvent: any) {
    this.filter.pageIndex = pageEvent.pageIndex;
    this.filter.pageSize = pageEvent.pageSize;
    this.getLatestData();
  }

  viewAttachment(employee: IEmployee) {
    if (!employee.id) return;

    this.httpService.downloadEmployeeAttachment(employee.id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const fileName = employee.attachmentFileName || `employee_${employee.id}_attachment.${employee.attachmentFileType}`;

        if (employee.attachmentFileType && ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'pdf'].includes(employee.attachmentFileType.toLowerCase())) {
          window.open(url, '_blank');
        } else {
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          link.click();
        }

        setTimeout(() => window.URL.revokeObjectURL(url), 100);
      },
      error: (err) => {
        console.error('Error downloading attachment:', err);
        alert('Erreur lors du téléchargement de la pièce jointe');
      }
    });
  }

  // ==================== MÉTHODES D'IMPORT/EXPORT EXCEL ====================

  /**
   * Affiche la popup d'aide avec les instructions
   */
  showHelpPopup() {
    Swal.fire({
      title: '📋 Guide d\'import des employés',
      width: '850px',
      showConfirmButton: true,
      confirmButtonText: 'Compris',
      confirmButtonColor: '#10b981',
      showCancelButton: false,
      customClass: {
        popup: 'help-popup',
        title: 'help-popup-title',
        htmlContainer: 'help-popup-content',
        confirmButton: 'help-popup-confirm'
      },
      html: `
        <div class="help-popup-inner">
          <!-- Étape 1 -->
          <div class="popup-step">
            <div class="popup-step-number">1</div>
            <div class="popup-step-content">
              <h4>Téléchargez le modèle Excel</h4>
              <p>Cliquez sur le bouton <span class="popup-highlight">"Modèle"</span> pour obtenir un fichier Excel vide avec toutes les colonnes nécessaires.</p>
              <div class="popup-note">💡 Le fichier contient une feuille "Instructions" avec des explications détaillées.</div>
            </div>
          </div>

          <!-- Étape 2 -->
          <div class="popup-step">
            <div class="popup-step-number">2</div>
            <div class="popup-step-content">
              <h4>Remplissez le fichier</h4>
              <p>Ouvrez le fichier Excel et remplissez les colonnes :</p>
              <div class="popup-table-container">
                <table class="popup-table">
                  <thead>
                    <tr>
                      <th>Colonne</th>
                      <th>Description</th>
                      <th>Exemple</th>
                      <th>Règles</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Matricule *</strong></td>
                      <td>Numéro unique d'identification</td>
                      <td><code>EMP001</code></td>
                      <td>• Unique<br>• Max 50 caractères</td>
                    </tr>
                    <tr>
                      <td><strong>Nom *</strong></td>
                      <td>Nom complet</td>
                      <td><code>Mohamed Ali</code></td>
                      <td>• Max 255 caractères</td>
                    </tr>
                    <tr>
                      <td><strong>Email *</strong></td>
                      <td>Adresse email</td>
                      <td><code>mohamed.ali@email.com</code></td>
                      <td>• Format valide<br>• Unique</td>
                    </tr>
                    <tr>
                      <td><strong>Téléphone</strong></td>
                      <td>Avec indicatif</td>
                      <td><code>+21612345678</code></td>
                      <td>• Format international</td>
                    </tr>
                    <tr>
                      <td><strong>Permis</strong></td>
                      <td>Numéro de permis</td>
                      <td><code>B123456</code></td>
                      <td>• Obligatoire pour chauffeurs</td>
                    </tr>
                    <tr>
                      <td><strong>Catégorie *</strong></td>
                      <td>Type d'employé</td>
                      <td><code>DRIVER</code></td>
                      <td>• Doit exister<br>• En majuscules</td>
                    </tr>
                    <tr>
                      <td><strong>Interne</strong></td>
                      <td>Employé interne ?</td>
                      <td><code>OUI</code></td>
                      <td>• OUI ou NON</td>
                    </tr>
                    <tr>
                      <td><strong>Type Véhicule</strong></td>
                      <td>Pour chauffeurs</td>
                      <td><code>Camion 20t</code></td>
                      <td>• Optionnel</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Étape 3 -->
          <div class="popup-step">
            <div class="popup-step-number">3</div>
            <div class="popup-step-content">
              <h4>Validez vos données</h4>
              <ul class="popup-list">
                <li>✓ Supprimez la ligne d'exemple avant de remplir</li>
                <li>✓ Vérifiez qu'il n'y a pas de doublons (matricule et email)</li>
                <li>✓ Les champs marqués * sont obligatoires</li>
              </ul>
            </div>
          </div>

          <!-- Étape 4 -->
          <div class="popup-step">
            <div class="popup-step-number">4</div>
            <div class="popup-step-content">
              <h4>Importez le fichier</h4>
              <p>Cliquez sur <span class="popup-highlight">"Importer"</span>, sélectionnez votre fichier rempli et confirmez l'importation.</p>
              <div class="popup-note">⏱️ L'import peut prendre quelques secondes selon le nombre d'employés.</div>
            </div>
          </div>

          <!-- Notes importantes -->
          <div class="popup-notes">
            <div class="popup-notes-header">
              <span>⚠️</span>
              <strong>Points importants</strong>
            </div>
            <ul class="popup-notes-list">
              <li>Ne modifiez pas les noms des colonnes</li>
              <li>Les doublons sont automatiquement détectés</li>
              <li>Les employés importés sont automatiquement activés</li>
              <li>Testez d'abord avec un petit fichier (2-3 employés)</li>
            </ul>
          </div>
        </div>
      `
    });
  }

  /**
   * Télécharge un modèle Excel vide pour les employés
   */
  downloadEmptyTemplate() {
    try {
      const templateData = [
        {
          'Matricule': '',
          'Nom': '',
          'Email': '',
          'Téléphone': '',
          'Permis': '',
          'Catégorie': '',
          'Interne': '',
          'Type Véhicule': ''
        }
      ];

      const worksheet = XLSX.utils.json_to_sheet(templateData);
      
      worksheet['!cols'] = [
        { wch: 15 }, // Matricule
        { wch: 25 }, // Nom
        { wch: 30 }, // Email
        { wch: 20 }, // Téléphone
        { wch: 15 }, // Permis
        { wch: 20 }, // Catégorie
        { wch: 10 }, // Interne
        { wch: 25 }  // Type Véhicule
      ];

      const instructions = [
        ['📋 INSTRUCTIONS D\'UTILISATION DU MODÈLE'],
        [''],
        ['1. Colonne "Matricule" :', 'Numéro d\'identité unique de l\'employé (ex: EMP001, 12345)'],
        ['   - Maximum 50 caractères'],
        ['   - Doit être unique dans le système'],
        [''],
        ['2. Colonne "Nom" :', 'Nom complet de l\'employé'],
        ['   - Exemple: "Mohamed Ali", "Jean Dupont"'],
        ['   - Maximum 255 caractères'],
        [''],
        ['3. Colonne "Email" :', 'Adresse email professionnelle'],
        ['   - Exemple: "mohamed.ali@entreprise.com"'],
        ['   - Doit être unique'],
        [''],
        ['4. Colonne "Téléphone" :', 'Numéro de téléphone avec indicatif'],
        ['   - Exemple: "+21612345678"'],
        [''],
        ['5. Colonne "Permis" :', 'Numéro de permis de conduire (pour chauffeurs/mécaniciens)'],
        ['   - Optionnel pour certaines catégories'],
        [''],
        ['6. Colonne "Catégorie" :', 'Catégorie d\'employé (DRIVER, MECHANIC, CONVOYEUR, etc.)'],
        ['   - Doit correspondre aux catégories configurées'],
        [''],
        ['7. Colonne "Interne" :', 'Employé interne ? (OUI/NON)'],
        ['   - OUI pour employé de l\'entreprise, NON pour externe'],
        [''],
        ['8. Colonne "Type Véhicule" :', 'Type de véhicule associé (pour chauffeurs uniquement)'],
        ['   - Optionnel, si non spécifié laissé vide'],
        [''],
        ['⚠️ RÈGLES IMPORTANTES :'],
        ['• Les champs Matricule, Nom, Email, Catégorie sont obligatoires'],
        ['• Ne modifiez pas les noms des colonnes'],
        ['• Supprimez la ligne d\'exemple avant de remplir vos données'],
        ['• Les catégories doivent correspondre exactement aux codes configurés (DRIVER, MECHANIC, etc.)']
      ];
      
      const instructionsSheet = XLSX.utils.aoa_to_sheet(instructions);
      instructionsSheet['!cols'] = [{ wch: 25 }, { wch: 60 }];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Modele_Employes');
      XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), 'modele_employes_vide.xlsx');
      
      this.showSuccess('Modèle téléchargé avec succès');
    } catch (error) {
      console.error('Erreur lors du téléchargement du modèle:', error);
      this.showError('Erreur lors du téléchargement du modèle');
    }
  }

  /**
   * Exporte les employés existants vers Excel
   */
  exportToExcel() {
    if (!this.pagedEmployeeData?.data?.length) {
      this.showWarning('Aucune donnée à exporter');
      return;
    }

    try {
      const exportData = this.pagedEmployeeData.data.map(emp => ({
        'Matricule': emp.idNumber,
        'Nom': emp.name,
        'Email': emp.email,
        'Téléphone': emp.phoneNumber,
        'Permis': emp.drivingLicense || '',
        'Catégorie': emp.employeeCategory,
        'Interne': emp.isInternal ? 'OUI' : 'NON',
        'Type Véhicule': emp.typeTruck ? 
          `${emp.typeTruck.type} (${emp.typeTruck.capacity} ${this.loadingUnit})` : '',
        'Statut': emp.isEnable ? 'Actif' : 'Inactif'
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      worksheet['!cols'] = [
        { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 20 },
        { wch: 15 }, { wch: 20 }, { wch: 10 }, { wch: 25 }, { wch: 10 }
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Employes');
      
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const fileName = `employes_${new Date().toISOString().split('T')[0]}.xlsx`;
      saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), fileName);
      
      this.showSuccess('Export réussi');
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      this.showError('Erreur lors de l\'export des données');
    }
  }

  /**
   * Déclenche le sélecteur de fichier pour l'import
   */
  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

onFileSelected(event: any) {
  const file: File = event.target.files[0];
  if (!file) return;

  const allowedExtensions = ['xlsx', 'xls', 'csv'];
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  
  if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
    this.showError('Format de fichier non supporté. Utilisez .xlsx, .xls ou .csv');
    this.clearFileInput();
    return;
  }

  this.isImporting = true;
  
  Swal.fire({
    title: 'Import en cours...',
    text: 'Veuillez patienter pendant le traitement du fichier',
    allowOutsideClick: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });

  const reader = new FileReader();
  
  reader.onload = (e: any) => {
    try {
      const data = new Uint8Array(e.target.result);
      
      // Lire le workbook - defval n'est pas une option ici
      const workbook = XLSX.read(data, { 
        type: 'array',
        cellText: true,
        cellDates: true
      });
      
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      
      // defval va ici, dans sheet_to_json
      let jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
        defval: '',  // Valeur par défaut pour les cellules vides
        raw: false   // Forcer la conversion des nombres en chaînes
      });
      
      // CONVERTIR LES DONNÉES: transformer les nombres en chaînes
      jsonData = jsonData.map((row: any) => {
        const newRow: any = {};
        Object.keys(row).forEach(key => {
          let value = row[key];
          // Convertir les nombres en chaînes pour Matricule, Téléphone et Permis
          if ((key === 'Matricule' || key === 'Téléphone' || key === 'Permis') && typeof value === 'number') {
            value = value.toString();
          }
          // Si la valeur est null ou undefined, mettre une chaîne vide
          if (value === null || value === undefined) {
            value = '';
          }
          newRow[key] = value;
        });
        return newRow;
      });
      
      Swal.close();
      
      if (jsonData.length === 0) {
        this.showWarning('Le fichier est vide');
        this.isImporting = false;
        this.clearFileInput();
        return;
      }
      
      // Afficher les données pour débogage
      console.log('Données lues:', jsonData);
      
      const validData = jsonData.filter((row: any) => {
        const matricule = row['Matricule']?.toString().trim();
        const nom = row['Nom']?.toString().trim();
        const email = row['Email']?.toString().trim();
        const categorie = row['Catégorie']?.toString().trim();
        return matricule && nom && email && categorie;
      });
      
      console.log('Données valides:', validData);
      
      if (validData.length === 0) {
        this.showWarning('Aucune donnée valide trouvée dans le fichier. Vérifiez que les colonnes Matricule, Nom, Email et Catégorie sont remplies.');
        this.isImporting = false;
        this.clearFileInput();
        return;
      }
      
      this.importEmployeesFromData(validData);
    } catch (error) {
      console.error('Erreur lors de la lecture du fichier:', error);
      Swal.close();
      this.showError('Erreur lors de la lecture du fichier: ' + (error instanceof Error ? error.message : 'Erreur inconnue'));
      this.isImporting = false;
      this.clearFileInput();
    }
  };
  
  reader.onerror = () => {
    Swal.close();
    this.showError('Erreur lors de la lecture du fichier');
    this.isImporting = false;
    this.clearFileInput();
  };
  
  reader.readAsArrayBuffer(file);
}

/**
 * Importe les employés à partir des données du fichier
 */
async importEmployeesFromData(data: any[]) {
  try {
    console.log('Données à importer:', data);
    
    const validation = this.validateImportData(data);
    if (!validation.isValid) {
      this.showError(`Erreur de validation:\n${validation.errors.join('\n')}`);
      this.isImporting = false;
      this.clearFileInput();
      return;
    }

    const previewData = data.slice(0, 5).map((row, index) => ({
      '#': index + 1,
      'Matricule': row['Matricule']?.toString().trim(),
      'Nom': row['Nom']?.toString().trim(),
      'Email': row['Email']?.toString().trim(),
      'Catégorie': row['Catégorie']?.toString().trim()
    }));

    const result = await Swal.fire({
      title: 'Confirmation d\'import',
      html: `
        <div style="text-align: left;">
          <p>Vous allez importer <strong>${data.length}</strong> employé(s).</p>
          <p><strong>Aperçu des données:</strong></p>
          <div style="max-height: 300px; overflow: auto;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #f5f5f5;">
                  <th style="padding: 8px; border: 1px solid #ddd;">#</th>
                  <th style="padding: 8px; border: 1px solid #ddd;">Matricule</th>
                  <th style="padding: 8px; border: 1px solid #ddd;">Nom</th>
                  <th style="padding: 8px; border: 1px solid #ddd;">Email</th>
                  <th style="padding: 8px; border: 1px solid #ddd;">Catégorie</th>
                 </tr
              </thead>
              <tbody>
                ${previewData.map(item => `
                  <tr>
                    <td style="padding: 8px; border: 1px solid #ddd;">${item['#']}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${item['Matricule']}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${item['Nom']}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${item['Email']}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${item['Catégorie']}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            ${data.length > 5 ? `<p style="margin-top: 10px;">... et ${data.length - 5} autre(s) ligne(s)</p>` : ''}
          </div>
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Oui, importer',
      cancelButtonText: 'Annuler',
      width: '800px'
    });

    if (!result.isConfirmed) {
      this.isImporting = false;
      this.clearFileInput();
      return;
    }

    Swal.fire({
      title: 'Import en cours...',
      html: 'Veuillez patienter pendant l\'importation des données',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const row of data) {
      try {
        const employeeData = new FormData();
        
        // Convertir les valeurs en chaînes
        employeeData.append('idNumber', row['Matricule']?.toString().trim() || '');
        employeeData.append('name', row['Nom']?.toString().trim() || '');
        employeeData.append('email', row['Email']?.toString().trim() || '');
        employeeData.append('phoneNumber', row['Téléphone']?.toString().trim() || '');
        employeeData.append('drivingLicense', row['Permis']?.toString().trim() || '');
        
        let category = row['Catégorie']?.toString().trim() || '';
        // Trouver la catégorie correspondante
        const categoryOption = this.categoryOptions.find(opt => opt.value === category);
        if (categoryOption) {
          category = categoryOption.value;
        }
        employeeData.append('employeeCategory', category);
        
        const isInternal = row['Interne']?.toString().trim()?.toUpperCase() === 'OUI';
        employeeData.append('isInternal', isInternal ? 'true' : 'false');
        
        // Pour les chauffeurs, essayer de trouver le type de véhicule
        if (category === 'DRIVER' && row['Type Véhicule']) {
          const typeVehiculeStr = row['Type Véhicule']?.toString().trim();
          // Chercher le type de véhicule correspondant
          const typeTruck = this.pagedEmployeeData?.data?.find(e => 
            e.typeTruck?.type === typeVehiculeStr
          )?.typeTruck;
          if (typeTruck) {
            employeeData.append('typeTruckId', typeTruck.id.toString());
          }
        }
        
        console.log('Envoi des données:', Object.fromEntries(employeeData));
        
        await this.httpService.addEmployee(employeeData).toPromise();
        successCount++;
      } catch (error) {
        errorCount++;
        const errorMsg = error instanceof Error ? error.message : 'Erreur inconnue';
        errors.push(`${row['Matricule']}: ${errorMsg}`);
        console.error(`Erreur pour ${row['Matricule']}:`, error);
      }
    }

    Swal.close();

    if (successCount > 0) {
      this.showSuccess(`${successCount} employé(s) importé(s) avec succès${errorCount > 0 ? `, ${errorCount} erreur(s)` : ''}`);
      this.getLatestData();
    } else {
      this.showError('Aucun employé n\'a pu être importé');
    }

    if (errors.length > 0 && errors.length <= 5) {
      setTimeout(() => {
        Swal.fire({
          title: 'Détails des erreurs',
          html: `<div style="text-align: left;">${errors.map(e => `• ${e}`).join('<br>')}</div>`,
          icon: 'warning',
          confirmButtonText: 'OK'
        });
      }, 500);
    }
  } catch (error) {
    console.error('Erreur lors de l\'import:', error);
    Swal.close();
    this.showError('Erreur lors de l\'import des données');
  } finally {
    this.isImporting = false;
    this.clearFileInput();
  }
}
 /**
 * Valide les données d'import
 */
validateImportData(data: any[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const requiredColumns = ['Matricule', 'Nom', 'Email', 'Catégorie'];
  const matriculesSet = new Set<string>();
  const emailsSet = new Set<string>();
  
  console.log('Validation des données:', data);
  
  if (data.length === 0) {
    errors.push('Le fichier est vide');
    return { isValid: false, errors };
  }

  const firstRow = data[0];
  const missingColumns = requiredColumns.filter(col => !firstRow.hasOwnProperty(col));
  
  if (missingColumns.length > 0) {
    errors.push(`Colonnes manquantes: ${missingColumns.join(', ')}`);
    return { isValid: false, errors };
  }

  const validCategories = this.categoryOptions.map(opt => opt.value);
  console.log('Catégories valides:', validCategories);

  data.forEach((row, index) => {
    // Convertir les valeurs en chaînes de caractères
    const matricule = row['Matricule']?.toString().trim();
    const nom = row['Nom']?.toString().trim();
    const email = row['Email']?.toString().trim();
    const categorie = row['Catégorie']?.toString().trim();
    const phone = row['Téléphone']?.toString().trim();
    const permis = row['Permis']?.toString().trim();
    const isInternal = row['Interne']?.toString().trim()?.toUpperCase();
    const typeVehicule = row['Type Véhicule']?.toString().trim();
    
    const lineNum = index + 1;

    // Validation du matricule
    if (!matricule) {
      errors.push(`Ligne ${lineNum}: Matricule requis`);
    } else if (matricule.length > 50) {
      errors.push(`Ligne ${lineNum}: Matricule trop long (max 50 caractères)`);
    } else if (matriculesSet.has(matricule)) {
      errors.push(`Ligne ${lineNum}: Matricule dupliqué "${matricule}"`);
    } else {
      matriculesSet.add(matricule);
    }

    // Validation du nom
    if (!nom) {
      errors.push(`Ligne ${lineNum}: Nom requis`);
    } else if (nom.length > 255) {
      errors.push(`Ligne ${lineNum}: Nom trop long (max 255 caractères)`);
    }

    // Validation de l'email
    if (!email) {
      errors.push(`Ligne ${lineNum}: Email requis`);
    } else if (!/^[^\s@]+@([^\s@]+\.)+[^\s@]+$/.test(email)) {
      errors.push(`Ligne ${lineNum}: Email invalide (ex: nom@domaine.com)`);
    } else if (emailsSet.has(email)) {
      errors.push(`Ligne ${lineNum}: Email dupliqué "${email}"`);
    } else {
      emailsSet.add(email);
    }

    // Validation de la catégorie
    if (!categorie) {
      errors.push(`Ligne ${lineNum}: Catégorie requise`);
    } else if (!validCategories.includes(categorie)) {
      errors.push(`Ligne ${lineNum}: Catégorie "${categorie}" invalide. Valeurs acceptées: ${validCategories.join(', ')}`);
    }

    // Validation du téléphone (optionnel)
    if (phone && !/^\+?[0-9]{8,15}$/.test(phone)) {
      errors.push(`Ligne ${lineNum}: Format de téléphone invalide (ex: 21612345678 ou +21612345678)`);
    }

    // Validation du champ Interne (optionnel)
    if (isInternal && !['OUI', 'NON'].includes(isInternal)) {
      errors.push(`Ligne ${lineNum}: Interne doit être OUI ou NON`);
    }
  });

  console.log('Erreurs de validation:', errors);
  
  return {
    isValid: errors.length === 0,
    errors: errors.slice(0, 20)
  };
}

  /**
   * Nettoie l'input file
   */
  clearFileInput() {
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  // ==================== FIN MÉTHODES D'IMPORT/EXPORT ====================

  exportExcel() {
    this.exportToExcel();
  }

  exportCSV() {
    if (!this.pagedEmployeeData?.data?.length) {
      alert('Aucune donnée à exporter');
      return;
    }

    const csvData = [
      ['ID Number', 'Name', 'Email', 'Phone', 'License', 'Category', 'Internal', 'Truck Type', 'Status'],
      ...this.pagedEmployeeData.data.map((emp: IEmployee) => [
        emp.idNumber,
        emp.name,
        emp.email,
        emp.phoneNumber,
        emp.drivingLicense,
        emp.employeeCategory,
        emp.isInternal ? 'Yes' : 'No',
        emp.typeTruck ? 
          `${emp.typeTruck.type} (${emp.typeTruck.capacity} ${ this.loadingUnit})` : '-',
        emp.isEnable ? 'Active' : 'Inactive'
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'employees.csv');
  }

  exportPDF() {
    if (!this.pagedEmployeeData?.data?.length) {
      alert('Aucune donnée à exporter');
      return;
    }

    const doc = new jsPDF();
    const tableColumn = ['ID Number', 'Name', 'Email', 'Phone', 'License', 'Category', 'Truck Type'];
    const tableRows: any[] = [];

    this.pagedEmployeeData.data.forEach((emp: IEmployee) => {
      tableRows.push([
        emp.idNumber,
        emp.name,
        emp.email,
        emp.phoneNumber,
        emp.drivingLicense,
        emp.employeeCategory,
        emp.typeTruck ? 
          `${emp.typeTruck.type} (${emp.typeTruck.capacity} ${ this.loadingUnit})` : '-'
      ]);
    });

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 10
    });

    doc.save('employees.pdf');
  }

  showSuccess(message: string) {
    Swal.fire({
      icon: 'success',
      title: 'Succès',
      text: message,
      timer: 3000,
      showConfirmButton: false
    });
  }

  showError(message: string) {
    Swal.fire({
      icon: 'error',
      title: 'Erreur',
      text: message,
      confirmButtonText: 'OK'
    });
  }

  showWarning(message: string) {
    Swal.fire({
      icon: 'warning',
      title: 'Attention',
      text: message,
      confirmButtonText: 'OK'
    });
  }
}