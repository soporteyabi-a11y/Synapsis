/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FileSpreadsheet, Plus, Trash2, Edit2, Search, UserCheck, AlertCircle, ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { User, Subject, Parcial, GradeRecord } from '../types';
import { uid, now, fmtDate, avatarColor, avatarLetter } from '../lib/db';
import { SearchableSelect } from './SearchableSelect';

interface RegistroNotasProps {
  gradeRecords: GradeRecord[];
  users: User[];
  subjects: Subject[];
  parciales: Parcial[];
  onUpdateGradeRecords: (updated: GradeRecord[]) => void;
  toast: (msg: string, type: 'success' | 'error' | 'warning') => void;
  currentUser?: User;
}

export default function RegistroNotas({ 
  gradeRecords, users, subjects, parciales, onUpdateGradeRecords, toast, currentUser 
}: RegistroNotasProps) {
  const isTeacher = currentUser?.rol === 'docente';
  const allMyUserIds = (users && currentUser)
    ? users.filter(u => u.nombre === currentUser.nombre || u.email.toLowerCase() === currentUser.email.toLowerCase()).map(u => u.id)
    : (currentUser ? [currentUser.id] : []);

  const teacherSubjects = isTeacher 
    ? subjects.filter(s => (s.docenteId && allMyUserIds.includes(s.docenteId)) || currentUser?.asignaturas?.includes(s.id))
    : subjects;
  const teacherSubjectIds = teacherSubjects.map(s => s.id);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filters search
  const [query, setQuery] = useState('');

  // Form states
  const [estudianteId, setEstudianteId] = useState('');
  const [asignaturaId, setAsignaturaId] = useState('');
  const [parcialId, setParcialId] = useState('');
  
  // Three grades states (EV1, EV2, Trabajos)
  const [notaEV1, setNotaEV1] = useState(3.0);
  const [notaEV2, setNotaEV2] = useState(3.0);
  const [notaTrabajo, setNotaTrabajo] = useState(3.0);
  
  const [comentario, setComentario] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const estudiantes = users.filter(u => u.rol === 'estudiante');

  const filteredRecords = gradeRecords
    .filter(r => {
      if (isTeacher) {
        return teacherSubjectIds.includes(r.asignaturaId);
      }
      return true;
    })
    .filter(r => {
      const student = users.find(u => u.id === r.estudianteId);
      const sub = subjects.find(s => s.id === r.asignaturaId);
      const matchQuery = (student?.nombre || '').toLowerCase().includes(query.toLowerCase()) || 
                         (sub?.nombre || '').toLowerCase().includes(query.toLowerCase());
      return matchQuery;
    });

  // Pagination states & calculations
  const itemsPerPage = 8;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const activePage = currentPage > totalPages ? totalPages : currentPage;

  const currentRecords = filteredRecords.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setEstudianteId(estudiantes[0]?.id || '');
    const firstSubId = teacherSubjects[0]?.id || '';
    setAsignaturaId(firstSubId);
    
    const matchingParcs = firstSubId ? parciales.filter(p => p.asignatura === firstSubId) : [];
    setParcialId(matchingParcs[0]?.id || '');
    
    setNotaEV1(3.0);
    setNotaEV2(3.0);
    setNotaTrabajo(3.0);
    setComentario('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rec: GradeRecord) => {
    setEditingId(rec.id);
    setEstudianteId(rec.estudianteId);
    setAsignaturaId(rec.asignaturaId);
    setParcialId(rec.parcialId);
    setNotaEV1(rec.notaEV1 !== undefined ? rec.notaEV1 : rec.nota);
    setNotaEV2(rec.notaEV2 !== undefined ? rec.notaEV2 : rec.nota);
    setNotaTrabajo(rec.notaTrabajo !== undefined ? rec.notaTrabajo : rec.nota);
    setComentario(rec.comentario || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!estudianteId || !asignaturaId || !parcialId) {
      toast('Todos los selectores son requeridos', 'error');
      return;
    }

    const n1 = Number(notaEV1);
    const n2 = Number(notaEV2);
    const nT = Number(notaTrabajo);
    
    if (
      isNaN(n1) || n1 < 0.0 || n1 > 5.0 ||
      isNaN(n2) || n2 < 0.0 || n2 > 5.0 ||
      isNaN(nT) || nT < 0.0 || nT > 5.0
    ) {
      toast('Cada una de las calificaciones (EV1, EV2 y Trabajos) debe estar entre 0.0 y 5.0', 'error');
      return;
    }

    // Calculate final grade: sum of three components, divided by 3
    const finalAvg = Number(((n1 + n2 + nT) / 3).toFixed(2));
    const isApproved = finalAvg >= 3.0;

    const nextRecords = [...gradeRecords];

    if (editingId) {
      const idx = nextRecords.findIndex(r => r.id === editingId);
      if (idx > -1) {
        nextRecords[idx] = {
          ...nextRecords[idx],
          estudianteId,
          asignaturaId,
          parcialId,
          nota: finalAvg,
          notaEV1: n1,
          notaEV2: n2,
          notaTrabajo: nT,
          aprobado: isApproved,
          comentario: comentario.trim(),
          actualizado: now(),
        };
        onUpdateGradeRecords(nextRecords);
        toast('Calificación y componentes guardados con éxito', 'success');
      }
    } else {
      const newRec: GradeRecord = {
        id: uid(),
        estudianteId,
        asignaturaId,
        parcialId,
        nota: finalAvg,
        notaEV1: n1,
        notaEV2: n2,
        notaTrabajo: nT,
        aprobado: isApproved,
        comentario: comentario.trim(),
        creado: now(),
      };
      onUpdateGradeRecords([...nextRecords, newRec]);
      toast('Calificación promediada y registrada correctamente', 'success');
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const nextRecords = gradeRecords.filter(r => r.id !== id);
    onUpdateGradeRecords(nextRecords);
    toast('Calificación eliminada correctamente', 'success');
  };

  // EXPORT TO EXCEL COMPLIANT WITH SPANISH REGIONAL KEYWORDS AND COLUMNS
  const exportToExcel = () => {
    let csvContent = "\uFEFF"; // UTF-8 BOM
    csvContent += "Estudiante;Cédula/Documento;Materia/Sílaba;Corte/Parcial;Evaluación 1 (EV1);Evaluación 2 (EV2);Trabajos;Nota Final;Aprobado;Observaciones;Fecha Registro\r\n";
    
    filteredRecords.forEach(rec => {
      const student = users.find(u => u.id === rec.estudianteId);
      const sub = subjects.find(s => s.id === rec.asignaturaId);
      const parc = parciales.find(p => p.id === rec.parcialId);
      const stName = student?.nombre || 'Estudiante';
      const stDoc = student?.cedula || '—';
      const subName = sub ? sub.nombre : '—';
      const parcName = parc ? parc.nombre : '—';
      
      const v1 = rec.notaEV1 !== undefined ? rec.notaEV1 : rec.nota;
      const v2 = rec.notaEV2 !== undefined ? rec.notaEV2 : rec.nota;
      const vT = rec.notaTrabajo !== undefined ? rec.notaTrabajo : rec.nota;
      const vF = rec.nota;
      
      const aprStr = rec.aprobado ? "Aprobado" : "Reprobado";
      const obs = (rec.comentario || "").replace(/;/g, ",").replace(/\r?\n|\r/g, " ");
      const dateStr = fmtDate(rec.creado);
      
      const f1 = v1.toFixed(1).replace(".", ",");
      const f2 = v2.toFixed(1).replace(".", ",");
      const fT = vT.toFixed(1).replace(".", ",");
      const fF = vF.toFixed(2).replace(".", ",");
      
      csvContent += `"${stName}";"${stDoc}";"${subName}";"${parcName}";${f1};${f2};${fT};${fF};"${aprStr}";"${obs}";"${dateStr}"\r\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `planilla_notas_consolidada_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast("Planilla con notas parciales (EV1, EV2, Trabajos) exportada a Excel", "success");
  };

  // PRINT PDF REPORT
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page-registroNotas animate-fade-in pb-12">
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="page-title text-2xl font-bold tracking-tight text-slate-900" style={{ color: 'var(--gray-900)' }}>
            Registro manual de calificaciones
          </h2>
          <div className="page-sub text-sm font-medium mt-1 text-slate-500 font-sans">
            Guarda notas presenciales, acumulativos, quiz intermedios y reportes definitivos con pesos del 33.3% para EV1, EV2 y Trabajos
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-white font-semibold text-xs bg-emerald-600 hover:bg-emerald-700 shadow transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar a Excel</span>
          </button>
          
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-slate-700 hover:text-slate-800 font-semibold text-xs bg-slate-100 hover:bg-slate-200 shadow transition-all cursor-pointer border border-slate-200"
          >
            <Printer className="w-4 h-4" />
            <span>Impimir / PDF</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="btn btn-primary flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-white font-semibold shadow hover:scale-[1.02] transition-transform cursor-pointer shrink-0"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <Plus className="w-4 h-4" />
            <span>Registrar nota</span>
          </button>
        </div>
      </div>

      {/* FILTER SEARCH INPUT AND META */}
      <div className="filters-meta flex flex-col sm:flex-row gap-3.5 mb-5 items-center justify-between print:hidden">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar estudiante o materia..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 p-2.5 text-xs font-semibold rounded-xl border border-slate-200 outline-none focus:border-indigo-550 bg-white"
          />
        </div>
        <span className="text-slate-400 text-xs font-bold font-mono tracking-wide">{filteredRecords.length} calificaciones listadas</span>
      </div>

      {/* GRID LOGS OF GRADES */}
      <div className="card bg-white rounded-2xl border border-slate-205 shadow-sm overflow-hidden theme-bg-surface theme-border">
        {filteredRecords.length === 0 ? (
          <div className="empty py-12 text-center text-slate-500 flex flex-col items-center">
            <FileSpreadsheet className="w-12 h-12 text-slate-300 mb-3" />
            <h4 className="font-bold text-slate-755">No hay notas registradas</h4>
            <p className="text-xs text-slate-400 mt-1">Inserta una nueva tupla de notas usando el control de arriba</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-600">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-medium text-xs uppercase tracking-wider theme-bg-surface border-b border-slate-200">
                  <th className="py-3 px-4">Estudiante</th>
                  <th className="py-3 px-4">Materia / Silabo</th>
                  <th className="py-3 px-4">Corte Evaluado</th>
                  <th className="py-3 px-1 text-center font-bold">EV1 (33%)</th>
                  <th className="py-3 px-1 text-center font-bold">EV2 (33%)</th>
                  <th className="py-3 px-1 text-center font-bold">Trabajo (33%)</th>
                  <th className="py-3 px-4 text-center font-bold">Definitiva</th>
                  <th className="py-3 px-4">Observaciones</th>
                  <th className="py-3 px-4">Registrado</th>
                  <th className="py-3 px-4 text-right print:hidden">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {currentRecords.map(rec => {
                  const student = users.find(u => u.id === rec.estudianteId);
                  const sub = subjects.find(s => s.id === rec.asignaturaId);
                  const parc = parciales.find(p => p.id === rec.parcialId);
                  const stName = student?.nombre || 'Estudiante eliminado';

                  // Extract subgrades gracefully with backward compatibility fallbacks
                  const v1 = rec.notaEV1 !== undefined ? rec.notaEV1 : rec.nota;
                  const v2 = rec.notaEV2 !== undefined ? rec.notaEV2 : rec.nota;
                  const vT = rec.notaTrabajo !== undefined ? rec.notaTrabajo : rec.nota;
                  const vFinal = rec.nota;

                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm shrink-0"
                            style={{ backgroundColor: avatarColor(stName) }}
                          >
                            {avatarLetter(stName)}
                          </div>
                          <span className="text-slate-800 font-bold" style={{ color: 'var(--gray-900)' }}>{stName}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs font-bold text-indigo-700">
                        {sub ? sub.nombre : '—'}
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-500">
                        {parc ? parc.nombre : '—'}
                      </td>
                      <td className="py-4 px-1 text-center text-xs font-semibold text-slate-700">
                        {v1.toFixed(1)}
                      </td>
                      <td className="py-4 px-1 text-center text-xs font-semibold text-slate-700">
                        {v2.toFixed(1)}
                      </td>
                      <td className="py-4 px-1 text-center text-xs font-semibold text-slate-700">
                        {vT.toFixed(1)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-black border ${
                          rec.aprobado 
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                            : 'bg-rose-50 border-rose-105 text-rose-700'
                        }`}>
                          {vFinal.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-400 italic max-w-[200px] truncate" title={rec.comentario}>
                        {rec.comentario || 'Sin observaciones'}
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-400">{fmtDate(rec.creado)}</td>
                      <td className="py-4 px-4 text-right">
                        <div className="inline-flex gap-1.5 justify-end">
                          <button
                            onClick={() => handleOpenEditModal(rec)}
                            className="p-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-500"
                            title="Editar calificación"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {confirmDeleteId === rec.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  handleDelete(rec.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
                              >
                                Sí
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(rec.id)}
                              className="p-1 rounded border border-rose-225 bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                              title="Eliminar calificación"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredRecords.length > itemsPerPage && (
              <div className="px-4 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3 theme-bg-surface">
                <div className="text-xs text-slate-500 select-none">
                  Mostrando <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>{((activePage - 1) * itemsPerPage) + 1}</span> a{' '}
                  <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>
                    {Math.min(activePage * itemsPerPage, filteredRecords.length)}
                  </span>{' '}
                  de <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>{filteredRecords.length}</span> calificaciones
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

      {/* RECORD GRADE MODAL DIALOG */}
      {isModalOpen && (
        <div className="modal-overlay fixed inset-0 bg-black/45 flex items-center justify-center z-[200] p-4 text-left">
          <div className="modal bg-white rounded-2xl shadow-xl w-full max-w-sm theme-bg-surface">
            <div className="modal-header border-b border-slate-100 p-4.5 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="modal-title font-bold text-slate-900 border-none">
                {editingId ? 'Editar calificación' : 'Registrar calificación'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="modal-close hover:bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 transition">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body p-5 space-y-4">
              <div className="form-group flex flex-col">
                <label className="form-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Seleccionar estudiante <span className="text-red-500">*</span></label>
                <SearchableSelect
                  options={estudiantes.map(e => ({
                    value: e.id,
                    label: e.nombre,
                    subLabel: e.email
                  }))}
                  value={estudianteId}
                  onChange={val => setEstudianteId(val)}
                  placeholder="-- Escoger estudiante --"
                  id="grade-student-select"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group flex flex-col">
                  <label className="form-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Asignatura <span className="text-red-500">*</span></label>
                  <SearchableSelect
                    options={teacherSubjects.map(s => ({
                      value: s.id,
                      label: s.nombre,
                      subLabel: s.codigo ? `Código: ${s.codigo}` : undefined
                    }))}
                    value={asignaturaId}
                    onChange={val => {
                      setAsignaturaId(val);
                      const filtered = parciales.filter(p => p.asignatura === val);
                      setParcialId(filtered[0]?.id || '');
                    }}
                    placeholder="-- Escoger materia --"
                    id="grade-subject-select"
                  />
                </div>
                <div className="form-group flex flex-col">
                  <label className="form-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Parcial / Corte <span className="text-red-500">*</span></label>
                  <select
                    value={parcialId}
                    onChange={e => setParcialId(e.target.value)}
                    className="form-control w-full p-2 border rounded-lg text-sm focus:outline-indigo-600 bg-white cursor-pointer"
                    disabled={!asignaturaId}
                  >
                    <option value="">-- Escoger parcial --</option>
                    {parciales.filter(p => p.asignatura === asignaturaId).map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-black text-indigo-700 uppercase tracking-widest block mb-2 font-sans">Componentes de Calificación</span>
                
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="form-group flex flex-col">
                    <label className="form-label text-[9px] font-black text-slate-400 uppercase block mb-1 font-sans">EV1 (33.3%) <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.0"
                      max="5.0"
                      required
                      value={notaEV1}
                      onChange={e => setNotaEV1(Number(e.target.value))}
                      placeholder="EV1"
                      className="form-control w-full p-2 border rounded-lg text-sm text-center font-bold"
                    />
                  </div>
                  <div className="form-group flex flex-col">
                    <label className="form-label text-[9px] font-black text-slate-400 uppercase block mb-1 font-sans">EV2 (33.3%) <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.0"
                      max="5.0"
                      required
                      value={notaEV2}
                      onChange={e => setNotaEV2(Number(e.target.value))}
                      placeholder="EV2"
                      className="form-control w-full p-2 border rounded-lg text-sm text-center font-bold"
                    />
                  </div>
                  <div className="form-group flex flex-col">
                    <label className="form-label text-[9px] font-black text-slate-400 uppercase block mb-1 font-sans">Trabajo <span className="text-red-500">*</span></label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.0"
                      max="5.0"
                      required
                      value={notaTrabajo}
                      onChange={e => setNotaTrabajo(Number(e.target.value))}
                      placeholder="TRA"
                      className="form-control w-full p-2 border rounded-lg text-sm text-center font-bold"
                    />
                  </div>
                </div>

                <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs font-sans">
                  <span className="font-semibold text-slate-500 block">Promedio Definitivo:</span>
                  <span className={`px-2 py-1.5 rounded-lg font-black border text-xs ${
                    ((Number(notaEV1) + Number(notaEV2) + Number(notaTrabajo)) / 3) >= 3.0
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                      : 'bg-rose-50 border-rose-100 text-rose-700'
                  }`}>
                    {((Number(notaEV1) + Number(notaEV2) + Number(notaTrabajo)) / 3).toFixed(2)} / 5.0
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Observaciones u observaciones de retroalimentación</label>
                <textarea
                  value={comentario}
                  onChange={e => setComentario(e.target.value)}
                  placeholder="Retroalimentación para el boletín académico..."
                  rows={2}
                  className="form-control w-full p-2 border rounded-lg text-sm focus:outline-indigo-600 bg-white"
                />
              </div>

              <div className="modal-footer border-t border-slate-100 flex justify-end gap-2.5 pt-4 mt-6 bg-slate-50 rounded-b-2xl -mx-5 -mb-5 p-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary px-4 py-2 border rounded-xl hover:bg-slate-100 text-slate-700 bg-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary px-4.5 py-2 text-white font-bold rounded-xl"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  {editingId ? 'Guardar cambios' : 'Registrar nota'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
