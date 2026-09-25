import React, { useState } from 'react';
import { Search, Edit3, Wifi, Radio, HardDrive, Laptop, ChevronRight, Ban, ShieldCheck } from 'lucide-react';
import { DeviceRecord } from '../types';

interface Props {
  devices: DeviceRecord[];
  onEditAlias: (device: DeviceRecord) => void;
  onViewHistory: (device: DeviceRecord) => void;
  onToggleBlock?: (id: string, is_blocked: boolean) => void;
}

function ConnectionBadge({ type }: { type: string }) {
  if (type.includes('5G')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
        <Radio className="w-3 h-3" />
        5GHz
      </span>
    );
  }
  if (type.includes('2.4G')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
        <Wifi className="w-3 h-3" />
        2.4GHz
      </span>
    );
  }
  if (type.includes('Ethernet') || type.includes('LAN')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#1a1a1a] text-[#888] border border-[#2a2a2a]">
        <HardDrive className="w-3 h-3" />
        Ethernet
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#1a1a1a] text-[#888] border border-[#2a2a2a]">
      <Laptop className="w-3 h-3" />
      {type || '—'}
    </span>
  );
}

function formatDate(isoStr?: string) {
  if (!isoStr) return '—';
  return new Date(isoStr).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const DevicesTable: React.FC<Props> = ({ devices, onEditAlias, onViewHistory, onToggleBlock }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'online' | 'offline' | 'blocked'>('all');

  const filtered = devices.filter((d) => {
    let ok = true;
    if (filterMode === 'online') {
      ok = !!d.is_online && !d.is_blocked;
    } else if (filterMode === 'offline') {
      ok = !d.is_online && !d.is_blocked;
    } else if (filterMode === 'blocked') {
      ok = !!d.is_blocked;
    }
    const q = searchTerm.toLowerCase();
    return (
      ok &&
      (d.name.toLowerCase().includes(q) ||
        d.mac.toLowerCase().includes(q) ||
        (d.custom_alias && d.custom_alias.toLowerCase().includes(q)) ||
        (d.ip && d.ip.includes(q)))
    );
  });

  const onlineCount = devices.filter((d) => d.is_online && !d.is_blocked).length;
  const offlineCount = devices.filter((d) => !d.is_online && !d.is_blocked).length;
  const blockedCount = devices.filter((d) => d.is_blocked).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-md p-1">
          {(
            [
              { id: 'all', label: `Todos (${devices.length})` },
              { id: 'online', label: `Online (${onlineCount})` },
              { id: 'offline', label: `Offline (${offlineCount})` },
              { id: 'blocked', label: `Bloqueados (${blockedCount})` },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterMode(f.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                filterMode === f.id
                  ? 'bg-white text-black'
                  : 'text-[#666] hover:text-[#aaa]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
          <input
            type="text"
            placeholder="Buscar dispositivo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-md pl-9 pr-4 py-1.5 text-xs text-white placeholder-[#444] focus:outline-none focus:border-[#333] transition-colors w-64"
          />
        </div>
      </div>

      <div className="border border-[#1a1a1a] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1a1a1a] bg-[#0a0a0a]">
              <th className="text-left px-4 py-3 text-xs font-medium text-[#555] w-20">Estado</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#555]">Dispositivo</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#555] hidden md:table-cell">MAC</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#555] hidden sm:table-cell">IP</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#555] hidden lg:table-cell">Red</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-[#555] hidden xl:table-cell">Última conexión</th>
              <th className="px-4 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-xs text-[#444]">
                  Sin dispositivos
                </td>
              </tr>
            ) : (
              filtered.map((device) => (
                <tr
                  key={device.id || device.mac}
                  onClick={() => onViewHistory(device)}
                  className="border-b border-[#111] hover:bg-[#0d0d0d] transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3">
                    {device.is_blocked ? (
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0 bg-rose-500" />
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <Ban className="w-3 h-3" />
                          Bloqueado
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            device.is_online ? 'bg-emerald-400' : 'bg-[#333]'
                          }`}
                        />
                        <span className={`text-xs ${device.is_online ? 'text-emerald-400' : 'text-[#555]'}`}>
                          {device.is_online ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                      <span className="text-white text-sm font-medium group-hover:text-white transition-colors">
                        {device.custom_alias || device.name || '—'}
                      </span>
                      {device.custom_alias && (
                        <span className="text-[#555] text-xs font-mono mt-0.5">{device.name}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="font-mono text-xs text-[#666]">{device.mac}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="font-mono text-xs text-[#666]">{device.ip || '—'}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <ConnectionBadge type={device.connection_type} />
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    <span className="font-mono text-xs text-[#555]">
                      {formatDate(device.last_connected_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {onToggleBlock && (
                        <button
                          onClick={() => onToggleBlock(device.id, !device.is_blocked)}
                          className={`p-1.5 rounded transition-colors ${
                            device.is_blocked
                              ? 'hover:bg-emerald-500/10 text-rose-400 hover:text-emerald-400'
                              : 'hover:bg-rose-500/10 text-[#555] hover:text-rose-400'
                          }`}
                          title={device.is_blocked ? 'Desbloquear dispositivo' : 'Marcar como bloqueado en router'}
                        >
                          {device.is_blocked ? <ShieldCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                        </button>
                      )}
                      <button
                        onClick={() => onEditAlias(device)}
                        className="p-1.5 rounded hover:bg-[#1a1a1a] text-[#555] hover:text-[#aaa] transition-colors"
                        title="Editar alias"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onViewHistory(device)}
                        className="p-1.5 rounded hover:bg-[#1a1a1a] text-[#555] hover:text-[#aaa] transition-colors"
                        title="Ver detalle"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
