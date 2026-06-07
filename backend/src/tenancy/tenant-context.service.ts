import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface TenantContext {
  scope?: 'school' | 'superadmin';
  role?: string;
  schoolId?: string;
  hostname?: string;
  portalSlug?: string;
  resolvedBy?: 'customDomain' | 'subdomain' | 'slug' | 'tokenSchool' | 'default';
  school?: Record<string, any>;
  settings?: Record<string, any>;
  branding?: Record<string, any>;
  userId?: string;
}

@Injectable()
export class TenantContextService {
  private readonly storage = new AsyncLocalStorage<TenantContext>();

  run(context: TenantContext, callback: () => void) {
    return this.storage.run(context, callback);
  }

  get(): TenantContext {
    return this.storage.getStore() ?? {};
  }
}
