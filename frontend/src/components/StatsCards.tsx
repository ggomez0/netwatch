import React from 'react';
import { Wifi, Monitor, AlertTriangle, RefreshCw } from 'lucide-react';
import { MonitorStatus } from '../types';

interface Props {
  status: MonitorStatus | null;
  onSync: () => void;
  isSyncing: boolean;
  secondsToNextPoll: number;
}

export const StatsCards: React.FC<Props> = ({ status, secondsToNextPoll }) => {
  const cards = [
    {
      label: 'En línea',
      value: status ? String(status.onlineCount) : '—',
      sub: 'dispositivos conectados',
      dot: 'bg-emerald-400',
    },
    {
      label: 'Total histórico',
      value: status ? String(status.totalDevices) : '—',
      sub: 'registrados en DB',
      dot: null,
    },
    {
      label: 'Router',
      value: status?.routerReachable ? 'Accesible' : 'Sin acceso',
      sub: import.meta.env.VITE_ROUTER_HOST || 'Router Gateway',
      dot: status?.routerReachable ? 'bg-emerald-400' : 'bg-amber-400',
    },
    {
      label: 'Próximo sondeo',
      value: `${secondsToNextPoll}s`,
      sub: 'intervalo: 30 segundos',
      dot: null,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4 hover:border-[#2a2a2a] transition-colors"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-[#666] font-medium">{card.label}</span>
            {card.dot && (
              <span className={`w-2 h-2 rounded-full ${card.dot} ${card.label === 'En línea' ? 'animate-pulse' : ''}`} />
            )}
          </div>
          <p className="text-2xl font-bold text-white tracking-tight leading-none mb-1">{card.value}</p>
          <p className="text-xs text-[#555] font-mono mt-1">{card.sub}</p>
        </div>
      ))}
    </div>
  );
};
