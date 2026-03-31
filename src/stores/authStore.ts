// DagangCerdas — Auth Store (Zustand)
// Manages user authentication state

import { create } from 'zustand';
import type { User } from '../types';
import { DEMO_USER } from '../utils/constants';

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User) => void;
  updateUser: (updates: Partial<User>) => void;
  loginAsDemo: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  setUser: (user: User) => set({ user, isAuthenticated: true }),

  updateUser: (updates: Partial<User>) => set((state) => ({
    user: state.user ? { ...state.user, ...updates } : null
  })),

  loginAsDemo: () => {
    const demoUser: User = {
      id: DEMO_USER.id,
      name: DEMO_USER.name,
      email: DEMO_USER.email,
      businessName: DEMO_USER.businessName,
      businessType: DEMO_USER.businessType,
      phone: DEMO_USER.phone,
      latitude: DEMO_USER.latitude,
      longitude: DEMO_USER.longitude,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      syncedAt: null,
    };
    set({ user: demoUser, isAuthenticated: true });
  },

  logout: () => {
    // Clear user data
    set({ user: null, isAuthenticated: false });
    
    // Clear any cached chat data or navigation state
    // This will trigger chat screen to reset on next visit
    if (typeof window !== 'undefined') {
      // Clear any chat-related navigation state if needed
      localStorage.removeItem('chat_session_id');
    }
  },
}));
