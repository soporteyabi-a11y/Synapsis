/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { School, Plus, Trash2, Edit2, MapPin, Phone, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { Institution } from '../types';
import { uid, now, fmtDate } from '../lib/db';

interface InstitucionesProps {
  instituciones: Institution[];
  onUpdateInstituciones: (updated: Institution[]) => void;
  toast: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

export default function Instituciones({ instituciones, onUpdateInstituciones, toast }: InstitucionesProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('Instituto');
  const [codigo, setCodigo] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Pagination states & calculations
  const itemsPerPage = 7;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(instituciones.length / itemsPerPage) || 1;
  const activePage = currentPage > totalPages ? totalPages : currentPage;

  const currentInstituciones = instituciones.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setNombre('');
    setTipo('Instituto');
    setCodigo('');
    setCiudad('');
    setDireccion('');
    setTelefono('');
    setEmail('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (inst: Institution) => {
    setEditingId(inst.id);
    setNombre(inst.nombre);
    setTipo(inst.tipo || 'Instituto');
    setCodigo(inst.codigo || '');
    setCiudad(inst.ciudad || '');
    setDireccion(inst.direccion || '');
    setTelefono(inst.telefono || '');
    setEmail(inst.email || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast('El nombre de la institución es obligatorio', 'error');
      return;
    }

    const nextInsts = [...instituciones];

    if (editingId) {
      const idx = nextInsts.findIndex(i => i.id === editingId);
      if (idx > -1) {
        nextInsts[idx] = {
          ...nextInsts[idx],
          nombre: nombre.trim(),
          tipo,
          codigo: codigo.trim(),
          ciudad: ciudad.trim(),
          direccion: direccion.trim(),
          telefono: telefono.trim(),
          email: email.trim(),
          actualizado: now(),
        };
        onUpdateInstituciones(nextInsts);
        toast('Institución actualizada correctamente', 'success');
      }
    } else {
      const newInst: Institution = {
        id: uid(),
        nombre: nombre.trim(),
        tipo,
        codigo: codigo.trim(),
        ciudad: ciudad.trim(),
        direccion: direccion.trim(),
        telefono: telefono.trim(),
        email: email.trim(),
        creado: now(),
      };
      onUpdateInstituciones([...nextInsts, newInst]);
      toast('Institución agregada con éxito', 'success');
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const nextInsts = instituciones.filter(i => i.id !== id);
    onUpdateInstituciones(nextInsts);
    toast('Institución eliminada del sistema correctamente', 'success');
  };

  return (
    <div className="page-instituciones animate-fade-in pb-12">
      <div className="page-header flex items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="page-title text-2xl font-bold tracking-tight text-slate-900" style={{ color: 'var(--gray-900)' }}>
            Instituciones académicas
          </h2>
          <div className="page-sub text-sm font-medium mt-1 text-slate-500 font-sans">
            Gestiona los nombres, códigos y filiales institucionales activas en el sistema
          </div>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="btn btn-primary flex items-center gap-1.5 px-4.5 py-2 rounded-xl text-white font-semibold shadow hover:scale-[1.02] transition-transform cursor-pointer"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          <School className="w-4 h-4" />
          <span>Agregar sede</span>
        </button>
      </div>

      <div className="card bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden theme-bg-surface theme-border">
        {instituciones.length === 0 ? (
          <div className="empty py-12 text-center text-slate-500 flex flex-col items-center">
            <School className="w-12 h-12 text-slate-300 mb-3" />
            <h4 className="font-bold text-slate-750">No hay sedes registradas</h4>
            <button onClick={handleOpenCreateModal} className="text-xs text-indigo-600 hover:underline mt-2">Agregar la primera sede ahora</button>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-600">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-medium text-xs uppercase tracking-wider theme-bg-surface border-b border-slate-200">
                  <th className="py-3 px-4">Institución</th>
                  <th className="py-3 px-4 font-sans text-xs">Ubicación / Código</th>
                  <th className="py-3 px-4">Medios de Contacto</th>
                  <th className="py-3 px-4">Fecha Sincronización</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {currentInstituciones.map(inst => (
                  <tr key={inst.id} className="hover:bg-slate-50/50">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                          <School className="w-5 h-5" style={{ color: 'var(--primary)' }} />
                        </div>
                        <div>
                          <span className="text-slate-900 font-bold block" style={{ color: 'var(--gray-900)' }}>
                            {inst.nombre}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-slate-400">
                            {inst.tipo || 'Universidad'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1 text-slate-500 text-xs text-left">
                        <span className="flex items-center gap-1 font-bold text-slate-700"><MapPin className="w-3 h-3 text-slate-400" /> {inst.ciudad || '—'}</span>
                        <span className="font-bold text-[10px] uppercase text-indigo-600">{inst.codigo || '—'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex flex-col gap-1 text-slate-500 text-xs text-left">
                        {inst.telefono && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" /> {inst.telefono}</span>}
                        {inst.email && <span className="flex items-center gap-1 text-indigo-600 truncate max-w-[170px]"><Mail className="w-3 h-3 text-slate-404" /> {inst.email}</span>}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-400">{fmtDate(inst.creado)}</td>
                     <td className="py-4 px-4 text-right">
                      <div className="inline-flex gap-1.5 justify-end">
                        <button
                          onClick={() => handleOpenEditModal(inst)}
                          className="p-1 rounded border border-slate-200 hover:bg-slate-100 text-slate-500 cursor-pointer"
                          title="Editar institución"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {confirmDeleteId === inst.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                handleDelete(inst.id);
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
                            onClick={() => setConfirmDeleteId(inst.id)}
                            className="p-1 rounded border border-rose-225 bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                            title="Eliminar institución"
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

            {instituciones.length > itemsPerPage && (
              <div className="px-4 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3 theme-bg-surface">
                <div className="text-xs text-slate-500 select-none">
                  Mostrando <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>{((activePage - 1) * itemsPerPage) + 1}</span> a{' '}
                  <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>
                    {Math.min(activePage * itemsPerPage, instituciones.length)}
                  </span>{' '}
                  de <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>{instituciones.length}</span> instituciones
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

      {/* INSTITUTION MODAL */}
      {isModalOpen && (
        <div className="modal-overlay fixed inset-0 bg-black/45 flex items-center justify-center z-[200] p-4 text-left">
          <div className="modal bg-white rounded-2xl shadow-xl w-full max-w-lg theme-bg-surface">
            <div className="modal-header border-b border-slate-100 p-4.5 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="modal-title font-bold text-slate-900 border-none">
                {editingId ? 'Editar sede' : 'Registrar nueva sede'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="modal-close hover:bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 transition">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-body p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group mb-1">
                  <label className="form-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nombre de Institución <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={e => setNombre(e.target.value)}
                    placeholder="Ej / Colegio San José"
                    className="form-control w-full p-2 border rounded-lg text-sm focus:outline-indigo-650 bg-white"
                  />
                </div>
                <div className="form-group mb-1">
                  <label className="form-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tipo de centro</label>
                  <select
                    value={tipo}
                    onChange={e => setTipo(e.target.value)}
                    className="form-control w-full p-2.5 border rounded-lg text-sm focus:outline-indigo-650 bg-white text-slate-705 cursor-pointer"
                  >
                    <option value="Instituto">Instituto / Academia</option>
                    <option value="Colegio">Colegio / Escuela Secundaria</option>
                    <option value="Universidad">Universidad / Corporación</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Código institucional o NIT</label>
                  <input
                    type="text"
                    value={codigo}
                    onChange={e => setCodigo(e.target.value)}
                    placeholder="Ej / NIT-3221"
                    className="form-control w-full p-2 border rounded-lg text-sm focus:outline-indigo-650 bg-white"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Ciudad o localidad</label>
                  <input
                    type="text"
                    value={ciudad}
                    onChange={e => setCiudad(e.target.value)}
                    placeholder="Ej / Cali"
                    className="form-control w-full p-2 border rounded-lg text-sm focus:outline-indigo-650 bg-white"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Dirección postal de contacto</label>
                <input
                  type="text"
                  value={direccion}
                  onChange={e => setDireccion(e.target.value)}
                  placeholder="Ej / Avenida 100 Norte #10"
                  className="form-control w-full p-2 border rounded-lg text-sm focus:outline-indigo-650 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={e => setTelefono(e.target.value)}
                    placeholder="Ej / +57 (2) 4123-11"
                    className="form-control w-full p-2 border rounded-lg text-sm focus:outline-indigo-6s0 bg-white"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Correo electrónico</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Ej / campus@instituto.co"
                    className="form-control w-full p-2 border rounded-lg text-sm focus:outline-indigo-600 bg-white"
                  />
                </div>
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
                  {editingId ? 'Actualizar sede' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
