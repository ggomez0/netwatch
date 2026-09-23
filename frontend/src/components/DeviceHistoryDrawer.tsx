import React, { useState, useEffect } from 'react';
import { X, Clock, ArrowDownLeft, ArrowUpRight, Wifi, Radio, HardDrive, Smartphone, History, Check, Copy, Activity } from 'lucide-react';
import { DeviceRecord, NetworkLogRecord } from '../types';
import { fetchDeviceLogs } from '../api';

interface Props {
  device: DeviceRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onEditAlias: (device: DeviceRecord) => void;
}

export const DeviceHistoryDrawer: React.FC<Props> = ({ device, isOpen, onClose, onEditAlias }) => {
  const [logs, setLogs] = useState<NetworkLogRecord[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedMac, setCopiedMac] = useState(false);

  useEffect(() => {
    if (device && isOpen) {
      setIsLoading(true);
      fetchDeviceLogs(device.mac, 1, 100)
        .then((res) => {
          setLogs(res.items);
          setTotalLogs(res.totalItems);
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [device, isOpen]);

  if (!isOpen || !device) return null;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMac(true);
    setTimeout(() => setCopiedMac(false), 2000);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return null;
    if (seconds < 60) return `${seconds} seg`;
    const mins = Math.floor(seconds / 60);
    const remSecs = seconds % 60;
    if (mins < 60) {
      return remSecs > 0 ? `${mins}m ${remSecs}s` : `${mins} min`;
    }
    const hours = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hours}h ${remMins}m`;
  };

  const calculateTotalDuration = () => {
    const totalSecs = logs.reduce((acc, curr) => acc + (curr.session_duration || 0), 0);
    return formatDuration(totalSecs) || '0 min';
  };

  const getConnectionIcon = (type: string) => {
    if (type.includes('5G')) return <Radio className="w-4 h-4 text-purple-400" />;
    if (type.includes('2.4G')) return <Wifi className="w-4 h-4 text-cyan-400" />;
    if (type.includes('Ethernet') || type.includes('LAN')) return <HardDrive className="w-4 h-4 text-emerald-400" />;
    return <Smartphone className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-300">
      <div
        className="fixed inset-0"
        onClick={onClose}
      />

      <div className="relative w-full max-w-xl h-full bg-slate-900 border-l border-white/10 shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-300 overflow-hidden">
        <div className="p-6 border-b border-white/10 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600/30 to-purple-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              {getConnectionIcon(device.connection_type)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {device.custom_alias || device.name}
                </h2>
                {device.is_online ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Online
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700/50">
                    Offline
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {device.custom_alias ? device.name : 'Dispositivo de red'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 border-b border-white/5 bg-slate-950/30 grid grid-cols-2 gap-3">
          <div className="bg-slate-950/80 border border-white/5 rounded-xl p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              Dirección MAC
            </span>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-white font-medium">{device.mac}</span>
              <button
                onClick={() => copyToClipboard(device.mac)}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Copiar MAC"
              >
                {copiedMac ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-white/5 rounded-xl p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              Dirección IP
            </span>
            <span className="font-mono text-xs text-white font-medium">
              {device.ip || 'No asignada / DHCP'}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-white/5 rounded-xl p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              Interfaz / Red
            </span>
            <span className="text-xs text-indigo-300 font-medium">
              {device.connection_type || 'Desconocido'}
            </span>
          </div>

          <div className="bg-slate-950/80 border border-white/5 rounded-xl p-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
              Tiempo Total Sesión
            </span>
            <span className="text-xs text-amber-400 font-mono font-semibold">
              {calculateTotalDuration()}
            </span>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Historial de Conexiones ({totalLogs})
            </h3>
          </div>
          <button
            onClick={() => onEditAlias(device)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
          >
            Editar Alias
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <Activity className="w-6 h-6 animate-spin text-indigo-400" />
              <span className="text-xs">Cargando eventos de conexión...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-white/5 flex items-center justify-center text-slate-500">
                <History className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-300">Sin historial registrado aún</p>
              <p className="text-xs max-w-xs text-slate-500">
                Los eventos de conexión y desconexión se guardarán automáticamente en PocketBase cada vez que el dispositivo cambie de estado.
              </p>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-800 ml-3.5 space-y-6">
              {logs.map((log) => {
                const isConnect = log.event_type === 'connected';
                return (
                  <div key={log.id} className="relative pl-6 group">
                    <div
                      className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-slate-900 flex items-center justify-center ${
                        isConnect ? 'bg-emerald-400 shadow-sm shadow-emerald-500/50' : 'bg-rose-500 shadow-sm shadow-rose-500/50'
                      }`}
                    />

                    <div className="bg-slate-950/70 border border-white/5 hover:border-white/10 rounded-2xl p-4 transition-all shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {isConnect ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400">
                              <ArrowDownLeft className="w-3.5 h-3.5" />
                              Dispositivo Conectado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400">
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              Dispositivo Desconectado
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>

                      <div className="text-xs text-slate-400 flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                        {log.session_duration && log.session_duration > 0 ? (
                          <span className="inline-flex items-center gap-1 font-mono text-amber-400 text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                            <Clock className="w-3 h-3" />
                            Duración: {formatDuration(log.session_duration)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
