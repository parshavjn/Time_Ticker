/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Square, Trash2, Plus, X, Clock, HelpCircle,
  PlusCircle, BookOpen, Terminal, Users, Palette, Heart, Briefcase, ChevronRight, AlertCircle, Sparkles,
  Flame, Check, Grid, FlameKindling, Info
} from 'lucide-react';
import { ActiveTimer, ActivityCategory, TimeSession } from '../types';
import { CategoryIcon, formatDuration } from './Dashboard';

// Category-based popular task suggests to enable rapid 1-tap notes entry
const SUGGESTIONS_MAP: Record<string, string[]> = {
  work: ["Coding", "UI Design", "Debugging", "Refactoring", "Documentation", "API Integration"],
  learning: ["Tutorial Video", "Tech Article", "Reading Book", "Research", "Coding Labs"],
  meetings: ["Sprint Sync", "1-on-1 Retro", "Client Sync", "Planning Session", "Standup Meeting"],
  creative: ["Figma Layouts", "Drafting Vector", "Asset Resizing", "Copywriting Draft", "Brainstorming"],
  health: ["HIIT Sport", "Stretching Flow", "Cool-down Walk", "Hydration Break", "Deep Breathing"],
  admin: ["Sorting Emails", "Invoice Settle", "Jira Backlog Duty", "Task Estimation"]
};

// Default fallbacks suggestions
const GENERAL_SUGGESTIONS = ["Focus work", "Session planning", "Project review", "Task execution"];

interface TimerPanelProps {
  categories: ActivityCategory[];
  activeTimer: ActiveTimer | null;
  onStartTimer: (categoryId: string, description: string) => void;
  onStopTimer: (description: string) => void;
  onDiscardTimer: () => void;
  onAddManualSession: (session: TimeSession) => void;
  onAddCategory: (category: ActivityCategory) => void;
}

export default function TimerPanel({
  categories,
  activeTimer,
  onStartTimer,
  onStopTimer,
  onDiscardTimer,
  onAddManualSession,
  onAddCategory
}: TimerPanelProps) {
  
  // Local active timer tickers
  const [tickerSecs, setTickerSecs] = useState(0);
  const [sessionNote, setSessionNote] = useState('');
  
  // --- AUDIO SYNTHESIS & INTERACTIVITY (Zero Asset Download Latency) ---
  const lastAudioCoords = useRef({ x: 0, y: 0 });
  const lastAudioTime = useRef(0);

  const playSound = (type: 'hover' | 'click' | 'start' | 'stop' | 'ambient', customFrequency?: number) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'start') {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.35);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(554.37, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(1108.73, ctx.currentTime + 0.35);
        gain2.gain.setValueAtTime(0.02, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

        osc.start();
        osc2.start();
        osc.stop(ctx.currentTime + 0.35);
        osc2.stop(ctx.currentTime + 0.35);
      } else if (type === 'stop') {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(293.66, ctx.currentTime + 0.4);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(440, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.4);
        gain2.gain.setValueAtTime(0.03, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

        osc.start();
        osc2.start();
        osc.stop(ctx.currentTime + 0.4);
        osc2.stop(ctx.currentTime + 0.4);
      } else if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(customFrequency || 650, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.08);
        
        gain.gain.setValueAtTime(0.03, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'ambient') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(customFrequency || 180, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.15);
        
        gain.gain.setValueAtTime(0.012, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.16);
      } else if (type === 'hover') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(customFrequency || 400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.06);
        
        gain.gain.setValueAtTime(0.015, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      }
    } catch (e) {
      // Ignored if browser audio policy blocks context
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const now = Date.now();
    const dx = clientX - lastAudioCoords.current.x;
    const dy = clientY - lastAudioCoords.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Play quiet movement bubble sweeps every 260px or 150ms
    if (dist > 260 && now - lastAudioTime.current > 150) {
      const freq = 120 + Math.min(220, Math.floor((clientY / window.innerHeight) * 140));
      playSound('ambient', freq);
      lastAudioCoords.current = { x: clientX, y: clientY };
      lastAudioTime.current = now;
    }
  };

  const handleStartClick = (categoryId: string) => {
    playSound('start');
    onStartTimer(categoryId, sessionNote);
  };

  // Render contextual responsive micro-animations or interactive status indicators for tags
  const renderTagAnimation = (tag: string, isSelected: boolean, activeHex: string) => {
    if (!isSelected) return null;
    
    const t = tag.toLowerCase();
    
    // Custom responsive animation classes or frames based on domain keynotes
    if (t.includes('jira') || t.includes('sorting') || t.includes('invoice') || t.includes('admin') || t.includes('estimation')) {
      return (
        <motion.span 
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="inline-flex items-center text-[11px]"
          style={{ color: activeHex }}
        >
          ⚙️
        </motion.span>
      );
    }
    if (t.includes('coding') || t.includes('integration') || t.includes('debugging') || t.includes('refactoring') || t.includes('labs')) {
      return (
        <motion.span
          animate={{ x: [-1, 2, -1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
          className="inline-flex items-center font-mono font-black text-[9px] tracking-tighter"
          style={{ color: activeHex }}
        >
          &lt;/&gt;
        </motion.span>
      );
    }
    if (t.includes('design') || t.includes('figma') || t.includes('vector') || t.includes('creative') || t.includes('drafting')) {
      return (
        <motion.span
          animate={{ scale: [0.8, 1.2, 0.8], rotate: [0, 15, -15, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          className="inline-flex items-center text-[10px]"
          style={{ color: activeHex }}
        >
          ✨
        </motion.span>
      );
    }
    if (t.includes('meeting') || t.includes('sync') || t.includes('retro') || t.includes('planning') || t.includes('standup')) {
      return (
        <span className="relative flex h-2 w-2">
          <span 
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: activeHex }}
          />
          <span 
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ backgroundColor: activeHex }}
          />
        </span>
      );
    }
    if (t.includes('video') || t.includes('article') || t.includes('book') || t.includes('research') || t.includes('learning')) {
      return (
        <motion.span
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          className="inline-flex items-center text-[10px]"
          style={{ color: activeHex }}
        >
          📖
        </motion.span>
      );
    }
    if (t.includes('sport') || t.includes('flow') || t.includes('walk') || t.includes('break') || t.includes('breathing') || t.includes('health')) {
      return (
        <motion.span
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut" }}
          className="inline-flex items-center text-[10px]"
          style={{ color: activeHex }}
        >
          ❤️
        </motion.span>
      );
    }

    // High fidelity modular micro voice visualizer equalizer fallback
    return (
      <span className="flex items-end gap-[1.5px] h-2.5 w-3 overflow-hidden px-0.5">
        <motion.span
          animate={{ height: ["20%", "100%", "20%"] }}
          transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
          className="w-[2px] rounded-xs"
          style={{ backgroundColor: activeHex, height: '4px' }}
        />
        <motion.span
          animate={{ height: ["40%", "100%", "40%"] }}
          transition={{ duration: 0.4, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
          className="w-[2px] rounded-xs"
          style={{ backgroundColor: activeHex, height: '4px' }}
        />
        <motion.span
          animate={{ height: ["10%", "100%", "10%"] }}
          transition={{ duration: 0.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
          className="w-[2px] rounded-xs"
          style={{ backgroundColor: activeHex, height: '4px' }}
        />
      </span>
    );
  };
  
  // Interactive UI states for form overlays
  const [isManualOpen, setIsManualOpen] = useState(false);
  const [isCategoryStudioOpen, setIsCategoryStudioOpen] = useState(false);

  // Manual session entry state
  const [manualCategory, setManualCategory] = useState(categories[0]?.id || 'work');
  const [manualDescription, setManualDescription] = useState('');
  const [manualDurationMins, setManualDurationMins] = useState(15);
  const [manualDaysAgo, setManualDaysAgo] = useState(0);
  const [manualError, setManualError] = useState('');

  // Category Studio builders State
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('Terminal');
  const [newCatColor, setNewCatColor] = useState('violet');
  const [newCatHexColor, setNewCatHexColor] = useState('#8b5cf6');
  const [studioError, setStudioError] = useState('');

  // Color picker presets
  const COLOR_PRESETS = [
    { name: 'violet', hex: '#8b5cf6' },
    { name: 'orange', hex: '#f97316' },
    { name: 'teal', hex: '#14b8a6' },
    { name: 'pink', hex: '#ec4899' },
    { name: 'amber', hex: '#f59e0b' },
    { name: 'emerald', hex: '#10b981' }
  ];

  // High-precision interval ticker syncing to real system timestamps
  useEffect(() => {
    let timerId: any = null;

    if (activeTimer) {
      // Initialize note field from current active state
      setSessionNote(activeTimer.description);
      
      const updateTicker = () => {
        const deltaMs = Date.now() - activeTimer.startTime;
        setTickerSecs(Math.max(0, Math.floor(deltaMs / 1000)));
      };

      updateTicker(); // Trigger once instantly
      timerId = setInterval(updateTicker, 1000);
    } else {
      setTickerSecs(0);
      setSessionNote('');
    }

    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [activeTimer]);

  // Formatted string HH:MM:SS
  const clockText = React.useMemo(() => {
    const hours = Math.floor(tickerSecs / 3600);
    const minutes = Math.floor((tickerSecs % 3600) / 60);
    const seconds = tickerSecs % 60;

    const pad = (num: number) => String(num).padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }, [tickerSecs]);

  // Finding category info of current active timer
  const activeCategoryDetail = React.useMemo(() => {
    if (!activeTimer) return null;
    return categories.find(c => c.id === activeTimer.categoryId) || null;
  }, [activeTimer, categories]);

  // Get matching suggestions
  const activeSuggestions = React.useMemo(() => {
    if (!activeTimer) return GENERAL_SUGGESTIONS;
    return SUGGESTIONS_MAP[activeTimer.categoryId] || GENERAL_SUGGESTIONS;
  }, [activeTimer]);

  // Handle active stopping Save
  const handleStop = () => {
    playSound('stop');
    onStopTimer(sessionNote);
  };

  // Submit manual log entry
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setManualError('');
    
    if (manualDurationMins <= 0 || isNaN(manualDurationMins)) {
      setManualError('Enter a valid duration (minimum 1 minute).');
      return;
    }

    const durationSecs = Math.round(manualDurationMins * 60);
    const now = Date.now();
    const daysOffsetMs = manualDaysAgo * 24 * 60 * 60 * 1000;
    
    // Position start/end in the day
    const endTime = now - daysOffsetMs;
    const startTime = endTime - (durationSecs * 1000);

    playSound('start');
    onAddManualSession({
      id: `manual-session-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      category: manualCategory,
      description: manualDescription.trim() || 'Manual time logging entry',
      startTime,
      endTime,
      duration: durationSecs
    });

    // Reset fields
    setManualDescription('');
    setManualDurationMins(15);
    setManualDaysAgo(0);
    setIsManualOpen(false);
  };

  // Submit Category studio
  const handleCategoryStudioSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStudioError('');

    if (!newCatName.trim()) {
      setStudioError('Category name cannot be empty.');
      return;
    }

    const cleanId = newCatName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (categories.some(c => c.id === cleanId)) {
      setStudioError('A category with a similar name already exists.');
      return;
    }

    playSound('start');
    onAddCategory({
      id: cleanId,
      name: newCatName.trim(),
      icon: newCatIcon,
      color: newCatColor,
      hexColor: newCatHexColor,
      description: newCatDesc.trim() || 'User created custom tracking index'
    });

    // Reset fields
    setNewCatName('');
    setNewCatDesc('');
    setIsCategoryStudioOpen(false);
  };

  return (
    <div id="timer-panel-root" className="space-y-6" onMouseMove={handleMouseMove}>
      
      {/* 1. Immersive active stopwatch card */}
      <AnimatePresence mode="wait">
        {activeTimer ? (
          <motion.div
            key="active-stopwatch"
            id="active-stopwatch-panel"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-white rounded-3xl border border-indigo-100 shadow-xl p-8 relative overflow-hidden"
          >
            {/* Background absolute premium mesh patterns */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/75 rounded-full blur-3xl opacity-80 -z-0 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-50/30 rounded-full blur-2xl opacity-60 -z-0 pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center">
              
              {/* Category indicator label block */}
              <div id="stopwatch-activity-pill" className="flex items-center gap-2 py-1.5 px-3.5 bg-indigo-50/80 border border-indigo-100/40 rounded-full mb-6">
                <span className="w-2.5 h-2.5 rounded-full animate-ping" style={{ backgroundColor: activeCategoryDetail?.hexColor || '#4f46e5' }} />
                <span className="text-[10px] uppercase font-black text-indigo-700 tracking-widest flex items-center gap-1.5">
                  <CategoryIcon name={activeCategoryDetail?.icon || 'Clock'} className="w-3.5 h-3.5 stroke-[2.5]" />
                  {activeCategoryDetail?.name || 'Active Session'}
                </span>
              </div>

              {/* Glowing circular live chronos clock ticking radial graph */}
              <div id="chrono-ripple-shield" className="relative w-52 h-52 rounded-full flex items-center justify-center border border-slate-100 bg-slate-50/85 shadow-lg shadow-slate-100/40 mb-6">
                {/* Rotating Visual Frame Dial depending on active category hexColor */}
                <svg className="absolute inset-2 w-[calc(100%-16px)] h-[calc(100%-16px)] -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="82"
                    fill="transparent"
                    stroke={`${activeCategoryDetail?.hexColor || '#4d55e5'}15`}
                    strokeWidth="6"
                  />
                  <motion.circle
                    cx="96"
                    cy="96"
                    r="82"
                    fill="transparent"
                    stroke={activeCategoryDetail?.hexColor || '#4d55e5'}
                    strokeWidth="6"
                    strokeDasharray="515"
                    animate={{ strokeDashoffset: [515, 0] }}
                    transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                    strokeLinecap="round"
                  />
                </svg>

                {/* Animated multi-ring glowing outer halos */}
                <motion.div 
                  animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute inset-0 rounded-full border border-indigo-200/50 -z-10"
                  style={{ borderColor: `${activeCategoryDetail?.hexColor || '#4d55e5'}30` }}
                />
                <motion.div 
                  animate={{ scale: [1.05, 1.15, 1.05], opacity: [0.1, 0.4, 0.1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                  className="absolute inset-2 rounded-full border border-indigo-100/30 -z-10"
                  style={{ borderColor: `${activeCategoryDetail?.hexColor || '#4d55e5'}15` }}
                />

                <div className="text-center z-10 px-4">
                  <p id="live-timer-clock-text" className="text-4xl font-black tracking-widest text-slate-900 font-mono select-none drop-shadow-xs">
                    {clockText}
                  </p>
                  <p className="text-[10px] uppercase font-extrabold text-slate-400 mt-2.5 tracking-widest flex items-center justify-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s', color: activeCategoryDetail?.hexColor }} />
                    Live Recording
                  </p>
                </div>
              </div>

              {/* Running session description inputs field representation */}
              <div className="w-full max-w-sm mb-4">
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5 text-center">
                  Live session note representation
                </label>
                <input
                  id="active-timer-notes-input"
                  type="text"
                  placeholder="e.g., Implementing API endpoints"
                  value={sessionNote}
                  onChange={(e) => setSessionNote(e.target.value)}
                  className="w-full text-center text-sm font-bold bg-slate-50 hover:bg-slate-100/40 text-slate-800 border border-slate-200/70 rounded-2xl py-3 px-4 focus:outline-hidden focus:border-indigo-400 focus:bg-white transition-all shadow-xs"
                />
              </div>

              {/* Tag suggestions catalog enabling 1-tap fast text logs updates */}
              <div className="w-full max-w-md mb-6">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Fast suggest notes (1-tap edit)</span>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center max-h-24 overflow-y-auto pr-1 pb-1">
                  {activeSuggestions.map((tag) => {
                    const isSelected = sessionNote === tag;
                    return (
                      <motion.button
                        key={tag}
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { playSound('click', 500); setSessionNote(tag); }}
                        style={{ 
                          borderColor: isSelected ? activeCategoryDetail?.hexColor : undefined,
                          backgroundColor: isSelected ? `${activeCategoryDetail?.hexColor}10` : undefined,
                          color: isSelected ? activeCategoryDetail?.hexColor : undefined
                        }}
                        className={`text-[10px] font-bold py-1 px-3 rounded-full border border-slate-200/80 bg-slate-50/55 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50/30 cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                          isSelected ? 'font-black ring-1 ring-offset-0' : ''
                        }`}
                      >
                        <span>{tag}</span>
                        {renderTagAnimation(tag, isSelected, activeCategoryDetail?.hexColor || '#4d55e5')}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons row */}
              <div id="stopwatch-action-bar" className="flex items-center gap-3 w-full max-w-sm justify-center">
                <button
                  id="active-discard-btn"
                  onClick={() => { playSound('click', 350); onDiscardTimer(); }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200/80 rounded-xl cursor-pointer transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Discard</span>
                </button>

                <button
                  id="active-stop-btn"
                  onClick={handleStop}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-100 rounded-xl cursor-pointer transition-all active:scale-98"
                  style={{ backgroundColor: activeCategoryDetail?.hexColor }}
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Stop & Save</span>
                </button>
              </div>

            </div>
          </motion.div>
        ) : (
          /* 2. One-tap starting directory grids */
          <motion.div
            key="quick-starter-deck"
            id="quick-starter-panel"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6"
          >
            {/* Upper control summaries & Daily Progress Streak Goal */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-100 pb-5">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-1.5">
                  <Grid className="w-5 h-5 text-indigo-500" />
                  <span>Interactive Launchpad</span>
                </h3>
                <p className="text-[11px] text-slate-400">Tap category blocks to initiate chronos logs</p>
              </div>

              {/* Daily Streak target indicator block */}
              <div className="flex items-center gap-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl py-2 px-4 shadow-3xs w-full sm:w-auto">
                <div className="p-1 rounded-lg bg-orange-100 text-orange-600">
                  <Flame className="w-4.5 h-4.5 animate-bounce" style={{ animationDuration: '3s' }} />
                </div>
                <div>
                  <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                    <span>Performance streak</span>
                  </div>
                  <span className="text-xs font-black text-slate-800 block mt-1 leading-none">Active Goal: 8hrs/day</span>
                </div>
              </div>
            </div>

            {/* Optional shortcuts toolbar tools */}
            <div className="flex items-center justify-between gap-2.5 mb-4 p-2 bg-slate-50/50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 px-2 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                <span>Instant trackers launcher workspace</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  id="trigger-add-manual-btn"
                  onClick={() => { playSound('click', 600); setIsManualOpen(true); }}
                  className="text-[11px] font-bold text-slate-600 hover:text-indigo-600 bg-white border border-slate-200/70 py-1.5 px-3 rounded-xl transition-colors cursor-pointer"
                >
                  Manual Backdate
                </button>
                <button
                  id="trigger-custom-category-btn"
                  onClick={() => { playSound('click', 620); setIsCategoryStudioOpen(true); }}
                  className="flex items-center gap-1 text-[11px] font-bold text-white bg-slate-900 hover:bg-slate-800 py-1.5 px-3 rounded-xl transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Category Studio</span>
                </button>
              </div>
            </div>

            {/* Quick pre-configured note text with tags suggest triggers */}
            <div className="mb-5 bg-indigo-50/15 border border-indigo-100/10 p-4 rounded-2xl">
              <label htmlFor="pre-start-note" className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">
                Pre-start note (appends directly on start)
              </label>
              <input
                id="pre-start-note"
                type="text"
                placeholder="What precise task are you tackling? (e.g. Design draft review)"
                onChange={(e) => setSessionNote(e.target.value)}
                className="w-full text-xs font-bold bg-white border border-slate-200/80 rounded-xl py-2.5 px-4 focus:outline-hidden focus:border-indigo-400 transition-all text-slate-700 placeholder-slate-400"
              />
            </div>

            {/* Tap Launcher Grid items styled elegantly with outer glow borders */}
            <div id="tap-launcher-grid" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((cat, idx) => (
                <motion.button
                  key={cat.id}
                  id={`launcher-tile-${cat.id}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  whileHover={{ y: -3, scale: 1.015, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.02)' }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => handleStartClick(cat.id)}
                  style={{ borderColor: `${cat.hexColor}25` }}
                  className="flex items-center p-4 rounded-2xl border text-left bg-white relative hover:shadow-xs cursor-pointer group transition-all duration-200"
                >
                  {/* Outer edge touch highlight */}
                  <div className="absolute top-0 bottom-0 left-0 w-1.5 rounded-l-2xl" style={{ backgroundColor: cat.hexColor }} />
                  
                  {/* Category icon orb logo */}
                  <div 
                    style={{ backgroundColor: `${cat.hexColor}10`, color: cat.hexColor }}
                    className="w-11 h-11 rounded-2xl flex items-center justify-center mr-4 flex-shrink-0 group-hover:scale-110 transition-transform shadow-3xs"
                  >
                    <CategoryIcon name={cat.icon} className="w-5.5 h-5.5 stroke-[2.25]" />
                  </div>

                  <div className="flex-1 min-w-0 pr-2">
                    <h4 className="font-extrabold text-slate-800 text-xs truncate">{cat.name}</h4>
                    <p className="text-[10px] text-slate-500 mt-1 truncate leading-normal font-medium">{cat.description}</p>
                  </div>

                  {/* Tiny animated tap action triggers visual indicator */}
                  <div className="w-6 h-6 rounded-lg bg-slate-50 group-hover:bg-indigo-50/50 group-hover:text-indigo-600 transition-colors flex items-center justify-center flex-shrink-0">
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Manual log builder collapser modal featuring 1-tap minutes helpers */}
      <AnimatePresence>
        {isManualOpen && (
          <div id="manual-modal-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              id="manual-modal-container"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100"
            >
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3.5">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Backdate Track Record</h3>
                  <p className="text-[10px] text-slate-400">Instantly file historic activity sessions</p>
                </div>
                <button 
                  id="close-manual-modal"
                  onClick={() => setIsManualOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-4">
                {/* Category Picker */}
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">
                    Activity Group catalog
                  </label>
                  <select
                    id="manual-cat-select"
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-slate-700 cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Duration Picker & Quick tap increment presets panels */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                      Duration minutes
                    </label>
                    <span className="text-[10px] font-black text-indigo-500 font-mono">Total mins</span>
                  </div>
                  
                  <input
                    id="manual-dur-input"
                    type="number"
                    min="1"
                    placeholder="e.g. 45"
                    value={manualDurationMins}
                    onChange={(e) => setManualDurationMins(parseInt(e.target.value) || 0)}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-slate-700 font-mono"
                  />

                  {/* 1-TAP helpers switches */}
                  <div className="flex items-center gap-1.5 mt-2">
                    {[15, 30, 45, 60, 120].map((preset) => {
                      const isCurrent = manualDurationMins === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setManualDurationMins(preset)}
                          className={`flex-1 text-[10px] py-1 font-bold rounded-lg border cursor-pointer select-none transition-all ${
                            isCurrent 
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                              : 'bg-slate-50/50 border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                          }`}
                        >
                          {preset >= 60 ? `${preset / 60}h` : `${preset}m`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Date offset picker */}
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">
                    Log Date Offset index
                  </label>
                  <select
                    id="manual-date-select"
                    value={manualDaysAgo}
                    onChange={(e) => setManualDaysAgo(parseInt(e.target.value))}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-slate-700 cursor-pointer"
                  >
                    <option value={0}>Today</option>
                    <option value={1}>Yesterday</option>
                    <option value={2}>2 Days Ago</option>
                    <option value={3}>3 Days Ago</option>
                    <option value={4}>4 Days Ago</option>
                    <option value={5}>5 Days Ago</option>
                    <option value={6}>6 Days Ago</option>
                  </select>
                </div>

                {/* Notes Input */}
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1.5">
                    Activity description
                  </label>
                  <textarea
                    id="manual-desc-input"
                    placeholder="Provide notation detail of execution..."
                    rows={2}
                    value={manualDescription}
                    onChange={(e) => setManualDescription(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-slate-700 focus:outline-hidden focus:border-indigo-400 placeholder-slate-400"
                  />
                </div>

                {manualError && (
                  <div className="flex items-center gap-1.5 text-xs font-medium text-rose-500 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{manualError}</span>
                  </div>
                )}

                {/* Confirm Trigger */}
                <button
                  id="submit-manual-log"
                  type="submit"
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-indigo-500 cursor-pointer transition-all uppercase tracking-widest mt-2"
                >
                  Write Log to DB
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Creative Catalog Category Studio editor */}
      <AnimatePresence>
        {isCategoryStudioOpen && (
          <div id="studio-modal-overlay" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              id="studio-modal-container"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-slate-100"
            >
              <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                <h3 className="font-extrabold text-slate-800 text-base">Category Studio</h3>
                <button 
                  id="close-studio-modal"
                  onClick={() => setIsCategoryStudioOpen(false)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCategoryStudioSubmit} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                    Activity Name
                  </label>
                  <input
                    id="studio-name-input"
                    type="text"
                    required
                    maxLength={24}
                    placeholder="e.g., Coding / Audio"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-slate-700 placeholder-slate-400"
                  />
                </div>

                {/* Descriptions */}
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-1">
                    Brief explanation
                  </label>
                  <input
                    id="studio-desc-input"
                    type="text"
                    maxLength={60}
                    placeholder="e.g., Mixing, podcasts, synth looping"
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-slate-700 placeholder-slate-400"
                  />
                </div>

                {/* Custom Presets Color Pickers */}
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-3">
                    Aesthetic Swatches Highlight
                  </label>
                  <div className="flex items-center gap-2.5 justify-between">
                    {COLOR_PRESETS.map((p) => {
                      const isSelected = newCatColor === p.name;
                      return (
                        <button
                          key={p.name}
                          id={`studio-color-${p.name}`}
                          type="button"
                          onClick={() => {
                            playSound('click', 500 + p.hex.charCodeAt(1) * 2);
                            setNewCatColor(p.name);
                            setNewCatHexColor(p.hex);
                          }}
                          style={{ backgroundColor: p.hex }}
                          className={`w-7 h-7 rounded-lg relative cursor-pointer hover:scale-105 transition-transform flex items-center justify-center ${
                            isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 scale-105 shadow-sm' : ''
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Select visual representation icons logos */}
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block mb-2.5">
                    Select vector logo icon
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {['Terminal', 'BookOpen', 'Users', 'Palette', 'Heart', 'Briefcase'].map((iconCode) => {
                      const isActive = newCatIcon === iconCode;
                      return (
                        <button
                          key={iconCode}
                          id={`studio-icon-${iconCode}`}
                          type="button"
                          onClick={() => { playSound('click', 600); setNewCatIcon(iconCode); }}
                          className={`p-2.5 rounded-xl border flex items-center justify-center cursor-pointer hover:bg-slate-50 ${
                            isActive 
                              ? 'border-indigo-400 bg-indigo-50 hover:bg-indigo-50 text-indigo-600' 
                              : 'border-slate-100 text-slate-500'
                          }`}
                        >
                          <CategoryIcon name={iconCode} className="w-4 h-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                {studioError && (
                  <div className="flex items-center gap-1 text-xs font-medium text-rose-500 bg-rose-50/50 p-2.5 rounded-xl">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{studioError}</span>
                  </div>
                )}

                {/* Studio Creator actions triggers */}
                <button
                  id="studio-submit-btn"
                  type="submit"
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 cursor-pointer transition-all uppercase tracking-widest mt-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Forge Category State</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
