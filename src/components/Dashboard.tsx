/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, Calendar, Search, Trash2, Edit3, 
  Check, X, FileSpreadsheet, Download, RefreshCw, Briefcase, 
  Terminal, BookOpen, Users, Palette, Heart, Clock, ChevronDown
} from 'lucide-react';
import { TimeSession, ActivityCategory, TimeFilter } from '../types';
import { DEFAULT_CATEGORIES } from '../services/db';

interface DashboardProps {
  sessions: TimeSession[];
  categories: ActivityCategory[];
  onDeleteSession: (id: string) => void;
  onUpdateSession: (session: TimeSession) => void;
}

// Map Lucide name to React Component
export function CategoryIcon({ name, className = "w-4 h-4" }: { name: string; className?: string }) {
  switch (name) {
    case 'Terminal': return <Terminal className={className} />;
    case 'BookOpen': return <BookOpen className={className} />;
    case 'Users': return <Users className={className} />;
    case 'Palette': return <Palette className={className} />;
    case 'Heart': return <Heart className={className} />;
    case 'Briefcase': return <Briefcase className={className} />;
    default: return <Clock className={className} />;
  }
}

// Dynamic duration formatter
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  const hText = hrs > 0 ? `${hrs}h ` : '';
  const mText = mins > 0 ? `${mins}m ` : '';
  const sText = secs > 0 && hrs === 0 ? `${secs}s` : '';
  return `${hText}${mText}${sText}`.trim() || '0s';
}

export default function Dashboard({ sessions, categories, onDeleteSession, onUpdateSession }: DashboardProps) {
  const [activeFilter, setActiveFilter] = useState<TimeFilter>('week');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  
  // Custom states for interactive visual metrics target goal config
  const [weeklyGoalHours, setWeeklyGoalHours] = useState(20);

  // Custom states for selecting specific log detail representations
  const [selectedDetailSession, setSelectedDetailSession] = useState<TimeSession | null>(null);

  // State for editing session description in history list
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState('');

  // Category Colors Palette Object for charts & backgrounds
  const categoryMap = useMemo(() => {
    const map: Record<string, ActivityCategory> = {};
    categories.forEach(cat => {
      map[cat.id] = cat;
    });
    return map;
  }, [categories]);

  // Filtering logs based on chosen Period
  const filteredByTimeSessions = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date().setHours(0, 0, 0, 0);
    const startOfYesterday = startOfToday - (24 * 60 * 60 * 1000);
    const startOfWeek = startOfToday - (7 * 24 * 60 * 60 * 1000);
    const startOfMonth = startOfToday - (30 * 24 * 60 * 60 * 1000);

    return sessions.filter(s => {
      switch (activeFilter) {
        case 'today':
          return s.startTime >= startOfToday;
        case 'yesterday':
          return s.startTime >= startOfYesterday && s.startTime < startOfToday;
        case 'week':
          return s.startTime >= startOfWeek;
        case 'month':
          return s.startTime >= startOfMonth;
        case 'all':
        default:
          return true;
      }
    });
  }, [sessions, activeFilter]);

  // Secondary Filter: Category + Description query
  const finalFilteredSessions = useMemo(() => {
    return filteredByTimeSessions.filter(s => {
      const matchCat = categoryFilter === 'all' || s.category === categoryFilter;
      const matchText = s.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (categoryMap[s.category]?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchText;
    });
  }, [filteredByTimeSessions, categoryFilter, searchQuery, categoryMap]);

  // Primary Metrics calculations
  const metrics = useMemo(() => {
    let totalSecs = 0;
    const catMinutes: Record<string, number> = {};
    
    // Initialize empty records
    categories.forEach(c => {
      catMinutes[c.id] = 0;
    });

    filteredByTimeSessions.forEach(s => {
      totalSecs += s.duration;
      if (catMinutes[s.category] !== undefined) {
        catMinutes[s.category] += s.duration;
      } else {
        catMinutes[s.category] = s.duration;
      }
    });

    let topCatId = '—';
    let topCatSecs = 0;
    Object.entries(catMinutes).forEach(([catId, secs]) => {
      if (secs > topCatSecs) {
        topCatSecs = secs;
        topCatId = catId;
      }
    });

    const averageLength = filteredByTimeSessions.length > 0 
      ? Math.round(totalSecs / filteredByTimeSessions.length) 
      : 0;

    return {
      totalSeconds: totalSecs,
      averageSessionSecs: averageLength,
      topCategory: categoryMap[topCatId]?.name || topCatId,
      sessionCount: filteredByTimeSessions.length
    };
  }, [filteredByTimeSessions, categories, categoryMap]);

  // Total Hours tracked in current range for progress bar
  const totalHoursTracked = Number((metrics.totalSeconds / 3600).toFixed(1));
  const goalPercentage = Math.min(100, Math.round((totalHoursTracked / (weeklyGoalHours || 1)) * 100));

  // Category Distribution percentages for Donuts & Progress bars
  const distributionData = useMemo(() => {
    const data: Array<{ category: ActivityCategory; duration: number; percent: number }> = [];
    if (metrics.totalSeconds === 0) return data;

    categories.forEach(cat => {
      const duration = filteredByTimeSessions
        .filter(s => s.category === cat.id)
        .reduce((sum, s) => sum + s.duration, 0);

      if (duration > 0) {
        data.push({
          category: cat,
          duration,
          percent: Math.round((duration / metrics.totalSeconds) * 100)
        });
      }
    });

    return data.sort((a, b) => b.duration - a.duration);
  }, [filteredByTimeSessions, categories, metrics.totalSeconds]);

  // Bar Graph Math for Weekly daily progression (Hours tracked per day for the last 7 days)
  const dailyGraphData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const list = [];
    
    // Create map for last 7 calendar days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayLabel = days[d.getDay()];
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const dayEnd = dayStart + (24 * 60 * 60 * 1000);

      const daySecs = sessions
        .filter(s => s.startTime >= dayStart && s.startTime < dayEnd)
        .reduce((sum, s) => sum + s.duration, 0);

      list.push({
        label: dayLabel,
        hours: Number((daySecs / 3600).toFixed(1)),
        rawSecs: daySecs,
        dateString: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      });
    }

    return list;
  }, [sessions]);

  const maxHoursInGraph = useMemo(() => {
    const max = Math.max(...dailyGraphData.map(d => d.hours));
    return max > 0 ? Math.ceil(max) : 4;
  }, [dailyGraphData]);

  // EXPORT TO CSV schema handler for offline management
  const downloadCSV = () => {
    const headers = ['Session ID', 'Category', 'Description', 'Start Time', 'End Time', 'Duration (Seconds)', 'Readable Duration'];
    const rows = sessions.map(s => [
      s.id,
      categoryMap[s.category]?.name || s.category,
      `"${s.description.replace(/"/g, '""')}"`,
      new Date(s.startTime).toISOString(),
      new Date(s.endTime).toISOString(),
      s.duration,
      formatDuration(s.duration)
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tempo_time_logs_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Inline editor triggers
  const handleStartEdit = (session: TimeSession, e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // Avoid triggering details sheet modal
    setEditingSessionId(session.id);
    setEditDescription(session.description);
  };

  const handleSaveEdit = (session: TimeSession, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onUpdateSession({
      ...session,
      description: editDescription
    });
    setEditingSessionId(null);
    if (selectedDetailSession?.id === session.id) {
      setSelectedDetailSession({
        ...session,
        description: editDescription
      });
    }
  };

  // Math variables for rendering SVG circular donut slice arcs
  const donutMath = useMemo(() => {
    const radius = 40;
    const circ = 2 * Math.PI * radius; // 251.3
    let cumulativePercent = 0;

    return distributionData.map(item => {
      const strokeLength = (item.percent / 100) * circ;
      const strokeOffset = circ - ((cumulativePercent / 100) * circ);
      cumulativePercent += item.percent;

      return {
        ...item,
        strokeLength,
        strokeOffset,
        circ
      };
    });
  }, [distributionData]);

  return (
    <div id="dashboard-root" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. Core Visual Analytics Panels */}
      <div id="analytics-column" className="lg:col-span-2 space-y-6">
        
        {/* Header filters & details */}
        <div id="analytics-filter-bar" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-500" />
            <h3 className="font-bold text-slate-800 text-lg">Activity Period Dashboard</h3>
          </div>
          
          <div id="filter-buttons" className="flex items-center bg-slate-50 border border-slate-200/80 rounded-lg p-0.5 w-full sm:w-auto overflow-x-auto">
            {(['today', 'yesterday', 'week', 'month', 'all'] as TimeFilter[]).map((filter) => (
              <button
                key={filter}
                id={`filter-btn-${filter}`}
                onClick={() => setActiveFilter(filter)}
                className={`py-1 px-3 text-xs font-semibold rounded-md transition-all whitespace-nowrap cursor-pointer flex-1 sm:flex-none ${
                  activeFilter === filter
                    ? 'bg-white text-indigo-600 shadow-xs border border-slate-200/50'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Metric Cards Row */}
        <div id="metrics-card-grid" className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Time</span>
            <span className="text-xl md:text-2xl font-extrabold text-slate-950 mt-1 truncate">{formatDuration(metrics.totalSeconds)}</span>
            <span className="text-[10px] text-slate-400 mt-2">during selected period</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Session</span>
            <span className="text-xl md:text-2xl font-extrabold text-indigo-600 mt-1 truncate">{formatDuration(metrics.averageSessionSecs)}</span>
            <span className="text-[10px] text-slate-400 mt-2">per recorded focus log</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Most Active</span>
            <span className="text-xl md:text-2xl font-extrabold text-emerald-600 mt-1 truncate leading-tight">{metrics.topCategory}</span>
            <span className="text-[10px] text-slate-400 mt-2">top allotment index</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Logs Count</span>
            <span className="text-xl md:text-2xl font-extrabold text-slate-900 mt-1 truncate">{metrics.sessionCount}</span>
            <span className="text-[10px] text-slate-400 mt-2">total entries listed</span>
          </div>
        </div>

        {/* Dynamic Goal target setting widget (Mobbin Premium inspired UI UX metric adjuster) */}
        <div id="goal-progress-card-workspace" className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-850 shadow-xl overflow-hidden relative">
          {/* Glowing absolute visual effects background */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-600/20 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
            <div className="flex-1">
              <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider flex items-center gap-1">
                <Check className="w-3.5 h-3.5 fill-indigo-400 text-slate-900" />
                Performance Target Alignment
              </span>
              <h4 className="text-lg font-extrabold mt-1.5 flex items-center gap-2">
                <span>Weekly Session Goal:</span>
                <span className="text-indigo-300 font-mono text-xl">{weeklyGoalHours} hrs</span>
              </h4>
              <p className="text-xs text-slate-400 mt-1">Adjust and optimize target hours tracked to unlock achievements</p>
            </div>

            {/* Config controls */}
            <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 border border-slate-700/50 rounded-xl flex-shrink-0 self-stretch md:self-auto justify-center">
              <button 
                type="button"
                onClick={() => setWeeklyGoalHours(prev => Math.max(5, prev - 5))}
                className="w-10 h-10 rounded-lg bg-slate-900 hover:bg-slate-950 font-black text-rose-400 flex items-center justify-center cursor-pointer text-xs border border-slate-800 transition-colors"
                title="Decrease Goal"
              >
                -5h
              </button>
              <button 
                type="button"
                onClick={() => setWeeklyGoalHours(prev => Math.min(100, prev + 5))}
                className="w-10 h-10 rounded-lg bg-slate-900 hover:bg-slate-950 font-black text-emerald-400 flex items-center justify-center cursor-pointer text-xs border border-slate-800 transition-colors"
                title="Increase Goal"
              >
                +5h
              </button>
            </div>
          </div>

          {/* Goal level status meter bar */}
          <div className="mt-5 pt-3.5 border-t border-slate-800/70">
            <div className="flex justify-between items-center text-xs font-bold font-mono text-slate-400 mb-2">
              <span>Tracked: <strong className="text-white">{totalHoursTracked} hrs</strong></span>
              <span>Completion: <strong className="text-indigo-400">{goalPercentage}%</strong></span>
            </div>
            
            {/* Horizontal custom fill tracking meter */}
            <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden p-0.5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${goalPercentage}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 shadow-md shadow-indigo-500/20"
              />
            </div>
          </div>
        </div>

        {/* Dynamic hand-drawn SVG Graphical representation cards */}
        <div id="graph-panel-grid" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* A. Vector Donut Diagram Card */}
          <div id="donut-graph-card" className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800 text-sm">Allotment Distribution</h4>
              <span className="text-[10px] font-semibold uppercase bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">Proportional Ratio</span>
            </div>

            {distributionData.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
                <BarChart3 className="w-12 h-12 stroke-1 text-slate-300 animate-pulse mb-3" />
                <p className="text-xs font-medium">No recorded time blocks inside selected range.</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
                {/* SVG Visual Ring */}
                <div className="relative w-36 h-36 flex-shrink-0">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle 
                      cx="50" cy="50" r="40" 
                      fill="transparent" 
                      stroke="#f1f5f9" 
                      strokeWidth="11" 
                    />
                    {donutMath.map((slice, i) => (
                      <motion.circle
                        key={slice.category.id}
                        initial={{ strokeDasharray: `0 ${slice.circ}` }}
                        animate={{ strokeDasharray: `${slice.strokeLength} ${slice.circ}` }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                        cx="50" cy="50" r="40"
                        fill="transparent"
                        stroke={slice.category.hexColor}
                        strokeWidth="11"
                        strokeDashoffset={slice.strokeOffset}
                        strokeLinecap="round"
                        style={{ transformOrigin: '50% 50%' }}
                      />
                    ))}
                  </svg>
                  {/* Central Text Detail */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Category</span>
                    <span className="text-xl font-black text-slate-800">{distributionData.length}</span>
                    <span className="text-[10px] text-slate-400">unique groups</span>
                  </div>
                </div>

                {/* Donut Legend */}
                <div className="flex-1 space-y-2.5 w-full">
                  {distributionData.slice(0, 5).map((item) => (
                    <div key={item.category.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 max-w-[130px] truncate">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.category.hexColor }} />
                        <span className="font-semibold text-slate-700 truncate">{item.category.name}</span>
                      </div>
                      <div className="text-right text-slate-500 font-mono">
                        <span className="font-bold text-slate-800">{item.percent}%</span>
                        <span className="text-[10px] ml-1.5">({formatDuration(item.duration)})</span>
                      </div>
                    </div>
                  ))}
                  {distributionData.length > 5 && (
                    <p className="text-[10px] text-slate-400 text-right font-medium">+ {distributionData.length - 5} more categories</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* B. Weekly Productivity Level Map */}
          <div id="weekly-productivity-card" className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800 text-sm">Productivity Matrix (Last 7 Days)</h4>
              <span className="text-[10px] font-semibold uppercase bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">Daily Log Hrs</span>
            </div>

            {/* Custom SVG Column Graph */}
            <div className="flex-1 flex flex-col justify-end min-h-[150px]">
              <div id="svg-chart-container" className="h-28 flex items-end justify-between gap-3 px-1">
                {dailyGraphData.map((day, idx) => {
                  const barHeightPercent = maxHoursInGraph > 0 
                    ? (day.hours / maxHoursInGraph) * 100 
                    : 0;

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center group relative cursor-pointer font-sans">
                      {/* Tooltip widget */}
                      <div className="absolute bottom-full mb-1.5 hidden group-hover:block bg-slate-950 text-white text-[10px] py-1.5 px-2 rounded-md shadow-lg z-20 whitespace-nowrap text-center">
                        <p className="font-bold">{day.hours} Hrs</p>
                        <p className="text-slate-400 font-mono text-[9px]">{day.dateString}</p>
                      </div>

                      {/* Bar Fill Track */}
                      <div className="w-full bg-slate-50 rounded-md h-full flex flex-col justify-end border border-slate-100 relative overflow-hidden">
                        <motion.div 
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(barHeightPercent, day.hours > 0 ? 5 : 0)}%` }}
                          transition={{ duration: 0.5, delay: idx * 0.05, ease: "easeOut" }}
                          className={`w-full rounded-b-sm ${
                            day.hours > 4 
                              ? 'bg-indigo-600 hover:bg-indigo-500' 
                              : day.hours > 1.5 
                                ? 'bg-indigo-500 hover:bg-indigo-400' 
                                : 'bg-indigo-400 hover:bg-indigo-300'
                          }`}
                        />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 mt-2">{day.label}</span>
                    </div>
                  );
                })}
              </div>
              
              {/* Reference indicator labels in graph */}
              <div className="flex justify-between items-center border-t border-slate-100/80 pt-2 mt-2 text-[10px] text-slate-400">
                <span>0 Hrs</span>
                <span>Max: {maxHoursInGraph} Hrs</span>
              </div>
            </div>
          </div>
        </div>

        {/* Elegant Proportional visual progress stack band */}
        {distributionData.length > 0 && (
          <div id="distribution-stripe" className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">Segment Allocation Grid</h4>
            <div className="h-3.5 w-full rounded-full flex overflow-hidden bg-slate-100">
              {distributionData.map((item, idx) => (
                <div 
                  key={idx}
                  style={{ 
                    width: `${item.percent}%`,
                    backgroundColor: item.category.hexColor
                  }}
                  className="h-full first:rounded-l-full last:rounded-r-full transition-all cursor-pointer relative group"
                  title={`${item.category.name}: ${item.percent}%`}
                >
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-slate-900 text-white text-[9px] font-bold py-0.5 px-2 rounded whitespace-nowrap z-30 shadow-xs pointer-events-none">
                    {item.category.name} ({item.percent}%)
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Logging History Column (List view with searches, in-line editor, click drawer) */}
      <div id="history-column" className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col max-h-[640px] overflow-hidden">
        
        {/* Title and Download Exports */}
        <div className="flex items-center justify-between mb-4 border-b border-slate-100/80 pb-3">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Tracking Registry</h3>
            <p className="text-[11px] text-slate-400">Tap rows to view detail workspace</p>
          </div>
          <button 
            id="export-csv-btn"
            onClick={downloadCSV}
            disabled={sessions.length === 0}
            className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV Excel</span>
          </button>
        </div>

        {/* Interactive Query Filters Row */}
        <div className="space-y-2.5 mb-2">
          {/* Query search input box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input 
              id="registry-search-input"
              type="text"
              placeholder="Search via note/category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-slate-50 placeholder-slate-400 text-slate-700 border border-slate-200/80 rounded-xl py-2 pl-9 pr-4 focus:outline-hidden focus:border-indigo-400 focus:bg-white transition-all font-medium"
            />
          </div>

          {/* Quick Filter Tag Buttons inside registry searches */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1.5 scrollbar-none">
            {["Coding", "Figma", "UI", "Sync", "Break", "HIIT"].map((tag) => {
              const isActive = searchQuery === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSearchQuery(isActive ? "" : tag)}
                  className={`text-[10px] font-bold py-0.5 px-2.5 rounded-full border cursor-pointer select-none whitespace-nowrap transition-all ${
                    isActive 
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50/50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>

          {/* Category filter dropdown picker */}
          <div className="relative">
            <select
              id="registry-category-filter"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-200/80 p-2 rounded-xl focus:outline-hidden focus:border-indigo-400 focus:bg-white transition-all appearance-none cursor-pointer pr-10"
            >
              <option value="all" className="font-semibold">Filter: All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id} className="font-medium">{c.name}</option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none top-2.5" />
          </div>
        </div>

        {/* Scrollable logs collection list */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 scrollbar-thin scrollbar-thumb-slate-200">
          <AnimatePresence initial={false} mode="popLayout">
            {finalFilteredSessions.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-xl p-4">
                <Clock className="w-8 h-8 stroke-1 text-slate-300 animate-pulse mb-2" />
                <p className="text-xs font-semibold text-center leading-relaxed">No matching logs listed.</p>
                <p className="text-[10px] text-slate-400 text-center mt-1">Refine filters or tap trigger timers to record data.</p>
              </div>
            ) : (
              finalFilteredSessions.map((session) => {
                const cat = categoryMap[session.category] || { name: 'Unknown', color: 'slate', icon: 'Clock', hexColor: '#64748b' };
                const isEditing = editingSessionId === session.id;
                const formattedDate = new Date(session.startTime).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric'
                });
                const formattedTime = new Date(session.startTime).toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true
                });

                return (
                  <motion.div
                    key={session.id}
                    id={`log-item-${session.id}`}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    onClick={() => {
                      if (!isEditing) setSelectedDetailSession(session);
                    }}
                    className="p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 shadow-2xs group hover:shadow-xs transition-all cursor-pointer relative flex flex-col gap-2"
                  >
                    {/* Item header line (Category circle indicator + Date) */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.hexColor }} />
                        <span className="text-slate-700 truncate max-w-[130px]">{cat.name}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-400 font-mono">
                        {formattedDate} • {formattedTime}
                      </span>
                    </div>

                    {/* Inline Description Editing Panel */}
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 mt-1 bg-slate-50 border border-slate-200/80 rounded-lg p-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          id={`input-edit-desc-${session.id}`}
                          type="text"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="flex-1 text-xs px-2 py-1 focus:outline-hidden bg-white text-slate-800 rounded font-medium border border-slate-200/40"
                          autoFocus
                          placeholder="What were you doing?"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(session);
                            if (e.key === 'Escape') setEditingSessionId(null);
                          }}
                        />
                        <button
                          id={`btn-edit-save-${session.id}`}
                          onClick={(e) => handleSaveEdit(session, e)}
                          className="p-1 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-100 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-edit-cancel-${session.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSessionId(null);
                          }}
                          className="p-1 rounded bg-slate-150 text-slate-500 hover:bg-slate-200 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <p className="text-xs font-bold text-slate-800 break-words line-clamp-2">
                          {session.description || <span className="text-slate-300 italic font-medium">No notation provided</span>}
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold font-mono mt-1 pt-1 border-t border-slate-100/50">
                          <span className="text-slate-900 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {formatDuration(session.duration)}
                          </span>

                          {/* Quick Operations toolbar appearing on hover */}
                          <div className="flex items-center gap-1 select-none opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                            <button
                              id={`btn-trigger-edit-${session.id}`}
                              onClick={(e) => handleStartEdit(session, e)}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md cursor-pointer transition-colors"
                              title="Edit Log Note"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              id={`btn-trigger-delete-${session.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteSession(session.id);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer transition-colors"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 4. Immersive detail sheet / modal for chosen sessions (Mobbin Premium inspired Drawer interface) */}
      <AnimatePresence>
        {selectedDetailSession && (() => {
          const cat = categoryMap[selectedDetailSession.category] || { name: 'General', icon: 'Clock', hexColor: '#64748b' };
          const formattedFullDate = new Date(selectedDetailSession.startTime).toLocaleDateString(undefined, {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          const startTimeStr = new Date(selectedDetailSession.startTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
          const endTimeStr = new Date(selectedDetailSession.endTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
          
          return (
            <div id="details-modal-overlay" className="fixed inset-0 bg-slate-910/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <motion.div
                id="details-modal-container"
                initial={{ scale: 0.95, y: 15, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 15, opacity: 0 }}
                className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-slate-100 flex flex-col gap-4 text-slate-800"
              >
                {/* Header line */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-black tracking-widest text-indigo-600">Metric inspection view</span>
                    <h3 className="font-extrabold text-slate-900 text-lg mt-0.5">Focus Point Sheet</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDetailSession(null)}
                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Swatch detail */}
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/50 rounded-2xl p-4">
                  <div 
                    style={{ backgroundColor: `${cat.hexColor}10`, color: cat.hexColor }}
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  >
                    <CategoryIcon name={cat.icon} className="w-6 h-6 stroke-[2]" />
                  </div>
                  <div>
                    <h4 className="font-black text-slate-800 text-xs leading-none">{cat.name}</h4>
                    <span className="text-[10px] font-bold text-slate-400 mt-1.5 block font-mono">{formattedFullDate}</span>
                  </div>
                </div>

                {/* Duration card detail */}
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Start point</span>
                    <span className="block text-sm font-extrabold text-slate-800 font-mono mt-1">{startTimeStr}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Finish point</span>
                    <span className="block text-sm font-extrabold text-slate-800 font-mono mt-1">{endTimeStr}</span>
                  </div>
                </div>

                {/* Log Note inline manager */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1.5">
                    Activity Notation detail
                  </label>
                  
                  {editingSessionId === selectedDetailSession.id ? (
                    <div className="flex items-center gap-1.5 p-1 bg-slate-50 border border-slate-200 rounded-xl">
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="flex-1 text-xs font-bold px-3 py-2 bg-white rounded-lg focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(selectedDetailSession)}
                        className="p-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 relative group">
                      <p className="text-xs font-bold text-slate-800 break-words pr-8 leading-relaxed">
                        {selectedDetailSession.description || <span className="text-slate-300 italic">No notation</span>}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleStartEdit(selectedDetailSession)}
                        className="absolute right-2.5 top-2.5 p-1 text-indigo-600 hover:bg-indigo-50 rounded-md cursor-pointer"
                        title="Edit notation"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Total time length representation indicator */}
                <div className="p-3.5 bg-indigo-50/40 border border-indigo-100/50 rounded-xl text-center">
                  <span className="text-[9px] font-black uppercase text-indigo-400 tracking-wider block">Completed Tracking Duration</span>
                  <span className="text-xl font-black text-indigo-700 font-mono block mt-1">{formatDuration(selectedDetailSession.duration)}</span>
                </div>

                {/* Fast Action commands row */}
                <div className="flex gap-2.5 mt-2 pt-2.5 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteSession(selectedDetailSession.id);
                      setSelectedDetailSession(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100/70 border border-rose-100 rounded-xl cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                    <span>Delete Point</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDetailSession(null)}
                    className="flex-1 py-1 px-4 text-xs font-bold text-slate-800 bg-slate-900 hover:bg-slate-800 text-white rounded-xl cursor-pointer transition-colors"
                  >
                    Close Sheet
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

    </div>
  );
}
