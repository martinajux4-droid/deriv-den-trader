
-- Roles enum + table
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null default 'user',
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users view own roles" on public.user_roles for select
  to authenticated using (user_id = auth.uid());

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  default_stake numeric not null default 1,
  default_symbol text not null default 'R_100',
  deriv_app_id text not null default '1089',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "Profiles select own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "Profiles insert own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "Profiles update own" on public.profiles for update to authenticated using (id = auth.uid());

-- Auto-create profile + default role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at helper
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Deriv accounts
create table public.deriv_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  loginid text not null,
  currency text,
  is_virtual boolean not null default true,
  token text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, loginid)
);
alter table public.deriv_accounts enable row level security;
create policy "Deriv select own" on public.deriv_accounts for select to authenticated using (user_id = auth.uid());
create policy "Deriv insert own" on public.deriv_accounts for insert to authenticated with check (user_id = auth.uid());
create policy "Deriv update own" on public.deriv_accounts for update to authenticated using (user_id = auth.uid());
create policy "Deriv delete own" on public.deriv_accounts for delete to authenticated using (user_id = auth.uid());

-- Strategies
create table public.strategies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  type text not null,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.strategies enable row level security;
create policy "Strat select own" on public.strategies for select to authenticated using (user_id = auth.uid());
create policy "Strat insert own" on public.strategies for insert to authenticated with check (user_id = auth.uid());
create policy "Strat update own" on public.strategies for update to authenticated using (user_id = auth.uid());
create policy "Strat delete own" on public.strategies for delete to authenticated using (user_id = auth.uid());
create trigger strategies_touch before update on public.strategies for each row execute function public.touch_updated_at();

-- Bot runs
create table public.bot_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  strategy_id uuid references public.strategies(id) on delete set null,
  status text not null default 'running',
  started_at timestamptz not null default now(),
  stopped_at timestamptz,
  pnl numeric not null default 0,
  trades_count integer not null default 0,
  notes text
);
alter table public.bot_runs enable row level security;
create policy "Bot select own" on public.bot_runs for select to authenticated using (user_id = auth.uid());
create policy "Bot insert own" on public.bot_runs for insert to authenticated with check (user_id = auth.uid());
create policy "Bot update own" on public.bot_runs for update to authenticated using (user_id = auth.uid());

-- Trades
create table public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  bot_run_id uuid references public.bot_runs(id) on delete set null,
  contract_id text,
  symbol text not null,
  contract_type text not null,
  stake numeric not null,
  payout numeric,
  profit numeric,
  entry_spot numeric,
  exit_spot numeric,
  duration integer,
  duration_unit text,
  status text not null default 'open',
  is_virtual boolean not null default true,
  loginid text,
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  raw jsonb
);
alter table public.trades enable row level security;
create policy "Trades select own" on public.trades for select to authenticated using (user_id = auth.uid());
create policy "Trades insert own" on public.trades for insert to authenticated with check (user_id = auth.uid());
create policy "Trades update own" on public.trades for update to authenticated using (user_id = auth.uid());

create index trades_user_opened_idx on public.trades(user_id, opened_at desc);
create index bot_runs_user_started_idx on public.bot_runs(user_id, started_at desc);
