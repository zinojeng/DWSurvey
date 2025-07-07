const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Safe database setup for production deployment
async function setupDatabase() {
  try {
    // Use environment variable or fallback to local path
    const dbPath = path.resolve(process.env.DATABASE_FILE || './database/voting.db');
    const dbDir = path.dirname(dbPath);

    console.log('🔧 Setting up database:', {
      path: dbPath,
      directory: dbDir,
      environment: process.env.NODE_ENV || 'development'
    });

    // Ensure database directory exists
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log(`✅ Created database directory: ${dbDir}`);
    } else {
      console.log(`📁 Database directory exists: ${dbDir}`);
    }

    // Check if database file exists
    const dbExists = fs.existsSync(dbPath);
    console.log(`💾 Database file exists: ${dbExists}`);

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('❌ Database connection failed:', err.message);
          reject(err);
          return;
        }
        console.log('✅ Connected to SQLite database at:', dbPath);
      });

      db.serialize(() => {
        console.log('🔄 Setting up database schema...');
        
        // Create polls table
        db.run(`CREATE TABLE IF NOT EXISTS polls (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          active BOOLEAN DEFAULT 1,
          closed BOOLEAN DEFAULT 0,
          closed_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
          if (err) console.error('Error creating polls table:', err);
          else console.log('✅ Polls table ready');
        });

        // Create questions table
        db.run(`CREATE TABLE IF NOT EXISTS questions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          poll_id INTEGER NOT NULL,
          question_text TEXT NOT NULL,
          question_type TEXT DEFAULT 'single',
          order_index INTEGER DEFAULT 0,
          FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE
        )`, (err) => {
          if (err) console.error('Error creating questions table:', err);
          else console.log('✅ Questions table ready');
        });

        // Create options table
        db.run(`CREATE TABLE IF NOT EXISTS options (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          question_id INTEGER NOT NULL,
          option_text TEXT NOT NULL,
          order_index INTEGER DEFAULT 0,
          FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
        )`, (err) => {
          if (err) console.error('Error creating options table:', err);
          else console.log('✅ Options table ready');
        });

        // Create votes table
        db.run(`CREATE TABLE IF NOT EXISTS votes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          option_id INTEGER NOT NULL,
          session_id TEXT NOT NULL,
          ip_address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (option_id) REFERENCES options(id) ON DELETE CASCADE,
          UNIQUE(option_id, session_id)
        )`, (err) => {
          if (err) console.error('Error creating votes table:', err);
          else console.log('✅ Votes table ready');
        });

        // Verify tables were created correctly
        db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
          if (err) {
            console.error('❌ Error checking tables:', err);
          } else {
            console.log('📋 Tables in database:', tables.map(t => t.name));
          }
        });

        db.close((err) => {
          if (err) {
            console.error('❌ Error closing database:', err.message);
            reject(err);
          } else {
            console.log('✅ Database setup completed successfully!');
            resolve();
          }
        });
      });
    });
  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    throw error;
  }
}

// Database health check function
async function checkDatabaseHealth() {
  try {
    const dbPath = path.resolve(process.env.DATABASE_FILE || './database/voting.db');
    
    if (!fs.existsSync(dbPath)) {
      console.warn('⚠️  Database file does not exist, will create new one');
      return false;
    }

    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('❌ Database health check failed:', err.message);
          resolve(false);
          return;
        }
      });

      // Check if required tables exist
      db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
          console.error('❌ Error checking tables:', err);
          db.close();
          resolve(false);
          return;
        }

        const tableNames = tables.map(t => t.name);
        const requiredTables = ['polls', 'questions', 'options', 'votes'];
        const missingTables = requiredTables.filter(t => !tableNames.includes(t));

        if (missingTables.length > 0) {
          console.warn('⚠️  Missing tables:', missingTables);
          db.close();
          resolve(false);
          return;
        }

        console.log('✅ Database health check passed');
        db.close();
        resolve(true);
      });
    });
  } catch (error) {
    console.error('❌ Database health check error:', error.message);
    return false;
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('🎉 Database setup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupDatabase, checkDatabaseHealth };