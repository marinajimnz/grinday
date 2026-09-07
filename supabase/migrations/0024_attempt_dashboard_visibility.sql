-- "Quitar del inicio" from the Preparaciones recientes list: the attempt
-- stays in the coffee's full history and in /attempts, it just stops being
-- picked up by the dashboard's recent-attempts query.
alter table public.brew_attempts
  add column hidden_from_dashboard boolean not null default false;
