const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

// SQLite database file in the backend directory
const dbPath = path.join(__dirname, 'appointment_booking.db');
const db = new DatabaseSync(dbPath);

// Initialize the 3 Database Entities / Models
function initDB() {
  db.exec(`
    -- 1. User Entity
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      name TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Service Entity
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      duration_minutes INTEGER NOT NULL,
      price INTEGER NOT NULL,
      description TEXT
    );

    -- 3. Appointment Entity
    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      appointment_date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      status TEXT DEFAULT 'Confirmed',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (service_id) REFERENCES services(id)
    );
  `);

  // Seed default services if table is empty
  const serviceCount = db.prepare('SELECT COUNT(*) as count FROM services').get();
  if (Number(serviceCount.count) === 0) {
    const insertService = db.prepare(
      'INSERT INTO services (name, duration_minutes, price, description) VALUES (?, ?, ?, ?)'
    );
    insertService.run('General Health Consultation', 30, 40, 'Routine medical checkup, vitals screening, and wellness consultation.');
    insertService.run('Dental Cleaning & Exam', 45, 65, 'Complete teeth cleaning, plaque removal, and oral health examination.');
    insertService.run('Physiotherapy Session', 60, 85, 'Personalized mobility therapy, rehabilitation exercises, and pain relief.');
    insertService.run('Nutrition & Diet Counseling', 45, 55, 'Tailored nutrition assessment, meal planning, and metabolic guidance.');
  }
}

initDB();

module.exports = db;
