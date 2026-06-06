/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TimeSession, ActivityCategory, ActiveTimer } from '../types';

// Default Visual Activity Categories with polished styles
export const DEFAULT_CATEGORIES: ActivityCategory[] = [
  {
    id: 'work',
    name: 'Work / Development',
    icon: 'Terminal',
    color: 'indigo',
    hexColor: '#6366f1',
    description: 'Deep focus coding, engineering, or visual drafting'
  },
  {
    id: 'learning',
    name: 'Learning / Research',
    icon: 'BookOpen',
    color: 'emerald',
    hexColor: '#10b981',
    description: 'Reading, researching, courses, and intellectual growth'
  },
  {
    id: 'meetings',
    name: 'Meetings / Syncs',
    icon: 'Users',
    color: 'amber',
    hexColor: '#f59e0b',
    description: 'Team standups, client consulting, and general syncs'
  },
  {
    id: 'creative',
    name: 'Design / Creative',
    icon: 'Palette',
    color: 'rose',
    hexColor: '#f43f5e',
    description: 'Figma prototyping, content creation, copywriting'
  },
  {
    id: 'health',
    name: 'Health / Workout',
    icon: 'Heart',
    color: 'cyan',
    hexColor: '#06b6d4',
    description: 'Sports, body exercises, cooling down, stretching'
  },
  {
    id: 'admin',
    name: 'Ops / Admin',
    icon: 'Briefcase',
    color: 'slate',
    hexColor: '#64748b',
    description: 'Sorting emails, planning, finance, files arrangement'
  }
];

// Seed initial session data to give the dashboard pre-populated high-quality analytical depth on fresh load
const SEED_SESSIONS = (): TimeSession[] => {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const sessions: TimeSession[] = [];
  
  // Custom seeds for the last 7 days
  const seeds = [
    { cat: 'work', desc: 'Refactoring UI components & state', dur: 14400, daysAgo: 0 },
    { cat: 'learning', desc: 'Vite & advanced devops patterns', dur: 5400, daysAgo: 0 },
    { cat: 'meetings', desc: 'Sync on sprint progression & releases', dur: 3600, daysAgo: 0 },
    
    { cat: 'work', desc: 'Database layer optimization & indexing', dur: 12600, daysAgo: 1 },
    { cat: 'creative', desc: 'Crafting vectors and wireframing', dur: 7200, daysAgo: 1 },
    { cat: 'health', desc: 'HIIT training routine', dur: 2700, daysAgo: 1 },
    
    { cat: 'work', desc: 'API construction & routing schemas', dur: 18000, daysAgo: 2 },
    { cat: 'meetings', desc: 'Design review feedback sessions', dur: 2400, daysAgo: 2 },
    { cat: 'learning', desc: 'Machine Learning basics course', dur: 3600, daysAgo: 2 },
    
    { cat: 'work', desc: 'Writing comprehensive regression suites', dur: 9000, daysAgo: 3 },
    { cat: 'admin', desc: 'Replying to support queries & backlog clean', dur: 5400, daysAgo: 3 },
    
    { cat: 'work', desc: 'Fleshing out specifications docs', dur: 15600, daysAgo: 4 },
    { cat: 'creative', desc: 'Reviewing design design assets', dur: 4500, daysAgo: 4 },
    { cat: 'health', desc: 'Power running session', dur: 3600, daysAgo: 4 },
    
    { cat: 'learning', desc: 'Studying reactive state caching', dur: 7200, daysAgo: 5 },
    { cat: 'meetings', desc: 'Client kickoff presentation', dur: 5400, daysAgo: 5 },
    
    { cat: 'work', desc: 'Hotfix setup for production env', dur: 11000, daysAgo: 6 },
    { cat: 'admin', desc: 'Invoicing & legal forms submission', dur: 4000, daysAgo: 6 }
  ];

  seeds.forEach((seed, index) => {
    const startTime = now - (seed.daysAgo * oneDay) - (seed.dur * 1000) - (index * 60000);
    const endTime = startTime + (seed.dur * 1000);
    sessions.push({
      id: `seed-session-${index}`,
      category: seed.cat,
      description: seed.desc,
      startTime,
      endTime,
      duration: seed.dur
    });
  });

  return sessions;
};

// Secure hashing routine for the 4-digit PIN
export async function hashPin(pin: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + "tempo-time-tracker-salt");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  } catch (error) {
    // Robust high-speed fallback hash if Web Crypto isn't loaded (e.g. some sandbox modes)
    let h = 0x811c9dc5;
    const combined = pin + "simple-salt";
    for (let i = 0; i < combined.length; i++) {
      h ^= combined.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return "fallback-" + (h >>> 0).toString(16);
  }
}

const STORAGE_KEYS = {
  PIN: "tempo_hashed_pin",
  SESSIONS: "tempo_sessions",
  CATEGORIES: "tempo_categories",
  ACTIVE_TIMER: "tempo_active_timer"
};

export class TimeTrackerDatabase {
  /**
   * Checks if the 4-digit security PIN has been set initially
   */
  static isPinSet(): boolean {
    return localStorage.getItem(STORAGE_KEYS.PIN) !== null;
  }

  /**
   * Sets the 4-digit secure access PIN
   */
  static async setPin(pin: string): Promise<boolean> {
    if (!/^\d{4}$/.test(pin)) {
      throw new Error("PIN must be exactly 4 digits.");
    }
    const hashed = await hashPin(pin);
    localStorage.setItem(STORAGE_KEYS.PIN, hashed);
    return true;
  }

  /**
   * Verifies the entered PIN against the highly secure hashed version in storage
   */
  static async verifyPin(pin: string): Promise<boolean> {
    const storedHashed = localStorage.getItem(STORAGE_KEYS.PIN);
    if (!storedHashed) return false;
    const enteredHashed = await hashPin(pin);
    return storedHashed === enteredHashed;
  }

  /**
   * Clears the current login PIN
   */
  static clearPin(): void {
    localStorage.removeItem(STORAGE_KEYS.PIN);
  }

  /**
   * Fetch all tracked time sessions inside database
   */
  static getSessions(): TimeSession[] {
    const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    if (!data) {
      // No logged records yet: Seed the initial analytics view
      const seeded = SEED_SESSIONS();
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(seeded));
      return seeded;
    }
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  /**
   * Writes a new session item to storage database
   */
  static saveSession(session: TimeSession): void {
    const sessions = this.getSessions();
    const index = sessions.findIndex(s => s.id === session.id);
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.unshift(session);
    }
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  }

  /**
   * Deletes a logged tracking record
   */
  static deleteSession(id: string): void {
    const sessions = this.getSessions();
    const filtered = sessions.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(filtered));
  }

  /**
   * Fetches active categories
   */
  static getCategories(): ActivityCategory[] {
    const data = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
      return DEFAULT_CATEGORIES;
    }
    try {
      return JSON.parse(data);
    } catch {
      return DEFAULT_CATEGORIES;
    }
  }

  /**
   * Adds custom categories
   */
  static saveCategory(category: ActivityCategory): void {
    const categories = this.getCategories();
    const index = categories.findIndex(c => c.id === category.id);
    if (index >= 0) {
      categories[index] = category;
    } else {
      categories.push(category);
    }
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
  }

  /**
   * Saves running active timer state for persistent sessions across tabs/crashes
   */
  static getActiveTimer(): ActiveTimer | null {
    const data = localStorage.getItem(STORAGE_KEYS.ACTIVE_TIMER);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  static setActiveTimer(timer: ActiveTimer | null): void {
    if (timer === null) {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_TIMER);
    } else {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_TIMER, JSON.stringify(timer));
    }
  }

  /**
   * Total Wipeout reset
   */
  static clearAllData(): void {
    localStorage.removeItem(STORAGE_KEYS.PIN);
    localStorage.removeItem(STORAGE_KEYS.SESSIONS);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIES);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_TIMER);
  }
}
