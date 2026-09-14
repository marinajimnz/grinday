-- Fase 12: trazabilidad de qué intento ajeno se usó como base al clonar
-- una receta ("Probar esta receta"). on delete set null — si el intento
-- original se borra, el clon se queda sin atribución en vez de perderse.
alter table public.brew_attempts
  add column cloned_from_attempt_id uuid references public.brew_attempts (id) on delete set null;
