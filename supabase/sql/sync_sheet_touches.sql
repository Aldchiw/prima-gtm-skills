-- ============================================================
-- Automatizacion Sheet "SDR Feedback" -> cockpit (Supabase)
-- Fuente de verdad del codigo. Desplegado 2026-09-22.
-- ============================================================

-- Tablas de apoyo (RLS on, sin politicas = solo admin/SQL editor)
create table if not exists sheet_import_staging (
  correo         text primary key,
  new_last_touch timestamptz
);
alter table sheet_import_staging enable row level security;

create table if not exists import_audit_log (
  id         bigint generated always as identity primary key,
  run_at     timestamptz default now(),
  source     text,
  contact_id uuid,
  correo     text,
  field      text,
  old_value  text,
  new_value  text
);
alter table import_audit_log enable row level security;

-- Nucleo idempotente: forward-only, solo cuentas de Aldahir, solo stage + last_touch_at
create or replace function sync_sheet_touches(p_rows jsonb, p_max_changes int default 50)
returns table(run_id uuid, stage_changes int, date_changes int)
language plpgsql
as $$
declare
  v_run   uuid := gen_random_uuid();
  v_owner uuid;
  v_stage int;
  v_date  int;
begin
  select id into v_owner from users where full_name = 'Aldahir Chiw';

  create temp table _sheet (correo text, new_last_touch timestamptz) on commit drop;
  insert into _sheet (correo, new_last_touch)
  select lower(x.correo), x.fecha::timestamptz
  from jsonb_to_recordset(p_rows) as x(correo text, fecha text);

  select
    count(*) filter (where 'First Touch (Email)'::stage_enum > c.stage),
    count(*) filter (where 'First Touch (Email)'::stage_enum > c.stage
                        or (c.stage = 'First Touch (Email)'
                            and s.new_last_touch > coalesce(c.last_touch_at,'epoch'::timestamptz)))
  into v_stage, v_date
  from contacts c
  join accounts a on a.id = c.account_id
  join _sheet   s on lower(c.contact_email) = s.correo
  where a.assigned_user_id = v_owner;

  if v_date > p_max_changes then
    raise exception 'Circuit-breaker: % cambios superan el limite %', v_date, p_max_changes;
  end if;

  insert into import_audit_log(run_at, source, contact_id, correo, field, old_value, new_value)
  select now(), 'sheet-sync:'||v_run, c.id, c.contact_email, 'stage', c.stage::text, 'First Touch (Email)'
  from contacts c join accounts a on a.id=c.account_id join _sheet s on lower(c.contact_email)=s.correo
  where a.assigned_user_id=v_owner and 'First Touch (Email)'::stage_enum > c.stage;

  insert into import_audit_log(run_at, source, contact_id, correo, field, old_value, new_value)
  select now(), 'sheet-sync:'||v_run, c.id, c.contact_email, 'last_touch_at', c.last_touch_at::text, s.new_last_touch::text
  from contacts c join accounts a on a.id=c.account_id join _sheet s on lower(c.contact_email)=s.correo
  where a.assigned_user_id=v_owner
    and ('First Touch (Email)'::stage_enum > c.stage
         or (c.stage='First Touch (Email)' and s.new_last_touch > coalesce(c.last_touch_at,'epoch'::timestamptz)));

  update contacts c
  set stage='First Touch (Email)', last_touch_at=s.new_last_touch, updated_at=now()
  from accounts a, _sheet s
  where c.account_id=a.id and lower(c.contact_email)=s.correo
    and a.assigned_user_id=v_owner and 'First Touch (Email)'::stage_enum > c.stage;

  update contacts c
  set last_touch_at=s.new_last_touch, updated_at=now()
  from accounts a, _sheet s
  where c.account_id=a.id and lower(c.contact_email)=s.correo
    and a.assigned_user_id=v_owner and c.stage='First Touch (Email)'
    and s.new_last_touch > coalesce(c.last_touch_at,'epoch'::timestamptz);

  return query select v_run, v_stage, v_date;
end;
$$;

-- Cron horario (dispara la Edge Function sync-sdr-sheet con la anon key)
create extension if not exists pg_cron;
create extension if not exists pg_net;
-- select cron.schedule('sync-sdr-sheet-hourly','0 * * * *', $CRON$
--   select net.http_post(
--     url := 'https://axknjzbiteuwrjpbuows.supabase.co/functions/v1/sync-sdr-sheet',
--     headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer <ANON_KEY>'),
--     body := '{}'::jsonb);
-- $CRON$);
-- Pausar: select cron.unschedule('sync-sdr-sheet-hourly');
