import { Injectable } from '@angular/core';
import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';

@Injectable({
  providedIn: 'root'
})
export class SqliteService {
  private sqlite: SQLiteConnection;
  private db!: SQLiteDBConnection;

  constructor() {
    this.sqlite = new SQLiteConnection(CapacitorSQLite);
  }

  // Initialisation de la base et de la table users
  async initDb() {
    try {
      // Crée la connexion à la base locale "user_db"
      this.db = await this.sqlite.createConnection('user_db', false, 'no-encryption', 1,false);
      await this.db.open();

      // Crée la table si elle n'existe pas
      const query = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY NOT NULL,
          username TEXT NOT NULL,
          password TEXT NOT NULL
        );`;
      await this.db.execute(query);

      console.log('Base SQLite initialisée ✅');
    } catch (err) {
      console.error('Erreur SQLite :', err);
    }
  }

  // Enregistrer un utilisateur
  async saveUser(username: string, password: string) {
    try {
      const query = `INSERT INTO users (username, password) VALUES (?, ?)`;
      await this.db.run(query, [username, password]);
      console.log('Utilisateur enregistré localement ✅');
    } catch (err) {
      console.error('Erreur enregistrement utilisateur :', err);
    }
  }

  // Fermer la base
  async closeDb() {
    await this.db.close();
  }
}
