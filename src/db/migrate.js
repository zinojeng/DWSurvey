const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const dbPath = path.resolve(process.env.DATABASE_FILE || './database/voting.db');
const db = new sqlite3.Database(dbPath);

// Database migration script to fix existing databases
db.serialize(() => {
  console.log('Running database migrations...');
  
  // Check if closed column exists in polls table
  db.all("PRAGMA table_info(polls)", (err, columns) => {
    if (err) {
      console.error('Error checking polls table:', err);
      return;
    }
    
    const hasClosedColumn = columns.some(col => col.name === 'closed');
    const hasClosedAtColumn = columns.some(col => col.name === 'closed_at');
    
    if (!hasClosedColumn) {
      console.log('Adding closed column to polls table...');
      db.run("ALTER TABLE polls ADD COLUMN closed BOOLEAN DEFAULT 0", (err) => {
        if (err) {
          console.error('Error adding closed column:', err);
        } else {
          console.log('✅ Added closed column to polls table');
        }
      });
    } else {
      console.log('✅ Closed column already exists');
    }
    
    if (!hasClosedAtColumn) {
      console.log('Adding closed_at column to polls table...');
      db.run("ALTER TABLE polls ADD COLUMN closed_at DATETIME", (err) => {
        if (err) {
          console.error('Error adding closed_at column:', err);
        } else {
          console.log('✅ Added closed_at column to polls table');
        }
      });
    } else {
      console.log('✅ Closed_at column already exists');
    }
    
    console.log('Database migration completed!');
    db.close();
  });
});