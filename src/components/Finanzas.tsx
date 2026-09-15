/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Plus, Trash2, CheckCircle, Clock, AlertTriangle, Search, 
  User as UserIcon, Landmark, Printer, CreditCard, ChevronLeft, ChevronRight, X, FileText,
  Edit2
} from 'lucide-react';
import { User } from '../types';
import { uid, now, fmtDate } from '../lib/db';
import { SearchableSelect } from './SearchableSelect';
import { saveDocToFirestore, fetchCollectionFromFirestore, deleteDocFromFirestore } from '../lib/firebase';

interface PaymentRecord {
  id: string;
  studentId: string;
  studentName: string;
  concepto: 'Matrícula' | 'Mensualidad' | 'Derechos de Grado' | 'Seguros y Otros';
  pagoTotal: number;
  referencia: string;
  fechaVencimiento: string; // YYYY-MM-DD
  fechaPago?: string; // YYYY-MM-DD
  estado: 'pagado' | 'pendiente' | 'vencido';
}

interface FinanzasProps {
  currentUser: User;
  users: User[];
  toast: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

export default function Finanzas({ currentUser, users, toast }: FinanzasProps) {
  const isDocOrAdmin = currentUser.rol === 'admin' || currentUser.rol === 'docente';
  const students = users.filter(u => u.rol === 'estudiante');

  // Master State
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'pagado' | 'pendiente' | 'vencido'>('all');

  // Enrollment Status States (persisted)
  const [enrollmentStatus, setEnrollmentStatus] = useState<Record<string, 'Matriculado' | 'Pendiente' | 'Suspendido'>>({});

  // Modal State for recording a transaction
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string>('');
  const [concepto, setConcepto] = useState<PaymentRecord['concepto']>('Mensualidad');
  const [pagoTotal, setPagoTotal] = useState<number>(180000); // Standard monthly fee
  const [fechaVencimiento, setFechaVencimiento] = useState<string>('');
  const [referencia, setReferencia] = useState<string>('');
  const [estado, setEstado] = useState<PaymentRecord['estado']>('pendiente');
  const [fechaPago, setFechaPago] = useState<string>('');

  // Selected payment record for receipt mockup overlay modal
  const [invoiceForMock, setInvoiceForMock] = useState<PaymentRecord | null>(null);

  // Pagination states
  const itemsPerPage = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPage, setStudentsPage] = useState(1);
  const studentsPerPage = 5;

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Initial load + seed data
  useEffect(() => {
    async function loadData() {
      // 1. Load payment ledger from Firestore
      let loadedPayments: PaymentRecord[] = [];
      try {
        loadedPayments = await fetchCollectionFromFirestore<PaymentRecord>('payments');
      } catch (err) {
        console.error('Error loading payments from Firestore', err);
      }

      if (loadedPayments && loadedPayments.length > 0) {
        setPayments(loadedPayments);
        localStorage.setItem('ep_finanzas', JSON.stringify(loadedPayments));
      } else {
        const savedPayments = localStorage.getItem('ep_finanzas');
        if (savedPayments) {
          try {
            const parsed = JSON.parse(savedPayments);
            setPayments(parsed);
            // Sync to Firestore
            parsed.forEach((p: any) => saveDocToFirestore('payments', p));
          } catch (e) {
            console.error('Error parsing local payments', e);
          }
        } else {
          if (students.length >= 2) {
            const seedPayments: PaymentRecord[] = [
              {
                id: uid(),
                studentId: students[0].id,
                studentName: students[0].nombre,
                concepto: 'Matrícula',
                pagoTotal: 350000,
                referencia: 'REF-8891-32',
                fechaVencimiento: '2026-02-05',
                fechaPago: '2026-02-04',
                estado: 'pagado',
              },
              {
                id: uid(),
                studentId: students[0].id,
                studentName: students[0].nombre,
                concepto: 'Mensualidad',
                pagoTotal: 180000,
                referencia: 'REF-0244-12',
                fechaVencimiento: '2026-06-05',
                fechaPago: '2026-06-05',
                estado: 'pagado',
              },
              {
                id: uid(),
                studentId: students[1].id,
                studentName: students[1].nombre,
                concepto: 'Matrícula',
                pagoTotal: 350000,
                referencia: 'REF-8891-35',
                fechaVencimiento: '2026-02-05',
                fechaPago: '2026-02-05',
                estado: 'pagado',
              },
              {
                id: uid(),
                studentId: students[1].id,
                studentName: students[1].nombre,
                concepto: 'Mensualidad',
                pagoTotal: 180000,
                referencia: 'REF-3012-99',
                fechaVencimiento: '2026-06-15',
                estado: 'pendiente',
              },
              {
                id: uid(),
                studentId: students[0].id,
                studentName: students[0].nombre,
                concepto: 'Mensualidad',
                pagoTotal: 180000,
                referencia: 'REF-3012-98',
                fechaVencimiento: '2026-07-05',
                estado: 'pendiente',
              }
            ];
            if (students[1]) {
              seedPayments.push({
                id: uid(),
                studentId: students[1].id,
                studentName: students[1].nombre,
                concepto: 'Seguros y Otros',
                pagoTotal: 85000,
                referencia: 'REF-0012-44',
                fechaVencimiento: '2026-04-10',
                estado: 'vencido',
              });
            }

            setPayments(seedPayments);
            localStorage.setItem('ep_finanzas', JSON.stringify(seedPayments));
            // Sync seeds to Firestore
            seedPayments.forEach(p => saveDocToFirestore('payments', p));
          }
        }
      }

      // 2. Load enrollment statuses
      let loadedStatuses: any[] = [];
      try {
        loadedStatuses = await fetchCollectionFromFirestore<any>('matriculaStatus');
      } catch (err) {
        console.error('Error loading matricula statuses from Firestore', err);
      }

      if (loadedStatuses && loadedStatuses.length > 0) {
        const statusesMap: Record<string, 'Matriculado' | 'Pendiente' | 'Suspendido'> = {};
        loadedStatuses.forEach(item => {
          statusesMap[item.id] = item.status;
        });
        setEnrollmentStatus(statusesMap);
        localStorage.setItem('ep_matricula_status', JSON.stringify(statusesMap));
      } else {
        const savedStatus = localStorage.getItem('ep_matricula_status');
        if (savedStatus) {
          try {
            const parsed = JSON.parse(savedStatus);
            setEnrollmentStatus(parsed);
            Object.entries(parsed).forEach(([stId, status]) => {
              saveDocToFirestore('matriculaStatus', { id: stId, status });
            });
          } catch (e) {
            console.error('Error parsing enrollment status', e);
          }
        } else {
          const defaultStatus: Record<string, 'Matriculado' | 'Pendiente' | 'Suspendido'> = {};
          students.forEach(st => {
            defaultStatus[st.id] = 'Matriculado';
            saveDocToFirestore('matriculaStatus', { id: st.id, status: 'Matriculado' });
          });
          setEnrollmentStatus(defaultStatus);
          localStorage.setItem('ep_matricula_status', JSON.stringify(defaultStatus));
        }
      }
    }

    loadData();
  }, [users]);

  // Handle setting enrollment status for a student
  const changeEnrollmentStatus = (stId: string, status: 'Matriculado' | 'Pendiente' | 'Suspendido') => {
    const nextStatus = { ...enrollmentStatus, [stId]: status };
    setEnrollmentStatus(nextStatus);
    localStorage.setItem('ep_matricula_status', JSON.stringify(nextStatus));
    saveDocToFirestore('matriculaStatus', { id: stId, status });
    toast('Estado de matrícula actualizado correctamente', 'success');
  };

  // Recording or editing payment installment
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isDocOrAdmin) return;

    if (!studentId || !fechaVencimiento || !pagoTotal) {
      toast('Por favor, rellena todos los campos requeridos', 'error');
      return;
    }

    const matchedSt = students.find(s => s.id === studentId);
    if (!matchedSt) return;

    const nextPayments = [...payments];

    const targetRef = referencia.trim() || `REF-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(10 + Math.random() * 90)}`;

    if (editingId) {
      const idx = nextPayments.findIndex(p => p.id === editingId);
      if (idx > -1) {
        const updatedItem: PaymentRecord = {
          ...nextPayments[idx],
          studentId,
          studentName: matchedSt.nombre,
          concepto,
          pagoTotal: Number(pagoTotal),
          referencia: targetRef,
          fechaVencimiento,
          estado,
          fechaPago: estado === 'pagado' ? (fechaPago || new Date().toISOString().substring(0, 10)) : undefined,
        };
        nextPayments[idx] = updatedItem;
        saveDocToFirestore('payments', updatedItem);
        toast('Registro de cobro actualizado', 'success');
      }
    } else {
      const newItem: PaymentRecord = {
        id: uid(),
        studentId,
        studentName: matchedSt.nombre,
        concepto,
        pagoTotal: Number(pagoTotal),
        referencia: targetRef,
        fechaVencimiento,
        estado,
        fechaPago: estado === 'pagado' ? (fechaPago || new Date().toISOString().substring(0, 10)) : undefined,
      };
      nextPayments.push(newItem);
      saveDocToFirestore('payments', newItem);
      toast('Nuevo cobro registrado con éxito', 'success');
    }

    setPayments(nextPayments);
    localStorage.setItem('ep_finanzas', JSON.stringify(nextPayments));
    setIsModalOpen(false);
  };

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setStudentId(students[0]?.id || '');
    setConcepto('Mensualidad');
    setPagoTotal(180000);
    setFechaVencimiento(new Date(Date.now() + 86400000 * 15).toISOString().substring(0, 10)); // in 15 days
    setReferencia('');
    setEstado('pendiente');
    setFechaPago('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: PaymentRecord) => {
    setEditingId(p.id);
    setStudentId(p.studentId);
    setConcepto(p.concepto);
    setPagoTotal(p.pagoTotal);
    setFechaVencimiento(p.fechaVencimiento);
    setReferencia(p.referencia);
    setEstado(p.estado);
    setFechaPago(p.fechaPago || '');
    setIsModalOpen(true);
  };

  const handlePrintBarcodeSlip = () => {
    window.print();
  };

  // Filtration logic
  const filteredPayments = payments.filter(p => {
    // 1. Student restriction check (only see own payments if role is student)
    const matchesUser = isDocOrAdmin || p.studentId === currentUser.id;

    // 2. Search query check
    const matchesSearch = searchQuery === '' || 
      p.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.referencia.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.concepto.toLowerCase().includes(searchQuery.toLowerCase());

    // 3. Tab filtration (by status)
    const matchesTab = activeTab === 'all' || p.estado === activeTab;

    return matchesUser && matchesSearch && matchesTab;
  }).sort((a, b) => b.fechaVencimiento.localeCompare(a.fechaVencimiento));

  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage) || 1;
  const activePage = currentPage > totalPages ? totalPages : currentPage;
  const currentPaymentsFiltered = filteredPayments.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

  // Student list pagination (5 elements per page as requested "a partir del registro 5 crear paginas")
  const totalStudentsPages = Math.ceil(students.length / studentsPerPage) || 1;
  const activeStudentsPage = studentsPage > totalStudentsPages ? totalStudentsPages : studentsPage;
  const paginatedStudents = students.slice((activeStudentsPage - 1) * studentsPerPage, activeStudentsPage * studentsPerPage);

  // Compute stats metrics
  const getFinancialStats = () => {
    const studentPayments = payments.filter(p => isDocOrAdmin || p.studentId === currentUser.id);

    const paidTotal = studentPayments.filter(p => p.estado === 'pagado').reduce((acc, p) => acc + p.pagoTotal, 0);
    const pendingTotal = studentPayments.filter(p => p.estado === 'pendiente').reduce((acc, p) => acc + p.pagoTotal, 0);
    const overdueTotal = studentPayments.filter(p => p.estado === 'vencido').reduce((acc, p) => acc + p.pagoTotal, 0);

    const formatCurrency = (val: number) => {
      return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(val);
    };

    return {
      paidText: formatCurrency(paidTotal),
      pendingText: formatCurrency(pendingTotal),
      overdueText: formatCurrency(overdueTotal),
      formatCurrency
    };
  };

  const stats = getFinancialStats();

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in text-left">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm theme-bg-surface theme-border print:hidden">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider mb-2">
            <DollarSign className="w-3.5 h-3.5" /> Estado de Matrículas y Pagos
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight" style={{ color: 'var(--gray-900)' }}>
            {isDocOrAdmin ? 'Control Financiero de Matrículas' : 'Mi Estado de Cuenta y Mensualidades'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Revisa el estado de saldos pendientes, genera recibos oficiales con código de barras and monitorea la solvencia académica escolar.
          </p>
        </div>

        {isDocOrAdmin && (
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" /> Registrar Cobro
          </button>
        )}
      </div>

      {/* STATS TILES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:hidden">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4 theme-bg-surface">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Recaudado</span>
            <span className="text-xl font-black text-slate-800 font-mono">{stats.paidText}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4 theme-bg-surface">
          <div className="p-3 bg-amber-50 text-amber-500 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Pendiente de Cobro</span>
            <span className="text-xl font-black text-slate-800 font-mono">{stats.pendingText}</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4 theme-bg-surface">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Saldos Vencidos</span>
            <span className="text-xl font-black text-rose-600 font-mono">{stats.overdueText}</span>
          </div>
        </div>
      </div>

      {/* FILTER BUTTONS & SEARCH BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 theme-bg-surface print:hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'pagado', label: '🟢 Pagados' },
            { key: 'pendiente', label: '🟡 Pendientes' },
            { key: 'vencido', label: '🔴 Vencidos' },
          ].map(sb => (
            <button
              key={sb.key}
              onClick={() => { setActiveTab(sb.key as any); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-xl cursor-pointer whitespace-nowrap border transition ${
                activeTab === sb.key
                  ? 'bg-slate-800 text-white font-bold border-slate-800'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              {sb.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder={isDocOrAdmin ? "Buscar alumno o referencia..." : "Filtrar por concepto o ref..."}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-indigo-500 font-semibold text-xs text-slate-700 w-full sm:w-64"
          />
        </div>
      </div>

      {/* STUDENT MATRICULA LIST FOR ADMINS */}
      {isDocOrAdmin && searchQuery === '' && activeTab === 'all' && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs theme-bg-surface theme-border p-5 space-y-4 print:hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Panorámica Matricular de Estudiantes</h3>
            </div>
            <span className="text-[10px] uppercase font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              Página {activeStudentsPage} de {totalStudentsPages}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 animate-fade-in">
            {paginatedStudents.map(st => {
              const status = enrollmentStatus[st.id] || 'Matriculado';
              
              let statusStyle = 'bg-emerald-50 text-emerald-700';
              if (status === 'Pendiente') statusStyle = 'bg-amber-50 text-amber-700';
              else if (status === 'Suspendido') statusStyle = 'bg-rose-50 text-rose-700 font-bold';

              return (
                <div key={st.id} className="p-3 border border-slate-200 rounded-2xl bg-slate-50/20 hover:bg-slate-50 hover:border-slate-300 transition flex flex-col justify-between space-y-2.5">
                  <div>
                    <span className="font-extrabold text-[12px] text-slate-800 line-clamp-1">{st.nombre}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">CC: {st.cedula || '---'}</span>
                  </div>

                  <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-slate-100">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide shrink-0 ${statusStyle}`}>{status}</span>
                    
                    <select
                      value={status}
                      onChange={e => changeEnrollmentStatus(st.id, e.target.value as any)}
                      className="text-[9px] border rounded bg-white text-slate-600 focus:outline-none p-1 font-bold cursor-pointer max-w-[85px]"
                    >
                      <option value="Matriculado">Activo</option>
                      <option value="Pendiente">Deudor</option>
                      <option value="Suspendido">Bloqueado</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination controls specifically for Students */}
          {students.length > studentsPerPage && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="text-slate-500 text-[10px] font-medium leading-normal select-none">
                Estudiantes <span className="font-bold text-slate-800">{(activeStudentsPage - 1) * studentsPerPage + 1}</span> al{' '}
                <span className="font-bold text-slate-800">{Math.min(activeStudentsPage * studentsPerPage, students.length)}</span> de{' '}
                <span className="font-bold text-slate-800">{students.length}</span> registrados (Bloques de 5)
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={activeStudentsPage === 1}
                  onClick={() => setStudentsPage(prev => Math.max(1, prev - 1))}
                  className="p-1 px-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-slate-600 inline-flex items-center gap-1 text-[10px]"
                >
                  <ChevronLeft className="w-3 h-3" /> Prev
                </button>
                {Array.from({ length: totalStudentsPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setStudentsPage(page)}
                    className={`h-6 min-w-6 text-[10px] font-black rounded-lg transition cursor-pointer flex items-center justify-center ${
                      activeStudentsPage === page
                        ? 'bg-slate-800 text-white'
                        : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                    }`}
                    style={activeStudentsPage === page ? { backgroundColor: 'var(--primary, #673ab7)', color: '#fff' } : {}}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={activeStudentsPage === totalStudentsPages}
                  onClick={() => setStudentsPage(prev => Math.min(totalStudentsPages, prev + 1))}
                  className="p-1 px-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer text-slate-600 inline-flex items-center gap-1 text-[10px]"
                >
                  Next <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DETAILED TRANSACTIONS LIST */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm theme-bg-surface theme-border">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between theme-bg-surface">
          <span className="text-xs font-extrabold text-slate-700">Libro Contable de Ingresos y Cobros ({filteredPayments.length})</span>
          {!isDocOrAdmin && (
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
              enrollmentStatus[currentUser.id] === 'Suspendido' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              Matrícula: {enrollmentStatus[currentUser.id] || 'Matriculado'}
            </span>
          )}
        </div>

        {filteredPayments.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs py-14">
            No se encontraron cobros o facturaciones registradas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-medium uppercase tracking-wider theme-bg-surface border-b border-slate-200">
                  <th className="py-3 px-5">Referencia</th>
                  <th className="py-3 px-5">Estudiante</th>
                  <th className="py-3 px-5">Concepto</th>
                  <th className="py-3 px-5">Monto (COP)</th>
                  <th className="py-3 px-5">Vence</th>
                  <th className="py-3 px-5 text-center">Estado</th>
                  <th className="py-3 px-5 text-right">Recibo Digital</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {currentPaymentsFiltered.map(p => {
                  let stateBadge = '';
                  if (p.estado === 'pagado') stateBadge = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                  else if (p.estado === 'pendiente') stateBadge = 'bg-amber-50 text-amber-700 border-amber-100';
                  else if (p.estado === 'vencido') stateBadge = 'bg-rose-50 text-rose-700 border-rose-100 font-black';

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-500">
                        {p.referencia}
                      </td>
                      <td className="py-3.5 px-5 text-slate-800 font-extrabold" style={{ color: 'var(--gray-900)' }}>
                        {p.studentName}
                      </td>
                      <td className="py-3.5 px-5 font-bold text-slate-700">
                        {p.concepto}
                      </td>
                      <td className="py-3.5 px-5 font-mono font-black text-slate-800" style={{ color: 'var(--gray-900)' }}>
                        {stats.formatCurrency(p.pagoTotal)}
                      </td>
                      <td className="py-3.5 px-5 text-slate-500">
                        {fmtDate(p.fechaVencimiento)}
                        {p.fechaPago && <div className="text-[10px] text-emerald-600 block mt-0.5">Pagado: {fmtDate(p.fechaPago)}</div>}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-black uppercase ${stateBadge}`}>
                          {p.estado}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right border-l-0">
                        <div className="flex items-center justify-end gap-1.5 font-bold text-[10px]">
                          <button
                            onClick={() => setInvoiceForMock(p)}
                            className="bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 py-1 px-2 rounded-lg cursor-pointer transition flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" /> Ver Volante
                          </button>

                          {isDocOrAdmin && (
                            <>
                              {confirmDeleteId === p.id ? (
                                <div className="flex items-center gap-1 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-lg text-red-700">
                                  <span className="text-[9px] font-black uppercase">¿Seguro?</span>
                                  <button
                                    onClick={async () => {
                                      const nextPayments = payments.filter(pay => pay.id !== p.id);
                                      setPayments(nextPayments);
                                      localStorage.setItem('ep_finanzas', JSON.stringify(nextPayments));
                                      try {
                                        await deleteDocFromFirestore('payments', p.id);
                                      } catch (err) {
                                        console.error('Failed to delete payment from firestore', err);
                                      }
                                      toast('Cobro eliminado correctamente', 'success');
                                      setConfirmDeleteId(null);
                                    }}
                                    className="bg-red-600 text-white hover:bg-red-700 px-1.5 py-0.5 rounded text-[9px] font-black uppercase cursor-pointer"
                                  >
                                    Sí
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="bg-slate-200 text-slate-700 hover:bg-slate-300 px-1.5 py-0.5 rounded text-[9px] font-black uppercase cursor-pointer"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleOpenEditModal(p)}
                                    className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-slate-50 cursor-pointer"
                                    title="Editar cobro"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setConfirmDeleteId(p.id)}
                                    className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-50 cursor-pointer"
                                    title="Eliminar cobro"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* PAGINATION PANEL */}
            {filteredPayments.length > itemsPerPage && (
              <div className="px-4 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3 theme-bg-surface">
                <div className="text-xs text-slate-500 select-none">
                  Mostrando <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>{((activePage - 1) * itemsPerPage) + 1}</span> a{' '}
                  <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>
                    {Math.min(activePage * itemsPerPage, filteredPayments.length)}
                  </span>{' '}
                  de <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>{filteredPayments.length}</span> cobros catalogados
                </div>
                <div className="flex items-center gap-1.5 font-sans">
                  <button
                    disabled={activePage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                        activePage === page
                          ? 'text-white'
                          : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                      style={activePage === page ? { backgroundColor: 'var(--primary)', borderColor: 'var(--primary)' } : {}}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    disabled={activePage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CREATE / EDIT TRANSACTION MODAL */}
      {isModalOpen && (
        <div className="modal-overlay fixed inset-0 bg-black/45 flex items-center justify-center z-[200] p-4 text-left">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden animate-scale-up border border-slate-200 shadow-xl theme-bg-surface">
            {/* Header */}
            <div className="bg-slate-50 p-5 border-b border-slate-200 flex items-center justify-between theme-bg-surface">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-indigo-500" />
                <h3 className="font-extrabold text-slate-900 text-sm" style={{ color: 'var(--gray-900)' }}>
                  {editingId ? 'Editar Detalle de Factura' : 'Registrar Nuevo Cobro Académico'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSavePayment} className="p-6 space-y-4 text-xs font-semibold">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Elegir Estudiante <span className="text-red-500">*</span></label>
                <SearchableSelect
                  options={students.map(s => ({
                    value: s.id,
                    label: s.nombre,
                    subLabel: s.cedula ? `CC: ${s.cedula}` : undefined
                  }))}
                  value={studentId}
                  onChange={val => setStudentId(val)}
                  placeholder="Selecciona alumno..."
                  id="payment-student-select"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Concepto Cobro</label>
                  <select
                    value={concepto}
                    onChange={e => setConcepto(e.target.value as any)}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                  >
                    <option value="Matrícula">Matrícula</option>
                    <option value="Mensualidad">Mensualidad</option>
                    <option value="Derechos de Grado">Derechos de Grado</option>
                    <option value="Seguros y Otros">Seguros y Otros</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Monto en COP <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    required
                    placeholder="Monto total..."
                    value={pagoTotal}
                    onChange={e => setPagoTotal(Number(e.target.value))}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fecha Vencimiento <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={fechaVencimiento}
                    onChange={e => setFechaVencimiento(e.target.value)}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:outline-indigo-500"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ref. de Facturación</label>
                  <input
                    type="text"
                    placeholder="Auto-generar si vacío"
                    value={referencia}
                    onChange={e => setReferencia(e.target.value)}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Estado de Pago</label>
                  <select
                    value={estado}
                    onChange={e => setEstado(e.target.value as any)}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                  >
                    <option value="pendiente">🟡 Pendiente de Pago</option>
                    <option value="pagado">🟢 Pagado Completamente</option>
                    <option value="vencido">🔴 Sobre-vencido / Mora</option>
                  </select>
                </div>

                {estado === 'pagado' && (
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fecha Efectiva Pago</label>
                    <input
                      type="date"
                      value={fechaPago}
                      onChange={e => setFechaPago(e.target.value)}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700"
                    />
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-600 font-bold transition flex items-center justify-center cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  Guardar Factura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILED BANK SLIP RECEIPT MOCKUP OVERLAY MODAL */}
      {invoiceForMock && (
        <div className="modal-overlay fixed inset-0 bg-black/45 flex items-center justify-center z-[200] p-4 text-left">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden animate-scale-up border border-slate-200 shadow-2xl theme-bg-surface font-sans text-xs">
            {/* Header controls bar */}
            <div className="bg-slate-100/50 p-4 border-b border-slate-200 flex items-center justify-between text-xs font-bold theme-bg-surface">
              <span className="text-slate-700">Comprobante de Pago y Volante de Facturación</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintBarcodeSlip}
                  className="px-3 py-1.5 bg-slate-800 text-white hover:bg-slate-900 rounded-lg transition text-[10px] cursor-pointer flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir Recibo
                </button>
                <button
                  onClick={() => setInvoiceForMock(null)}
                  className="p-1 rounded-full text-slate-400 hover:bg-slate-200 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Certificate Slip Body */}
            <div className="p-8 space-y-6 bg-white overflow-y-auto max-h-[80vh]">
              {/* Institution and bank visual banner */}
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <h3 className="font-extrabold text-[14px] text-slate-900 tracking-tight">INSTITUTO SYNAPSIS</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Volante Universitario Certificado</p>
                  <p className="text-[10px] text-slate-400">NIT: 322199-B12 | Convenio Bancario: #9081221</p>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 p-2 rounded-xl text-center">
                  <Landmark className="w-5 h-5 text-indigo-600 mx-auto" />
                  <span className="text-[9px] font-black text-indigo-700 uppercase tracking-wide block mt-1">BANCO RECAUDADOR</span>
                </div>
              </div>

              {/* Student Details particulars */}
              <div className="grid grid-cols-2 gap-4 text-[11px] font-semibold text-slate-600">
                <div className="space-y-1">
                  <span>Estudiante Recaudado:</span>
                  <div className="font-extrabold text-slate-800" style={{ color: 'var(--gray-900)' }}>{invoiceForMock.studentName}</div>
                  <span className="text-[10px] text-slate-400 block font-mono">ID Alumno: {invoiceForMock.studentId.substring(0, 10).toUpperCase()}</span>
                </div>
                <div className="space-y-1 text-right">
                  <span>Referencia de Pago:</span>
                  <div className="font-extrabold text-indigo-700 font-mono text-[12px]">{invoiceForMock.referencia}</div>
                  <span className="text-[10px] text-slate-400 block">Vencimiento: {fmtDate(invoiceForMock.fechaVencimiento)}</span>
                </div>
              </div>

              {/* Transactions grid breakdown */}
              <div className="border border-slate-200 rounded-xl overflow-hidden font-medium text-[11px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-4">Descripción de Servicio</th>
                      <th className="py-2.5 px-4 text-center">Estado Facturado</th>
                      <th className="py-2.5 px-4 text-right">Monto Unitario</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="divide-x divide-slate-100">
                      <td className="py-3 px-4 font-extrabold text-slate-800">
                        Convenio Matrícula Académica - {invoiceForMock.concepto} Periodo Actual
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                          invoiceForMock.estado === 'pagado' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700 font-bold border border-rose-100'
                        }`}>
                          {invoiceForMock.estado}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-slate-800">
                        {stats.formatCurrency(invoiceForMock.pagoTotal)}
                      </td>
                    </tr>
                    <tr className="border-t border-slate-200 bg-slate-50 font-bold text-[12px]">
                      <td className="py-2.5 px-4 text-slate-800">CANTIDAD TOTAL DE LA TRANSACCIÓN</td>
                      <td></td>
                      <td className="py-2.5 px-4 text-right font-mono font-black text-indigo-700 text-[13px]">
                        {stats.formatCurrency(invoiceForMock.pagoTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Warning/Notes statement */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] text-slate-500 leading-relaxed italic">
                <b>Nota Importante para el Alumno:</b> Favor efectuar el depósito correspondiente en ventanilla bancaria autorizada o a través de nuestros canales transaccionales virtuales PSE usando el código de convenio provisto. Si cancela posterior al vencimiento se aplicarán penalidades del 5% de mora.
              </div>

              {/* MOCK BANK BARCODE & SCANNER AREA */}
              <div className="pt-4 border-t border-dashed border-slate-300 flex flex-col items-center justify-center space-y-2">
                {/* Barcode representation using CSS elements */}
                <div className="flex items-stretch justify-center h-12 w-full max-w-sm bg-slate-200 p-1 rounded-sm overflow-hidden bg-white border border-slate-200">
                  {Array.from({ length: 44 }).map((_, i) => {
                    const isWhite = Math.random() > 0.65;
                    const widths = ['w-0.5', 'w-1', 'w-1.5', 'w-2'];
                    const chosenWidth = widths[Math.floor(Math.random() * widths.length)];
                    return (
                      <div 
                        key={i} 
                        className={`h-full ${isWhite ? 'bg-transparent' : 'bg-black'} ${chosenWidth} mx-[0.5px]`}
                      ></div>
                    );
                  })}
                </div>
                <span className="text-[9px] text-slate-400 font-mono tracking-widest font-black uppercase">
                  (01) 7701234567890 (21) {invoiceForMock.referencia.replace('-', '')} (3900) {invoiceForMock.pagoTotal}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
