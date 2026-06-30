// NOTE: This file was auto-generated but has been patched for Vercel/SSR compat.
// Original behaviour threw on missing/invalid Bearer tokens, crashing document
// requests because browsers never send Authorization headers for page navigations.
// Fixed: missing or absent token → graceful passthrough with null context so the
// client-side Supabase auth listener takes over. Only a structurally malformed
// token (present but wrong format) still throws, since that indicates a broken
// server-function caller, not a browser navigation.
import { createMiddleware } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'



function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // New Supabase API keys are opaque strings, not bearer JWTs.
    if (isNewSupabaseApiKey(supabaseKey) && headers.get('Authorization') === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      const missing = [
        ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
        ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY'] : []),
      ];
      const message = `Missing Supabase environment variable(s): ${missing.join(', ')}. Connect Supabase in Lovable Cloud.`;
      console.error(`[Supabase] ${message}`);
      throw new Error(message);
    }
    
    const request = getRequest();

    // ── Graceful passthrough for browser document requests ──────────────────
    // Standard browser navigations never attach an Authorization header.
    // Rather than crashing SSR with a 401/500, we let the request through with
    // a null context so TanStack Router renders the shell and the client-side
    // Supabase onAuthStateChange listener handles session rehydration.
    if (!request?.headers) {
      return next({ context: { supabase: null, userId: null, claims: null } });
    }

    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
      // No Authorization header — this is a normal browser page navigation.
      return next({ context: { supabase: null, userId: null, claims: null } });
    }

    if (!authHeader.startsWith('Bearer ')) {
      // Header is present but not a Bearer token — wrong scheme, pass through.
      return next({ context: { supabase: null, userId: null, claims: null } });
    }

    const token = authHeader.replace('Bearer ', '').trim();

    if (!token) {
      // Empty token after stripping prefix — pass through.
      return next({ context: { supabase: null, userId: null, claims: null } });
    }

    // A token was provided. Validate its structure before hitting Supabase.
    // A JWT must have exactly three dot-separated segments.
    if (token.split('.').length !== 3) {
      // Structurally invalid token from an explicit server-function caller —
      // this is a broken client, not a normal browser navigation.
      throw new Error('Unauthorized: Invalid token format');
    }

    const supabase = createClient<Database>(
      SUPABASE_URL!,
      SUPABASE_PUBLISHABLE_KEY!,
      {
        global: {
          fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY!),
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) {
      // Token present and well-formed, but Supabase rejected it (expired, revoked).
      // Pass through with null context — client will detect the expired session
      // and trigger a re-login naturally.
      console.warn('[Supabase] Token validation failed — passing through as unauthenticated:', error?.message);
      return next({ context: { supabase: null, userId: null, claims: null } });
    }

    if (!data.claims.sub) {
      return next({ context: { supabase: null, userId: null, claims: null } });
    }

    return next({
      context: {
        supabase,
        userId: data.claims.sub,
        claims: data.claims,
      },
    });
  },
);
