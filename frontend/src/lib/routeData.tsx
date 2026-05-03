import React, { createContext, useContext, useMemo, useState } from 'react';
import type { MVItem } from '@/lib/types';

export type MvRouteState =
  | { status: 'idle'; id: null; mv: null; error: null }
  | { status: 'loading'; id: string; mv: null; error: null }
  | { status: 'success'; id: string; mv: MVItem; error: null }
  | { status: 'error'; id: string; mv: null; error: unknown };

type RouteDataContextValue = {
  mvRoute: MvRouteState;
  setMvRoute: (next: MvRouteState) => void;
};

const RouteDataContext = createContext<RouteDataContextValue | null>(null);

export function RouteDataProvider({ children }: { children: React.ReactNode }) {
  const [mvRoute, setMvRouteState] = useState<MvRouteState>({ status: 'idle', id: null, mv: null, error: null });

  const value = useMemo<RouteDataContextValue>(() => ({
    mvRoute,
    setMvRoute: setMvRouteState,
  }), [mvRoute]);

  return (
    <RouteDataContext.Provider value={value}>
      {children}
    </RouteDataContext.Provider>
  );
}

export function useRouteData() {
  const ctx = useContext(RouteDataContext);
  if (!ctx) throw new Error('useRouteData must be used within RouteDataProvider');
  return ctx;
}

