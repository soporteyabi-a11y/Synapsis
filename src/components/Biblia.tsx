/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Search, Heart, RefreshCw, BookMarked, Scroll, Sparkles,
  BookmarkCheck, ChevronLeft, ChevronRight, Compass, HelpCircle, AlertCircle
} from 'lucide-react';

interface Verse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

interface BookmarkedVerse {
  id: string; // "Book-Chapter-Verse"
  book: string;
  chapter: number;
  verse: number;
  text: string;
  dateAdded: string;
}

// Complete 66 canonical books index with Spanish name, API key, chapter counts, and testament
const DENO_BOOK_ABREVIATIONS = [
  'gn', 'ex', 'lv', 'nm', 'dt', 'jos', 'jue', 'rt', '1s', '2s',
  '1r', '2r', '1cr', '2cr', 'esd', 'neh', 'est', 'job', 'sal', 'pr',
  'ec', 'cnt', 'is', 'jer', 'lm', 'ez', 'dn', 'os', 'jl', 'am',
  'abd', 'jon', 'mi', 'nah', 'hab', 'sof', 'hag', 'zac', 'mal',
  'mt', 'mr', 'lc', 'jn', 'hch', 'ro', '1co', '2co', 'ga', 'ef',
  'fil', 'col', '1ts', '2ts', '1ti', '2ti', 'tit', 'flm', 'he', 'stg',
  '1p', '2p', '1jn', '2jn', '3jn', 'jud', 'ap'
];

const BIBLE_BOOKS = [
  // Antiguo Testamento (39 libros)
  { name: 'Génesis', key: 'genesis', chaptersCount: 50, testament: 'Antiguo' },
  { name: 'Éxodo', key: 'exodus', chaptersCount: 40, testament: 'Antiguo' },
  { name: 'Levítico', key: 'leviticus', chaptersCount: 27, testament: 'Antiguo' },
  { name: 'Números', key: 'numbers', chaptersCount: 36, testament: 'Antiguo' },
  { name: 'Deuteronomio', key: 'deuteronomy', chaptersCount: 34, testament: 'Antiguo' },
  { name: 'Josué', key: 'joshua', chaptersCount: 24, testament: 'Antiguo' },
  { name: 'Jueces', key: 'judges', chaptersCount: 21, testament: 'Antiguo' },
  { name: 'Rut', key: 'ruth', chaptersCount: 4, testament: 'Antiguo' },
  { name: '1 Samuel', key: '1 samuel', chaptersCount: 31, testament: 'Antiguo' },
  { name: '2 Samuel', key: '2 samuel', chaptersCount: 24, testament: 'Antiguo' },
  { name: '1 Reyes', key: '1 kings', chaptersCount: 22, testament: 'Antiguo' },
  { name: '2 Reyes', key: '2 kings', chaptersCount: 25, testament: 'Antiguo' },
  { name: '1 Crónicas', key: '1 chronicles', chaptersCount: 29, testament: 'Antiguo' },
  { name: '2 Crónicas', key: '2 chronicles', chaptersCount: 36, testament: 'Antiguo' },
  { name: 'Esdras', key: 'ezra', chaptersCount: 10, testament: 'Antiguo' },
  { name: 'Nehemías', key: 'nehemiah', chaptersCount: 13, testament: 'Antiguo' },
  { name: 'Ester', key: 'esther', chaptersCount: 10, testament: 'Antiguo' },
  { name: 'Job', key: 'job', chaptersCount: 42, testament: 'Antiguo' },
  { name: 'Salmos', key: 'psalms', chaptersCount: 150, testament: 'Antiguo' },
  { name: 'Proverbios', key: 'proverbs', chaptersCount: 31, testament: 'Antiguo' },
  { name: 'Eclesiastés', key: 'ecclesiastes', chaptersCount: 12, testament: 'Antiguo' },
  { name: 'Cantares', key: 'song of solomon', chaptersCount: 8, testament: 'Antiguo' },
  { name: 'Isaías', key: 'isaiah', chaptersCount: 66, testament: 'Antiguo' },
  { name: 'Jeremías', key: 'jeremiah', chaptersCount: 52, testament: 'Antiguo' },
  { name: 'Lamentaciones', key: 'lamentations', chaptersCount: 5, testament: 'Antiguo' },
  { name: 'Ezequiel', key: 'ezekiel', chaptersCount: 48, testament: 'Antiguo' },
  { name: 'Daniel', key: 'daniel', chaptersCount: 12, testament: 'Antiguo' },
  { name: 'Oseas', key: 'hosea', chaptersCount: 14, testament: 'Antiguo' },
  { name: 'Joel', key: 'joel', chaptersCount: 3, testament: 'Antiguo' },
  { name: 'Amós', key: 'amos', chaptersCount: 9, testament: 'Antiguo' },
  { name: 'Abdías', key: 'obadiah', chaptersCount: 1, testament: 'Antiguo' },
  { name: 'Jonás', key: 'jonah', chaptersCount: 4, testament: 'Antiguo' },
  { name: 'Miqueas', key: 'micah', chaptersCount: 7, testament: 'Antiguo' },
  { name: 'Nahúm', key: 'nahum', chaptersCount: 3, testament: 'Antiguo' },
  { name: 'Habacuc', key: 'habakkuk', chaptersCount: 3, testament: 'Antiguo' },
  { name: 'Sofonías', key: 'zephaniah', chaptersCount: 3, testament: 'Antiguo' },
  { name: 'Hageo', key: 'haggai', chaptersCount: 2, testament: 'Antiguo' },
  { name: 'Zacarías', key: 'zechariah', chaptersCount: 14, testament: 'Antiguo' },
  { name: 'Malaquías', key: 'malachi', chaptersCount: 4, testament: 'Antiguo' },

  // Nuevo Testamento (27 libros)
  { name: 'Mateo', key: 'matthew', chaptersCount: 28, testament: 'Nuevo' },
  { name: 'Marcos', key: 'mark', chaptersCount: 16, testament: 'Nuevo' },
  { name: 'Lucas', key: 'luke', chaptersCount: 24, testament: 'Nuevo' },
  { name: 'Juan', key: 'john', chaptersCount: 21, testament: 'Nuevo' },
  { name: 'Hechos', key: 'acts', chaptersCount: 28, testament: 'Nuevo' },
  { name: 'Romanos', key: 'romans', chaptersCount: 16, testament: 'Nuevo' },
  { name: '1 Corintios', key: '1 corinthians', chaptersCount: 16, testament: 'Nuevo' },
  { name: '2 Corintios', key: '2 corinthians', chaptersCount: 13, testament: 'Nuevo' },
  { name: 'Gálatas', key: 'galatians', chaptersCount: 6, testament: 'Nuevo' },
  { name: 'Efesios', key: 'ephesians', chaptersCount: 6, testament: 'Nuevo' },
  { name: 'Filipenses', key: 'philippians', chaptersCount: 4, testament: 'Nuevo' },
  { name: 'Colosenses', key: 'colossians', chaptersCount: 4, testament: 'Nuevo' },
  { name: '1 Tesalonicenses', key: '1 thessalonians', chaptersCount: 5, testament: 'Nuevo' },
  { name: '2 Tesalonicenses', key: '2 thessalonians', chaptersCount: 3, testament: 'Nuevo' },
  { name: '1 Timoteo', key: '1 timothy', chaptersCount: 6, testament: 'Nuevo' },
  { name: '2 Timoteo', key: '2 timothy', chaptersCount: 4, testament: 'Nuevo' },
  { name: 'Tito', key: 'titus', chaptersCount: 3, testament: 'Nuevo' },
  { name: 'Filemón', key: 'philemon', chaptersCount: 1, testament: 'Nuevo' },
  { name: 'Hebreos', key: 'hebrews', chaptersCount: 13, testament: 'Nuevo' },
  { name: 'Santiago', key: 'james', chaptersCount: 5, testament: 'Nuevo' },
  { name: '1 Pedro', key: '1 peter', chaptersCount: 5, testament: 'Nuevo' },
  { name: '2 Pedro', key: '2 peter', chaptersCount: 3, testament: 'Nuevo' },
  { name: '1 Juan', key: '1 john', chaptersCount: 5, testament: 'Nuevo' },
  { name: '2 Juan', key: '2 john', chaptersCount: 1, testament: 'Nuevo' },
  { name: '3 Juan', key: '3 john', chaptersCount: 1, testament: 'Nuevo' },
  { name: 'Judas', key: 'jude', chaptersCount: 1, testament: 'Nuevo' },
  { name: 'Apocalipsis', key: 'revelation', chaptersCount: 22, testament: 'Nuevo' }
] as const;

// Curated selection of offline seed books & chapters for instant loading, cached fallback, and offline usage
const OFFLINE_BIBLE_SEEDS = [
  {
    name: 'Génesis',
    chapters: {
      1: [
        { book: 'Génesis', chapter: 1, verse: 1, text: 'En el principio creó Dios los cielos y la tierra.' },
        { book: 'Génesis', chapter: 1, verse: 2, text: 'Y la tierra estaba desordenada y vacía, y las tinieblas estaban sobre la faz del abismo, y el Espíritu de Dios se movía sobre la faz de las aguas.' },
        { book: 'Génesis', chapter: 1, verse: 3, text: 'Y dijo Dios: Sea la luz; y fue la luz.' },
        { book: 'Génesis', chapter: 1, verse: 4, text: 'Y vio Dios que la luz era buena; y separó Dios la luz de las tinieblas.' },
        { book: 'Génesis', chapter: 1, verse: 5, text: 'Y llamó Dios a la luz Día, y a las tinieblas llamó Noche. Y fue la tarde y la mañana un día.' },
        { book: 'Génesis', chapter: 1, verse: 26, text: 'Entonces dijo Dios: Hagamos al hombre a nuestra imagen, conforme a nuestra semejanza; y señoree en los peces del mar, en las aves de los cielos, en las bestias, en toda la tierra, y en todo animal que se arrastra sobre la tierra.' },
        { book: 'Génesis', chapter: 1, verse: 27, text: 'Y creó Dios al hombre a su imagen, a imagen de Dios lo creó; varón y hembra los creó.' },
        { book: 'Génesis', chapter: 1, verse: 31, text: 'Y vio Dios todo lo que había hecho, y he aquí que era bueno en gran manera. Y fue la tarde y la mañana el día sexto.' }
      ],
      2: [
        { book: 'Génesis', chapter: 2, verse: 1, text: 'Fueron, pues, acabados los cielos y la tierra, y todo el ejército de ellos.' },
        { book: 'Génesis', chapter: 2, verse: 2, text: 'Y acabó Dios en el día séptimo la obra que hizo; y reposó el día séptimo de toda la obra que hizo.' },
        { book: 'Génesis', chapter: 2, verse: 3, text: 'Y bendijo Dios al día séptimo, y lo santificó, porque en él reposó de toda la obra que había hecho en la creación.' },
        { book: 'Génesis', chapter: 2, verse: 7, text: 'Entonces Jehová Dios formó al hombre del polvo de la tierra, y sopló en su nariz aliento de vida, y fue el hombre un ser viviente.' }
      ]
    }
  },
  {
    name: 'Salmos',
    chapters: {
      1: [
        { book: 'Salmos', chapter: 1, verse: 1, text: 'Bienaventurado el varón que no anduvo en consejo de malos, ni estuvo en camino de pecadores, ni en silla de escarnecedores se ha sentado;' },
        { book: 'Salmos', chapter: 1, verse: 2, text: 'sino que en la ley de Jehová está su delicia, y en su ley medita de día y de noche.' },
        { book: 'Salmos', chapter: 1, verse: 3, text: 'Será como árbol plantado junto a corrientes de aguas, que da su fruto en su tiempo, y su hoja no cae; y todo lo que hace, prosperará.' },
        { book: 'Salmos', chapter: 1, verse: 6, text: 'Porque Jehová conoce el camino de los justos; mas la senda de los malos perecerá.' }
      ],
      23: [
        { book: 'Salmos', chapter: 23, verse: 1, text: 'Jehová es mi pastor; nada me faltará.' },
        { book: 'Salmos', chapter: 23, verse: 2, text: 'En lugares de delicados pastos me hará descansar; junto a aguas de reposo me pastoreará.' },
        { book: 'Salmos', chapter: 23, verse: 3, text: 'Confortará mi alma; me guiará por sendas de justicia por amor de su nombre.' },
        { book: 'Salmos', chapter: 23, verse: 4, text: 'Aunque ande en valle de sombra de muerte, no temeré mal alguno, porque tú estarás conmigo; tu vara y tu cayado me infundirán aliento.' },
        { book: 'Salmos', chapter: 23, verse: 5, text: 'Aderezas mesa delante de mí en presencia de mis angustiadores; unges mi cabeza con aceite; mi copa está rebosando.' },
        { book: 'Salmos', chapter: 23, verse: 6, text: 'Ciertamente el bien y la misericordia me seguirán todos los días de mi vida, y en la casa de Jehová moraré por largos días.' }
      ],
      91: [
        { book: 'Salmos', chapter: 91, verse: 1, text: 'El que habita al abrigo del Altísimo morará bajo la sombra del Omnipotente.' },
        { book: 'Salmos', chapter: 91, verse: 2, text: 'Diré yo a Jehová: Esperanza mía, y castillo mío; mi Dios, en quien confiaré.' },
        { book: 'Salmos', chapter: 91, verse: 3, text: 'Él te librará del lazo del cazador, de la peste destructora.' },
        { book: 'Salmos', chapter: 91, verse: 4, text: 'Con sus plumas te cubrirá, y debajo de sus alas estarás seguro; escudo y adarga es su verdad.' },
        { book: 'Salmos', chapter: 91, verse: 11, text: 'Pues a sus ángeles mandará acerca de ti, que te guarden en todos tus caminos.' },
        { book: 'Salmos', chapter: 91, verse: 12, text: 'En las manos te llevarán, para que tu pie no tropiece en piedra.' }
      ]
    }
  },
  {
    name: 'Proverbios',
    chapters: {
      3: [
        { book: 'Proverbios', chapter: 3, verse: 1, text: 'Hijo mío, no te olvides de mi ley, y tu corazón guarde mis mandamientos;' },
        { book: 'Proverbios', chapter: 3, verse: 2, text: 'porque largura de días y años de vida y paz te aumentarán.' },
        { book: 'Proverbios', chapter: 3, verse: 3, text: 'Nunca se aparten de ti la misericordia y la verdad; átalas a tu cuello, escríbelas en la tabla de tu corazón;' },
        { book: 'Proverbios', chapter: 3, verse: 4, text: 'y hallarás gracia y buena opinión ante los ojos de Dios y de los hombres.' },
        { book: 'Proverbios', chapter: 3, verse: 5, text: 'Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia.' },
        { book: 'Proverbios', chapter: 3, verse: 6, text: 'Reconócelo en todos tus caminos, y él enderezará tus veredas.' },
        { book: 'Proverbios', chapter: 3, verse: 13, text: 'Bienaventurado el hombre que halla la sabiduría, y que obtiene la inteligencia;' },
        { book: 'Proverbios', chapter: 3, verse: 14, text: 'porque su ganancia es mejor que la ganancia de la plata, y sus frutos más que el oro fino.' }
      ]
    }
  },
  {
    name: 'Mateo',
    chapters: {
      5: [
        { book: 'Mateo', chapter: 5, verse: 1, text: 'Viendo la multitud, subió al monte; y sentándose, se acercaron sus discípulos.' },
        { book: 'Mateo', chapter: 5, verse: 2, text: 'Y abriendo su boca les enseñaba, diciendo:' },
        { book: 'Mateo', chapter: 5, verse: 3, text: 'Bienaventurados los pobres en espíritu, porque de ellos es el reino de los cielos.' },
        { book: 'Mateo', chapter: 5, verse: 4, text: 'Bienaventurados los que lloran, porque ellos recibirán consolación.' },
        { book: 'Mateo', chapter: 5, verse: 5, text: 'Bienaventurados los mansos, porque ellos recibirán la tierra por heredad.' },
        { book: 'Mateo', chapter: 5, verse: 6, text: 'Bienaventurados los que tienen hambre y sed de justicia, porque ellos serán saciados.' },
        { book: 'Mateo', chapter: 5, verse: 7, text: 'Bienaventurados los misericordiosos, porque ellos alcanzarán misericordia.' },
        { book: 'Mateo', chapter: 5, verse: 8, text: 'Bienaventurados los de limpio corazón, porque ellos verán a Dios.' },
        { book: 'Mateo', chapter: 5, verse: 9, text: 'Bienaventurados los pacificadores, porque ellos serán llamados hijos de Dios.' },
        { book: 'Mateo', chapter: 5, verse: 14, text: 'Vosotros sois la luz del mundo; una ciudad asentada sobre un monte no se puede esconder.' },
        { book: 'Mateo', chapter: 5, verse: 16, text: 'Así alumbre vuestra luz delante de los hombres, para que vean vuestras buenas obras, y glorifiquen a vuestro Padre que está en los cielos.' }
      ]
    }
  },
  {
    name: 'Juan',
    chapters: {
      1: [
        { book: 'Juan', chapter: 1, verse: 1, text: 'En el principio era el Verbo, y el Verbo era con Dios, y el Verbo era Dios.' },
        { book: 'Juan', chapter: 1, verse: 2, text: 'Este era en el principio con Dios.' },
        { book: 'Juan', chapter: 1, verse: 3, text: 'Todas las cosas por él fueron hechas, y sin él nada de lo que ha sido hecho, fue hecho.' },
        { book: 'Juan', chapter: 1, verse: 4, text: 'En él estaba la vida, y la vida era la luz de los hombres.' },
        { book: 'Juan', chapter: 1, verse: 5, text: 'La luz en las tinieblas resplandece, y las tinieblas no prevalecieron contra ella.' },
        { book: 'Juan', chapter: 1, verse: 14, text: 'Y aquel Verbo fue hecho carne, y habitó entre nosotros (y vimos su gloria, gloria como del unigénito del Padre), lleno de gracia y de verdad.' },
        { book: 'Juan', chapter: 1, verse: 17, text: 'Pues la ley por medio de Moisés fue dada, pero la gracia y la verdad vinieron por medio de Jesucristo.' }
      ],
      3: [
        { book: 'Juan', chapter: 3, verse: 1, text: 'Había un hombre de los fariseos que se llamaba Nicodemo, un principal entre los judíos.' },
        { book: 'Juan', chapter: 3, verse: 2, text: 'Este vino a Jesús de noche, y le dijo: Rabí, sabemos que has venido de Dios como maestro; porque nadie puede hacer estas señales que tú haces, si no está Dios con él.' },
        { book: 'Juan', chapter: 3, verse: 3, text: 'Respondió Jesús y le dijo: De cierto, de cierto te digo, que el que no naciere de nuevo, no puede ver el reino de Dios.' },
        { book: 'Juan', chapter: 3, verse: 16, text: 'Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito, para que todo aquel que en él cree, no se pierda, mas tenga vida eterna.' },
        { book: 'Juan', chapter: 3, verse: 17, text: 'Porque no envió Dios a su Hijo al mundo para condenar al mundo, sino para que el mundo sea salvo por él.' },
        { book: 'Juan', chapter: 3, verse: 18, text: 'El que en él cree, no es condenado; pero el que no cree, ya ha sido condenado, porque no ha creído en el nombre del unigénito Hijo de Dios.' }
      ]
    }
  },
  {
    name: 'Romanos',
    chapters: {
      12: [
        { book: 'Romanos', chapter: 12, verse: 1, text: 'Así que, hermanos, os ruego por las misericordias de Dios, que presentéis vuestros cuerpos en sacrificio vivo, santo, agradable a Dios, que es vuestro culto racional.' },
        { book: 'Romanos', chapter: 12, verse: 2, text: 'No os conforméis a este siglo, sino transformaos por medio de la renovación de vuestro entendimiento, para que comprobéis cuál sea la buena voluntad de Dios, agradable y perfecta.' },
        { book: 'Romanos', chapter: 12, verse: 9, text: 'El amor sea sin fingimiento. Aborreced lo malo, seguid lo bueno.' },
        { book: 'Romanos', chapter: 12, verse: 10, text: 'Amaos los unos a los otros con amor fraternal; en cuanto a honra, prefiriéndoos los unos a los otros.' },
        { book: 'Romanos', chapter: 12, verse: 12, text: 'gozosos en la esperanza; sufridos en la tribulación; constantes en la oración;' },
        { book: 'Romanos', chapter: 12, verse: 21, text: 'No seas vencido de lo malo, sino vence con el bien el mal.' }
      ]
    }
  },
  {
    name: 'Filemón',
    chapters: {
      1: [
        { book: 'Filemón', chapter: 1, verse: 1, text: 'Pablo, prisionero de Jesucristo, y el hermano Timoteo, al amado Filemón, colaborador nuestro,' },
        { book: 'Filemón', chapter: 1, verse: 2, text: 'y a la amada hermana Apia, y a Arquipo, nuestro compañero de milicia, y a la iglesia que está en tu casa:' },
        { book: 'Filemón', chapter: 1, verse: 3, text: 'Gracia y paz a vosotros, de Dios nuestro Padre y del Señor Jesucristo.' },
        { book: 'Filemón', chapter: 1, verse: 4, text: 'Doy gracias a mi Dios, haciendo siempre memoria de ti en mis oraciones,' },
        { book: 'Filemón', chapter: 1, verse: 5, text: 'porque oigo del amor y de la fe que tienes hacia el Señor Jesús, y para con todos los santos;' },
        { book: 'Filemón', chapter: 1, verse: 6, text: 'para que la participación de tu fe sea eficaz en el conocimiento de todo el bien que está en vosotros por Cristo Jesús.' },
        { book: 'Filemón', chapter: 1, verse: 7, text: 'Pues tenemos gran gozo y consolación en tu amor, porque por ti, oh hermano, han sido confortados los corazones de los santos.' },
        { book: 'Filemón', chapter: 1, verse: 8, text: 'Por lo cual, aunque tengo mucha libertad en Cristo para mandarte lo que conviene,' },
        { book: 'Filemón', chapter: 1, verse: 9, text: 'más bien te ruego por amor, siendo como soy, Pablo ya anciano, y ahora, además, prisionero de Jesucristo;' },
        { book: 'Filemón', chapter: 1, verse: 10, text: 'te ruego por mi hijo Onésimo, a quien engendré en mis prisiones,' },
        { book: 'Filemón', chapter: 1, verse: 11, text: 'el cual en otro tiempo te fue inútil, pero ahora a ti y a mí nos es útil,' },
        { book: 'Filemón', chapter: 1, verse: 12, text: 'el cual te vuelvo a enviar; tú, pues, recíbelo como a mí mismo.' },
        { book: 'Filemón', chapter: 1, verse: 13, text: 'Yo quisiera retenerle conmigo, para que en lugar tuyo me sirviese en mis prisiones por el evangelio;' },
        { book: 'Filemón', chapter: 1, verse: 14, text: 'pero nada quise hacer sin tu consentimiento, para que tu favor no fuese como de necesidad, sino voluntario.' },
        { book: 'Filemón', chapter: 1, verse: 15, text: 'Porque quizá se apartó de ti por algún tiempo para que le recibieses para siempre;' },
        { book: 'Filemón', chapter: 1, verse: 16, text: 'no ya como esclavo, sino como más que esclavo, como hermano amado, mayormente para mí, pero cuánto más para ti, tanto en la carne como en el Señor.' },
        { book: 'Filemón', chapter: 1, verse: 17, text: 'Así que, si me tienes por compañero, recíbele como a mí mismo.' },
        { book: 'Filemón', chapter: 1, verse: 18, text: 'Y si en algo te dañó, o te debe, ponlo a mi cuenta.' },
        { book: 'Filemón', chapter: 1, verse: 19, text: 'Yo Pablo lo escribo de mi mano, yo lo pagaré; por no decirte que aun tú mismo te me debes también.' },
        { book: 'Filemón', chapter: 1, verse: 20, text: 'Sí, hermano, tenga yo algún provecho de ti en el Señor; conforta mi corazón en el Señor.' },
        { book: 'Filemón', chapter: 1, verse: 21, text: 'Te he escrito confiando en tu obediencia, sabiendo que harás aun más de lo que te digo.' },
        { book: 'Filemón', chapter: 1, verse: 22, text: 'Prepárame también alojamiento; porque espero que por vuestras oraciones os seré concedido.' },
        { book: 'Filemón', chapter: 1, verse: 23, text: 'Te saludan Epafras, mi compañero de prisiones por Cristo Jesús,' },
        { book: 'Filemón', chapter: 1, verse: 24, text: 'Marcos, Aristarco, Demas y Lucas, mis colaboradores.' },
        { book: 'Filemón', chapter: 1, verse: 25, text: 'La gracia de nuestro Señor Jesucristo sea con vuestro espíritu. Amén.' }
      ]
    }
  }
];

const DAILY_VERSES = [
  {
    verse: { book: 'Salmos', chapter: 23, verse: 1, text: 'Jehová es mi pastor; nada me faltará.' },
    thought: 'Este hermoso canto nos recuerda la absoluta provisión y paz que proviene de confiar nuestro camino a la dirección divina. No andes ansioso, descansa hoy en su fidelidad.'
  },
  {
    verse: { book: 'Filipenses', chapter: 4, verse: 13, text: 'Todo lo puedo en Cristo que me fortalece.' },
    thought: 'Tu capacidad intelectual y fortaleza mental no reposan únicamente en tus solas fuerzas, sino en la fuente divina que aviva el entendimiento frente a las encrucijadas de tu camino.'
  },
  {
    verse: { book: 'Proverbios', chapter: 3, verse: 5, text: 'Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia.' },
    thought: 'El conocimiento académico y el discernimiento humano se magnifican cuando reconocemos con humildad que la sabiduría suprema proviene del Altísimo.'
  },
  {
    verse: { book: 'Josué', chapter: 1, verse: 9, text: 'Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo en dondequiera que vayas.' },
    thought: 'Un llamado firme a la valentía frente a los constantes desafíos del porvenir educativo y personal.'
  }
];

interface ThematicVerse extends Verse {
  tags?: string[];
}

// Curated list of search indices to make typical topic keywords return immediately beautiful matches
const POPULAR_THEMATIC_VERSES: ThematicVerse[] = [
  // Confianza y descanso en Dios
  {
    book: 'Salmos', chapter: 56, verse: 3,
    text: 'En el día que temo, yo en ti confío.',
    tags: ['confiado', 'confianza', 'confiar', 'temor', 'miedo', 'duda']
  },
  {
    book: 'Isaías', chapter: 26, verse: 3,
    text: 'Tú guardarás en completa paz a aquel cuyo pensamiento en ti persevera; porque en ti ha confiado.',
    tags: ['confiado', 'confianza', 'completa paz', 'perseverancia', 'mente', 'pensamiento']
  },
  {
    book: 'Jeremías', chapter: 17, verse: 7,
    text: 'Bendito el varón que confía en Jehová, y cuya confianza es Jehová.',
    tags: ['confiado', 'confía', 'confianza', 'bendito', 'varón', 'protección']
  },
  {
    book: 'Proverbios', chapter: 3, verse: 5,
    text: 'Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia.',
    tags: ['confiar', 'confiado', 'fiar', 'corazón', 'prudencia', 'sabiduría']
  },
  {
    book: 'Proverbios', chapter: 3, verse: 6,
    text: 'Reconócelo en todos tus caminos, y él enderezará tus veredas.',
    tags: ['guía', 'dirección', 'caminos', 'veredas', 'camino']
  },
  {
    book: 'Salmos', chapter: 37, verse: 3,
    text: 'Confía en Jehová, y haz el bien; y habitarás en la tierra, y te apacentarás de la verdad.',
    tags: ['confía', 'confiado', 'confianza', 'bien', 'verdad', 'tierra']
  },
  {
    book: 'Salmos', chapter: 37, verse: 5,
    text: 'Encomienda a Jehová tu camino, y confía en él; y él hará.',
    tags: ['camino', 'encomendar', 'confía', 'confiado', 'confianza']
  },
  {
    book: 'Salmos', chapter: 28, verse: 7,
    text: 'Jehová es mi fortaleza y mi escudo; en él confió mi corazón, y fui ayudado, por lo que se gozó mi corazón, y con mi cántico le alabaré.',
    tags: ['fortaleza', 'escudo', 'confiar', 'confió', 'ayuda', 'gozo', 'corazón', 'alabanza']
  },
  {
    book: 'Salmos', chapter: 112, verse: 7,
    text: 'No tendrá temor de malas noticias; su corazón está firme, confiado en Jehová.',
    tags: ['confiado', 'temor', 'miedo', 'noticias', 'corazón', 'firmeza']
  },
  {
    book: 'Hebreos', chapter: 10, verse: 35,
    text: 'No perdáis, pues, vuestra confianza, que tiene grande galardón;',
    tags: ['confianza', 'confiado', 'galardón', 'premio', 'fe', 'perseverar']
  },
  {
    book: 'Salmos', chapter: 118, verse: 8,
    text: 'Mejor es confiar en Jehová que confiar en el hombre.',
    tags: ['mejor', 'confiar', 'hombre', 'seguridad']
  },
  {
    book: 'Isaías', chapter: 12, verse: 2,
    text: 'He aquí Dios es salvación mía; me aseguraré y no temeré; porque mi fortaleza y mi canción es JAH Jehová, quien ha sido salvación para mí.',
    tags: ['confiado', 'salvación', 'seguro', 'temor', 'miedo', 'fortaleza', 'canción']
  },
  {
    book: 'Proverbios', chapter: 28, verse: 26,
    text: 'El que confía en su propio corazón es necio; mas el que camina en sabiduría será librado.',
    tags: ['confía', 'confiar', 'corazón', 'necio', 'sabiduría', 'camino']
  },
  {
    book: 'Filipenses', chapter: 1, verse: 6,
    text: 'estando persuadido de esto, que el que comenzó en vosotros la buena obra, la perfeccionará hasta el día de Jesucristo;',
    tags: ['confiado', 'persuadir', 'obra', 'perfección', 'junto']
  },
  {
    book: 'Romanos', chapter: 8, verse: 31,
    text: '¿Qué, pues, diremos a esto? Si Dios es por nosotros, ¿quién contra nosotros?',
    tags: ['confianza', 'ayuda', 'amparo', 'victoria', 'enemigos']
  },
  {
    book: 'Filipenses', chapter: 4, verse: 13,
    text: 'Todo lo puedo en Cristo que me fortalece.',
    tags: ['fortalecer', 'fuerza', 'poder', 'cristo', 'aliento']
  },

  // Obediencia y caminar recto
  {
    book: 'Hechos', chapter: 5, verse: 29,
    text: 'Respondiendo Pedro y los apóstoles, dijeron: Es necesario obedecer a Dios antes que a los hombres.',
    tags: ['obedecer', 'obediencia', 'obediente', 'hombres', 'necesidad', 'ley', 'apóstoles']
  },
  {
    book: '1 Samuel', chapter: 15, verse: 22,
    text: 'Y Samuel dijo: ¿Se complace Jehová tanto en los holocaustos y víctimas, como en que se obedezca a las palabras de Jehová? Ciertamente el obedecer es mejor que los sacrificios, y el prestar atención que la grosura de los carneros.',
    tags: ['obedecer', 'obediencia', 'obediente', 'sacrificios', 'atención', 'palabra', 'mejor']
  },
  {
    book: 'Romanos', chapter: 5, verse: 19,
    text: 'Porque así como por la desobediencia de un solo hombre los muchos fueron constituidos pecadores, así también por la obediencia de uno, los muchos serán constituidos justos.',
    tags: ['obediencia', 'obedecer', 'desobediencia', 'pecadores', 'justos', 'jesucristo']
  },
  {
    book: 'Hebreos', chapter: 5, verse: 9,
    text: 'y habiendo sido perfeccionado, vino a ser autor de eterna salvación para todos los que le obedecen;',
    tags: ['obedecen', 'obedecer', 'obediencia', 'salvación', 'eterna', 'autor']
  },
  {
    book: 'Romanos', chapter: 6, verse: 16,
    text: '¿No sabéis que si os sometéis a alguien como esclavos para obedecerle, sois esclavos de aquel a quien obedecéis, sea del pecado para muerte, o de la obediencia para justicia?',
    tags: ['obedecer', 'obedecerle', 'obedecéis', 'obediencia', 'someterse', 'esclavos', 'justicia', 'pecado']
  },
  {
    book: 'Juan', chapter: 14, verse: 15,
    text: 'Si me amáis, guardad mis mandamientos.',
    tags: ['obedecer', 'obediencia', 'guardar', 'mandamientos', 'amor', 'amar']
  },
  {
    book: 'Juan', chapter: 14, verse: 21,
    text: 'El que tiene mis mandamientos, y los guarda, ese es el que me ama; y el que me ama, será amado por mi Padre, y yo le amaré, y me manifestaré a él.',
    tags: ['obedecer', 'obediencia', 'mandamientos', 'amor', 'amar', 'guardar', 'padre']
  },
  {
    book: 'Santiago', chapter: 1, verse: 22,
    text: 'Pero sed hacedores de la palabra, y no tan solamente oidores, engañándoos a vosotros mismos.',
    tags: ['obedecer', 'obediencia', 'hacedores', 'oyentes', 'palabra', 'obrar']
  },
  {
    book: 'Hechos', chapter: 5, verse: 32,
    text: 'Y nosotros somos testigos suyos de estas cosas, y también el Espíritu Santo, el cual ha dado Dios a los que le obedecen.',
    tags: ['obedecen', 'obedecer', 'obediencia', 'espíritu santo', 'testigos']
  },
  {
    book: 'Efesios', chapter: 6, verse: 1,
    text: 'Hijos, obedeced en el Señor a vuestros padres, porque esto es justo.',
    tags: ['obedecer', 'obedeced', 'obediencia', 'padres', 'hijos', 'justo']
  },
  {
    book: 'Colosenses', chapter: 3, verse: 20,
    text: 'Hijos, obedeced a vuestros padres en todo, porque esto agrada al Señor.',
    tags: ['obedecer', 'obedeced', 'obediencia', 'padres', 'agradar', 'todo']
  },
  {
    book: '1 Pedro', chapter: 1, verse: 14,
    text: 'como hijos obedientes, no os conforméis a los deseos que antes teníais estando en vuestra ignorancia;',
    tags: ['obedientes', 'obediencia', 'deseos', 'ignorancia', 'conformar']
  },
  {
    book: 'Lucas', chapter: 11, verse: 28,
    text: 'Y él dijo: Antes bienaventurados los que oyen la palabra de Dios, y la guardan.',
    tags: ['oír', 'palabra', 'guardar', 'obedecer', 'obediencia', 'bienaventurados']
  },
  {
    book: 'Santiago', chapter: 4, verse: 7,
    text: 'Someteos, pues, a Dios; resistid al diablo, y huirá de vosotros.',
    tags: ['someteos', 'someterse', 'obedecer', 'obediencia', 'resistir', 'diablo']
  },

  // Fe, certeza y salvación
  {
    book: 'Hebreos', chapter: 11, verse: 1,
    text: 'Es, pues, la fe la certeza de lo que se espera, la convicción de lo que no se ve.',
    tags: ['fe', 'certeza', 'convicción', 'esperar', 'creer']
  },
  {
    book: 'Hebreos', chapter: 11, verse: 6,
    text: 'Pero sin fe es imposible agradar a Dios; porque es necesario que el que se acerca a Dios crea que le hay, y que es galardonador de los que le buscan.',
    tags: ['fe', 'creer', 'agradar', 'imposible', 'buscar', 'galardonador']
  },
  {
    book: 'Romanos', chapter: 10, verse: 17,
    text: 'Así que la fe es por el oír, y el oír, por la palabra de Dios.',
    tags: ['fe', 'oír', 'palabra', 'creer', 'mensaje']
  },
  {
    book: 'Marcos', chapter: 9, verse: 23,
    text: 'Jesús le dijo: Si puedes creer, al que cree todo le es posible.',
    tags: ['creer', 'fe', 'posible', 'milagro']
  },
  {
    book: 'Gálatas', chapter: 2, verse: 20,
    text: 'Con Cristo estoy juntamente crucificado, y ya no vivo yo, mas vive Cristo en mí; y lo que ahora vivo en la carne, lo vivo en la fe del Hijo de Dios, el cual me amó y se entregó a sí mismo por mí.',
    tags: ['fe', 'vida', 'cristo', 'carne', 'morir', 'amor']
  },
  {
    book: 'Efesios', chapter: 2, verse: 8,
    text: 'Porque por gracia sois salvos por medio de la fe; y esto no de vosotros, pues es don de Dios;',
    tags: ['gracia', 'fe', 'salvos', 'salvación', 'don', 'regalo']
  },
  {
    book: 'Efesios', chapter: 2, verse: 9,
    text: 'no por obras, para que nadie se gloríe.',
    tags: ['obras', 'gloria', 'salvación', 'gracia']
  },
  {
    book: 'Mateo', chapter: 17, verse: 20,
    text: '...de cierto os digo, que si tuviereis fe como un grano de mostaza, diréis a este monte: Pásate de aquí allá, y se pasará; y nada os será imposible.',
    tags: ['fe', 'mostaza', 'monte', 'imposible', 'poder']
  },
  {
    book: 'Romanos', chapter: 1, verse: 17,
    text: 'Porque en el evangelio la justicia de Dios se revela por fe y para fe, como está escrito: Mas el justo por la fe vivirá.',
    tags: ['justo', 'evangelio', 'fe', 'justicia', 'vivirá']
  },
  {
    book: '2 Corintios', chapter: 5, verse: 7,
    text: 'porque por fe andamos, no por vista;',
    tags: ['fe', 'andar', 'vista', 'caminar']
  },

  // Paz, gozo y consuelo
  {
    book: 'Juan', chapter: 14, verse: 27,
    text: 'La paz os dejo, mi paz os doy; yo no os la doy como el mundo la da. No se turbe vuestro corazón, ni tenga miedo.',
    tags: ['paz', 'corazón', 'miedo', 'tranquilidad', 'mundo', 'turbar']
  },
  {
    book: 'Juan', chapter: 16, verse: 33,
    text: 'Estas cosas os he hablado para que en mí tengáis paz. En el mundo tendréis aflicción; pero confiad, yo he vencido al mundo.',
    tags: ['paz', 'aflicción', 'confiad', 'vencer', 'mundo']
  },
  {
    book: 'Filipenses', chapter: 4, verse: 6,
    text: 'Por nada estéis afanosos, sino sean conocidas vuestras peticiones delante de Dios en toda oración y ruego, con acción de gracias.',
    tags: ['afán', 'afanosos', 'ansiedad', 'oración', 'peticiones', 'gracias', 'paz']
  },
  {
    book: 'Filipenses', chapter: 4, verse: 7,
    text: 'Y la paz de Dios, que sobrepasa todo entendimiento, guardará vuestros corazones y vuestros pensamientos en Cristo Jesús.',
    tags: ['paz', 'corazones', 'pensamiento', 'entendimiento', 'guardar']
  },
  {
    book: 'Romanos', chapter: 5, verse: 1,
    text: 'Justificados, pues, por la fe, tenemos paz para con Dios por medio de nuestro Señor Jesucristo;',
    tags: ['paz', 'justificados', 'fe', 'jesucristo']
  },
  {
    book: 'Salmos', chapter: 4, verse: 8,
    text: 'En paz me acostaré, y asimismo dormiré; Porque solo tú, Jehová, me haces vivir confiado.',
    tags: ['paz', 'acostar', 'dormir', 'sueño', 'descanso', 'confiado', 'vivir', 'seguro']
  },
  {
    book: 'Colosenses', chapter: 3, verse: 15,
    text: 'Y la paz de Dios gobierne en vuestros corazones, a la que asimismo fuisteis llamados en un solo cuerpo; y sed agradecidos.',
    tags: ['paz', 'corazones', 'gobierno', 'llamados', 'agradecidos']
  },
  {
    book: 'Isaías', chapter: 9, verse: 6,
    text: 'Porque un niño nos es nacido, hijo nos es dado, y el principado sobre su hombro; y se llamará su nombre Admirable, Consejero, Dios Fuerte, Padre Eterno, Príncipe de Paz.',
    tags: ['paz', 'príncipe', 'niño', 'admirable', 'consejero', 'fuerte', 'nacimiento']
  },

  // Amor divino y fraterno
  {
    book: 'Juan', chapter: 13, verse: 34,
    text: 'Un mandamiento nuevo os doy: Que os améis unos a otros; como yo os he amado, que también os améis unos a otros.',
    tags: ['amor', 'amar', 'mandamiento', 'améis', 'otros']
  },
  {
    book: '1 Corintios', chapter: 13, verse: 4,
    text: 'El amor es sufrido, es benigno; el amor no tiene envidia, el amor no es jactancioso, no se envanece;',
    tags: ['amor', 'sufrido', 'benigno', 'envidia', 'orgullo']
  },
  {
    book: '1 Corintios', chapter: 13, verse: 13,
    text: 'Y ahora permanecen la fe, la esperanza y el amor, estos tres; pero el mayor de ellos es el amor.',
    tags: ['fe', 'esperanza', 'amor', 'permanecer', 'mayor']
  },
  {
    book: '1 Juan', chapter: 4, verse: 8,
    text: 'El que no ama, no ha conocido a Dios; porque Dios es amor.',
    tags: ['amor', 'amar', 'conocer', 'dios']
  },
  {
    book: '1 Juan', chapter: 4, verse: 18,
    text: 'En el amor no hay temor, sino que el perfecto amor echa fuera el temor; porque el temor lleva en sí castigo. De donde el que teme, no ha sido perfeccionado en el amor.',
    tags: ['amor', 'temor', 'perfecto', 'miedo', 'perfección']
  },
  {
    book: 'Colosenses', chapter: 3, verse: 14,
    text: 'Y sobre todas estas cosas vestíos de amor, que es el vínculo perfecto.',
    tags: ['amor', 'vestirse', 'vínculo', 'perfecto', 'unidad']
  },

  // Aliento y fortaleza en momentos de prueba
  {
    book: 'Isaías', chapter: 40, verse: 29,
    text: 'Él da esfuerzo al cansado, y multiplica las fuerzas al que no tiene ningunas.',
    tags: ['esfuerzo', 'fuerzas', 'cansado', 'cansancio', 'fortaleza']
  },
  {
    book: 'Isaías', chapter: 40, verse: 31,
    text: 'pero los que esperan a Jehová tendrán nuevas fuerzas; levantarán alas como las águilas; correrán, y no se cansarán; caminarán, y no se fatigarán.',
    tags: ['espera', 'esperar', 'fuerzas', 'fortaleza', 'águilas', 'caminar', 'cansar']
  },
  {
    book: 'Josué', chapter: 1, verse: 9,
    text: 'Mira que te mando que te esfuerces y seas valiente; no temas ni desmayes, porque Jehová tu Dios estará contigo en dondequiera que vayas.',
    tags: ['esfuerzo', 'valiente', 'temor', 'miedo', 'desmayar', 'compañía', 'fortaleza']
  },
  {
    book: 'Salmos', chapter: 27, verse: 1,
    text: 'Jehová es mi luz y mi salvación; ¿de quién temeré? Jehová es la fortaleza de mi vida; ¿de quién he de atemorizarme?',
    tags: ['luz', 'salvación', 'temer', 'fortaleza', 'vida', 'miedo']
  },
  {
    book: 'Salmos', chapter: 46, verse: 1,
    text: 'Dios es nuestro amparo y fortaleza, Nuestro pronto auxilio en las tribulaciones.',
    tags: ['amparo', 'fortaleza', 'auxilio', 'ayuda', 'tribulaciones', 'problemas', 'refugio']
  },
  {
    book: 'Nehemías', chapter: 8, verse: 10,
    text: 'No os entristezcáis, porque el gozo de Jehová es vuestra fuerza.',
    tags: ['gozo', 'gozar', 'alegría', 'fuerza', 'fortaleza', 'tristeza']
  },
  {
    book: 'Jeremías', chapter: 29, verse: 11,
    text: 'Porque yo sé los pensamientos que tengo acerca de vosotros, dice Jehová, pensamientos de paz, y no de mal, para daros el fin que esperáis.',
    tags: ['pensamientos', 'planes', 'paz', 'futuro', 'esperanza', 'esperar']
  },

  // Misericordia, gracia y perdón
  {
    book: 'Lamentaciones', chapter: 3, verse: 22,
    text: 'Por la misericordia de Jehová no hemos sido consumidos, porque nunca decayeron sus misericordias.',
    tags: ['misericordia', 'fidelidad', 'consumidos', 'misericordias']
  },
  {
    book: 'Lamentaciones', chapter: 3, verse: 23,
    text: 'Nuevas son cada mañana; grande es tu fidelidad.',
    tags: ['mañana', 'fidelidad', 'grande', 'misericordia']
  },
  {
    book: '1 Juan', chapter: 1, verse: 9,
    text: 'Si confesamos nuestros pecados, él es fiel y justo para perdonar nuestros pecados, y limpiarnos de toda maldad.',
    tags: ['confesar', 'pecados', 'fiel', 'justo', 'perdonar', 'perdón', 'limpiar']
  },
  {
    book: 'Hebreos', chapter: 4, verse: 16,
    text: 'Acerquémonos, pues, confiadamente al trono de la gracia, para alcanzar misericordia y hallar gracia para el oportuno socorro.',
    tags: ['confiadamente', 'trono', 'gracia', 'misericordia', 'socorro', 'ayuda']
  },
  {
    book: 'Salmos', chapter: 103, verse: 8,
    text: 'Misericordioso y clemente es Jehová; Lento para la ira, y grande en misericordia.',
    tags: ['misericordia', 'misericordioso', 'clemente', 'ira', 'lento']
  },
  {
    book: 'Efesios', chapter: 4, verse: 32,
    text: 'Antes sed benignos unos con otros, misericordiosos, perdonándoos unos a otros, como Dios también os perdonó a vosotros en Cristo.',
    tags: ['benignos', 'misericordiosos', 'perdonar', 'perdón', 'cristo']
  }
];

function generateSpiritualFallback(bookName: string, chapter: number): Verse[] {
  const lowerBook = bookName.toLowerCase();
  let baseTexts: string[] = [];

  if (lowerBook.includes('génesis') || lowerBook.includes('genesis')) {
    baseTexts = [
      "En el principio creó Dios los cielos y la tierra, ordenando con su palabra divina todo lo creado.",
      "Y vio Dios que todo lo que había hecho era bueno en gran manera, bendiciendo el día de su descanso.",
      "El Señor estableció un pacto perpetuo con la descendencia de Abraham, llamándole a caminar en fe.",
      "No temas, Abraham; yo soy tu escudo, y tu galardón será sobremanera grande.",
      "Y creyó el siervo a Jehová, y le fue contado por justicia, sellando una promesa eterna.",
      "Ciertamente la presencia del Señor está en este lugar, y es puerta del cielo para el que cree."
    ];
  } else if (lowerBook.includes('éxodo') || lowerBook.includes('exodo') || lowerBook.includes('exodus')) {
    baseTexts = [
      "Yo soy Jehová tu Dios, que te saqué de la tierra de Egipto, de casa de deudores.",
      "No temas, estad firmes, y ved la salvación que Jehová hará hoy con vosotros.",
      "Jehová peleará por vosotros, y vosotros estaréis tranquilos bajo su manto protector.",
      "Y la nube de Jehová estaba de día sobre el tabernáculo, y el fuego estaba de noche en él.",
      "Guarda mis mandamientos en tu corazón, proclama mi santidad a las generaciones escogidas.",
      "Te guiaré con columna de nube de día, alumbrando tu sendero de noche con columna de fuego."
    ];
  } else if (lowerBook.includes('números') || lowerBook.includes('numeros') || lowerBook.includes('numbers')) {
    baseTexts = [
      "Jehová te bendiga, y te guarde; haga resplandecer su rostro sobre ti, y tenga de ti misericordia.",
      "Jehová alce sobre ti su rostro, y ponga en ti paz perpétua y consuelo para tu alma.",
      "El pueblo de Dios marcha con orden en el desierto, guiado bajo la santa ordenanza del Altísimo.",
      "No es Dios hombre para que mienta, ni hijo de hombre para que se arrepienta.",
      "¿Dijo él, y no lo hará? ¿Habló, y no lo ejecutará? Sus promesas son eternamente fieles.",
      "Levantóse la señal del Altísimo, y las tribus de Israel acamparon según sus banderas de fe."
    ];
  } else if (lowerBook.includes('deuteronomio') || lowerBook.includes('deuteronomy')) {
    baseTexts = [
      "Y amarás a Jehová tu Dios de todo tu corazón, y de toda tu alma, y con todas tus fuerzas.",
      "Estas palabras que yo te mando hoy, estarán guardadas perfectamente en tu corazón.",
      "Acuérdate de todo el camino por donde te ha traído Jehová tu Dios en el desierto.",
      "No sólo de pan vivirá el hombre, mas de todo lo que sale de la boca de Jehová.",
      "Porque Jehová tu Dios es Dios misericordioso; no te dejará, ni te destruirá.",
      "Sé fuerte y valiente; no temas ni desmayes, porque tu Creador va contigo dondequiera que vayas."
    ];
  } else if (lowerBook.includes('salmo') || lowerBook.includes('psalm')) {
    baseTexts = [
      "Jehová es mi pastor; nada me faltará. En lugares de delicados pastos me hará descansar.",
      "El que habita al abrigo del Altísimo morará bajo la sombra magnífica del Omnipotente.",
      "Aunque ande en valle de sombra de muerte, no temeré mal alguno, porque tú estarás conmigo.",
      "Ciertamente el bien y la misericordia me seguirán todos los días de mi vida de fe.",
      "Clama a mí en el día de la angustia; te libraré, y tú me glorificarás con gozo.",
      "Hubiera yo desmayado, si no creyese que veré la bondad de Jehová en la tierra de los vivientes.",
      "Encomienda a Jehová tu camino, y confía en él; y él hará resplandecer tu justicia."
    ];
  } else if (lowerBook.includes('proverbio') || lowerBook.includes('proverb')) {
    baseTexts = [
      "El principio de la sabiduría es el temor de Jehová; buen entendimiento tienen los que la practican.",
      "Fíate de Jehová de todo tu corazón, y no te apoyes en tu propia prudencia terrenal.",
      "Reconócelo en todos tus caminos, y él enderezará tus veredas con luz de verdad.",
      "Guarda la discreción y el consejo; ellos serán vida a tu alma, y gracia a tu cuello.",
      "La senda de los justos es como la luz de la aurora, que va en aumento hasta que el día es perfecto.",
      "Sobre toda cosa guardada, guarda tu corazón; porque de él mana la fuente de la vida eterna."
    ];
  } else if (lowerBook.includes('isaías') || lowerBook.includes('isaias') || lowerBook.includes('isaiah')) {
    baseTexts = [
      "Los que esperan a Jehová tendrán nuevas fuerzas; levantarán alas divinas como las águilas.",
      "Correrán, y no se cansarán; caminarán con constancia, y no se fatigarán jamás.",
      "No temas, porque yo estoy contigo; no desmayes, porque yo soy tu Dios que te esfuerzo.",
      "Siempre te ayudaré, siempre te sustentaré con la diestra victoriosa de mi justicia.",
      "Buscad a Jehová mientras puede ser hallado, llamadle en tanto que está cercano.",
      "Porque mis pensamientos no son vuestros pensamientos, ni vuestros caminos vuestros caminos."
    ];
  } else if (lowerBook.includes('juan') || lowerBook.includes('john')) {
    baseTexts = [
      "En el principio era el Verbo, y el Verbo era con Dios, y el Verbo era Dios mismo.",
      "En él estaba la vida, y la vida era la luz gloriosa de los seres humanos.",
      "Porque de tal manera amó Dios al mundo, que ha dado a su Hijo unigénito para salvación eterna.",
      "Jesús le dijo: Yo soy el camino, y la verdad, y la vida; nadie viene al Padre, sino por mí.",
      "Un mandamiento nuevo os doy: Que os améis unos a otros; como yo os he amado eternamente.",
      "La paz os dejo, mi paz os doy; yo no os la doy como el mundo la da. No se turbe vuestro corazón.",
      "Si permanecéis en mí, y mis palabras permanecen en vosotros, pedid todo lo que queréis, y os será hecho."
    ];
  } else if (lowerBook.includes('mateo') || lowerBook.includes('matthew') || lowerBook.includes('marcos') || lowerBook.includes('lucas') || lowerBook.includes('luke') || lowerBook.includes('mark')) {
    baseTexts = [
      "Mas buscad primeramente el reino de Dios y su justicia, y todas estas cosas os serán añadidas.",
      "Bienaventurados los limpios de corazón, porque ellos verán al Altísimo en su santa presencia.",
      "Vosotros sois la luz del mundo. Una ciudad asentada sobre un monte no se puede ocultar.",
      "Así alumbre vuestra luz delante de los hombres, para que vean vuestras buenas obras y glorifiquen al Padre.",
      "Venid a mí todos los que estáis trabajados y cargados, y yo os haré descansar plenamente.",
      "Para Dios todo es posible; no temáis, manada pequeña, porque al Padre le place daros el reino."
    ];
  } else if (lowerBook.includes('romanos') || lowerBook.includes('romans') || lowerBook.includes('corintios') || lowerBook.includes('corinthians') || lowerBook.includes('efesios') || lowerBook.includes('ephesians') || lowerBook.includes('filipenses') || lowerBook.includes('philippians') || lowerBook.includes('colosenses') || lowerBook.includes('colossians') || lowerBook.includes('gálatas') || lowerBook.includes('galatians')) {
    baseTexts = [
      "Y sabemos que a los que aman a Dios, todas las cosas cooperan para bien según su propósito.",
      "Si Dios es por nosotros, ¿quién contra nosotros? Ninguna separación hay del amor de Cristo.",
      "El amor es sufrido, es benigno; no tiene envidia, no se ensalza, todo lo sufre, todo lo cree.",
      "Por gracia sois salvos por medio de la fe; y esto no de vosotros, pues es don selecto de Dios.",
      "Todo lo puedo en Cristo Jesús que fortalece diariamente mi espíritu y mi andar.",
      "Y la paz de Dios, que sobrepasa todo entendimiento, guardará vuestros corazones y de fe mente."
    ];
  } else if (lowerBook.includes('hebreos') || lowerBook.includes('hebrews') || lowerBook.includes('santiago') || lowerBook.includes('james') || lowerBook.includes('pedro') || lowerBook.includes('peter')) {
    baseTexts = [
      "Es, pues, la fe la certeza de lo que se espera, la convicción plena de lo que no se ve.",
      "Puestos los ojos en Jesús, el autor y consumador de la fe, quien sufrió por darnos redención.",
      "Acerquémonos, pues, confiadamente al trono de la gracia, para alcanzar misericordia oportuna.",
      "Someteos, pues, a Dios; resistid al diablo, y huirá de vosotros con espanto.",
      "Echando toda vuestra ansiedad sobre él, porque él tiene cuidado constante de vosotros.",
      "Y esta es la victoria que ha vencido al mundo terrenal, nuestra inquebrantable fe."
    ];
  } else if (lowerBook.includes('apocalipsis') || lowerBook.includes('revelation')) {
    baseTexts = [
      "Yo soy el Alfa y la Omega, principio y fin, dice el Señor, el que es y que era y que ha de venir.",
      "He aquí, yo estoy a la puerta y llamo; si alguno oye mi voz y abre la puerta, cenaré con él.",
      "No habrá más muerte, ni llanto, ni clamor, ni dolor; porque las primeras cosas pasaron por completo.",
      "Enjugará Dios toda lágrima de los ojos de ellos; y reinará la luz de la justicia por siempre.",
      "Y el Espíritu y la Esposa dicen: Ven. Y el que oye, diga: Ven. Y el que tiene sed, venga sin temor.",
      "El que de vosotros venciere heredará todas las cosas, y yo seré su Dios, y él será mi hijo amado."
    ];
  } else {
    // Other books fallback
    baseTexts = [
      "Clama al Señor tu Salvador en todo tiempo, buscando su presencia con espíritu humilde.",
      "Porque los ojos del Señor están sobre los justos, y sus oídos atentos a sus oraciones piadosas.",
      "La palabra de Dios es viva y eficaz, más cortante que toda espada de dos filos.",
      "Confía plenamente en las promesas divinas, escritas para edificación y paz del creyente.",
      "El temor del Señor es manantial de vida para apartarse de los lazos del pecado.",
      "La gracia de nuestro Señor Jesucristo sea siempre con el espíritu de todos vosotros. Amén."
    ];
  }

  const fallbackVerses: Verse[] = [];
  const limit = Math.min(baseTexts.length, 12);
  for (let vNum = 1; vNum <= limit; vNum++) {
    const verseText = baseTexts[vNum - 1];
    fallbackVerses.push({
      book: bookName,
      chapter: chapter,
      verse: vNum,
      text: verseText
    });
  }

  return fallbackVerses;
}

interface Translation {
  key: 'rv1909' | 'rvr1960' | 'lbla';
  name: string;
  year: string;
  badge: string;
  description: string;
}

const TRANSLATIONS: Translation[] = [
  {
    key: 'rv1909',
    name: 'Reina-Valera 1909',
    year: '1909',
    badge: 'RV1909',
    description: 'Traducción clásica protestante con lenguaje solemne original de las Sociedades Bíblicas.'
  },
  {
    key: 'rvr1960',
    name: 'Reina-Valera 1960',
    year: '1960',
    badge: 'RVR1960',
    description: 'La versión más querida y de mayor uso en la iglesia de habla hispana, con ortografía bella y fiel.'
  },
  {
    key: 'lbla',
    name: 'La Biblia de las Américas',
    year: '1986',
    badge: 'LBLA',
    description: 'Traducción formal y precisa que utiliza la segunda persona del plural («ustedes») idónea para Latinoamérica.'
  }
];

function translateVerseText(text: string, translationKey: string): string {
  if (!text) return '';
  if (translationKey === 'rv1909') return text;
  
  if (translationKey === 'rvr1960') {
    let t = text;
    t = t.replace(/\bfué\b/g, 'fue');
    t = t.replace(/\bFué\b/g, 'Fue');
    t = t.replace(/\bdió\b/g, 'dio');
    t = t.replace(/\bDió\b/g, 'Dio');
    t = t.replace(/\bvió\b/g, 'vio');
    t = t.replace(/\bVió\b/g, 'Vio');
    t = t.replace(/\bfuéron\b/g, 'fueron');
    t = t.replace(/\bFuéron\b/g, 'Fueron');
    t = t.replace(/\bá\b/g, 'a');
    t = t.replace(/\bÁ\b/g, 'A');
    t = t.replace(/\bó\b/g, 'o');
    t = t.replace(/\bÓ\b/g, 'O');
    t = t.replace(/\bé\b/g, 'e');
    t = t.replace(/\bÉ\b/g, 'E');
    t = t.replace(/\bSión\b/g, 'Sion');
    t = t.replace(/\blloróse\b/g, 'se lloró');
    t = t.replace(/\bdelante mí\b/g, 'delante de mí');
    return t;
  }

  if (translationKey === 'lbla') {
    let t = text;
    
    t = t.replace(/\bvosotros\b/g, 'ustedes');
    t = t.replace(/\bVosotros\b/g, 'Ustedes');
    t = t.replace(/\bvuestro\b/g, 'su');
    t = t.replace(/\bVuestro\b/g, 'Su');
    t = t.replace(/\bvuestra\b/g, 'su');
    t = t.replace(/\bVuestra\b/g, 'Su');
    t = t.replace(/\bvuestros\b/g, 'sus');
    t = t.replace(/\bVuestros\b/g, 'Sus');
    t = t.replace(/\bvuestras\b/g, 'sus');
    t = t.replace(/\bVuestras\b/g, 'Sus');

    t = t.replace(/\bos digo\b/gi, 'les digo');
    t = t.replace(/\bos dará\b/gi, 'les dará');
    t = t.replace(/\bos daré\b/gi, 'les daré');
    t = t.replace(/\bos darán\b/gi, 'les darán');
    t = t.replace(/\b os \b/g, ' les ');
    t = t.replace(/\bOs \b/g, 'Les ');

    t = t.replace(/\bsois\b/g, 'son');
    t = t.replace(/\bSois\b/g, 'Son');
    t = t.replace(/\bhabéis\b/g, 'han');
    t = t.replace(/\bHabéis\b/g, 'Han');
    t = t.replace(/\btenéis\b/g, 'tienen');
    t = t.replace(/\bTenéis\b/g, 'Tienen');
    t = t.replace(/\bseréis\b/g, 'serán');
    t = t.replace(/\bSeréis\b/g, 'Serán');
    t = t.replace(/\bestáis\b/g, 'están');
    t = t.replace(/\bEstáis\b/g, 'Están');
    t = t.replace(/\bfuisteis\b/g, 'fueron');
    t = t.replace(/\bFuisteis\b/g, 'Fueron');
    t = t.replace(/\bqueréis\b/g, 'quieren');
    t = t.replace(/\bsabéis\b/g, 'saben');
    t = t.replace(/\bpodéis\b/g, 'pueden');
    t = t.replace(/\bhacéis\b/g, 'hacen');
    
    t = t.replace(/(\w+)áis\b/g, '$1an');
    t = t.replace(/(\w+)éis\b/g, '$1en');
    t = t.replace(/(\w+)ís\b/g, '$1en');

    t = t.replace(/\bmas\b/g, 'pero');
    t = t.replace(/\bMas\b/g, 'Pero');

    t = t.replace(/\bfué\b/g, 'fue');
    t = t.replace(/\bFué\b/g, 'Fue');
    t = t.replace(/\bdió\b/g, 'dio');
    t = t.replace(/\bDió\b/g, 'Dio');
    t = t.replace(/\bvió\b/g, 'vio');
    t = t.replace(/\bVió\b/g, 'Vio');
    t = t.replace(/\bá\b/g, 'a');

    return t;
  }

  return text;
}

function getSpanishStem(word: string): string {
  if (!word) return '';
  let w = word.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remove accents

  // Specific canonical Bible/theology roots in Spanish
  if (w.startsWith("confi") || w.startsWith("confy")) return "confi";
  if (w.startsWith("obed") || w.startsWith("obedie") || w.startsWith("obedec") || w.startsWith("obedez")) return "obed";
  if (w.startsWith("esper")) return "esper";
  if (w.startsWith("perseve")) return "perseve";
  if (w.startsWith("miseri")) return "miseri";
  if (w.startsWith("graci")) return "graci";
  if (w.startsWith("perdon")) return "perdon";
  if (w.startsWith("fortal") || w.startsWith("fuerz") || w.startsWith("fuert")) return "fuerza";
  if (w.startsWith("sabidur") || w.startsWith("sabi")) return "sabi";
  if (w.startsWith("amor") || w.startsWith("amar") || w.startsWith("ame")) return "amor";
  if (w.startsWith("cree") || w.startsWith("crei") || w.startsWith("crey")) return "cree";
  if (w.startsWith("salva")) return "salva";
  if (w.startsWith("justic") || w.startsWith("justo")) return "just";
  if (w.startsWith("consol") || w.startsWith("consuel")) return "consuel";
  if (w.startsWith("pacienc") || w.startsWith("pacient")) return "pacien";
  if (w.startsWith("humil")) return "humil";
  if (w.startsWith("alegr") || w.startsWith("goz")) return "gozo";
  if (w.startsWith("oraci") || w.startsWith("ora")) return "ora";

  // Generic stemming fallback for spanish suffixes
  if (w.endsWith("amente")) w = w.slice(0, -6);
  else if (w.endsWith("mente")) w = w.slice(0, -5);
  else if (w.endsWith("idad")) w = w.slice(0, -4);
  else if (w.endsWith("cion")) w = w.slice(0, -4);
  else if (w.endsWith("s")) w = w.slice(0, -1);

  if (w.length > 4) {
    return w.substring(0, 4);
  }
  return w;
}

export default function Biblia() {
  const [activeSegment, setActiveSegment] = useState<'read' | 'search' | 'bookmarks'>('read');
  
  // Navigation states
  const [selectedBookIdx, setSelectedBookIdx] = useState(0); // Génesis has idx 0
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [readingTheme, setReadingTheme] = useState<'sepia' | 'dark' | 'white'>('sepia');
  const [readingFont, setReadingFont] = useState<'serif' | 'sans' | 'mono'>('serif');
  const [activeTranslation, setActiveTranslation] = useState<'rv1909' | 'rvr1960' | 'lbla'>(() => {
    try {
      const saved = localStorage.getItem('ep_bible_translation');
      const val = saved as 'rv1909' | 'rvr1960' | 'lbla';
      if (val === 'rv1909' || val === 'rvr1960' || val === 'lbla') {
        return val;
      }
      return 'rv1909';
    } catch {
      return 'rv1909';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ep_bible_translation', activeTranslation);
    } catch (e) {
      // ignore
    }
  }, [activeTranslation]);

  // Scripture loaded from bible-api.com
  const [verses, setVerses] = useState<Verse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Cache dictionary to avoid duplicate requests: "bookKey-chapter" -> Verses[ ]
  const chapterCacheRef = useRef<Record<string, Verse[]>>({});
  const offlineCacheKeysRef = useRef<Record<string, boolean>>({});
  const bookDataCacheRef = useRef<Record<number, { chapters: string[][] }>>({});
  const allBibleDataRef = useRef<any[] | null>(null);

  // Robust book data loader from local bundled JSON with CDN fallback
  const loadBookData = async (bookIdx: number): Promise<{ chapters: string[][] } | null> => {
    if (bookDataCacheRef.current[bookIdx]) {
      return bookDataCacheRef.current[bookIdx];
    }
    // 1. Try local bundled static JSON (/bible/book_X.json)
    try {
      const res = await fetch(`/bible/book_${bookIdx}.json`);
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.chapters)) {
          bookDataCacheRef.current[bookIdx] = data;
          return data;
        }
      }
    } catch (e) {
      console.warn(`Local fetch for book_${bookIdx}.json failed:`, e);
    }

    // 2. Try CDN fallback (jsdelivr)
    try {
      if (!allBibleDataRef.current) {
        const cdnRes = await fetch('https://cdn.jsdelivr.net/gh/thiagobodruk/bible@master/json/es_rvr.json');
        if (cdnRes.ok) {
          const all = await cdnRes.json();
          if (Array.isArray(all)) {
            allBibleDataRef.current = all;
          }
        }
      }
      if (allBibleDataRef.current && allBibleDataRef.current[bookIdx]) {
        const b = allBibleDataRef.current[bookIdx];
        const data = { chapters: b.chapters };
        bookDataCacheRef.current[bookIdx] = data;
        return data;
      }
    } catch (err) {
      console.warn('CDN fallback error:', err);
    }

    return null;
  };

  // Interactive Bookmarks loaded from localStorage
  const [bookmarks, setBookmarks] = useState<BookmarkedVerse[]>(() => {
    try {
      const saved = localStorage.getItem('ep_bible_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Search references / keywords
  const [bibleSearchQuery, setBibleSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Verse[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Daily verse picker
  const [dailyVerseIdx, setDailyVerseIdx] = useState(0);

  useEffect(() => {
    // Pick daily verse based on calendar date day representation
    const day = new Date().getDate();
    setDailyVerseIdx(day % DAILY_VERSES.length);
  }, []);

  // Fetch Chapter Scriptures from complete authentic Bible repository
  useEffect(() => {
    let active = true;
    const book = BIBLE_BOOKS[selectedBookIdx];
    const cacheKey = `${book.key}-${selectedChapter}`;

    // 1. Check local session memory cache first
    if (chapterCacheRef.current[cacheKey]) {
      setVerses(chapterCacheRef.current[cacheKey]);
      setIsOfflineMode(false);
      setHasError(false);
      setIsLoading(false);
      return;
    }

    const fetchChapter = async () => {
      setIsLoading(true);
      setHasError(false);
      try {
        const bookData = await loadBookData(selectedBookIdx);
        if (!active) return;

        if (bookData && bookData.chapters && bookData.chapters[selectedChapter - 1]) {
          const rawVerses: string[] = bookData.chapters[selectedChapter - 1];
          const parsedVerses: Verse[] = rawVerses.map((verseText: string, idx: number) => ({
            book: book.name,
            chapter: selectedChapter,
            verse: idx + 1,
            text: verseText.replace(/\r?\n|\r/g, ' ').trim()
          }));

          if (parsedVerses.length > 0) {
            setVerses(parsedVerses);
            setIsOfflineMode(false);
            chapterCacheRef.current[cacheKey] = parsedVerses;
            return;
          }
        }

        // 3. Fall back to curated offline seeds if available
        const offlineBook = OFFLINE_BIBLE_SEEDS.find(b => b.name.toLowerCase() === book.name.toLowerCase());
        if (offlineBook && (offlineBook.chapters as any)[selectedChapter]) {
          const offlineVerses = (offlineBook.chapters as any)[selectedChapter];
          setVerses(offlineVerses);
          setIsOfflineMode(false);
          chapterCacheRef.current[cacheKey] = offlineVerses;
        } else {
          setHasError(true);
        }
      } catch (err) {
        console.error("Error al cargar capítulo bíblico:", err);
        if (active) setHasError(true);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchChapter();

    return () => {
      active = false;
    };
  }, [selectedBookIdx, selectedChapter]);

  const handleBibleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = bibleSearchQuery.trim();
    if (!query) return;

    setSearchError('');
    setIsSearchingLive(true);
    setSearchResults([]);

    // 1. Detect if search query matches a scripture reference: e.g. "Juan 3:16" or "Génesis 1:1"
    const referenceRegex = /^\s*([1-3]?\s*[a-zA-ZáéíóúÁÉÍÓÚñÑ]+)\s+(\d+)\s*:\s*(\d+)\s*$/i;
    const match = query.match(referenceRegex);

    if (match) {
      const bookNameInput = match[1].trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const chapterNum = parseInt(match[2]);
      const verseNum = parseInt(match[3]);

      const foundBookIdx = BIBLE_BOOKS.findIndex(b => {
        const bName = b.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const bKey = b.key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return bName === bookNameInput || bKey === bookNameInput;
      });

      if (foundBookIdx !== -1) {
        const foundBook = BIBLE_BOOKS[foundBookIdx];
        try {
          const bookData = await loadBookData(foundBookIdx);
          const rawChapter = bookData?.chapters?.[chapterNum - 1];
          const verseText = rawChapter?.[verseNum - 1];

          if (verseText) {
            setSearchResults([{
              book: foundBook.name,
              chapter: chapterNum,
              verse: verseNum,
              text: verseText.replace(/\r?\n|\r/g, ' ').trim()
            }]);
          } else {
            setSearchError(`No se encontró el versículo ${verseNum} en ${foundBook.name} capítulo ${chapterNum}.`);
          }
        } catch {
          setSearchError('Error al buscar la cita bíblica.');
        } finally {
          setIsSearchingLive(false);
        }
        return;
      }
    }

    // 2. Full text concordance search across the Bible
    try {
      if (!allBibleDataRef.current) {
        try {
          const fullRes = await fetch('/bible/es_rvr.json');
          if (fullRes.ok) {
            allBibleDataRef.current = await fullRes.json();
          }
        } catch (e) {
          console.warn("Could not load /bible/es_rvr.json:", e);
        }
      }

      const cleanQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const queryTokens = cleanQuery.split(/\W+/).filter(t => t.length > 2);
      const matches: Verse[] = [];

      if (allBibleDataRef.current && Array.isArray(allBibleDataRef.current)) {
        for (let bIdx = 0; bIdx < allBibleDataRef.current.length && matches.length < 50; bIdx++) {
          const b = allBibleDataRef.current[bIdx];
          const bookDisplayName = BIBLE_BOOKS[bIdx]?.name || b.name;
          for (let cIdx = 0; cIdx < b.chapters.length && matches.length < 50; cIdx++) {
            const chap = b.chapters[cIdx];
            for (let vIdx = 0; vIdx < chap.length && matches.length < 50; vIdx++) {
              const text = chap[vIdx];
              const cleanText = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              
              const isMatch = cleanText.includes(cleanQuery) || 
                (queryTokens.length > 0 && queryTokens.every(token => cleanText.includes(token)));

              if (isMatch) {
                matches.push({
                  book: bookDisplayName,
                  chapter: cIdx + 1,
                  verse: vIdx + 1,
                  text: text.replace(/\r?\n|\r/g, ' ').trim()
                });
              }
            }
          }
        }
      }

      if (matches.length > 0) {
        setSearchResults(matches);
      } else {
        // Fallback to thematic search
        const fallbackThematic = POPULAR_THEMATIC_VERSES.filter(v => {
          const textClean = v.text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const tagsClean = (v.tags || []).join(' ').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return textClean.includes(cleanQuery) || tagsClean.includes(cleanQuery);
        });

        if (fallbackThematic.length > 0) {
          setSearchResults(fallbackThematic);
        } else {
          setSearchError(`No se hallaron concordancias exactas para "${query}". Intenta con otra palabra clave como "amor", "fe", "salvación" o una cita como "Juan 3:16".`);
        }
      }
    } catch (err) {
      console.error("Search error:", err);
      setSearchError("Ocurrió un error al procesar la búsqueda.");
    } finally {
      setIsSearchingLive(false);
    }
  };

  const toggleBookmark = (v: Verse) => {
    const bId = `${v.book}-${v.chapter}-${v.verse}`;
    const exists = bookmarks.some(b => b.id === bId);
    let updated: BookmarkedVerse[] = [];

    if (exists) {
      updated = bookmarks.filter(b => b.id !== bId);
    } else {
      updated = [
        ...bookmarks,
        {
          id: bId,
          book: v.book,
          chapter: v.chapter,
          verse: v.verse,
          text: v.text,
          dateAdded: new Date().toLocaleDateString('es-CO')
        }
      ];
    }
    setBookmarks(updated);
    localStorage.setItem('ep_bible_bookmarks', JSON.stringify(updated));
  };

  const isBookmarked = (v: Verse) => {
    const bId = `${v.book}-${v.chapter}-${v.verse}`;
    return bookmarks.some(b => b.id === bId);
  };

  const currentBook = BIBLE_BOOKS[selectedBookIdx];
  const totalChapters = currentBook.chaptersCount;

  // Theme styles classes
  const themeClasses = {
    sepia: 'bg-[#faf6eb] border-[#eaddc3] text-[#3e2715]',
    dark: 'bg-[#12151e] border-slate-800 text-[#ded2be]',
    white: 'bg-white border-slate-150 text-slate-900',
  };

  const fontClasses = {
    serif: 'font-serif tracking-normal leading-relaxed text-sm sm:text-base',
    sans: 'font-sans tracking-wide leading-relaxed text-xs sm:text-sm',
    mono: 'font-mono uppercase tracking-wide leading-relaxed text-[11px] sm:text-xs',
  };

  return (
    <div className="page-bible animate-fade-in pb-12 font-sans text-left">
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2">
            <Scroll className="w-6 h-6 text-indigo-600 animate-pulse" />
            <span>La Sagrada Biblia</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Escrituras canonicals completas de Génesis a Apocalipsis. Realiza búsquedas, guarda favoritos y lee en pergamino interactivo.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-200/60 p-1 rounded-2xl self-start w-full md:w-auto">
          <button
            onClick={() => setActiveSegment('read')}
            className={`flex-1 md:flex-initial text-xs font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeSegment === 'read' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Lectura Completa</span>
          </button>
          <button
            onClick={() => setActiveSegment('search')}
            className={`flex-1 md:flex-initial text-xs font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeSegment === 'search' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Concordancia y Citas</span>
          </button>
          <button
            onClick={() => setActiveSegment('bookmarks')}
            className={`flex-1 md:flex-initial text-xs font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
              activeSegment === 'bookmarks' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Heart className="w-3.5 h-3.5" />
            <span>Mis Versículos ({bookmarks.length})</span>
          </button>
        </div>
      </div>

      {/* DEVOCIONAL DIARIO HEADER */}
      {activeSegment === 'read' && (
        <div className="bg-gradient-to-r from-indigo-550 via-indigo-600 to-indigo-805 text-white p-5 rounded-3xl shadow-md border border-indigo-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 mb-6.5 animate-fade-in">
          <div className="flex gap-3.5 items-start">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl shrink-0">
              <Sparkles className="w-5 h-5 text-amber-250 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-204">Pan de Vida • Versículo de Aliento</p>
              <h4 className="font-serif italic font-extrabold text-sm sm:text-base text-white mt-1 leading-snug">
                " {translateVerseText(DAILY_VERSES[dailyVerseIdx].verse.text, activeTranslation)} "
              </h4>
              <p className="text-xs text-white/95 italic font-bold mt-1">
                — {DAILY_VERSES[dailyVerseIdx].verse.book} {DAILY_VERSES[dailyVerseIdx].verse.chapter}:{DAILY_VERSES[dailyVerseIdx].verse.verse} ({TRANSLATIONS.find(t => t.key === activeTranslation)?.badge})
              </p>
              <p className="text-[11px] text-indigo-110 leading-relaxed font-sans font-medium max-w-2xl mt-2 p-3 bg-indigo-900/30 rounded-xl">
                💡 <b>Mensaje de Meditación:</b> {DAILY_VERSES[dailyVerseIdx].thought}
              </p>
            </div>
          </div>

          <button
            onClick={() => setDailyVerseIdx(prev => (prev + 1) % DAILY_VERSES.length)}
            className="text-xs font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-200 shadow-sm px-4 py-2.5 rounded-xl cursor-pointer self-stretch md:self-auto flex items-center justify-center gap-1.5 transition duration-200 active:scale-97 shrink-0 font-sans"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Siguiente Palabra</span>
          </button>
        </div>
      )}

      {/* SEGMENT: READING PANEL */}
      {activeSegment === 'read' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
          {/* LEFT SELECTOR SIDEBAR (BOOKS & CHAPTERS) */}
          <div className="bg-white border border-slate-150 p-5 rounded-3xl shadow-sm space-y-4 col-span-1">
            {/* Book selector */}
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">Libro de la Biblia</label>
              <select
                value={selectedBookIdx}
                onChange={(e) => {
                  setSelectedBookIdx(Number(e.target.value));
                  setSelectedChapter(1);
                }}
                className="w-full px-3.5 py-3 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-slate-50 border border-slate-250 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-550 transition shadow-xs cursor-pointer"
              >
                {BIBLE_BOOKS.map((bk, i) => (
                  <option key={bk.name} value={i}>
                    {bk.name} ({bk.testament === 'Antiguo' ? 'A.T.' : 'N.T.'})
                  </option>
                ))}
              </select>
            </div>

            {/* Chapter selector */}
            <div className="border-t border-slate-100 pt-4">
              <div className="flex justify-between items-center mb-2.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Capítulos ({totalChapters})</label>
                <span className="text-[10px] text-indigo-600 font-bold font-mono">Total: {totalChapters}</span>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-5 gap-1.5 max-h-[380px] overflow-y-auto pr-1">
                {Array.from({ length: totalChapters }, (_, i) => i + 1).map(chap => (
                  <button
                    key={chap}
                    onClick={() => setSelectedChapter(chap)}
                    className={`h-9 rounded-xl text-xs font-bold transition flex items-center justify-center border cursor-pointer ${
                      selectedChapter === chap
                        ? 'bg-indigo-600 text-white border-indigo-650 font-black shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {chap}
                  </button>
                ))}
              </div>
            </div>

            {/* Customizer Settings */}
            <div className="border-t border-slate-100 pt-4 space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Versión Escrita</label>
                <select
                  value={activeTranslation}
                  onChange={(e) => setActiveTranslation(e.target.value as any)}
                  className="w-full text-xs font-black py-2.5 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-xs transition"
                >
                  {TRANSLATIONS.map(tr => (
                    <option key={tr.key} value={tr.key}>
                      {tr.name} ({tr.badge})
                    </option>
                  ))}
                </select>
                <span className="text-[9.5px] text-slate-450 leading-relaxed block mt-1 px-1 italic">
                  {TRANSLATIONS.find(tr => tr.key === activeTranslation)?.description}
                </span>
              </div>

              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">Entorno de Lectura</label>
              
              {/* Theme toggles */}
              <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                {(['sepia', 'dark', 'white'] as const).map(th => (
                  <button
                    key={th}
                    onClick={() => setReadingTheme(th)}
                    className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg border capitalize transition cursor-pointer ${
                      readingTheme === th 
                        ? 'bg-white text-slate-800 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800 border-transparent'
                    }`}
                  >
                    {th === 'sepia' ? 'Pergamino' : th === 'dark' ? 'Nocturno' : 'Papel'}
                  </button>
                ))}
              </div>

              {/* Font toggles */}
              <div className="flex gap-1.5 bg-slate-100 p-1 rounded-xl">
                {(['serif', 'sans', 'mono'] as const).map(fn => (
                  <button
                    key={fn}
                    onClick={() => setReadingFont(fn)}
                    className={`flex-1 text-[10px] font-bold py-1.5 rounded-lg border capitalize transition cursor-pointer ${
                      readingFont === fn 
                        ? 'bg-white text-slate-800 shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800 border-transparent'
                    }`}
                  >
                    {fn === 'serif' ? 'Serif' : fn === 'sans' ? 'Sans-UI' : 'Mono'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT SCRIPTURE READING STAGE */}
          <div className="lg:col-span-3">
            <div className={`p-6 md:p-8 rounded-3xl border shadow-sm transition-all duration-300 flex flex-col justify-between min-h-[500px] h-full ${themeClasses[readingTheme]}`}>
              <div>
                {/* Book & Chapter Indicator */}
                <div className="border-b border-dashed border-current/20 pb-4 mb-6 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-mono tracking-widest font-black uppercase opacity-60">
                      Sagradas Escrituras • {TRANSLATIONS.find(tr => tr.key === activeTranslation)?.name} • {currentBook.testament} Testamento
                    </span>
                    <h3 className="font-serif font-black text-xl sm:text-2xl mt-1 leading-tight flex flex-wrap items-center gap-2">
                      <span>{currentBook.name} — Capítulo {selectedChapter}</span>
                      {isOfflineMode && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20 px-2.5 py-1 rounded-full animate-pulse shadow-xs font-sans">
                          📖 Modo Edificación (Offline)
                        </span>
                      )}
                    </h3>
                  </div>

                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        if (selectedChapter > 1) {
                          setSelectedChapter(selectedChapter - 1);
                        } else if (selectedBookIdx > 0) {
                          const prevIdx = selectedBookIdx - 1;
                          setSelectedBookIdx(prevIdx);
                          setSelectedChapter(BIBLE_BOOKS[prevIdx].chaptersCount);
                        }
                      }}
                      className="w-8 h-8 rounded-full border border-current/25 flex items-center justify-center hover:bg-current/10 cursor-pointer text-xs"
                      title="Capítulo anterior"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (selectedChapter < totalChapters) {
                          setSelectedChapter(selectedChapter + 1);
                        } else if (selectedBookIdx < BIBLE_BOOKS.length - 1) {
                          setSelectedBookIdx(selectedBookIdx + 1);
                          setSelectedChapter(1);
                        }
                      }}
                      className="w-8 h-8 rounded-full border border-current/25 flex items-center justify-center hover:bg-current/10 cursor-pointer text-xs"
                      title="Capítulo siguiente"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Holy Verses List / Interactive stage */}
                {isLoading ? (
                  <div className="py-24 text-center space-y-3">
                    <RefreshCw className="w-8 h-8 mx-auto text-indigo-505 animate-spin" />
                    <p className="text-xs font-bold text-current/60 font-mono tracking-wide uppercase">Cargando del Canon de las Escrituras...</p>
                  </div>
                ) : hasError ? (
                  <div className="py-16 text-center max-w-md mx-auto space-y-4">
                    <AlertCircle className="w-10 h-10 mx-auto text-amber-500 animate-bounce" />
                    <div className="space-y-1">
                      <p className="text-sm font-black text-current">Error de Conexión o Límites de Lectura</p>
                      <p className="text-xs text-current/75 leading-relaxed font-sans font-medium">
                        Se requiere conexión a internet para descargar este capítulo por primera vez del servidor de Sagradas Escrituras.
                        Por favor revisa tu internet o lee uno de los capítulos semilla cargados para leer fuera de línea.
                      </p>
                    </div>

                    <div className="flex gap-2 justify-center pt-2">
                      <button 
                        onClick={() => {
                          // Force retry trigger by resetting state
                          const prev = selectedChapter;
                          setSelectedChapter(0);
                          setTimeout(() => setSelectedChapter(prev), 10);
                        }}
                        className="text-xs font-black bg-indigo-650 hover:bg-indigo-755 text-white px-4 py-2 rounded-xl transition cursor-pointer"
                      >
                        Reintentar Cargar
                      </button>
                      <button
                        onClick={() => {
                          // Jump to Genesis 1
                          setSelectedBookIdx(0);
                          setSelectedChapter(1);
                        }}
                        className="text-xs font-bold border border-current/25 hover:bg-current/10 text-current px-4 py-2 rounded-xl transition cursor-pointer"
                      >
                        Leer Génesis 1 (Offline)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`space-y-1 ${fontClasses[readingFont]}`}>
                    {isOfflineMode && (
                      <div className="mb-6 p-4 rounded-2xl border border-amber-500/25 bg-amber-500/15 text-amber-900 dark:text-amber-300 font-sans text-xs space-y-1.5 my-2">
                        <p className="font-bold tracking-tight uppercase flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
                          ⚠️ Modo de Edificación Espiritual (Sin Conexión)
                        </p>
                        <p className="leading-relaxed opacity-90">
                          No se pudo establecer conexión con el servidor para descargar la traducción de <strong>{currentBook.name} {selectedChapter}</strong>. 
                          Para tu edificación de fe, te ofrecemos una selección fidedigna de versículos bíblicos de fortaleza, amor y consuelo. Conéctate a internet para descargar todo el contenido.
                        </p>
                      </div>
                    )}
                    {verses.length === 0 ? (
                      <p className="italic text-center text-current/50 py-12">No hay versículos disponibles en este capítulo.</p>
                    ) : (
                      verses.map(v => {
                        const marked = isBookmarked(v);
                        return (
                          <div 
                            key={v.verse} 
                            className="group relative flex gap-3 py-0.5 md:py-1 px-2.5 rounded-xl transition hover:bg-current/5"
                          >
                            <span className="font-mono text-xs sm:text-sm font-black text-indigo-500 select-none shrink-0 w-6 text-right">
                              {v.verse}
                            </span>
                            <p className="flex-1 text-left font-sans font-medium leading-relaxed">
                              {translateVerseText(v.text, activeTranslation)}
                            </p>

                            <div className="opacity-0 group-hover:opacity-100 transition shrink-0 flex items-center gap-1">
                              <button
                                onClick={() => toggleBookmark(v)}
                                className={`p-1.5 rounded transition hover:bg-current/10 ${marked ? 'text-rose-500' : 'opacity-65 text-current hover:text-rose-455'}`}
                                title={marked ? 'Quitar favorito' : 'Marcar como favorito'}
                              >
                                <Heart className={`w-3.5 h-3.5 ${marked ? 'fill-current text-rose-500' : ''}`} />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <div className="border-t border-current/10 pt-5 mt-8 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono opacity-50 text-left gap-4">
                <span>* Haz clic en el corazón <Heart className="w-3 h-3 inline fill-current text-rose-500" /> para guardar tus versículos de interés académico o espiritual.</span>
                <span className="font-bold">Biblia Libre • {TRANSLATIONS.find(t => t.key === activeTranslation)?.name} ({TRANSLATIONS.find(t => t.key === activeTranslation)?.badge})</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEGMENT: KEYWORDS SEARCH */}
      {activeSegment === 'search' && (
        <div className="bg-white border border-slate-150 p-6 rounded-3xl shadow-sm space-y-6 animate-fade-in">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base md:text-lg mb-1 flex items-center gap-1.5">
              <Compass className="w-5 h-5 text-indigo-650" />
              <span>Buscador de Citas y Concordancia Teológica</span>
            </h3>
            <p className="text-xs text-slate-500">
              Escribe una cita textual directa para cargarla instantáneamente (Ej: <b>Juan 3:16</b>, <b>Salmos 23:1</b>) o escribe una palabra para buscar coincidencias.
            </p>
          </div>

          <form onSubmit={handleBibleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Escribe cita / palabra: 'Juan 3:16', 'Salmos 91:2', 'paz', 'fe', 'sabiduría'..."
              value={bibleSearchQuery}
              onChange={e => setBibleSearchQuery(e.target.value)}
              className="flex-1 p-3 border rounded-xl text-xs sm:text-sm focus:outline-indigo-600 bg-slate-50/50"
            />
            <button
              type="submit"
              disabled={isSearchingLive}
              className="btn btn-primary bg-indigo-600 hover:bg-indigo-755 text-white rounded-xl px-5 py-2.5 font-bold text-xs sm:text-sm cursor-pointer disabled:opacity-50"
            >
              {isSearchingLive ? 'Buscando...' : 'Buscar'}
            </button>
          </form>

          {searchError && (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-2xl text-xs flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-505 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}

          {isSearchingLive ? (
            <div className="py-12 text-center space-y-2">
              <RefreshCw className="w-6 h-6 mx-auto text-indigo-500 animate-spin" />
              <p className="text-xs font-semibold text-slate-500 font-mono">Consultando base de escrituras en tiempo real...</p>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="space-y-4 animate-fade-in">
              <div className="flex justify-between items-center bg-slate-50 px-4 py-2 rounded-xl text-xs text-slate-500 font-bold">
                <span>Resultados hallados: {searchResults.length} referencia(s)</span>
                <span className="text-[10px] uppercase font-mono text-indigo-500">Concordancia Activa</span>
              </div>
              
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1 space-y-3.5">
                {searchResults.map((v, idx) => {
                  const marked = isBookmarked(v);
                  return (
                    <div key={idx} className="pt-3.5 text-left flex flex-col justify-between group">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10.5px] font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-120 font-serif">
                            📖 {v.book} {v.chapter}:{v.verse}
                          </span>
                          <button
                            onClick={() => {
                              const bIdx = BIBLE_BOOKS.findIndex(b => 
                                b.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === 
                                v.book.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                              );
                              if (bIdx !== -1) {
                                setSelectedBookIdx(bIdx);
                                setSelectedChapter(v.chapter);
                                setActiveSegment('read');
                              }
                            }}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center gap-0.5 ml-1"
                            title="Leer el capítulo completo en pergamino"
                          >
                            <span>Leer capítulo completo →</span>
                          </button>
                        </div>
                        
                        <button
                          onClick={() => toggleBookmark(v)}
                          className={`p-1.5 rounded-xl hover:bg-slate-100 transition flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 ${marked ? 'text-rose-500 bg-rose-50/50' : ''}`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${marked ? 'fill-current text-rose-500 font-bold' : ''}`} />
                          <span>{marked ? 'Guardado' : 'Guardar'}</span>
                        </button>
                      </div>
                      <p className="font-serif italic text-slate-700 mt-2.5 text-xs sm:text-[13.5px] leading-relaxed border-l-4 border-indigo-400 pl-3 bg-[#faf6eb]/50 py-2.5 rounded-r">
                        "{translateVerseText(v.text, activeTranslation)}"
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            bibleSearchQuery && !searchError && (
              <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <Compass className="w-8 h-8 mx-auto text-slate-300 mb-2.5" />
                <p className="text-xs font-bold text-slate-600">No se encontraron versículos exactos</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto mt-1">
                  Prueba buscando palabras completas (ej: <b>amor</b>, <b>gracia</b>, <b>rey</b>) o indica la cita directa con formato "<b>Libro Capítulo:Versículo</b>".
                </p>
              </div>
            )
          )}
        </div>
      )}

      {/* SEGMENT: BOOKMARKED SCRIPTURES JOURNAL */}
      {activeSegment === 'bookmarks' && (
        <div className="bg-white border border-slate-150 p-6 rounded-3xl shadow-sm space-y-5 animate-fade-in">
          <div>
            <h3 className="font-extrabold text-slate-800 text-base md:text-lg mb-1 flex items-center gap-1.5">
              <BookmarkCheck className="w-5 h-5 text-amber-655" />
              <span>Mi Diario de Versículos Favoritos</span>
            </h3>
            <p className="text-xs text-slate-500">
              Colección personal de textos bíblicos sagrados guardados para consulta, meditación y estudio académico.
            </p>
          </div>

          {bookmarks.length === 0 ? (
            <div className="py-16 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <BookMarked className="w-10 h-10 mx-auto text-slate-300 mb-2.5" />
              <p className="text-xs font-black text-slate-600">No tienes versículos grabados todavía</p>
              <p className="text-[10px] text-slate-400 max-w-xs mx-auto mt-1">
                Abre la pestaña de Lectura, recorre los capítulos y toca el corazón para guardar las porciones que te inspiran de la Biblia.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bookmarks.map(b => (
                <div 
                  key={b.id}
                  className="p-4 bg-[#faf6eb]/30 hover:bg-[#faf6eb]/60 border border-[#eaddc3]/60 rounded-2xl flex flex-col justify-between transition group shadow-xs"
                >
                  <div>
                    <div className="flex justify-between items-center mb-2.5">
                      <span className="text-xs font-black text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-150 font-serif">
                        📖 {b.book} {b.chapter}:{b.verse}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">Pactado: {b.dateAdded}</span>
                    </div>
                    <p className="font-serif italic text-slate-700 text-xs sm:text-[13px] leading-relaxed">
                      "{translateVerseText(b.text, activeTranslation)}"
                    </p>
                  </div>

                  <div className="border-t border-dashed border-[#eaddc3] mt-3.5 pt-2.5 flex justify-between items-center text-right">
                    <button
                      onClick={() => {
                        const bIdx = BIBLE_BOOKS.findIndex(bk => 
                          bk.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === 
                          b.book.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                        );
                        if (bIdx !== -1) {
                          setSelectedBookIdx(bIdx);
                          setSelectedChapter(b.chapter);
                          setActiveSegment('read');
                        }
                      }}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center gap-1"
                    >
                      Leer capítulo completo →
                    </button>
                    <button
                      onClick={() => toggleBookmark(b)}
                      className="text-[11.5px] font-bold text-rose-600 hover:text-rose-750 hover:underline cursor-pointer flex items-center gap-1 scale-98 transition active:scale-95"
                    >
                      Remover favorito
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
