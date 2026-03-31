'use client';

import { useState } from 'react';
import { X, CheckCircle, Loader2 } from 'lucide-react';

interface EndSessionModalProps {
  isOpen: boolean;
  checklist: string | null;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function EndSessionModal({
  isOpen,
  checklist,
  isLoading,
  onClose,
  onConfirm,
}: EndSessionModalProps) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  if (!isOpen) return null;

  const items = checklist
    ? checklist
        .split('\n')
        .filter((line) => line.trim())
        .map((line) => line.replace(/^\d+[\.\)]\s*/, '').trim())
    : [];

  const toggleItem = (index: number) => {
    const next = new Set(checkedItems);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setCheckedItems(next);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#201f1f] border border-[#3e484f33] rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <h2 className="font-headline font-bold uppercase text-lg tracking-tight text-[#4fc3f7]">
            SESSION CLOSE-OUT
          </h2>
          <button onClick={onClose} className="text-[#889299] hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 size={32} className="text-[#4fc3f7] animate-spin" />
              <p className="font-headline uppercase text-sm text-[#889299]">
                Generating checklist...
              </p>
            </div>
          ) : items.length > 0 ? (
            <div className="space-y-3">
              <p className="font-headline uppercase text-xs text-[#889299] tracking-wider mb-4">
                Verify before closing session
              </p>
              {items.map((item, index) => (
                <button
                  key={index}
                  onClick={() => toggleItem(index)}
                  className="w-full flex items-start gap-3 p-3 rounded bg-[#1c1b1b] hover:bg-[#2a2a2a] transition-colors text-left"
                >
                  <div
                    className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border ${
                      checkedItems.has(index)
                        ? 'bg-[#4fc3f7] border-[#4fc3f7]'
                        : 'border-[#3e484f] bg-transparent'
                    }`}
                  >
                    {checkedItems.has(index) && (
                      <CheckCircle size={14} className="text-[#004e69]" />
                    )}
                  </div>
                  <span
                    className={`text-sm font-body ${
                      checkedItems.has(index) ? 'text-[#889299] line-through' : 'text-[#e5e2e1]'
                    }`}
                  >
                    {item}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-[#889299] py-4">No checklist generated.</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5">
          <button
            onClick={onConfirm}
            className="w-full h-12 bg-[#4fc3f7] text-[#004e69] font-headline font-bold uppercase tracking-tight rounded hover:bg-[#9adbff] transition-colors"
          >
            CLOSE SESSION
          </button>
        </div>
      </div>
    </div>
  );
}
