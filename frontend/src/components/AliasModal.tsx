import React, { useState } from 'react';
import { X, Tag, Check } from 'lucide-react';
import { DeviceRecord } from '../types';

interface Props {
  device: DeviceRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, alias: string) => Promise<void>;
}

export const AliasModal: React.FC<Props> = ({ device, isOpen, onClose, onSave }) => {
  const [alias, setAlias] = useState(device?.custom_alias || '');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (device) setAlias(device.custom_alias || '');
  }, [device]);

  if (!isOpen || !device) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(device.id, alias.trim());
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
          <div className="flex items-center gap-2.5">
            <Tag className="w-4 h-4 text-[#888]" />
            <span className="text-sm font-medium text-white">Editar alias</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[#1a1a1a] text-[#555] hover:text-[#aaa] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-[#666]">Hostname del router</label>
            <input
              readOnly
              value={device.name}
              className="w-full bg-[#050505] border border-[#1a1a1a] rounded-md px-3 py-2 text-xs text-[#555] cursor-not-allowed font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#666]">MAC Address</label>
            <input
              readOnly
              value={device.mac}
              className="w-full bg-[#050505] border border-[#1a1a1a] rounded-md px-3 py-2 text-xs text-[#555] cursor-not-allowed font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-[#aaa]">Alias</label>
            <input
              type="text"
              placeholder="Ej: Celular Gaspar, Smart TV, Laptop..."
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              className="w-full bg-[#050505] border border-[#2a2a2a] focus:border-[#444] rounded-md px-3 py-2 text-sm text-white placeholder-[#333] focus:outline-none transition-colors"
              autoFocus
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs text-[#666] hover:text-[#aaa] transition-colors rounded-md hover:bg-[#111]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-white text-black rounded-md hover:bg-[#e5e5e5] disabled:opacity-50 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
