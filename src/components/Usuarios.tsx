/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserPlus, UserCheck, Trash2, Edit2, Shield, Calendar, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { User, Subject, Semester } from '../types';
import { uid, now, fmtDate, avatarColor, avatarLetter } from '../lib/db';

interface UsuariosProps {
  currentUser: User;
  users: User[];
  subjects: Subject[];
  semesters: Semester[];
  onUpdateUsers: (updated: User[]) => void;
  toast: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

export default function Usuarios({ currentUser, users, subjects, semesters, onUpdateUsers, toast }: UsuariosProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form states
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [rol, setRol] = useState<User['rol']>('estudiante');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Filter users based on search
  const filteredUsers = users.filter(u => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      u.nombre.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query) ||
      u.rol.toLowerCase().includes(query)
    );
  });

  // Pagination states & calculations based on filtered list
  const itemsPerPage = 8;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage) || 1;
  const activePage = currentPage > totalPages ? totalPages : currentPage;

  const currentUsers = filteredUsers.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

  const handleOpenCreateModal = () => {
    setEditingUserId(null);
    setNombre('');
    setEmail('');
    setPass('');
    setRol('estudiante');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUserId(user.id);
    setNombre(user.nombre);
    setEmail(user.email);
    setPass(''); // Leave input blank unless changing password
    setRol(user.rol);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !email.trim()) {
      toast('Completa todos los campos obligatorios', 'error');
      return;
    }

    if (!editingUserId && !pass) {
      toast('La contraseña es obligatoria para nuevos usuarios', 'error');
      return;
    }

    const nextUsers = [...users];

    if (editingUserId) {
      // Editing Mode
      const userIdx = nextUsers.findIndex(u => u.id === editingUserId);
      if (userIdx > -1) {
        const existing = nextUsers[userIdx];
        nextUsers[userIdx] = {
          ...existing,
          nombre: nombre.trim().toUpperCase(),
          email: email.trim().toLowerCase(),
          rol,
          ...(pass ? { pass } : {}), // only override if typed
        };
        onUpdateUsers(nextUsers);
        toast('Usuario actualizado correctamente', 'success');
      }
    } else {
      // Creation Mode
      if (users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
        toast('Este correo electrónico ya se encuentra registrado', 'error');
        return;
      }

      const newUser: User = {
        id: uid(),
        nombre: nombre.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
        pass,
        rol,
        creado: now(),
      };
      onUpdateUsers([...nextUsers, newUser]);
      toast('Usuario registrado exitosamente', 'success');
    }

    setIsModalOpen(false);
  };

  const handleDeleteUser = (id: string) => {
    if (id === currentUser.id) {
      toast('No puedes eliminar tu propia cuenta activa', 'error');
      return;
    }
    const nextUsers = users.filter(u => u.id !== id);
    onUpdateUsers(nextUsers);
    toast('Usuario eliminado del sistema correctamente', 'success');
  };

  return (
    <div className="page-usuarios animate-fade-in pb-12">
      <div className="page-header flex items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="page-title text-2xl font-bold tracking-tight text-slate-900" style={{ color: 'var(--gray-900)' }}>
            Gestión de usuarios
          </h2>
          <div className="page-sub text-sm font-medium mt-1 text-slate-500">
            Administra los roles, accesos y sesiones de los docentes y estudiantes registrados
          </div>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="btn btn-primary flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-white font-semibold shadow hover:scale-[1.02] transition-transform cursor-pointer shadow-sm hover:opacity-95"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          <UserPlus className="w-4 h-4" />
          <span>Nuevo usuario</span>
        </button>
      </div>

      {/* Caja de Búsqueda de Usuarios */}
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
            placeholder="Buscar por nombre, correo o rol de acceso..."
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
          <span>Usuarios encontrados: </span>
          <span className="font-extrabold text-indigo-700">{filteredUsers.length}</span>
        </div>
      </div>

      <div className="card bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden theme-bg-surface theme-border">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-sm text-slate-600">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-medium text-xs uppercase tracking-wider theme-bg-surface border-b border-slate-200">
                <th className="py-3 px-4">Usuario</th>
                <th className="py-3 px-4">Correo</th>
                <th className="py-3 px-4">Tipo de Rol</th>
                <th className="py-3 px-4">Relación Académica</th>
                <th className="py-3 px-4">Registrado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {currentUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold select-none bg-slate-50/50">
                    <Search className="w-8 h-8 mx-auto opacity-35 mb-2.5 text-slate-500" />
                    <p className="text-sm font-bold text-slate-700">No se encontraron usuarios coincidentes</p>
                    <p className="text-xs text-slate-400 mt-1">Prueba a buscar con otros términos como "admin", "docente" o el nombre de pila.</p>
                  </td>
                </tr>
              ) : (
                currentUsers.map(u => {
                  const isCurrent = u.id === currentUser.id;
                  const roleColor = u.rol === 'admin' ? 'bg-rose-50 border-rose-100 text-rose-700' : u.rol === 'docente' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700';

                  // Calculate academic relation tag/info
                  let relationshipContent = null;
                  if (u.rol === 'docente') {
                    const assignedSubjects = subjects.filter(s => s.docenteId === u.id);
                    relationshipContent = (
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {assignedSubjects.length > 0 ? (
                          assignedSubjects.map(s => (
                            <span key={s.id} className="text-[10px] font-bold bg-indigo-50 text-indigo-750 px-2 py-0.5 rounded border border-indigo-150 uppercase" title="Materia impartida">
                              {s.nombre} {s.codigo ? `(${s.codigo})` : ''}
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-450 italic font-normal">Sin materias asignadas aún</span>
                        )}
                      </div>
                    );
                  } else if (u.rol === 'estudiante') {
                    const currentSem = semesters.find(s => s.id === u.semestre);
                    relationshipContent = (
                      <div className="flex flex-col gap-0.5 max-w-xs">
                        <span className="text-[10px] font-bold text-violet-750 bg-violet-50/80 px-2 py-0.5 rounded border border-violet-100 max-w-max uppercase">
                          {currentSem?.nombre || 'Período no asignado'}
                        </span>
                        <span className="text-[10px] text-slate-450 font-semibold">
                          {u.asignaturas && u.asignaturas.length > 0
                            ? `${u.asignaturas.length} materia(s) inscrita(s)`
                            : 'Ninguna materia vinculada'}
                        </span>
                      </div>
                    );
                  } else {
                    relationshipContent = (
                      <span className="text-[10px] text-rose-600 font-extrabold bg-rose-50/50 px-2 py-0.5 rounded border border-rose-100 uppercase">
                        Superusuario
                      </span>
                    );
                  }

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="user-avatar w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-sm shrink-0"
                            style={{ backgroundColor: avatarColor(u.nombre) }}
                          >
                            {avatarLetter(u.nombre)}
                          </div>
                          <span className="text-slate-900 font-bold" style={{ color: 'var(--gray-900)' }}>
                            {u.nombre} {isCurrent && <span className="text-[10px] text-slate-400 font-medium italic">(Tú)</span>}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-xs font-mono lowercase whitespace-nowrap overflow-hidden text-ellipsis max-w-xs email-display" title={u.email.toLowerCase()}>{u.email.toLowerCase()}</td>
                      <td className="py-3.5 px-4">
                        <span className={`badge inline-flex items-center px-2 py-0.5 rounded-full text-xs border uppercase font-bold tracking-wide ${roleColor}`}>
                          {u.rol}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs sm:text-sm text-slate-500">
                        {relationshipContent}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400 font-sans tracking-wide">
                        {fmtDate(u.creado)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex gap-1.5 justify-end items-center">
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className="p-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-500"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {!isCurrent && (
                            confirmDeleteId === u.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    handleDeleteUser(u.id);
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
                                onClick={() => setConfirmDeleteId(u.id)}
                                className="p-1 rounded border border-rose-225 bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                                title="Eliminar usuario"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {filteredUsers.length > itemsPerPage && (
            <div className="px-4 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3 theme-bg-surface">
              <div className="text-xs text-slate-500 select-none">
                Mostrando <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>{((activePage - 1) * itemsPerPage) + 1}</span> a{' '}
                <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>
                  {Math.min(activePage * itemsPerPage, filteredUsers.length)}
                </span>{' '}
                de <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>{filteredUsers.length}</span> usuarios
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
      </div>

      {/* USER DIALOG MODAL */}
      {isModalOpen && (
        <div className="modal-overlay fixed inset-0 bg-black/45 flex items-center justify-center z-[200] p-4 text-left">
          <div className="modal bg-white rounded-2xl shadow-xl w-full max-w-md theme-bg-surface">
            <div className="modal-header border-b border-slate-100 p-4.5 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="modal-title font-bold text-slate-900 border-none">
                {editingUserId ? 'Editar usuario' : 'Registrar nuevo usuario'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="modal-close hover:bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 transition">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group flex flex-col">
                  <label className="form-label text-xs font-bold text-slate-500 mb-1 leading-none uppercase">Nombre Completo <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="Tu nombre completo"
                    className="form-control p-2 border rounded-lg text-sm bg-white shrink-0 focus:outline-indigo-600"
                  />
                </div>
                <div className="form-group flex flex-col">
                  <label className="form-label text-xs font-bold text-slate-500 mb-1 leading-none uppercase">Rol de acceso <span className="text-red-500">*</span></label>
                  <select
                    value={rol}
                    onChange={e => setRol(e.target.value as User['rol'])}
                    className="form-control p-2 border rounded-lg text-sm bg-white shrink-0 focus:outline-indigo-600 cursor-pointer text-slate-700"
                  >
                    <option value="estudiante">Estudiante</option>
                    <option value="docente">Docente</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              <div className="form-group flex flex-col">
                <label className="form-label text-xs font-bold text-slate-500 mb-1 leading-none uppercase">Correo electrónico <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ejemplo@instituto.edu.co"
                  className="form-control p-2 border rounded-lg text-sm bg-white shrink-0 focus:outline-indigo-600"
                />
              </div>

              <div className="form-group flex flex-col">
                <label className="form-label text-xs font-bold text-slate-500 mb-1 leading-none uppercase">
                  Contraseña {editingUserId ? '(Opcional cambiar)' : <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  placeholder={editingUserId ? "Dejar vacío si no deseas cambiar" : "Mínimo 6 caracteres"}
                  minLength={editingUserId ? undefined : 6}
                  required={!editingUserId}
                  className="form-control p-2 border rounded-lg text-sm bg-white shrink-0 focus:outline-indigo-600"
                />
              </div>

              <div className="modal-footer border-t border-slate-100 flex justify-end gap-2.5 pt-4 mt-6 bg-slate-50 rounded-b-2xl -mx-5 -mb-5 p-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn btn-secondary px-4 py-2 border rounded-xl hover:bg-slate-100 text-slate-700 bg-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary px-4.5 py-2 text-white font-bold rounded-xl cursor-pointer"
                  style={{ backgroundColor: 'var(--primary)' }}
                >
                  {editingUserId ? 'Actualizar usuario' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
