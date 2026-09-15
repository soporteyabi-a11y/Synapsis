/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Award, BookOpen, Clock, CheckCircle, XCircle, Search } from 'lucide-react';
import { User, Exam, Submission } from '../types';
import { fmtDate, fmtTime } from '../lib/db';

interface MiHistorialProps {
  currentUser: User;
  exams: Exam[];
  submissions: Submission[];
}

export default function MiHistorial({ currentUser, exams, submissions }: MiHistorialProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const mySubs = submissions
    .filter(s => s.estudianteId === currentUser.id)
    .filter(s => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const exam = exams.find(e => e.id === s.examenId);
      return (
        (exam?.titulo || '').toLowerCase().includes(q) ||
        (exam?.materia || '').toLowerCase().includes(q)
      );
    })
    .sort((a,b) => b.fecha.localeCompare(a.fecha));

  // Reset page to 1 when a search is entered
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const subsPerPage = 7;
  const totalPages = Math.ceil(mySubs.length / subsPerPage) || 1;
  const currentActivePage = Math.min(currentPage, totalPages);
  const paginatedSubs = mySubs.slice((currentActivePage - 1) * subsPerPage, currentActivePage * subsPerPage);

  return (
    <div className="page-miHistorial animate-fade-in pb-12">
      <div className="page-header mb-6">
        <h2 className="page-title text-2xl font-bold tracking-tight text-slate-900" style={{ color: 'var(--gray-900)' }}>
          Mi historial académico
        </h2>
        <div className="page-sub text-sm font-medium mt-1 text-slate-500">
          Revisa las notas, retroalimentaciones e historial de exámenes que has presentado
        </div>
      </div>

      {/* Caja de Búsqueda de Historial Académicos */}
      <div className="mb-6 flex flex-col md:flex-row items-center gap-4 bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm theme-bg-surface theme-border justify-between">
        <div className="relative w-full md:max-w-md flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título de examen o asignatura/materia..."
            className="w-full pl-10 pr-9 py-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm font-semibold text-slate-800 transition duration-150 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-150"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 cursor-pointer font-extrabold select-none text-xs transition"
              title="Limpiar búsqueda"
            >
              ✕
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0 self-start md:self-auto text-xs font-semibold text-slate-500 bg-slate-50/70 py-1.5 px-3 rounded-lg border border-slate-100 select-none">
          <span>Evaluaciones presentadas: </span>
          <span className="font-extrabold text-indigo-700">{mySubs.length}</span>
        </div>
      </div>

      <div className="card bg-white rounded-2xl border border-slate-202 shadow-sm overflow-hidden theme-bg-surface theme-border">
        {mySubs.length === 0 ? (
          <div className="empty-state py-12 text-center text-slate-500 flex flex-col items-center">
            <BookOpen className="w-12 h-12 text-slate-350 mb-3" />
            <h4 className="empty-title text-base font-bold text-slate-700">
              {searchQuery ? 'No se encontraron registros coincidentes' : 'Sin historial registrado'}
            </h4>
            <p className="empty-sub text-xs text-slate-400 mt-1">
              {searchQuery ? 'Prueba escribiendo otros términos de búsqueda de materia o examen.' : 'Aún no has participado en ninguna evaluación del instituto.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm text-slate-605">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-medium text-xs uppercase tracking-wider theme-bg-surface border-b border-slate-200">
                  <th className="py-3 px-4">Examen</th>
                  <th className="py-3 px-4">Materia</th>
                  <th className="py-3 px-4 text-center">Puntaje</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4">Aciertos / Desaciertos</th>
                  <th className="py-3 px-4">Duración</th>
                  <th className="py-3 px-4">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedSubs.map(s => {
                  const exam = exams.find(e => e.id === s.examenId);
                  const isPending = s.estado === 'pendiente';

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-bold text-slate-900" style={{ color: 'var(--gray-900)' }}>
                        {exam?.titulo || 'Examen eliminado'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="badge inline-flex px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {exam?.materia || '—'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-lg font-extrabold text-slate-805" style={{ color: s.aprobado ? 'var(--success)' : 'var(--danger)' }}>
                          {s.puntaje}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {isPending ? (
                          <span className="badge inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-amber-50 border border-amber-100 text-amber-700 font-bold">
                            Pendiente Calificación
                          </span>
                        ) : s.aprobado ? (
                          <span className="badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-50 border border-emerald-100 text-emerald-700 font-bold">
                            <CheckCircle className="w-3 h-3" />
                            <span>Aprobado</span>
                          </span>
                        ) : (
                          <span className="badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-rose-50 border border-rose-100 text-rose-700 font-bold">
                            <XCircle className="w-3 h-3" />
                            <span>Reprobado</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        <span className="text-emerald-700 font-bold">{s.correctas || 0} correctas</span>
                        <span className="mx-1 text-slate-300">/</span>
                        <span className="text-red-600 font-bold">{s.incorrectas || 0} incorrectas</span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">{s.tiempoUsado || '—'}</td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        <div>{fmtDate(s.fecha)}</div>
                        <div className="text-[10px] mt-0.5">{fmtTime(s.fecha)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {mySubs.length > 7 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50">
                <span className="text-xs font-semibold text-slate-400">
                  Mostrando { (currentActivePage - 1) * 7 + 1 } a { Math.min(currentActivePage * 7, mySubs.length) } de { mySubs.length } evaluaciones
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
    </div>
  );
}
