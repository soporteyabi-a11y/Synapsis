/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LogOut, Monitor, Menu, Music, Volume2, VolumeX, Sparkles, Sprout, QrCode, Share2, RefreshCw, Cloud } from 'lucide-react';
import { User } from '../types';
import { avatarColor, avatarLetter } from '../lib/db';
import { bioCosmicSynth } from '../lib/audioEngine';

interface HeaderProps {
  currentUser: User;
  theme: string;
  onThemeChange: (newTheme: string) => void;
  onLogout: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenShareModal?: () => void;
  onSyncFirebase?: () => void;
  isSyncing?: boolean;
}

export default function Header({ 
  currentUser, 
  theme, 
  onThemeChange, 
  onLogout,
  sidebarOpen,
  onToggleSidebar,
  onOpenShareModal,
  onSyncFirebase,
  isSyncing = false
}: HeaderProps) {
  const roleLabel = {
    admin: 'Administrador',
    docente: 'Docente',
    estudiante: 'Estudiante',
  }[currentUser.rol];

  const [isMusicPlaying, setIsMusicPlaying] = useState(bioCosmicSynth.getIsPlaying());

  const handleToggleMusic = () => {
    const newState = bioCosmicSynth.togglePlay();
    setIsMusicPlaying(newState);
  };

  return (
    <header className="header fixed top-0 left-0 right-0 h-[60px] bg-white border-b border-slate-200 flex items-center px-4.5 gap-3.5 z-50 shadow-sm theme-bg-surface theme-border">
      {/* Retractable Sidebar Menu Toggle Button */}
      <button
        onClick={onToggleSidebar}
        className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-colors cursor-pointer focus:outline-none flex items-center justify-center"
        title={sidebarOpen ? "Ocultar menú" : "Mostrar menú"}
      >
        <Menu className="w-5.5 h-5.5" />
      </button>

      <div className="header-logo flex items-center gap-2">
        <div 
          className="logo-icon w-[34px] h-[34px] rounded-lg flex items-center justify-center text-white text-lg font-bold"
          style={{ backgroundColor: 'var(--primary)' }}
        >
          S
        </div>
        <div>
          <div className="logo-text text-[17px] font-bold tracking-tight" style={{ color: 'var(--gray-900)' }}>
            Synapsis
          </div>
          <div className="logo-sub text-[11px] font-medium" style={{ color: 'var(--gray-400)' }}>
            Evaluación & Control
          </div>
        </div>
      </div>

      <div className="header-spacer flex-1" />

      <div className="flex items-center gap-3">
        {/* Bio-Cosmic Soundscapes Panel */}
        {theme === 'theme-cyber' && (
          <button
            onClick={handleToggleMusic}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold select-none transition-all duration-300 shadow-sm cursor-pointer ${
              isMusicPlaying 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800/70'
            }`}
            style={{
              boxShadow: isMusicPlaying ? '0 0 8px rgba(16, 185, 129, 0.25)' : 'none'
            }}
            title={isMusicPlaying ? 'Silenciar sintonía cyber' : 'Activar sintonía cyber matrix'}
          >
            {isMusicPlaying ? (
              <Volume2 className="w-3.5 h-3.5 animate-bounce" />
            ) : (
              <VolumeX className="w-3.5 h-3.5" />
            )}
            <span className="hidden md:flex items-center gap-1 font-medium font-sans">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Sintonía Cyber</span>
            </span>
          </button>
        )}

        {/* Quick QR & Short URL Share Button */}
        {onOpenShareModal && (
          <button
            type="button"
            onClick={onOpenShareModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-all cursor-pointer shadow-xs"
            title="Ver enlace oficial synapsis-edu.web.app y código QR"
          >
            <QrCode className="w-4 h-4 text-indigo-600" />
            <span className="hidden sm:inline">Enlace & QR</span>
          </button>
        )}

        {/* Firebase Synchronization Status & Trigger */}
        {onSyncFirebase && (
          <button
            type="button"
            onClick={onSyncFirebase}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-60"
            title="Sincronizar datos con Firebase (ai-studio-applet-webapp)"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">{isSyncing ? 'Sincronizando...' : 'Sincronizar Firebase'}</span>
          </button>
        )}

        {/* Theme Selector - Exclusively Two Themes */}
        <div className="relative">
          <select
            id="themeSelector"
            value={theme}
            onChange={(e) => onThemeChange(e.target.value)}
            className="form-control text-sm pr-8 pl-3 py-1.5 rounded-lg border border-slate-200 outline-none cursor-pointer text-slate-700 bg-white font-medium"
            style={{
              borderColor: 'var(--gray-200)',
              color: 'var(--gray-700)',
            }}
          >
            <option value="theme-academia">🏛 Academia Clásica (Gris Slate Medio-Oscuro)</option>
            <option value="theme-cyber">⚡ Cyber Matrix (Cuadrícula Neón)</option>
          </select>
        </div>

        {/* User profile dropdown button */}
        <div 
          onClick={onLogout}
          className="header-user flex items-center gap-2.5 cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg transition-colors group"
          title="Cerrar sesión"
        >
          <div 
            className="user-avatar w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold text-white shadow-sm"
            style={{ backgroundColor: avatarColor(currentUser.nombre) }}
          >
            {avatarLetter(currentUser.nombre)}
          </div>
          <div className="user-info text-left hidden sm:block">
            <div className="user-name text-[13px] font-semibold leading-tight text-slate-800" style={{ color: 'var(--gray-800)' }}>
              {currentUser.nombre}
            </div>
            <div className="user-role text-[11px] font-medium text-slate-400">
              {roleLabel}
            </div>
          </div>
          
          <LogOut className="w-4 h-4 ml-1 text-slate-400 group-hover:text-red-600 transition-colors" />
        </div>
      </div>
    </header>
  );
}
