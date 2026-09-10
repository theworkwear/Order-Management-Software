'use client';

import { useState, useRef, useEffect } from 'react';
import {
  PRODUCT_PRESETS,
  ProductPreset,
  resolveProductIntelligence,
  normalizeProductCode,
  searchProductCatalog,
  getPresetsByCategory,
} from '@/lib/types/catalog';
import { Sparkles, Check, ArrowRight, Layers } from 'lucide-react';

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
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const categorizedPresets = getPresetsByCategory();

  // Run intelligence on current inputs
  const nameIntelligence = resolveProductIntelligence(name);
  const codeIntelligence = resolveProductIntelligence(code);

  // Filter catalog presets for autocomplete typeahead
  const suggestions = name.trim().length >= 1 ? searchProductCatalog(name) : [];

  // Close suggestions popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Preset Dropdown Selection
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

  // Handle applying a catalog preset directly (e.g. from autocomplete)
  const applyPreset = (preset: ProductPreset) => {
    onNameChange(preset.name);
    onCodeChange(preset.code);
    setSelectedPreset(`${preset.name} (${preset.code})`);
    setShowSuggestions(false);
  };

  // Handle Name Input Changes with Intelligent Auto-Inference
  const handleNameInputChange = (val: string) => {
    onNameChange(val);
    setSelectedPreset('');

    // Check if the typed value intelligently matches a catalog item
    const intel = resolveProductIntelligence(val);
    if (intel) {
      const isCodeEmpty = !code.trim();
      const isCodeMatchingAnotherPreset = PRODUCT_PRESETS.some(
        (p) => p.code.toLowerCase() === code.trim().toLowerCase()
      );

      // Auto-fill code if it's empty or currently set to an old preset
      if (isCodeEmpty || isCodeMatchingAnotherPreset) {
        onCodeChange(intel.preset.code);
      }
    }
  };

  // Handle Code Input Changes with Normalization
  const handleCodeInputChange = (val: string) => {
    onCodeChange(val);
    setSelectedPreset('');

    // Check if typed code directly matches a preset
    const intel = resolveProductIntelligence(val);
    if (intel && (!name.trim() || PRODUCT_PRESETS.some((p) => p.name === name.trim()))) {
      onNameChange(intel.preset.name);
    }
  };

  // Normalize code on blur (e.g. "uc 106" -> "UC106")
  const handleCodeBlur = () => {
    if (code) {
      const normalized = normalizeProductCode(code);
      if (normalized !== code) {
        onCodeChange(normalized);
      }
    }
  };

  // ========================================================
  // Compact Mode (used in order detail table rows)
  // ========================================================
  if (compact) {
    return (
      <div className="flex flex-col gap-1 w-full relative" ref={dropdownRef}>
        {/* Preset Selector Dropdown */}
        <select
          value={selectedPreset}
          onChange={handleSelectPreset}
          className="w-full px-2 py-1 bg-purple-50/70 hover:bg-purple-50 border border-purple-200 rounded text-[11px] font-semibold text-purple-950 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
        >
          <option value="">⚡ Pick Catalog Preset...</option>
          {Object.entries(categorizedPresets).map(([category, items]) => (
            <optgroup key={category} label={category}>
              {items.map((p) => (
                <option key={`${p.code}-${p.name}`} value={`${p.name} (${p.code})`}>
                  {p.name} ({p.code})
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* Custom text inputs with smart indicators */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameInputChange(e.target.value)}
              onFocus={() => {
                if (name.trim().length >= 1) setShowSuggestions(true);
              }}
              placeholder="Product Name (e.g. Ladies Classic Shirt)"
              className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:bg-white focus:outline-none focus:border-purple-500"
            />

            {/* Compact Autocomplete Popover */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 top-full mt-1 w-64 max-h-48 overflow-y-auto bg-white border border-purple-200 rounded-lg shadow-xl z-50 py-1 divide-y divide-slate-100">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-50/50 flex items-center justify-between">
                  <span>Intelligent Suggestions</span>
                  <Sparkles className="w-3 h-3 text-purple-500" />
                </div>
                {suggestions.slice(0, 5).map((p) => (
                  <button
                    key={`${p.code}-${p.name}`}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-purple-50 flex items-center justify-between gap-1 transition-colors text-xs"
                  >
                    <div className="truncate">
                      <span className="font-medium text-slate-800">{p.name}</span>
                      <span className="block text-[10px] text-slate-400">{p.category}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 text-purple-700">
                      {p.code}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <input
              type="text"
              value={code}
              onChange={(e) => handleCodeInputChange(e.target.value)}
              onBlur={handleCodeBlur}
              placeholder="Code"
              className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Compact Intelligent Feedback Chip */}
        {nameIntelligence && (
          <div className="flex items-center justify-between text-[10px] px-1 text-purple-700">
            {code.trim().toUpperCase() === nameIntelligence.preset.code ? (
              <span className="flex items-center gap-1 font-semibold text-emerald-600">
                <Check className="w-2.5 h-2.5" /> Auto-matched: {nameIntelligence.preset.code}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onCodeChange(nameIntelligence.preset.code)}
                className="flex items-center gap-1 font-semibold text-purple-700 hover:text-purple-900 underline"
                title={nameIntelligence.matchReason}
              >
                <Sparkles className="w-2.5 h-2.5 text-purple-500" /> Auto-detect: {nameIntelligence.preset.code} (Click to apply)
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // ========================================================
  // Full / Modal Mode (used in Create Order modal)
  // ========================================================
  return (
    <div className="space-y-2.5 relative" ref={dropdownRef}>
      {/* Preset Quick Select Dropdown */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-md flex items-center gap-1.5 shrink-0 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-purple-600" /> Catalog Preset:
        </span>
        <select
          value={selectedPreset}
          onChange={handleSelectPreset}
          className="flex-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100/60 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 cursor-pointer transition-colors"
        >
          <option value="">-- Choose from standard catalog or type custom --</option>
          {Object.entries(categorizedPresets).map(([category, items]) => (
            <optgroup key={category} label={category}>
              {items.map((p) => (
                <option key={`${p.code}-${p.name}`} value={`${p.name} (${p.code})`}>
                  {p.name} — [{p.code}]
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Manual & Autocomplete Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {/* Product Name Input */}
        <div className="relative">
          <div className="flex items-center justify-between mb-0.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Product Name
            </label>
            {nameIntelligence && (
              <span className="text-[10px] font-semibold text-purple-600 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Matched {nameIntelligence.preset.code}
              </span>
            )}
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameInputChange(e.target.value)}
            onFocus={() => {
              if (name.trim().length >= 1) setShowSuggestions(true);
            }}
            placeholder="e.g. Ladies Classic Shirt, Polo, Hoodie"
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30"
          />

          {/* Autocomplete Dropdown List */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 top-full mt-1 w-full max-h-56 overflow-y-auto bg-white border border-purple-200 rounded-xl shadow-2xl z-50 py-1 divide-y divide-slate-100">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-50 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-purple-600" />
                  Intelligent Product Suggestions
                </span>
                <span className="text-[10px] text-purple-500 font-normal">Click to apply</span>
              </div>
              {suggestions.map((p) => (
                <button
                  key={`${p.code}-${p.name}`}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="w-full text-left px-3 py-2 hover:bg-purple-50/80 flex items-center justify-between gap-2 transition-colors"
                >
                  <div>
                    <span className="block text-xs font-semibold text-slate-800">{p.name}</span>
                    <span className="block text-[10px] text-slate-400 flex items-center gap-1">
                      <Layers className="w-2.5 h-2.5" /> {p.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-purple-100 text-purple-800 border border-purple-200">
                      {p.code}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-300" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Code Input */}
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Product Code
            </label>
            {code && (
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                {normalizeProductCode(code)}
              </span>
            )}
          </div>
          <input
            type="text"
            value={code}
            onChange={(e) => handleCodeInputChange(e.target.value)}
            onBlur={handleCodeBlur}
            placeholder="e.g. UC106, UC101, UX4"
            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 uppercase focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30"
          />
        </div>
      </div>

      {/* Smart Intelligence Banner */}
      {nameIntelligence && (
        <div className="rounded-lg p-2 text-xs flex items-center justify-between border bg-purple-50/70 border-purple-200 text-purple-900 transition-all">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span>
              Intelligent Match: <strong className="font-bold">{nameIntelligence.preset.name}</strong> ({nameIntelligence.preset.code})
            </span>
          </div>
          {code.trim().toUpperCase() !== nameIntelligence.preset.code && (
            <button
              type="button"
              onClick={() => onCodeChange(nameIntelligence.preset.code)}
              className="px-2.5 py-0.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-[11px] font-bold shadow-xs transition-colors shrink-0"
            >
              Apply Code {nameIntelligence.preset.code}
            </button>
          )}
        </div>
      )}

      {/* Reverse Code Match Banner (if code typed matches a preset but name differs) */}
      {!nameIntelligence && codeIntelligence && name.trim().toLowerCase() !== codeIntelligence.preset.name.toLowerCase() && (
        <div className="rounded-lg p-2 text-xs flex items-center justify-between border bg-indigo-50/70 border-indigo-200 text-indigo-900 transition-all">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <span>
              Code [{codeIntelligence.preset.code}] corresponds to <strong className="font-bold">{codeIntelligence.preset.name}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNameChange(codeIntelligence.preset.name)}
            className="px-2.5 py-0.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[11px] font-bold shadow-xs transition-colors shrink-0"
          >
            Apply Name
          </button>
        </div>
      )}
    </div>
  );
}
