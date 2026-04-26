import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface FeedbackEntry {
  id: string;
  type: 'student' | 'lecturer';
  rating: number;
  comment: string;
  restaurant_id?: string;
  timestamp: number;
}

interface FeedbackCtx {
  entries: FeedbackEntry[];
  submitFeedback: (entry: Omit<FeedbackEntry, 'id' | 'timestamp'>) => void;
  getAvgRating: (type?: string) => number;
}

const FeedbackContext = createContext<FeedbackCtx | null>(null);

/**
 * FeedbackProvider — stores institutional (Student / Lecturer) feedback
 * in a local mock database. Replace with API calls for production.
 */
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);

  const submitFeedback = (entry: Omit<FeedbackEntry, 'id' | 'timestamp'>) => {
    const newEntry: FeedbackEntry = {
      ...entry,
      id: `FB-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
    };
    setEntries(prev => [newEntry, ...prev]);
  };

  const getAvgRating = (type?: string) => {
    const filtered = type ? entries.filter(e => e.type === type) : entries;
    if (filtered.length === 0) return 0;
    return parseFloat((filtered.reduce((s, e) => s + e.rating, 0) / filtered.length).toFixed(1));
  };

  return (
    <FeedbackContext.Provider value={{ entries, submitFeedback, getAvgRating }}>
      {children}
    </FeedbackContext.Provider>
  );
}

export const useFeedback = () => {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback must be inside FeedbackProvider');
  return ctx;
};
