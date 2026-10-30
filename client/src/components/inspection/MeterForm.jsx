import React, { useState } from 'react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Zap, Droplet, Flame, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function MeterForm({ meters = [], onUpdateMeter, readOnly = false }) {
  const [meterValues, setMeterValues] = useState(() => {
    const map = {};
    for (const m of meters) {
      map[m.meterType] = m.value ?? 0;
    }
    return map;
  });

  const [savedTypes, setSavedTypes] = useState({});

  const handleValueChange = (type, val) => {
    setMeterValues((prev) => ({ ...prev, [type]: val }));
  };

  const handleSave = async (type) => {
    try {
      const val = parseFloat(meterValues[type]) || 0;
      await onUpdateMeter(type, { value: val });
      setSavedTypes((prev) => ({ ...prev, [type]: true }));
      toast.success(`${type} meter reading saved`);
      setTimeout(() => {
        setSavedTypes((prev) => ({ ...prev, [type]: false }));
      }, 2000);
    } catch (err) {
      toast.error(`Failed to save ${type} meter reading`);
    }
  };

  const meterConfigs = [
    { type: 'ELECTRICITY', label: 'Electricity Meter', unit: 'kWh', icon: Zap, color: 'text-amber-600' },
    { type: 'WATER', label: 'Mains Water Meter', unit: 'kL', icon: Droplet, color: 'text-blue-600' },
    { type: 'GAS', label: 'Natural Gas Meter', unit: 'MJ', icon: Flame, color: 'text-orange-600' },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="font-headline font-bold text-lg text-primary">Utility Meter Readings</h3>
        <p className="text-xs text-on-surface-variant">
          Record current meter values to verify exact consumption between handover periods
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {meterConfigs.map((cfg) => {
          const Icon = cfg.icon;
          const currentMeter = meters.find((m) => m.meterType === cfg.type);
          const val = meterValues[cfg.type] ?? currentMeter?.value ?? 0;
          const isSaved = savedTypes[cfg.type];

          return (
            <div
              key={cfg.type}
              className="p-5 bg-surface-container-lowest rounded-lg border border-outline-variant/40 space-y-4 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded bg-surface-container ${cfg.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-headline font-bold text-sm text-primary">{cfg.label}</h4>
                  <span className="text-[10px] font-mono text-outline uppercase">
                    Units: {cfg.unit}
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="block text-[11px] font-mono font-bold uppercase text-on-surface-variant">
                  Current Reading Value
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="any"
                    disabled={readOnly}
                    value={val}
                    onChange={(e) => handleValueChange(cfg.type, e.target.value)}
                    className="flex-1 px-3 py-2 text-sm bg-surface-container-lowest border border-outline-variant/60 rounded font-mono font-bold text-primary focus:outline-none focus:ring-1 focus:border-primary focus:ring-primary disabled:bg-surface-container-low"
                  />
                  <span className="text-xs font-mono text-on-surface-variant">{cfg.unit}</span>
                </div>
              </div>

              {!readOnly && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  onClick={() => handleSave(cfg.type)}
                  icon={isSaved ? Check : undefined}
                >
                  {isSaved ? 'Reading Saved' : 'Save Reading'}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
