/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Users, Plus, Trash2, Edit2, Search, BookOpen, GraduationCap, ChevronLeft, ChevronRight, Upload, Download, FileSpreadsheet, Sparkles, RefreshCw, Key } from 'lucide-react';
import { User, Subject, Semester } from '../types';
import { uid, now, fmtDate, avatarColor, avatarLetter, generateStudentCode } from '../lib/db';
import { deleteDocFromFirestore, saveDocToFirestore } from '../lib/firebase';

interface EstudiantesProps {
  users: User[];
  subjects: Subject[];
  semesters: Semester[];
  onUpdateUsers: (updated: User[]) => void;
  onNavigateToHistory: (studentId: string) => void;
  toast: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

export default function Estudiantes({ 
  users, subjects, semesters, onUpdateUsers, onNavigateToHistory, toast 
}: EstudiantesProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Filter search
  const [query, setQuery] = useState('');

  // Form states
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [codigo, setCodigo] = useState('');
  const [cedula, setCedula] = useState('');
  const [celular, setCelular] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Linkage/enrollment modal states
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkingStudent, setLinkingStudent] = useState<User | null>(null);
  const [selectedSemesterId, setSelectedSemesterId] = useState('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);

  const handleOpenLinkModal = (st: User) => {
    setLinkingStudent(st);
    setSelectedSemesterId(st.semestre || '');
    setSelectedSubjectIds(st.asignaturas || []);
    setIsLinkModalOpen(true);
  };

  const handleSaveLinkage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkingStudent) return;

    const nextUsers = users.map(u => {
      if (u.id === linkingStudent.id) {
        return {
          ...u,
          semestre: selectedSemesterId || undefined,
          asignaturas: selectedSubjectIds,
        };
      }
      return u;
    });

    onUpdateUsers(nextUsers);
    toast(`Materias y período académico asignados correctamente a ${linkingStudent.nombre}`, 'success');
    setIsLinkModalOpen(false);
    setLinkingStudent(null);
  };

  const handleToggleSubject = (subId: string) => {
    setSelectedSubjectIds(prev =>
      prev.includes(subId) ? prev.filter(id => id !== subId) : [...prev, subId]
    );
  };

  // Batch import modal states
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchRawText, setBatchRawText] = useState('');

  // Items per page option
  const [itemsPerPage, setItemsPerPage] = useState<number | 'all'>(25);
  const [currentPage, setCurrentPage] = useState(1);

  const estudiantes = users.filter(u => u.rol === 'estudiante');

  const filteredEstudiantes = estudiantes.filter(e => 
    e.nombre.toLowerCase().includes(query.toLowerCase()) || 
    e.email.toLowerCase().includes(query.toLowerCase()) ||
    (e.cedula && e.cedula.toLowerCase().includes(query.toLowerCase())) ||
    (e.codigo && e.codigo.toLowerCase().includes(query.toLowerCase()))
  );

  const activeItemsPerPage = itemsPerPage === 'all' ? (filteredEstudiantes.length || 1) : itemsPerPage;
  const totalPages = Math.ceil(filteredEstudiantes.length / activeItemsPerPage) || 1;
  const activePage = currentPage > totalPages ? totalPages : currentPage;

  const currentEstudiantes = filteredEstudiantes.slice((activePage - 1) * activeItemsPerPage, activePage * activeItemsPerPage);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setNombre('');
    setEmail('');
    setPass('');
    setCodigo(generateStudentCode(users));
    setCedula('');
    setCelular('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (st: User) => {
    setEditingId(st.id);
    setNombre(st.nombre);
    setEmail(st.email || '');
    setPass('');
    setCodigo(st.codigo || generateStudentCode(users));
    setCedula(st.cedula || '');
    setCelular(st.celular || '');
    setIsModalOpen(true);
  };

  const handleRegenerateStudentCode = () => {
    const newCode = generateStudentCode(users);
    setCodigo(newCode);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast('Suministra el nombre del estudiante', 'error');
      return;
    }

    const nextUsers = [...users];

    // Determine final email
    let finalEmail = email.trim();
    if (!finalEmail) {
      const cleanName = nombre.trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, ".");
      const slug = cleanName.split('.').filter(Boolean).join('.');
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      finalEmail = `${slug || 'estudiante'}.${randomNum}@instituto.edu.co`;
    }

    const finalCode = (codigo.trim() || generateStudentCode(users)).toUpperCase();

    if (editingId) {
      const idx = nextUsers.findIndex(u => u.id === editingId);
      if (idx > -1) {
        if (users.some(u => u.id !== editingId && u.email.toLowerCase() === finalEmail.toLowerCase())) {
          toast('Este correo de estudiante ya se encuentra en uso', 'error');
          return;
        }

        const updatedUser: User = {
          ...nextUsers[idx],
          nombre: nombre.trim().toUpperCase(),
          email: finalEmail.toLowerCase(),
          codigo: finalCode,
          cedula: cedula.trim().toUpperCase() || undefined,
          celular: celular.trim().toUpperCase() || undefined,
          ...(pass ? { pass: pass.trim() } : {}),
        };
        nextUsers[idx] = updatedUser;
        saveDocToFirestore('users', updatedUser);
        onUpdateUsers(nextUsers);
        toast('Ficha del estudiante actualizada correctamente', 'success');
      }
    } else {
      if (users.some(u => u.email.toLowerCase() === finalEmail.toLowerCase())) {
        toast('El correo generado o ingresado ya está en uso', 'error');
        return;
      }

      const newSt: User = {
        id: uid(),
        nombre: nombre.trim().toUpperCase(),
        email: finalEmail.toLowerCase(),
        pass: pass.trim() || finalCode,
        codigo: finalCode,
        rol: 'estudiante',
        creado: now(),
        cedula: cedula.trim().toUpperCase() || undefined,
        celular: celular.trim().toUpperCase() || undefined,
      };

      saveDocToFirestore('users', newSt);
      onUpdateUsers([...nextUsers, newSt]);
      toast(`Estudiante registrado. Correo: ${finalEmail} | Código: ${finalCode}`, 'success');
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteDocFromFirestore('users', id);
    const nextUsers = users.filter(u => u.id !== id);
    onUpdateUsers(nextUsers);
    toast('Estudiante desvinculado del sistema correctamente', 'success');
  };

  // Batch import processing
  const handleProcessBatchImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchRawText.trim()) {
      toast('Ingresa la lista de nombres para matricular en lote', 'error');
      return;
    }

    const lines = batchRawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      toast('No se encontraron líneas válidas', 'error');
      return;
    }

    const newUsersList: User[] = [];
    let addedCount = 0;
    const existingEmails = new Set(users.map(u => u.email.toLowerCase()));

    lines.forEach((line) => {
      const parts = line.split(/[,;\t|]+/).map(p => p.trim());
      const studentName = parts[0];
      if (!studentName || studentName.length < 2) return;

      let customEmail = parts[1] || '';
      let customCedula = parts[2] || '';
      let customCelular = parts[3] || '';

      const cleanName = studentName.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, ".");
      const slug = cleanName.split('.').filter(Boolean).join('.');
      
      let finalEmail = customEmail ? customEmail.toLowerCase() : '';
      if (!finalEmail || existingEmails.has(finalEmail)) {
        let rand = Math.floor(1000 + Math.random() * 9000);
        finalEmail = `${slug || 'estudiante'}.${rand}@instituto.edu.co`;
        while (existingEmails.has(finalEmail)) {
          rand = Math.floor(1000 + Math.random() * 9000);
          finalEmail = `${slug || 'estudiante'}.${rand}@instituto.edu.co`;
        }
      }
      existingEmails.add(finalEmail);

      const automaticCode = generateStudentCode([...users, ...newUsersList]);

      const newSt: User = {
        id: uid(),
        nombre: studentName.toUpperCase(),
        email: finalEmail,
        pass: automaticCode,
        codigo: automaticCode,
        rol: 'estudiante',
        creado: now(),
        cedula: customCedula ? customCedula.toUpperCase() : undefined,
        celular: customCelular ? customCelular.toUpperCase() : undefined,
      };

      saveDocToFirestore('users', newSt);
      newUsersList.push(newSt);
      addedCount++;
    });

    if (addedCount > 0) {
      onUpdateUsers([...users, ...newUsersList]);
      toast(`¡Éxito! Se matricularon ${addedCount} estudiantes correctamente.`, 'success');
      setIsBatchModalOpen(false);
      setBatchRawText('');
    } else {
      toast('No se pudieron agregar estudiantes. Revisa el formato de entrada.', 'warning');
    }
  };

  // Export backup JSON of students
  const handleExportBackup = () => {
    const jsonStr = JSON.stringify(estudiantes, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `respaldo_estudiantes_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Copia de seguridad descargada correctamente.', 'success');
  };

  // Import backup JSON
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported) && imported.length > 0) {
          const existingMap = new Map<string, User>();
          users.forEach(u => existingMap.set(u.id, u));

          imported.forEach((st: User) => {
            if (st && st.nombre) {
              const stId = st.id || uid();
              const existing = existingMap.get(stId);
              const mergedSt: User = {
                ...existing,
                ...st,
                id: stId,
                rol: 'estudiante',
              };
              existingMap.set(stId, mergedSt);
              saveDocToFirestore('users', mergedSt);
            }
          });

          onUpdateUsers(Array.from(existingMap.values()));
          toast(`Se han restaurado/importado ${imported.length} estudiantes correctamente.`, 'success');
        } else {
          toast('El archivo JSON no contiene un listado de estudiantes válido.', 'error');
        }
      } catch (err) {
        toast('Error al leer el archivo de copia de seguridad.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="page-estudiantes animate-fade-in pb-12">
      <div className="page-header flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="page-title text-2xl font-bold tracking-tight text-slate-900" style={{ color: 'var(--gray-900)' }}>
            Matrícula de Estudiantes
          </h2>
          <div className="page-sub text-sm font-medium mt-1 text-slate-500 font-sans">
            Gestiona la admisión, matrícula y consulta los historiales de notas correspondientes
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="btn flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-slate-700 bg-slate-100 hover:bg-slate-200 font-bold border border-slate-200 transition-all cursor-pointer text-xs"
            title="Ingresa múltiples nombres a la vez"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Carga Masiva</span>
          </button>

          <button
            onClick={handleExportBackup}
            className="btn flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-slate-700 bg-white hover:bg-slate-50 font-bold border border-slate-200 transition-all cursor-pointer text-xs"
            title="Descargar copia de seguridad en JSON"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            <span>Exportar Copia</span>
          </button>

          <label
            className="btn flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-slate-700 bg-white hover:bg-slate-50 font-bold border border-slate-200 transition-all cursor-pointer text-xs"
            title="Restaurar lista desde archivo JSON"
          >
            <Upload className="w-4 h-4 text-violet-600" />
            <span>Restaurar Copia</span>
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>

          <button
            onClick={handleOpenCreateModal}
            className="btn btn-primary flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-white font-semibold shadow hover:scale-[1.02] transition-transform cursor-pointer shrink-0 text-xs sm:text-sm"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <Plus className="w-4 h-4" />
            <span>Matricular estudiante</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="filter-tools flex flex-col sm:flex-row gap-3.5 mb-5 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, correo o cédula..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-9 p-2.5 text-xs font-semibold rounded-xl border border-slate-200 outline-none focus:border-indigo-550 bg-white"
          />
        </div>
        <div className="flex items-center gap-3">
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
              <option value={100}>100 por pág.</option>
              <option value="all">TODOS ({filteredEstudiantes.length})</option>
            </select>
          </div>
          <span className="text-slate-500 text-xs font-bold font-mono bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
            Total: {filteredEstudiantes.length} estudiantes
          </span>
        </div>
      </div>

      <div className="card bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden theme-bg-surface theme-border">
        {filteredEstudiantes.length === 0 ? (
          <div className="empty py-12 text-center text-slate-500 flex flex-col items-center">
            <Users className="w-12 h-12 text-slate-300 mb-3" />
            <h4 className="font-bold text-slate-755">No hay estudiantes admitidos</h4>
            <p className="text-xs text-slate-450 mt-1">Matricula alumnos utilizando el botón de la parte superior</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-600">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-medium text-xs uppercase tracking-wider theme-bg-surface border-b border-slate-200">
                  <th className="py-3 px-4">Estudiante</th>
                  <th className="py-3 px-4">Cédula</th>
                  <th className="py-3 px-4">Celular</th>
                  <th className="py-3 px-4">Código único</th>
                  <th className="py-3 px-4">Correo</th>
                  <th className="py-3 px-4">Semestre / Materias</th>
                  <th className="py-3 px-4">Fecha Matrícula</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {currentEstudiantes.map(st => (
                  <tr key={st.id} className="hover:bg-slate-50/50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-sm shrink-0"
                          style={{ backgroundColor: avatarColor(st.nombre) }}
                        >
                          {avatarLetter(st.nombre)}
                        </div>
                        <span className="text-slate-900 font-extrabold" style={{ color: 'var(--gray-900)' }}>
                          {st.nombre}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs font-semibold text-slate-500">
                      {st.cedula || <span className="text-slate-350 italic text-[11px] font-normal">No registrada</span>}
                    </td>
                    <td className="py-4 px-4 text-xs font-semibold text-slate-500">
                      {st.celular || <span className="text-slate-350 italic text-[11px] font-normal">No registrado</span>}
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-mono text-xs font-extrabold text-indigo-700 bg-indigo-50/50 px-2 py-1 rounded border border-indigo-100">
                        {st.codigo || st.id.substring(0,4).toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-xs font-mono text-slate-600 lowercase whitespace-nowrap overflow-hidden text-ellipsis max-w-xs email-display" title={st.email.toLowerCase()}>{st.email.toLowerCase()}</td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-violet-700 bg-violet-50/50 px-2 py-0.5 rounded border border-violet-100 max-w-max">
                          {semesters.find(s => s.id === st.semestre)?.nombre || 'No asignado'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {st.asignaturas && st.asignaturas.length > 0 
                            ? `${st.asignaturas.length} materia(s) vinculada(s)` 
                            : 'Ninguna materia asociada'}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-400">{fmtDate(st.creado)}</td>
                    <td className="py-4 px-4 text-right">
                      <div className="inline-flex gap-1.5 items-center justify-end">
                        <button
                          onClick={() => handleOpenLinkModal(st)}
                          className="btn text-xs px-2.5 py-1.5 rounded border border-violet-205 bg-violet-50 hover:bg-violet-100 text-violet-700 flex items-center gap-1 cursor-pointer font-bold shrink-0 shadow-sm"
                        >
                          <GraduationCap className="w-3.5 h-3.5 text-violet-600" />
                          <span>Asignar</span>
                        </button>
                        <button
                          onClick={() => onNavigateToHistory(st.id)}
                          className="btn text-xs px-2.5 py-1.5 rounded border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center gap-1 cursor-pointer shrink-0"
                          title="Explorar notas e historial de exámenes"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Historial</span>
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(st)}
                          className="p-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-500 cursor-pointer"
                          title="Editar estudiante"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {confirmDeleteId === st.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                handleDelete(st.id);
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
                            onClick={() => setConfirmDeleteId(st.id)}
                            className="p-1 rounded border border-rose-225 bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                            title="Eliminar estudiante"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {itemsPerPage !== 'all' && totalPages > 1 && (
              <div className="px-4 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3 theme-bg-surface">
                <div className="text-xs text-slate-500 select-none">
                  Mostrando <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>{((activePage - 1) * activeItemsPerPage) + 1}</span> a{' '}
                  <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>
                    {Math.min(activePage * activeItemsPerPage, filteredEstudiantes.length)}
                  </span>{' '}
                  de <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>{filteredEstudiantes.length}</span> estudiantes
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

      {/* STUDENT REGISTRATION DIALOG */}
      {isModalOpen && (
        <div className="modal-overlay fixed inset-0 bg-black/45 flex items-center justify-center z-[200] p-4 text-left">
          <div className="modal bg-white rounded-2xl shadow-xl w-full max-w-sm theme-bg-surface">
            <div className="modal-header border-b border-slate-100 p-4.5 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="modal-title font-bold text-slate-900 border-none">
                {editingId ? 'Editar matrícula' : 'Matricular nuevo alumno'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="modal-close hover:bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-705 transition">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body p-5 space-y-4">
              <div className="form-group flex flex-col">
                <label className="form-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nombre Completo <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Tu nombre completo académico"
                  className="form-control w-full p-2.5 border rounded-xl text-sm focus:outline-indigo-650 bg-white"
                />
              </div>

              <div className="form-group flex flex-col">
                <label className="form-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Cédula de Ciudadanía</label>
                <input
                  type="text"
                  value={cedula}
                  onChange={e => setCedula(e.target.value)}
                  placeholder="Número de documento de identidad"
                  className="form-control w-full p-2.5 border rounded-xl text-sm focus:outline-indigo-650 bg-white"
                />
              </div>

              <div className="form-group flex flex-col">
                <label className="form-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Celular</label>
                <input
                  type="text"
                  value={celular}
                  onChange={e => setCelular(e.target.value)}
                  placeholder="Número de teléfono celular"
                  className="form-control w-full p-2.5 border rounded-xl text-sm focus:outline-indigo-650 bg-white"
                />
              </div>

              <div className="form-group flex flex-col">
                <label className="form-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Correo electrónico</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Opcional (se autogenerará si está vacío)"
                  className="form-control w-full p-2.5 border rounded-xl text-sm focus:outline-indigo-650 bg-white"
                />
              </div>

              <div className="form-group col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="form-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Código de estudiante <span className="text-indigo-600 font-semibold font-mono">(Automático)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleRegenerateStudentCode}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition"
                    title="Generar otro código aleatorio"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Regenerar</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={codigo}
                    onChange={e => setCodigo(e.target.value.toUpperCase())}
                    placeholder="Ej / X9B2"
                    maxLength={10}
                    className="form-control w-full p-2.5 border rounded-xl text-sm focus:outline-indigo-650 bg-slate-50 font-mono font-bold text-indigo-900 uppercase tracking-widest"
                  />
                  <span className="absolute right-3 top-3 pointer-events-none">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1 font-medium">
                  Código de 4 caracteres generado automáticamente para identificar al estudiante y acceder al sistema.
                </p>
              </div>

              {editingId ? (
                <div className="form-group flex flex-col">
                  <label className="form-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Cambiar contraseña de acceso
                  </label>
                  <input
                    type="password"
                    value={pass}
                    onChange={e => setPass(e.target.value)}
                    placeholder="Dejar en blanco si conservas la anterior"
                    className="form-control w-full p-2.5 border rounded-xl text-sm focus:outline-indigo-650 bg-white"
                  />
                </div>
              ) : null}

              <div className="modal-footer border-t border-slate-100 flex justify-end gap-2.5 pt-4 mt-6 bg-slate-50 rounded-b-2xl -mx-5 -mb-5 p-4">
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
                  {editingId ? 'Guardar cambios' : 'Matricular alumno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VINCULACIÓN ACADÉMICA (ASIGNATURAS Y SEMESTRE) */}
      {isLinkModalOpen && linkingStudent && (
        <div className="modal-overlay fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-[200] p-4 text-left animate-fade-in">
          <div className="modal bg-white rounded-3xl shadow-2xl w-full max-w-md theme-bg-surface overflow-hidden">
            <div className="modal-header border-b border-slate-100 p-5 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="modal-title font-extrabold text-slate-900 text-base md:text-lg">
                  Asignación Académica
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Vincula materias y ciclos activos a {linkingStudent.nombre}</p>
              </div>
              <button 
                onClick={() => {
                  setIsLinkModalOpen(false);
                  setLinkingStudent(null);
                }} 
                className="modal-close bg-white border border-slate-200 hover:bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveLinkage} className="modal-body p-6 space-y-5">
              {/* Semester Selection */}
              <div className="form-group flex flex-col font-sans">
                <label className="form-label text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                  Ciclo o Semestre Académico <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={selectedSemesterId}
                  onChange={e => setSelectedSemesterId(e.target.value)}
                  className="form-control w-full p-2.5 border rounded-xl text-xs sm:text-sm focus:outline-cyan-500 bg-white"
                >
                  <option value="">Selecciona un semestre o corte académico...</option>
                  {semesters.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} {s.estado === 'activo' ? ' (Activo)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subjects/Asignaturas checklist */}
              <div className="form-group flex flex-col font-sans">
                <label className="form-label text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                  Selección de Materias / Asignaturas
                </label>
                
                {subjects.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                    No hay asignaturas registradas en el catálogo. Registra materias primero en la pestaña correspondiente.
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white p-2 space-y-1">
                    {subjects.map(sub => {
                      const isChecked = selectedSubjectIds.includes(sub.id);
                      return (
                        <label 
                          key={sub.id} 
                          className={`flex items-center gap-3 p-2.5 rounded-lg text-xs sm:text-sm cursor-pointer hover:bg-slate-50 transition ${
                            isChecked ? 'bg-indigo-50/30' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSubject(sub.id)}
                            className="w-4 h-4 rounded text-indigo-650 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 truncate">{sub.nombre}</p>
                            {sub.codigo && <p className="font-mono text-[9px] text-slate-400 uppercase">{sub.codigo}</p>}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
                <p className="text-[10px] text-slate-400 font-medium mt-1.5 flex items-center gap-1.5">
                  <span>💡 El estudiante podrá visualizar trabajos y resolver exámenes pertenecientes a las materias vinculadas.</span>
                </p>
              </div>

              <div className="modal-footer border-t border-slate-100 flex justify-end gap-2.5 pt-4 mt-6 bg-slate-50 rounded-b-3xl -mx-6 -mb-6 p-5">
                <button
                  type="button"
                  onClick={() => {
                    setIsLinkModalOpen(false);
                    setLinkingStudent(null);
                  }}
                  className="btn btn-secondary px-4 py-2 border rounded-xl hover:bg-slate-150 text-slate-707 bg-white cursor-pointer text-xs sm:text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary px-5 py-2 text-white font-bold rounded-xl cursor-pointer text-xs sm:text-sm"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  Guardar Asignación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* BATCH IMPORT DIALOG */}
      {isBatchModalOpen && (
        <div className="modal-overlay fixed inset-0 bg-black/45 flex items-center justify-center z-[200] p-4 text-left">
          <div className="modal bg-white rounded-2xl shadow-xl w-full max-w-lg theme-bg-surface overflow-hidden">
            <div className="modal-header border-b border-slate-100 p-4.5 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <h3 className="modal-title font-bold text-slate-900 border-none text-base">
                  Carga Masiva de Estudiantes
                </h3>
              </div>
              <button onClick={() => setIsBatchModalOpen(false)} className="modal-close hover:bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-705 transition cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleProcessBatchImport} className="modal-body p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Pega la lista de estudiantes (un nombre por línea). Opcionalmente puedes incluir correo o cédula separados por comas o tabulaciones.
              </p>

              <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-[11px] text-indigo-900 font-mono space-y-1">
                <p className="font-bold">Ejemplo:</p>
                <p>Carlos Andrés Pérez</p>
                <p>Ana Isabel Rodríguez, ana@instituto.edu.co, 10203040</p>
              </div>

              <textarea
                rows={8}
                required
                value={batchRawText}
                onChange={e => setBatchRawText(e.target.value)}
                placeholder="Pega la lista aquí (un estudiante por línea)..."
                className="w-full p-3 text-xs font-mono border border-slate-200 rounded-xl outline-none focus:border-indigo-500 bg-white"
              />

              <div className="modal-footer border-t border-slate-100 flex justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setIsBatchModalOpen(false)}
                  className="btn px-4 py-2 border rounded-xl hover:bg-slate-100 text-slate-700 bg-white cursor-pointer text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn px-5 py-2 text-white font-bold rounded-xl cursor-pointer text-xs bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                >
                  Procesar y Matricular Todos
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
