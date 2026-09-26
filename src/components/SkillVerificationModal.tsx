import React, { useState } from 'react';
import { ShieldCheck, Check, X, Sparkles, AlertCircle, Plus, CheckSquare, Square } from 'lucide-react';

interface SkillVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  detectedKeywords: string[];
  detectedQualifications: string[];
  onConfirmAndGenerate: (confirmedSkills: string[], excludedSkills: string[]) => void;
  generating: boolean;
}

export const SkillVerificationModal: React.FC<SkillVerificationModalProps> = ({
  isOpen,
  onClose,
  detectedKeywords,
  detectedQualifications,
  onConfirmAndGenerate,
  generating,
}) => {
  // All items default to checked (user can uncheck false assumptions)
  const allItems = Array.from(new Set([...detectedKeywords, ...detectedQualifications]));
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    allItems.forEach((item) => {
      initial[item] = true;
    });
    return initial;
  });

  const [customSkill, setCustomSkill] = useState('');
  const [extraSkills, setExtraSkills] = useState<string[]>([]);

  if (!isOpen) return null;

  const toggleItem = (item: string) => {
    setSelectedItems((prev) => ({
      ...prev,
      [item]: !prev[item],
    }));
  };

  const selectAll = () => {
    const updated: Record<string, boolean> = {};
    allItems.forEach((item) => {
      updated[item] = true;
    });
    setSelectedItems(updated);
  };

  const deselectAll = () => {
    const updated: Record<string, boolean> = {};
    allItems.forEach((item) => {
      updated[item] = false;
    });
    setSelectedItems(updated);
  };

  const handleAddCustomSkill = () => {
    if (customSkill.trim() && !extraSkills.includes(customSkill.trim())) {
      const skill = customSkill.trim();
      setExtraSkills((prev) => [...prev, skill]);
      setSelectedItems((prev) => ({ ...prev, [skill]: true }));
      setCustomSkill('');
    }
  };

  const handleGenerate = () => {
    const confirmed = Object.entries(selectedItems)
      .filter(([_, isSelected]) => isSelected)
      .map(([item]) => item);

    const excluded = Object.entries(selectedItems)
      .filter(([_, isSelected]) => !isSelected)
      .map(([item]) => item);

    onConfirmAndGenerate(confirmed, excluded);
  };

  const confirmedCount = Object.values(selectedItems).filter(Boolean).length;
  const excludedCount = Object.values(selectedItems).filter((v) => !v).length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Verify Your Skills & Prevent False Claims
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Check the skills/tools you <strong className="text-emerald-400">actually possess</strong>. Uncheck any false assumptions so the AI won't fabricate credentials.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick controls */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 font-semibold">{confirmedCount} Confirmed</span>
            <span className="text-slate-600">|</span>
            <span className="text-rose-400 font-semibold">{excludedCount} Excluded</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="text-indigo-400 hover:underline flex items-center gap-1"
            >
              <CheckSquare className="w-3.5 h-3.5" /> Check All
            </button>
            <span className="text-slate-600">|</span>
            <button
              type="button"
              onClick={deselectAll}
              className="text-slate-400 hover:underline flex items-center gap-1"
            >
              <Square className="w-3.5 h-3.5" /> Uncheck All
            </button>
          </div>
        </div>

        {/* Checklist Grid */}
        <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
          {allItems.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-4 text-center">No missing skill gaps detected.</p>
          ) : (
            allItems.map((item) => {
              const isSelected = !!selectedItems[item];
              return (
                <div
                  key={item}
                  onClick={() => toggleItem(item)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                        isSelected
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-bold'
                          : 'border-slate-700 bg-slate-900'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-xs font-medium">{item}</span>
                  </div>

                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {isSelected ? 'Include' : 'Exclude'}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Add custom extra skill */}
        <div className="pt-2">
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            Add Extra Verified Skill or Certification (Optional)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customSkill}
              onChange={(e) => setCustomSkill(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomSkill())}
              placeholder="e.g. AWS Certified Solutions Architect..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={handleAddCustomSkill}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 border border-slate-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-cyan-500 hover:from-emerald-500 hover:to-cyan-400 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-50"
          >
            {generating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Building Verified Resume...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Apply Verified Skills & Generate Resume ({confirmedCount})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
