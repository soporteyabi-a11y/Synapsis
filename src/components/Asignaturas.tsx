/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Trash2, Edit2, BookOpen, GraduationCap, Users, ChevronLeft, ChevronRight, Search, Sparkles, RefreshCw } from 'lucide-react';
import { Subject, User } from '../types';
import { uid, now, fmtDate, generateSubjectCode } from '../lib/db';

interface AsignaturasProps {
  subjects: Subject[];
  users: User[];
  onUpdateSubjects: (updated: Subject[]) => void;
  toast: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

export default function Asignaturas({ subjects, users, onUpdateSubjects, toast }: AsignaturasProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [docenteId, setDocenteId] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Filter subjects based on search query
  const filteredSubjects = subjects.filter(sub => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const doc = users.find(u => u.id === sub.docenteId);
    const docName = doc ? doc.nombre : '';
    return (
      sub.nombre.toLowerCase().includes(q) ||
      (sub.codigo || '').toLowerCase().includes(q) ||
      docName.toLowerCase().includes(q)
    );
  });

  // Pagination states & calculations based on filtered list
  const itemsPerPage = 7;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredSubjects.length / itemsPerPage) || 1;
  const activePage = currentPage > totalPages ? totalPages : currentPage;

  const currentSubjects = filteredSubjects.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

  const docentes = users.filter(u => u.rol === 'docente' || u.rol === 'admin');

  const [isCodeAuto, setIsCodeAuto] = useState(true);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setNombre('');
    setIsCodeAuto(true);
    // Código generado automáticamente por defecto
    const autoCode = generateSubjectCode('', subjects);
    setCodigo(autoCode);
    setDocenteId('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (sub: Subject) => {
    setEditingId(sub.id);
    setNombre(sub.nombre);
    setCodigo(sub.codigo || generateSubjectCode(sub.nombre, subjects));
    setIsCodeAuto(false);
    setDocenteId(sub.docenteId || '');
    setIsModalOpen(true);
  };

  const handleNombreChange = (val: string) => {
    setNombre(val);
    if (!editingId && isCodeAuto) {
      setCodigo(generateSubjectCode(val, subjects));
    }
  };

  const handleRegenerateCode = () => {
    const freshCode = generateSubjectCode(nombre, subjects);
    setCodigo(freshCode);
    setIsCodeAuto(true);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formNombre = (form.elements.namedItem('nombre') as HTMLInputElement)?.value;
    const resolvedNombre = (nombre.trim() || (formNombre || '').trim());

    if (!resolvedNombre) {
      toast('El nombre de la materia es obligatorio', 'error');
      return;
    }

    const formCodigo = (form.elements.namedItem('codigo') as HTMLInputElement)?.value;
    const resolvedCodeInput = (codigo.trim() || (formCodigo || '').trim());
    const finalCode = resolvedCodeInput || generateSubjectCode(resolvedNombre, subjects);
    
    const formDocente = (form.elements.namedItem('docenteId') as HTMLSelectElement)?.value;
    const resolvedDocenteId = (docenteId || formDocente || '').trim();

    const nextSubs = [...subjects];

    if (editingId) {
      const idx = nextSubs.findIndex(s => s.id === editingId);
      if (idx > -1) {
        nextSubs[idx] = {
          ...nextSubs[idx],
          nombre: resolvedNombre,
          codigo: finalCode,
          docenteId: resolvedDocenteId || undefined,
          actualizado: now(),
        };
        onUpdateSubjects(nextSubs);
        toast('Materia o asignatura actualizada con éxito', 'success');
      }
    } else {
      const newSub: Subject = {
        id: uid(),
        nombre: resolvedNombre,
        codigo: finalCode,
        docenteId: resolvedDocenteId || undefined,
        creado: now(),
      };
      onUpdateSubjects([...nextSubs, newSub]);
      toast(`Asignatura creada satisfactoriamente con código ${finalCode}`, 'success');
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const nextSubs = subjects.filter(s => s.id !== id);
    onUpdateSubjects(nextSubs);
    toast('Asignatura eliminada del catálogo correctamente', 'success');
  };

  return (
    <div className="page-asignaturas animate-fade-in pb-12">
      <div className="page-header flex items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="page-title text-2xl font-bold tracking-tight text-slate-900" style={{ color: 'var(--gray-900)' }}>
            Asignaturas y materias
          </h2>
          <div className="page-sub text-sm font-medium mt-1 text-slate-500 font-sans">
            Gestiona los programas de estudio, silabos y docentes asignados a cada materia
          </div>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="btn btn-primary flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-white font-semibold shadow hover:scale-[1.02] transition-transform cursor-pointer"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          <BookOpen className="w-4 h-4" />
          <span>Nueva materia</span>
        </button>
      </div>

      {/* Caja de Búsqueda de Asignaturas */}
      <div className="mb-6 flex flex-col md:flex-row items-center gap-4 bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm theme-bg-surface theme-border justify-between">
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
            placeholder="Buscar por nombre de asignatura, código o docente..."
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
        <div className="flex items-center gap-1.5 shrink-0 self-start md:self-auto text-xs font-semibold text-slate-500 bg-slate-50/70 py-1.5 px-3 rounded-lg border border-slate-100 select-none">
          <span>Materias encontradas: </span>
          <span className="font-extrabold text-indigo-700">{filteredSubjects.length}</span>
        </div>
      </div>

      <div className="card bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden theme-bg-surface theme-border">
        {filteredSubjects.length === 0 ? (
          <div className="empty py-12 text-center text-slate-500 flex flex-col items-center">
            <BookOpen className="w-12 h-12 text-slate-300 mb-3" />
            <h4 className="font-bold text-slate-750">
              {searchQuery ? 'No se encontraron materias' : 'No hay asignaturas en el catálogo'}
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              {searchQuery ? 'Prueba cambiando los términos de búsqueda o registrando una nueva materia.' : 'Crea la primera materia utilizando el botón superior.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-600">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-medium text-xs uppercase tracking-wider theme-bg-surface border-b border-slate-200">
                  <th className="py-3 px-4">Asignatura</th>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Docente a cargo</th>
                  <th className="py-3 px-4">Registrado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {currentSubjects.map(sub => {
                  const doc = users.find(u => u.id === sub.docenteId);
                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                            <GraduationCap className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                          </div>
                          <span className="text-slate-900 font-bold block" style={{ color: 'var(--gray-900)' }}>
                            {sub.nombre}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs font-bold text-indigo-600">{sub.codigo || '—'}</td>
                      <td className="py-4 px-4 text-slate-755">
                        {doc ? (
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>{doc.nombre}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No asignado</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-xs text-slate-400">{fmtDate(sub.creado)}</td>
                      <td className="py-4 px-4 text-right">
                        <div className="inline-flex gap-1.5 justify-end">
                          <button
                            onClick={() => handleOpenEditModal(sub)}
                            className="p-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-500 cursor-pointer"
                            title="Editar materia"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {confirmDeleteId === sub.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  handleDelete(sub.id);
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
                              onClick={() => setConfirmDeleteId(sub.id)}
                              className="p-1 rounded border border-rose-225 bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                              title="Eliminar materia"
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

            {filteredSubjects.length > itemsPerPage && (
              <div className="px-4 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3 theme-bg-surface">
                <div className="text-xs text-slate-500 select-none">
                  Mostrando <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>{((activePage - 1) * itemsPerPage) + 1}</span> a{' '}
                  <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>
                    {Math.min(activePage * itemsPerPage, filteredSubjects.length)}
                  </span>{' '}
                  de <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>{filteredSubjects.length}</span> asignaturas
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

      {/* SUBJECTS MODAL */}
      {isModalOpen && (
        <div className="modal-overlay fixed inset-0 bg-black/45 flex items-center justify-center z-[200] p-4 text-left">
          <div className="modal bg-white rounded-2xl shadow-xl w-full max-w-sm theme-bg-surface">
            <div className="modal-header border-b border-slate-100 p-4.5 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="modal-title font-bold text-slate-900 border-none">
                {editingId ? 'Editar asignatura' : 'Registrar nueva asignatura'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="modal-close hover:bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-705 transition">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body p-5 space-y-4">
              <div className="form-group">
                <label htmlFor="subject-nombre" className="form-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nombre de la materia <span className="text-red-500">*</span></label>
                <input
                  id="subject-nombre"
                  name="nombre"
                  type="text"
                  required
                  value={nombre}
                  onChange={e => handleNombreChange(e.target.value)}
                  onInput={e => handleNombreChange((e.target as HTMLInputElement).value)}
                  placeholder="Ej / Química Orgánica"
                  className="form-control w-full p-2 border rounded-lg text-sm focus:outline-indigo-650 bg-white"
                />
              </div>

              <div className="form-group col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="subject-codigo" className="form-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Código de curso <span className="text-indigo-600 font-semibold font-mono">(Automático)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRegenerateCode}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition"
                    title="Regenerar código según el nombre"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Regenerar</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    id="subject-codigo"
                    name="codigo"
                    type="text"
                    value={codigo}
                    onChange={e => {
                      setCodigo(e.target.value);
                      setIsCodeAuto(false);
                    }}
                    onInput={e => {
                      setCodigo((e.target as HTMLInputElement).value);
                      setIsCodeAuto(false);
                    }}
                    placeholder="Ej / QUI-104"
                    className="form-control w-full p-2 border rounded-lg text-sm focus:outline-indigo-650 bg-slate-50 font-mono font-bold text-indigo-900 uppercase"
                  />
                  <span className="absolute right-2.5 top-2.5 pointer-events-none">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">
                  Se autocalcula automáticamente desde el nombre o puedes personalizarlo si lo deseas.
                </p>
              </div>

              <div className="form-group flex flex-col">
                <label htmlFor="subject-docenteId" className="form-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Docente a cargo</label>
                <select
                  id="subject-docenteId"
                  name="docenteId"
                  value={docenteId}
                  onChange={e => setDocenteId(e.target.value)}
                  className="form-control w-full p-2 border rounded-lg text-sm focus:outline-indigo-600 bg-white cursor-pointer text-slate-700"
                >
                  <option value="">-- No asignar docente --</option>
                  {docentes.map(d => (
                    <option key={d.id} value={d.id}>{d.nombre} ({d.rol})</option>
                  ))}
                </select>
              </div>

              <div className="modal-footer border-t border-slate-100 flex justify-end gap-2.5 pt-4 mt-6 bg-slate-50 rounded-b-2xl -mx-5 -mb-5 p-4 font-medium">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary px-4 py-2 border rounded-xl hover:bg-slate-100 text-slate-705 bg-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary px-4.5 py-2 text-white font-bold rounded-xl cursor-pointer"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  {editingId ? 'Guardar cambios' : 'Crear materia'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
