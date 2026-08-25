-- ============================================================
-- Prima Cockpit App - Supabase schema
-- Backend de la app editable del cockpit de outreach.
-- Refleja el estado del backend al 2026-08-24 (Fase 1 + Fase 2 backend).
-- Corre de arriba a abajo en una DB vacia y reproduce el esquema desde cero.
--
-- OJO: este archivo lleva la ESTRUCTURA, no los datos.
-- El roster (4 users), las 160 cuentas y los 275 contactos viven en
-- Supabase (migrados desde leads_master.csv / el Google Sheet en vivo),
-- no en el repo.
-- ============================================================

-- ------------------------------------------------------------
-- Lista fija de valores para el paso de la secuencia (stage).
-- El orden define el orden del menu desplegable en Supabase.
-- Primer contacto libre (Email o LinkedIn); FUP 1..10 canal-libre.
-- Nota: mandar mas alla de la cadencia oficial (E1 -> LI -> E2 -> E3
-- + cooldown) cae en Choque A, pendiente de sign-off de Gaby.
-- El tracking puede estar listo para 10; el envio real no.
-- ------------------------------------------------------------
create type stage_enum as enum (
  'Not Contacted',
  'First Touch (Email)',
  'First Touch (LinkedIn)',
  'FUP 1',
  'FUP 2',
  'FUP 3',
  'FUP 4',
  'FUP 5',
  'FUP 6',
  'FUP 7',
  'FUP 8',
  'FUP 9',
  'FUP 10',
  'Replied'
);

-- ------------------------------------------------------------
-- accounts - 1 fila por cuenta.
-- ------------------------------------------------------------
create table accounts (
  id uuid primary key default gen_random_uuid(),
  account_name text not null,
  domain text,
  company_category text,                 -- Cat1..Cat4
  sub_segment text,                      -- 4A..4D
  priority text,                         -- P1..P3
  vertical_owner text,
  excluded boolean default false,
  exclusion_reason text,
  scope_tier text,
  needs_manual_scope_confirmation boolean default false,
  signal_source text,
  signal_detail text,
  signal_url text,
  signal_date text,                      -- text: el Sheet trae fechas parciales ("2026-03", "2026")
  assigned_user_id uuid,                 -- dueno de la cuenta (regla de asignacion)
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table accounts enable row level security;

-- ------------------------------------------------------------
-- contacts - 1 fila por contacto, ligado a una cuenta.
-- ------------------------------------------------------------
create table contacts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references accounts(id) on delete cascade,
  contact_name text,
  contact_title text,
  priority_tier text,
  linkedin_url text,
  contact_email text,
  email_status text,
  stage stage_enum default 'Not Contacted',   -- paso de la secuencia (menu desplegable)
  contact_count int,
  source_files text,
  team_status text,                      -- columna del equipo (pursue/hold/dead/blank)
  notes text,                            -- notas libres del equipo
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table contacts enable row level security;

-- ------------------------------------------------------------
-- users - roster del equipo.
-- ------------------------------------------------------------
create table users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text unique,
  role text
);
alter table users enable row level security;

-- ============================================================
-- RLS - politicas de SOLO LECTURA (Fase 2).
-- La identidad se cruza por CORREO (auth.jwt email = users.email),
-- NO por id: Magic Link genera un id propio que no coincide con el
-- id insertado a mano en users. Las politicas de ESCRITURA llegan
-- en la fase de edicion (Fase 3).
-- ============================================================

create policy "team can read roster"
on users for select to authenticated
using (true);

create policy "see own assigned accounts"
on accounts for select to authenticated
using (
  assigned_user_id = (
    select id from users where email = (select auth.jwt() ->> 'email')
  )
);

create policy "see contacts of own accounts"
on contacts for select to authenticated
using (
  account_id in (
    select id from accounts
    where assigned_user_id = (
      select id from users where email = (select auth.jwt() ->> 'email')
    )
  )
);
