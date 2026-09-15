/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Milestone, Plus, Trash2, Edit2, Calendar, Target, Award, ChevronLeft, ChevronRight, Search, FileSpreadsheet } from 'lucide-react';
import { Parcial, Semester, Subject, User } from '../types';
import { uid, now, fmtDate } from '../lib/db';
import { SearchableSelect } from './SearchableSelect';
import { saveDocToFirestore, deleteDocFromFirestore } from '../lib/firebase';

interface ParcialesProps {
  parciales: Parcial[];
  semesters: Semester[];
  subjects: Subject[];
  onUpdateParciales: (updated: Parcial[]) => void;
  toast: (msg: string, type: 'success' | 'error' | 'warning') => void;
  currentUser?: User;
  users?: User[];
}

export default function Parciales({ 
  parciales, semesters, subjects, onUpdateParciales, toast, currentUser, users 
}: ParcialesProps) {
  const isTeacher = currentUser?.rol === 'docente';
  
  const allMyUserIds = (users && currentUser)
    ? users.filter(u => u.nombre === currentUser.nombre || u.email.toLowerCase() === currentUser.email.toLowerCase()).map(u => u.id)
    : (currentUser ? [currentUser.id] : []);

  const teacherSubjects = subjects.filter(
    s => (s.docenteId && allMyUserIds.includes(s.docenteId)) || currentUser?.asignaturas?.includes(s.id)
  );
  const teacherSubjectIds = teacherSubjects.map(s => s.id);

  const [onlyMySubjects, setOnlyMySubjects] = useState(isTeacher);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [nombre, setNombre] = useState('');
  const [semestre, setSemestre] = useState('');
  const [asignatura, setAsignatura] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [porcentaje, setPorcentaje] = useState(30);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Filter list of parciales based on search query and teacher subjects
  const filteredParciales = parciales.filter(p => {
    if (isTeacher && onlyMySubjects) {
      if (!teacherSubjectIds.includes(p.asignatura)) {
        return false;
      }
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const sub = subjects.find(s => s.id === p.asignatura);
    const subName = sub ? sub.nombre : '';
    const sem = semesters.find(s => s.id === p.semestre);
    const semName = sem ? sem.nombre : '';
    return (
      p.nombre.toLowerCase().includes(q) ||
      subName.toLowerCase().includes(q) ||
      semName.toLowerCase().includes(q)
    );
  });

  // Pagination states & calculations based on filtered list
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(25);
  const [currentPage, setCurrentPage] = useState(1);

  const activeItemsPerPage = itemsPerPage === 'all' ? (filteredParciales.length || 1) : itemsPerPage;
  const totalPages = Math.ceil(filteredParciales.length / activeItemsPerPage) || 1;
  const activePage = currentPage > totalPages ? totalPages : currentPage;

  const currentParciales = filteredParciales.slice((activePage - 1) * activeItemsPerPage, activePage * activeItemsPerPage);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setNombre('');
    setSemestre(semesters[0]?.id || '');
    setAsignatura(isTeacher ? (teacherSubjects[0]?.id || '') : (subjects[0]?.id || ''));
    setFechaInicio('');
    setFechaFin('');
    setPorcentaje(30);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: Parcial) => {
    setEditingId(p.id);
    setNombre(p.nombre);
    setSemestre(p.semestre || '');
    setAsignatura(p.asignatura || '');
    setFechaInicio(p.fechaInicio || '');
    setFechaFin(p.fechaFin || '');
    setPorcentaje(p.porcentaje || 30);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !semestre || !asignatura) {
      toast('Completa los campos obligatorios del parcial', 'error');
      return;
    }

    const nextParciales = [...parciales];

    if (editingId) {
      const idx = nextParciales.findIndex(p => p.id === editingId);
      if (idx > -1) {
        const updatedP: Parcial = {
          ...nextParciales[idx],
          nombre: nombre.trim().toUpperCase(),
          semestre,
          asignatura,
          fechaInicio,
          fechaFin,
          porcentaje: Number(porcentaje) || 30,
          actualizado: now(),
        };
        nextParciales[idx] = updatedP;
        saveDocToFirestore('parciales', updatedP);
        onUpdateParciales(nextParciales);
        toast('Módulo parcial actualizado correctamente', 'success');
      }
    } else {
      const newParcial: Parcial = {
        id: uid(),
        nombre: nombre.trim().toUpperCase(),
        semestre,
        asignatura,
        fechaInicio,
        fechaFin,
        estado: 'abierto',
        porcentaje: Number(porcentaje) || 30,
        creado: now(),
      };
      saveDocToFirestore('parciales', newParcial);
      onUpdateParciales([...nextParciales, newParcial]);
      toast('Nuevo parcial creado exitosamente', 'success');
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteDocFromFirestore('parciales', id);
    const nextParciales = parciales.filter(p => p.id !== id);
    onUpdateParciales(nextParciales);
    toast('Corte o parcial eliminado correctamente', 'success');
  };

  return (
    <div className="page-parciales animate-fade-in pb-12">
      <div className="page-header flex items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="page-title text-2xl font-bold tracking-tight text-slate-900" style={{ color: 'var(--gray-900)' }}>
            {isTeacher ? 'Mis parciales y cortes' : 'Cortes y parciales evaluativos'}
          </h2>
          <div className="page-sub text-sm font-medium mt-1 text-slate-500 font-sans">
            {isTeacher 
              ? 'Visualiza y gestiona los parciales creados por el administrador para tus materias asignadas'
              : 'Comanda los cronogramas por corte porcentual, metas académicas y parciales mensuales'
            }
          </div>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="btn btn-primary flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-white font-semibold shadow hover:scale-[1.02] transition-transform cursor-pointer"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          <Milestone className="w-4 h-4" />
          <span>Nuevo corte parcial</span>
        </button>
      </div>

      {/* Caja de Búsqueda de Parciales */}
      <div className="mb-6 flex flex-col gap-4 bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm theme-bg-surface theme-border">
        {isTeacher && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 mb-1">
            <div className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-505 animate-pulse" />
              <p className="text-xs font-bold text-slate-705 uppercase tracking-wider">
                Control de Parciales para Docentes
              </p>
            </div>
            <div className="flex items-center gap-2 font-sans">
              <span className="text-xs text-slate-500 font-semibold">Filtro de asignaturas:</span>
              <div className="inline-flex rounded-xl p-0.5 bg-slate-100 border border-slate-200">
                <button
                  type="button"
                  onClick={() => { setOnlyMySubjects(true); setCurrentPage(1); }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    onlyMySubjects 
                      ? 'bg-white text-emerald-700 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Sólo mis materias ({teacherSubjects.length})
                </button>
                <button
                  type="button"
                  onClick={() => { setOnlyMySubjects(false); setCurrentPage(1); }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    !onlyMySubjects 
                      ? 'bg-white text-indigo-700 shadow-xs' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Ver todo el registro
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row items-center gap-4 justify-between">
          <div className="relative w-full md:max-w-md flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por nombre de parcial, materia o semestre..."
              className="w-full pl-10 pr-9 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm font-semibold text-slate-800 transition duration-150 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-150"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer font-extrabold select-none text-xs transition"
                title="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span>Mostrar:</span>
              <select
                value={itemsPerPage}
                onChange={e => setItemsPerPage(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="p-1.5 text-xs font-bold border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500"
              >
                <option value={10}>10 por pág.</option>
                <option value={25}>25 por pág.</option>
                <option value={50}>50 por pág.</option>
                <option value="all">TODOS ({filteredParciales.length})</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 text-xs font-semibold text-slate-500 bg-slate-50/70 py-1.5 px-3 rounded-lg border border-slate-100 select-none">
              <span>Parciales: </span>
              <span className="font-extrabold text-indigo-700">{filteredParciales.length}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden theme-bg-surface theme-border">
        {filteredParciales.length === 0 ? (
          <div className="empty py-12 text-center text-slate-500 flex flex-col items-center">
            <Milestone className="w-12 h-12 text-slate-300 mb-3" />
            <h4 className="font-bold text-slate-755">
              {searchQuery ? 'No se encontraron parciales' : 'No hay cortes evaluativos'}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? 'Intenta buscando otros términos o materias.' : 'Crea el primer parcial utilizando el botón superior.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-600">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-medium text-xs uppercase tracking-wider theme-bg-surface border-b border-slate-200">
                  <th className="py-3 px-4">Corte Parcial</th>
                  <th className="py-3 px-4">Syllabus Materia</th>
                  <th className="py-3 px-4">Periodo Calendario</th>
                  <th className="py-3 px-4">Ponderado %</th>
                  <th className="py-3 px-4">Vigencia corte</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {currentParciales.map(p => {
                  const sem = semesters.find(s => s.id === p.semestre);
                  const sub = subjects.find(s => s.id === p.asignatura);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-4 px-4 font-bold text-slate-805" style={{ color: 'var(--gray-900)' }}>
                        {p.nombre}
                      </td>
                      <td className="py-4 px-4 text-xs font-bold text-indigo-700">
                        {sub ? sub.nombre : '—'}
                      </td>
                      <td className="py-4 px-4 text-slate-500 text-xs">
                        {sem ? sem.nombre : '—'}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="badge inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold text-xs">
                          <Target className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{p.porcentaje}%</span>
                        </span>
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-400">
                        {p.fechaInicio && p.fechaFin ? (
                          <div className="flex items-center gap-1 font-semibold text-slate-505">
                            <Calendar className="w-3.5 h-3.5 text-slate-350" />
                            <span>{p.fechaInicio} al {p.fechaFin}</span>
                          </div>
                        ) : (
                          <span className="italic">Sin vigencia establecida</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="inline-flex gap-1.5 justify-end">
                          <button
                            onClick={() => handleOpenEditModal(p)}
                            className="p-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-505 cursor-pointer"
                            title="Editar corte"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {confirmDeleteId === p.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  handleDelete(p.id);
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
                              onClick={() => setConfirmDeleteId(p.id)}
                              className="p-1 rounded border border-rose-225 bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                              title="Eliminar corte"
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

            {itemsPerPage !== 'all' && totalPages > 1 && (
              <div className="px-4 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3 theme-bg-surface">
                <div className="text-xs text-slate-500 select-none">
                  Mostrando <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>{((activePage - 1) * activeItemsPerPage) + 1}</span> a{' '}
                  <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>
                    {Math.min(activePage * activeItemsPerPage, filteredParciales.length)}
                  </span>{' '}
                  de <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>{filteredParciales.length}</span> cortes parciales
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

      {/* PARCIAL MODAL */}
      {isModalOpen && (
        <div className="modal-overlay fixed inset-0 bg-black/45 flex items-center justify-center z-[200] p-4 text-left">
          <div className="modal bg-white rounded-2xl shadow-xl w-full max-w-md theme-bg-surface">
            <div className="modal-header border-b border-slate-100 p-4.5 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="modal-title font-bold text-slate-900 border-none">
                {editingId ? 'Editar corte' : 'Registrar nuevo corte'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="modal-close hover:bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-705 transition">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body p-5 space-y-4">
              <div className="form-group">
                <label className="form-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nombre del parcial o corte <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej / Primer corte de semestre"
                  className="form-control w-full p-2 border rounded-lg text-sm focus:outline-indigo-650 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Semestre vinculante <span className="text-red-500">*</span></label>
                  <SearchableSelect
                    options={semesters.map(s => ({ value: s.id, label: s.nombre, subLabel: s.estado }))}
                    value={semestre}
                    onChange={val => setSemestre(val)}
                    placeholder="Semestre..."
                    id="parcial-semester-select"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Programa / Materia <span className="text-red-500">*</span></label>
                  <SearchableSelect
                    options={(isTeacher ? teacherSubjects : subjects).map(s => ({ value: s.id, label: s.nombre, subLabel: s.codigo ? `Código: ${s.codigo}` : undefined }))}
                    value={asignatura}
                    onChange={val => setAsignatura(val)}
                    placeholder="Materia..."
                    id="parcial-subject-select"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-sans">Fecha de Apertura</label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={e => setFechaInicio(e.target.value)}
                    className="form-control w-full p-2 border rounded-lg text-sm focus:outline-indigo-650 bg-white"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-sans">Fecha de Cierre</label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={e => setFechaFin(e.target.value)}
                    className="form-control w-full p-2 border rounded-lg text-sm focus:outline-indigo-650 bg-white"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Ponderación académica (%) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  required
                  value={porcentaje}
                  onChange={e => setPorcentaje(Number(e.target.value))}
                  placeholder="Ej / 30"
                  className="form-control w-full p-2 border rounded-lg text-sm focus:outline-indigo-650 bg-white font-bold text-indigo-700"
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
                  {editingId ? 'Guardar cambios' : 'Crear corte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
