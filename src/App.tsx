/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, BarChart3, Sliders, Lock, Unlock, LogOut, CheckCircle } from 'lucide-react';
import { TimeTrackerDatabase } from './services/db';
import { TimeSession, ActivityCategory, ActiveTimer } from './types';
import PinLock from './components/PinLock';
import TimerPanel from './components/TimerPanel';
import Dashboard from './components/Dashboard';
import SettingsPanel from './components/SettingsPanel';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab ] = useState<'timer' | 'dashboard' | 'settings'>('timer');
  
  // Storage lists loaded reactively
  const [sessions, setSessions] = useState<TimeSession[]>([]);
  const [categories, setCategories] = useState<ActivityCategory[]>([]);
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);

  // Load database values on successful authorization
  useEffect(() => {
    if (isAuthenticated) {
      setSessions(TimeTrackerDatabase.getSessions());
      setCategories(TimeTrackerDatabase.getCategories());
      setActiveTimer(TimeTrackerDatabase.getActiveTimer());
    }
  }, [isAuthenticated]);

  const handleUnlock = () => {
    setIsAuthenticated(true);
  };

  const handleLogCircleOut = () => {
    setIsAuthenticated(false);
  };

  // 1. Time Tracker State Handlers
  const handleStartTimer = (categoryId: string, description: string) => {
    const timer: ActiveTimer = {
      id: `timer-${Date.now()}`,
      categoryId,
      description: description.trim(),
      startTime: Date.now()
    };
    TimeTrackerDatabase.setActiveTimer(timer);
    setActiveTimer(timer);
  };

  const handleStopTimer = (finalDescription: string) => {
    if (!activeTimer) return;
    const now = Date.now();
    const duration = Math.max(1, Math.floor((now - activeTimer.startTime) / 1000));

    const newSession: TimeSession = {
      id: `session-${Date.now()}`,
      category: activeTimer.categoryId,
      description: finalDescription.trim() || 'Unnotated focus segment',
      startTime: activeTimer.startTime,
      endTime: now,
      duration
    };

    // Save to Database
    TimeTrackerDatabase.saveSession(newSession);
    TimeTrackerDatabase.setActiveTimer(null);

    // Sync State
    setSessions(prev => [newSession, ...prev]);
    setActiveTimer(null);
  };

  const handleDiscardTimer = () => {
    TimeTrackerDatabase.setActiveTimer(null);
    setActiveTimer(null);
  };

  const handleAddManualSession = (session: TimeSession) => {
    TimeTrackerDatabase.saveSession(session);
    setSessions(prev => [session, ...prev]);
  };

  const handleAddCategory = (category: ActivityCategory) => {
    TimeTrackerDatabase.saveCategory(category);
    setCategories(prev => [...prev, category]);
  };

  // 2. State Actions inside list registries
  const handleDeleteSession = (id: string) => {
    TimeTrackerDatabase.deleteSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const handleUpdateSession = (updated: TimeSession) => {
    TimeTrackerDatabase.saveSession(updated);
    setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  // 3. Clear Database & Lock Devices out
  const handleWipeDatabase = () => {
    TimeTrackerDatabase.clearAllData();
    setIsAuthenticated(false);
    setActiveTab('timer');
    setSessions([]);
    setActiveTimer(null);
  };

  // Render Authorization Shield if unauthorized
  if (!isAuthenticated) {
    return <PinLock onUnlock={handleUnlock} />;
  }

  return (
    <div id="tempo-app-frame" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between font-sans">
      
      {/* Universal Sticky Top Header Bar */}
      <header id="universal-app-header" className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 z-40 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo Group */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Clock className="w-5.5 h-5.5 stroke-[2.25]" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-slate-900 leading-none">Tempo</h1>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block mt-1">Time Tracker</span>
            </div>
          </div>

          {/* Navigational Control Handles Segment */}
          <nav id="header-navigation-hub" className="flex items-center gap-1.5 md:gap-3">
            <button
              id="tab-btn-timer"
              onClick={() => setActiveTab('timer')}
              className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'timer'
                  ? 'bg-indigo-50 text-indigo-700 shadow-3xs'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Clock Timer</span>
              {activeTimer && (
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
              )}
            </button>

            <button
              id="tab-btn-dashboard"
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-indigo-50 text-indigo-700 shadow-3xs'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics Panel</span>
            </button>

            <button
              id="tab-btn-settings"
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 py-2 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-indigo-50 text-indigo-700 shadow-3xs'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span className="hidden sm:inline">Setup Settings</span>
            </button>
          </nav>

          {/* Secure Padlock lock logout button */}
          <button
            id="lock-system-fast-btn"
            onClick={handleLogCircleOut}
            className="p-2.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 border border-slate-100 cursor-pointer transition-colors"
            title="Lock Access Log Out"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Primary Workspace Scroll Container */}
      <main id="app-workspace-body" className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            id={`tab-container-${activeTab}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
          >
            {activeTab === 'timer' && (
              <TimerPanel
                categories={categories}
                activeTimer={activeTimer}
                onStartTimer={handleStartTimer}
                onStopTimer={handleStopTimer}
                onDiscardTimer={handleDiscardTimer}
                onAddManualSession={handleAddManualSession}
                onAddCategory={handleAddCategory}
              />
            )}

            {activeTab === 'dashboard' && (
              <Dashboard
                sessions={sessions}
                categories={categories}
                onDeleteSession={handleDeleteSession}
                onUpdateSession={handleUpdateSession}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsPanel
                categories={categories}
                sessions={sessions}
                onWipeDatabase={handleWipeDatabase}
                onLogOut={handleLogCircleOut}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Humble minimal footer strip (Anti-AI slop, clean branding margins) */}
      <footer id="app-footer-rail" className="py-6 border-t border-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 tracking-wider">
        <span>Tempo Time Tracker • Light footprint, secure local SQLite DB-parity</span>
      </footer>

    </div>
  );
}
