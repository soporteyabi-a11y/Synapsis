/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Search, BookOpen, Plus, Trash2, Download, FileText, 
  ExternalLink, Calendar, User as UserIcon, Bookmark, 
  Eye, Filter, Sparkles, BookMarked, ThumbsUp, Upload, X
} from 'lucide-react';
import { User, Subject } from '../types';
import { uid, now, fmtDate } from '../lib/db';

interface WikiArticle {
  id: string;
  titulo: string;
  resumen: string;
  contenido: string;
  autorNombre: string;
  autorId: string;
  asignaturaId: string; // Empty means "Tema Libre / Interés General"
  creado: string;
  puntosClave: string[];
  pdfNombre?: string;
  pdfUrl?: string;
  pdfSize?: string;
  colorCover: string; // Tailwind bg-gradient or solid hex color for premium header
}

interface EducativoProps {
  currentUser: User;
  subjects: Subject[];
  toast: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

const PRESET_COVERS = [
  'from-indigo-550 to-blue-600',
  'from-violet-600 to-fuchsia-600',
  'from-emerald-500 to-teal-650',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-cyan-500 to-blue-500',
];

export default function Educativo({ currentUser, subjects, toast }: EducativoProps) {
  // Initial seed articles (will persist in localStorage)
  const [articles, setArticles] = useState<WikiArticle[]>(() => {
    try {
      const saved = localStorage.getItem('ep_wiki_articles');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }

    // Default seeded educational encyclopedia pages
    return [
      {
        id: 'wiki_roman_empire',
        titulo: 'El Imperio Romano: Origen, Auge y Fragmentación',
        resumen: 'Un recorrido detallado por una de las civilizaciones más influyentes de la historia, analizando su estructura gubernamental, hitos militares y el legado arquitectónico y legal que perdura en Occidente.',
        contenido: `El Imperio Romano fue la etapa de la civilización romana caracterizada por una forma de gobierno autocrática. El nacimiento del imperio viene precedido por la expansión de su capital, Roma, que extendió su control en torno al mar Mediterráneo.

### El Período Dorado: Pax Romana
Bajo la dirección de Augusto se inició una era de paz, estabilidad y florecimiento cultural conocida como la Pax Romana, que duró aproximadamente dos siglos. Durante este ciclo, la red vial comercial floreció y monumentos soberbios como el Coliseo, el Panteón y múltiples acueductos fueron erigidos a lo largo y ancho de las provincias europeas.

### Contribución del Derecho Romano
El sistema jurídico de Roma sentó las bases para el derecho civil moderno. Conceptos clave como la presunción de inocencia, el derecho a defensa y la codificación de principios universales fueron desarrollados extensamente por juristas imperiales y consolidados posteriormente en el Corpus Iuris Civilis.

### División y Caída
En el año 395 d. C., tras la muerte del emperador Teodosio I, el imperio se dividió formalmente en el Imperio Romano de Occidente y el de Oriente (Imperio Bizantino). Mientras que el de Occidente colapsó en el 476 d. C. bajo la presión de invasiones bárbaras e inestabilidad interna, el imperio oriental perduró por otros mil años más hasta la caída de Constantinopla en 1453.`,
        autorNombre: 'Administración Synapsis',
        autorId: 'system',
        asignaturaId: subjects[1]?.id || '', // SOCIALES
        creado: now(),
        puntosClave: [
          'Fundado formalmente por César Augusto en el año 27 a. C.',
          'Consolidación del Derecho Romano como el pilar legislativo occidental.',
          'División geopolítica en Oriente y Occidente para mejorar la administración.',
          'Caída del hemisferio occidental en el 476 d. C. marcando el fin de la Edad Antigua.'
        ],
        pdfNombre: 'Guia_Imperio_Romano_Completa.pdf',
        pdfUrl: '#',
        colorCover: 'from-amber-500 to-orange-600',
      },
      {
        id: 'wiki_algebra_history',
        titulo: 'Las Ecuaciones de Segundo Grado en la Historia',
        resumen: 'Explicación del origen histórico de las fórmulas cuadráticas, desde las tablillas de arcilla babilonias hasta los refinados métodos lógicos planteados por el matemático persa Al-Juarismi en el siglo IX.',
        contenido: `La resolución de ecuaciones cuadráticas ha fascinado a los geómetras y matemáticos desde tiempos ancestrales. A diferencia del álgebra simbólica que empleamos hoy en día, los antiguos describían estos problemas a través de analogías puramente geométricas.

### Los Babilonios (circa 2000 a. C.)
En la antigua Mesopotamia, los escribas resolvían problemas prácticos enfocados en la partición y superficie de terrenos rústicos. Utilizaban un algoritmo aritmético preciso que equivale exactamente a nuestra famosa fórmula general de la cuadrática, aunque carecían de variables formales. Para ellos, la "incógnita" era simplemente la longitud de un terreno físico.

### Los Griegos e Diofanto de Alejandría
Durante el período helenístico, Euclides abordó ecuaciones cuadráticas a través del trazo geométrico de segmentos proporcionales en su obra "Elementos". Siglos después, Diofanto de Alejandría dio un paso gigante introduciendo una anotación sincopada precursora del álgebra, permitiendo plantear sistemas cuadráticos directamente en papel de papiro.

### Al-Juarismi y el Nacimiento del Álgebra
En el año 820 d. C., Muhammad ibn Musa al-Juarismi publicó en Bagdad su célebre tratado "Al-kitāb al-mukhtaṣar fī ḥisāb al-gabr wal-muqābala". De allí proviene el vocablo "Álgebra". Él proveyó la primera resolución exhaustiva y formal para cada uno de los seis tipos de ecuaciones lineales y cuadráticas existentes, utilizando argumentos geométricos para sustentar analíticamente las raíces positivas obtenidas.`,
        autorNombre: 'Prof. de Jesús María García',
        autorId: 'teacher',
        asignaturaId: subjects[0]?.id || '', // MATEMÁTICAS
        creado: now(),
        puntosClave: [
          'Babilonios calculaban raíces cuadradas bajo problemas de reparto de áreas agricultoras.',
          'Diofanto de Alejandría sentó las bases de la notación algebraica.',
          'Al-Juarismi inventó los términos algebraicos y codificó las operaciones sistemáticas.',
          'La fórmula general consolida miles de años de aproximación y soluciones geométricas.'
        ],
        pdfNombre: 'Manual_Ecuaciones_Cuadraticas_Practico.pdf',
        pdfUrl: '#',
        colorCover: 'from-indigo-550 to-blue-600',
      },
      {
        id: 'wiki_siglo_de_oro',
        titulo: 'El Siglo de Oro Español y la Novela Moderna',
        resumen: 'Análisis crítico sobre la ebullición artística literaria española en los siglos XVI y XVII, marcando el nacimiento de la novela de caballería desmitificada con Don Quijote de la Mancha.',
        contenido: `El Siglo de Oro español se distingue como un lapso de excepcional producción artística y literaria en la península ibérica, coincidente con el apogeo político y militar de la dinastía de los Austrias.

### Miguel de Cervantes y la Libertad Narrativa
En 1605, Miguel de Cervantes Saavedra publica la primera parte de "El ingenioso hidalgo don Quijote de la Mancha". Esta obra se erige como la primera novela moderna del mundo. Cervantes destruyó los clichés románticos y fantásticos de los caballeros andantes medievales mediante una sátira brillante, cargada de polifonía, juegos literarios y una asombrosa introspección psicológica de sus protagonistas.

### El Teatro Nacional: Lope de Vega
Paralelamente, el teatro vivió una revolución popular gracias a Lope de Vega y su tratado "Arte nuevo de hacer comedias en este tiempo". Lope rompió las tradicionales tres unidades aristotélicas, alternó rítmicamente lo trágico con lo humorístico y redactó cientos de comedias corales (como "Fuenteovejuna") que encantaban tanto al vulgo en los corrales de comedias como a la realeza cortesana.

### La Poesía: Culteranismo y Conceptismo
La lírica se debatió entre dos vertientes estéticas geniales y enemistadas: el Gongorismo o Culteranismo (liderado por Luis de Góngora), enfocado en la opulencia sensorial de metáforas complejas y sintaxis latinizante; y el Conceptismo (abanderado por Francisco de Quevedo), centrado en la densidad semántica, contrastes metafóricos agudos y dobles sentidos fulminantes.`,
        autorNombre: 'Administración Synapsis',
        autorId: 'system',
        asignaturaId: subjects[2]?.id || '', // LENGUA_LIT
        creado: now(),
        puntosClave: [
          'Don Quijote de la Mancha inaugura la poética de la novela realista contemporánea.',
          'Lope de Vega reformuló la métrica y teatralidad iberoamericana en Corrales públicos.',
          'Fuerte rivalidad literaria e ideológica entre Francisco de Quevedo y Luis de Góngora.',
          'Surgimiento del Barroco como respuesta espiritual y existencial al humanismo renacentista.'
        ],
        pdfNombre: 'Resumen_Corrientes_Siglo_Oro.pdf',
        pdfUrl: '#',
        colorCover: 'from-violet-600 to-fuchsia-600',
      }
    ];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsignatura, setSelectedAsignatura] = useState('');
  
  // Modal states for creating/reading
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<WikiArticle | null>(null);

  // Form states for adding wiki article
  const [newTitulo, setNewTitulo] = useState('');
  const [newResumen, setNewResumen] = useState('');
  const [newAsignaturaId, setNewAsignaturaId] = useState(''); // Empty string means "Tema Libre / Interés General"
  const [newContenido, setNewContenido] = useState('');
  const [newPuntos, setNewPuntos] = useState('');
  const [coverIndex, setCoverIndex] = useState(0);
  
  // PDF File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Active Blob URL mapping during browser session to prevent expired session downloads
  const [blobUrls, setBlobUrls] = useState<Record<string, string>>({});

  const canManage = currentUser.rol === 'admin' || currentUser.rol === 'docente';

  const handleSaveArticle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitulo.trim() || !newContenido.trim()) {
      toast('Por favor completa todos los campos requeridos (*)', 'error');
      return;
    }

    const keyPointsArray = newPuntos
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const articleId = uid();
    let savedPdfUrl = '';
    let pdfSizeStr = '';

    if (uploadedFile) {
      // Create Object URL for session download
      const objUrl = URL.createObjectURL(uploadedFile);
      setBlobUrls(prev => ({ ...prev, [articleId]: objUrl }));
      savedPdfUrl = objUrl;
      pdfSizeStr = (uploadedFile.size / (1024 * 1024)).toFixed(2) + ' MB';
    }

    const newArticle: WikiArticle = {
      id: articleId,
      titulo: newTitulo.trim(),
      resumen: newResumen.trim() || 'No se proporcionó resumen para este tema de estudio.',
      contenido: newContenido.trim(),
      autorNombre: currentUser.nombre,
      autorId: currentUser.id,
      asignaturaId: newAsignaturaId, // It can be empty!
      creado: now(),
      puntosClave: keyPointsArray.length > 0 ? keyPointsArray : ['Artículo académico informativo para libre cátedra.'],
      pdfNombre: uploadedFile ? uploadedFile.name : undefined,
      pdfUrl: savedPdfUrl || undefined,
      pdfSize: pdfSizeStr || undefined,
      colorCover: PRESET_COVERS[coverIndex]
    };

    const nextArticles = [newArticle, ...articles];
    setArticles(nextArticles);
    localStorage.setItem('ep_wiki_articles', JSON.stringify(nextArticles));
    
    toast('¡Nuevo tema de interés publicado con éxito en la Biblioteca!', 'success');
    setIsCreateModalOpen(false);

    // Reset fields
    setNewTitulo('');
    setNewResumen('');
    setNewAsignaturaId('');
    setNewContenido('');
    setNewPuntos('');
    setUploadedFile(null);
    setCoverIndex(0);
  };

  const handleDeleteArticle = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('¿Estás seguro de que deseas eliminar permanentemente este tema o investigación?')) {
      return;
    }

    const filtered = articles.filter(a => a.id !== id);
    setArticles(filtered);
    localStorage.setItem('ep_wiki_articles', JSON.stringify(filtered));
    toast('Artículo retirado del catálogo de la biblioteca', 'success');

    if (selectedArticle?.id === id) {
      setSelectedArticle(null);
    }
  };

  // Filter logic
  const filteredArticles = articles.filter(art => {
    const sub = subjects.find(s => s.id === art.asignaturaId);
    const subName = sub ? sub.nombre.toLowerCase() : '';
    const code = sub?.codigo ? sub.codigo.toLowerCase() : '';
    const matchSearch = 
      art.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.resumen.toLowerCase().includes(searchQuery.toLowerCase()) ||
      art.contenido.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subName.includes(searchQuery.toLowerCase()) ||
      code.includes(searchQuery.toLowerCase()) ||
      (!art.asignaturaId && 'tema libre interes general'.includes(searchQuery.toLowerCase()));

    const matchAsignatura = 
      selectedAsignatura === '' || 
      (selectedAsignatura === 'libre' && !art.asignaturaId) || 
      art.asignaturaId === selectedAsignatura;

    return matchSearch && matchAsignatura;
  });

  const handleDownloadPdf = (art: WikiArticle) => {
    const activeUrl = blobUrls[art.id] || art.pdfUrl;
    if (activeUrl && activeUrl !== '#') {
      const link = document.createElement('a');
      link.href = activeUrl;
      link.download = art.pdfNombre || 'archivo.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast(`Descargando PDF del tema: ${art.pdfNombre}`, 'success');
    } else {
      // Fallback: create dynamic text material
      const headerLine = '='.repeat(60);
      const txtContent = `${headerLine}
BIBLIOTECA DE CONOCIMIENTO (INSTITUTO SYNAPSIS)
Tema: ${art.titulo}
Autor: ${art.autorNombre}
Fecha: ${fmtDate(art.creado)}
Asignatura: ${subjects.find(s => s.id === art.asignaturaId)?.nombre || 'Tema Libre / Interés General'}
${headerLine}

RESUMEN:
${art.resumen}

CONCEPTOS Y PUNTOS CLAVE:
${art.puntosClave.map((p, idx) => `${idx + 1}. ${p}`).join('\n')}

DESARROLLO DE LA CÁTEDRA:
-----------------------------------------------------------
${art.contenido}
-----------------------------------------------------------
Fin de la guía de lectura.
`;
      const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${art.titulo.replace(/[^a-zA-Z0-9íóáéúñÑ]/g, '_')}_Guia_Lectura.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast('Generando descarga del material redactado en formato texto estructurado', 'success');
    }
  };

  return (
    <div className="page-wiki animate-fade-in pb-12 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            <span>Biblioteca de Conocimiento e Investigaciones</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Cátedra libre del instituto, guías didácticas, investigaciones de temas diversos y adjuntos PDF descargables.
          </p>
        </div>

        {canManage && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary bg-indigo-600 hover:bg-indigo-755 text-white rounded-xl px-4 py-2 text-xs sm:text-sm flex items-center gap-1.5 font-bold cursor-pointer transition shadow-md w-full md:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />
            <span>Publicar Cátedra / Tema</span>
          </button>
        )}
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white p-4.5 rounded-3xl border border-slate-150 shadow-sm flex flex-col md:flex-row gap-3 items-center mb-6">
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por temas, palabras clave, materias de investigación o fórmulas..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border rounded-2xl text-xs sm:text-sm focus:outline-indigo-600 bg-slate-50/50"
          />
        </div>

        <div className="w-full md:w-64 flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedAsignatura}
            onChange={e => setSelectedAsignatura(e.target.value)}
            className="w-full p-2.5 border rounded-2xl text-xs bg-white text-slate-700 font-bold focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Filtrar Categorías</option>
            <option value="libre">✨ Temas Libres / Interés General</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>
                📚 {s.nombre} {s.codigo ? `(${s.codigo})` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ARTICLE GRID */}
      {filteredArticles.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-dashed border-slate-200">
          <BookMarked className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <p className="text-sm font-black text-slate-700">No se encontraron artículos publicados para la búsqueda</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Prueba ajustando los filtros de asignaturas o escribe palabras claves más generales de tus materias escolares.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map(art => {
            const currentSub = subjects.find(s => s.id === art.asignaturaId);
            return (
              <div 
                key={art.id}
                onClick={() => setSelectedArticle(art)}
                className="bg-white rounded-3xl border border-slate-150 overflow-hidden shadow-sm hover:shadow-md transition duration-300 hover:-translate-y-0.5 flex flex-col cursor-pointer group"
              >
                {/* Visual Premium Header Card / Cover */}
                <div className={`h-28 bg-gradient-to-br ${art.colorCover} p-4.5 flex flex-col justify-between text-white relative`}>
                  <div className="absolute right-3.5 top-3.5 bg-black/15 backdrop-blur-[6px] w-8 h-8 rounded-full flex items-center justify-center opacity-80 group-hover:scale-105 transition">
                    <Sparkles className="w-4 h-4 text-amber-200" />
                  </div>
                  <div>
                    <span className="text-[9.5px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded backdrop-blur-sm">
                      {currentSub ? `📚 ${currentSub.nombre}` : '✨ Tema Libre'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-white/80 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {fmtDate(art.creado)}
                    </span>
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-900 group-hover:text-indigo-600 transition text-sm sm:text-base line-clamp-2 leading-snug mb-2">
                      {art.titulo}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium line-clamp-3 leading-relaxed mb-4">
                      {art.resumen}
                    </p>
                  </div>

                  <div className="border-t border-slate-50 pt-3.5 flex items-center justify-between text-[11px] font-bold text-slate-400">
                    <span className="flex items-center gap-1 text-slate-500 font-medium">
                      <UserIcon className="w-3.5 h-3.5" />
                      {art.autorNombre.split(' ')[0]}
                    </span>

                    <div className="flex items-center gap-2">
                      {art.pdfNombre && (
                        <span className="flex items-center gap-0.5 text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100 font-mono text-[9px]" title="Tiene Guía PDF">
                          PDF
                        </span>
                      )}
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedArticle(art);
                        }}
                        className="text-indigo-650 hover:underline flex items-center gap-0.5 group-hover:translate-x-0.5 transition"
                      >
                        <span>Leer</span>
                        <Eye className="w-3 h-3" />
                      </button>

                      {canManage && (
                        <button
                          onClick={(e) => handleDeleteArticle(art.id, e)}
                          className="text-rose-500 hover:text-rose-700 p-1 rounded hover:bg-rose-50 transition cursor-pointer"
                          title="Eliminar tema wiki"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* READ DETAIL MODAL */}
      {selectedArticle && (
        <div className="modal-overlay fixed inset-0 bg-black/60 backdrop-blur-[3px] flex items-center justify-center z-[250] p-4 text-left animate-fade-in overflow-y-auto">
          <div className="modal bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden my-8">
            {/* Elegant Wiki Styled Cover */}
            <div className={`bg-gradient-to-br ${selectedArticle.colorCover} p-8 text-white relative`}>
              <button 
                onClick={() => setSelectedArticle(null)} 
                className="absolute right-5 top-5 bg-black/20 hover:bg-black/45 w-9 h-9 rounded-full flex items-center justify-center text-white transition cursor-pointer"
              >
                ✕
              </button>
              
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2.5 py-1 rounded backdrop-blur-sm border border-white/20">
                  {subjects.find(s => s.id === selectedArticle.asignaturaId)?.nombre ? `📚 ${subjects.find(s => s.id === selectedArticle.asignaturaId)?.nombre}` : '✨ Tema Libre / Interés General'}
                </span>
                {selectedArticle.pdfNombre && (
                  <span className="text-[10px] font-black uppercase tracking-widest bg-rose-500/85 text-white px-2.5 py-1 rounded border border-rose-400 font-mono">
                    PDF Adjunto
                  </span>
                )}
              </div>

              <h2 className="font-serif font-black text-xl md:text-3xl tracking-tight leading-tight mb-4">
                {selectedArticle.titulo}
              </h2>

              <p className="text-white/85 text-xs sm:text-sm font-medium leading-relaxed max-w-xl">
                {selectedArticle.resumen}
              </p>

              <div className="flex flex-wrap gap-4 items-center mt-6 pt-4 border-t border-white/10 text-[11px] sm:text-xs font-semibold text-white/90">
                <span className="flex items-center gap-1.5">
                  <UserIcon className="w-4 h-4 text-slate-105" />
                  Autor: {selectedArticle.autorNombre}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-105" />
                  Publicado: {fmtDate(selectedArticle.creado)}
                </span>
              </div>
            </div>

            {/* Encyclopedia Body Text */}
            <div className="p-6 md:p-8 space-y-6 max-h-[55vh] overflow-y-auto bg-amber-50/15">
              {/* Key points box */}
              {selectedArticle.puntosClave && selectedArticle.puntosClave.length > 0 && (
                <div className="bg-indigo-50/40 p-4 rounded-2xl border border-indigo-150/50">
                  <h4 className="text-xs font-black text-indigo-750 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    Puntos Clave y Conceptos Clave
                  </h4>
                  <ul className="text-xs text-slate-700 space-y-1.5 list-disc pl-4.5 font-medium leading-relaxed">
                    {selectedArticle.puntosClave.map((pt, i) => (
                      <li key={i}>{pt}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Central Text content */}
              <div className="text-xs sm:text-sm text-slate-800 leading-relaxed font-sans whitespace-pre-line space-y-4">
                {/* Simple parse headers for visual touch */}
                {selectedArticle.contenido.split('###').map((chunk, i) => {
                  if (i === 0) {
                    return <p key={i} className="first-letter:text-3xl first-letter:font-black first-letter:text-indigo-600">{chunk}</p>;
                  }
                  
                  // split the first line of subsequent chunks as heading
                  const lines = chunk.split('\n');
                  const heading = lines[0];
                  const body = lines.slice(1).join('\n');

                  return (
                    <div key={i} className="mt-5">
                      <h4 className="font-serif font-black text-slate-900 text-sm sm:text-base border-b border-dashed border-slate-205 pb-1 mb-2">
                        {heading}
                      </h4>
                      <p className="text-slate-750 leading-relaxed whitespace-pre-line text-xs sm:text-[13.5px]">{body}</p>
                    </div>
                  );
                })}
              </div>

              {/* Attachments Section / Action Buttons */}
              {selectedArticle.pdfNombre && (
                <div className="border-t border-slate-150 pt-5 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-4.5 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-slate-800 line-clamp-1">{selectedArticle.pdfNombre}</p>
                      <p className="text-[10px] text-slate-400 font-mono uppercase">Documento PDF Académico</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownloadPdf(selectedArticle)}
                    className="btn btn-primary bg-indigo-600 hover:bg-indigo-755 text-white rounded-xl px-4.5 py-2 text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>Descargar Guía</span>
                  </button>
                </div>
              )}
            </div>

            {/* Read Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-indigo-650 font-bold bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full">
                <ThumbsUp className="w-3.5 h-3.5 text-indigo-500" />
                <span>¿Te sirvió este tema de estudio?</span>
              </div>
              <button 
                onClick={() => setSelectedArticle(null)}
                className="btn px-4 py-2 bg-white hover:bg-slate-100 border rounded-xl text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cerrar Biblioteca
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE ARTICLE MODAL (Teacher/Admin) */}
      {isCreateModalOpen && (
        <div className="modal-overlay fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-[250] p-4 text-left animate-fade-in overflow-y-auto">
          <div className="modal bg-white rounded-3xl shadow-2xl w-full max-w-xl my-8 overflow-hidden">
            <div className="modal-header border-b border-slate-100 p-5 bg-indigo-50/50 flex items-center justify-between">
              <div>
                <h3 className="modal-title font-extrabold text-indigo-900 text-base md:text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-indigo-500" />
                  <span>Publicar Tema o Cátedra</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">Publica investigaciones o contenidos educativos libres para uso del instituto.</p>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)} 
                className="modal-close bg-white border border-slate-200 hover:bg-slate-100 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveArticle} className="modal-body p-6 space-y-4 max-h-[70vh] overflow-y-auto bg-slate-50/30">
              {/* Form Row: Title & Subject */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group flex flex-col">
                  <label className="form-label text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Título del Tema / Lección <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="text"
                    placeholder="Ej / El Proceso de Fotosíntesis y Luz"
                    value={newTitulo}
                    onChange={e => setNewTitulo(e.target.value)}
                    className="form-control w-full p-2.5 border rounded-xl text-xs sm:text-sm focus:outline-indigo-500 bg-white font-medium text-slate-800"
                  />
                </div>

                <div className="form-group flex flex-col">
                  <label className="form-label text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                    Asignatura / Categoría (Opcional)
                  </label>
                  <select
                    value={newAsignaturaId}
                    onChange={e => setNewAsignaturaId(e.target.value)}
                    className="form-control w-full p-2.5 border rounded-xl text-xs sm:text-sm focus:outline-indigo-500 bg-white font-semibold text-slate-700"
                  >
                    <option value="">✨ Tema de Interés General / Libre</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>
                        📚 {s.nombre} {s.codigo ? `(${s.codigo})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Form Row: Resumen / Summary */}
              <div className="form-group flex flex-col">
                <label className="form-label text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Resumen Corto (Visualizado en Tarjeta) <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Escribe una breve introducción del tema para enganchar a los lectores (máximo 250 caracteres)."
                  value={newResumen}
                  onChange={e => setNewResumen(e.target.value.slice(0, 250))}
                  className="form-control w-full p-2.5 border rounded-xl text-xs sm:text-sm focus:outline-indigo-500 bg-white font-medium text-slate-700 text-slate-700"
                />
              </div>

              {/* Form Row: Cover Preset Selection */}
              <div className="form-group flex flex-col">
                <label className="form-label text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">
                  Estilo de Portada Ilustrada (Gradiente Premium)
                </label>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_COVERS.map((preset, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setCoverIndex(index)}
                      className={`h-9 rounded-xl bg-gradient-to-br ${preset} border-2 transition ${
                        coverIndex === index ? 'border-indigo-600 scale-105 shadow-sm' : 'border-transparent hover:scale-102'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Key points */}
              <div className="form-group flex flex-col">
                <label className="form-label text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Puntos Claves / Conceptos Clave (Uno por línea)
                </label>
                <textarea
                  rows={3}
                  placeholder="Ej:
• Descubierto por Blaise Pascal en 1648.
• Describe la fluidez de líquidos incompresibles.
• Es el fundamento de los frenos hidráulicos."
                  value={newPuntos}
                  onChange={e => setNewPuntos(e.target.value)}
                  className="form-control w-full p-2.5 border rounded-xl text-xs focus:outline-indigo-500 bg-white font-mono"
                />
              </div>

              {/* Real PDF Uploader Block */}
              <div className="form-group flex flex-col">
                <label className="form-label text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Guía de Estudios / Archivo PDF Adjunto (Opcional)
                </label>
                
                <div 
                  onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) {
                      if (file.type === 'application/pdf') {
                        setUploadedFile(file);
                        toast(`Archivo PDF '${file.name}' cargado con éxito`, 'success');
                      } else {
                        toast('Solo se permiten archivos en formato PDF', 'error');
                      }
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 bg-white ${
                    dragActive ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-200 hover:border-slate-350'
                  }`}
                  onClick={() => document.getElementById('file-upload-input')?.click()}
                >
                  <input 
                    id="file-upload-input"
                    type="file" 
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.type === 'application/pdf') {
                          setUploadedFile(file);
                          toast(`Archivo PDF '${file.name}' cargado con éxito`, 'success');
                        } else {
                          toast('Solo se permiten archivos en formato PDF', 'error');
                        }
                      }
                    }}
                  />
                  {uploadedFile ? (
                    <div className="flex items-center justify-between w-full bg-slate-50 border border-slate-150 p-2.5 rounded-xl text-left">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-rose-500 shrink-0" />
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-700 truncate max-w-[200px]" title={uploadedFile.name}>
                            {uploadedFile.name}
                          </p>
                          <p className="text-[9px] text-slate-400 font-mono">
                            {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedFile(null);
                          toast('Se retiró el archivo adjunto', 'warning');
                        }}
                        className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-slate-450" />
                      <div>
                        <p className="text-xs font-bold text-slate-600">Arrastra tu archivo PDF aquí o <span className="text-indigo-600 hover:underline">búscalo</span></p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Soporta archivos de hasta 10MB</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Form Row: Contenido Enciclopédico */}
              <div className="form-group flex flex-col">
                <div className="flex items-center justify-between mb-1">
                  <label className="form-label text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                    Cuerpo Científico / Redacción del Tema <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium font-sans">Puedes usar "###" al inicio de una línea para crear secciones</span>
                </div>
                <textarea
                  required
                  rows={9}
                  placeholder={`Escribe el desarrollo completo de la lección o tema aquí.
Ej:
Este principio de Bernoulli postula que...

### Ecuación de Continuidad
Para conductos cerrados, el gasto de agua se mantiene idéntico...

### Aplicaciones de Vuelo
La sustentación de aviones se explica bajo este principio aerodinámico ya que el viento superior fluye a mayor velocidad...`}
                  value={newContenido}
                  onChange={e => setNewContenido(e.target.value)}
                  className="form-control w-full p-3 border rounded-xl text-xs sm:text-sm focus:outline-indigo-500 bg-white"
                />
              </div>

              <div className="modal-footer border-t border-slate-100 flex justify-end gap-2.5 pt-4 mt-6 bg-slate-50 rounded-b-3xl -mx-6 -mb-6 p-5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-secondary px-4 py-2 border rounded-xl hover:bg-slate-150 text-slate-707 bg-white cursor-pointer text-xs sm:text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary px-5 py-2 text-white font-bold rounded-xl cursor-pointer text-xs sm:text-sm bg-indigo-650 hover:bg-indigo-755"
                >
                  Publicar Tema
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
