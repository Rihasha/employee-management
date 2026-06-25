export interface Employee {
  id: string;
  name: string;
  username: string;
  password?: string; // Stored plaintext for local mock purposes
  email: string;
  phone: string;
  department: string;
  designation: string;
  status: 'Active' | 'Inactive';
  joinedDate: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  date: string; // YYYY-MM-DD
  checkIn: string | null; // HH:MM:SS
  checkOut: string | null; // HH:MM:SS
  status: 'Present' | 'Late' | 'Half Day' | 'Absent';
  location: 'Office' | 'Remote';
  notes: string;
}

export type UserRole = 'admin' | 'employee';

export interface UserSession {
  role: UserRole;
  employeeId?: string; // present if role is 'employee'
  username: string;
  name: string;
}

export interface DepartmentStats {
  department: string;
  total: number;
  active: number;
  attendanceRate: number;
}
