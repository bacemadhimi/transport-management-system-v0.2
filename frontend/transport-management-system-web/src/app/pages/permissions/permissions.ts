import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { IUserGroup } from '../../types/userGroup';
import { Http } from '../../services/http';

interface Action {
  label: string;
  key: string;
}

interface ModulePermission {
  name: string;
  key: string;
  actions: Action[];
  children?: ModulePermission[]; 
}

@Component({
  selector: 'app-permissions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatButtonModule
  ],
  templateUrl: './permissions.html',
  styleUrls: ['./permissions.scss']
})
export class Permissions {


  roles: IUserGroup[] = [];
modules: ModulePermission[] = [

  // Accueil
    {
      name: 'Accueil',
      key: 'ACCUEIL',
      actions: [{ label: 'Consulter', key: 'VIEW' }]
    },

    // Gestion des chauffeurs
    {
      name: 'Gestion des chauffeurs',
      key: 'CHAUFFEUR',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
        { label: 'Imprimer', key: 'PRINT' },
        { label: 'Approuvé', key: 'APPROVED' } 
      ]
    },

    // Gestion des convoyeurs
    {
      name: 'Gestion des convoyeurs',
      key: 'CONVOYEUR',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
        { label: 'Imprimer', key: 'PRINT' },
        { label: 'Approuvé', key: 'APPROVED' } 
      ]
    },

    // Gestion des véhicules
    {
      name: 'Gestion des véhicules',
      key: 'TRUCK',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
        { label: 'Imprimer', key: 'PRINT' },
         { label: 'Approuvé', key: 'APPROVED' } 
      ]
    },

    // Gestion des commandes
    {
      name: 'Gestion des commandes',
      key: 'ORDER',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Supprimr', key: 'DELETE' },
         { label: 'Charger', key: 'LOAD' } ,
          { label: 'Imprimer', key: 'PRINT' }
      ]
    },

    // Gestion des voyages
    {
      name: 'Gestion des voyages',
      key: 'TRAVEL',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
        { label: 'Imprimer', key: 'PRINT' },
         { label: 'Approuvé', key: 'APPROVED' } 
      ]
    },

    
    // Historique des voyages
    {
      name: 'Historique des voyages',
      key: 'HISTORIQUE_TRAVEL',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
         { label: 'Imprimer', key: 'PRINT' },
          { label: 'Approuvé', key: 'APPROVED' } 
      ]
    },

    
    // Lieux
    {
      name: 'Lieux',
      key: 'LOCATION',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
         { label: 'Imprimer', key: 'PRINT' },
          { label: 'Approuvé', key: 'APPROVED' } 
      ]
    },

    // Gestion des utilisateurs
    {
      name: 'Gestion des utilisateurs',
      key: 'USER',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
         { label: 'Imprimer', key: 'PRINT' },
          { label: 'Approuvé', key: 'APPROVED' } 
      ]
    },

    // Gestion des groupes d’utilisateurs
    {
      name: 'Gestion des groupes d’utilisateurs',
      key: 'USER_GROUP',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
         { label: 'Imprimer', key: 'PRINT' },
          { label: 'Approuvé', key: 'APPROVED' } 
      ]
    },

    // Gestion des permissions
    {
      name: 'Gestion des permissions',
      key: 'PERMISSION',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Modifier', key: 'EDIT' }
      ]
    },

    // Gestion des clients
    {
      name: 'Gestion des clients',
      key: 'CUSTOMER',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
        { label: 'Imprimer', key: 'PRINT' },
         { label: 'Approuvé', key: 'APPROVED' } 
      ]
    },

    // Fournisseurs carburant
    {
      name: 'Fournisseurs carburant',
      key: 'FUEL_VENDOR',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
        { label: 'Imprimer', key: 'PRINT' },
         { label: 'Approuvé', key: 'APPROVED' } 
      ]
    },

    // Carburant
    {
      name: 'Carburant',
      key: 'FUEL',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
         { label: 'Imprimer', key: 'PRINT' },
          { label: 'Approuvé', key: 'APPROVED' } 
      ]
    },

        // Gestion des mécaniciens
    {
      name: 'Gestion des mécaniciens',
      key: 'MECHANIC',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
         { label: 'Imprimer', key: 'PRINT' },
          { label: 'Approuvé', key: 'APPROVED' } 
      ]
    },

    // Gestion des vendeurs
    {
      name: 'Gestion des vendeurs',
      key: 'VENDOR',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
         { label: 'Imprimer', key: 'PRINT' },
          { label: 'Approuvé', key: 'APPROVED' } 
      ]
    },

    // Maintenance Camion
    {
      name: 'Maintenance Camion',
      key: 'TRUCK_MAINTENANCE',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
         { label: 'Imprimer', key: 'PRINT' },
          { label: 'Approuvé', key: 'APPROVED' } 
      ]
    },

    // Heures Supplémentaires
    {
      name: 'Heures Supplémentaires',
      key: 'OVERTIME',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
         { label: 'Imprimer', key: 'PRINT' },
          { label: 'Approuvé', key: 'APPROVED' } 
      ]
    },

    // Disponibilités des chauffeurs
    {
      name: 'Disponibilités des chauffeurs',
      key: 'DRIVER_AVAILABILITY',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
         { label: 'Imprimer', key: 'PRINT' },
          { label: 'Approuvé', key: 'APPROVED' } 
      ]
    },

        // Disponibilités des camions
    {
      name: 'Disponibilités des camions',
      key: 'TRUCK_AVAILABILITY',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
         { label: 'Imprimer', key: 'PRINT' },
          { label: 'Approuvé', key: 'APPROVED' } 
      ]
    },
    // Jours Fériés
    {
      name: 'Jours Fériés',
      key: 'DAYOFF',
      actions: [
        { label: 'Consulter', key: 'VIEW' },
        { label: 'Ajouter', key: 'ADD' },
        { label: 'Modifier', key: 'EDIT' },
        { label: 'Activer', key: 'ENABLE' },
        { label: 'Désactiver', key: 'DISABLE' },
         { label: 'Imprimer', key: 'PRINT' },
          { label: 'Approuvé', key: 'APPROVED' } 
      ]
    },


  ];


  constructor(private httpService: Http) {}

  ngOnInit(): void {
    this.loadRoles();
  }


  loadRoles() {
    this.httpService.getAllRoles().subscribe((groups: IUserGroup[]) => {
      this.roles = groups.map(r => ({
        ...r,
        permissions: {} 
      }));

     
      this.roles.forEach(role => {
        this.httpService.getGroupPermissions(role.id).subscribe((codes: string[]) => {

 
          this.modules.forEach(mod => {
            mod.actions.forEach(act => {
              role.permissions![`${mod.key}_${act.key}`] = false;
            });
          });

          codes.forEach(code => {
            if (role.permissions!.hasOwnProperty(code)) {
              role.permissions![code] = true;
            }
          });

        });
      });
    });
  }

  toggleModule(role: IUserGroup, module: ModulePermission, checked: boolean) {
    module.actions.forEach(act => {
      role.permissions![`${module.key}_${act.key}`] = checked;
    });
  }

  isModuleChecked(role: IUserGroup, module: ModulePermission): boolean {
    return module.actions.every(a => role.permissions![`${module.key}_${a.key}`]);
  }

  save() {
    this.roles.forEach(role => {
      const permissionsToSave = Object.keys(role.permissions!)
        .filter(key => role.permissions![key]);

      this.httpService.saveGroupPermissions(role.id, permissionsToSave).subscribe({
        next: () => console.log(`Permissions sauvegardées pour ${role.name}`),
        error: err => console.error(err)
      });
    });

    alert('Permissions sauvegardées avec succès');
  }
}
