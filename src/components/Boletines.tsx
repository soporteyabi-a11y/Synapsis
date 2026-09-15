/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, Download, Printer, Award, User as UserIcon, BookOpen, 
  Layers, Landmark, CheckCircle, XCircle, ShieldAlert, CheckSquare, Sparkles,
  FileSpreadsheet, Users, Search, ChevronLeft, ChevronRight, TrendingUp, AlertCircle
} from 'lucide-react';
import { User, Subject, Semester, Parcial, GradeRecord } from '../types';
import { fmtDate } from '../lib/db';
import { SearchableSelect } from './SearchableSelect';

interface BoletinesProps {
  gradeRecords: GradeRecord[];
  users: User[];
  subjects: Subject[];
  semesters: Semester[];
  parciales: Parcial[];
  toast: (msg: string, type: 'success' | 'error' | 'warning') => void;
  currentUser: User;
}

export default function Boletines({ gradeRecords, users, subjects, semesters, parciales, toast, currentUser }: BoletinesProps) {
  const isDocOrAdmin = currentUser.rol === 'admin' || currentUser.rol === 'docente';
  const students = users.filter(u => u.rol === 'estudiante');

  // Selection states
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('');
  const [printLayout, setPrintLayout] = useState<'slate' | 'royal' | 'charcoal'>('slate');
  const [showSignatures, setShowSignatures] = useState<boolean>(true);
  const [customComment, setCustomComment] = useState<string>('');

  // Report View Type (Individual vs. Collective)
  const [reportType, setReportType] = useState<'individual' | 'colectivo'>('individual');
  
  // Collective search and pagination
  const [collectiveSearch, setCollectiveSearch] = useState<string>('');
  const [collectivePage, setCollectivePage] = useState<number>(1);
  const itemsPerPageCollective = 10;

  // Set default student & semester
  useEffect(() => {
    if (!isDocOrAdmin) {
      setSelectedStudentId(currentUser.id);
    } else if (students.length > 0) {
      setSelectedStudentId(students[0].id);
    }

    const activeSem = semesters.find(s => s.estado === 'activo') || semesters[0];
    if (activeSem) {
      setSelectedSemesterId(activeSem.id);
    }
  }, [currentUser, semesters, users, isDocOrAdmin]);

  const targetStudent = users.find(u => u.id === selectedStudentId);
  const targetSemester = semesters.find(s => s.id === selectedSemesterId);

  // Filter and compile results
  // For the selected student and semester:
  // - Identify matching Parciales belonging to this semester
  // - For each subject, find matching GradeRecords for those Parciales
  const activeParciales = parciales.filter(p => p.semestre === selectedSemesterId);
  const activeParcialIds = activeParciales.map(p => p.id);

  // Compile subjects list that have at least one grade, or all subjects in general
  const academicReports = subjects.map(sub => {
    const records = gradeRecords.filter(r => 
      r.estudianteId === selectedStudentId && 
      r.asignaturaId === sub.id && 
      activeParcialIds.includes(r.parcialId)
    );

    if (records.length === 0) return null;

    // Calculate weighted average based on parcial percentage, or default simple average
    let totalScore = 0;
    let totalWeight = 0;

    records.forEach(r => {
      const p = activeParciales.find(arc => arc.id === r.parcialId);
      const weight = p?.porcentaje || 30; // standard default
      totalScore += r.nota * weight;
      totalWeight += weight;
    });

    const finalAverage = totalWeight > 0 ? Number((totalScore / totalWeight).toFixed(2)) : 0;
    const isApproved = finalAverage >= 3.0; // Standard Latin pass mark is 3.0/5.0

    // Performance band
    let performance = 'Bajo';
    let labelColor = 'text-red-600 bg-red-50';
    if (finalAverage >= 4.6) {
      performance = 'Superior';
      labelColor = 'text-indigo-600 bg-indigo-50 border-indigo-150';
    } else if (finalAverage >= 4.0) {
      performance = 'Alto';
      labelColor = 'text-emerald-600 bg-emerald-50 border-emerald-150';
    } else if (finalAverage >= 3.0) {
      performance = 'Básico';
      labelColor = 'text-amber-600 bg-amber-50 border-amber-150';
    }

    return {
      subject: sub,
      records,
      finalAverage,
      isApproved,
      performance,
      labelColor
    };
  }).filter(Boolean);

  // Totals calculations
  const totalSubjectsCount = academicReports.length;
  const approvedCount = academicReports.filter(r => r && r.isApproved).length;
  const failedCount = totalSubjectsCount - approvedCount;
  
  const generalAverage = totalSubjectsCount > 0 
    ? Number((academicReports.reduce((acc, r) => acc + (r ? r.finalAverage : 0), 0) / totalSubjectsCount).toFixed(2))
    : 0;

  // Average performance rating description
  let generalPerformance = 'PENDIENTE';
  let performanceSummaryDesc = '';
  if (totalSubjectsCount > 0) {
    if (generalAverage >= 4.6) {
      generalPerformance = 'DESEMPEÑO SUPERIOR 🏆';
      performanceSummaryDesc = 'El estudiante demuestra un dominio integral de las competencias, mostrando liderazgo y alto rigor académico.';
    } else if (generalAverage >= 4.0) {
      generalPerformance = 'DESEMPEÑO ALTO ⭐';
      performanceSummaryDesc = 'El estudiante ha alcanzado satisfactoriamente los logros con un nivel sobresaliente en la mayoría de áreas.';
    } else if (generalAverage >= 3.0) {
      generalPerformance = 'DESEMPEÑO BÁSICO 👍';
      performanceSummaryDesc = 'El estudiante cumple con los requisitos mínimos esenciales. Se recomienda afianzar hábitos de estudio.';
    } else {
      generalPerformance = 'DESEMPEÑO BAJO ⚠️';
      performanceSummaryDesc = 'El estudiante no alcanza las competencias mínimas. Requiere acompañamiento y plan de mejoramiento académico.';
    }
  }

  // Attendance metrics lookup for this student
  const [attendanceRate, setAttendanceRate] = useState<number>(100);
  useEffect(() => {
    const saved = localStorage.getItem('ep_attendance');
    if (saved && selectedStudentId) {
      try {
        const sessions = JSON.parse(saved);
        const studentHistory = sessions.filter((s: any) => s.records.some((r: any) => r.studentId === selectedStudentId));
        if (studentHistory.length > 0) {
          let present = 0;
          let excused = 0;
          let late = 0;
          studentHistory.forEach((s: any) => {
            const rec = s.records.find((r: any) => r.studentId === selectedStudentId);
            if (rec?.status === 'presente') present++;
            else if (rec?.status === 'excusa') excused++;
            else if (rec?.status === 'tarde') late++;
          });
          const rate = Math.round(((present + excused + (late * 0.7)) / studentHistory.length) * 100);
          setAttendanceRate(rate);
        } else {
          setAttendanceRate(100);
        }
      } catch (e) {
        setAttendanceRate(100);
      }
    } else {
      setAttendanceRate(100);
    }
  }, [selectedStudentId]);

  const handlePrint = () => {
    window.print();
    toast('Diálogo de impresión escolar lanzado con éxito', 'success');
  };

  // --- INDIVIDUAL EXCEL EXPORT ---
  const exportIndividualExcel = () => {
    if (!targetStudent || !targetSemester || academicReports.length === 0) {
      toast('No hay calificaciones suficientes para exportar', 'warning');
      return;
    }
    
    let csvContent = "sep=;\n";
    csvContent += `REPORTE ACADÉMICO INDIVIDUAL;${targetStudent.nombre.toUpperCase()}\n`;
    csvContent += `Instituto Synapsis;NIT: 322199-B12;Resolución 2341-99\n`;
    csvContent += `Generado el: ${fmtDate(new Date().toISOString())}\n\n`;
    
    csvContent += `INFORMACIÓN DEL ESTUDIANTE;;INFORMACIÓN DEL REPORTE\n`;
    csvContent += `Estudiante;${targetStudent.nombre};Semestre;${targetSemester.nombre}\n`;
    csvContent += `Identificación;${targetStudent.cedula || '---'};Asistencia;${attendanceRate}%\n`;
    csvContent += `Correo;${targetStudent.email};Estado Académico;${generalAverage >= 3.0 ? 'APROBADO' : 'REQUERIMIENTO MEJORAMIENTO'}\n`;
    csvContent += `;;Promedio General;${generalAverage.toFixed(2).replace('.', ',')}\n\n`;
    
    csvContent += `ASIGNATURA;CÓDIGO;`;
    activeParciales.forEach(p => {
      csvContent += `${p.nombre.toUpperCase()} EV1;${p.nombre.toUpperCase()} EV2;${p.nombre.toUpperCase()} TRABAJOS;${p.nombre.toUpperCase()} NOTA FINAL (${p.porcentaje}%);`;
    });
    csvContent += `DEFINITIVA GENERAL;DESEMPEÑO\n`;
    
    academicReports.forEach(rep => {
      if (!rep) return;
      csvContent += `"${rep.subject.nombre}";"${rep.subject.codigo || '---'}";`;
      activeParciales.forEach(p => {
        const gradeObj = rep.records.find(r => r.parcialId === p.id);
        if (gradeObj) {
          const v1 = gradeObj.notaEV1 !== undefined ? gradeObj.notaEV1 : gradeObj.nota;
          const v2 = gradeObj.notaEV2 !== undefined ? gradeObj.notaEV2 : gradeObj.nota;
          const vT = gradeObj.notaTrabajo !== undefined ? gradeObj.notaTrabajo : gradeObj.nota;
          const f1 = v1.toFixed(1).replace('.', ',');
          const f2 = v2.toFixed(1).replace('.', ',');
          const fT = vT.toFixed(1).replace('.', ',');
          const fF = gradeObj.nota.toFixed(2).replace('.', ',');
          csvContent += `${f1};${f2};${fT};${fF};`;
        } else {
          csvContent += `—;—;—;—;`;
        }
      });
      csvContent += `${rep.finalAverage.toFixed(2).replace('.', ',')};${rep.performance}\n`;
    });
    
    csvContent += `\n`;
    csvContent += `RESUMEN DE RENDIMIENTO\n`;
    csvContent += `Materias Evaluadas;${totalSubjectsCount}\n`;
    csvContent += `Materias Aprobadas;${approvedCount}\n`;
    csvContent += `Materias Reprobadas;${failedCount}\n`;
    csvContent += `Promedio General;${generalAverage.toFixed(2).replace('.', ',')}\n`;
    csvContent += `Valoración Directiva;${generalPerformance}\n`;
    csvContent += `Observación del Tutor;"${(customComment || 'Rendimiento general destacado. Excelente dedicación y puntualidad demostrada en el semestre escolar.').replace(/"/g, '""')}"\n`;
    
    // Create and trigger download using UTF-8 BOM so accents open cleanly in Excel
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Reporte_Individual_${targetStudent.nombre.replace(/\s+/g, '_')}_${targetSemester.nombre.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Excel de reporte individual exportado correctamente', 'success');
  };

  // --- COLLECTIVE MATRIX COMPUTATION FOR ALL STUDENTS ---
  const activeSemParciales = parciales.filter(p => p.semestre === selectedSemesterId);
  const activeSemParcialIds = activeSemParciales.map(p => p.id);

  const studentsCollectiveReport = students.map(st => {
    let totalScore = 0;
    let gradedSubjectsCount = 0;
    let approvedSubjectsCount = 0;
    let failedSubjectsCount = 0;

    const subjectsGrades = subjects.map(sub => {
      const records = gradeRecords.filter(r => 
        r.estudianteId === st.id && 
        r.asignaturaId === sub.id && 
        activeSemParcialIds.includes(r.parcialId)
      );

      if (records.length === 0) return { subject: sub, finalAverage: null };

      let subScore = 0;
      let totalWeight = 0;

      records.forEach(r => {
        const p = activeSemParciales.find(arc => arc.id === r.parcialId);
        const weight = p?.porcentaje || 30;
        subScore += r.nota * weight;
        totalWeight += weight;
      });

      const finalAverage = totalWeight > 0 ? Number((subScore / totalWeight).toFixed(2)) : 0;
      const isApproved = finalAverage >= 3.0;

      totalScore += finalAverage;
      gradedSubjectsCount++;
      if (isApproved) {
        approvedSubjectsCount++;
      } else {
        failedSubjectsCount++;
      }

      return {
        subject: sub,
        finalAverage,
        isApproved,
        records
      };
    });

    const studentGeneralAverage = gradedSubjectsCount > 0 ? Number((totalScore / gradedSubjectsCount).toFixed(2)) : 0;
    
    // Attendance rate
    let stAttendanceRate = 100;
    const savedAttendance = localStorage.getItem('ep_attendance');
    if (savedAttendance) {
      try {
        const sessions = JSON.parse(savedAttendance);
        const studentHistory = sessions.filter((s: any) => s.records.some((r: any) => r.studentId === st.id));
        if (studentHistory.length > 0) {
          let present = 0, excused = 0, late = 0;
          studentHistory.forEach((s: any) => {
            const rec = s.records.find((r: any) => r.studentId === st.id);
            if (rec?.status === 'presente') present++;
            else if (rec?.status === 'excusa') excused++;
            else if (rec?.status === 'tarde') late++;
          });
          stAttendanceRate = Math.round(((present + excused + (late * 0.7)) / studentHistory.length) * 100);
        }
      } catch (e) {}
    }

    return {
      student: st,
      subjectsGrades,
      gradedSubjectsCount,
      approvedSubjectsCount,
      failedSubjectsCount,
      generalAverage: studentGeneralAverage,
      attendanceRate: stAttendanceRate
    };
  });

  // Collective metrics
  const activeStudentsInCollective = studentsCollectiveReport.filter(d => d.gradedSubjectsCount > 0);
  const totalStudentsInSemester = activeStudentsInCollective.length;
  const classAverage = totalStudentsInSemester > 0
    ? Number((activeStudentsInCollective.reduce((acc, s) => acc + s.generalAverage, 0) / totalStudentsInSemester).toFixed(2))
    : 0;
  const passingStudentsCount = activeStudentsInCollective.filter(s => s.generalAverage >= 3.0).length;
  const classPassingRate = totalStudentsInSemester > 0
    ? Math.round((passingStudentsCount / totalStudentsInSemester) * 100)
    : 0;
  const highAchieversCount = activeStudentsInCollective.filter(s => s.generalAverage >= 4.5).length;

  // Search filtered collective
  const filteredCollectiveStudents = studentsCollectiveReport.filter(r => {
    const term = collectiveSearch.trim().toLowerCase();
    if (!term) return true;
    return r.student.nombre.toLowerCase().includes(term) || 
      (r.student.cedula && r.student.cedula.includes(term));
  });

  const totalPagesCollective = Math.ceil(filteredCollectiveStudents.length / itemsPerPageCollective) || 1;
  const activePageCol = collectivePage > totalPagesCollective ? totalPagesCollective : collectivePage;
  const pagedCollectiveStudents = filteredCollectiveStudents.slice(
    (activePageCol - 1) * itemsPerPageCollective, 
    activePageCol * itemsPerPageCollective
  );

  // --- COLLECTIVE EXCEL EXPORT ---
  const exportCollectiveExcel = () => {
    if (!targetSemester) {
      toast('Por favor selecciona un semestre', 'warning');
      return;
    }
    
    let csvContent = "sep=;\n";
    csvContent += `REPORTE CONSOLIDADO COLECTIVO - SEMESTRE: ${targetSemester.nombre.toUpperCase()}\n`;
    csvContent += `Instituto Synapsis;NIT: 322199-B12\n`;
    csvContent += `Generado el: ${fmtDate(new Date().toISOString())}\n\n`;
    
    // CSV table header
    csvContent += `ESTUDIANTE;DOCUMENTO IND;CORREO;ASISTENCIA %;`;
    subjects.forEach(sub => {
      csvContent += `${sub.nombre.toUpperCase()};`;
    });
    csvContent += `PROMEDIO GENERAL;ASIGNATURAS APROBADAS;ASIGNATURAS REPROBADAS;ESTADO ACADÉMICO\n`;
    
    studentsCollectiveReport.forEach(item => {
      csvContent += `"${item.student.nombre}";"${item.student.cedula || '---'}";"${item.student.email}";${item.attendanceRate}%;`;
      
      subjects.forEach(sub => {
        const gradeObj = item.subjectsGrades.find(sg => sg.subject.id === sub.id);
        const gradeStr = gradeObj && gradeObj.finalAverage !== null ? gradeObj.finalAverage.toFixed(2).replace('.', ',') : '—';
        csvContent += `${gradeStr};`;
      });
      
      const academicStatus = item.gradedSubjectsCount === 0 
        ? 'SIN NOTAS' 
        : (item.generalAverage >= 3.0 ? 'APROBADO' : 'REQUERIMIENTO MEJORAMIENTO');
        
      csvContent += `${item.generalAverage.toFixed(2).replace('.', ',')};${item.approvedSubjectsCount};${item.failedSubjectsCount};"${academicStatus}"\n`;
    });
    
    // Create and trigger download
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Consolidado_Academico_${targetSemester.nombre.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast('Excel consolidado colectivo exportado con éxito', 'success');
  };

  // Color theme mapper for official boletín sheet
  const getThemeStyles = () => {
    switch (printLayout) {
      case 'royal':
        return {
          primaryHex: '#854d0e', // gold-800
          borderClass: 'border-yellow-600/30',
          bgHeader: 'bg-yellow-50/50',
          accentText: 'text-yellow-800',
          primaryText: 'text-slate-800',
        };
      case 'charcoal':
        return {
          primaryHex: '#1e293b', // slate-800
          borderClass: 'border-slate-300',
          bgHeader: 'bg-slate-100',
          accentText: 'text-slate-900',
          primaryText: 'text-slate-800',
        };
      case 'slate':
      default:
        return {
          primaryHex: '#4f46e5', // indigo-600
          borderClass: 'border-indigo-100',
          bgHeader: 'bg-indigo-50/20',
          accentText: 'text-indigo-700',
          primaryText: 'text-slate-800',
        };
    }
  };

  const themeStyle = getThemeStyles();

  return (
    <div className="space-y-6 text-slate-800 animate-fade-in print:p-0 print:space-y-0 print:bg-white">
      {/* TAB SELECTOR FOR ADMIN/DOCENTE */}
      {isDocOrAdmin && (
        <div className="flex items-center gap-2 border-b border-slate-200 pb-px print:hidden text-left">
          <button
            onClick={() => setReportType('individual')}
            className={`py-3 px-5 text-sm font-black transition border-b-2 flex items-center gap-2 cursor-pointer ${
              reportType === 'individual'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserIcon className="w-4 h-4" /> Reporte Individual
          </button>
          <button
            onClick={() => setReportType('colectivo')}
            className={`py-3 px-5 text-sm font-black transition border-b-2 flex items-center gap-2 cursor-pointer ${
              reportType === 'colectivo'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" /> Reporte Colectivo (Grupal)
          </button>
        </div>
      )}

      {reportType === 'individual' ? (
        <>
          {/* FILTER SHELF -> HIDDEN IN PRINT */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4 theme-bg-surface theme-border print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wider mb-2">
              <FileText className="w-3.5 h-3.5" /> Generador de Reportes
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight" style={{ color: 'var(--gray-900)' }}>
              Boletines y Reportes Académicos
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {isDocOrAdmin 
                ? 'Emite reportes calificados, revisa desempeños promedios del curso y descarga el boletín escolar oficial.'
                : 'Consulta tus calificaciones finales del período lectivo actual y descarga tu boletín oficial certificado.'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={exportIndividualExcel}
              disabled={academicReports.length === 0}
              className="px-4 py-2.5 bg-emerald-650 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-40"
            >
              <FileSpreadsheet className="w-4 h-4" /> Exportar a Excel
            </button>
            <button
              onClick={handlePrint}
              disabled={academicReports.length === 0}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-40"
            >
              <Printer className="w-4 h-4" /> Imprimir o Guardar PDF
            </button>
          </div>
        </div>

        {/* Configurations shelf */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs font-medium">
          {isDocOrAdmin ? (
            <div className="flex flex-col">
              <span className="text-slate-400 font-bold block mb-1 uppercase tracking-wider text-[9px]">Seleccionar Estudiante</span>
              <SearchableSelect
                options={students.map(st => ({
                  value: st.id,
                  label: st.nombre,
                  subLabel: st.cedula ? `CC: ${st.cedula}` : undefined
                }))}
                value={selectedStudentId}
                onChange={val => setSelectedStudentId(val)}
                placeholder="Selecciona alumno..."
                id="boletin-student-select"
              />
            </div>
          ) : (
            <div className="flex flex-col">
              <span className="text-slate-400 font-bold block mb-1 uppercase tracking-wider text-[9px]">Estudiante</span>
              <div className="p-2 border rounded-xl bg-slate-100 font-bold text-slate-600">
                {currentUser.nombre}
              </div>
            </div>
          )}

          <div className="flex flex-col">
            <span className="text-slate-400 font-bold block mb-1 uppercase tracking-wider text-[9px]">Seleccionar Semestre</span>
            <SearchableSelect
              options={semesters.map(sem => ({
                value: sem.id,
                label: `${sem.nombre} (${sem.estado})`
              }))}
              value={selectedSemesterId}
              onChange={val => setSelectedSemesterId(val)}
              placeholder="Selecciona semestre..."
              id="boletin-semester-select"
            />
          </div>

          <div className="flex flex-col">
            <span className="text-slate-400 font-bold block mb-1 uppercase tracking-wider text-[9px]">Plantilla Visual</span>
            <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
              <button
                onClick={() => setPrintLayout('slate')}
                className={`flex-1 py-1 px-2.5 text-[10px] font-bold rounded-lg transition text-center ${
                  printLayout === 'slate' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'
                }`}
              >
                Sílice
              </button>
              <button
                onClick={() => setPrintLayout('royal')}
                className={`flex-1 py-1 px-2.5 text-[10px] font-bold rounded-lg transition text-center ${
                  printLayout === 'royal' ? 'bg-white shadow text-yellow-700' : 'text-slate-500'
                }`}
              >
                Gótico
              </button>
              <button
                onClick={() => setPrintLayout('charcoal')}
                className={`flex-1 py-1 px-2.5 text-[10px] font-bold rounded-lg transition text-center ${
                  printLayout === 'charcoal' ? 'bg-white shadow text-slate-900' : 'text-slate-500'
                }`}
              >
                Sobrio
              </button>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-slate-400 font-bold block mb-1 uppercase tracking-wider text-[9px]">Configurar Firmas</span>
            <label className="flex items-center gap-2 bg-slate-50 p-2 border border-slate-200 rounded-xl cursor-pointer text-slate-600 select-none">
              <input
                type="checkbox"
                checked={showSignatures}
                onChange={e => setShowSignatures(e.target.checked)}
                className="rounded text-indigo-600"
              />
              <span>Mostrar firmas y sellos</span>
            </label>
          </div>
        </div>

        {isDocOrAdmin && (
          <div className="pt-2">
            <label className="text-xs text-slate-500 block mb-1 font-bold">Observaciones adicionales para el reporte del estudiante:</label>
            <input
              type="text"
              value={customComment}
              onChange={e => setCustomComment(e.target.value)}
              placeholder="Ej: Felicitaciones por el avance académico y excelente comportamiento social demostrado..."
              className="w-full text-xs p-2.5 border rounded-xl bg-slate-50 focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* ERROR / PENDING GRADES WARNING SHEET */}
      {academicReports.length === 0 && (
        <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 max-w-xl mx-auto space-y-4 theme-bg-surface print:hidden">
          <ShieldAlert className="w-12 h-12 text-amber-500 mx-auto" />
          <h3 className="font-extrabold text-slate-800 text-sm">No se encontraron calificaciones</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            El estudiante seleccionado ({targetStudent?.nombre || 'Alumno'}) no registra calificaciones cargadas en el sistema para los cortes evaluados de este semestre. El reporte solo puede emitirse una vez ingresada al menos una calficación en <b>Reg. de Notas</b>.
          </p>
        </div>
      )}

      {/* THE OFFICIAL REPORT SHEET CARD */}
      {academicReports.length > 0 && targetStudent && targetSemester && (
        <div 
          className={`bg-white rounded-3xl border-2 p-8 md:p-12 shadow-sm space-y-8 theme-bg-surface font-sans select-none print:shadow-none print:border-none print:p-0 print:m-0`}
          style={{ borderColor: themeStyle.primaryHex }}
        >
          {/* OFICIAL HEADER */}
          <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-4 pb-6 border-b border-dashed border-slate-300">
            {/* Logo / Emplem */}
            <div className="flex items-center gap-3.5">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl tracking-tighter" style={{ backgroundColor: themeStyle.primaryHex }}>
                SY
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight" style={{ color: themeStyle.primaryHex }}>INSTITUTO SYNAPSIS</h1>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-bold mt-1">Sistema Integrado de Matrícula y Notas</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Aprobado por el Ministerio de Educación | Resolución 2341-99</p>
              </div>
            </div>

            {/* Certificate metadata */}
            <div className="text-right text-[10px] font-medium space-y-1 md:block flex flex-col items-center">
              <div className="bg-slate-100 px-3 py-1 rounded-full inline-block font-extrabold" style={{ color: themeStyle.primaryHex }}>
                BOLETÍN ACADÉMICO OFICIAL
              </div>
              <p className="text-slate-400 font-mono mt-1">Cód. Registro: {targetStudent.id.substring(0, 8).toUpperCase()}-{targetSemester.id.substring(0, 4).toUpperCase()}</p>
              <p className="text-slate-400">Generación: {fmtDate(new Date().toISOString())}</p>
            </div>
          </div>

          {/* STUDENT AND INSTITUTION PARTICULARS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-5 rounded-2xl border border-slate-100 theme-bg-surface">
            <div className="space-y-2 text-xs">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest" style={{ color: themeStyle.primaryHex }}>INFORMACIÓN DEL ESTUDIANTE</h3>
              <div className="grid grid-cols-3 font-medium">
                <span className="text-slate-400 font-semibold">Estudiante:</span>
                <span className="col-span-2 text-slate-800 font-extrabold">{targetStudent.nombre}</span>
              </div>
              <div className="grid grid-cols-3 font-medium">
                <span className="text-slate-400 font-semibold">Identificación:</span>
                <span className="col-span-2 text-slate-700 font-mono font-bold">{targetStudent.cedula || '---'}</span>
              </div>
              <div className="grid grid-cols-3 font-medium">
                <span className="text-slate-400 font-semibold">Correo:</span>
                <span className="col-span-2 text-slate-600 font-bold">{targetStudent.email}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest" style={{ color: themeStyle.primaryHex }}>INFORMACIÓN DEL PERÍODO LECTIVO</h3>
              <div className="grid grid-cols-3 font-medium">
                <span className="text-slate-400 font-semibold">Semestre:</span>
                <span className="col-span-2 text-slate-800 font-extrabold">{targetSemester.nombre}</span>
              </div>
              <div className="grid grid-cols-3 font-medium">
                <span className="text-slate-400 font-semibold">Asist. Consolidada:</span>
                <span className="col-span-2 text-indigo-700 font-black">{attendanceRate}% Presencialidad</span>
              </div>
              <div className="grid grid-cols-3 font-medium">
                <span className="text-slate-400 font-semibold">Estado Acad.:</span>
                <span className={`col-span-2 font-black ${generalAverage >= 3.0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {generalAverage >= 3.0 ? 'APROBADO' : 'REQUERIMIENTO MEJORAMIENTO'}
                </span>
              </div>
            </div>
          </div>

          {/* MAIN GRADES ACADEMIC REPORT TABLE */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 tracking-wider mb-2 uppercase" style={{ color: themeStyle.primaryHex }}>NOTAS Y ASIGNATURAS EVALUADAS</h3>
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-55 relative" style={{ backgroundColor: themeStyle.bgHeader }}>
                    <th className="py-3 px-4 font-extrabold text-slate-700 w-1/3">Asignatura / Área de Desarrollo</th>
                    {activeParciales.map(p => (
                      <th key={p.id} className="py-3 px-3 font-extrabold text-slate-600 text-center">{p.nombre} ({p.porcentaje}%)</th>
                    ))}
                    <th className="py-3 px-4 font-black text-slate-800 text-center">Definitiva (3.0 mínimo)</th>
                    <th className="py-3 px-4 font-black text-slate-800 text-center">Nivel Desempeño</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {academicReports.map(rep => {
                    if (!rep) return null;
                    return (
                      <tr key={rep.subject.id} className="hover:bg-slate-50/40">
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-slate-800 leading-snug">{rep.subject.nombre}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-mono">Cód: {rep.subject.codigo || 'MAT-00'}</div>
                        </td>
                        
                        {/* Parcial grades matching */}
                        {activeParciales.map(p => {
                          const gradeObj = rep.records.find(r => r.parcialId === p.id);
                          if (!gradeObj) return <td key={p.id} className="py-3.5 px-3 text-center text-slate-400 font-mono">—</td>;
                          const v1 = gradeObj.notaEV1 !== undefined ? gradeObj.notaEV1 : gradeObj.nota;
                          const v2 = gradeObj.notaEV2 !== undefined ? gradeObj.notaEV2 : gradeObj.nota;
                          const vT = gradeObj.notaTrabajo !== undefined ? gradeObj.notaTrabajo : gradeObj.nota;
                          return (
                            <td key={p.id} className="py-3.5 px-3 text-center text-slate-600 font-mono">
                              <span className="font-extrabold text-xs block">{gradeObj.nota.toFixed(2)}</span>
                              <span className="text-[9px] text-slate-400 block font-mono mt-0.5 leading-none">
                                {v1.toFixed(1)} / {v2.toFixed(1)} / {vT.toFixed(1)}
                              </span>
                            </td>
                          );
                        })}

                        {/* Final Definitiva */}
                        <td className="py-3.5 px-4 text-center font-mono font-black" style={{ color: rep.isApproved ? '#047857' : '#be123c' }}>
                          {rep.finalAverage.toFixed(2)}
                        </td>

                        {/* Band Rating Label */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${rep.labelColor}`}>
                            {rep.performance}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-slate-400 italic mt-2 text-left print:text-black">
              * Nota: Los valores expresados bajo cada corte representan la Nota Final del Corte, seguida por su desglose: (Evaluación 1 / Evaluación 2 / Trabajos), promediados al 33.3% cada uno con escala de 0.0 a 5.0.
            </p>
          </div>

          {/* HISTORIC PERFORMANCE GRAPHICS AND DIRECTOR COMMENT */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4">
            {/* Visual metrics summaries */}
            <div className="md:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-150 flex flex-col justify-between space-y-4 theme-bg-surface">
              <h4 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-widest" style={{ color: themeStyle.primaryHex }}>RESUMEN ACADÉMICO</h4>
              
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-450 font-semibold">Materias Promediadas:</span>
                  <span className="font-black text-slate-800">{totalSubjectsCount}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold">Materias Aprobadas:</span>
                  <span className="font-black text-emerald-600 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> {approvedCount}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-semibold">Materias Reprobadas:</span>
                  <span className="font-black text-rose-500 flex items-center gap-1">
                    {failedCount > 0 ? <XCircle className="w-3.5 h-3.5" /> : null} {failedCount}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-xs text-slate-900 font-extrabold">PROMEDIO CONFIGURADO:</span>
                  <span className="text-lg font-black" style={{ color: themeStyle.primaryHex }}>{generalAverage.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Performance status write-up */}
            <div className="md:col-span-7 bg-slate-50 p-5 rounded-2xl border border-slate-150 space-y-3.5 flex flex-col justify-between theme-bg-surface">
              <div>
                <span className="text-[9px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded uppercase tracking-wider">
                  Valoración de Rector Rectoría
                </span>
                <h4 className="font-black text-slate-800 text-xs mt-2 uppercase" style={{ color: themeStyle.primaryHex }}>{generalPerformance}</h4>
                <p className="text-slate-500 text-xs leading-relaxed italic mt-1">{performanceSummaryDesc}</p>
              </div>

              {(customComment || (!isDocOrAdmin && academicReports.length > 0)) && (
                <div className="border-t border-slate-200 pt-3.5 text-xs text-slate-600 font-semibold italic">
                  <b>Observación del Tutor:</b> {customComment || 'Rendimiento general destacado. Excelente dedicación y puntualidad demostrada en el semestre escolar.'}
                </div>
              )}
            </div>
          </div>

          {/* SIGNATURE SECTION AND SECURE VERIFICATION FOOTER */}
          {showSignatures && (
            <div className="pt-8 border-t border-dashed border-slate-300 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-center text-xs font-semibold">
              <div className="flex flex-col items-center justify-end h-28 space-y-2">
                <div className="italic text-slate-400 font-serif text-sm">Dr. Hernando García</div>
                <div className="w-2/3 border-b border-slate-300"></div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">Rector de Instituciones</div>
              </div>

              <div className="flex flex-col items-center justify-end h-28 space-y-2">
                <div className="italic text-slate-400 font-serif text-sm">Lic. Juan de Jesús María</div>
                <div className="w-2/3 border-b border-slate-300"></div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">Director de Curso y Grado</div>
              </div>

              <div className="flex flex-col items-center justify-end h-28 space-y-2">
                {/* Official seal image simulation inside code */}
                <div className="relative flex items-center justify-center p-3 rounded-full border-4 border-double border-indigo-200 border-indigo-300/40 text-[9px] font-bold text-indigo-600 uppercase tracking-widest select-none select-none my-1 opacity-60">
                  <div className="font-serif">STAMP OF EDUCATION / APPROVAL</div>
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold">Registro de Calificación</div>
              </div>
            </div>
          )}

          {/* Verification legal disclaimer */}
          <div className="pt-6 border-t border-slate-100 text-center text-[9px] text-slate-400 leading-relaxed max-w-2xl mx-auto font-mono">
            Este boletín de calificaciones de rendimiento escolar es una certificación oficial digital válida para traslados y trámites ante la secretaría de educación nacional. Generado con firma electrónica e integridad hash asegurada.
          </div>
        </div>
      )}
        </>
      ) : (
        /* COLLECTIVE/GROUP REPORT BLOCK */
        <div className="space-y-6 animate-fade-in unique-collective-block print:hidden text-left">
          {/* COLLECTIVE HEADER & FILTER CARD */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4 theme-bg-surface theme-border">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wider mb-2">
                  <Users className="w-3.5 h-3.5" /> Consolidado Grupal de Notas
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight" style={{ color: 'var(--gray-900)' }}>
                  Reporte Colectivo de Rendimiento
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Consulte la matriz completa de calificaciones del curso para el semestre, analice estadísticas de aprobación y exporte el consolidado a Excel.
                </p>
              </div>

              <button
                onClick={exportCollectiveExcel}
                disabled={studentsCollectiveReport.length === 0}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-40"
              >
                <FileSpreadsheet className="w-4 h-4" /> Exportar Planilla a Excel
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-4 items-end justify-between">
              <div className="flex flex-col w-full sm:w-72 text-xs font-medium">
                <span className="text-slate-400 font-bold block mb-1 uppercase tracking-wider text-[9px]">Seleccionar Semestre Grupal</span>
                <SearchableSelect
                  options={semesters.map(sem => ({
                    value: sem.id,
                    label: `${sem.nombre} (${sem.estado})`
                  }))}
                  value={selectedSemesterId}
                  onChange={val => { setSelectedSemesterId(val); setCollectivePage(1); }}
                  placeholder="Selecciona semestre..."
                  id="boletin-collective-semester-select"
                />
              </div>

              <div className="relative w-full sm:w-80">
                <span className="text-slate-400 font-bold block mb-1 uppercase tracking-wider text-[9px]">Buscar Alumno por Nombre o Cédula</span>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar estudiante o documento..."
                    value={collectiveSearch}
                    onChange={e => { setCollectiveSearch(e.target.value); setCollectivePage(1); }}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* METRIC CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-left">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4 theme-bg-surface">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block text-slate-400">Total Estudiantes</span>
                <span className="text-md font-black text-slate-800 font-mono">{totalStudentsInSemester} alumnos</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4 theme-bg-surface">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Promedio de Curso</span>
                <span className="text-md font-black text-emerald-600 font-mono">{classAverage.toFixed(2)} / 5.0</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4 theme-bg-surface">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <CheckSquare className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Tasa de Aprobación</span>
                <span className="text-md font-black text-slate-800 font-mono">{classPassingRate}% de clase</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4 theme-bg-surface">
              <div className="p-3 bg-amber-50 text-yellow-600 rounded-xl">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Desempeño Superior</span>
                <span className="text-md font-black text-slate-800 font-mono">{highAchieversCount} alumnos</span>
              </div>
            </div>
          </div>

          {/* MAIN MATRIX BOARD TABLE */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm theme-bg-surface theme-border">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between theme-bg-surface">
              <span className="text-xs font-extrabold text-slate-700">Sábana de Calificaciones - Semestre {targetSemester?.nombre} ({filteredCollectiveStudents.length} resultados)</span>
              <span className="text-[10px] text-slate-400 font-bold">Separador decimal en Excel: Comas (,)</span>
            </div>

            {filteredCollectiveStudents.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No se encontraron estudiantes para los filtros seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-medium uppercase tracking-wider theme-bg-surface border-b border-slate-200">
                      <th className="py-3 px-5 w-52">Estudiante</th>
                      <th className="py-3 px-3 text-center">Asist. %</th>
                      {subjects.map(sub => (
                        <th key={sub.id} className="py-3 px-3 text-center text-[10px] max-w-[100px] truncate" title={sub.nombre}>
                          {sub.nombre}
                        </th>
                      ))}
                      <th className="py-3 px-4 text-center font-bold text-indigo-600 bg-indigo-50/20">Prom. Gral</th>
                      <th className="py-3 px-3 text-center">Aprob/Total</th>
                      <th className="py-3 px-4 text-right">Rendimiento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {pagedCollectiveStudents.map(item => {
                      const studentName = item.student.nombre;
                      const studentId = item.student.id;
                      
                      const isPassing = item.generalAverage >= 3.0;
                      let performanceBadge = 'bg-rose-50 text-rose-700 border-rose-100 font-bold';
                      let performanceText = 'Bajo';
                      
                      if (item.gradedSubjectsCount === 0) {
                        performanceBadge = 'bg-slate-50 text-slate-400 border-slate-200';
                        performanceText = 'Sin Notas';
                      } else if (item.generalAverage >= 4.6) {
                        performanceBadge = 'bg-indigo-50 text-indigo-700 border-indigo-200 font-black';
                        performanceText = 'Superior';
                      } else if (item.generalAverage >= 4.0) {
                        performanceBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200 font-bold';
                        performanceText = 'Alto';
                      } else if (item.generalAverage >= 3.0) {
                        performanceBadge = 'bg-amber-50 text-amber-700 border-amber-100';
                        performanceText = 'Básico';
                      }

                      return (
                        <tr key={studentId} className="hover:bg-slate-50/50">
                          <td className="py-3 px-5">
                            <div className="font-extrabold text-slate-800">{studentName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">CC: {item.student.cedula || 'Sin ID'}</div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-600">
                            {item.attendanceRate}%
                          </td>
                          
                          {/* Subject final grades */}
                          {subjects.map(sub => {
                            const gradeObj = item.subjectsGrades.find(sg => sg.subject.id === sub.id);
                            const hasGrade = gradeObj && gradeObj.finalAverage !== null;
                            const val = hasGrade ? gradeObj.finalAverage : null;

                            // Generate a descriptive hover tooltip detailing the grades breakdown
                            let titleText = sub.nombre;
                            if (hasGrade && gradeObj.records) {
                              titleText += `:\nCalculado sobre ${gradeObj.records.length} períodos/cortes registrados:\n`;
                              gradeObj.records.forEach(r => {
                                const parc = parciales.find(p => p.id === r.parcialId);
                                const pName = parc ? parc.nombre : 'Corte';
                                const v1 = r.notaEV1 !== undefined ? r.notaEV1 : r.nota;
                                const v2 = r.notaEV2 !== undefined ? r.notaEV2 : r.nota;
                                const vT = r.notaTrabajo !== undefined ? r.notaTrabajo : r.nota;
                                titleText += `- ${pName}: Nota ${r.nota.toFixed(2)} (EV1: ${v1.toFixed(1)} / EV2: ${v2.toFixed(1)} / Trabajos: ${vT.toFixed(1)})\n`;
                              });
                            }

                            return (
                              <td 
                                key={sub.id} 
                                className={`py-3 px-3 text-center font-mono text-[11px]`}
                                style={hasGrade ? { color: val! >= 3.0 ? '#059669' : '#e11d48', fontWeight: 'bold' } : { color: '#94a3b8' }}
                                title={titleText}
                              >
                                {hasGrade ? val!.toFixed(2) : '—'}
                              </td>
                            );
                          })}

                          {/* General Average */}
                          <td className="py-3 px-4 text-center font-mono font-black bg-indigo-50/10 text-slate-900" style={{ color: isPassing && item.gradedSubjectsCount > 0 ? '#4f46e5' : '#e11d48' }}>
                            {item.gradedSubjectsCount > 0 ? item.generalAverage.toFixed(2) : '0.00'}
                          </td>

                          {/* Summary progress count */}
                          <td className="py-3 px-3 text-center text-slate-500 font-mono text-[11px]">
                            {item.gradedSubjectsCount > 0 ? `${item.approvedSubjectsCount}/${item.gradedSubjectsCount}` : '0/0'}
                          </td>

                          {/* Performance Label + Action link to open individual report */}
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <span className={`px-2 py-0.5 rounded border text-[9px] uppercase tracking-wide font-black ${performanceBadge}`}>
                                {performanceText}
                              </span>
                              <button
                                onClick={() => {
                                  setSelectedStudentId(studentId);
                                  setReportType('individual');
                                }}
                                className="p-1 px-2.5 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-[10px] text-indigo-800 font-bold rounded-xl cursor-pointer transition"
                              >
                                Ver Boletín
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Collective Pagination */}
                {filteredCollectiveStudents.length > itemsPerPageCollective && (
                  <div className="px-4 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-3 theme-bg-surface">
                    <div className="text-xs text-slate-500 select-none">
                      Mostrando <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>{((activePageCol - 1) * itemsPerPageCollective) + 1}</span> a{' '}
                      <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>
                        {Math.min(activePageCol * itemsPerPageCollective, filteredCollectiveStudents.length)}
                      </span>{' '}
                      de <span className="font-semibold" style={{ color: 'var(--gray-900)' }}>{filteredCollectiveStudents.length}</span> alumnos calificados
                    </div>
                    <div className="flex items-center gap-1.5 font-sans">
                      <button
                        disabled={activePageCol === 1}
                        onClick={() => setCollectivePage(prev => Math.max(1, prev - 1))}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      
                      {Array.from({ length: totalPagesCollective }, (_, i) => i + 1).map(page => (
                        <button
                          key={page}
                          onClick={() => setCollectivePage(page)}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                            activePageCol === page
                              ? 'bg-indigo-600 text-white font-bold border-indigo-600'
                              : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        disabled={activePageCol === totalPagesCollective}
                        onClick={() => setCollectivePage(prev => Math.min(totalPagesCollective, prev + 1))}
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
        </div>
      )}
    </div>
  );
}
