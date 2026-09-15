/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  LayoutGrid, FileText, BarChart3, Clock, Milestone, 
  Users, School, BookOpen, Layers, GraduationCap, 
  ClipboardList, Scroll, Award, ChevronDown, ChevronRight,
  CheckSquare, Megaphone, DollarSign, Calendar, Library, BookMarked, QrCode
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  currentUser: User;
  activePage: string;
  onPageChange: (pageId: string) => void;
  isOpen: boolean;
  onClose?: () => void;
  onOpenShareModal?: () => void;
}

export default function Sidebar({ currentUser, activePage, onPageChange, isOpen, onClose, onOpenShareModal }: SidebarProps) {
  const rol = currentUser.rol;

  // Collapsible Nav Groups State (persisted to localStorage)
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('ep_nav_groups');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return {
      principal: true,
      gestion: true,
      recursos: true,
      docente: rol === 'docente' || rol === 'admin',
      estudiante: rol === 'estudiante' || rol === 'admin',
      admin: rol === 'admin',
    };
  });

  useEffect(() => {
    localStorage.setItem('ep_nav_groups', JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isDoc = rol === 'docente' || rol === 'admin';
  const isEst = rol === 'estudiante' || rol === 'admin';
  const isAdm = rol === 'admin' || rol === 'docente'; // Docente has visibility over some admin tasks too in original

  const navItemClass = (pageId: string) => {
    const isSelected = activePage === pageId;
    return `nav-item flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-[10.5px] font-bold tracking-widest uppercase cursor-pointer select-none transition-all duration-150 ${
      isSelected 
        ? 'active shadow-sm' 
        : ''
    }`;
  };

  return (
    <nav className={`sidebar fixed top-[60px] bottom-0 left-0 w-[240px] bg-slate-50 border-r border-slate-200 p-4 overflow-y-auto flex flex-col gap-1.5 z-40 theme-bg-surface theme-border transition-transform duration-300 ease-in-out ${
      isOpen ? 'translate-x-0 shadow-xl md:shadow-none' : '-translate-x-full'
    }`}>
      {/* PRINCIPAL */}
      <div className="nav-group">
        <div 
          onClick={() => toggleGroup('principal')} 
          className="nav-group-header flex items-center justify-between text-[9.5px] font-bold uppercase tracking-widest text-slate-450 py-2 px-2.5 rounded cursor-pointer select-none transition-colors"
        >
          <span>Principal</span>
          {expandedGroups.principal ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
        </div>
        {expandedGroups.principal && (
          <div className="nav-group-content flex flex-col gap-1 mt-1 pl-1">
            <div 
              onClick={() => onPageChange('dashboard')} 
              className={navItemClass('dashboard')}
            >
              <LayoutGrid className="w-[18px] h-[18px] shrink-0" />
              <span>Dashboard</span>
            </div>
          </div>
        )}
      </div>

      {/* GESTIÓN ESCOLAR */}
      <div className="nav-group mt-2">
        <div 
          onClick={() => toggleGroup('gestion')} 
          className="nav-group-header flex items-center justify-between text-[9.5px] font-bold uppercase tracking-widest text-slate-450 py-2 px-2.5 rounded cursor-pointer select-none transition-colors"
        >
          <span>Gestión Escolar</span>
          {expandedGroups.gestion ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
        </div>
        {expandedGroups.gestion && (
          <div className="nav-group-content flex flex-col gap-1 mt-1 pl-1">
            <div 
              onClick={() => onPageChange('asistencia')} 
              className={navItemClass('asistencia')}
            >
              <CheckSquare className="w-[18px] h-[18px] shrink-0" />
              <span>Asistencia</span>
            </div>
            <div 
              onClick={() => onPageChange('boletines')} 
              className={navItemClass('boletines')}
            >
              <Award className="w-[18px] h-[18px] shrink-0" />
              <span>Boletines Acad.</span>
            </div>
            <div 
              onClick={() => onPageChange('agenda')} 
              className={navItemClass('agenda')}
            >
              <Calendar className="w-[18px] h-[18px] shrink-0" />
              <span>Agenda Escolar</span>
            </div>
            <div 
              onClick={() => onPageChange('tablon')} 
              className={navItemClass('tablon')}
            >
              <Megaphone className="w-[18px] h-[18px] shrink-0" />
              <span>Tablón de Anunc.</span>
            </div>
            <div 
              onClick={() => onPageChange('finanzas')} 
              className={navItemClass('finanzas')}
            >
              <DollarSign className="w-[18px] h-[18px] shrink-0" />
              <span>Finanzas / Pagos</span>
            </div>
          </div>
        )}
      </div>

      {/* RECURSOS Y COMUNIDAD */}
      <div className="nav-group mt-2">
        <div 
          onClick={() => toggleGroup('recursos')} 
          className="nav-group-header flex items-center justify-between text-[9.5px] font-bold uppercase tracking-widest text-slate-450 py-2 px-2.5 rounded cursor-pointer select-none transition-colors hover:bg-slate-100/40"
        >
          <span>Recursos y Comunidad</span>
          {expandedGroups.recursos ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
        </div>
        {expandedGroups.recursos && (
          <div className="nav-group-content flex flex-col gap-1 mt-1 pl-1">
            <div 
              onClick={() => onPageChange('educativo')} 
              className={navItemClass('educativo')}
            >
              <Library className="w-[18px] h-[18px] shrink-0 text-indigo-500" />
              <span>Biblioteca de Conocimiento</span>
            </div>
            <div 
              onClick={() => onPageChange('biblia')} 
              className={navItemClass('biblia')}
            >
              <BookMarked className="w-[18px] h-[18px] shrink-0 text-amber-600" />
              <span>La Sagrada Biblia</span>
            </div>
          </div>
        )}
      </div>

      {/* DOCENTE */}
      {isDoc && (
        <div className="nav-group mt-2">
          <div 
            onClick={() => toggleGroup('docente')} 
            className="nav-group-header flex items-center justify-between text-[9.5px] font-bold uppercase tracking-widest text-slate-450 py-2 px-2.5 rounded cursor-pointer select-none transition-colors"
          >
            <span>Docente</span>
            {expandedGroups.docente ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </div>
          {expandedGroups.docente && (
            <div className="nav-group-content flex flex-col gap-1 mt-1 pl-1">
              <div 
                onClick={() => onPageChange('misExamenes')} 
                className={navItemClass('misExamenes')}
              >
                <FileText className="w-[18px] h-[18px] shrink-0" />
                <span>Mis exámenes</span>
              </div>
              <div 
                onClick={() => onPageChange('parciales')} 
                className={navItemClass('parciales')}
              >
                <Milestone className="w-[18px] h-[18px] shrink-0" />
                <span>Mis parciales</span>
              </div>
              <div 
                onClick={() => onPageChange('resultados')} 
                className={navItemClass('resultados')}
              >
                <BarChart3 className="w-[18px] h-[18px] shrink-0" />
                <span>Resultados</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ESTUDIANTE */}
      {isEst && (
        <div className="nav-group mt-2">
          <div 
            onClick={() => toggleGroup('estudiante')} 
            className="nav-group-header flex items-center justify-between text-[9.5px] font-bold uppercase tracking-widest text-slate-450 py-2 px-2.5 rounded cursor-pointer select-none transition-colors"
          >
            <span>Estudiante</span>
            {expandedGroups.estudiante ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </div>
          {expandedGroups.estudiante && (
            <div className="nav-group-content flex flex-col gap-1 mt-1 pl-1">
              <div 
                onClick={() => onPageChange('misExamenesTake')} 
                className={navItemClass('misExamenesTake')}
              >
                <GraduationCap className="w-[18px] h-[18px] shrink-0" />
                <span>Exámenes disp.</span>
              </div>
              <div 
                onClick={() => onPageChange('miHistorial')} 
                className={navItemClass('miHistorial')}
              >
                <Clock className="w-[18px] h-[18px] shrink-0" />
                <span>Mi historial</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ADMINISTRADOR */}
      {isAdm && (
        <div className="nav-group mt-2">
          <div 
            onClick={() => toggleGroup('admin')} 
            className="nav-group-header flex items-center justify-between text-[9.5px] font-bold uppercase tracking-widest text-slate-450 py-2 px-2.5 rounded cursor-pointer select-none transition-colors"
          >
            <span>Administrador</span>
            {expandedGroups.admin ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
          </div>
          {expandedGroups.admin && (
            <div className="nav-group-content flex flex-col gap-1 mt-1 pl-1">
              <div 
                onClick={() => onPageChange('usuarios')} 
                className={navItemClass('usuarios')}
              >
                <Users className="w-[18px] h-[18px] shrink-0" />
                <span>Usuarios</span>
              </div>
              <div 
                onClick={() => onPageChange('instituciones')} 
                className={navItemClass('instituciones')}
              >
                <School className="w-[18px] h-[18px] shrink-0" />
                <span>Institutos</span>
              </div>
              <div 
                onClick={() => onPageChange('asignaturas')} 
                className={navItemClass('asignaturas')}
              >
                <BookOpen className="w-[18px] h-[18px] shrink-0" />
                <span>Asignaturas</span>
              </div>
              <div 
                onClick={() => onPageChange('semestres')} 
                className={navItemClass('semestres')}
              >
                <Layers className="w-[18px] h-[18px] shrink-0" />
                <span>Semestres</span>
              </div>
              <div 
                onClick={() => onPageChange('parciales')} 
                className={navItemClass('parciales')}
              >
                <Milestone className="w-[18px] h-[18px] shrink-0" />
                <span>Parciales</span>
              </div>
              <div 
                onClick={() => onPageChange('registroNotas')} 
                className={navItemClass('registroNotas')}
              >
                <Award className="w-[18px] h-[18px] shrink-0" />
                <span>Reg. de Notas</span>
              </div>
              <div 
                onClick={() => onPageChange('trabajos')} 
                className={navItemClass('trabajos')}
              >
                <ClipboardList className="w-[18px] h-[18px] shrink-0" />
                <span>Trabajos Acad.</span>
              </div>
              <div 
                onClick={() => onPageChange('historialAcademico')} 
                className={navItemClass('historialAcademico')}
              >
                <Scroll className="w-[18px] h-[18px] shrink-0" />
                <span>Historial Acad.</span>
              </div>
              <div 
                onClick={() => onPageChange('estudiantes')} 
                className={navItemClass('estudiantes')}
              >
                <Users className="w-[18px] h-[18px] shrink-0" />
                <span>Estudiantes</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* BOTÓN ENLACE OFICIAL Y CÓDIGO QR */}
      {onOpenShareModal && (
        <button
          type="button"
          onClick={onOpenShareModal}
          className="mt-4 flex items-center justify-center gap-2 p-2.5 bg-indigo-50/90 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 rounded-xl text-[11px] font-bold tracking-tight transition cursor-pointer select-none border border-indigo-200 shrink-0 shadow-xs"
          title="Ver enlace oficial synapsis-edu.web.app y código QR"
        >
          <QrCode className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>Enlace Oficial & QR</span>
        </button>
      )}

      {/* BOTÓN PARA CONTRAER MENÚ (DESKTOP/MOBILE) */}
      <button
        onClick={onClose}
        className="mt-6 flex items-center justify-center gap-2 px-3 py-2.5 bg-slate-150 hover:bg-slate-200 text-slate-700 hover:text-slate-900 rounded-xl text-[10px] font-extrabold uppercase tracking-widest transition cursor-pointer select-none border border-slate-250 shrink-0"
        title="Contraer menú para ganar espacio"
      >
        <span>← Ocultar Menú</span>
      </button>
    </nav>
  );
}
