/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Calendar, Plus, Trash2, Edit2, Clock, Filter, MapPin, 
  BookOpen, Layers, CheckSquare, Bell, CalendarDays, RefreshCw, X
} from 'lucide-react';
import { User, Subject, Semester } from '../types';
import { uid, now, fmtDate } from '../lib/db';

interface ActivityEvent {
  id: string;
  titulo: string;
  descripcion: string;
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:MM
  tipo: 'evaluacion' | 'entrega' | 'reunion' | 'cultural' | 'administrativo';
  subjectId?: string;
  semesterId: string;
  ubicacion?: string;
  createdBy: string;
  createdByName: string;
  creado: string;
}

interface AgendaProps {
  currentUser: User;
  users: User[];
  subjects: Subject[];
  semesters: Semester[];
  toast: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

export default function Agenda({ currentUser, users, subjects, semesters, toast }: AgendaProps) {
  const isDocOrAdmin = currentUser.rol === 'admin' || currentUser.rol === 'docente';

  // Master State
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>('');

  // Filtering states
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');

  // Modal form states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState<string>('');
  const [descripcion, setDescripcion] = useState<string>('');
  const [fecha, setFecha] = useState<string>('');
  const [hora, setHora] = useState<string>('08:00');
  const [tipo, setTipo] = useState<ActivityEvent['tipo']>('evaluacion');
  const [eventSubjectId, setEventSubjectId] = useState<string>('');
  const [ubicacion, setUbicacion] = useState<string>('');

  // Initial load + seeds
  useEffect(() => {
    const saved = localStorage.getItem('ep_agenda');
    if (saved) {
      try {
        setEvents(JSON.parse(saved));
      } catch (e) {
        console.error('Error parsing agenda events', e);
      }
    } else {
      // Create seed activities
      const activeSem = semesters.find(s => s.estado === 'activo') || semesters[0];
      const activeSub1 = subjects[0];
      const activeSub2 = subjects[1];
      
      if (activeSem) {
        const seedEvents: ActivityEvent[] = [
          {
            id: uid(),
            titulo: 'Evaluación Parcial Escrita - Álgebra',
            descripcion: 'Examen de resolución de sistemas matriciales de Gauss Jordan y factorización.',
            fecha: new Date(Date.now() + 86400000 * 3).toISOString().substring(0, 10), // in 3 days
            hora: '09:30',
            tipo: 'evaluacion',
            subjectId: activeSub1?.id || '',
            semesterId: activeSem.id,
            ubicacion: 'Aula de Ciencias 4B',
            createdBy: currentUser.id,
            createdByName: currentUser.nombre,
            creado: now(),
          },
          {
            id: uid(),
            titulo: 'Entrega de Ensayo Crítico Legislativo',
            descripcion: 'Presentación formal en formato PDF de la síntesis del impacto nacional.',
            fecha: new Date(Date.now() + 86400000 * 7).toISOString().substring(0, 10), // in 7 days
            hora: '23:59',
            tipo: 'entrega',
            subjectId: activeSub2?.id || '',
            semesterId: activeSem.id,
            ubicacion: 'Portal Académico Virtual',
            createdBy: currentUser.id,
            createdByName: currentUser.nombre,
            creado: now(),
          },
          {
            id: uid(),
            titulo: 'Reunión General Extraordinaria de Padres',
            descripcion: 'Coordinación sobre los alcances extracurriculares y cierre semestral de proyectos.',
            fecha: new Date(Date.now() + 86400000 * 1).toISOString().substring(0, 10), // tomorrow
            hora: '15:00',
            tipo: 'reunion',
            semesterId: activeSem.id,
            ubicacion: 'Auditorio Principal Synapsis',
            createdBy: currentUser.id,
            createdByName: currentUser.nombre,
            creado: now(),
          }
        ];
        setEvents(seedEvents);
        localStorage.setItem('ep_agenda', JSON.stringify(seedEvents));
      }
    }
  }, [subjects, semesters]);

  useEffect(() => {
    const activeSem = semesters.find(s => s.estado === 'activo') || semesters[0];
    if (activeSem) {
      setSelectedSemester(activeSem.id);
    }
  }, [semesters]);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setTitulo('');
    setDescripcion('');
    setFecha(new Date().toISOString().substring(0, 10));
    setHora('08:00');
    setTipo('evaluacion');
    setEventSubjectId(subjects[0]?.id || '');
    setUbicacion('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (ev: ActivityEvent) => {
    setEditingId(ev.id);
    setTitulo(ev.titulo);
    setDescripcion(ev.descripcion);
    setFecha(ev.fecha);
    setHora(ev.hora);
    setTipo(ev.tipo);
    setEventSubjectId(ev.subjectId || '');
    setUbicacion(ev.ubicacion || '');
    setIsModalOpen(true);
  };

  const handleDeleteEvent = (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este evento de la agenda escolar?')) {
      const nextEvents = events.filter(e => e.id !== id);
      setEvents(nextEvents);
      localStorage.setItem('ep_agenda', JSON.stringify(nextEvents));
      toast('Evento eliminado con éxito', 'success');
    }
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo.trim() || !fecha || !selectedSemester) {
      toast('Por favor, completa los campos requeridos', 'error');
      return;
    }

    const nextEvents = [...events];
    if (editingId) {
      const idx = nextEvents.findIndex(ev => ev.id === editingId);
      if (idx > -1) {
        nextEvents[idx] = {
          ...nextEvents[idx],
          titulo: titulo.trim(),
          descripcion: descripcion.trim(),
          fecha,
          hora,
          tipo,
          subjectId: tipo === 'evaluacion' || tipo === 'entrega' ? eventSubjectId : undefined,
          ubicacion: ubicacion.trim(),
          semesterId: selectedSemester,
          creado: now(),
        };
        toast('Evento actualizado con éxito', 'success');
      }
    } else {
      nextEvents.push({
        id: uid(),
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        fecha,
        hora,
        tipo,
        subjectId: tipo === 'evaluacion' || tipo === 'entrega' ? eventSubjectId : undefined,
        ubicacion: ubicacion.trim(),
        semesterId: selectedSemester,
        createdBy: currentUser.id,
        createdByName: currentUser.nombre,
        creado: now(),
      });
      toast('Evento agendado con éxito', 'success');
    }

    setEvents(nextEvents);
    localStorage.setItem('ep_agenda', JSON.stringify(nextEvents));
    setIsModalOpen(false);
  };

  // Filter events
  const filteredEvents = events.filter(ev => {
    const matchSem = ev.semesterId === selectedSemester;
    const matchType = filterType === 'all' || ev.tipo === filterType;
    const matchSub = filterSubject === 'all' || ev.subjectId === filterSubject;
    return matchSem && matchType && matchSub;
  }).sort((a, b) => {
    // Sort chronologically ascending
    const dateCompare = a.fecha.localeCompare(b.fecha);
    if (dateCompare !== 0) return dateCompare;
    return a.hora.localeCompare(b.hora);
  });

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm theme-bg-surface theme-border">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider mb-2">
            <CalendarDays className="w-3.5 h-3.5" /> Agenda Escolar
          </div>
          <h2 className="text-xl font-extrabold text-slate-905 tracking-tight" style={{ color: 'var(--gray-900)' }}>
            Calendario de Actividades
          </h2>
          <p className="text-xs text-slate-505 mt-1">
            Visualiza y programa trabajos, exámenes, reuniones de padres, eventos institucionales y festivos del semestre.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isDocOrAdmin && (
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              <Plus className="w-4 h-4" /> Nueva Actividad
            </button>
          )}
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4 text-xs font-medium theme-bg-surface theme-border">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <Filter className="w-4 h-4 text-slate-400" /> Filtrar Actividades:
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">Semestre:</span>
          <select
            value={selectedSemester}
            onChange={e => setSelectedSemester(e.target.value)}
            className="p-1.5 bg-slate-50 border rounded-lg text-slate-705 font-bold focus:outline-none"
          >
            {semesters.map(s => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">Tipo:</span>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="p-1.5 bg-slate-50 border rounded-lg text-slate-705 font-bold focus:outline-none"
          >
            <option value="all">Todos los tipos</option>
            <option value="evaluacion">✏️ Evaluación / Parcial</option>
            <option value="entrega">📂 Entrega de Trabajo</option>
            <option value="reunion">🗣️ Reunión / Convocatoria</option>
            <option value="cultural">🎭 Evento Cultural / Deportivo</option>
            <option value="administrativo">⚙️ Administrativo / Festivo</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-400">Asignatura:</span>
          <select
            value={filterSubject}
            onChange={e => setFilterSubject(e.target.value)}
            className="p-1.5 bg-slate-50 border rounded-lg text-slate-705 font-bold focus:outline-none"
          >
            <option value="all">Todas las asignaturas</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>
      </div>

      {/* CHRONOLOGICAL EVENT TIMELINE GRID */}
      {filteredEvents.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 shadow-sm theme-bg-surface py-20">
          <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-700 text-sm">No hay actividades agendadas</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
            No se registran eventos escolares programados bajo los filtros de selección para este semestre académico.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredEvents.map(ev => {
            const subjObj = subjects.find(s => s.id === ev.subjectId);

            // Theme badges based on event types
            let badgeStyle = 'text-blue-700 bg-blue-50 border-blue-100';
            let emoji = '⚙️';
            if (ev.tipo === 'evaluacion') {
              badgeStyle = 'text-rose-700 bg-rose-50 border-rose-100';
              emoji = '✏️ EVALUACIÓN';
            } else if (ev.tipo === 'entrega') {
              badgeStyle = 'text-indigo-700 bg-indigo-50 border-indigo-100';
              emoji = '📂 TAREA / ENTREGA';
            } else if (ev.tipo === 'reunion') {
              badgeStyle = 'text-amber-700 bg-amber-50 border-amber-100';
              emoji = '🗣️ CONVOCATORIA';
            } else if (ev.tipo === 'cultural') {
              badgeStyle = 'text-emerald-700 bg-emerald-50 border-emerald-100';
              emoji = '🎭 COMPARTIR / SOCIAL';
            } else if (ev.tipo === 'administrativo') {
              badgeStyle = 'text-slate-700 bg-slate-100 border-slate-200';
              emoji = '⚙️ INSTITUCIONAL';
            }

            // Highlighting upcoming elements
            const evDate = new Date(ev.fecha + 'T00:00:00');
            const diffDays = Math.ceil((evDate.getTime() - Date.now()) / 86400000);
            const isSoon = diffDays >= 0 && diffDays <= 3;

            return (
              <div 
                key={ev.id} 
                className={`bg-white p-5 rounded-2xl border flex flex-col justify-between shadow-sm relative overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md theme-bg-surface theme-border ${
                  isSoon ? 'border-l-4 border-l-orange-500' : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Top tags labels */}
                  <div className="flex items-center justify-between gap-2.5 mb-2.5">
                    <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${badgeStyle}`}>
                      {emoji}
                    </span>
                    {isSoon && (
                      <span className="text-[9px] bg-orange-100 text-orange-850 border border-orange-200 font-extrabold px-1.5 py-0.5 rounded tracking-wide animate-pulse">
                        ¡PRÓXIMO!
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-sm text-slate-805 tracking-tight group-hover:text-indigo-600 mb-1" style={{ color: 'var(--gray-900)' }}>
                    {ev.titulo}
                  </h3>
                  
                  <p className="text-slate-500 text-xs leading-relaxed line-clamp-3 mb-4">
                    {ev.descripcion}
                  </p>
                </div>

                {/* Foot indicators */}
                <div className="pt-3.5 border-t border-slate-100 space-y-2 text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-1.5 text-slate-700 font-extrabold">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{fmtDate(ev.fecha)} a las {ev.hora} Hrs</span>
                  </div>

                  {ev.ubicacion && (
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-450">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{ev.ubicacion}</span>
                    </div>
                  )}

                  {subjObj && (
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-700">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Clase: {subjObj.nombre}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[9px] tracking-wide text-slate-400 font-mono font-bold uppercase">
                    <span>Organiza: {ev.createdByName}</span>
                    
                    {isDocOrAdmin && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(ev)}
                          className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-slate-50 transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-50 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT ACTIVITY SCHEDULER MODAL */}
      {isModalOpen && (
        <div className="modal-overlay fixed inset-0 bg-black/45 flex items-center justify-center z-[200] p-4 text-left">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden animate-scale-up border border-slate-100 shadow-xl theme-bg-surface">
            {/* Modal Header */}
            <div className="bg-slate-50 p-5 border-b border-slate-200 flex items-center justify-between theme-bg-surface">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-500" />
                <h3 className="font-extrabold text-slate-900 text-sm" style={{ color: 'var(--gray-900)' }}>
                  {editingId ? 'Editar Evento de Agenda' : 'Agendar Nueva Actividad'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form body */}
            <form onSubmit={handleSaveEvent} className="p-6 space-y-4 text-xs font-semibold">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Título de la Actividad <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Evaluación de Fraccionarios"
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-indigo-550 w-full font-bold"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Descripción de las pautas <span className="text-red-500">*</span></label>
                <textarea
                  required
                  rows={3}
                  placeholder="Detalla de forma exacta qué deben estudiar o realizar los estudiantes..."
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-indigo-550 w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Fecha Programada <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={fecha}
                    onChange={e => setFecha(e.target.value)}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-indigo-550"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Hora Exacta <span className="text-red-500">*</span></label>
                  <input
                    type="time"
                    required
                    value={hora}
                    onChange={e => setHora(e.target.value)}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-indigo-550"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Tipo de Evento</label>
                  <select
                    value={tipo}
                    onChange={e => setTipo(e.target.value as ActivityEvent['tipo'])}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-705 focus:outline-none focus:outline-indigo-550"
                  >
                    <option value="evaluacion">✏️ Evaluación / Parcial</option>
                    <option value="entrega">📂 Entrega de Trabajo</option>
                    <option value="reunion">🗣️ Reunión / Convocatoria</option>
                    <option value="cultural">🎭 Evento Cultural / Deportivo</option>
                    <option value="administrativo">⚙️ Administrativo / Festivo</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ubicación / Medio</label>
                  <input
                    type="text"
                    placeholder="Ej: Salón 301, o Plataforma Teams"
                    value={ubicacion}
                    onChange={e => setUbicacion(e.target.value)}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-indigo-550 w-full font-bold"
                  />
                </div>
              </div>

              {(tipo === 'evaluacion' || tipo === 'entrega') && (
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vincular a Asignatura</label>
                  <select
                    value={eventSubjectId}
                    onChange={e => setEventSubjectId(e.target.value)}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-705 focus:outline-none"
                  >
                    {subjects.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.nombre}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-slate-650 font-bold transition flex items-center justify-center cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  Agendar Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
