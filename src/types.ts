/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface TimeSession {
  id: string;
  category: string; // ID of the category
  description: string;
  startTime: number; // UTC timestamp (ms)
  endTime: number; // UTC timestamp (ms)
  duration: number; // duration in seconds
}

export interface ActivityCategory {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  color: string; // Tailwind background/text classes prefix (e.g. 'indigo')
  hexColor: string; // Hex code for SVG charts
  description: string;
}

export interface ActiveTimer {
  id: string;
  categoryId: string;
  description: string;
  startTime: number;
}

export type TimeFilter = 'today' | 'yesterday' | 'week' | 'month' | 'all';
