import { Employee, AttendanceRecord } from '../types';

const INITIAL_EMPLOYEES: Employee[] = [
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

// Seed the past 5 days of attendance logs
const seedAttendance = (): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  const employees = INITIAL_EMPLOYEES;
  
  // Date range: 2026-06-20 to 2026-06-24
  const dates = ["2026-06-20", "2026-06-21", "2026-06-22", "2026-06-23", "2026-06-24"];
  const statuses: ('Present' | 'Late' | 'Half Day' | 'Absent')[] = ['Present', 'Present', 'Late', 'Half Day', 'Present'];
  const checkInTimes = ["08:45:12", "08:30:45", "09:24:11", "13:05:22", "08:52:19"];
  const checkOutTimes = ["17:05:00", "17:15:22", "17:00:15", "17:10:00", "17:30:11"];
  const locations: ('Office' | 'Remote')[] = ['Office', 'Remote', 'Office', 'Office', 'Remote'];

  let idCounter = 1000;

  dates.forEach((date, dayIndex) => {
    // Weekend check: ignore June 20, 21 if they are weekends, but for mock display we'll just populate some
    employees.forEach((emp, empIndex) => {
      // Inactive employees shouldn't have logs unless they were active back then. Let's only seed active ones.
      if (emp.status === 'Inactive') return;

      // Add variety
      let status = statuses[(dayIndex + empIndex) % statuses.length];
      let checkIn = checkInTimes[(dayIndex + empIndex) % checkInTimes.length];
      let checkOut = checkOutTimes[(dayIndex + empIndex) % checkOutTimes.length];
      const loc = locations[(dayIndex + empIndex) % locations.length];

      // Occasional absolute absences
      if ((empIndex + dayIndex) % 7 === 0) {
        status = 'Absent';
        checkIn = null;
        checkOut = null;
      }

      records.push({
        id: `ATT-${idCounter++}`,
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department,
        date: date,
        checkIn: checkIn,
        checkOut: checkOut,
        status: status,
        location: loc,
        notes: status === 'Late' ? "Traffic delay" : status === 'Absent' ? "Sick leave approved" : "Standard day shift"
      });
    });
  });

  return records;
};

export const getStoredEmployees = (): Employee[] => {
  const data = localStorage.getItem('company_employees');
  if (!data) {
    localStorage.setItem('company_employees', JSON.stringify(INITIAL_EMPLOYEES));
    return INITIAL_EMPLOYEES;
  }
  return JSON.parse(data);
};

export const saveStoredEmployees = (employees: Employee[]): void => {
  localStorage.setItem('company_employees', JSON.stringify(employees));
};

export const getStoredAttendance = (): AttendanceRecord[] => {
  const data = localStorage.getItem('company_attendance');
  if (!data) {
    const seeded = seedAttendance();
    localStorage.setItem('company_attendance', JSON.stringify(seeded));
    return seeded;
  }
  return JSON.parse(data);
};

export const saveStoredAttendance = (attendance: AttendanceRecord[]): void => {
  localStorage.setItem('company_attendance', JSON.stringify(attendance));
};

// Reset mock data to initial seeded states
export const resetToDefaultData = (): void => {
  localStorage.setItem('company_employees', JSON.stringify(INITIAL_EMPLOYEES));
  const seeded = seedAttendance();
  localStorage.setItem('company_attendance', JSON.stringify(seeded));
};
