'use client';

import { useState } from 'react';
import { PRODUCT_PRESETS, ProductPreset } from '@/lib/types/catalog';
import { Tag, Sparkles } from 'lucide-react';

interface ProductSelectProps {
  name: string;
  code: string;
  onNameChange: (name: string) => void;
  onCodeChange: (code: string) => void;
  compact?: boolean;
}

export default function ProductSelect({
  name,
  code,
  onNameChange,
  onCodeChange,
  compact = false,
}: ProductSelectProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>('');

  const handleSelectPreset = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedPreset(val);
    if (!val) return;

    const matched = PRODUCT_PRESETS.find((p) => `${p.name} (${p.code})` === val);
    if (matched) {
      onNameChange(matched.name);
      onCodeChange(matched.code);
    }
  };

  if (compact) {
    return (
      <div className="flex flex-col gap-1 w-full">
        {/* Preset Selector Dropdown */}
        <select
          value={selectedPreset}
          onChange={handleSelectPreset}
          className="w-full px-2 py-1 bg-purple-50/60 border border-purple-200 rounded text-[11px] font-semibold text-purple-900 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
        >
          <option value="">-- Pick Preset / Quick Catalog --</option>
          {PRODUCT_PRESETS.map((p, i) => (
            <option key={`${p.code}-${i}`} value={`${p.name} (${p.code})`}>
              {p.name} ({p.code})
            </option>
          ))}
        </select>

        {/* Custom text inputs */}
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={name}
            onChange={(e) => {
              onNameChange(e.target.value);
              setSelectedPreset('');
            }}
            placeholder="Product Name"
            className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none focus:border-blue-500"
          />
          <input
            type="text"
            value={code}
            onChange={(e) => {
              onCodeChange(e.target.value);
              setSelectedPreset('');
            }}
            placeholder="Code"
            className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono focus:bg-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Preset Quick Select */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-purple-500" /> Catalog Preset:
        </span>
        <select
          value={selectedPreset}
          onChange={handleSelectPreset}
          className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 cursor-pointer"
        >
          <option value="">-- Choose from standard catalog or type custom --</option>
          {PRODUCT_PRESETS.map((p, i) => (
            <option key={`${p.code}-${i}`} value={`${p.name} (${p.code})`}>
              {p.name} — [{p.code}]
            </option>
          ))}
        </select>
      </div>

      {/* Manual Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-0.5">Product Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              onNameChange(e.target.value);
              setSelectedPreset('');
            }}
            placeholder="e.g. Polo T-Shirt"
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-0.5">Product Code</label>
          <input
            type="text"
            value={code}
            onChange={(e) => {
              onCodeChange(e.target.value);
              setSelectedPreset('');
            }}
            placeholder="e.g. UC101"
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
}
