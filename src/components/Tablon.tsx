/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Megaphone, Plus, Trash2, Edit2, Heart, MessageSquare, Send, 
  Tag, Calendar, User as UserIcon, ShieldAlert, Sparkles, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import { User } from '../types';
import { uid, now, fmtDate } from '../lib/db';

interface Comment {
  id: string;
  userId: string;
  userName: string;
  texto: string;
  creado: string;
}

interface Notice {
  id: string;
  titulo: string;
  contenido: string;
  categoria: 'urgente' | 'academico' | 'comunidad' | 'administrativo';
  likes: string[]; // List of user IDs who liked this
  comments: Comment[];
  destinatarios: 'todos' | 'docentes' | 'estudiantes';
  createdBy: string;
  createdByName: string;
  creado: string;
}

interface TablonProps {
  currentUser: User;
  users: User[];
  toast: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

export default function Tablon({ currentUser, users, toast }: TablonProps) {
  const isDocOrAdmin = currentUser.rol === 'admin' || currentUser.rol === 'docente';

  // State
  const [notices, setNotices] = useState<Notice[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Modal / form states for creating/editing announcements
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titulo, setTitulo] = useState<string>('');
  const [contenido, setContenido] = useState<string>('');
  const [categoria, setCategoria] = useState<Notice['categoria']>('academico');
  const [destinatarios, setDestinatarios] = useState<Notice['destinatarios']>('todos');

  // Input states for writing replies
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  // Pagination states
  const itemsPerPage = 6;
  const [currentPage, setCurrentPage] = useState(1);

  // Initial load & seeds
  useEffect(() => {
    const saved = localStorage.getItem('ep_tablon');
    if (saved) {
      try {
        setNotices(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading notices', e);
      }
    } else {
      // Seed data
      const docUser = users.find(u => u.rol === 'docente') || currentUser;
      const seedNotices: Notice[] = [
        {
          id: uid(),
          titulo: '🚨 Recordatorio: Cierre de Evaluaciones de Primer Corte',
          contenido: 'Estimados docentes y estudiantes, recuerden que de acuerdo al calendario escolar calificado, el portal de registro de parciales cerrará este viernes a las 18:00 para la entrega del informe del 30% inicial escolar.',
          categoria: 'urgente',
          likes: [currentUser.id],
          destinatarios: 'todos',
          comments: [
            {
              id: uid(),
              userId: docUser.id,
              userName: docUser.nombre,
              texto: 'Todas las notas de matemáticas ya se encuentran consolidadas en el corte principal.',
              creado: now(),
            }
          ],
          createdBy: docUser.id,
          createdByName: docUser.nombre,
          creado: new Date(Date.now() - 36000000).toISOString(), // 10 hours ago
        },
        {
          id: uid(),
          titulo: '🏆 Inauguración oficial de los Juegos Intercolegiados Synapsis 2026',
          contenido: 'Le extendemos una gran invitación a toda la comunidad estudiantil para participar en la gala de inauguración este sábado a las 08:30 en el coliseo mayor. ¡Vengan con sus camisetas de grado a apoyar a la promoción!',
          categoria: 'comunidad',
          likes: [],
          destinatarios: 'todos',
          comments: [],
          createdBy: currentUser.id,
          createdByName: 'Equipo Administrativo',
          creado: new Date(Date.now() - 86400000).toISOString(), // yesterday
        }
      ];
      setNotices(seedNotices);
      localStorage.setItem('ep_tablon', JSON.stringify(seedNotices));
    }
  }, [users]);

  // Handler for Likes toggle
  const handleLike = (id: string) => {
    const nextNotices = notices.map(n => {
      if (n.id === id) {
        const liked = n.likes.includes(currentUser.id);
        const nextLikes = liked 
          ? n.likes.filter(lId => lId !== currentUser.id)
          : [...n.likes, currentUser.id];
        return { ...n, likes: nextLikes };
      }
      return n;
    });
    setNotices(nextNotices);
    localStorage.setItem('ep_tablon', JSON.stringify(nextNotices));
  };

  // Handler for Posting comments
  const handlePostComment = (noticeId: string) => {
    const text = replyText[noticeId] || '';
    if (!text.trim()) return;

    const newComment: Comment = {
      id: uid(),
      userId: currentUser.id,
      userName: currentUser.nombre,
      texto: text.trim(),
      creado: now(),
    };

    const nextNotices = notices.map(n => {
      if (n.id === noticeId) {
        return { ...n, comments: [...n.comments, newComment] };
      }
      return n;
    });

    setNotices(nextNotices);
    localStorage.setItem('ep_tablon', JSON.stringify(nextNotices));
    setReplyText(prev => ({ ...prev, [noticeId]: '' }));
    toast('Comentario publicado', 'success');
  };

  // Create or update notice
  const handleSaveNotice = (e: React.FormEvent) => {
    e.preventDefault();

    if (!titulo.trim() || !contenido.trim()) {
      toast('Por favor, completa los campos requeridos', 'error');
      return;
    }

    const nextNotices = [...notices];

    if (editingId) {
      const idx = nextNotices.findIndex(n => n.id === editingId);
      if (idx > -1) {
        nextNotices[idx] = {
          ...nextNotices[idx],
          titulo: titulo.trim(),
          contenido: contenido.trim(),
          categoria,
          destinatarios,
          creado: now(),
        };
        toast('Anuncio actualizado con éxito', 'success');
      }
    } else {
      nextNotices.push({
        id: uid(),
        titulo: titulo.trim(),
        contenido: contenido.trim(),
        categoria,
        likes: [],
        comments: [],
        destinatarios,
        createdBy: currentUser.id,
        createdByName: currentUser.nombre,
        creado: now(),
      });
      toast('Nuevo anuncio publicado en el tablón', 'success');
    }

    setNotices(nextNotices);
    localStorage.setItem('ep_tablon', JSON.stringify(nextNotices));
    setIsModalOpen(false);
  };

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setTitulo('');
    setContenido('');
    setCategoria('academico');
    setDestinatarios('todos');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (n: Notice) => {
    setEditingId(n.id);
    setTitulo(n.titulo);
    setContenido(n.contenido);
    setCategoria(n.categoria);
    setDestinatarios(n.destinatarios);
    setIsModalOpen(true);
  };

  const handleDeleteNotice = (id: string) => {
    if (window.confirm('¿Deseas eliminar definitivamente este anuncio del tablón?')) {
      const nextNotices = notices.filter(n => n.id !== id);
      setNotices(nextNotices);
      localStorage.setItem('ep_tablon', JSON.stringify(nextNotices));
      toast('Anuncio eliminado con éxito', 'success');
    }
  };

  // Filtration based on role and active tab category selection
  const filteredNotices = notices.filter(n => {
    // Visibility checks: Is the notice meant for the user's role?
    const hasRoleAccess = n.destinatarios === 'todos' || 
      (n.destinatarios === 'estudiantes' && currentUser.rol === 'estudiante') ||
      (n.destinatarios === 'docentes' && currentUser.rol === 'docente') ||
      currentUser.rol === 'admin';

    const matchCategory = activeCategory === 'all' || n.categoria === activeCategory;

    return hasRoleAccess && matchCategory;
  }).sort((a, b) => b.creado.localeCompare(a.creado));

  const totalPages = Math.ceil(filteredNotices.length / itemsPerPage) || 1;
  const activePage = currentPage > totalPages ? totalPages : currentPage;
  const currentNoticesFiltered = filteredNotices.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in text-left">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm theme-bg-surface theme-border">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider mb-2">
            <Megaphone className="w-3.5 h-3.5" /> Tablón de Comunicaciones
          </div>
          <h2 className="text-xl font-extrabold text-slate-905 tracking-tight" style={{ color: 'var(--gray-900)' }}>
            Novedades y Anuncios Generales
          </h2>
          <p className="text-xs text-slate-505 mt-1">
            Ficha informativa general de la comunidad escolar. Entérate de directrices académicas, eventos comunitarios o circulares oficiales.
          </p>
        </div>

        {isDocOrAdmin && (
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 text-xs font-bold text-white rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <Plus className="w-4.5 h-4.5" /> Redactar Comunicado
          </button>
        )}
      </div>

      {/* CATEGORY SELECTOR CHIPS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-hide text-xs font-bold">
        {[
          { key: 'all', label: '📢 Ver Todo' },
          { key: 'urgente', label: '🚨 Urgentes' },
          { key: 'academico', label: '📚 Académicos' },
          { key: 'comunidad', label: '🏆 Comunidad' },
          { key: 'administrativo', label: '⚙️ Circulares' },
        ].map(cat => (
          <button
            key={cat.key}
            onClick={() => { setActiveCategory(cat.key); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-xl transition whitespace-nowrap cursor-pointer ${
              activeCategory === cat.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white hover:bg-slate-50 text-slate-500 border border-slate-200'
            }`}
            style={activeCategory === cat.key ? { backgroundColor: 'var(--primary)' } : {}}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* FEED LIST */}
      {filteredNotices.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 py-16 theme-bg-surface">
          <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-extrabold text-slate-700 text-sm">No hay publicaciones</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Por el momento no se han formulado llamados o comunicados en esta sección para tu rol o corte asignado.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {currentNoticesFiltered.map(n => {
            const hasLiked = n.likes.includes(currentUser.id);
            
            // Format styling
            let catBadge = '';
            if (n.categoria === 'urgente') catBadge = 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse font-black';
            else if (n.categoria === 'academico') catBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
            else if (n.categoria === 'comunidad') catBadge = 'bg-amber-50 text-amber-700 border-amber-200';
            else if (n.categoria === 'administrativo') catBadge = 'bg-blue-50 text-blue-700 border-blue-200';

            return (
              <div 
                key={n.id} 
                className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:shadow-sm transition-all duration-200 overflow-hidden theme-bg-surface theme-border flex flex-col justify-between"
              >
                {/* Notice header card */}
                <div className="p-5 space-y-3 pb-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className={`px-2.5 py-0.5 rounded-full border text-[9px] uppercase font-bold tracking-wider ${catBadge}`}>
                      {n.categoria.toUpperCase()}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono font-medium flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> {fmtDate(n.creado)}
                    </span>
                  </div>

                  <h3 className="font-extrabold text-slate-850 leading-snug text-sm tracking-tight" style={{ color: 'var(--gray-900)' }}>
                    {n.titulo}
                  </h3>

                  <p className="text-xs text-slate-505 leading-relaxed whitespace-pre-line font-medium break-words">
                    {n.contenido}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[10px]" style={{ color: 'var(--primary)' }}>
                        {n.createdByName.charAt(0)}
                      </div>
                      <span>Pub: {n.createdByName} {n.destinatarios !== 'todos' ? `[Para: ${n.destinatarios}]` : ''}</span>
                    </div>

                    {isDocOrAdmin && (n.createdBy === currentUser.id || currentUser.rol === 'admin') && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenEditModal(n)}
                          className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-slate-50 cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteNotice(n.id)}
                          className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* HEART LIKE AND FEED COMMENT SHIELD */}
                <div className="bg-slate-50/50 border-t border-slate-100 p-4 space-y-4 theme-bg-surface text-xs font-semibold">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleLike(n.id)}
                      className={`flex items-center gap-1.5 transition select-none cursor-pointer ${
                        hasLiked ? 'text-rose-600 font-bold' : 'text-slate-450 hover:text-rose-500'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${hasLiked ? 'fill-rose-600 animate-scale-up' : ''}`} />
                      <span>{n.likes.length} Reacciones</span>
                    </button>

                    <div className="text-slate-400 font-medium flex items-center gap-1">
                      <MessageSquare className="w-4 h-4" />
                      <span>{n.comments.length} Comentarios</span>
                    </div>
                  </div>

                  {/* COMMENTS LOG AREA */}
                  {n.comments.length > 0 && (
                    <div className="space-y-3.5 max-h-36 overflow-y-auto pr-1">
                      {n.comments.map(c => (
                        <div key={c.id} className="bg-slate-100/55 p-2.5 rounded-xl text-left border border-slate-100 space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-bold">
                            <span className="text-indigo-700">{c.userName}</span>
                            <span className="text-slate-405 font-medium">{fmtDate(c.creado).substring(0, 10)}</span>
                          </div>
                          <p className="text-[11px] text-slate-650 leading-normal break-words font-medium">{c.texto}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* WRITE COMMENT LOGIC */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Escribe un comentario..."
                      value={replyText[n.id] || ''}
                      onChange={e => setReplyText(prev => ({ ...prev, [n.id]: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handlePostComment(n.id);
                      }}
                      className="flex-1 bg-white border border-slate-200 text-xs p-2.5 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={() => handlePostComment(n.id)}
                      className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition cursor-pointer flex items-center justify-center shadow-xs"
                      style={{ backgroundColor: 'var(--primary)' }}
                    >
                      <Send className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PAGINATION PANEL (if overflowed) */}
      {filteredNotices.length > itemsPerPage && (
        <div className="px-5 py-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between flex-wrap gap-3 theme-bg-surface theme-border">
          <div className="text-xs text-slate-500 select-none">
            Mostrando <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>{((activePage - 1) * itemsPerPage) + 1}</span> a{' '}
            <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>
              {Math.min(activePage * itemsPerPage, filteredNotices.length)}
            </span>{' '}
            de <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>{filteredNotices.length}</span> comunicados cargados
          </div>
          <div className="flex items-center gap-1.5">
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

      {/* CREATE / EDIT NOTICE DIALOG */}
      {isModalOpen && (
        <div className="modal-overlay fixed inset-0 bg-black/45 flex items-center justify-center z-[200] p-4 text-left">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden animate-scale-up border border-slate-150 shadow-xl theme-bg-surface">
            {/* Header */}
            <div className="bg-slate-50 p-5 border-b border-slate-200 flex items-center justify-between theme-bg-surface">
              <div className="flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-indigo-500" />
                <h3 className="font-extrabold text-slate-900 text-sm" style={{ color: 'var(--gray-900)' }}>
                  {editingId ? 'Editar Comunicado Oficial' : 'Redactar Nuevo Comunicado'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100 cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Form */}
            <form onSubmit={handleSaveNotice} className="p-6 space-y-4 text-xs font-semibold">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Título de la Publicación <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Circular 041 - Apertura de Matrículas Extraordinarias"
                  value={titulo}
                  onChange={e => setTitulo(e.target.value)}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-indigo-550 w-full font-bold"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cuerpo / Contenido <span className="text-red-500">*</span></label>
                <textarea
                  required
                  rows={4}
                  placeholder="Escribe el mensaje formal para la comunidad..."
                  value={contenido}
                  onChange={e => setContenido(e.target.value)}
                  className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-indigo-550 w-full leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Categoría</label>
                  <select
                    value={categoria}
                    onChange={e => setCategoria(e.target.value as Notice['categoria'])}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-705 focus:outline-none"
                  >
                    <option value="urgente">🚨 Circular Urgente</option>
                    <option value="academico">📚 Reporte Académico</option>
                    <option value="comunidad">🏆 Evento Colectivo</option>
                    <option value="administrativo">⚙️ Gestión Administrativa</option>
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Destinatarios</label>
                  <select
                    value={destinatarios}
                    onChange={e => setDestinatarios(e.target.value as Notice['destinatarios'])}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-705 focus:outline-none"
                  >
                    <option value="todos">👥 Todos los usuarios</option>
                    <option value="estudiantes">🎓 Sólo Estudiantes</option>
                    <option value="docentes">🍎 Sólo Docentes</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
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
                  Publicar Comunicado
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
