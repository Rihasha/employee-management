import React, { useState, useEffect } from 'react';
import { Employee, AttendanceRecord, UserSession } from './types';
import { getStoredEmployees, getStoredAttendance, saveStoredEmployees, saveStoredAttendance } from './utils/mockData';
import LoginView from './components/LoginView';
import AdminDashboard from './components/AdminDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';
import { Database, Wifi, WifiOff } from 'lucide-react';

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [session, setSession] = useState<UserSession | null>(null);
  const [dbStatus, setDbStatus] = useState<{
    connected: boolean;
    mode: string;
    error: string | null;
    config?: any;
  } | null>(null);

  // Load initial datasets from API (MySQL backed) and fall back to localStorage if necessary
  useEffect(() => {
    const loadData = async () => {
      // 1. Fetch DB status
      try {
        const statusRes = await fetch('/api/db-status');
        if (statusRes.ok) {
          const status = await statusRes.json();
          setDbStatus(status);
        }
      } catch (err) {
        console.warn('Could not fetch DB status from API server', err);
        setDbStatus({
          connected: false,
          mode: 'Offline / Standalone Fallback',
          error: 'Could not connect to full-stack API server'
        });
      }

      // 2. Load Employees
      try {
        const empRes = await fetch('/api/employees');
        if (empRes.ok) {
          const emps = await empRes.json();
          setEmployees(emps);
          saveStoredEmployees(emps); // Keep localStorage backup updated
        } else {
          setEmployees(getStoredEmployees());
        }
      } catch (err) {
        console.warn('API error fetching employees, using local storage fallback:', err);
        setEmployees(getStoredEmployees());
      }

      // 3. Load Attendance
      try {
        const attRes = await fetch('/api/attendance');
        if (attRes.ok) {
          const atts = await attRes.json();
          setAttendance(atts);
          saveStoredAttendance(atts); // Keep localStorage backup updated
        } else {
          setAttendance(getStoredAttendance());
        }
      } catch (err) {
        console.warn('API error fetching attendance, using local storage fallback:', err);
        setAttendance(getStoredAttendance());
      }
    };

    loadData();

    // Restore user session if preserved
    const savedSession = localStorage.getItem('company_user_session');
    if (savedSession) {
      try {
        setSession(JSON.parse(savedSession));
      } catch (err) {
        localStorage.removeItem('company_user_session');
      }
    }
  }, []);

  const handleLoginSuccess = (userSession: UserSession) => {
    setSession(userSession);
    localStorage.setItem('company_user_session', JSON.stringify(userSession));
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('company_user_session');
  };

  // Sync changes to backend MySQL database and update frontend state
  const handleEmployeesChange = async (updatedList: Employee[]) => {
    // Diff state to decide API calls
    const oldMap = new Map<string, Employee>(employees.map(e => [e.id, e]));
    const newMap = new Map<string, Employee>(updatedList.map(e => [e.id, e]));

    // 1. Process additions
    for (const [id, emp] of newMap.entries()) {
      if (!oldMap.has(id)) {
        try {
          await fetch('/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(emp),
          });
        } catch (e) {
          console.error('Failed to sync added employee to MySQL database:', e);
        }
      }
    }

    // 2. Process updates
    for (const [id, emp] of newMap.entries()) {
      if (oldMap.has(id)) {
        const oldEmp = oldMap.get(id)!;
        if (JSON.stringify(oldEmp) !== JSON.stringify(emp)) {
          try {
            await fetch(`/api/employees/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(emp),
            });
          } catch (e) {
            console.error('Failed to sync updated employee to MySQL database:', e);
          }
        }
      }
    }

    // 3. Process deletions
    for (const id of oldMap.keys()) {
      if (!newMap.has(id)) {
        try {
          await fetch(`/api/employees/${id}`, {
            method: 'DELETE',
          });
        } catch (e) {
          console.error('Failed to sync deleted employee to MySQL database:', e);
        }
      }
    }

    // Save locally
    setEmployees(updatedList);
    saveStoredEmployees(updatedList);
  };

  // Sync changes to backend MySQL database and update frontend state
  const handleAttendanceChange = async (updatedList: AttendanceRecord[]) => {
    // Diff state to decide API calls
    const oldMap = new Map<string, AttendanceRecord>(attendance.map(a => [a.id, a]));
    const newMap = new Map<string, AttendanceRecord>(updatedList.map(a => [a.id, a]));

    // 1. Process additions
    for (const [id, rec] of newMap.entries()) {
      if (!oldMap.has(id)) {
        try {
          await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rec),
          });
        } catch (e) {
          console.error('Failed to sync new attendance record to MySQL database:', e);
        }
      }
    }

    // 2. Process updates
    for (const [id, rec] of newMap.entries()) {
      if (oldMap.has(id)) {
        const oldRec = oldMap.get(id)!;
        if (JSON.stringify(oldRec) !== JSON.stringify(rec)) {
          try {
            await fetch('/api/attendance', {
              method: 'POST', // Backend handles upsert
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(rec),
            });
          } catch (e) {
            console.error('Failed to sync updated attendance record to MySQL database:', e);
          }
        }
      }
    }

    // 3. Process deletions
    for (const id of oldMap.keys()) {
      if (!newMap.has(id)) {
        try {
          await fetch(`/api/attendance/${id}`, {
            method: 'DELETE',
          });
        } catch (e) {
          console.error('Failed to sync deleted attendance record from MySQL database:', e);
        }
      }
    }

    // Save locally
    setAttendance(updatedList);
    saveStoredAttendance(updatedList);
  };

  return (
    <div id="app-root" className="min-h-screen bg-slate-50 relative">
      
      {/* Real-time database engine connectivity indicator */}
      <div id="db-status-badge" className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-2xl shadow-lg border border-slate-100 text-xs font-semibold select-none">
        {dbStatus?.connected ? (
          <>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Database className="w-3.5 h-3.5 text-slate-700" />
            <span className="text-slate-800">Database: <span className="text-emerald-600">MySQL Connected</span></span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-slate-600">Database: <span className="text-amber-600 font-medium">Local Mock Fallback</span></span>
          </>
        )}
      </div>

      {!session ? (
        <LoginView 
          employees={employees} 
          onLoginSuccess={handleLoginSuccess} 
        />
      ) : session.role === 'admin' ? (
        <AdminDashboard
          session={session}
          employees={employees}
          attendance={attendance}
          onEmployeesChange={handleEmployeesChange}
          onAttendanceChange={handleAttendanceChange}
          onLogout={handleLogout}
        />
      ) : (
        <EmployeeDashboard
          session={session}
          employees={employees}
          attendance={attendance}
          onEmployeesChange={handleEmployeesChange}
          onAttendanceChange={handleAttendanceChange}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
