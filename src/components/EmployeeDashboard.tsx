import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, MapPin, User, Mail, Phone, Shield, LogOut, CheckCircle2, 
  XCircle, AlertCircle, Calendar, Building2, KeyRound, Edit2, Check
} from 'lucide-react';
import { Employee, AttendanceRecord, UserSession } from '../types';
import { saveStoredEmployees, saveStoredAttendance } from '../utils/mockData';

interface EmployeeDashboardProps {
  session: UserSession;
  employees: Employee[];
  attendance: AttendanceRecord[];
  onEmployeesChange: (updated: Employee[]) => void;
  onAttendanceChange: (updated: AttendanceRecord[]) => void;
  onLogout: () => void;
}

export default function EmployeeDashboard({
  session,
  employees,
  attendance,
  onEmployeesChange,
  onAttendanceChange,
  onLogout
}: EmployeeDashboardProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'clock' | 'history' | 'profile'>('clock');

  // Find current employee data
  const currentEmployee = useMemo(() => {
    return employees.find(e => e.id === session.employeeId) as Employee;
  }, [employees, session]);

  // Current real-time clock state for visual check-in
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter attendance records specifically belonging to this logged in employee
  const myLogs = useMemo(() => {
    return attendance.filter(r => r.employeeId === session.employeeId)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [attendance, session]);

  // Calculate high-fidelity employee statistics
  const stats = useMemo(() => {
    const totalDays = myLogs.length;
    const present = myLogs.filter(r => r.status === 'Present').length;
    const late = myLogs.filter(r => r.status === 'Late').length;
    const halfDay = myLogs.filter(r => r.status === 'Half Day').length;
    const absent = myLogs.filter(r => r.status === 'Absent').length;

    const totalActiveDays = present + late + halfDay;
    const attRate = totalDays > 0 ? Math.round((totalActiveDays / totalDays) * 100) : 100;

    return {
      totalDays,
      present,
      late,
      halfDay,
      absent,
      totalActiveDays,
      attRate
    };
  }, [myLogs]);

  // Determine clock-in state for TODAY
  const todayStr = new Date().toISOString().split('T')[0];
  const todayRecord = useMemo(() => {
    return myLogs.find(r => r.date === todayStr);
  }, [myLogs, todayStr]);

  // Self Clock-In form states
  const [location, setLocation] = useState<'Office' | 'Remote'>('Office');
  const [notes, setNotes] = useState('');
  const [clockInSuccessMsg, setClockInSuccessMsg] = useState('');

  // Clock-in handler
  const handleClockIn = () => {
    if (!currentEmployee) return;

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // Status Logic: 09:00:00 limit. Later than 9:00 is 'Late'
    const status = (hours > 9 || (hours === 9 && minutes > 0)) ? 'Late' : 'Present';
    const currentTimeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS

    const newRecord: AttendanceRecord = {
      id: `ATT-${Date.now()}`,
      employeeId: currentEmployee.id,
      employeeName: currentEmployee.name,
      department: currentEmployee.department,
      date: todayStr,
      checkIn: currentTimeStr,
      checkOut: null,
      status: status,
      location: location,
      notes: notes.trim() || (status === 'Late' ? 'Late check-in self-registered' : 'Normal self-registered')
    };

    const updatedAttendance = [newRecord, ...attendance];
    onAttendanceChange(updatedAttendance);
    saveStoredAttendance(updatedAttendance);

    setClockInSuccessMsg(`Successfully clocked-in as ${status}!`);
    setTimeout(() => setClockInSuccessMsg(''), 4000);
    setNotes('');
  };

  // Clock-out handler
  const handleClockOut = () => {
    if (!todayRecord) return;

    const now = new Date();
    const currentTimeStr = now.toTimeString().split(' ')[0];

    const updatedAttendance = attendance.map(r => {
      if (r.id === todayRecord.id) {
        return {
          ...r,
          checkOut: currentTimeStr,
          notes: r.notes + ' (Clocked out self-registered)'
        };
      }
      return r;
    });

    onAttendanceChange(updatedAttendance);
    saveStoredAttendance(updatedAttendance);

    setClockInSuccessMsg('Successfully clocked-out! Have a great evening!');
    setTimeout(() => setClockInSuccessMsg(''), 4000);
  };

  // Profile Form States
  const [phone, setPhone] = useState(currentEmployee?.phone || '');
  const [email, setEmail] = useState(currentEmployee?.email || '');
  const [password, setPassword] = useState(currentEmployee?.password || '');
  const [showPassAlert, setShowPassAlert] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !email.trim() || !password.trim()) {
      setProfileErrorMsg('All profile fields cannot be left blank.');
      return;
    }
    setProfileErrorMsg('');

    const updatedList = employees.map(emp => {
      if (emp.id === currentEmployee.id) {
        return {
          ...emp,
          phone: phone.trim(),
          email: email.trim(),
          password: password.trim()
        };
      }
      return emp;
    });

    onEmployeesChange(updatedList);
    saveStoredEmployees(updatedList);

    setProfileSuccessMsg('Profile and access password updated successfully!');
    setTimeout(() => setProfileSuccessMsg(''), 3000);
  };

  // History Tab Filter States
  const [historyStatusFilter, setHistoryStatusFilter] = useState('');
  const filteredMyLogs = useMemo(() => {
    return myLogs.filter(log => {
      return historyStatusFilter === '' || log.status === historyStatusFilter;
    });
  }, [myLogs, historyStatusFilter]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Top Banner Bar */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 flex items-center justify-between shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 rounded-xl text-white">
            <User className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 leading-none">Employee Portal</h1>
            <p className="text-slate-500 text-xs mt-0.5 flex items-center gap-1 font-medium">
              Welcome back, <span className="font-semibold text-indigo-600">{currentEmployee?.name}</span>
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        
        {/* Portal Nav Sidebar */}
        <aside className="lg:w-64 flex-shrink-0">
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-1.5">
            <button
              onClick={() => setActiveTab('clock')}
              className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors ${
                activeTab === 'clock'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
            >
              <Clock className="w-4.5 h-4.5" />
              Clock Desk
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors ${
                activeTab === 'history'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
            >
              <Calendar className="w-4.5 h-4.5" />
              Check-In History
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors ${
                activeTab === 'profile'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
            >
              <User className="w-4.5 h-4.5" />
              My Profile Settings
            </button>
          </div>

          {/* Quick Profile Overview Info Box */}
          <div className="mt-6 bg-slate-100 border border-slate-200 rounded-2xl p-4 space-y-3.5">
            <div className="flex items-center gap-2.5 text-xs text-slate-500 font-semibold border-b border-slate-200 pb-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              Company Assignment
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Employee ID</p>
                <p className="text-xs font-mono font-bold text-indigo-700">{currentEmployee?.id}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Department</p>
                <p className="text-xs font-semibold text-slate-800">{currentEmployee?.department}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400">Designation</p>
                <p className="text-xs font-semibold text-slate-800">{currentEmployee?.designation}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Portal Views */}
        <main className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            
            {/* CLOCK DESK VIEW */}
            {activeTab === 'clock' && (
              <motion.div
                key="clock"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Personal KPI Metrics Panel */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Attendance Rate</p>
                    <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{stats.attRate}%</h3>
                    <p className="text-indigo-600 text-[10px] font-semibold mt-1">Active vs. total logs</p>
                  </div>

                  <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Present Days</p>
                    <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{stats.present}</h3>
                    <p className="text-emerald-600 text-[10px] font-semibold mt-1">Normal entries logged</p>
                  </div>

                  <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Late Days</p>
                    <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{stats.late}</h3>
                    <p className="text-amber-600 text-[10px] font-semibold mt-1">Clocked post 09:00 AM</p>
                  </div>

                  <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">Absences Logged</p>
                    <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{stats.absent}</h3>
                    <p className="text-rose-600 text-[10px] font-semibold mt-1">Total missed logs</p>
                  </div>
                </div>

                {/* Clock Desk Interactive Card */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  <div className="md:col-span-3 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
                    
                    {clockInSuccessMsg && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute top-4 left-4 right-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>{clockInSuccessMsg}</span>
                      </motion.div>
                    )}

                    <div className="text-center py-6">
                      {/* Real time clock widget */}
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Digital Clock Widget</p>
                      <h2 className="text-4xl font-extrabold text-slate-900 font-mono mt-2 tracking-tight">
                        {time.toLocaleTimeString()}
                      </h2>
                      <p className="text-indigo-600 text-xs font-semibold mt-1">
                        {time.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>

                    <div className="border-t border-slate-100 pt-5 space-y-4">
                      {/* Status Check Message */}
                      {!todayRecord ? (
                        <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4 text-xs text-amber-800 flex items-start gap-2.5">
                          <AlertCircle className="w-4.5 h-4.5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Pending Attendance</span>: You have not checked in for today yet. Use the desk to clock in.
                          </div>
                        </div>
                      ) : todayRecord.checkOut ? (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-xs text-emerald-800 flex items-start gap-2.5">
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Shift Completed</span>: You successfully completed today&apos;s attendance checks! Good job.
                            <div className="mt-1.5 font-mono text-slate-500">
                              In: <span className="font-bold text-slate-700">{todayRecord.checkIn}</span> | Out: <span className="font-bold text-slate-700">{todayRecord.checkOut}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-xs text-indigo-800 flex items-start gap-2.5">
                          <Clock className="w-4.5 h-4.5 text-indigo-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Currently Clocked In</span>: Your check-in was registered at <span className="font-bold font-mono text-indigo-950">{todayRecord.checkIn}</span> (Status: <span className="font-semibold">{todayRecord.status}</span>). Do not forget to clock out before leaving.
                          </div>
                        </div>
                      )}

                      {/* Interactive Buttons */}
                      <div className="flex gap-4">
                        {!todayRecord ? (
                          <button
                            onClick={handleClockIn}
                            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-md shadow-indigo-100 flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Clock-In Today
                          </button>
                        ) : !todayRecord.checkOut ? (
                          <button
                            onClick={handleClockOut}
                            className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-colors shadow-md shadow-emerald-100 flex items-center justify-center gap-1.5"
                          >
                            <XCircle className="w-4 h-4" />
                            Clock-Out (Exit)
                          </button>
                        ) : (
                          <button
                            disabled
                            className="flex-1 py-3 bg-slate-100 text-slate-400 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-not-allowed"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Shift Complete
                          </button>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Clock-in Settings / Options */}
                  <div className="md:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">Clock Parameters</h3>
                    
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Workspace Mode</label>
                      <div className="grid grid-cols-2 bg-slate-100 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setLocation('Office')}
                          disabled={!!todayRecord}
                          className={`py-2 text-xs font-bold rounded-lg transition-all ${
                            location === 'Office'
                              ? 'bg-white text-indigo-700 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          } disabled:opacity-60`}
                        >
                          Office Check
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocation('Remote')}
                          disabled={!!todayRecord}
                          className={`py-2 text-xs font-bold rounded-lg transition-all ${
                            location === 'Remote'
                              ? 'bg-white text-indigo-700 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900'
                          } disabled:opacity-60`}
                        >
                          Remote Check
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5">Clock-In Notes</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Work starting, task preparations, medical review..."
                        rows={3}
                        disabled={!!todayRecord}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 disabled:opacity-60"
                      />
                    </div>

                    <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/50">
                      <p className="text-[10px] text-indigo-800 font-semibold leading-relaxed">
                        * Note: Check-in is auto-timed using safe server schedules. Standard clock deadline is 09:00:00 AM. Check-ins after 9 AM are marked as Late.
                      </p>
                    </div>
                  </div>
                </div>

              </motion.div>
            )}

            {/* CHECK-IN HISTORY VIEW */}
            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {/* Filters */}
                <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                  <h3 className="text-sm font-bold text-slate-900">Personal Attendance Ledger Logs</h3>
                  <div className="w-full sm:w-48">
                    <select
                      value={historyStatusFilter}
                      onChange={(e) => setHistoryStatusFilter(e.target.value)}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2"
                    >
                      <option value="">All Statuses</option>
                      <option value="Present">Present Only</option>
                      <option value="Late">Late Only</option>
                      <option value="Half Day">Half Day Only</option>
                      <option value="Absent">Absent Only</option>
                    </select>
                  </div>
                </div>

                {/* Ledger Log table */}
                <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-semibold">
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Clock In</th>
                          <th className="py-3 px-4">Clock Out</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Location</th>
                          <th className="py-3 px-4">Log Comments</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredMyLogs.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-8 text-center text-slate-400 font-medium">
                              No history found. Click Clock Desk to start your logs.
                            </td>
                          </tr>
                        ) : (
                          filteredMyLogs.map(log => (
                            <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                              <td className="py-3.5 px-4 font-mono font-bold text-slate-800">{log.date}</td>
                              <td className="py-3.5 px-4 font-mono font-medium text-slate-600">{log.checkIn || 'N/A'}</td>
                              <td className="py-3.5 px-4 font-mono font-medium text-slate-600">{log.checkOut || 'N/A'}</td>
                              <td className="py-3.5 px-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  log.status === 'Present' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                  log.status === 'Late' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                  log.status === 'Half Day' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                  'bg-rose-50 text-rose-700 border border-rose-100'
                                }`}>
                                  {log.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-medium text-slate-600">
                                <span className="inline-flex items-center gap-1.5">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  {log.location}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-slate-500 italic max-w-xs truncate" title={log.notes}>
                                {log.notes}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </motion.div>
            )}

            {/* MY PROFILE VIEW */}
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-2xl"
              >
                <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
                  
                  <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">My Profile Settings</h3>
                      <p className="text-slate-400 text-xs mt-0.5">Manage and verify your employee contact details and system password.</p>
                    </div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg">
                      Registered
                    </span>
                  </div>

                  {profileSuccessMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{profileSuccessMsg}</span>
                    </motion.div>
                  )}

                  {profileErrorMsg && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 bg-rose-50 border border-rose-100 text-rose-800 text-xs font-semibold rounded-xl flex items-center gap-2"
                    >
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>{profileErrorMsg}</span>
                    </motion.div>
                  )}

                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Company Email</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                            <Mail className="w-3.5 h-3.5" />
                          </span>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Contact Phone</label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                            <Phone className="w-3.5 h-3.5" />
                          </span>
                          <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Update Password</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                          <KeyRound className="w-3.5 h-3.5" />
                        </span>
                        <input
                          type="text"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            setShowPassAlert(true);
                          }}
                          className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
                        />
                      </div>
                      {showPassAlert && (
                        <p className="text-[10px] text-amber-700 font-medium mt-1">
                          * Caution: Updating this updates your portal credentials instantly. Remember your password for the next sign-in.
                        </p>
                      )}
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                      <button
                        type="submit"
                        className="py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md transition-colors flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        Save Changes
                      </button>
                    </div>

                  </form>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
