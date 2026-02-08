import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/finance';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  privacyMode: boolean;
  darkMode: boolean;
  login: (email: string, password: string) => boolean;
  register: (name: string, email: string, password: string) => boolean;
  logout: () => void;
  togglePrivacy: () => void;
  toggleDarkMode: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      privacyMode: true,
      darkMode: false,
      login: (email, _password) => {
        if (!email) return false;
        set({
          user: { id: '1', name: email.split('@')[0], email },
          isAuthenticated: true,
        });
        return true;
      },
      register: (name, email, _password) => {
        if (!name || !email) return false;
        set({
          user: { id: '1', name, email },
          isAuthenticated: true,
        });
        return true;
      },
      logout: () => set({ user: null, isAuthenticated: false }),
      togglePrivacy: () => set({ privacyMode: !get().privacyMode }),
      toggleDarkMode: () => {
        const newMode = !get().darkMode;
        document.documentElement.classList.toggle('dark', newMode);
        set({ darkMode: newMode });
      },
    }),
    { name: 'finance-auth' }
  )
);
