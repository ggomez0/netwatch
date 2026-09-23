import React, { useState } from 'react';
import { Wifi, Radio, HardDrive, Smartphone, Edit3, History, Copy, Check, Clock } from 'lucide-react';
import { DeviceRecord } from '../types';

interface Props {
  device: DeviceRecord;
  onEditAlias: (device: DeviceRecord) => void;
  onViewHistory: (device: DeviceRecord) => void;
}

export const DeviceCard: React.FC<Props> = ({ device, onEditAlias, onViewHistory }) => {
  const [copiedMac, setCopiedMac] = useState(false);

  const copyToClipboard = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedMac(true);
    setTimeout(() => setCopiedMac(false), 2000);
  };

  const getConnectionIcon = (type: string) => {
    if (type.includes('5G')) return <Radio className="w-4 h-4 text-purple-400" />;
    if (type.includes('2.4G')) return <Wifi className="w-4 h-4 text-cyan-400" />;
    if (type.includes('Ethernet') || type.includes('LAN')) return <HardDrive className="w-4 h-4 text-emerald-400" />;
    return <Smartphone className="w-4 h-4 text-slate-400" />;
  };

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '-';
    const date = new Date(isoStr);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative group rounded-3xl p-[1px] bg-gradient-to-b from-white/10 via-slate-800/40 to-white/5 hover:from-indigo-500/40 hover:via-purple-500/20 hover:to-cyan-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1">
      <div className="bg-slate-900/90 backdrop-blur-xl rounded-[23px] p-5 h-full flex flex-col justify-between overflow-hidden relative">
        {device.is_online && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />
        )}

        <div>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner border transition-all ${
                  device.is_online
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-800/60 border-white/5 text-slate-400'
                }`}>
                  {getConnectionIcon(device.connection_type)}
                </div>
                {device.is_online ? (
                  <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-slate-900" />
                  </span>
                ) : (
                  <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-slate-600 border-2 border-slate-900" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-white tracking-tight group-hover:text-indigo-300 transition-colors">
                    {device.custom_alias || device.name}
                  </h3>
                  {device.custom_alias && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-medium">
                      alias
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5 truncate max-w-[160px]">
                  {device.custom_alias ? device.name : device.connection_type || 'Dispositivo'}
                </p>
              </div>
            </div>

            <button
              onClick={() => onEditAlias(device)}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-white/5 transition-colors"
              title="Editar Alias"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 my-4 text-[11px]">
            <div className="bg-slate-950/70 border border-white/5 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-400 block mb-0.5 font-medium">MAC</span>
              <div className="flex items-center justify-between">
                <span className="font-mono text-slate-300 text-[10px] truncate">{device.mac}</span>
                <button
                  onClick={(e) => copyToClipboard(device.mac, e)}
                  className="text-slate-400 hover:text-white ml-1"
                >
                  {copiedMac ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-white/5 rounded-xl p-2.5">
              <span className="text-[10px] text-slate-400 block mb-0.5 font-medium">IP</span>
              <span className="font-mono text-slate-300 text-[10px] truncate block">
                {device.ip || 'DHCP'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-4 px-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{device.is_online ? 'Conectado:' : 'Última vez:'}</span>
            </span>
            <span className="font-mono text-slate-300 text-[10px]">
              {formatDate(device.is_online ? device.last_connected_at : device.last_disconnected_at)}
            </span>
          </div>
        </div>

        <button
          onClick={() => onViewHistory(device)}
          className="w-full py-2.5 px-3 bg-gradient-to-r from-slate-800/90 to-slate-800/60 hover:from-indigo-600 hover:to-purple-600 border border-white/10 hover:border-transparent text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] shadow-sm group/btn"
        >
          <History className="w-3.5 h-3.5 text-indigo-400 group-hover/btn:text-white transition-colors" />
          <span>Ver Historial de Conexión</span>
        </button>
      </div>
    </div>
  );
};
