-- supabase/migrations/20261111010000_add_payload_limits_and_constraints.sql
-- S3: Hardening de Banco de Dados — Limites de Payload JSONB e Constraints nas Tabelas RLS (#32)

-- 1. Constraints em public.user_settings:
-- Limita o tamanho do campo JSONB settings a 64 KB (65.536 bytes) para prevenir exaustão de storage.
alter table public.user_settings
  drop constraint if exists user_settings_payload_size,
  add constraint user_settings_payload_size check (pg_column_size(settings) <= 65536);

-- 2. Constraints em public.user_anime_lists:
-- Limita o tamanho do campo JSONB entries a 5 MB (5.242.880 bytes).
alter table public.user_anime_lists
  drop constraint if exists user_anime_lists_payload_size,
  add constraint user_anime_lists_payload_size check (pg_column_size(entries) <= 5242880);

-- Valida que o provedor é estritamente um dos suportados ('anilist', 'kitsu', 'mal', 'ensemble').
alter table public.user_anime_lists
  drop constraint if exists user_anime_lists_provider_check,
  add constraint user_anime_lists_provider_check check (provider in ('anilist', 'kitsu', 'mal', 'ensemble'));

-- Valida comprimento do username entre 1 e 60 caracteres.
alter table public.user_anime_lists
  drop constraint if exists user_anime_lists_username_length,
  add constraint user_anime_lists_username_length check (char_length(username) between 1 and 60);
