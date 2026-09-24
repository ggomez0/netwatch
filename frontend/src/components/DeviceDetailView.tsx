import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Wifi,
  WifiOff,
  Clock,
  Edit3,
  Copy,
  Check,
  RefreshCw,
  Activity,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { DeviceRecord, NetworkLogRecord } from '../types';
import { fetchDeviceLogs } from '../api';

interface Props {
  device: DeviceRecord;
  onBack: () => void;
  onEditAlias: (device: DeviceRecord) => void;
}

interface ChartPoint {
  time: string;
  timestamp: number;
  status: number;
  event: string;
  fullTime: string;
}

interface Session {
  connectedAt: string;
  disconnectedAt: string | null;
  duration: number | null;
}

function fmtDuration(s: number): string {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function fmtShort(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const ChartTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const p: ChartPoint = payload[0]?.payload;
  return (
    <div className="bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-[#666] mb-1">{p.fullTime}</p>
      <p className={`font-medium ${p.status === 1 ? 'text-emerald-400' : 'text-rose-400'}`}>
        {p.event}
      </p>
    </div>
  );
};

export const DeviceDetailView: React.FC<Props> = ({ device, onBack, onEditAlias }) => {
  const [logs, setLogs] = useState<NetworkLogRecord[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedMac, setCopiedMac] = useState(false);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchDeviceLogs(device.mac, 1, 200);
      setLogs(result.items);
      setTotalLogs(result.totalItems);
    } finally {
      setIsLoading(false);
    }
  }, [device.mac]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const copyMac = () => {
    navigator.clipboard.writeText(device.mac);
    setCopiedMac(true);
    setTimeout(() => setCopiedMac(false), 2000);
  };

  const displayName = device.custom_alias || device.name || device.mac;

  const chartData: ChartPoint[] = React.useMemo(() => {
    const sorted = [...logs].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const points: ChartPoint[] = [];

    if (sorted.length > 0 && sorted[0].event_type === 'connected') {
      const firstTs = new Date(sorted[0].timestamp).getTime();
      const leadInTs = firstTs - 30 * 60 * 1000;
      points.push({
        time: fmtShort(new Date(leadInTs).toISOString()),
        timestamp: leadInTs,
        status: 0,
        event: 'Desconectado',
        fullTime: fmtDateTime(new Date(leadInTs).toISOString()),
      });
    }

    sorted.forEach((log) => {
      const ts = new Date(log.timestamp).getTime();
      const isConn = log.event_type === 'connected';
      if (!isConn && points.length > 0) {
        points.push({ time: fmtShort(log.timestamp), timestamp: ts - 1, status: 1, event: 'Conectado', fullTime: fmtDateTime(log.timestamp) });
      }
      points.push({ time: fmtShort(log.timestamp), timestamp: ts, status: isConn ? 1 : 0, event: isConn ? 'Conectado' : 'Desconectado', fullTime: fmtDateTime(log.timestamp) });
      if (isConn) {
        points.push({ time: fmtShort(log.timestamp), timestamp: ts + 1, status: 1, event: 'Conectado', fullTime: fmtDateTime(log.timestamp) });
      }
    });

    if (device.is_online && points.length > 0) {
      points.push({ time: 'Ahora', timestamp: Date.now(), status: 1, event: 'En línea', fullTime: 'Ahora mismo' });
    } else if (!device.is_online && sorted.length > 0) {
      const lastTs = new Date(sorted[sorted.length - 1].timestamp).getTime();
      const leadOutTs = lastTs + 30 * 60 * 1000;
      points.push({
        time: fmtShort(new Date(leadOutTs).toISOString()),
        timestamp: leadOutTs,
        status: 0,
        event: 'Desconectado',
        fullTime: fmtDateTime(new Date(leadOutTs).toISOString()),
      });
    }

    return points;
  }, [logs, device.is_online]);

  const sessions: Session[] = React.useMemo(() => {
    const sorted = [...logs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const result: Session[] = [];
    let i = 0;
    while (i < sorted.length) {
      const log = sorted[i];
      if (log.event_type === 'disconnected') {
        const next = sorted[i + 1];
        result.push({ connectedAt: next?.timestamp ?? log.timestamp, disconnectedAt: log.timestamp, duration: log.session_duration ?? null });
        i += next?.event_type === 'connected' ? 2 : 1;
      } else {
        result.push({ connectedAt: log.timestamp, disconnectedAt: null, duration: null });
        i++;
      }
    }
    return result.filter((s) => s.duration === null || s.duration > 0).slice(0, 25);
  }, [logs]);

  const totalOnline = logs.filter((l) => l.event_type === 'disconnected' && l.session_duration).reduce((a, l) => a + (l.session_duration ?? 0), 0);
  const connCount = logs.filter((l) => l.event_type === 'connected').length;

  return (
    <div className="min-h-screen bg-black text-[#ededed] flex flex-col">
      <header className="border-b border-[#1a1a1a] bg-black sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs text-[#666] hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            Volver
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEditAlias(device)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#111] hover:bg-[#1a1a1a] border border-[#2a2a2a] text-xs text-[#888] hover:text-white transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Editar alias
            </button>
            <button
              onClick={loadLogs}
              className="p-1.5 rounded-md bg-[#111] hover:bg-[#1a1a1a] border border-[#2a2a2a] text-[#555] hover:text-[#aaa] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-8 w-full space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">{displayName}</h1>
              <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${
                device.is_online
                  ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/8'
                  : 'text-[#555] border-[#2a2a2a] bg-[#0a0a0a]'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${device.is_online ? 'bg-emerald-400 animate-pulse' : 'bg-[#444]'}`} />
                {device.is_online ? 'En línea' : 'Desconectado'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-[#555]">
              <button
                onClick={copyMac}
                className="flex items-center gap-1.5 font-mono hover:text-[#aaa] transition-colors"
              >
                {copiedMac ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span className={copiedMac ? 'text-emerald-400' : ''}>{device.mac}</span>
              </button>
              <span>{device.ip}</span>
              <span>{device.connection_type}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Conexiones', value: String(connCount) },
            { label: 'Tiempo online total', value: totalOnline > 0 ? fmtDuration(totalOnline) : '—' },
            { label: 'Última conexión', value: device.last_connected_at ? fmtShort(device.last_connected_at) : '—' },
            { label: 'Total eventos', value: String(totalLogs) },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
              <p className="text-xs text-[#555] mb-2">{stat.label}</p>
              <p className="text-xl font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="border border-[#1a1a1a] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1a1a1a] bg-[#0a0a0a] flex items-center justify-between">
            <span className="text-xs font-medium text-[#888]">Historial de conexiones</span>
            <div className="flex items-center gap-4 text-xs text-[#555]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-0.5 bg-emerald-400 inline-block" />
                Conectado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-0.5 bg-[#333] inline-block" />
                Desconectado
              </span>
            </div>
          </div>
          <div className="bg-black p-4">
            {isLoading ? (
              <div className="h-48 flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-[#444] animate-spin" />
              </div>
            ) : chartData.length < 2 ? (
              <div className="h-48 flex flex-col items-center justify-center gap-2 text-[#444]">
                <Activity className="w-6 h-6" />
                <span className="text-xs">Sin historial aún</span>
              </div>
            ) : (
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <defs>
                      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#34d399" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#111" vertical={false} />
                    <XAxis dataKey="time" tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis domain={[0, 1]} ticks={[0, 1]} tickFormatter={(v) => (v === 1 ? 'On' : 'Off')} tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="stepAfter" dataKey="status" stroke="#34d399" strokeWidth={1.5} fill="url(#g)" dot={false} activeDot={{ r: 3, fill: '#34d399', stroke: '#000', strokeWidth: 2 }} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="border border-[#1a1a1a] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1a1a1a] bg-[#0a0a0a] flex items-center justify-between">
            <span className="text-xs font-medium text-[#888]">Sesiones recientes</span>
            <span className="text-xs font-mono text-[#555]">{sessions.length} sesiones</span>
          </div>
          {sessions.length === 0 ? (
            <div className="py-16 text-center text-xs text-[#444]">Sin sesiones registradas</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#111] bg-[#050505]">
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#555]">Conectado</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#555]">Desconectado</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#555]">Duración</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-[#555] w-24">Estado</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session, idx) => (
                  <tr key={idx} className="border-b border-[#0d0d0d] hover:bg-[#0a0a0a] transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-[#888]">{fmtDateTime(session.connectedAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {session.disconnectedAt ? (
                        <span className="font-mono text-xs text-[#666]">{fmtDateTime(session.disconnectedAt)}</span>
                      ) : (
                        <span className="text-xs text-[#444]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {session.duration !== null ? (
                        <span className="inline-flex items-center gap-1 font-mono text-xs text-amber-400">
                          <Clock className="w-3 h-3" />
                          {fmtDuration(session.duration)}
                        </span>
                      ) : (
                        <span className="text-xs text-[#444]">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {session.disconnectedAt === null ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400">
                          <Wifi className="w-3 h-3" />
                          Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-[#555]">
                          <WifiOff className="w-3 h-3" />
                          Finalizada
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
};
