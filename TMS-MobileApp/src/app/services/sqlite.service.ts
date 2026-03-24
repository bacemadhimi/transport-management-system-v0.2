import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
  capSQLiteResult,
  capSQLiteOptions
} from '@capacitor-community/sqlite';

export interface Credentials {
  id?: number;
  email: string;
  password: string;
  lastLogin: string;
}

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  private sqlite = new SQLiteConnection(CapacitorSQLite);
  private db!: SQLiteDBConnection;
  private initialized = false;
  private dbName = 'TMS_app.db';
  private dbVersion = 1;
  private isNative = Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios';

  async initializeDatabase() {
    if (this.initialized) return;

    if (Capacitor.getPlatform() === 'web') {
      await CapacitorSQLite.initWebStore();
    }

    await this.createOrOpenDatabase();
    this.initialized = true;
  }

  private async createOrOpenDatabase() {
    try {
      
      this.db = await this.sqlite.createConnection(
        this.dbName,
        false, 
        'no-encryption',
        this.dbVersion,
        false
      );

    
      await this.db.open();

      await this.db.query('PRAGMA journal_mode=DELETE;');
      
      
      await this.db.query('PRAGMA synchronous = FULL;');
      
      
      await this.db.query('PRAGMA cache_size = 2000;');
      
    
      await this.db.query('PRAGMA temp_store = MEMORY;');

      await this.createTable();

      console.log(`✅ Database ${this.dbName} initialized (DELETE mode for Device Explorer)`);
    } catch (error) {
      console.error('❌ Error creating/opening database:', error);
      throw error;
    }
  }

  private async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS user_credentials (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        last_login TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `;

    try {
      await this.db.execute(sql);
      console.log('✅ Table user_credentials ensured');
    } catch (error) {
      console.error('❌ Error creating table:', error);
      throw error;
    }
  }

  
  private async saveDatabaseChanges() {
    if (Capacitor.getPlatform() === 'web') {
      try {
        const saveOptions: capSQLiteOptions = { database: this.dbName };
        await CapacitorSQLite.saveToStore(saveOptions);
        console.log('💾 Web: Database saved to store');
      } catch (error: any) {
        console.error('❌ Web: Error saving to store:', error.message || error);
      }
    }
  }

 
  private async forceDiskWrite(): Promise<void> {
    if (!this.isNative) return;
    
    try {
      
      await this.db.execute('BEGIN IMMEDIATE;');
      await this.db.query('SELECT changes();');
      await this.db.execute('COMMIT;');
      
    
      await this.db.query('PRAGMA schema_version;');
      
      console.log('💾 Forced disk write completed');
    } catch (error) {
      console.warn('⚠️ Disk write failed:', error);
    }
  }

  async saveCredentials(email: string, password: string): Promise<void> {
    console.log('💾 Saving credentials for:', email);
    await this.initializeDatabase();

    const sql = `
      INSERT INTO user_credentials (email, password, last_login)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(email) DO UPDATE SET
        password = excluded.password,
        last_login = excluded.last_login;
    `;

    try {
      const result = await this.db.run(sql, [email.trim(), password.trim()]);
      console.log('✅ Credentials saved, changes:', result.changes);

      
      if (this.isNative) {
        await this.forceDiskWrite();
        
     
        this.logFileLocation();
      }
      
     
      await this.saveDatabaseChanges();
      
    } catch (error) {
      console.error('❌ Error saving credentials:', error);
      throw error;
    }
  }


  async refreshForDeviceExplorer(): Promise<boolean> {
    console.log('🔄 Refreshing for Device Explorer...');
    
    if (!this.isNative) {
      console.log('ℹ️ Web platform - no Device Explorer');
      return false;
    }
    
    try {
      if (this.initialized) {
      
        await this.forceDiskWrite();
      }
      
      this.logFileLocation();
      
      console.log('✅ Ready for Device Explorer viewing');
      return true;
      
    } catch (error) {
      console.error('❌ Refresh failed:', error);
      return false;
    }
  }

  private logFileLocation(): void {
    const packageName = 'io.ionic.starter';
    console.log(`
    📁 FILE LOCATION FOR DEVICE EXPLORER:
    =====================================
    Path: /data/data/${packageName}/databases/${this.dbName.replace('.db', '')}SQLite.db
    
    💡 INSTRUCTIONS:
    1. Open Android Studio Device Explorer
    2. Navigate to: /data/data/${packageName}/databases/
    3. Find: ${this.dbName.replace('.db', '')}SQLite.db
    4. File should show CURRENT timestamp and size
    5. Right-click → Save As to export
    
    🚀 QUICK ADB PULL:
    adb pull /data/data/${packageName}/databases/${this.dbName.replace('.db', '')}SQLite.db
    `);
  }

  async getLastCredentials(): Promise<Credentials | null> {
    await this.initializeDatabase();

    try {
      const res = await this.db.query(
        'SELECT * FROM user_credentials ORDER BY last_login DESC LIMIT 1'
      );

      if (!res.values?.length) {
        console.log('ℹ️ No credentials found');
        return null;
      }

      const u = res.values[0];
      return {
        id: u.id,
        email: u.email,
        password: u.password,
        lastLogin: u.last_login
      };
    } catch (error) {
      console.error('❌ Error retrieving credentials:', error);
      return null;
    }
  }

  async validateCredentials(email: string, password: string): Promise<boolean> {
    await this.initializeDatabase();

    try {
      const res = await this.db.query(
        'SELECT 1 FROM user_credentials WHERE email = ? AND password = ? LIMIT 1',
        [email.trim(), password.trim()]
      );

      return (res.values?.length ?? 0) > 0;
    } catch (error) {
      console.error('❌ Error validating credentials:', error);
      return false;
    }
  }

  async getAllCredentials(): Promise<Credentials[]> {
    await this.initializeDatabase();

    try {
      const res = await this.db.query(
        'SELECT * FROM user_credentials ORDER BY last_login DESC'
      );

      if (!res.values?.length) {
        return [];
      }

      return res.values.map(u => ({
        id: u.id,
        email: u.email,
        password: u.password,
        lastLogin: u.last_login
      }));
    } catch (error) {
      console.error('❌ Error getting all credentials:', error);
      return [];
    }
  }

  async clearAll(): Promise<void> {
    await this.initializeDatabase();
    try {
      const result = await this.db.run('DELETE FROM user_credentials');
      console.log('✅ All credentials cleared, rows deleted:', result.changes);


      if (this.isNative) {
        await this.forceDiskWrite();
      }
      
      await this.saveDatabaseChanges();
    } catch (error) {
      console.error('❌ Error clearing credentials:', error);
      throw error;
    }
  }

  async updateLastLogin(email: string): Promise<void> {
    await this.initializeDatabase();

    const sql = `
      UPDATE user_credentials 
      SET last_login = datetime('now') 
      WHERE email = ?;
    `;

    try {
      const result = await this.db.run(sql, [email.trim()]);
      console.log('✅ Last login updated for:', email, 'rows affected:', result.changes);

     
      if (this.isNative) {
        await this.forceDiskWrite();
      }
      
      await this.saveDatabaseChanges();
    } catch (error) {
      console.error('❌ Error updating last login:', error);
      throw error;
    }
  }

  async deleteCredentials(email: string): Promise<void> {
    await this.initializeDatabase();

    try {
      const result = await this.db.run('DELETE FROM user_credentials WHERE email = ?', [email.trim()]);
      console.log('✅ Credentials deleted for:', email, 'rows affected:', result.changes);

      
      if (this.isNative) {
        await this.forceDiskWrite();
      }
      
      await this.saveDatabaseChanges();
    } catch (error) {
      console.error('❌ Error deleting credentials:', error);
      throw error;
    }
  }

  async checkDatabaseExists(): Promise<boolean> {
    try {
      const result: capSQLiteResult = await this.sqlite.isDatabase(this.dbName);

      if (result && typeof result === 'object') {
        if ('result' in result && typeof result.result === 'boolean') {
          return result.result;
        }
        if ('value' in result && typeof result.value === 'boolean') {
          return result.value;
        }
        if (typeof result === 'boolean') {
          return result;
        }
      }

      return false;
    } catch (error) {
      console.error('❌ Error checking database existence:', error);
      return false;
    }
  }

  async closeDatabase(): Promise<void> {
    if (this.initialized && this.db) {
      try {
      
        if (this.isNative) {
          await this.forceDiskWrite();
        }
        
        await this.db.close();
        this.initialized = false;
        console.log('✅ Database closed');
      } catch (error) {
        console.error('❌ Error closing database:', error);
      }
    }
  }

  async getDatabaseInfo(): Promise<any> {
    try {
      const dbExists = await this.checkDatabaseExists();
      const credentials = await this.getAllCredentials();
      
      let journalMode = 'UNKNOWN';
      let pageSize = 0;
      
      if (this.initialized) {
        try {
          const journalRes = await this.db.query('PRAGMA journal_mode;');
          journalMode = journalRes.values?.[0]?.journal_mode || 'UNKNOWN';
          
          const pageRes = await this.db.query('PRAGMA page_size;');
          pageSize = pageRes.values?.[0]?.page_size || 0;
        } catch (error) {
          console.warn('⚠️ Could not get PRAGMA info:', error);
        }
      }

      return {
        name: this.dbName,
        exists: dbExists,
        platform: Capacitor.getPlatform(),
        initialized: this.initialized,
        recordCount: credentials.length,
        journal_mode: journalMode,
        page_size: pageSize,
        isNative: this.isNative,
        filePath: `/data/data/io.ionic.starter/databases/${this.dbName.replace('.db', '')}SQLite.db`
      };
    } catch (error) {
      console.error('❌ Error getting database info:', error);
      return null;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.initializeDatabase();
      await this.db.query('SELECT 1 as test');
      console.log('✅ Database connection test passed');
      return true;
    } catch (error) {
      console.error('❌ Database connection test failed:', error);
      return false;
    }
  }

  async countCredentials(): Promise<number> {
    await this.initializeDatabase();

    try {
      const res = await this.db.query('SELECT COUNT(*) as count FROM user_credentials');
      return res.values?.[0]?.count || 0;
    } catch (error) {
      console.error('❌ Error counting credentials:', error);
      return 0;
    }
  }

  getPlatform(): string {
    return Capacitor.getPlatform();
  }
  
 
  async getStats(): Promise<any> {
    const credentials = await this.getAllCredentials();
    
    return {
      totalRecords: credentials.length,
      lastRecord: credentials[0] || null,
      oldestRecord: credentials[credentials.length - 1] || null,
      uniqueEmails: new Set(credentials.map(c => c.email)).size
    };
  }
}