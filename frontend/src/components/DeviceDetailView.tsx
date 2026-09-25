import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Calendar,
  ChevronLeft,
  ChevronRight,
  Ban,
  ShieldCheck
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { DeviceRecord, NetworkLogRecord } from '../types';
import { fetchDeviceLogs } from '../api';

interface Props {
  device: DeviceRecord;
  onBack: () => void;
  onEditAlias: (device: DeviceRecord) => void;
  onToggleBlock?: (id: string, is_blocked: boolean) => void;
}

interface RawSession {
  connectedAt: string;
  disconnectedAt: string | null;
  duration: number | null;
}

interface DaySegment {
  connectedAt: string;
  disconnectedAt: string | null;
  durationSec: number;
  startMin: number;
  endMin: number;
  isActive: boolean;
}

interface DayData {
  key: string;
  label: string;
  shortLabel: string;
  date: Date;
  segments: DaySegment[];
  totalOnlineSec: number;
  sessionsCount: number;
  firstConnectTime: string | null;
  lastDisconnectTime: string | null;
  isActiveToday: boolean;
}

interface ChartPoint {
  minute: number;
  status: number;
  timeStr: string;
  sessionDuration?: number;
  sessionRange?: string;
}

function fmtDuration(s: number): string {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function fmtTimeShort(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function minToTimeStr(min: number): string {
  const m = Math.max(0, Math.min(1440, Math.round(min)));
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return `${String(h).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

const ChartTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const p: ChartPoint = payload[0]?.payload;
  return (
    <div className="bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="text-[#888] font-mono mb-1">{p.timeStr} hs</p>
      <div className="flex items-center gap-1.5 font-medium">
        <span className={`w-2 h-2 rounded-full ${p.status === 1 ? 'bg-emerald-400' : 'bg-[#555]'}`} />
        <span className={p.status === 1 ? 'text-emerald-400' : 'text-[#777]'}>
          {p.status === 1 ? 'Conectado' : 'Desconectado'}
        </span>
      </div>
      {p.sessionRange && (
        <p className="text-[11px] text-[#aaa] mt-1 font-mono">{p.sessionRange}</p>
      )}
      {p.sessionDuration && p.sessionDuration > 0 && (
        <p className="text-[11px] text-amber-400 mt-0.5 font-mono">
          Duración: {fmtDuration(p.sessionDuration)}
        </p>
      )}
    </div>
  );
};

export const DeviceDetailView: React.FC<Props> = ({ device, onBack, onEditAlias, onToggleBlock }) => {
  const [logs, setLogs] = useState<NetworkLogRecord[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedMac, setCopiedMac] = useState(false);
  const [selectedDayKey, setSelectedDayKey] = useState<string>('');
  const [hoveredSegment, setHoveredSegment] = useState<DaySegment | null>(null);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchDeviceLogs(device.mac, 1, 300);
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

  const rawSessions: RawSession[] = useMemo(() => {
    const sorted = [...logs].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    const result: RawSession[] = [];
    let i = 0;
    while (i < sorted.length) {
      const log = sorted[i];
      if (log.event_type === 'disconnected') {
        const next = sorted[i + 1];
        result.push({
          connectedAt: next?.timestamp ?? log.timestamp,
          disconnectedAt: log.timestamp,
          duration: log.session_duration ?? null
        });
        i += next?.event_type === 'connected' ? 2 : 1;
      } else {
        result.push({
          connectedAt: log.timestamp,
          disconnectedAt: null,
          duration: null
        });
        i++;
      }
    }
    return result.filter((s) => s.duration === null || s.duration > 0);
  }, [logs]);

  const daysData = useMemo<DayData[]>(() => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    const dayKeysSet = new Set<string>();
    dayKeysSet.add(todayKey);

    for (const s of rawSessions) {
      const d = new Date(s.connectedAt);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dayKeysSet.add(k);
      if (s.disconnectedAt) {
        const d2 = new Date(s.disconnectedAt);
        const k2 = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, '0')}-${String(d2.getDate()).padStart(2, '0')}`;
        dayKeysSet.add(k2);
      }
    }

    const sortedKeys = Array.from(dayKeysSet).sort((a, b) => b.localeCompare(a));

    return sortedKeys.map((k) => {
      const [y, m, dayNum] = k.split('-').map(Number);
      const dayStart = new Date(y, m - 1, dayNum, 0, 0, 0, 0).getTime();
      const dayEnd = new Date(y, m - 1, dayNum, 23, 59, 59, 999).getTime();
      const isToday = k === todayKey;
      const isYesterday = k === yesterdayKey;
      const dateObj = new Date(y, m - 1, dayNum);

      const segments: DaySegment[] = [];
      let totalSec = 0;
      let firstConnect: string | null = null;
      let lastDisconnect: string | null = null;
      let activeToday = false;

      for (const s of rawSessions) {
        const startTs = new Date(s.connectedAt).getTime();
        const endTs = s.disconnectedAt
          ? new Date(s.disconnectedAt).getTime()
          : isToday && device.is_online
          ? now.getTime()
          : startTs;

        if (startTs <= dayEnd && endTs >= dayStart) {
          const effStart = Math.max(dayStart, startTs);
          const effEnd = Math.min(dayEnd, endTs);

          if (effEnd >= effStart) {
            const dur = Math.max(1, Math.round((effEnd - effStart) / 1000));
            const startMin = Math.round((effStart - dayStart) / 60000);
            const endMin = Math.round((effEnd - dayStart) / 60000);
            const isAct = s.disconnectedAt === null && isToday && device.is_online;

            if (isAct) activeToday = true;

            segments.push({
              connectedAt: s.connectedAt,
              disconnectedAt: s.disconnectedAt,
              durationSec: dur,
              startMin,
              endMin: Math.max(startMin + 1, endMin),
              isActive: isAct
            });

            totalSec += dur;

            if (!firstConnect || startTs < new Date(firstConnect).getTime()) {
              firstConnect = s.connectedAt;
            }
            if (s.disconnectedAt) {
              if (!lastDisconnect || new Date(s.disconnectedAt).getTime() > new Date(lastDisconnect).getTime()) {
                lastDisconnect = s.disconnectedAt;
              }
            }
          }
        }
      }

      segments.sort((a, b) => a.startMin - b.startMin);

      const dayName = dateObj.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
      let label = dayName;
      if (isToday) label = `Hoy (${dayName})`;
      else if (isYesterday) label = `Ayer (${dayName})`;

      return {
        key: k,
        label,
        shortLabel: isToday ? 'Hoy' : isYesterday ? 'Ayer' : dayName,
        date: dateObj,
        segments,
        totalOnlineSec: totalSec,
        sessionsCount: segments.length,
        firstConnectTime: firstConnect,
        lastDisconnectTime: lastDisconnect,
        isActiveToday: activeToday
      };
    });
  }, [rawSessions, device.is_online]);

  useEffect(() => {
    if (daysData.length > 0 && !selectedDayKey) {
      setSelectedDayKey(daysData[0].key);
    }
  }, [daysData, selectedDayKey]);

  const currentDayData = useMemo<DayData | undefined>(() => {
    return daysData.find((d) => d.key === selectedDayKey) || daysData[0];
  }, [daysData, selectedDayKey]);

  const dayChartData = useMemo<ChartPoint[]>(() => {
    if (!currentDayData) return [];
    const points: ChartPoint[] = [];
    const segments = currentDayData.segments;

    if (segments.length === 0) {
      return [
        { minute: 0, status: 0, timeStr: '00:00' },
        { minute: 1440, status: 0, timeStr: '24:00' }
      ];
    }

    const firstSeg = segments[0];
    if (firstSeg.startMin > 0) {
      points.push({ minute: 0, status: 0, timeStr: '00:00' });
      points.push({ minute: firstSeg.startMin - 0.01, status: 0, timeStr: minToTimeStr(firstSeg.startMin) });
    } else {
      points.push({
        minute: 0,
        status: 1,
        timeStr: '00:00',
        sessionDuration: firstSeg.durationSec,
        sessionRange: `${fmtTimeShort(firstSeg.connectedAt)} — ${firstSeg.disconnectedAt ? fmtTimeShort(firstSeg.disconnectedAt) : 'Ahora'}`
      });
    }

    segments.forEach((seg, idx) => {
      const range = `${fmtTimeShort(seg.connectedAt)} — ${seg.disconnectedAt ? fmtTimeShort(seg.disconnectedAt) : 'Ahora'}`;
      points.push({
        minute: seg.startMin,
        status: 1,
        timeStr: minToTimeStr(seg.startMin),
        sessionDuration: seg.durationSec,
        sessionRange: range
      });
      points.push({
        minute: seg.endMin,
        status: 1,
        timeStr: minToTimeStr(seg.endMin),
        sessionDuration: seg.durationSec,
        sessionRange: range
      });

      const nextSeg = segments[idx + 1];
      if (nextSeg) {
        if (nextSeg.startMin > seg.endMin) {
          points.push({ minute: seg.endMin + 0.01, status: 0, timeStr: minToTimeStr(seg.endMin) });
          points.push({ minute: nextSeg.startMin - 0.01, status: 0, timeStr: minToTimeStr(nextSeg.startMin) });
        }
      } else {
        if (seg.endMin < 1440) {
          points.push({ minute: seg.endMin + 0.01, status: 0, timeStr: minToTimeStr(seg.endMin) });
          points.push({ minute: 1440, status: 0, timeStr: '24:00' });
        }
      }
    });

    return points;
  }, [currentDayData]);

  const totalLifetimeOnline = useMemo(() => {
    return rawSessions
      .filter((s) => s.duration !== null)
      .reduce((acc, s) => acc + (s.duration || 0), 0);
  }, [rawSessions]);

  const currentDayIndex = daysData.findIndex((d) => d.key === selectedDayKey);
  const canGoNewer = currentDayIndex > 0;
  const canGoOlder = currentDayIndex < daysData.length - 1 && currentDayIndex !== -1;

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
            {onToggleBlock && (
              <button
                onClick={() => onToggleBlock(device.id, !device.is_blocked)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs transition-colors ${
                  device.is_blocked
                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-400'
                }`}
              >
                {device.is_blocked ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Desbloquear
                  </>
                ) : (
                  <>
                    <Ban className="w-3.5 h-3.5" />
                    Bloquear en router
                  </>
                )}
              </button>
            )}
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
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-white">{displayName}</h1>
              {device.is_blocked ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full border text-rose-400 border-rose-500/30 bg-rose-500/10">
                  <Ban className="w-3 h-3 text-rose-400" />
                  Bloqueado en router
                </span>
              ) : (
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${
                    device.is_online
                      ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/8'
                      : 'text-[#555] border-[#2a2a2a] bg-[#0a0a0a]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      device.is_online ? 'bg-emerald-400 animate-pulse' : 'bg-[#444]'
                    }`}
                  />
                  {device.is_online ? 'En línea' : 'Desconectado'}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#555]">
              <button
                onClick={copyMac}
                className="flex items-center gap-1.5 font-mono hover:text-[#aaa] transition-colors"
              >
                {copiedMac ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span className={copiedMac ? 'text-emerald-400' : ''}>{device.mac}</span>
              </button>
              <span>{device.ip || 'Sin IP'}</span>
              <span>{device.connection_type || 'Wi-Fi'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Tiempo online total', value: totalLifetimeOnline > 0 ? fmtDuration(totalLifetimeOnline) : '—' },
            { label: 'Total sesiones', value: String(rawSessions.length) },
            { label: 'Última conexión', value: device.last_connected_at ? fmtDateTime(device.last_connected_at) : '—' },
            { label: 'Días registrados', value: `${daysData.length} día${daysData.length > 1 ? 's' : ''}` },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
              <p className="text-xs text-[#555] mb-1">{stat.label}</p>
              <p className="text-lg font-bold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="border border-[#1a1a1a] rounded-xl bg-[#0a0a0a] overflow-hidden">
          <div className="p-4 border-b border-[#1a1a1a] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-semibold text-white">Línea de tiempo por día</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={!canGoOlder}
                onClick={() => canGoOlder && setSelectedDayKey(daysData[currentDayIndex + 1].key)}
                className="p-1 rounded-md bg-[#111] hover:bg-[#1f1f1f] border border-[#222] text-[#888] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Día anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={!canGoNewer}
                onClick={() => canGoNewer && setSelectedDayKey(daysData[currentDayIndex - 1].key)}
                className="p-1 rounded-md bg-[#111] hover:bg-[#1f1f1f] border border-[#222] text-[#888] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Día siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-4 py-3 border-b border-[#141414] bg-black/40 overflow-x-auto flex items-center gap-2 scrollbar-none">
            {daysData.map((d) => {
              const isSelected = d.key === (currentDayData?.key || '');
              return (
                <button
                  key={d.key}
                  onClick={() => setSelectedDayKey(d.key)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-sm'
                      : 'bg-[#111] border-[#222] text-[#888] hover:text-white hover:border-[#333]'
                  }`}
                >
                  <span>{d.label}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                      isSelected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-black/50 text-[#666]'
                    }`}
                  >
                    {d.totalOnlineSec > 0 ? fmtDuration(d.totalOnlineSec) : '0s'}
                  </span>
                </button>
              );
            })}
          </div>

          {currentDayData && (
            <div className="p-5 space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-black/60 border border-[#1a1a1a] rounded-lg p-3">
                <div>
                  <p className="text-[11px] text-[#666]">Tiempo online del día</p>
                  <p className="text-base font-bold text-emerald-400 mt-0.5">
                    {currentDayData.totalOnlineSec > 0 ? fmtDuration(currentDayData.totalOnlineSec) : '0s'}
                  </p>
                  <p className="text-[10px] text-[#555]">
                    {((currentDayData.totalOnlineSec / 86400) * 100).toFixed(1)}% de 24 horas
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#666]">Sesiones del día</p>
                  <p className="text-base font-bold text-white mt-0.5">
                    {currentDayData.sessionsCount} {currentDayData.sessionsCount === 1 ? 'sesión' : 'sesiones'}
                  </p>
                  <p className="text-[10px] text-[#555]">
                    {currentDayData.sessionsCount > 0 ? 'Conexiones registradas' : 'Sin actividad'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-[#666]">Primera conexión</p>
                  <p className="text-base font-bold text-white mt-0.5">
                    {currentDayData.firstConnectTime ? fmtTimeShort(currentDayData.firstConnectTime) : '—'}
                  </p>
                  <p className="text-[10px] text-[#555]">Hora de inicio</p>
                </div>
                <div>
                  <p className="text-[11px] text-[#666]">Último estado</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {currentDayData.isActiveToday ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-base font-bold text-emerald-400">En línea ahora</span>
                      </>
                    ) : currentDayData.lastDisconnectTime ? (
                      <span className="text-base font-bold text-[#888]">
                        Desc. {fmtTimeShort(currentDayData.lastDisconnectTime)}
                      </span>
                    ) : (
                      <span className="text-base font-bold text-[#555]">—</span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#555]">Fin de actividad</p>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[#aaa]">Barra de presencia 24 horas</span>
                  <div className="flex items-center gap-3 text-[11px] text-[#666]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2 bg-emerald-500 rounded-sm" />
                      Conectado
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2 bg-[#161616] rounded-sm border border-[#2a2a2a]" />
                      Desconectado
                    </span>
                  </div>
                </div>

                <div className="h-10 bg-[#070707] border border-[#1f1f1f] rounded-lg relative overflow-hidden flex items-center shadow-inner">
                  {Array.from({ length: 24 }).map((_, h) => (
                    <div
                      key={h}
                      style={{ left: `${(h / 24) * 100}%` }}
                      className="absolute top-0 bottom-0 border-l border-white/[0.03] pointer-events-none"
                    />
                  ))}

                  {currentDayData.segments.map((seg, idx) => {
                    const left = (seg.startMin / 1440) * 100;
                    const width = Math.max(0.4, ((seg.endMin - seg.startMin) / 1440) * 100);
                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setHoveredSegment(seg)}
                        onMouseLeave={() => setHoveredSegment(null)}
                        style={{ left: `${left}%`, width: `${width}%` }}
                        className="absolute h-7 top-1.5 rounded-sm bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 transition-all cursor-pointer shadow-md shadow-emerald-500/10 group"
                      >
                        {seg.isActive && (
                          <span className="absolute -right-1 top-1.5 w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between text-[10px] font-mono text-[#555] px-1 mt-1.5">
                  <span>00:00</span>
                  <span>03:00</span>
                  <span>06:00</span>
                  <span>09:00</span>
                  <span>12:00</span>
                  <span>15:00</span>
                  <span>18:00</span>
                  <span>21:00</span>
                  <span>24:00</span>
                </div>

                {hoveredSegment && (
                  <div className="mt-3 p-2.5 rounded-lg bg-[#111] border border-emerald-500/30 text-xs flex flex-wrap items-center justify-between gap-2 shadow-lg animate-in fade-in duration-150">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[#888]">Rango:</span>
                      <span className="font-mono text-white font-medium">
                        {fmtTime(hoveredSegment.connectedAt)} — {hoveredSegment.disconnectedAt ? fmtTime(hoveredSegment.disconnectedAt) : 'En línea ahora'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-[#888]">Duración:</span>
                      <span className="text-amber-400 font-bold">
                        {fmtDuration(hoveredSegment.durationSec)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[#aaa]">
                    Gráfico continuo de conexión (Escala real 24 horas)
                  </span>
                  <span className="text-[11px] text-[#555]">
                    {currentDayData.label}
                  </span>
                </div>

                <div className="h-44 bg-black border border-[#1a1a1a] rounded-lg p-2">
                  {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 text-[#444] animate-spin" />
                    </div>
                  ) : dayChartData.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center gap-1.5 text-[#444]">
                      <Activity className="w-5 h-5" />
                      <span className="text-xs">Sin actividad para este día</span>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dayChartData} margin={{ top: 8, right: 10, left: -26, bottom: 0 }}>
                        <defs>
                          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#141414" vertical={false} />
                        <XAxis
                          type="number"
                          dataKey="minute"
                          domain={[0, 1440]}
                          ticks={[0, 180, 360, 540, 720, 900, 1080, 1260, 1440]}
                          tickFormatter={minToTimeStr}
                          tick={{ fill: '#555', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 1]}
                          ticks={[0, 1]}
                          tickFormatter={(v) => (v === 1 ? 'On' : 'Off')}
                          tick={{ fill: '#555', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Area
                          type="stepAfter"
                          dataKey="status"
                          stroke="#10b981"
                          strokeWidth={2}
                          fill="url(#areaGrad)"
                          dot={false}
                          activeDot={{ r: 3, fill: '#10b981', stroke: '#000', strokeWidth: 2 }}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-white">
                    Sesiones de {currentDayData.label}
                  </span>
                  <span className="text-xs font-mono text-[#666]">
                    {currentDayData.segments.length} {currentDayData.segments.length === 1 ? 'sesión' : 'sesiones'}
                  </span>
                </div>

                {currentDayData.segments.length === 0 ? (
                  <div className="py-10 text-center text-xs text-[#555] bg-black/40 border border-[#161616] rounded-lg">
                    No hubo conexiones registradas en este día.
                  </div>
                ) : (
                  <div className="border border-[#1a1a1a] rounded-lg overflow-hidden bg-black/40">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-[#141414] bg-[#080808]">
                          <th className="text-left px-4 py-3 font-medium text-[#666]">Conectado</th>
                          <th className="text-left px-4 py-3 font-medium text-[#666]">Desconectado</th>
                          <th className="text-left px-4 py-3 font-medium text-[#666]">Duración</th>
                          <th className="text-left px-4 py-3 font-medium text-[#666] w-24">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...currentDayData.segments].reverse().map((seg, idx) => (
                          <tr key={idx} className="border-b border-[#101010] hover:bg-[#0f0f0f] transition-colors">
                            <td className="px-4 py-3 font-mono text-[#999]">
                              {fmtTime(seg.connectedAt)}
                            </td>
                            <td className="px-4 py-3 font-mono text-[#777]">
                              {seg.disconnectedAt ? fmtTime(seg.disconnectedAt) : '—'}
                            </td>
                            <td className="px-4 py-3 font-mono font-medium text-amber-400">
                              <span className="inline-flex items-center gap-1.5">
                                <Clock className="w-3 h-3" />
                                {fmtDuration(seg.durationSec)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {seg.disconnectedAt === null && seg.isActive ? (
                                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                  Activo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-[#555]">
                                  <WifiOff className="w-3 h-3" />
                                  Finalizada
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
