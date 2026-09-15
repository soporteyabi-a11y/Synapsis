/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Plus, Trash2, Edit2, Calendar, FileText, Award, Layers, 
  ChevronLeft, ChevronRight, Upload, CheckCircle2, Eye, 
  Download, Users, Check, X, File, AlertCircle 
} from 'lucide-react';
import { Assignment, User, Parcial, Subject, AssignmentSubmission } from '../types';
import { uid, now, fmtDate } from '../lib/db';
import { SearchableSelect } from './SearchableSelect';

interface TrabajosProps {
  currentUser: User;
  assignments: Assignment[];
  parciales: Parcial[];
  subjects: Subject[];
  assignmentSubmissions?: AssignmentSubmission[];
  onUpdateAssignments: (updated: Assignment[]) => void;
  onUpdateAssignmentSubmissions?: (updated: AssignmentSubmission[]) => void;
  toast: (msg: string, type: 'success' | 'error' | 'warning') => void;
  users?: User[];
}

export default function Trabajos({ 
  currentUser, 
  assignments, 
  parciales, 
  subjects, 
  assignmentSubmissions = [],
  onUpdateAssignments, 
  onUpdateAssignmentSubmissions = () => {},
  toast,
  users
}: TrabajosProps) {
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const isTeacher = currentUser.rol === 'docente';
  const allMyUserIds = (users && currentUser)
    ? users.filter(u => u.nombre === currentUser.nombre || u.email.toLowerCase() === currentUser.email.toLowerCase()).map(u => u.id)
    : [currentUser.id];

  const teacherSubjects = isTeacher 
    ? subjects.filter(s => (s.docenteId && allMyUserIds.includes(s.docenteId)) || currentUser.asignaturas?.includes(s.id))
    : subjects;

  // Form states of Assignments (Teacher/Admin)
  const [titulo, setTitulo] = useState('');
  const [asignaturaId, setAsignaturaId] = useState('');
  const [parcialId, setParcialId] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [puntos, setPuntos] = useState(100);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Student upload forms states
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [activeAssignmentToSubmit, setActiveAssignmentToSubmit] = useState<Assignment | null>(null);
  const [studentComment, setStudentComment] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileBase64, setFileBase64] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Teacher feedback & submissions views list states
  const [isViewSubmissionsModalOpen, setIsViewSubmissionsModalOpen] = useState(false);
  const [activeAssignmentToViewSubmissions, setActiveAssignmentToViewSubmissions] = useState<Assignment | null>(null);
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(null);
  const [gradingScore, setGradingScore] = useState('');
  const [teacherFeedback, setTeacherFeedback] = useState('');

  // Pagination states & calculations (Grid is 3 cols, so 9 works beautifully!)
  const itemsPerPage = 9;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(assignments.length / itemsPerPage) || 1;
  const activePage = currentPage > totalPages ? totalPages : currentPage;

  const currentAssignments = assignments.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

  const canManage = currentUser.rol === 'admin' || currentUser.rol === 'docente';

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setTitulo('');
    const firstSubId = teacherSubjects[0]?.id || '';
    setAsignaturaId(firstSubId);
    const matchingParcs = firstSubId ? parciales.filter(p => p.asignatura === firstSubId) : [];
    setParcialId(matchingParcs[0]?.id || '');
    setDescripcion('');
    setFechaEntrega('');
    setPuntos(100);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: Assignment) => {
    setEditingId(task.id);
    setTitulo(task.titulo);
    const subId = task.asignatura || (task.parcialId ? parciales.find(p => p.id === task.parcialId)?.asignatura : '');
    setAsignaturaId(subId || teacherSubjects[0]?.id || '');
    setParcialId(task.parcialId || '');
    setDescripcion(task.descripcion || '');
    setFechaEntrega(task.fechaEntrega || '');
    setPuntos(task.puntos || 100);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !asignaturaId) {
      toast('El título y la asignatura son campos obligatorios', 'error');
      return;
    }

    const nextTasks = [...assignments];

    if (editingId) {
      const idx = nextTasks.findIndex(t => t.id === editingId);
      if (idx > -1) {
        nextTasks[idx] = {
          ...nextTasks[idx],
          titulo: titulo.trim().toUpperCase(),
          asignatura: asignaturaId,
          parcialId: parcialId || undefined,
          descripcion: descripcion.trim().toUpperCase(),
          fechaEntrega,
          puntos: Number(puntos) || 100,
          actualizado: now(),
        };
        onUpdateAssignments(nextTasks);
        toast('Trabajo académico actualizado correctamente', 'success');
      }
    } else {
      const newAssignment: Assignment = {
        id: uid(),
        titulo: titulo.trim().toUpperCase(),
        asignatura: asignaturaId,
        parcialId: parcialId || undefined,
        descripcion: descripcion.trim().toUpperCase(),
        fechaEntrega,
        puntos: Number(puntos) || 100,
        creado: now(),
      };
      onUpdateAssignments([...nextTasks, newAssignment]);
      toast('Trabajo o taller publicado exitosamente', 'success');
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const nextTasks = assignments.filter(t => t.id !== id);
    onUpdateAssignments(nextTasks);
    toast('Trabajo académico removido correctamente', 'success');
  };

  // Student specific events
  const handleOpenSubmitModal = (task: Assignment) => {
    setActiveAssignmentToSubmit(task);
    setStudentComment('');
    setFileName('');
    setFileBase64('');
    setSubmitting(false);

    // Look if student has already submitted
    const existing = assignmentSubmissions.find(
      s => s.assignmentId === task.id && s.estudianteId === currentUser.id
    );
    if (existing) {
      setStudentComment(existing.comentarioEstudiante || '');
      setFileName(existing.archivoNombre || '');
      setFileBase64(existing.archivoUrl || '');
    }

    setIsSubmitModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast('Por favor, selecciona únicamente un archivo PDF (.pdf)', 'error');
        return;
      }
      if (file.size > 8 * 1024 * 1024) {
        toast('El tamaño máximo permitido es de 8 MB', 'error');
        return;
      }

      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFileBase64(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssignmentToSubmit) return;
    if (!fileBase64) {
      toast('Debes adjuntar tu archivo de trabajo en formato PDF', 'error');
      return;
    }

    setSubmitting(true);

    const submissionsCopy = [...assignmentSubmissions];
    const existingIndex = submissionsCopy.findIndex(
      s => s.assignmentId === activeAssignmentToSubmit.id && s.estudianteId === currentUser.id
    );

    const submissionData: AssignmentSubmission = {
      id: existingIndex > -1 ? submissionsCopy[existingIndex].id : uid(),
      assignmentId: activeAssignmentToSubmit.id,
      estudianteId: currentUser.id,
      estudianteNombre: currentUser.nombre,
      fechaEntrega: now(),
      archivoNombre: fileName,
      archivoUrl: fileBase64,
      comentarioEstudiante: studentComment.trim(),
      estado: existingIndex > -1 ? submissionsCopy[existingIndex].estado : 'entregado',
      calificacion: existingIndex > -1 ? submissionsCopy[existingIndex].calificacion : undefined,
      comentarioDocente: existingIndex > -1 ? submissionsCopy[existingIndex].comentarioDocente : undefined,
      creado: existingIndex > -1 ? submissionsCopy[existingIndex].creado : now(),
      actualizado: now()
    };

    if (existingIndex > -1) {
      submissionsCopy[existingIndex] = submissionData;
    } else {
      submissionsCopy.push(submissionData);
    }

    onUpdateAssignmentSubmissions(submissionsCopy);
    toast('¡Tu trabajo ha sido entregado exitosamente!', 'success');
    setIsSubmitModalOpen(false);
  };

  const handleDownloadPDF = (subm: AssignmentSubmission) => {
    try {
      const link = document.createElement('a');
      link.href = subm.archivoUrl;
      link.download = subm.archivoNombre || 'trabajo_entregado.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast('Error al descargar el archivo', 'error');
    }
  };

  // Teacher specific events
  const handleOpenViewSubmissionsModal = (task: Assignment) => {
    setActiveAssignmentToViewSubmissions(task);
    setGradingSubmissionId(null);
    setGradingScore('');
    setTeacherFeedback('');
    setIsViewSubmissionsModalOpen(true);
  };

  const handleSelectGrading = (subm: AssignmentSubmission) => {
    setGradingSubmissionId(subm.id);
    setGradingScore(subm.calificacion !== undefined ? String(subm.calificacion) : '');
    setTeacherFeedback(subm.comentarioDocente || '');
  };

  const handleSaveGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSubmissionId || !activeAssignmentToViewSubmissions) return;

    const scoreNum = Number(gradingScore);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > (activeAssignmentToViewSubmissions.puntos || 100)) {
      toast(`La calificación debe ser un número entre 0 y ${activeAssignmentToViewSubmissions.puntos || 100}`, 'error');
      return;
    }

    const submissionsCopy = [...assignmentSubmissions];
    const idx = submissionsCopy.findIndex(s => s.id === gradingSubmissionId);
    if (idx > -1) {
      submissionsCopy[idx] = {
        ...submissionsCopy[idx],
        estado: 'calificado',
        calificacion: scoreNum,
        comentarioDocente: teacherFeedback.trim(),
        actualizado: now()
      };

      onUpdateAssignmentSubmissions(submissionsCopy);
      toast('Calificación y retroalimentación guardadas', 'success');

      // Clear grading state
      setGradingSubmissionId(null);
      setGradingScore('');
      setTeacherFeedback('');
    }
  };

  return (
    <div className="page-trabajos animate-fade-in pb-12">
      <div className="page-header flex items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="page-title text-2xl font-bold tracking-tight text-slate-900" style={{ color: 'var(--gray-900)' }}>
            Trabajos y tareas académicas
          </h2>
          <div className="page-sub text-sm font-medium mt-1 text-slate-500 font-sans">
            Inspecciona, publica talleres y realiza la entrega virtual de tus guías en PDF
          </div>
        </div>
        {canManage && (
          <button
            onClick={handleOpenCreateModal}
            className="btn btn-primary flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-white font-semibold shadow hover:scale-[1.02] transition-transform cursor-pointer"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <Plus className="w-4 h-4" />
            <span>Publicar trabajo</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {assignments.length === 0 ? (
          <div className="col-span-full card bg-white p-12 border rounded-2xl text-center flex flex-col items-center">
            <FileText className="w-12 h-12 text-slate-300 mb-3" />
            <h4 className="font-bold text-slate-600">No hay actividades vigentes</h4>
            <p className="text-xs text-slate-400 mt-1">Inspecciona el listado en otro momento para comprobar asignaciones académicas</p>
          </div>
        ) : (
          currentAssignments.map(task => {
            const parc = parciales.find(p => p.id === task.parcialId);
            const sub = parc ? subjects.find(s => s.id === parc.asignatura) : null;

            // Student submission status checking
            const mySubm = !canManage 
              ? assignmentSubmissions.find(s => s.assignmentId === task.id && s.estudianteId === currentUser.id)
              : null;

            // Count submissions for teachers
            const totalSubms = canManage
              ? assignmentSubmissions.filter(s => s.assignmentId === task.id).length
              : 0;

            return (
              <div key={task.id} className="card bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm hover:border-slate-300 transition theme-bg-surface theme-border animate-fade-in relative overflow-hidden">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h4 className="font-extrabold text-slate-800 leading-snug text-sm sm:text-base" style={{ color: 'var(--gray-900)' }}>
                      {task.titulo}
                    </h4>
                    <span className="badge inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-50 border border-indigo-100 text-indigo-700 shrink-0">
                      <Award className="w-3 h-3 text-indigo-600" />
                      <span>{task.puntos} pts</span>
                    </span>
                  </div>

                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {sub && (
                      <span className="badge inline-flex px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider bg-amber-50 text-amber-700 border border-amber-100 rounded">
                        {sub.nombre}
                      </span>
                    )}
                    {parc && (
                      <span className="badge inline-block px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider bg-slate-100 text-slate-600 rounded">
                        {parc.nombre}
                      </span>
                    )}
                  </div>

                  {task.descripcion && (
                    <p className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500 leading-relaxed italic mb-4 font-sans max-h-24 overflow-y-auto">
                      {task.descripcion}
                    </p>
                  )}

                  {/* Student Submission Visual Panel */}
                  {currentUser.rol === 'estudiante' && (
                    <div className="my-3 p-3 rounded-xl border border-dashed text-xs">
                      {mySubm ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-emerald-700 font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>Entregado en PDF</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            Archivo: <span className="font-bold underline cursor-pointer" onClick={() => handleDownloadPDF(mySubm)}>{mySubm.archivoNombre}</span>
                          </div>
                          
                          {mySubm.comentarioEstudiante && (
                            <div className="text-[11px] bg-slate-50 p-1.5 rounded italic text-slate-600">
                              " {mySubm.comentarioEstudiante} "
                            </div>
                          )}

                          {mySubm.estado === 'calificado' ? (
                            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg mt-1.5">
                              <div className="font-extrabold text-emerald-800 text-[11px] flex justify-between">
                                <span>Calificación docente:</span>
                                <span className="text-indigo-600 font-black">{mySubm.calificacion} / {task.puntos}</span>
                              </div>
                              {mySubm.comentarioDocente && (
                                <p className="text-[10px] text-slate-600 mt-1">
                                  <strong>Retroalimentación:</strong> {mySubm.comentarioDocente}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="p-1 px-2 bg-amber-50 border border-amber-200 text-amber-800 font-medium text-[10px] rounded-md mt-1 block">
                              Pendiente de calificación
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-rose-700 font-bold">
                          <AlertCircle className="w-4 h-4 text-rose-500" />
                          <span>Sin entregar</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-3 flex-wrap gap-2 text-xs font-semibold text-slate-500 font-sans">
                  <div className="flex items-center gap-1 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Límite: {task.fechaEntrega || 'Sin fecha'}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Student Upload Buttons */}
                    {currentUser.rol === 'estudiante' && (
                      <button
                        onClick={() => handleOpenSubmitModal(task)}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white transition hover:scale-105 cursor-pointer ${
                          mySubm ? 'bg-slate-600 hover:bg-slate-700' : 'bg-cyan-600 hover:bg-cyan-700 shadow-md'
                        }`}
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{mySubm ? 'Modificar entrega' : 'Subir entrega (PDF)'}</span>
                      </button>
                    )}

                    {/* Teacher / Submissions buttons */}
                    {canManage && (
                      <button
                        onClick={() => handleOpenViewSubmissionsModal(task)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-150 text-indigo-700 text-[11px] font-bold rounded-lg cursor-pointer transition hover:scale-102"
                      >
                        <Users className="w-3.5 h-3.5 text-indigo-505" />
                        <span>Entregas ({totalSubms})</span>
                      </button>
                    )}

                    {/* Admin/Teacher CRUD buttons */}
                    {canManage && (
                      <div className="inline-flex gap-1 items-center ml-1">
                        <button
                          onClick={() => handleOpenEditModal(task)}
                          className="p-1 px-1.5 rounded border border-slate-200 hover:bg-slate-100 text-slate-500 cursor-pointer"
                          title="Editar tarea"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        {confirmDeleteId === task.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 p-0.5 rounded">
                            <button
                              onClick={() => {
                                handleDelete(task.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-1 py-0.5 rounded text-[8px] uppercase font-bold bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
                            >
                              Sí
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1 py-0.5 rounded text-[8px] uppercase font-bold bg-slate-100 text-slate-500 hover:bg-slate-200 cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(task.id)}
                            className="p-1 px-1.5 rounded border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                            title="Eliminar tarea"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {assignments.length > itemsPerPage && (
        <div className="mt-6 px-5 py-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between flex-wrap gap-3 theme-bg-surface theme-border">
          <div className="text-xs text-slate-500 select-none font-medium">
            Mostrando <span className="font-bold" style={{ color: 'var(--gray-900)' }}>{((activePage - 1) * itemsPerPage) + 1}</span> a{' '}
            <span className="font-bold" style={{ color: 'var(--gray-900)' }}>
              {Math.min(activePage * itemsPerPage, assignments.length)}
            </span>{' '}
            de <span className="font-bold" style={{ color: 'var(--gray-900)' }}>{assignments.length}</span> asignaciones publicadas
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

      {/* CREAR/EDITAR TRABAJO MODAL */}
      {isModalOpen && (
        <div className="modal-overlay fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-[200] p-4 text-left animate-fade-in">
          <div className="modal bg-white rounded-3xl shadow-2xl w-full max-w-md theme-bg-surface overflow-hidden">
            <div className="modal-header border-b border-slate-100 p-5 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="modal-title font-extrabold text-slate-900 text-base md:text-lg">
                  {editingId ? 'Editar Trabajo Académico' : 'Publicar Trabajo Académico'}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Completa los campos para crear o modificar el taller</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="modal-close bg-white border border-slate-200 hover:bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body p-6 space-y-4">
              <div className="form-group flex flex-col font-sans">
                <label className="form-label text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Título del Trabajo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  placeholder="Ej: Taller 1 - Mapas conceptuales"
                  className="form-control w-full p-2.5 border rounded-xl text-xs sm:text-sm focus:outline-cyan-500 bg-white"
                />
              </div>

              <div className="form-group flex flex-col font-sans">
                <label className="form-label text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Asignatura <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={asignaturaId}
                  onChange={e => {
                    const nextSubId = e.target.value;
                    setAsignaturaId(nextSubId);
                    const matchingParcs = nextSubId ? parciales.filter(p => p.asignatura === nextSubId) : [];
                    setParcialId(matchingParcs[0]?.id || '');
                  }}
                  className="form-control w-full p-2.5 border rounded-xl text-xs sm:text-sm focus:outline-cyan-500 bg-white"
                >
                  <option value="">Selecciona una asignatura...</option>
                  {teacherSubjects.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.nombre} {s.codigo ? `(${s.codigo})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group flex flex-col font-sans">
                <label className="form-label text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Vincular a un Parcial / Corte <span className="text-slate-400 text-[9px] lowercase font-normal">(opcional)</span>
                </label>
                <select
                  value={parcialId}
                  onChange={e => setParcialId(e.target.value)}
                  className="form-control w-full p-2.5 border rounded-xl text-xs sm:text-sm focus:outline-cyan-500 bg-white cursor-pointer"
                  disabled={!asignaturaId}
                >
                  <option value="">-- No vincular a parcial --</option>
                  {parciales.filter(p => p.asignatura === asignaturaId).map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="form-group flex flex-col font-sans">
                <label className="form-label text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Puntaje Máximo
                </label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={puntos}
                  onChange={e => setPuntos(Number(e.target.value) || 100)}
                  className="form-control w-full p-2.5 border rounded-xl text-xs sm:text-sm focus:outline-cyan-500 bg-white"
                />
              </div>

              <div className="form-group flex flex-col font-sans">
                <label className="form-label text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Fecha de Límite de Entrega
                </label>
                <input
                  type="date"
                  value={fechaEntrega}
                  onChange={e => setFechaEntrega(e.target.value)}
                  className="form-control w-full p-2.5 border rounded-xl text-xs sm:text-sm focus:outline-cyan-500 bg-white"
                />
              </div>

              <div className="form-group flex flex-col font-sans">
                <label className="form-label text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Descripción / Indicaciones</label>
                <textarea
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  placeholder="Instrucciones del trabajo, lecturas de apoyo, etc..."
                  rows={4}
                  className="form-control w-full p-2.5 border rounded-xl text-xs sm:text-sm focus:outline-cyan-500 bg-white resize-none"
                />
              </div>

              <div className="modal-footer border-t border-slate-100 flex justify-end gap-2.5 pt-4 mt-6 bg-slate-50 rounded-b-3xl -mx-6 -mb-6 p-5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary px-4 py-2 border rounded-xl hover:bg-slate-150 text-slate-700 bg-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary px-5 py-2 text-white font-bold rounded-xl cursor-pointer"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  {editingId ? 'Guardar Cambios' : 'Publicar Trabajo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT UPLOAD SUBMISSION MODAL */}
      {isSubmitModalOpen && activeAssignmentToSubmit && (
        <div className="modal-overlay fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-[200] p-4 text-left animate-fade-in">
          <div className="modal bg-white rounded-3xl shadow-2xl w-full max-w-md theme-bg-surface overflow-hidden">
            <div className="modal-header border-b border-slate-100 p-5 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="modal-title font-extrabold text-slate-900 text-base md:text-lg">
                  Entregar Trabajo Académico
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Asignación: {activeAssignmentToSubmit.titulo}</p>
              </div>
              <button 
                onClick={() => setIsSubmitModalOpen(false)} 
                className="modal-close bg-white border border-slate-200 hover:bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStudentSubmit} className="modal-body p-6 space-y-4">
              <div className="form-group flex flex-col font-sans">
                <label className="form-label text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">
                  Documento PDF (.pdf) <span className="text-red-500">*</span>
                </label>
                
                <div className="border-2 border-dashed border-slate-200 bg-slate-50 rounded-2xl p-5 text-center hover:bg-slate-100/50 transition relative">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    id="student-pdf-upload"
                  />
                  <div className="flex flex-col items-center justify-center space-y-1.5 select-none pointer-events-none">
                    <File className="w-10 h-10 text-cyan-600 animate-bounce" />
                    <span className="text-xs font-bold text-slate-700">
                      {fileName ? fileName : 'Selecciona o arrastra tu archivo PDF'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">Formato PDF únicamente • Máx 8MB</span>
                  </div>
                </div>

                {fileName && (
                  <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl mt-3 text-xs text-emerald-800">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span>{fileName} listo para enviar</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => { setFileName(''); setFileBase64(''); }} 
                      className="text-rose-500 hover:text-rose-700 font-bold p-1 cursor-pointer"
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group flex flex-col font-sans">
                <label className="form-label text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Comentarios o notas de la entrega</label>
                <textarea
                  value={studentComment}
                  onChange={e => setStudentComment(e.target.value)}
                  placeholder="Escribe comentarios opcionales para el profesor..."
                  rows={3}
                  className="form-control w-full p-2.5 border rounded-xl text-xs sm:text-sm focus:outline-cyan-500 bg-white resize-none"
                />
              </div>

              <div className="modal-footer border-t border-slate-100 flex justify-end gap-2.5 pt-4 mt-6 bg-slate-50 rounded-b-3xl -mx-6 -mb-6 p-5">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="btn btn-secondary px-4 py-2 border rounded-xl hover:bg-slate-150 text-slate-700 bg-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || !fileBase64}
                  className="btn btn-primary px-5 py-2 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  {submitting ? 'Subiendo...' : 'Enviar entrega'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TEACHER SUBMISSIONS VIEW & GRADING MODAL */}
      {isViewSubmissionsModalOpen && activeAssignmentToViewSubmissions && (
        <div className="modal-overlay fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-[200] p-4 text-left animate-fade-in">
          <div className="modal bg-white rounded-3xl shadow-xl w-full max-w-4xl theme-bg-surface overflow-hidden flex flex-col max-h-[90vh]">
            <div className="modal-header border-b border-slate-100 p-5 flex items-center justify-between bg-indigo-50">
              <div>
                <h3 className="modal-title font-black text-indigo-900 border-none text-base md:text-lg">
                  Entregas Recibidas • {activeAssignmentToViewSubmissions.titulo}
                </h3>
                <p className="text-xs text-indigo-700 font-semibold font-sans mt-0.5">Puntos máximos posibles: {activeAssignmentToViewSubmissions.puntos || 100}</p>
              </div>
              <button 
                onClick={() => setIsViewSubmissionsModalOpen(false)} 
                className="modal-close bg-white border border-indigo-200 hover:bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center text-indigo-400 hover:text-indigo-900 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Submission listings */}
              <div className="lg:col-span-7 space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">Listado de alumnos</h4>
                
                {assignmentSubmissions.filter(s => s.assignmentId === activeAssignmentToViewSubmissions.id).length === 0 ? (
                  <div className="p-12 text-center border border-dashed rounded-2xl bg-slate-50 text-slate-500 font-sans">
                    <FileText className="w-10 h-10 text-slate-350 mx-auto mb-2" />
                    <p className="text-xs font-extrabold text-slate-700">Ninguna entrega registrada aún</p>
                    <p className="text-[10px] text-slate-400 mt-1">Los estudiantes que suban sus trabajos en formato PDF aparecerán automáticamente aquí.</p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {assignmentSubmissions
                      .filter(s => s.assignmentId === activeAssignmentToViewSubmissions.id)
                      .map(subm => {
                        const isGraded = subm.estado === 'calificado';
                        const isSelected = gradingSubmissionId === subm.id;

                        return (
                          <div 
                            key={subm.id} 
                            onClick={() => handleSelectGrading(subm)}
                            className={`p-4 rounded-2xl border transition cursor-pointer text-xs ${
                              isSelected 
                                ? 'border-indigo-500 bg-indigo-50/50 shadow-md scale-[1.01]' 
                                : isGraded 
                                  ? 'border-emerald-100 bg-emerald-50/20 hover:border-emerald-300' 
                                  : 'border-slate-150 bg-white hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2.5 mb-2">
                              <div>
                                <span className="font-extrabold text-slate-900 block text-sm">{subm.estudianteNombre}</span>
                                <span className="text-[10px] text-slate-400 font-mono">Entregado: {fmtDate(subm.fechaEntrega)}</span>
                              </div>
                              <span className={`badge inline-block px-2 py-0.5 text-[9px] font-black uppercase rounded ${
                                isGraded 
                                  ? 'bg-emerald-105 text-emerald-800' 
                                  : 'bg-amber-105 text-amber-800 animate-pulse'
                              }`}>
                                {isGraded ? `Calificado: ${subm.calificacion} pts` : 'Pendiente'}
                              </span>
                            </div>

                            {subm.comentarioEstudiante && (
                              <p className="text-[11px] bg-slate-100/60 p-2 rounded-xl italic mt-1.5 text-slate-600 font-sans leading-relaxed">
                                " {subm.comentarioEstudiante} "
                              </p>
                            )}

                            <div className="flex items-center justify-between mt-3 font-sans pt-2 border-t border-slate-100/60 flex-wrap gap-2 text-[10px] sm:text-[11px]">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadPDF(subm);
                                }}
                                className="flex items-center gap-1 p-1 px-2 border rounded-md border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50"
                              >
                                <Download className="w-3 h-3 text-indigo-600" />
                                <span>Descargar PDF ({subm.archivoNombre || 'trabajo.pdf'})</span>
                              </button>
                              
                              <span className="text-[10px] text-indigo-600 font-bold hover:underline">
                                {isSelected ? 'Panel de nota activo' : 'Haga clic para calificar'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              {/* Grading action panels */}
              <div className="lg:col-span-5 bg-slate-50/50 p-4 sm:p-5 rounded-2xl border border-slate-200">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-3 text-center sm:text-left">Panel de Calificación</h4>
                
                {gradingSubmissionId ? (
                  (() => {
                    const subm = assignmentSubmissions.find(s => s.id === gradingSubmissionId);
                    if (!subm) return null;

                    return (
                      <form onSubmit={handleSaveGrade} className="space-y-4 font-sans animate-fade-in">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Evaluando alumno:</span>
                          <span className="text-base font-extrabold text-slate-900 block">{subm.estudianteNombre}</span>
                          <span className="text-[10px] text-slate-500 font-mono underline block cursor-pointer" onClick={() => handleDownloadPDF(subm)}>
                            Descargar PDF: {subm.archivoNombre}
                          </span>
                        </div>

                        <div className="form-group flex flex-col font-sans">
                          <label className="form-label text-[10px] font-extrabold text-slate-500 uppercase block mb-1">
                            Calificación Obtenida (Máx {activeAssignmentToViewSubmissions.puntos || 100}) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="number"
                            required
                            min={0}
                            max={activeAssignmentToViewSubmissions.puntos || 100}
                            step="any"
                            value={gradingScore}
                            onChange={e => setGradingScore(e.target.value)}
                            placeholder="Ej: 85"
                            className="form-control w-full p-2 border rounded-lg text-sm bg-white font-bold text-indigo-700"
                          />
                        </div>

                        <div className="form-group flex flex-col">
                          <label className="form-label text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Comentario o retroalimentación docencia</label>
                          <textarea
                            value={teacherFeedback}
                            onChange={e => setTeacherFeedback(e.target.value)}
                            placeholder="Indica las sugerencias, aciertos y puntos de mejora sobre el archivo PDF entregado..."
                            rows={4}
                            className="form-control w-full p-2.5 border rounded-lg text-xs bg-white resize-none"
                          />
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="submit"
                            className="flex-1 btn btn-primary py-2 px-3 text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-700 rounded-xl cursor-pointer"
                          >
                            Guardar nota
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setGradingSubmissionId(null);
                              setGradingScore('');
                              setTeacherFeedback('');
                            }}
                            className="btn btn-secondary py-2 px-3 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-100 cursor-pointer"
                          >
                            Limpiar
                          </button>
                        </div>
                      </form>
                    );
                  })()
                ) : (
                  <div className="py-12 text-center text-slate-400 font-sans flex flex-col items-center justify-center">
                    <Award className="w-8 h-8 text-slate-350 mb-2 animate-pulse" />
                    <p className="text-xs font-bold text-slate-500">Selecciona un alumno del listado</p>
                    <p className="text-[10px] text-slate-400 max-w-[200px] mt-1 leading-relaxed">Haz clic sobre cualquier entrega para abrir los controles e ingresar la calificación evaluativa correspondiente.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer border-t border-slate-150 p-4.5 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setIsViewSubmissionsModalOpen(false)}
                className="btn btn-secondary px-4.5 py-2 border rounded-xl hover:bg-slate-200 font-bold text-xs text-slate-700 bg-white cursor-pointer"
              >
                Cerrar listado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
