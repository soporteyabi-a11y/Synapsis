/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface User {
  id: string;
  nombre: string;
  email: string;
  pass: string;
  rol: 'admin' | 'docente' | 'estudiante';
  creado: string;
  cedula?: string;
  celular?: string;
  asignaturas?: string[];
  semestre?: string;
  codigo?: string;
}

export interface Subject {
  id: string;
  nombre: string;
  creado: string;
  codigo?: string;
  docenteId?: string;
  actualizado?: string;
}

export interface Semester {
  id: string;
  nombre: string;
  inicio?: string;
  fin?: string;
  creado: string;
  codigo?: string;
  estado: 'activo' | 'inactivo';
  actualizado?: string;
}

export interface Parcial {
  id: string;
  nombre: string;
  semestre: string; // Semester ID
  asignatura: string; // Subject ID
  estado: 'abierto' | 'cerrado';
  porcentaje?: number;
  fechaInicio?: string;
  fechaFin?: string;
  creado: string;
  actualizado?: string;
}

export interface Nota {
  id: string;
  estudianteId: string;
  asignaturaId: string;
  parcialId: string;
  nota: number;
  aprobado: boolean;
  comentario?: string;
  creado: string;
  actualizado?: string;
  notaEV1?: number;
  notaEV2?: number;
  notaTrabajo?: number;
}

// Support alternative exported naming alias
export type GradeRecord = Nota;

export interface Trabajo {
  id: string;
  titulo: string;
  descripcion?: string;
  asignatura?: string;
  semestre?: string;
  parcialId?: string;
  fechaEntrega?: string;
  tipo?: string;
  porcentaje?: number;
  valor?: number;
  puntos?: number;
  creado: string;
  actualizado?: string;
}

// Support alternative exported naming alias
export type Assignment = Trabajo;

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  estudianteId: string;
  estudianteNombre: string;
  fechaEntrega: string;
  archivoNombre: string;
  archivoUrl: string; // Base64 or URL
  comentarioEstudiante?: string;
  estado: 'pendiente' | 'entregado' | 'calificado';
  calificacion?: number;
  comentarioDocente?: string;
  creado: string;
  actualizado?: string;
}

export interface DocenteAsignacion {
  id: string;
  docenteId: string;
  asignaturaId: string;
  semestreId: string;
}

export interface EstudianteAsignacion {
  id: string;
  estudianteId: string;
  asignaturaId: string;
  semestreId: string;
}

export interface Institution {
  id: string;
  nombre: string;
  tipo?: string;
  codigo?: string;
  ciudad?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  creado: string;
  actualizado?: string;
}

export interface Question {
  id: string;
  texto: string;
  tipo: 'multiple' | 'checkbox' | 'tf' | 'abierta' | 'escala' | 'dropdown' | 'matching' | 'table';
  puntos: number;
  opciones: string[]; // Options / Caja de palabras (list of terms to match)
  opcionIds?: string[]; // Stable internal IDs for options to prevent UI collision on deletion
  correctas: number[]; // Index of correct option(s) for multiple, tf, dropdown, checkbox
  enunciados?: string[]; // Array of statements/definitions for matching type
  enunciadoIds?: string[]; // Stable internal IDs for enunciados to prevent UI collision on deletion
  matchCorrectos?: number[]; // Match indices corresponding to opciones for each enunciado
  columnas?: string[]; // Encabezados de columnas para tabla
  tableRows?: {
    cells: {
      tipo: 'texto' | 'blank';
      valor: string; // Para celdas fijas
      correctOptionIdx?: number; // Para espacios por llenar, apunta a la opciones
    }[];
  }[];
}

export interface Exam {
  id: string;
  titulo: string;
  subtitulo?: string;
  materia: string;
  parcialId?: string | null;
  descripcion?: string;
  docenteId: string;
  estado: 'borrador' | 'activo' | 'cerrado';
  tiempo: number; // in minutes, 0 for unlimited
  intentos: number; // 0 for unlimited
  aprobacion: number; // percentage, e.g. 60
  aleatorio: boolean;
  mostrarNota: boolean;
  creado: string;
  actualizado?: string;
  preguntas: Question[];
  bannerUrl?: string;
}

export interface Submission {
  id: string;
  examenId: string;
  estudianteId: string;
  estudianteNombre: string;
  respuestas: Record<string, any>;
  puntaje: number; // final calculated percentage
  aprobado: boolean;
  correctas: number;
  incorrectas: number;
  tiempoUsado: string;
  fecha: string;
  estado: 'pendiente' | 'calificado';
  manualScores?: Record<string, number>;
  manualComments?: Record<string, string>;
  autoPuntaje?: number;
  gradedBy?: string;
  gradedAt?: string;
}
