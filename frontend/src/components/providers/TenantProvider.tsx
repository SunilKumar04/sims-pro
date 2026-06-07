'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { createFallbackTenant, loadTenantBootstrap, readCachedTenant, TenantBootstrap, writeCachedTenant } from '@/lib/tenant';

const TenantContext = createContext<TenantBootstrap>(createFallbackTenant());

export function TenantProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [tenant, setTenant] = useState<TenantBootstrap>(() => readCachedTenant() ?? createFallbackTenant());
  const [ready, setReady] = useState<boolean>(() => !!readCachedTenant());

  useEffect(() => {
    let mounted = true;

    setReady(false);

    loadTenantBootstrap().then((boot) => {
      if (!mounted) return;
      setTenant(boot);
      setReady(true);

      const root = document.documentElement;
      root.style.setProperty('--school-primary', boot.branding.primaryColor);
      root.style.setProperty('--school-secondary', boot.branding.secondaryColor);
      root.style.setProperty('--school-accent', boot.branding.accentColor);
      root.style.setProperty('--school-background', boot.branding.backgroundColor);
      root.style.setProperty('--school-text', boot.branding.textColor);
      document.title = boot.school?.name ? `${boot.school.name} | SIMS Pro` : 'SIMS Pro – School Information Management System';

      writeCachedTenant(boot);
    });

    return () => {
      mounted = false;
    };
  }, [pathname]);

  const value = useMemo(() => tenant, [tenant]);

  if (!ready) {
    return (
      <TenantContext.Provider value={value}>
        {children}
      </TenantContext.Provider>
    );
  }

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export const useTenant = () => useContext(TenantContext);

export const useTenantBranding = () => useTenant().branding;

export const useTenantSchool = () => useTenant().school;
