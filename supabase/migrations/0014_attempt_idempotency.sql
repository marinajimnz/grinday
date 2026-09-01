-- Fase 7: "al volver la red, el intento sincroniza una sola vez". The brew
-- draft (features/brew/draft.ts) already survives offline entirely in
-- localStorage; this is the other half — a client-generated key so that a
-- retried save (manual click, auto-retry-on-reconnect, or both racing) can
-- never insert the same attempt twice, no server-side dedup logic needed.

alter table public.brew_attempts
  add column idempotency_key uuid;

create unique index brew_attempts_idempotency_key_idx
  on public.brew_attempts (user_id, idempotency_key)
  where idempotency_key is not null;
