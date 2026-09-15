/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { 
  QrCode, Copy, Check, Download, Printer, Share2, ExternalLink, Smartphone, 
  Database, CheckCircle2, RefreshCw, Server, Globe
} from 'lucide-react';

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncFirebase?: () => Promise<any> | void;
  isSyncing?: boolean;
}

// Official working portal link on Firebase Hosting (Project ID: synapsis-edu)
export const OFFICIAL_PORTAL_URL = 'https://synapsis-edu.web.app';
export const SHORT_URL = 'https://tinyurl.com/2ad5gh2c';
export const FULL_URL = 'https://ais-pre-4wzwuwhx24ttdai2gesabg-794631310365.us-east1.run.app/';
export const FIREBASE_HOSTING_URL = 'https://synapsis-edu.web.app';

export default function ShareAppModal({ 
  isOpen, 
  onClose,
  onSyncFirebase,
  isSyncing = false
}: ShareAppModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedShort, setCopiedShort] = useState(false);
  const [localSyncState, setLocalSyncState] = useState<'idle' | 'syncing' | 'success'>('idle');
  const [lastSyncCount, setLastSyncCount] = useState<number | null>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(OFFICIAL_PORTAL_URL, {
        width: 480,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Error generating QR Code:', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(OFFICIAL_PORTAL_URL);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleCopyShort = () => {
    navigator.clipboard.writeText(SHORT_URL);
    setCopiedShort(true);
    setTimeout(() => setCopiedShort(false), 2500);
  };

  const handleTriggerSync = async () => {
    if (onSyncFirebase) {
      setLocalSyncState('syncing');
      try {
        const result = await onSyncFirebase();
        if (result && typeof result.pushedCount === 'number') {
          setLastSyncCount(result.pushedCount);
        }
        setLocalSyncState('success');
        setTimeout(() => setLocalSyncState('idle'), 4000);
      } catch (err) {
        setLocalSyncState('idle');
      }
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `codigo-qr-synapsis-edu.png`;
    link.click();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Acceso al Portal Académico Synapsis</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              text-align: center;
              padding: 40px 20px;
              color: #0f172a;
              background-color: #ffffff;
            }
            .container {
              max-width: 500px;
              margin: 0 auto;
              border: 3px solid #0284c7;
              border-radius: 24px;
              padding: 40px;
              box-shadow: 0 10px 25px rgba(0,0,0,0.05);
            }
            h1 {
              font-size: 32px;
              margin: 0 0 8px 0;
              color: #0284c7;
            }
            p.sub {
              font-size: 16px;
              color: #64748b;
              margin-top: 0;
              margin-bottom: 24px;
            }
            .qr-img {
              width: 260px;
              height: 260px;
              margin: 10px auto;
              display: block;
              border-radius: 12px;
              border: 1px solid #e2e8f0;
              padding: 10px;
            }
            .url-box {
              background-color: #f8fafc;
              border: 2px dashed #0284c7;
              padding: 16px;
              border-radius: 14px;
              margin-top: 24px;
            }
            .url-text {
              font-size: 22px;
              font-weight: bold;
              color: #0369a1;
              font-family: monospace;
              word-break: break-all;
            }
            .instrucciones {
              font-size: 14px;
              color: #475569;
              margin-top: 16px;
              line-height: 1.5;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Synapsis Portal</h1>
            <p class="sub">Plataforma Oficial de Evaluaciones y Control Académico</p>
            <img class="qr-img" src="${qrDataUrl}" alt="Código QR Synapsis" />
            <div class="url-box">
              <div>Dirección web oficial de acceso:</div>
              <div class="url-text">${OFFICIAL_PORTAL_URL}</div>
            </div>
            <div class="instrucciones">
              <strong>Instrucciones para estudiantes y docentes:</strong><br />
              1. Abre la cámara de tu celular o escáner QR.<br />
              2. Apunta hacia el código QR para entrar al portal.<br />
              3. O ingresa directamente desde cualquier navegador a: ${OFFICIAL_PORTAL_URL}
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `🏛️ *Portal Académico Synapsis*\n` +
      `Acceso oficial para evaluaciones, notas, parciales y tareas académicas.\n\n` +
      `🔗 *Enlace directo:* ${OFFICIAL_PORTAL_URL}\n\n` +
      `¡Ingresa con tu correo o código registrado!`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const isCurrentSyncing = isSyncing || localSyncState === 'syncing';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[250] p-4 animate-fade-in text-left">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-cyan-950 text-white p-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center text-white shadow-md">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight text-white">
                Enlace Oficial & Acceso al Portal
              </h3>
              <p className="text-[11px] text-emerald-300 font-medium font-mono">
                synapsis-edu.web.app
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto" ref={printAreaRef}>
          
          {/* Firebase Connection & Target Project Banner */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <span>Firebase Hosting & Firestore Conectado</span>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  </p>
                  <p className="text-[11px] text-emerald-800">
                    Proyecto: <span className="font-mono font-bold text-indigo-900">synapsis-edu</span>
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-md">
                Vinculado
              </span>
            </div>

            {/* Target Applet Copy Badge */}
            <div className="bg-white/90 border border-emerald-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-slate-600 font-medium text-[11px]">App Web Firebase:</span>
              </div>
              <span className="font-mono font-bold text-indigo-700 text-[11px] bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                synapsis-edu (ai-studio-applet-webapp)
              </span>
            </div>

            {/* Manual Sync Trigger Button */}
            {onSyncFirebase && (
              <button
                type="button"
                onClick={handleTriggerSync}
                disabled={isCurrentSyncing}
                className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs ${
                  localSyncState === 'success'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-700 hover:bg-emerald-800 text-white'
                } disabled:opacity-75`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCurrentSyncing ? 'animate-spin' : ''}`} />
                <span>
                  {isCurrentSyncing 
                    ? 'Sincronizando datos con Cloud Firestore (synapsis-edu)...' 
                    : localSyncState === 'success'
                      ? `¡Datos registrados en synapsis-edu! ${lastSyncCount ? `(${lastSyncCount} registros)` : ''}`
                      : 'Sincronizar y Registrar Toda la Base de Datos con synapsis-edu'
                  }
                </span>
              </button>
            )}
          </div>

          {/* Active Verified Firebase Hosting URL Section */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-indigo-950 font-bold">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                <span>Enlace Oficial Directo (Sin esperas ni publicidad):</span>
              </span>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-300">
                ✓ Publicado & Activo
              </span>
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-white border-2 border-emerald-400 rounded-xl p-3 flex items-center justify-between overflow-hidden shadow-xs">
                <span className="font-mono font-bold text-emerald-800 text-sm sm:text-base truncate">
                  {OFFICIAL_PORTAL_URL}
                </span>
                <a
                  href={OFFICIAL_PORTAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:text-emerald-800 p-1 ml-2 transition-colors shrink-0"
                  title="Abrir enlace en pestaña nueva"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
              <button
                type="button"
                onClick={handleCopyUrl}
                className={`px-4 py-3 rounded-xl font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer ${
                  copiedUrl
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                }`}
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-emerald-700 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Abre al instante en cualquier teléfono o PC sin cuentas regresivas ni anuncios.</span>
            </p>
          </div>

          {/* Backup Cloud Run Short URL Section */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Enlace corto alternativo (Cloud Run):</span>
              <button
                type="button"
                onClick={handleCopyShort}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
              >
                {copiedShort ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between font-mono text-xs text-slate-700">
              <span className="truncate text-indigo-700 font-bold">{SHORT_URL}</span>
              <a
                href={SHORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-indigo-600 ml-2"
                title="Abrir enlace corto"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* QR Code Canvas Card */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 flex flex-col sm:flex-row items-center gap-5">
            <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-slate-200 shrink-0">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Código QR Synapsis"
                  className="w-40 h-40 object-contain rounded-xl"
                />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center text-xs text-slate-400">
                  Generando QR...
                </div>
              )}
            </div>

            <div className="flex-1 space-y-2 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 w-fit mx-auto sm:mx-0">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Escaneo Rápido con Celular</span>
              </div>
              <h4 className="font-bold text-slate-800 text-sm">
                Abre la cámara de cualquier teléfono
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Apunta la cámara para ingresar inmediatamente a <span className="font-semibold text-slate-700">{OFFICIAL_PORTAL_URL}</span>.
              </p>

              <div className="flex items-center gap-2 pt-1 justify-center sm:justify-start flex-wrap">
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Descargar PNG</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Imprimir Afiche</span>
                </button>
              </div>
            </div>
          </div>

          {/* Share via WhatsApp Button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer hover:shadow-md"
            >
              <Share2 className="w-4 h-4" />
              <span>Compartir {OFFICIAL_PORTAL_URL} por WhatsApp</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
