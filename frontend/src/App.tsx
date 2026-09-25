import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Network, RefreshCw, Layers, History, Wifi } from 'lucide-react';
import { DeviceRecord, MonitorStatus, NetworkLogRecord } from './types';
import { fetchDevices, fetchLogs, fetchStatus, triggerManualSync, updateDeviceAlias, updateDeviceBlocked } from './api';
import { StatsCards } from './components/StatsCards';
import { DevicesTable } from './components/DevicesTable';
import { ActivityLog } from './components/ActivityLog';
import { AliasModal } from './components/AliasModal';
import { DeviceDetailView } from './components/DeviceDetailView';

export const App: React.FC = () => {
  const [status, setStatus] = useState<MonitorStatus | null>(null);
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [logs, setLogs] = useState<NetworkLogRecord[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<'devices' | 'logs'>('devices');
  const [selectedDevice, setSelectedDevice] = useState<DeviceRecord | null>(null);
  const [detailDevice, setDetailDevice] = useState<DeviceRecord | null>(null);
  const [isAliasModalOpen, setIsAliasModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [secondsToNextPoll, setSecondsToNextPoll] = useState(30);
  const countdownRef = useRef<any>(null);

  const loadData = useCallback(async () => {
    try {
      const [s, d, l] = await Promise.all([
        fetchStatus(),
        fetchDevices(),
        fetchLogs(currentPage, 50),
      ]);
      setStatus(s);
      setDevices(d);
      setLogs(l.items);
      setTotalLogs(l.totalItems);
      setSecondsToNextPoll(30);
    } catch {}
  }, [currentPage]);

  useEffect(() => {
    loadData();
    const pollInterval = setInterval(loadData, 30000);
    countdownRef.current = setInterval(() => {
      setSecondsToNextPoll((prev) => (prev > 1 ? prev - 1 : 30));
    }, 1000);
    return () => {
      clearInterval(pollInterval);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [loadData]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await triggerManualSync();
      await loadData();
      setSecondsToNextPoll(30);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveAlias = async (id: string, alias: string) => {
    await updateDeviceAlias(id, alias);
    await loadData();
    if (detailDevice?.id === id) {
      const updated = devices.find((d) => d.id === id);
      if (updated) setDetailDevice({ ...updated, custom_alias: alias });
    }
  };

  const handleToggleBlock = async (id: string, is_blocked: boolean) => {
    await updateDeviceBlocked(id, is_blocked);
    await loadData();
    if (detailDevice?.id === id) {
      setDetailDevice((prev) => (prev ? { ...prev, is_blocked, is_online: is_blocked ? false : prev.is_online } : null));
    }
  };

  const openAliasModal = (device: DeviceRecord) => {
    setSelectedDevice(device);
    setIsAliasModalOpen(true);
  };

  if (detailDevice) {
    const live = devices.find((d) => d.id === detailDevice.id) ?? detailDevice;
    return (
      <>
        <DeviceDetailView
          device={live}
          onBack={() => setDetailDevice(null)}
          onEditAlias={openAliasModal}
          onToggleBlock={handleToggleBlock}
        />
        <AliasModal
          device={selectedDevice}
          isOpen={isAliasModalOpen}
          onClose={() => setIsAliasModalOpen(false)}
          onSave={handleSaveAlias}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-black text-[#ededed] flex flex-col">
      <header className="border-b border-[#1a1a1a] bg-black sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center">
              <Network className="w-4 h-4 text-black" />
            </div>
            <span className="font-semibold text-sm text-white">Network Tracker</span>
            <span className="text-[#444] text-sm">/</span>
            <span className="text-[#888] text-sm">{import.meta.env.VITE_ROUTER_NAME || 'Router'}</span>
          </div>

          <div className="flex items-center gap-3">
            {status && (
              <div className="flex items-center gap-1.5 text-xs text-[#888]">
                <Wifi className="w-3.5 h-3.5" />
                <span className="font-mono">{secondsToNextPoll}s</span>
              </div>
            )}
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#111] hover:bg-[#1a1a1a] border border-[#2a2a2a] text-xs text-[#ccc] hover:text-white transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              Sincronizar
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-8 w-full">
        <StatsCards
          status={status}
          onSync={handleSync}
          isSyncing={isSyncing}
          secondsToNextPoll={secondsToNextPoll}
        />

        <div className="flex items-center gap-1 border-b border-[#1a1a1a] mb-6">
          {(
            [
              { id: 'devices', label: `Dispositivos (${devices.length})`, icon: <Layers className="w-3.5 h-3.5" /> },
              { id: 'logs', label: `Registro (${totalLogs})`, icon: <History className="w-3.5 h-3.5" /> },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 pb-3 pt-0 text-xs font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.id
                  ? 'text-white border-white'
                  : 'text-[#666] hover:text-[#aaa] border-transparent'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'devices' ? (
          <DevicesTable
            devices={devices}
            onEditAlias={openAliasModal}
            onViewHistory={setDetailDevice}
            onToggleBlock={handleToggleBlock}
          />
        ) : (
          <ActivityLog
            logs={logs}
            totalLogs={totalLogs}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
          />
        )}
      </main>

      <footer className="border-t border-[#1a1a1a] py-4 text-center text-xs text-[#444]">
        {import.meta.env.VITE_ROUTER_NAME || 'Router'} · {import.meta.env.VITE_POCKETBASE_HOST || 'Database'} · sondeo cada 30s
      </footer>

      <AliasModal
        device={selectedDevice}
        isOpen={isAliasModalOpen}
        onClose={() => setIsAliasModalOpen(false)}
        onSave={handleSaveAlias}
      />
    </div>
  );
};

export default App;
