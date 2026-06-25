import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Default Seed Data
const INITIAL_EMPLOYEES = [
  {
    id: "EMP-101",
    name: "Alice Smith",
    username: "alice",
    password: "password123",
    email: "alice.smith@company.com",
    phone: "+1 (555) 019-2834",
    department: "Engineering",
    designation: "Lead Frontend Engineer",
    status: "Active",
    joinedDate: "2024-03-15"
  },
  {
    id: "EMP-102",
    name: "Bob Jones",
    username: "bob",
    password: "password123",
    email: "bob.jones@company.com",
    phone: "+1 (555) 014-9921",
    department: "Sales & Marketing",
    designation: "Senior Account Executive",
    status: "Active",
    joinedDate: "2024-06-20"
  },
  {
    id: "EMP-103",
    name: "Charlie Miller",
    username: "charlie",
    password: "password123",
    email: "charlie.miller@company.com",
    phone: "+1 (555) 017-8839",
    department: "Product & Design",
    designation: "Principal Product Designer",
    status: "Active",
    joinedDate: "2025-01-10"
  },
  {
    id: "EMP-104",
    name: "Diana Prince",
    username: "diana",
    password: "password123",
    email: "diana.prince@company.com",
    phone: "+1 (555) 012-3456",
    department: "Human Resources",
    designation: "HR Manager",
    status: "Active",
    joinedDate: "2023-11-01"
  },
  {
    id: "EMP-105",
    name: "Ethan Hunt",
    username: "ethan",
    password: "password123",
    email: "ethan.hunt@company.com",
    phone: "+1 (555) 011-7788",
    department: "Engineering",
    designation: "Security & DevOps Specialist",
    status: "Active",
    joinedDate: "2024-08-12"
  },
  {
    id: "EMP-106",
    name: "Fiona Gallagher",
    username: "fiona",
    password: "password123",
    email: "fiona.g@company.com",
    phone: "+1 (555) 015-4422",
    department: "Finance",
    designation: "Senior Financial Analyst",
    status: "Inactive",
    joinedDate: "2023-05-15"
  }
];

const seedAttendance = () => {
  const records: any[] = [];
  const dates = ["2026-06-20", "2026-06-21", "2026-06-22", "2026-06-23", "2026-06-24"];
  const statuses = ['Present', 'Present', 'Late', 'Half Day', 'Present'];
  const checkInTimes = ["08:45:12", "08:30:45", "09:24:11", "13:05:22", "08:52:19"];
  const checkOutTimes = ["17:05:00", "17:15:22", "17:00:15", "17:10:00", "17:30:11"];
  const locations = ['Office', 'Remote', 'Office', 'Office', 'Remote'];

  let idCounter = 1000;

  dates.forEach((date, dayIndex) => {
    INITIAL_EMPLOYEES.forEach((emp, empIndex) => {
      if (emp.status === 'Inactive') return;

      let status = statuses[(dayIndex + empIndex) % statuses.length];
      let checkIn = checkInTimes[(dayIndex + empIndex) % checkInTimes.length];
      let checkOut = checkOutTimes[(dayIndex + empIndex) % checkOutTimes.length];
      const loc = locations[(dayIndex + empIndex) % locations.length];

      if ((empIndex + dayIndex) % 7 === 0) {
        status = 'Absent';
        checkIn = '';
        checkOut = '';
      }

      records.push({
        id: `ATT-${idCounter++}`,
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department,
        date: date,
        checkIn: checkIn || null,
        checkOut: checkOut || null,
        status: status,
        location: loc,
        notes: status === 'Late' ? "Traffic delay" : status === 'Absent' ? "Sick leave approved" : "Standard day shift"
      });
    });
  });

  return records;
};

const INITIAL_ATTENDANCE = seedAttendance();

// In-Memory Database Fallback State (if MySQL credentials aren't supplied or connection fails)
let memoryEmployees = JSON.parse(JSON.stringify(INITIAL_EMPLOYEES));
let memoryAttendance = JSON.parse(JSON.stringify(INITIAL_ATTENDANCE));

// Database connection pool setup
let pool: mysql.Pool | null = null;
let isConnected = false;
let dbError: string | null = null;

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'attendance_db',
  connectionLimit: 10,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
};

// Attempt to initialize MySQL database and tables
async function initDatabase() {
  // If no DB_HOST env variable is configured, bypass the local socket connection attempt
  // to avoid throwing confusing ECONNREFUSED errors in the terminal.
  if (!process.env.DB_HOST || process.env.DB_HOST === '127.0.0.1' || process.env.DB_HOST === 'localhost') {
    dbError = "MySQL environment variables not configured. Using local in-memory fallback database.";
    console.log('\x1b[33m%s\x1b[0m', '[Database Config] MySQL DB_HOST is set to default/empty.');
    console.log('\x1b[36m%s\x1b[0m', '[Database Config] Active Mode: Local In-Memory Fallback Store (No socket errors).');
    console.log('[Database Config] To connect to a live MySQL database, configure DB_HOST, DB_USER, DB_PASSWORD, and DB_DATABASE in your environment settings.');
    isConnected = false;
    pool = null;
    return;
  }

  try {
    console.log(`[Database] Attempting connection to MySQL: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    
    // Create a connection without the database selected first, to ensure the database itself exists
    const adminConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
    });

    await adminConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\`;`);
    await adminConnection.end();

    // Now instantiate pool with target database
    pool = mysql.createPool(dbConfig);
    
    // Confirm connection
    const conn = await pool.getConnection();
    console.log('\x1b[32m%s\x1b[0m', '[Database] MySQL pool connected successfully.');
    conn.release();

    // Setup tables
    await setupTables();
    isConnected = true;
    dbError = null;
  } catch (err: any) {
    dbError = err.message || String(err);
    console.error('\x1b[31m%s\x1b[0m', '[Database Error] MySQL connection failed. Falling back to in-memory store.');
    console.error(dbError);
    isConnected = false;
    pool = null;
  }
}

async function setupTables() {
  if (!pool) return;

  // Create Employees Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      username VARCHAR(50) NOT NULL UNIQUE,
      password VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      department VARCHAR(100) NOT NULL,
      designation VARCHAR(100) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'Active',
      joinedDate VARCHAR(20) NOT NULL
    );
  `);

  // Create Attendance Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id VARCHAR(50) PRIMARY KEY,
      employeeId VARCHAR(50) NOT NULL,
      employeeName VARCHAR(100) NOT NULL,
      department VARCHAR(100) NOT NULL,
      date VARCHAR(20) NOT NULL,
      checkIn VARCHAR(20) DEFAULT NULL,
      checkOut VARCHAR(20) DEFAULT NULL,
      status VARCHAR(50) NOT NULL,
      location VARCHAR(20) NOT NULL,
      notes TEXT,
      FOREIGN KEY (employeeId) REFERENCES employees(id) ON DELETE CASCADE
    );
  `);

  // Seed default data if empty
  const [empRows]: any = await pool.query('SELECT COUNT(*) as count FROM employees');
  if (empRows[0].count === 0) {
    console.log('[Database] Seeding default employees...');
    for (const emp of INITIAL_EMPLOYEES) {
      await pool.query(
        'INSERT INTO employees (id, name, username, password, email, phone, department, designation, status, joinedDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [emp.id, emp.name, emp.username, emp.password, emp.email, emp.phone, emp.department, emp.designation, emp.status, emp.joinedDate]
      );
    }
  }

  const [attRows]: any = await pool.query('SELECT COUNT(*) as count FROM attendance');
  if (attRows[0].count === 0) {
    console.log('[Database] Seeding default attendance logs...');
    for (const log of INITIAL_ATTENDANCE) {
      await pool.query(
        'INSERT INTO attendance (id, employeeId, employeeName, department, date, checkIn, checkOut, status, location, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [log.id, log.employeeId, log.employeeName, log.department, log.date, log.checkIn, log.checkOut, log.status, log.location, log.notes]
      );
    }
  }
}

// API: Check database status
app.get('/api/db-status', (req, res) => {
  res.json({
    connected: isConnected,
    mode: isConnected ? 'MySQL Server' : 'In-Memory Fallback Store',
    error: dbError,
    config: {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database
    }
  });
});

// API: Get Employees
app.get('/api/employees', async (req, res) => {
  if (isConnected && pool) {
    try {
      const [rows] = await pool.query('SELECT * FROM employees');
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.json(memoryEmployees);
  }
});

// API: Save/Create Employee
app.post('/api/employees', async (req, res) => {
  const emp = req.body;
  if (!emp.id || !emp.name || !emp.username) {
    res.status(400).json({ error: 'Missing required employee fields' });
    return;
  }

  if (isConnected && pool) {
    try {
      await pool.query(
        'INSERT INTO employees (id, name, username, password, email, phone, department, designation, status, joinedDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [emp.id, emp.name, emp.username, emp.password || 'password123', emp.email || '', emp.phone || '', emp.department || 'Engineering', emp.designation || 'Staff', emp.status || 'Active', emp.joinedDate || new Date().toISOString().split('T')[0]]
      );
      res.status(201).json(emp);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } else {
    memoryEmployees.push(emp);
    res.status(201).json(emp);
  }
});

// API: Update Employee
app.put('/api/employees/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (isConnected && pool) {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      for (const [key, val] of Object.entries(updates)) {
        if (key !== 'id') {
          fields.push(`\`${key}\` = ?`);
          values.push(val);
        }
      }
      values.push(id);

      if (fields.length > 0) {
        await pool.query(`UPDATE employees SET ${fields.join(', ')} WHERE id = ?`, values);
      }
      res.json({ id, ...updates });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } else {
    memoryEmployees = memoryEmployees.map((emp: any) => emp.id === id ? { ...emp, ...updates } : emp);
    res.json({ id, ...updates });
  }
});

// API: Delete Employee
app.delete('/api/employees/:id', async (req, res) => {
  const { id } = req.params;

  if (isConnected && pool) {
    try {
      await pool.query('DELETE FROM employees WHERE id = ?', [id]);
      res.json({ success: true, message: 'Employee deleted' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } else {
    memoryEmployees = memoryEmployees.filter((emp: any) => emp.id !== id);
    memoryAttendance = memoryAttendance.filter((att: any) => att.employeeId !== id);
    res.json({ success: true });
  }
});

// API: Get Attendance
app.get('/api/attendance', async (req, res) => {
  if (isConnected && pool) {
    try {
      const [rows] = await pool.query('SELECT * FROM attendance');
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.json(memoryAttendance);
  }
});

// API: Add Attendance Record
app.post('/api/attendance', async (req, res) => {
  const record = req.body;
  if (!record.id || !record.employeeId || !record.date) {
    res.status(400).json({ error: 'Missing required attendance fields' });
    return;
  }

  if (isConnected && pool) {
    try {
      // Upsert pattern
      const [existing]: any = await pool.query('SELECT * FROM attendance WHERE id = ?', [record.id]);
      if (existing.length > 0) {
        await pool.query(
          'UPDATE attendance SET employeeName = ?, department = ?, date = ?, checkIn = ?, checkOut = ?, status = ?, location = ?, notes = ? WHERE id = ?',
          [record.employeeName, record.department, record.date, record.checkIn, record.checkOut, record.status, record.location, record.notes, record.id]
        );
      } else {
        await pool.query(
          'INSERT INTO attendance (id, employeeId, employeeName, department, date, checkIn, checkOut, status, location, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [record.id, record.employeeId, record.employeeName, record.department, record.date, record.checkIn, record.checkOut, record.status, record.location, record.notes]
        );
      }
      res.status(201).json(record);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const idx = memoryAttendance.findIndex((r: any) => r.id === record.id);
    if (idx !== -1) {
      memoryAttendance[idx] = record;
    } else {
      memoryAttendance.push(record);
    }
    res.status(201).json(record);
  }
});

// API: Update Attendance Record
app.put('/api/attendance/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (isConnected && pool) {
    try {
      const fields: string[] = [];
      const values: any[] = [];
      for (const [key, val] of Object.entries(updates)) {
        if (key !== 'id') {
          fields.push(`\`${key}\` = ?`);
          values.push(val);
        }
      }
      values.push(id);

      if (fields.length > 0) {
        await pool.query(`UPDATE attendance SET ${fields.join(', ')} WHERE id = ?`, values);
      }
      res.json({ id, ...updates });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } else {
    memoryAttendance = memoryAttendance.map((rec: any) => rec.id === id ? { ...rec, ...updates } : rec);
    res.json({ id, ...updates });
  }
});

// API: Delete Attendance Record
app.delete('/api/attendance/:id', async (req, res) => {
  const { id } = req.params;

  if (isConnected && pool) {
    try {
      await pool.query('DELETE FROM attendance WHERE id = ?', [id]);
      res.json({ success: true, message: 'Attendance record deleted' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } else {
    memoryAttendance = memoryAttendance.filter((rec: any) => rec.id !== id);
    res.json({ success: true });
  }
});

// API: Reset database data to default state
app.post('/api/reset', async (req, res) => {
  if (isConnected && pool) {
    try {
      // Temporarily disable foreign key checks to safely truncate
      await pool.query('SET FOREIGN_KEY_CHECKS = 0');
      await pool.query('TRUNCATE TABLE attendance');
      await pool.query('TRUNCATE TABLE employees');
      await pool.query('SET FOREIGN_KEY_CHECKS = 1');

      console.log('[Database Reset] Seeding default employees...');
      for (const emp of INITIAL_EMPLOYEES) {
        await pool.query(
          'INSERT INTO employees (id, name, username, password, email, phone, department, designation, status, joinedDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [emp.id, emp.name, emp.username, emp.password, emp.email, emp.phone, emp.department, emp.designation, emp.status, emp.joinedDate]
        );
      }

      console.log('[Database Reset] Seeding default attendance logs...');
      for (const log of INITIAL_ATTENDANCE) {
        await pool.query(
          'INSERT INTO attendance (id, employeeId, employeeName, department, date, checkIn, checkOut, status, location, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [log.id, log.employeeId, log.employeeName, log.department, log.date, log.checkIn, log.checkOut, log.status, log.location, log.notes]
        );
      }

      res.json({ success: true, message: 'Database reset to default data' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  } else {
    memoryEmployees = JSON.parse(JSON.stringify(INITIAL_EMPLOYEES));
    memoryAttendance = JSON.parse(JSON.stringify(INITIAL_ATTENDANCE));
    res.json({ success: true, message: 'In-memory state reset to defaults' });
  }
});

// Start Express server and mount Vite Middleware
async function startServer() {
  await initDatabase();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Running on http://localhost:${PORT}`);
  });
}

startServer();
