import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, UserPlus, Calendar, LogOut, Plus, Search, Filter, 
  Edit2, Trash2, Download, RefreshCw, Clock, MapPin, 
  Building2, CheckCircle2, XCircle, AlertTriangle, FileSpreadsheet, 
  UserCheck, ShieldAlert, KeyRound, Mail, Phone, ChevronRight
} from 'lucide-react';
import { Employee, AttendanceRecord, UserSession } from '../types';
import { saveStoredEmployees, saveStoredAttendance, resetToDefaultData } from '../utils/mockData';

interface AdminDashboardProps {
  session: UserSession;
  employees: Employee[];
  attendance: AttendanceRecord[];
  onEmployeesChange: (updated: Employee[]) => void;
  onAttendanceChange: (updated: AttendanceRecord[]) => void;
  onLogout: () => void;
}

export default function AdminDashboard({
  session,
  employees,
  attendance,
  onEmployeesChange,
  onAttendanceChange,
  onLogout
}: AdminDashboardProps) {
  // Navigation Tabs
  const [activeTab, setActiveTab] = useState<'analytics' | 'employees' | 'attendance'>('analytics');

  // Directory Filters & Search
  const [empSearch, setEmpSearch] = useState('');
  const [empDeptFilter, setEmpDeptFilter] = useState('');
  const [empStatusFilter, setEmpStatusFilter] = useState('');

  // Attendance Filters & Search
  const [attSearch, setAttSearch] = useState('');
  const [attDeptFilter, setAttDeptFilter] = useState('');
  const [attStatusFilter, setAttStatusFilter] = useState('');
  const [attDateFilter, setAttDateFilter] = useState('');

  // Employee CRUD Modals
  const [showAddEmpModal, setShowAddEmpModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);

  // New Employee Form State
  const [empId, setEmpId] = useState('');
  const [empName, setEmpName] = useState('');
  const [empUsername, setEmpUsername] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPhone, setEmpPhone] = useState('');
  const [empDepartment, setEmpDepartment] = useState('Engineering');
  const [empDesignation, setEmpDesignation] = useState('');
  const [empStatus, setEmpStatus] = useState<'Active' | 'Inactive'>('Active');
  const [formError, setFormError] = useState('');

  // Manual Attendance Form State
  const [showAddAttModal, setShowAddAttModal] = useState(false);
  const [editingAtt, setEditingAtt] = useState<AttendanceRecord | null>(null);
  
  const [attEmpId, setAttEmpId] = useState('');
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attCheckIn, setAttCheckIn] = useState('09:00');
  const [attCheckOut, setAttCheckOut] = useState('17:00');
  const [attStatus, setAttStatus] = useState<'Present' | 'Late' | 'Half Day' | 'Absent'>('Present');
  const [attLocation, setAttLocation] = useState<'Office' | 'Remote'>('Office');
  const [attNotes, setAttNotes] = useState('');

  // Custom alert and confirmation dialog states (to bypass sandbox iframe blockages)
  const [deleteEmpConfirm, setDeleteEmpConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleteAttConfirm, setDeleteAttConfirm] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const departments = ['Engineering', 'Sales & Marketing', 'Product & Design', 'Human Resources', 'Finance'];

  // Calculate high-fidelity metrics
  const metrics = useMemo(() => {
    const total = employees.length;
    const active = employees.filter(e => e.status === 'Active').length;
    const inactive = total - active;

    // Attendance Rate
    const pastRecords = attendance.filter(r => r.status !== 'Absent');
    const totalRecords = attendance.length;
    const rate = totalRecords > 0 ? Math.round((pastRecords.length / totalRecords) * 100) : 100;

    // Late Today / Late logs count
    const lateCount = attendance.filter(r => r.status === 'Late').length;
    const absentCount = attendance.filter(r => r.status === 'Absent').length;

    // Department Distribution stats
    const deptStats = departments.map(dept => {
      const deptEmps = employees.filter(e => e.department === dept);
      const activeDeptEmps = deptEmps.filter(e => e.status === 'Active');
      const deptAtt = attendance.filter(r => r.department === dept);
      const deptAttPresent = deptAtt.filter(r => r.status !== 'Absent');
      
      const attRate = deptAtt.length > 0 ? Math.round((deptAttPresent.length / deptAtt.length) * 100) : 100;
      return {
        department: dept,
        total: deptEmps.length,
        active: activeDeptEmps.length,
        attendanceRate: attRate
      };
    });

    return {
      total,
      active,
      inactive,
      rate,
      lateCount,
      absentCount,
      deptStats
    };
  }, [employees, attendance]);

  // Filter Employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = 
        emp.name.toLowerCase().includes(empSearch.toLowerCase()) ||
        emp.id.toLowerCase().includes(empSearch.toLowerCase()) ||
        emp.username.toLowerCase().includes(empSearch.toLowerCase()) ||
        emp.email.toLowerCase().includes(empSearch.toLowerCase());
      const matchesDept = empDeptFilter === '' || emp.department === empDeptFilter;
      const matchesStatus = empStatusFilter === '' || emp.status === empStatusFilter;
      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [employees, empSearch, empDeptFilter, empStatusFilter]);

  // Filter Attendance Logs
  const filteredAttendance = useMemo(() => {
    return attendance.filter(record => {
      const matchesSearch = 
        record.employeeName.toLowerCase().includes(attSearch.toLowerCase()) ||
        record.employeeId.toLowerCase().includes(attSearch.toLowerCase()) ||
        (record.notes && record.notes.toLowerCase().includes(attSearch.toLowerCase()));
      const matchesDept = attDeptFilter === '' || record.department === attDeptFilter;
      const matchesStatus = attStatusFilter === '' || record.status === attStatusFilter;
      const matchesDate = attDateFilter === '' || record.date === attDateFilter;
      return matchesSearch && matchesDept && matchesStatus && matchesDate;
    }).sort((a, b) => b.date.localeCompare(a.date)); // Sort latest date first
  }, [attendance, attSearch, attDeptFilter, attStatusFilter, attDateFilter]);

  // Create Employee
  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!empId.trim() || !empName.trim() || !empUsername.trim() || !empPassword.trim() || !empDesignation.trim()) {
      setFormError('Please fill in all required fields.');
      return;
    }

    // Check duplicate ID
    if (employees.some(emp => emp.id.toUpperCase() === empId.toUpperCase().trim())) {
      setFormError('An employee with this ID already exists.');
      return;
    }

    // Check duplicate Username
    if (employees.some(emp => emp.username.toLowerCase() === empUsername.toLowerCase().trim())) {
      setFormError('Username is already taken by another employee.');
      return;
    }

    const newEmp: Employee = {
      id: empId.trim().toUpperCase(),
      name: empName.trim(),
      username: empUsername.trim().toLowerCase(),
      password: empPassword,
      email: empEmail.trim() || `${empUsername.trim().toLowerCase()}@company.com`,
      phone: empPhone.trim() || '+1 (555) 000-0000',
      department: empDepartment,
      designation: empDesignation.trim(),
      status: empStatus,
      joinedDate: new Date().toISOString().split('T')[0]
    };

    const updatedList = [...employees, newEmp];
    onEmployeesChange(updatedList);
    saveStoredEmployees(updatedList);
    
    // Reset form and close modal
    resetEmpForm();
    setShowAddEmpModal(false);
  };

  // Edit Employee
  const handleEditEmployee = (emp: Employee) => {
    setEditingEmp(emp);
    setEmpId(emp.id);
    setEmpName(emp.name);
    setEmpUsername(emp.username);
    setEmpPassword(emp.password || '');
    setEmpEmail(emp.email);
    setEmpPhone(emp.phone);
    setEmpDepartment(emp.department);
    setEmpDesignation(emp.designation);
    setEmpStatus(emp.status);
  };

  const handleUpdateEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!empName.trim() || !empUsername.trim() || !empPassword.trim() || !empDesignation.trim()) {
      setFormError('Please fill in all required fields.');
      return;
    }

    // Username check excluding current editing employee
    if (employees.some(emp => emp.id !== editingEmp?.id && emp.username.toLowerCase() === empUsername.toLowerCase().trim())) {
      setFormError('Username is already taken.');
      return;
    }

    const updatedList = employees.map(emp => {
      if (emp.id === editingEmp?.id) {
        return {
          ...emp,
          name: empName.trim(),
          username: empUsername.trim().toLowerCase(),
          password: empPassword,
          email: empEmail.trim(),
          phone: empPhone.trim(),
          department: empDepartment,
          designation: empDesignation.trim(),
          status: empStatus
        };
      }
      return emp;
    });

    onEmployeesChange(updatedList);
    saveStoredEmployees(updatedList);

    // Also cascade Name & Department changes to attendance records if modified
    const updatedAtt = attendance.map(record => {
      if (record.employeeId === editingEmp?.id) {
        return {
          ...record,
          employeeName: empName.trim(),
          department: empDepartment
        };
      }
      return record;
    });
    onAttendanceChange(updatedAtt);
    saveStoredAttendance(updatedAtt);

    setEditingEmp(null);
    resetEmpForm();
  };

  // Delete Employee & cascade delete attendance records (relational integrity check)
  const handleDeleteEmployee = (id: string, name: string) => {
    setDeleteEmpConfirm({ id, name });
  };

  const confirmDeleteEmployee = () => {
    if (!deleteEmpConfirm) return;
    const { id } = deleteEmpConfirm;
    const updatedEmps = employees.filter(emp => emp.id !== id);
    const updatedAtts = attendance.filter(rec => rec.employeeId !== id);
    
    onEmployeesChange(updatedEmps);
    saveStoredEmployees(updatedEmps);
    
    onAttendanceChange(updatedAtts);
    saveStoredAttendance(updatedAtts);
    
    setDeleteEmpConfirm(null);
  };

  const resetEmpForm = () => {
    setEmpId('');
    setEmpName('');
    setEmpUsername('');
    setEmpPassword('');
    setEmpEmail('');
    setEmpPhone('');
    setEmpDepartment('Engineering');
    setEmpDesignation('');
    setEmpStatus('Active');
    setFormError('');
  };

  // Add/Override Attendance Record
  const handleAddAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attEmpId || !attDate) {
      setAlertMessage('Please select an employee and a valid date.');
      return;
    }

    const targetEmp = employees.find(emp => emp.id === attEmpId);
    if (!targetEmp) return;

    // Check if duplicate date record already exists for this employee
    const duplicateIndex = attendance.findIndex(
      r => r.employeeId === attEmpId && r.date === attDate
    );

    const record: AttendanceRecord = {
      id: duplicateIndex >= 0 ? attendance[duplicateIndex].id : `ATT-${Date.now()}`,
      employeeId: targetEmp.id,
      employeeName: targetEmp.name,
      department: targetEmp.department,
      date: attDate,
      checkIn: attStatus !== 'Absent' ? `${attCheckIn}:00` : null,
      checkOut: attStatus !== 'Absent' ? `${attCheckOut}:00` : null,
      status: attStatus,
      location: attLocation,
      notes: attNotes.trim() || 'Manual Admin Override'
    };

    let updatedAttendance = [...attendance];
    if (duplicateIndex >= 0) {
      // Update existing record
      updatedAttendance[duplicateIndex] = record;
    } else {
      // Create new record
      updatedAttendance.push(record);
    }

    onAttendanceChange(updatedAttendance);
    saveStoredAttendance(updatedAttendance);
    setShowAddAttModal(false);
    resetAttForm();
  };

  const resetAttForm = () => {
    setAttEmpId('');
    setAttDate(new Date().toISOString().split('T')[0]);
    setAttCheckIn('09:00');
    setAttCheckOut('17:00');
    setAttStatus('Present');
    setAttLocation('Office');
    setAttNotes('');
  };

  // Delete Attendance Log
  const handleDeleteAttendance = (recordId: string) => {
    setDeleteAttConfirm(recordId);
  };

  const confirmDeleteAttendance = () => {
    if (!deleteAttConfirm) return;
    const updated = attendance.filter(r => r.id !== deleteAttConfirm);
    onAttendanceChange(updated);
    saveStoredAttendance(updated);
    setDeleteAttConfirm(null);
  };

  // Quick Action: Pre-populate attendance editing
  const handleEditAttendance = (record: AttendanceRecord) => {
    setEditingAtt(record);
    setAttEmpId(record.employeeId);
    setAttDate(record.date);
    setAttCheckIn(record.checkIn ? record.checkIn.substring(0, 5) : '09:00');
    setAttCheckOut(record.checkOut ? record.checkOut.substring(0, 5) : '17:00');
    setAttStatus(record.status);
    setAttLocation(record.location);
    setAttNotes(record.notes);
    setShowAddAttModal(true);
  };

  // CSV Exporter Utility
  const exportToCSV = () => {
    const headers = ['Record ID', 'Employee ID', 'Employee Name', 'Department', 'Date', 'Check-In', 'Check-Out', 'Status', 'Location', 'Notes'];
    const rows = filteredAttendance.map(r => [
      r.id,
      r.employeeId,
      r.employeeName,
      r.department,
      r.date,
      r.checkIn || 'N/A',
      r.checkOut || 'N/A',
      r.status,
      r.location,
      r.notes || ''
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Master_Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetAppMock = () => {
    setShowResetConfirm(true);
  };

  const confirmResetAppMock = async () => {
    try {
      await fetch('/api/reset', { method: 'POST' });
    } catch (e) {
      console.warn('API reset failed, falling back to local storage reset:', e);
    }
    resetToDefaultData();
    setShowResetConfirm(false);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Professional Admin Bar */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 flex items-center justify-between shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl text-white">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-none">Console Manager</h1>
            <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Admin Control Room
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:block text-right">
            <p className="text-sm font-semibold text-slate-800">{session.name}</p>
            <p className="text-slate-400 text-xs font-mono">{session.username}@admin</p>
          </div>
          
          <button
            onClick={handleResetAppMock}
            title="Reset Mock Database"
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Reset Database</span>
          </button>

          <button
            onClick={onLogout}
            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        
        {/* Navigation Sidebar */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-1.5">
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
            >
              <Calendar className="w-4.5 h-4.5" />
              Overview Analytics
            </button>
            <button
              onClick={() => setActiveTab('employees')}
              className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors ${
                activeTab === 'employees'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
            >
              <Users className="w-4.5 h-4.5" />
              Employee Directory
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors ${
                activeTab === 'attendance'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
            >
              <FileSpreadsheet className="w-4.5 h-4.5" />
              Master Attendance
            </button>
          </div>
        </aside>

        {/* Primary Content Viewport */}
        <main className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            
            {/* OVERVIEW ANALYTICS TAB */}
            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Statistics Bento Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Headcount</p>
                      <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{metrics.total}</h3>
                      <p className="text-emerald-600 text-xs font-medium mt-1">Active: {metrics.active}</p>
                    </div>
                    <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Attendance Rate</p>
                      <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{metrics.rate}%</h3>
                      <p className="text-slate-500 text-xs mt-1">Avg check-in metrics</p>
                    </div>
                    <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                      <UserCheck className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Late Arrivals</p>
                      <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{metrics.lateCount}</h3>
                      <p className="text-amber-600 text-xs font-medium mt-1">Needs attention</p>
                    </div>
                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                      <Clock className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Absences Logged</p>
                      <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{metrics.absentCount}</h3>
                      <p className="text-rose-600 text-xs font-medium mt-1">Approved/Unapproved</p>
                    </div>
                    <div className="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                {/* Main Visual Stats */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Department distribution rate bar charts */}
                  <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-base font-bold text-slate-900 mb-5">Department Breakdown &amp; Performance</h3>
                    <div className="space-y-5">
                      {metrics.deptStats.map(stat => (
                        <div key={stat.department} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-800">{stat.department}</span>
                            <span className="text-slate-500 font-medium">
                              {stat.total} Emps • <span className="text-indigo-600 font-semibold">{stat.attendanceRate}% Att. Rate</span>
                            </span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                            <div 
                              style={{ width: `${stat.attendanceRate}%` }}
                              className="bg-indigo-600 h-full rounded-full"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Operational Summary */}
                  <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 mb-4">Operations Diagnostics</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-2 border-b border-slate-100 text-xs">
                          <span className="text-slate-500 font-medium">Total Registers</span>
                          <span className="font-bold text-slate-900">{employees.length}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-slate-100 text-xs">
                          <span className="text-slate-500 font-medium">Active Accounts</span>
                          <span className="font-bold text-emerald-600">{metrics.active}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-slate-100 text-xs">
                          <span className="text-slate-500 font-medium">Inactive/Disabled</span>
                          <span className="font-bold text-slate-400">{metrics.inactive}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-slate-100 text-xs">
                          <span className="text-slate-500 font-medium">Total Logs Saved</span>
                          <span className="font-bold text-slate-900">{attendance.length}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                      <p className="text-xs text-slate-400 italic">
                        All stats computed dynamically from secure local relational states.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recent Activities Feed */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-base font-bold text-slate-900 mb-4">Recent Clock Actions</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold">
                          <th className="py-3 px-2">Employee</th>
                          <th className="py-3 px-2">Department</th>
                          <th className="py-3 px-2">Date</th>
                          <th className="py-3 px-2">Time (In/Out)</th>
                          <th className="py-3 px-2">Status</th>
                          <th className="py-3 px-2">Location</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {attendance.slice(0, 5).map(record => (
                          <tr key={record.id} className="hover:bg-slate-50/50 transition-all">
                            <td className="py-3.5 px-2 font-semibold text-slate-800">{record.employeeName}</td>
                            <td className="py-3.5 px-2 text-slate-500 font-medium">{record.department}</td>
                            <td className="py-3.5 px-2 text-slate-500 font-mono">{record.date}</td>
                            <td className="py-3.5 px-2 font-mono">
                              {record.checkIn ? `${record.checkIn.substring(0, 5)}` : 'N/A'} - {record.checkOut ? `${record.checkOut.substring(0, 5)}` : 'N/A'}
                            </td>
                            <td className="py-3.5 px-2">
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                record.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                record.status === 'Late' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                record.status === 'Half Day' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                'bg-rose-50 text-rose-700 border border-rose-100'
                              }`}>
                                {record.status}
                              </span>
                            </td>
                            <td className="py-3.5 px-2">
                              <span className="inline-flex items-center gap-1 font-semibold text-slate-600">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                {record.location}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </motion.div>
            )}

            {/* EMPLOYEE DIRECTORY TAB */}
            {activeTab === 'employees' && (
              <motion.div
                key="employees"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Control Panel Directory */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-600" />
                      Employee Roster Directory ({filteredEmployees.length})
                    </h3>

                    <button
                      onClick={() => {
                        resetEmpForm();
                        setEditingEmp(null);
                        // Generate a dummy auto-increment EMP ID
                        const nextIdNum = employees.length > 0 
                          ? Math.max(...employees.map(e => {
                              const match = e.id.match(/\d+/);
                              return match ? parseInt(match[0]) : 0;
                            })) + 1 
                          : 101;
                        setEmpId(`EMP-${nextIdNum}`);
                        setShowAddEmpModal(true);
                      }}
                      className="inline-flex items-center gap-2 py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md shadow-indigo-100"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add New Employee
                    </button>
                  </div>

                  {/* Multi Filters and Searching */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                        <Search className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        placeholder="Search ID, name, email..."
                        value={empSearch}
                        onChange={(e) => setEmpSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                      />
                    </div>

                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                        <Building2 className="w-4 h-4" />
                      </span>
                      <select
                        value={empDeptFilter}
                        onChange={(e) => setEmpDeptFilter(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                      >
                        <option value="">All Departments</option>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>

                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                        <Filter className="w-4 h-4" />
                      </span>
                      <select
                        value={empStatusFilter}
                        onChange={(e) => setEmpStatusFilter(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-950 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                      >
                        <option value="">All Statuses</option>
                        <option value="Active">Active Only</option>
                        <option value="Inactive">Deactivated Only</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Master Roster List Table */}
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                          <th className="py-3 px-4">EMP ID</th>
                          <th className="py-3 px-4">Employee</th>
                          <th className="py-3 px-4">Portal Login Details</th>
                          <th className="py-3 px-4">Department</th>
                          <th className="py-3 px-4">Joined Date</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredEmployees.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400 text-sm font-medium">
                              No employees found matching the filters.
                            </td>
                          </tr>
                        ) : (
                          filteredEmployees.map(emp => (
                            <tr key={emp.id} className="hover:bg-slate-50/50 transition-all">
                              <td className="py-4 px-4 font-mono font-bold text-indigo-600">{emp.id}</td>
                              <td className="py-4 px-4">
                                <div className="font-semibold text-slate-900">{emp.name}</div>
                                <div className="text-slate-400 text-[10px]">{emp.designation}</div>
                              </td>
                              <td className="py-4 px-4 space-y-0.5">
                                <div className="text-slate-700 font-mono text-[11px] flex items-center gap-1">
                                  <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                                  U: <span className="font-semibold">{emp.username}</span>
                                </div>
                                <div className="text-slate-400 font-mono text-[10px] flex items-center gap-1">
                                  <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                                  P: <span className="font-semibold text-slate-700 select-all">{emp.password}</span>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <span className="font-medium text-slate-600">{emp.department}</span>
                              </td>
                              <td className="py-4 px-4 text-slate-500 font-mono">{emp.joinedDate}</td>
                              <td className="py-4 px-4">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  emp.status === 'Active' 
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                    : 'bg-rose-50 text-rose-700 border border-rose-100'
                                }`}>
                                  {emp.status}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right">
                                <div className="inline-flex gap-2">
                                  <button
                                    onClick={() => handleEditEmployee(emp)}
                                    title="Edit Employee details"
                                    className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-lg transition-colors"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                                    title="Delete Employee profile"
                                    className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* MODAL: ADD / EDIT EMPLOYEE */}
                {(showAddEmpModal || editingEmp) && (
                  <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100"
                    >
                      <div className="bg-indigo-600 p-5 text-white flex items-center justify-between">
                        <h4 className="text-sm font-bold flex items-center gap-2">
                          <UserPlus className="w-5 h-5" />
                          {editingEmp ? `Edit Profile: ${editingEmp.name}` : 'Register New Employee Account'}
                        </h4>
                        <button
                          onClick={() => {
                            setShowAddEmpModal(false);
                            setEditingEmp(null);
                            resetEmpForm();
                          }}
                          className="text-white/80 hover:text-white"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>

                      <form onSubmit={editingEmp ? handleUpdateEmployee : handleAddEmployee} className="p-6 space-y-4">
                        {formError && (
                          <div className="p-3 bg-rose-50 text-rose-700 text-xs rounded-xl flex items-center gap-2 font-semibold">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <span>{formError}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Employee ID (EMP-XXX)</label>
                            <input
                              type="text"
                              value={empId}
                              onChange={(e) => setEmpId(e.target.value)}
                              disabled={!!editingEmp}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 disabled:opacity-60"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
                            <input
                              type="text"
                              value={empName}
                              onChange={(e) => setEmpName(e.target.value)}
                              placeholder="e.g. Alice Smith"
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Portal Login Username</label>
                            <input
                              type="text"
                              value={empUsername}
                              onChange={(e) => setEmpUsername(e.target.value)}
                              placeholder="e.g. alice"
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Portal Password</label>
                            <input
                              type="text"
                              value={empPassword}
                              onChange={(e) => setEmpPassword(e.target.value)}
                              placeholder="e.g. password123"
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
                            <input
                              type="email"
                              value={empEmail}
                              onChange={(e) => setEmpEmail(e.target.value)}
                              placeholder="e.g. alice@company.com"
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Number</label>
                            <input
                              type="text"
                              value={empPhone}
                              onChange={(e) => setEmpPhone(e.target.value)}
                              placeholder="e.g. +1 (555) 019-2834"
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Department</label>
                            <select
                              value={empDepartment}
                              onChange={(e) => setEmpDepartment(e.target.value)}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                            >
                              {departments.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Designation</label>
                            <input
                              type="text"
                              value={empDesignation}
                              onChange={(e) => setEmpDesignation(e.target.value)}
                              placeholder="e.g. Lead Developer"
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Account Status</label>
                          <div className="flex gap-4">
                            <label className="inline-flex items-center text-xs font-medium text-slate-700">
                              <input
                                type="radio"
                                name="empStatus"
                                value="Active"
                                checked={empStatus === 'Active'}
                                onChange={() => setEmpStatus('Active')}
                                className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                              />
                              Active (Permit Portal logins)
                            </label>
                            <label className="inline-flex items-center text-xs font-medium text-slate-700">
                              <input
                                type="radio"
                                name="empStatus"
                                value="Inactive"
                                checked={empStatus === 'Inactive'}
                                onChange={() => setEmpStatus('Inactive')}
                                className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                              />
                              Deactivated (Block Portal logins)
                            </label>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddEmpModal(false);
                              setEditingEmp(null);
                              resetEmpForm();
                            }}
                            className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md"
                          >
                            {editingEmp ? 'Save Changes' : 'Create Account'}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}

              </motion.div>
            )}

            {/* MASTER ATTENDANCE REGISTER TAB */}
            {activeTab === 'attendance' && (
              <motion.div
                key="attendance"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Control Panel Attendance */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                      Attendance Ledger Overrides ({filteredAttendance.length} records)
                    </h3>

                    <div className="inline-flex gap-2.5">
                      <button
                        onClick={exportToCSV}
                        className="inline-flex items-center gap-1.5 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
                      >
                        <Download className="w-4 h-4" />
                        Export filtered to CSV
                      </button>

                      <button
                        onClick={() => {
                          resetAttForm();
                          setEditingAtt(null);
                          setShowAddAttModal(true);
                        }}
                        className="inline-flex items-center gap-1.5 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                        Log Attendance Override
                      </button>
                    </div>
                  </div>

                  {/* Multiple Filters */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                        <Search className="w-4 h-4" />
                      </span>
                      <input
                        type="text"
                        placeholder="Search employee, notes..."
                        value={attSearch}
                        onChange={(e) => setAttSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-950 focus:bg-white focus:outline-none focus:ring-2"
                      />
                    </div>

                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                        <Building2 className="w-4 h-4" />
                      </span>
                      <select
                        value={attDeptFilter}
                        onChange={(e) => setAttDeptFilter(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-950 focus:bg-white focus:outline-none focus:ring-2"
                      >
                        <option value="">All Departments</option>
                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>

                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                        <Filter className="w-4 h-4" />
                      </span>
                      <select
                        value={attStatusFilter}
                        onChange={(e) => setAttStatusFilter(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-950 focus:bg-white focus:outline-none focus:ring-2"
                      >
                        <option value="">All Statuses</option>
                        <option value="Present">Present</option>
                        <option value="Late">Late</option>
                        <option value="Half Day">Half Day</option>
                        <option value="Absent">Absent</option>
                      </select>
                    </div>

                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                        <Calendar className="w-4 h-4" />
                      </span>
                      <input
                        type="date"
                        value={attDateFilter}
                        onChange={(e) => setAttDateFilter(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-950 focus:bg-white focus:outline-none focus:ring-2"
                      />
                    </div>
                  </div>
                </div>

                {/* Ledger Listing Table */}
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                          <th className="py-3 px-4">Employee Details</th>
                          <th className="py-3 px-4">Department</th>
                          <th className="py-3 px-4">Log Date</th>
                          <th className="py-3 px-4">Clocks (In/Out)</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Location</th>
                          <th className="py-3 px-4">Overriding Comments</th>
                          <th className="py-3 px-4 text-right">Overrides</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredAttendance.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-8 text-center text-slate-400 text-sm font-medium">
                              No attendance entries registered.
                            </td>
                          </tr>
                        ) : (
                          filteredAttendance.map(record => (
                            <tr key={record.id} className="hover:bg-slate-50/50 transition-all">
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-slate-900">{record.employeeName}</div>
                                <div className="text-slate-400 text-[10px] font-mono">{record.employeeId}</div>
                              </td>
                              <td className="py-3.5 px-4 text-slate-600 font-medium">{record.department}</td>
                              <td className="py-3.5 px-4 text-slate-500 font-mono font-medium">{record.date}</td>
                              <td className="py-3.5 px-4 font-mono font-medium">
                                {record.checkIn ? record.checkIn : 'N/A'} - {record.checkOut ? record.checkOut : 'N/A'}
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  record.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                  record.status === 'Late' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                  record.status === 'Half Day' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                  'bg-rose-50 text-rose-700 border border-rose-100'
                                }`}>
                                  {record.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-medium text-slate-600">{record.location}</td>
                              <td className="py-3.5 px-4 text-slate-500 italic max-w-xs truncate" title={record.notes}>
                                {record.notes || '—'}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="inline-flex gap-2">
                                  <button
                                    onClick={() => handleEditAttendance(record)}
                                    title="Edit override details"
                                    className="p-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 rounded-lg transition-colors"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAttendance(record.id)}
                                    title="Delete custom log entry"
                                    className="p-1.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-lg transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* MODAL: MANUAL ATTENDANCE OVERRIDE */}
                {showAddAttModal && (
                  <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100"
                    >
                      <div className="bg-indigo-600 p-5 text-white flex items-center justify-between">
                        <h4 className="text-sm font-bold flex items-center gap-2">
                          <FileSpreadsheet className="w-5 h-5" />
                          {editingAtt ? 'Edit Attendance Log' : 'Log Attendance Override'}
                        </h4>
                        <button
                          onClick={() => {
                            setShowAddAttModal(false);
                            setEditingAtt(null);
                            resetAttForm();
                          }}
                          className="text-white/80 hover:text-white"
                        >
                          <XCircle className="w-5 h-5" />
                        </button>
                      </div>

                      <form onSubmit={handleAddAttendance} className="p-6 space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Select Employee</label>
                          <select
                            value={attEmpId}
                            onChange={(e) => setAttEmpId(e.target.value)}
                            disabled={!!editingAtt}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 disabled:opacity-60"
                          >
                            <option value="">-- Choose Employee --</option>
                            {employees.filter(emp => emp.status === 'Active').map(emp => (
                              <option key={emp.id} value={emp.id}>{emp.name} ({emp.id})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Log Date</label>
                          <input
                            type="date"
                            value={attDate}
                            onChange={(e) => setAttDate(e.target.value)}
                            disabled={!!editingAtt}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 disabled:opacity-60"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Attendance Status</label>
                            <select
                              value={attStatus}
                              onChange={(e) => setAttStatus(e.target.value as any)}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2"
                            >
                              <option value="Present">Present</option>
                              <option value="Late">Late</option>
                              <option value="Half Day">Half Day</option>
                              <option value="Absent">Absent</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">Work Location</label>
                            <select
                              value={attLocation}
                              onChange={(e) => setAttLocation(e.target.value as any)}
                              disabled={attStatus === 'Absent'}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 disabled:opacity-60"
                            >
                              <option value="Office">Office</option>
                              <option value="Remote">Remote</option>
                            </select>
                          </div>
                        </div>

                        {attStatus !== 'Absent' && (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Check-In Time</label>
                              <input
                                type="time"
                                value={attCheckIn}
                                onChange={(e) => setAttCheckIn(e.target.value)}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-600 mb-1">Check-Out Time</label>
                              <input
                                type="time"
                                value={attCheckOut}
                                onChange={(e) => setAttCheckOut(e.target.value)}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2"
                              />
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Override Reason / Log Comment</label>
                          <textarea
                            value={attNotes}
                            onChange={(e) => setAttNotes(e.target.value)}
                            placeholder="e.g. Left early with manager approval, forgot clock in..."
                            rows={3}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2"
                          />
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setShowAddAttModal(false);
                              setEditingAtt(null);
                              resetAttForm();
                            }}
                            className="py-2 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md"
                          >
                            {editingAtt ? 'Override Log' : 'Record Override'}
                          </button>
                        </div>
                      </form>
                    </motion.div>
                  </div>
                )}

              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* Custom Confirmation Modals and Alerts (Sandbox Iframe Safe) */}
      <AnimatePresence>
        {deleteEmpConfirm && (
          <div id="delete-employee-modal" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100"
            >
              <div className="bg-rose-600 p-5 text-white flex items-center gap-3">
                <ShieldAlert className="w-6 h-6 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold">Delete Employee Profile</h4>
                  <p className="text-xs text-rose-100 mt-0.5 font-sans">Action is irreversible</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-slate-600 text-sm">
                  Are you absolutely sure you want to delete <strong className="text-slate-900 font-semibold">{deleteEmpConfirm.name}</strong>?
                </p>
                <p className="text-xs bg-amber-50 text-amber-800 border border-amber-100 p-3 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>All historical check-in data and timesheet logs associated with this employee will be deleted permanently.</span>
                </p>
              </div>
              <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  onClick={() => setDeleteEmpConfirm(null)}
                  className="py-2 px-4 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteEmployee}
                  className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {deleteAttConfirm && (
          <div id="delete-attendance-modal" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-100"
            >
              <div className="bg-rose-600 p-5 text-white flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold">Delete Attendance Record</h4>
                  <p className="text-xs text-rose-100 mt-0.5 font-sans">Delete selected custom log entry</p>
                </div>
              </div>
              <div className="p-6">
                <p className="text-slate-600 text-sm">
                  Are you sure you want to delete this custom timesheet override entry?
                </p>
              </div>
              <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  onClick={() => setDeleteAttConfirm(null)}
                  className="py-2 px-4 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteAttendance}
                  className="py-2 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Delete Entry
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showResetConfirm && (
          <div id="reset-app-modal" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-100"
            >
              <div className="bg-indigo-600 p-5 text-white flex items-center gap-3">
                <RefreshCw className="w-6 h-6 shrink-0 animate-spin" />
                <div>
                  <h4 className="text-sm font-bold">Reset Demo Application</h4>
                  <p className="text-xs text-indigo-100 mt-0.5 font-sans">Reverts data back to defaults</p>
                </div>
              </div>
              <div className="p-6 space-y-3">
                <p className="text-slate-600 text-sm">
                  This will wipe all active local storage sessions, new employees, and custom attendance logs, reverting the portal back to its factory demo state.
                </p>
                <p className="text-xs text-rose-600 font-semibold bg-rose-50 border border-rose-100 p-3 rounded-xl">
                  All customization and custom registrations will be lost!
                </p>
              </div>
              <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3 border-t border-slate-100">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="py-2 px-4 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmResetAppMock}
                  className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Reset & Reload
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {alertMessage && (
          <div id="alert-modal" className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-100"
            >
              <div className="bg-indigo-600 p-5 text-white flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold">Notification</h4>
                </div>
              </div>
              <div className="p-6">
                <p className="text-slate-600 text-sm">
                  {alertMessage}
                </p>
              </div>
              <div className="bg-slate-50 px-6 py-4 flex justify-end border-t border-slate-100">
                <button
                  onClick={() => setAlertMessage(null)}
                  className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
