'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { X, GripHorizontal } from 'lucide-react';
import CompressionRatioCalc from './CompressionRatioCalc';
import SuperheatSubcoolCalc from './SuperheatSubcoolCalc';
import PTChartLookup from './PTChartLookup';
import FaultCodeLookup from './FaultCodeLookup';
import RefrigerantReference from './RefrigerantReference';
import QuickRefTables from './QuickRefTables';

type TabKey = 'compression' | 'shsc' | 'pt' | 'fault' | 'refrigerant' | 'quickref';

interface Tab {
  key: TabKey;
  label: string;
}

const TABS: Tab[] = [
  { key: 'compression', label: 'COMPRESSION RATIO' },
  { key: 'shsc', label: 'SH/SC CALC' },
  { key: 'pt', label: 'PT CHART' },
  { key: 'fault', label: 'FAULT CODES' },
  { key: 'refrigerant', label: 'REFRIGERANT' },
  { key: 'quickref', label: 'QUICK REF' },
];

export default function QuickReferenceDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('compression');
  const [isDragging, setIsDragging] = useState(false);
  const [drawerHeight, setDrawerHeight] = useState(70);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(70);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleDragStart = useCallback((clientY: number) => {
    setIsDragging(true);
    dragStartY.current = clientY;
    dragStartHeight.current = drawerHeight;
  }, [drawerHeight]);

  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging) return;
    const deltaY = dragStartY.current - clientY;
    const deltaPercent = (deltaY / window.innerHeight) * 100;
    const newHeight = Math.min(90, Math.max(25, dragStartHeight.current + deltaPercent));
    setDrawerHeight(newHeight);
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (drawerHeight < 20) {
      setIsOpen(false);
      setDrawerHeight(70);
    }
  }, [isDragging, drawerHeight]);

  // Mouse drag listeners
  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => handleDragMove(e.clientY);
    const onUp = () => handleDragEnd();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Touch drag listeners
  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: TouchEvent) => {
      e.preventDefault();
      handleDragMove(e.touches[0].clientY);
    };
    const onEnd = () => handleDragEnd();
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Scroll content to top on tab change
  useEffect(() => {
    contentRef.current?.scrollTo(0, 0);
  }, [activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'compression':
        return <CompressionRatioCalc />;
      case 'shsc':
        return <SuperheatSubcoolCalc />;
      case 'pt':
        return <PTChartLookup />;
      case 'fault':
        return <FaultCodeLookup />;
      case 'refrigerant':
        return <RefrigerantReference />;
      case 'quickref':
        return <QuickRefTables />;
    }
  };

  return (
    <>
      {/* Pull-up Tab Handle -- right edge of screen */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-0 bottom-24 z-40 flex items-center gap-1.5
            bg-surface-container-high border border-outline-variant/50 border-r-0
            rounded-l-lg px-2 py-3 shadow-lg
            hover:bg-surface-container-highest transition-colors group"
          aria-label="Open quick reference tools"
        >
          <div className="flex flex-col items-center gap-0.5">
            <GripHorizontal className="w-4 h-4 text-outline group-hover:text-primary-container transition-colors rotate-90" />
            <span
              className="font-headline text-[9px] uppercase tracking-widest text-outline group-hover:text-primary-container transition-colors"
              style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
            >
              Tools
            </span>
          </div>
        </button>
      )}

      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer panel */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ height: `${drawerHeight}vh` }}
      >
        {/* Glassmorphism container */}
        <div className="h-full flex flex-col bg-surface-container/80 backdrop-blur-[12px] border-t border-outline-variant/40 rounded-t-xl overflow-hidden">
          {/* Drag handle bar */}
          <div
            className="flex-shrink-0 flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing select-none"
            onMouseDown={(e) => handleDragStart(e.clientY)}
            onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
          >
            <div className="w-10 h-1 rounded-full bg-outline/40" />
          </div>

          {/* Header row */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 pb-2">
            <h2 className="font-headline text-sm uppercase tracking-wider text-on-surface">
              Quick Reference
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-surface-container-high transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4 text-outline" />
            </button>
          </div>

          {/* Tab Navigation -- horizontally scrollable */}
          <div className="flex-shrink-0 border-b border-outline-variant/30">
            <div className="flex overflow-x-auto px-2 gap-0.5" style={{ scrollbarWidth: 'none' }}>
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-shrink-0 px-3 py-2 font-headline text-[11px] uppercase tracking-wider
                    border-b-2 transition-colors whitespace-nowrap min-h-[44px] ${
                    activeTab === tab.key
                      ? 'text-primary-container border-primary-container'
                      : 'text-outline border-transparent hover:text-on-surface hover:border-outline-variant'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable content area */}
          <div
            ref={contentRef}
            className="flex-1 overflow-y-auto overscroll-contain px-4 py-4"
          >
            {renderContent()}
          </div>
        </div>
      </div>
    </>
  );
}
