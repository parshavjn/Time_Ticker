/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, CheckCircle2, ShieldAlert, RefreshCw, Eye, EyeOff, 
  Sparkles, Paintbrush, Play, Pause, RotateCcw, Activity, 
  HelpCircle, ArrowRight, Zap, Flame, Fingerprint
} from 'lucide-react';
import { TimeTrackerDatabase } from '../services/db';

interface PinLockProps {
  onUnlock: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
}

export default function PinLock({ onUnlock }: PinLockProps) {
  const [isNewSetup, setIsNewSetup] = useState(!TimeTrackerDatabase.isPinSet());
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isPinVisible, setIsPinVisible] = useState(false);

  // --- INTERACTIVE VISUAL VALUES ---
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [particles, setParticles] = useState<Particle[]>([]);
  const [activeMood, setActiveMood] = useState<'purple' | 'pink' | 'blue' | 'fusion'>('fusion');
  const workspaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto check lock state on mount
    if (!TimeTrackerDatabase.isPinSet()) {
      setIsNewSetup(true);
    }
  }, []);

  // Capture Mouse Position for fluid Parallax styling and play soft ambient sound on position threshold
  const lastAudioCoords = useRef({ x: 0, y: 0 });
  const lastAudioTime = useRef(0);

  // Synthesized Web Audio key tones (zero asset download latency, pure interactivity)
  const playSound = (type: 'hover' | 'click' | 'success' | 'error' | 'ambient', customFrequency?: number) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(customFrequency || 960, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else if (type === 'hover') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(customFrequency || 580, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.08);
        
        gain.gain.setValueAtTime(0.02, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'ambient') {
        // Soft atmospheric drop sound for background movement
        osc.type = 'sine';
        osc.frequency.setValueAtTime(customFrequency || 150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.2);
        
        gain.gain.setValueAtTime(0.015, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      } else if (type === 'success') {
        // Uplifting modern chime chord
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        osc2.frequency.exponentialRampToValueAtTime(1318.51, ctx.currentTime + 0.25);
        gain2.gain.setValueAtTime(0.06, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

        osc.start();
        osc2.start();
        osc.stop(ctx.currentTime + 0.25);
        osc2.stop(ctx.currentTime + 0.25);
      } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.25);
        
        gain.gain.setValueAtTime(0.06, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      // Catch native browser restrictions if AudioContext is blocked
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const { clientX, clientY } = e;
    const x = (clientX - window.innerWidth / 2) / 35;
    const y = (clientY - window.innerHeight / 2) / 35;
    setMousePosition({ x, y });

    // Throttle cursor movement sound trigger to avoid excessive audio noise (Play quiet tone every 250px or 140ms)
    const now = Date.now();
    const dx = clientX - lastAudioCoords.current.x;
    const dy = clientY - lastAudioCoords.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 250 && now - lastAudioTime.current > 140) {
      // Modify frequency based on mouse position
      const frequencyRange = 100 + Math.min(200, Math.floor((clientY / window.innerHeight) * 120));
      playSound('ambient', frequencyRange);
      lastAudioCoords.current = { x: clientX, y: clientY };
      lastAudioTime.current = now;
    }
  };

  // Spawn active floating bubbles on tap
  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!workspaceRef.current) return;
    const rect = workspaceRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Colorful swatches palette matching purple, pink, blue
    const palette = [
      'rgba(168, 85, 247, 0.75)', // Elegant Purple
      'rgba(236, 72, 153, 0.75)', // Neon Pink
      'rgba(59, 130, 246, 0.75)', // Royal Blue
      'rgba(6, 182, 212, 0.75)',  // Cyan Splash
      'rgba(217, 70, 239, 0.75)', // Fuchsia Magenta
    ];

    const randomColor = palette[Math.floor(Math.random() * palette.length)];
    const randomSize = Math.floor(Math.random() * 24) + 10; // Varied bubble sizes
    const randomRotation = Math.random() * 360;
    const newId = Date.now() + Math.random();

    setParticles(prev => [
      ...prev.slice(-25), // Cap maximum concurrent client particles for top-tier render speed
      { id: newId, x, y, color: randomColor, size: randomSize, rotation: randomRotation }
    ]);

    // Background taps play a cute drop tone
    playSound('hover', 400 + Math.random() * 300);
  };

  const handleKeyPress = (digit: string) => {
    setErrorMsg('');
    playSound('click', 600 + parseInt(digit) * 45); // Vary note pitch according to digit value!
    const target = step === 'enter' ? pin : confirmPin;
    if (target.length < 4) {
      const newVal = target + digit;
      if (step === 'enter') {
        setPin(newVal);
      } else {
        setConfirmPin(newVal);
      }
    }
  };

  const handleBackspace = () => {
    setErrorMsg('');
    playSound('click', 440);
    if (step === 'enter') {
      setPin(prev => prev.slice(0, -1));
    } else {
      setConfirmPin(prev => prev.slice(0, -1));
    }
  };

  const handleClear = () => {
    setErrorMsg('');
    playSound('click', 320);
    if (step === 'enter') {
      setPin('');
    } else {
      setConfirmPin('');
    }
  };

  // Run validation checks
  const processPinSubmit = async (currentPin: string) => {
    if (isNewSetup) {
      if (step === 'enter') {
        if (currentPin.length === 4) {
          playSound('success');
          setStep('confirm');
        }
      } else {
        if (currentPin === pin) {
          playSound('success');
          await TimeTrackerDatabase.setPin(pin);
          onUnlock();
        } else {
          playSound('error');
          setErrorMsg('PIN codes do not match. Re-enter keys.');
          setIsShaking(true);
          setConfirmPin('');
          setPin('');
          setStep('enter');
          setTimeout(() => setIsShaking(false), 500);
        }
      }
    } else {
      // Unlock Authentication
      const isValid = await TimeTrackerDatabase.verifyPin(currentPin);
      if (isValid) {
        playSound('success');
        onUnlock();
      } else {
        playSound('error');
        setErrorMsg('Invalid 4-digit PIN. Please try again.');
        setIsShaking(true);
        setPin('');
        setTimeout(() => setIsShaking(false), 500);
      }
    }
  };

  // Watch for length of 4 to submit instantly
  useEffect(() => {
    if (step === 'enter' && pin.length === 4) {
      processPinSubmit(pin);
    }
  }, [pin]);

  useEffect(() => {
    if (step === 'confirm' && confirmPin.length === 4) {
      processPinSubmit(confirmPin);
    }
  }, [confirmPin]);

  const activeInputVal = step === 'enter' ? pin : confirmPin;

  // Mood configuration swatches details
  const getAtmosphereGlowClass = () => {
    switch (activeMood) {
      case 'purple':
        return 'from-purple-500/10 via-slate-900 to-slate-950';
      case 'pink':
        return 'from-pink-500/10 via-slate-900 to-slate-950';
      case 'blue':
        return 'from-blue-500/10 via-slate-900 to-slate-950';
      case 'fusion':
      default:
        return 'from-indigo-950/20 via-slate-900 to-slate-950';
    }
  };

  const getPrimaryAccentColor = () => {
    switch (activeMood) {
      case 'purple': return '#a855f7';
      case 'pink': return '#ec4899';
      case 'blue': return '#3b82f6';
      case 'fusion':
      default: return '#6366f1';
    }
  };

  const getGradientTextClass = () => {
    switch (activeMood) {
      case 'purple': return 'from-purple-400 via-fuchsia-300 to-purple-200';
      case 'pink': return 'from-pink-400 via-rose-300 to-pink-200';
      case 'blue': return 'from-blue-400 via-cyan-300 to-blue-200';
      case 'fusion':
      default: return 'from-purple-400 via-pink-400 to-blue-400';
    }
  };

  return (
    <div 
      ref={workspaceRef}
      id="tempo-landing-root" 
      onMouseMove={handleMouseMove}
      onClick={handleBackgroundClick}
      className={`min-h-screen relative overflow-hidden bg-gradient-to-tr ${getAtmosphereGlowClass()} text-white flex flex-col justify-between p-6 transition-all duration-1000 select-none`}
    >
      {/* 1. LAYERED BLOBS: Background floating interactive mesh objects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Purple Blob */}
        <motion.div 
          animate={{
            x: mousePosition.x * 1.4,
            y: mousePosition.y * 1.4,
            scale: [1, 1.15, 0.95, 1],
          }}
          transition={{
            scale: { duration: 12, repeat: Infinity, ease: 'easeInOut' },
            x: { type: 'spring', damping: 25, stiffness: 60 },
            y: { type: 'spring', damping: 25, stiffness: 60 },
          }}
          style={{ backgroundImage: 'radial-gradient(circle, rgba(168,85,247,0.22) 0%, rgba(0,0,0,0) 70%)' }}
          className="absolute -top-32 -left-32 w-96 h-96 md:w-[600px] md:h-[600px] rounded-full blur-3xl opacity-80"
        />

        {/* Pink Blob */}
        <motion.div 
          animate={{
            x: -mousePosition.x * 2.1,
            y: -mousePosition.y * 2.1,
            scale: [1, 0.9, 1.1, 1],
          }}
          transition={{
            scale: { duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 2 },
            x: { type: 'spring', damping: 30, stiffness: 50 },
            y: { type: 'spring', damping: 30, stiffness: 50 },
          }}
          style={{ backgroundImage: 'radial-gradient(circle, rgba(236,72,153,0.18) 0%, rgba(0,0,0,0) 70%)' }}
          className="absolute bottom-1/4 -right-24 w-80 h-80 md:w-[500px] md:h-[500px] rounded-full blur-3xl opacity-75"
        />

        {/* Blue Blob */}
        <motion.div 
          animate={{
            x: mousePosition.x * 0.9,
            y: -mousePosition.y * 1.8,
            scale: [1, 1.2, 0.85, 1],
          }}
          transition={{
            scale: { duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 4 },
            x: { type: 'spring', damping: 20, stiffness: 45 },
            y: { type: 'spring', damping: 20, stiffness: 45 },
          }}
          style={{ backgroundImage: 'radial-gradient(circle, rgba(59,130,246,0.24) 0%, rgba(0,0,0,0) 70%)' }}
          className="absolute top-1/3 left-1/3 w-[500px] h-[500px] rounded-full blur-3xl opacity-60"
        />
      </div>

      {/* 2. SPARKLE BUBBLES CONTAINER: Real-time particle generation container */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        <AnimatePresence>
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0.85, scale: 0.1, x: p.x, y: p.y, rotate: p.rotation }}
              animate={{ 
                opacity: 0, 
                scale: [0.6, 1.4, 0.4], 
                y: p.y - 190, 
                x: p.x + (Math.random() * 120 - 60),
                rotate: p.rotation + 180
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.8, ease: "easeOut" }}
              style={{ 
                width: p.size, 
                height: p.size, 
                backgroundColor: p.color,
                boxShadow: `0 0 16px ${p.color}`,
              }}
              className="absolute rounded-full border border-white/20"
            />
          ))}
        </AnimatePresence>
      </div>

      {/* 3. APP TOP NAV LOGO LINE & MOOD ATMOSPHERE SWITCHER */}
      <header className="relative z-20 flex justify-between items-center max-w-7xl w-full mx-auto pb-4 border-b border-white/10">
        {/* Brand visual header */}
        <div className="flex items-center gap-3">
          <div 
            style={{ 
              boxShadow: `0 0 20px ${getPrimaryAccentColor()}50`,
              backgroundImage: `linear-gradient(135deg, ${getPrimaryAccentColor()}dd, #4f46e5)`
            }}
            className="w-11 h-11 rounded-2xl flex items-center justify-center text-white"
          >
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[9px] uppercase font-black text-indigo-400 tracking-widest leading-none block">System Entrance</span>
            <h1 className="text-xl font-black mt-1 text-white tracking-tight flex items-center gap-1.5">
              <span>Tempo</span>
              <span className="text-[10px] font-black py-0.5 px-2 rounded-md bg-indigo-500/20 text-indigo-300 uppercase tracking-widest">PRO V2</span>
            </h1>
          </div>
        </div>

        {/* Dynamic theme style ambiance manager tag labels (Pure Interactivity) */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-white/10 p-1.5 rounded-2xl shadow-xl">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-2 hidden sm:inline-block">Click Mood:</span>
          
          <div className="flex items-center gap-1">
            {/* PURPLE MOOD BTN */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMood('purple');
                playSound('click', 700);
              }}
              className={`w-7 h-7 rounded-lg bg-purple-600 border flex items-center justify-center transition-all ${
                activeMood === 'purple' ? 'border-white scale-110 ring-2 ring-purple-500/50' : 'border-transparent opacity-60 hover:opacity-100 scale-100'
              }`}
              title="Cyber Purple Mood"
            />
            {/* PINK MOOD BTN */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMood('pink');
                playSound('click', 740);
              }}
              className={`w-7 h-7 rounded-lg bg-pink-600 border flex items-center justify-center transition-all ${
                activeMood === 'pink' ? 'border-white scale-110 ring-2 ring-pink-500/50' : 'border-transparent opacity-60 hover:opacity-100 scale-100'
              }`}
              title="Sakura Pink Mood"
            />
            {/* BLUE MOOD BTN */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMood('blue');
                playSound('click', 780);
              }}
              className={`w-7 h-7 rounded-lg bg-blue-600 border flex items-center justify-center transition-all ${
                activeMood === 'blue' ? 'border-white scale-110 ring-2 ring-blue-500/50' : 'border-transparent opacity-60 hover:opacity-100 scale-100'
              }`}
              title="Cosmic Blue Mood"
            />
            {/* FUSION / RAINBOW */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveMood('fusion');
                playSound('click', 840);
              }}
              className={`w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-500 via-pink-400 to-blue-500 border flex items-center justify-center transition-all text-[9px] font-black ${
                activeMood === 'fusion' ? 'border-shift text-white scale-110 ring-2 ring-indigo-400/50 border-white' : 'border-transparent opacity-70 hover:opacity-100 scale-100'
              }`}
              title="Rainbow Fusion Mood"
            >
              🔄
            </button>
          </div>
        </div>
      </header>

      {/* 4. MAIN CENTRAL CONTENT WORKSPACE CONTAINER */}
      <main className="relative z-20 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-12 md:py-16">
        
        {/* LEFT COLUMN: BRAND HIGHLIGHT INFO BOARD */}
        <div id="landing-visual-hero" className="flex flex-col justify-center text-left space-y-6">
          <div className="space-y-4 max-w-xl">
            {/* Click to interactive reminder banner */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 py-1 px-3.5 bg-gradient-to-r from-indigo-500/20 via-pink-500/10 to-indigo-500/20 rounded-full border border-indigo-450/30 text-indigo-200 text-[10px] uppercase font-black tracking-widest"
            >
              <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-spin" style={{ animationDuration: '4s' }} />
              <span>Tap on the workspace to spawn bubbles & sounds!</span>
            </motion.div>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-none text-white">
              Secure, Local
              <span className={`block bg-gradient-to-r ${getGradientTextClass()} bg-clip-text text-transparent mt-2 transition-all duration-1000`}>
                Interactive
                Chronos Tracker
              </span>
            </h2>

            <p className="text-sm md:text-base text-slate-350 leading-relaxed max-w-lg">
              Experience the visual elegance of offline session analytics. Tempo guarantees complete data boundary isolation, clean reactive dials, daily multiplier matrices, and high-frequency tactile response.
            </p>
          </div>

          {/* ELEGANT MINIMALIST CAPABILITY ROW CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg select-none pt-2">
            <div className="p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl transition-all duration-300">
              <span className="text-[10px] font-black uppercase text-pink-400 block tracking-widest mb-1">01 / Dynamic FX</span>
              <strong className="text-sm text-white block">Synthetic Web Audio</strong>
              <p className="text-xs text-slate-400 mt-1">Slight coordinate wave oscillators deliver immediate sound responses.</p>
            </div>
            <div className="p-4 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl transition-all duration-300">
              <span className="text-[10px] font-black uppercase text-purple-400 block tracking-widest mb-1">02 / Privacy</span>
              <strong className="text-sm text-white block">Offline Sandbox Isolation</strong>
              <p className="text-xs text-slate-400 mt-1">Zero trackers or endpoints. Secure telemetry parameters kept on disk.</p>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: AUTH SECURITY PASSCODE PADLOCK TERMINAL */}
        <div className="flex justify-center">
          <motion.div 
            id="pin-lock-card"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            onClick={(e) => e.stopPropagation()} // Ignore bubble spawns inside auth card
            className="w-full max-w-sm bg-slate-950/80 rounded-3xl shadow-2xl border border-white/10 p-6 md:p-8 flex flex-col items-center backdrop-blur-2xl relative"
          >
            {/* Secondary neon glowing bar behind security title */}
            <div 
              style={{ backgroundColor: getPrimaryAccentColor() }}
              className="absolute -top-1 left-1/4 right-1/4 h-[2px] blur-sm rounded-full opacity-80"
            />

            {/* Top Security Banner Icon */}
            <div id="pin-lock-header" className="flex flex-col items-center mb-6">
              <motion.div 
                animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
                transition={{ duration: 0.4 }}
                style={{ 
                  boxShadow: errorMsg ? '0 0 16px rgba(239, 68, 68, 0.4)' : `0 0 16px ${getPrimaryAccentColor()}50`,
                  backgroundColor: errorMsg ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)'
                }}
                className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border border-white/10 text-white`}
              >
                {isNewSetup ? (
                  <RefreshCw className={`w-6 h-6 text-indigo-400 ${step === 'confirm' ? 'animate-spin' : ''}`} />
                ) : (
                  <Fingerprint className="w-6 h-6" style={{ color: getPrimaryAccentColor() }} />
                )}
              </motion.div>
              
              <h2 className="text-xl font-black tracking-tight text-white text-center">
                {isNewSetup 
                  ? (step === 'enter' ? 'Establish Access PIN' : 'Confirm Access PIN') 
                  : 'Passcode Authentication'}
              </h2>
              
              <p className="text-[11px] text-slate-400 mt-1.5 text-center leading-normal max-w-xs">
                {isNewSetup 
                  ? (step === 'enter' 
                      ? 'Secure your offline tracker telemetry with a custom 4-digit token key.' 
                      : 'Repeat the secret combination to verify and launch database context.')
                  : 'Authorized cryptographic signature required to query historic metrics.'}
              </p>
            </div>

            {/* PIN Indicators Dots Panel representing entries */}
            <div id="pin-dots-container" className="flex items-center justify-center gap-3.5 mb-5 uppercase">
              {[0, 1, 2, 3].map((index) => {
                const hasValue = activeInputVal.length > index;
                return (
                  <motion.div
                    key={index}
                    id={`pin-dot-${index}`}
                    animate={{
                      scale: hasValue ? [1, 1.3, 1.1] : 1,
                    }}
                    transition={{ duration: 0.12 }}
                    style={{ 
                      backgroundColor: hasValue ? getPrimaryAccentColor() : 'rgba(255,255,255,0.06)',
                      boxShadow: hasValue ? `0 0 15px ${getPrimaryAccentColor()}` : 'none'
                    }}
                    className={`w-3.5 h-3.5 rounded-full border ${
                      hasValue ? 'border-transparent' : 'border-white/10'
                    }`}
                  />
                );
              })}
            </div>

            {/* Input Feedback Alerts Message box */}
            <div id="pin-lock-feedback" className="h-5 flex items-center justify-center mb-5">
              <AnimatePresence mode="wait">
                {errorMsg ? (
                  <motion.span 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="text-[10px] font-black text-rose-450 flex items-center gap-1 bg-rose-955/10 border border-rose-500/20 py-0.5 px-2 rounded-full"
                  >
                    <ShieldAlert className="w-3 h-3 flex-shrink-0 text-rose-400" />
                    <span>{errorMsg}</span>
                  </motion.span>
                ) : isNewSetup && step === 'confirm' ? (
                  <motion.span 
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="text-[10px] font-black text-emerald-450 flex items-center gap-1 bg-emerald-955/10 border border-emerald-500/20 py-0.5 px-2 rounded-full"
                  >
                    <CheckCircle2 className="w-3 h-3 flex-shrink-0 text-emerald-400" />
                    <span>Keys align! Retype to finalize.</span>
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>

            {/* Numeric Tactile Tactile Numpad */}
            <div id="numpad-grid" className="grid grid-cols-3 gap-2 w-full">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <motion.button
                  key={digit}
                  id={`numpad-btn-${digit}`}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => handleKeyPress(digit)}
                  className="h-11 rounded-2xl text-base font-black bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.12] text-slate-100 border border-white/5 transition-colors flex items-center justify-center cursor-pointer select-none"
                >
                  {digit}
                </motion.button>
              ))}
              
              <motion.button
                id="numpad-btn-clear"
                whileTap={{ scale: 0.94 }}
                onClick={handleClear}
                className="h-11 rounded-2xl text-[10px] font-black bg-white/[0.01] text-slate-500 border border-white/5 hover:text-rose-450 hover:bg-rose-500/10 flex items-center justify-center cursor-pointer select-none uppercase tracking-wider"
              >
                Clear
              </motion.button>

              <motion.button
                id="numpad-btn-0"
                whileTap={{ scale: 0.94 }}
                onClick={() => handleKeyPress('0')}
                className="h-11 rounded-2xl text-base font-black bg-white/[0.03] hover:bg-white/[0.08] text-slate-200 border border-white/5 flex items-center justify-center cursor-pointer select-none"
              >
                0
              </motion.button>

              <motion.button
                id="numpad-btn-backspace"
                whileTap={{ scale: 0.94 }}
                onClick={handleBackspace}
                className="h-11 rounded-2xl text-[10px] font-bold bg-white/[0.01] text-slate-500 border border-white/5 hover:text-white flex items-center justify-center cursor-pointer select-none uppercase tracking-wider"
              >
                Del
              </motion.button>
            </div>

            {/* Toggle numeric visibility as optional convenience feedback */}
            <button
              type="button"
              id="pin-visibility-toggle"
              onClick={() => {
                setIsPinVisible(!isPinVisible);
                playSound('click', 800);
              }}
              className="mt-5 text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1.5 transition-colors duration-150 py-1.5 px-3.5 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer"
            >
              {isPinVisible ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Mask passcodes</span>
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Expose password digits</span>
                </>
              )}
            </button>

            {/* Temporary visual overlay showing raw input keys */}
            {isPinVisible && activeInputVal.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-3.5 text-xs font-mono font-black tracking-widest text-white px-4 py-1.5 rounded-lg border border-white/10"
                style={{ backgroundColor: `${getPrimaryAccentColor()}15`, borderColor: getPrimaryAccentColor() }}
              >
                {activeInputVal}
              </motion.div>
            )}
          </motion.div>
        </div>

      </main>

      {/* 5. FOOTER SECURE STATEMENT (Parity clean architecture, anti-AI terminal slop lines) */}
      <footer className="relative z-20 text-center text-[10px] font-extrabold text-slate-500 tracking-widest uppercase border-t border-white/10 pt-4 flex flex-col sm:flex-row items-center justify-between max-w-7xl w-full mx-auto gap-2">
        <span>Active Theme Profile Mode: <strong style={{ color: getPrimaryAccentColor() }} className="transition-colors duration-1000">{activeMood} atmos</strong></span>
        <span>Isolated Client Parity Secure Environment</span>
      </footer>

    </div>
  );
}
