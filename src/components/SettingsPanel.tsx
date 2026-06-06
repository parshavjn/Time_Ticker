/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, AlertTriangle, ShieldCheck, Download, Trash2, 
  RotateCcw, Sliders, LogOut, CheckCircle2, ChevronRight, HelpCircle 
} from 'lucide-react';
import { ActivityCategory, TimeSession } from '../types';
import { TimeTrackerDatabase } from '../services/db';

interface SettingsPanelProps {
  categories: ActivityCategory[];
  sessions: TimeSession[];
  onWipeDatabase: () => void;
  onLogOut: () => void;
}

export default function SettingsPanel({
  categories,
  sessions,
  onWipeDatabase,
  onLogOut
}: SettingsPanelProps) {
  
  // States for Changing security PIN
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinMessage, setPinMessage] = useState({ text: '', type: 'info' as 'info' | 'success' | 'error' });

  // Security checks confirmation flags before wipeout resets
  const [isConfirmingWipe, setIsConfirmingWipe] = useState(false);

  // Submit secure PIN modification request
  const handlePinChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinMessage({ text: '', type: 'info' });

    if (!/^\d{4}$/.test(currentPin) || !/^\d{4}$/.test(newPin) || !/^\d{4}$/.test(confirmNewPin)) {
      setPinMessage({ text: 'All PIN fields must be exactly 4 numeric digits.', type: 'error' });
      return;
    }

    const isCurrentValid = await TimeTrackerDatabase.verifyPin(currentPin);
    if (!isCurrentValid) {
      setPinMessage({ text: 'The current PIN code is incorrect.', type: 'error' });
      return;
    }

    if (newPin === currentPin) {
      setPinMessage({ text: 'New PIN must be different from the old PIN.', type: 'error' });
      return;
    }

    if (newPin !== confirmNewPin) {
      setPinMessage({ text: 'The confirmation PIN does not match.', type: 'error' });
      return;
    }

    try {
      await TimeTrackerDatabase.setPin(newPin);
      setPinMessage({ text: 'Access PIN successfully updated.', type: 'success' });
      setCurrentPin('');
      setNewPin('');
      setConfirmNewPin('');
    } catch {
      setPinMessage({ text: 'An unexpected database error occurred during encryption.', type: 'error' });
    }
  };

  // Trigger JSON database full structural download
  const handleExportJSON = () => {
    const payload = {
      tempo_export_version: "1.0.0",
      exported_at: new Date().toISOString(),
      sessions: sessions,
      categories: categories
    };
    
    const fileContent = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", fileContent);
    downloadAnchor.setAttribute("download", `tempo_database_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
  };

  return (
    <div id="settings-panel-root" className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* 1. Reset Access PIN form card */}
      <div id="settings-pin-card" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
          <Lock className="w-5 h-5 text-indigo-500" />
          <h3 className="font-bold text-slate-800 text-sm">Security PIN Settings</h3>
        </div>
        
        <form onSubmit={handlePinChangeSubmit} className="space-y-4">
          <p className="text-[11px] text-slate-500 leading-normal">
            Safely rewrite your authorization credential. Keep this 4-digit security code stored safely to prevent accidental lockouts.
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                Current PIN
              </label>
              <input
                id="settings-current-pin"
                type="password"
                maxLength={4}
                required
                placeholder="••••"
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center text-sm font-bold bg-slate-50 border border-slate-200 py-2.5 px-2 rounded-xl text-slate-800 tracking-widest placeholder-slate-300 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                New PIN
              </label>
              <input
                id="settings-new-pin"
                type="password"
                maxLength={4}
                required
                placeholder="••••"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center text-sm font-bold bg-slate-50 border border-slate-200 py-2.5 px-2 rounded-xl text-slate-800 tracking-widest placeholder-slate-300 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                Confirm
              </label>
              <input
                id="settings-confirm-pin"
                type="password"
                maxLength={4}
                required
                placeholder="••••"
                value={confirmNewPin}
                onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center text-sm font-bold bg-slate-50 border border-slate-200 py-2.5 px-2 rounded-xl text-slate-800 tracking-widest placeholder-slate-300 focus:outline-hidden"
              />
            </div>
          </div>

          {pinMessage.text && (
            <div className={`flex items-center gap-1.5 p-2.5 rounded-xl text-xs font-semibold ${
              pinMessage.type === 'error' 
                ? 'bg-rose-50 text-rose-500 border border-rose-100/30' 
                : 'bg-emerald-50 text-emerald-600 border border-emerald-100/30'
            }`}>
              {pinMessage.type === 'error' ? <AlertTriangle className="w-4 h-4 flex-shrink-0" /> : <ShieldCheck className="w-4 h-4 flex-shrink-0" />}
              <span>{pinMessage.text}</span>
            </div>
          )}

          <button
            id="settings-change-pin-btn"
            type="submit"
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer text-center uppercase tracking-wider transition-all"
          >
            Modify Security Token
          </button>
        </form>
      </div>

      {/* 2. Bulk data controllers card */}
      <div id="settings-utility-card" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
            <Sliders className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-slate-800 text-sm">Preferences & Bulk Manager</h3>
          </div>

          <div id="settings-database-stats" className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Storage Load</span>
              <p className="text-xl font-extrabold text-slate-800 mt-0.5">{sessions.length} items</p>
            </div>
            <div className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Indexes</span>
              <p className="text-xl font-extrabold text-slate-800 mt-0.5">{categories.length} classes</p>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-normal mb-5">
            Manage files backup. Save or load historical logs and control full-database resets easily.
          </p>
        </div>

        <div className="space-y-3">
          {/* Export Database button */}
          <button 
            id="settings-export-json-btn"
            onClick={handleExportJSON}
            className="w-full flex items-center justify-between py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-350 cursor-pointer transition-all"
          >
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-500" />
              <span>Backup Database (JSON export)</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* Database Reset Wipe with warning checks */}
          <AnimatePresence mode="wait">
            {isConfirmingWipe ? (
              <motion.div 
                key="wipe-confirm"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border border-rose-100 bg-rose-50/55 p-3.5 rounded-xl space-y-3"
              >
                <div className="flex items-start gap-2 text-xs font-semibold text-rose-500 leading-normal">
                  <AlertTriangle className="w-4.5 h-4.5 flex-shrink-0 text-rose-500 mt-0.5" />
                  <div>
                    <p className="font-extrabold">Irreversible Database Wipeout!</p>
                    <p className="font-medium text-rose-400 text-[10px] mt-0.5">This removes all activity sessions, custom categories, access authentication keys, and config. This cannot be undone.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    id="settings-cancel-wipe"
                    type="button"
                    onClick={() => setIsConfirmingWipe(false)}
                    className="flex-1 text-[10px] py-1.5 font-bold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    Cancel Action
                  </button>
                  <button
                    id="settings-execute-wipe"
                    type="button"
                    onClick={onWipeDatabase}
                    className="flex-1 text-[10px] py-1.5 font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg cursor-pointer"
                  >
                    Confirm Clear All
                  </button>
                </div>
              </motion.div>
            ) : (
              <button 
                id="settings-wipe-db-trigger-btn"
                onClick={() => setIsConfirmingWipe(true)}
                className="w-full flex items-center justify-between py-2.5 px-4 rounded-xl border border-rose-100 hover:border-rose-200 text-xs font-bold text-rose-600 bg-rose-50/40 hover:bg-rose-50 cursor-pointer transition-all animate-pulse"
                style={{ animationDuration: '3s' }}
              >
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-rose-500" />
                  <span>Wipe Database & PIN Lock</span>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-400" />
              </button>
            )}
          </AnimatePresence>

          {/* Quick lock application device sign-out */}
          <button 
            id="settings-lock-session-btn"
            onClick={onLogOut}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer transition-all"
          >
            <LogOut className="w-4 h-4 text-slate-400" />
            <span>Lock Devices Logs Out</span>
          </button>
        </div>
      </div>

    </div>
  );
}
