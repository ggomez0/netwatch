import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { NetworkLogRecord } from '../types';

interface Props {
  logs: NetworkLogRecord[];
  totalLogs: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

function formatDuration(seconds?: number) {
  if (!seconds || seconds <= 0) return null;
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export const ActivityLog: React.FC<Props> = ({ logs, totalLogs, currentPage, onPageChange }) => {
  const totalPages = Math.ceil(totalLogs / 50) || 1;

  return (
    <div className="border border-[#1a1a1a] rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1a1a1a] bg-[#0a0a0a] flex items-center justify-between">
        <span className="text-xs font-medium text-[#888]">Historial de eventos</span>
        <span className="text-xs font-mono text-[#555]">{totalLogs} registros</span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#111] bg-[#050505]">
            <th className="text-left px-4 py-3 text-xs font-medium text-[#555] w-28">Evento</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-[#555]">Dispositivo</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-[#555] hidden md:table-cell">MAC</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-[#555] hidden sm:table-cell">IP</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-[#555] hidden lg:table-cell">Red</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-[#555]">Fecha y hora</th>
            <th className="text-left px-4 py-3 text-xs font-medium text-[#555] hidden xl:table-cell">Duración</th>
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center py-16 text-xs text-[#444]">
                Sin registros. El monitor está esperando eventos de red.
              </td>
            </tr>
          ) : (
            logs.map((log) => {
              const isConnect = log.event_type === 'connected';
              return (
                <tr
                  key={log.id}
                  className="border-b border-[#0d0d0d] hover:bg-[#0a0a0a] transition-colors"
                >
                  <td className="px-4 py-3">
                    {isConnect ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        Conectado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        Desconectado
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-white text-sm font-medium">{log.name || '—'}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="font-mono text-xs text-[#666]">{log.mac}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="font-mono text-xs text-[#666]">{log.ip || '—'}</span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className="font-mono text-xs text-[#555]">{log.connection_type || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-[#666]">{formatDateTime(log.timestamp)}</span>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell">
                    {log.session_duration && log.session_duration > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-mono text-amber-400">
                        <Clock className="w-3 h-3" />
                        {formatDuration(log.session_duration)}
                      </span>
                    ) : (
                      <span className="text-[#444]">—</span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-[#1a1a1a] bg-[#0a0a0a] flex items-center justify-between">
          <span className="text-xs text-[#555]">
            Página <span className="text-white">{currentPage}</span> de{' '}
            <span className="text-white">{totalPages}</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage <= 1}
              onClick={() => onPageChange(currentPage - 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs text-[#666] hover:text-white hover:bg-[#1a1a1a] disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Anterior
            </button>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => onPageChange(currentPage + 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded text-xs text-[#666] hover:text-white hover:bg-[#1a1a1a] disabled:opacity-30 transition-colors"
            >
              Siguiente
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
