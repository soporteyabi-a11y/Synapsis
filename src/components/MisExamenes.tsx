/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, BookOpen, Trash2, Edit2, Play, Power, HelpCircle, Search } from 'lucide-react';
import { User, Exam, Parcial, Subject, Semester } from '../types';
import { fmtDate, uid, now } from '../lib/db';
import { SearchableSelect, SelectOption } from './SearchableSelect';

interface MisExamenesProps {
  currentUser: User;
  exams: Exam[];
  parciales: Parcial[];
  subjects: Subject[];
  semesters: Semester[];
  submissions: any[];
  onOpenBuilder: (examId: string) => void;
  onUpdateExams: (updated: Exam[]) => void;
  toast: (msg: string, type: 'success' | 'error' | 'warning') => void;
  users?: User[];
}

export default function MisExamenes({ 
  currentUser, exams, parciales, subjects, semesters, submissions, 
  onOpenBuilder, onUpdateExams, toast, users 
}: MisExamenesProps) {
  
  const isTeacher = currentUser.rol === 'docente';
  const allMyUserIds = (users && currentUser)
    ? users.filter(u => u.nombre === currentUser.nombre || u.email.toLowerCase() === currentUser.email.toLowerCase()).map(u => u.id)
    : [currentUser.id];

  const teacherSubjects = isTeacher 
    ? subjects.filter(s => (s.docenteId && allMyUserIds.includes(s.docenteId)) || currentUser.asignaturas?.includes(s.id))
    : subjects;

  const subjectOptions: SelectOption[] = teacherSubjects.map(s => ({
    value: s.nombre,
    label: s.nombre,
    subLabel: s.codigo ? `Código: ${s.codigo}` : undefined,
  }));

  const [filter, setFilter] = useState<'all' | 'activo' | 'borrador' | 'cerrado'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Form Fields
  const [title, setTitle] = useState('');
  const [materia, setMateria] = useState('');
  const [parcialId, setParcialId] = useState('');
  const [description, setDescription] = useState('');
  const [tiempo, setTiempo] = useState(60);
  const [intentos, setIntentos] = useState(1);
  const [aprobacion, setAprobacion] = useState(60);
  const [estado, setEstado] = useState<'borrador' | 'activo'>('borrador');
  const [aleatorio, setAleatorio] = useState(false);
  const [mostrarNota, setMostrarNota] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filteredExams = exams
    .filter(e => (e.docenteId && allMyUserIds.includes(e.docenteId)) || currentUser.id === e.docenteId || currentUser.rol === 'admin')
    .filter(e => filter === 'all' ? true : e.estado === filter)
    .filter(e => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      return e.titulo.toLowerCase().includes(q) || e.materia.toLowerCase().includes(q);
    });

  const examsPerPage = 8;
  const totalPages = Math.ceil(filteredExams.length / examsPerPage) || 1;
  const currentActivePage = Math.min(currentPage, totalPages);
  const paginatedExams = filteredExams.slice((currentActivePage - 1) * examsPerPage, currentActivePage * examsPerPage);

  const handleOpenModal = () => {
    setTitle('');
    setMateria('');
    setParcialId('');
    setDescription('');
    setTiempo(60);
    setIntentos(1);
    setAprobacion(60);
    setEstado('borrador');
    setAleatorio(false);
    setMostrarNota(true);
    setIsModalOpen(true);
  };

  const handleCreateExam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !materia.trim()) {
      toast('Título y materia son obligatorios', 'error');
      return;
    }

    const newExam: Exam = {
      id: uid(),
      titulo: title.trim().toUpperCase(),
      materia: materia.trim().toUpperCase(),
      parcialId: parcialId || null,
      descripcion: description.trim().toUpperCase(),
      docenteId: currentUser.id,
      estado,
      tiempo: Number(tiempo) || 0,
      intentos: Number(intentos) || 0,
      aprobacion: Number(aprobacion) || 60,
      aleatorio,
      mostrarNota,
      creado: now(),
      preguntas: [],
      bannerUrl: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&w=1200&q=80', // default books & theology banner
    };

    const nextExams = [...exams, newExam];
    onUpdateExams(nextExams);
    setIsModalOpen(false);

    toast('Examen creado. Abre el editor para agregar preguntas.', 'success');
    onOpenBuilder(newExam.id);
  };

  const toggleExamStatus = (id: string) => {
    const nextExams = exams.map(e => {
      if (e.id === id) {
        const nextState: 'activo' | 'borrador' | 'cerrado' = e.estado === 'activo' ? 'cerrado' : 'activo';
        return { ...e, estado: nextState };
      }
      return e;
    });
    onUpdateExams(nextExams);
    toast('Estado del examen actualizado', 'success');
  };

  const handleDeleteExam = (id: string) => {
    const nextExams = exams.filter(e => e.id !== id);
    onUpdateExams(nextExams);
    toast('Examen eliminado correctamente', 'success');
  };

  return (
    <div className="page-misExamenes animate-fade-in">
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="page-title text-2xl font-bold tracking-tight text-slate-900" style={{ color: 'var(--gray-900)' }}>
            Mis exámenes
          </h2>
          <div className="page-sub text-sm font-medium mt-1 text-slate-500">
            Crea y gestiona tus evaluaciones y cuestionarios interactivos
          </div>
        </div>
        <button 
          onClick={handleOpenModal}
          className="btn btn-primary self-start sm:self-center flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-white font-semibold shadow hover:scale-[1.02] transition-transform cursor-pointer"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo examen</span>
        </button>
      </div>

      {/* Chip Tabs Filters & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5">
        <div className="chip-tabs flex gap-2 flex-wrap">
          {(['all', 'activo', 'borrador', 'cerrado'] as const).map(tabKey => {
            const labels = { all: 'Todos', activo: 'Activos', borrador: 'Borradores', cerrado: 'Cerrados' };
            const isActive = filter === tabKey;
            return (
              <button
                key={tabKey}
                onClick={() => setFilter(tabKey)}
                className={`chip-tab px-4 py-1.5 rounded-full text-xs font-semibold cursor-pointer border select-none transition-all duration-150 ${
                  isActive 
                    ? 'bg-indigo-600 border-indigo-600 text-white' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                }`}
                style={isActive ? { backgroundColor: 'var(--primary)', borderColor: 'var(--primary)' } : {}}
              >
                {labels[tabKey]}
              </button>
            );
          })}
        </div>

        {/* Search input bar */}
        <div className="relative w-full md:max-w-xs">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <Search className="w-3.5 h-3.5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar examen por título o materia..."
            className="w-full pl-9 pr-8 py-1.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-semibold text-slate-800 transition duration-150 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-150 theme-bg-surface theme-border"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 cursor-pointer font-extrabold select-none text-[10px]"
              title="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Exams Grid/Table List */}
      <div className="card bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden theme-bg-surface theme-border">
        {filteredExams.length === 0 ? (
          <div className="empty-state py-12 text-center text-slate-500 flex flex-col items-center">
            <BookOpen className="w-12 h-12 text-slate-300 mb-3" />
            <h4 className="empty-title text-base font-semibold text-slate-700">Sin exámenes en esta categoría</h4>
            <p className="empty-sub text-xs text-slate-400 mt-1">Crea tu primer módulo utilizando el botón de arriba</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-600">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-medium text-xs uppercase tracking-wider border-b border-slate-250 theme-bg-surface">
                  <th className="py-3 px-4">Título</th>
                  <th className="py-3 px-4">Materia</th>
                  <th className="py-3 px-4">Preguntas</th>
                  <th className="py-3 px-4">Entregas</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Creado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedExams.map((e) => {
                  const numSubs = submissions.filter(s => s.examenId === e.id).length;
                  const statusBg = e.estado === 'activo' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : e.estado === 'borrador' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-100 text-slate-600 border-slate-200';
                  
                  return (
                    <tr key={e.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-semibold text-slate-900" style={{ color: 'var(--gray-900)' }}>
                        <div className="flex items-center gap-3">
                          <img
                            src={e.bannerUrl || 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&w=1200&q=80'}
                            alt={e.titulo}
                            className="w-14 h-8 rounded-lg object-cover border border-slate-200 shadow-xs shrink-0 bg-slate-50"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <span className="block font-extrabold truncate max-w-xs">{e.titulo}</span>
                            {e.subtitulo && (
                              <span className="block text-[10px] font-medium text-slate-400 italic line-clamp-1 max-w-xs">{e.subtitulo}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="badge inline-flex px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {e.materia}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{e.preguntas?.length || 0}</td>
                      <td className="py-3.5 px-4 text-slate-500">{numSubs}</td>
                      <td className="py-3.5 px-4">
                        <span className={`badge inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${statusBg}`}>
                          {e.estado}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">{fmtDate(e.creado)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex gap-1.5 items-center justify-end">
                          <button 
                            onClick={() => onOpenBuilder(e.id)}
                            className="btn btn-secondary text-xs px-2.5 py-1 flex items-center gap-1 rounded hover:bg-slate-100 border border-slate-200"
                            title="Editar preguntas en el Builder"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Contenido</span>
                          </button>
                          <button 
                            onClick={() => toggleExamStatus(e.id)}
                            className={`btn text-xs px-2.5 py-1 flex items-center gap-1 rounded border overflow-hidden ${
                              e.estado === 'activo' 
                                ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' 
                                : 'bg-emerald-50 border-emerald-250 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {e.estado === 'activo' ? <Power className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                            <span>{e.estado === 'activo' ? 'Cerrar' : 'Publicar'}</span>
                          </button>
                          {confirmDeleteId === e.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  handleDeleteExam(e.id);
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
                              onClick={() => setConfirmDeleteId(e.id)} 
                              className="btn text-xs p-1 rounded border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800 cursor-pointer"
                              title="Eliminar examen"
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

            {filteredExams.length > 8 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50">
                <span className="text-xs font-semibold text-slate-400">
                  Mostrando { (currentActivePage - 1) * 8 + 1 } a { Math.min(currentActivePage * 8, filteredExams.length) } de { filteredExams.length } exámenes
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 mr-2">
                    Página {currentActivePage} de {totalPages}
                  </span>
                  <button
                    disabled={currentActivePage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm transition"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={currentActivePage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm transition"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="modal-overlay fixed inset-0 bg-black/45 flex items-center justify-center z-[200] p-4">
          <div className="modal bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-y-auto max-h-[90vh] theme-bg-surface">
            <div className="modal-header border-b border-slate-100 p-4.5 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="modal-title font-bold text-slate-900 border-none">Nuevo examen</h3>
              <button onClick={() => setIsModalOpen(false)} className="modal-close hover:bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 transition">✕</button>
            </div>

            <form onSubmit={handleCreateExam} className="modal-body p-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group mb-4">
                  <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Título <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    required 
                    value={title} 
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Ej: Álgebra lineal" 
                    className="form-control w-full p-2 border rounded-lg focus:outline-indigo-600"
                  />
                </div>
                <div className="form-group mb-4">
                  <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Materia <span className="text-red-500">*</span></label>
                  <SearchableSelect
                    options={subjectOptions}
                    value={materia}
                    placeholder="-- Selecciona materia --"
                    searchPlaceholder="Buscar materia/asignatura..."
                    noResultsText="No se encontraron materias"
                    onChange={selectedMateria => {
                      setMateria(selectedMateria);
                      const matchingSub = subjects.find(s => s.nombre === selectedMateria);
                      const matchingParc = matchingSub ? parciales.find(p => p.asignatura === matchingSub.id) : null;
                      setParcialId(matchingParc?.id || '');
                    }}
                  />
                </div>
              </div>

              <div className="form-group mb-4">
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Parcial Relativo</label>
                <select 
                  value={parcialId} 
                  onChange={e => setParcialId(e.target.value)}
                  className="form-control w-full p-2 border rounded-lg focus:outline-indigo-600 bg-white"
                  disabled={!materia}
                >
                  <option value="">-- No vincular parcial --</option>
                  {(() => {
                    const matchingSub = subjects.find(s => s.nombre === materia);
                    const filteredParcs = matchingSub ? parciales.filter(p => p.asignatura === matchingSub.id) : [];
                    return filteredParcs.map(p => {
                      const sem = semesters.find(s => s.id === p.semestre);
                      return (
                        <option key={p.id} value={p.id}>
                          {p.nombre} {sem ? `· Semestre: ${sem.nombre}` : ''}
                        </option>
                      );
                    });
                  })()}
                </select>
              </div>

              <div className="form-group mb-4">
                <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Instrucciones / Descripción</label>
                <textarea 
                  value={description} 
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Instrucciones del examen..." 
                  rows={2}
                  className="form-control w-full p-2 border rounded-lg focus:outline-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group mb-4">
                  <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Tiempo límite (min, 0=S/L)</label>
                  <input 
                    type="number" 
                    min={0} 
                    value={tiempo} 
                    onChange={e => setTiempo(Number(e.target.value))}
                    className="form-control w-full p-2 border rounded-lg focus:outline-indigo-600"
                  />
                </div>
                <div className="form-group mb-4">
                  <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Intentos permitidos (0=inf)</label>
                  <input 
                    type="number" 
                    min={0} 
                    value={intentos} 
                    onChange={e => setIntentos(Number(e.target.value))}
                    className="form-control w-full p-2 border rounded-lg focus:outline-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group mb-4">
                  <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Nota aprobatoria (%)</label>
                  <input 
                    type="number" 
                    min={1} 
                    max={100}
                    value={aprobacion} 
                    onChange={e => setAprobacion(Number(e.target.value))}
                    className="form-control w-full p-2 border rounded-lg focus:outline-indigo-600"
                  />
                </div>
                <div className="form-group mb-4">
                  <label className="form-label text-xs font-semibold text-slate-700 block mb-1">Publicación</label>
                  <select 
                    value={estado} 
                    onChange={e => setEstado(e.target.value as 'borrador' | 'activo')}
                    className="form-control w-full p-2 border rounded-lg focus:outline-indigo-600 bg-white"
                  >
                    <option value="borrador">Guardar como Borrador</option>
                    <option value="activo">Publicar Activo</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2 bg-slate-50 p-3 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={aleatorio} 
                    onChange={e => setAleatorio(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600"
                  />
                  <span className="text-xs font-semibold text-slate-700">Orden de preguntas aleatorio</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={mostrarNota} 
                    onChange={e => setMostrarNota(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600"
                  />
                  <span className="text-xs font-semibold text-slate-700">Mostrar notas y respuestas finales al estudiante</span>
                </label>
              </div>

              <div className="modal-footer border-t border-slate-100 flex justify-end gap-3 pt-4 mt-4">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary px-4 py-2 border rounded-xl hover:bg-slate-50 cursor-pointer text-slate-700"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary px-4.5 py-2 text-white font-semibold rounded-xl cursor-pointer"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  Crear y abrir Editor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
