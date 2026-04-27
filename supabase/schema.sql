-- PREDICT — Schema completo do banco de dados
-- Execute este SQL no Supabase SQL Editor

-- Extensões
create extension if not exists "uuid-ossp";

-- ==========================================
-- TABELA: profiles (complementa auth.users)
-- ==========================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  name text not null default '',
  avatar_url text,
  balance_brl numeric(12, 2) not null default 0.00,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Usuário vê próprio perfil" on public.profiles
  for select using (auth.uid() = id);

create policy "Usuário atualiza próprio perfil" on public.profiles
  for update using (auth.uid() = id);

create policy "Admin vê todos os perfis" on public.profiles
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- Trigger: cria perfil automaticamente ao registrar
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==========================================
-- TABELA: markets
-- ==========================================
create table public.markets (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null default '',
  category text not null default 'world',
  image_url text,
  yes_price numeric(5, 4) not null default 0.5,
  no_price numeric(5, 4) not null default 0.5,
  q_yes numeric(18, 6) not null default 0,
  q_no numeric(18, 6) not null default 0,
  liquidity_b numeric(10, 2) not null default 100.00,
  volume_brl numeric(14, 2) not null default 0.00,
  status text not null default 'open' check (status in ('open', 'closed', 'resolved')),
  outcome text check (outcome in ('yes', 'no')),
  closes_at timestamptz not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

alter table public.markets enable row level security;

create policy "Qualquer um vê mercados" on public.markets
  for select using (true);

create policy "Apenas admin cria mercados" on public.markets
  for insert with check (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

create policy "Apenas admin atualiza mercados" on public.markets
  for update using (
    exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
  );

-- ==========================================
-- TABELA: positions
-- ==========================================
create table public.positions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  market_id uuid not null references public.markets(id) on delete cascade,
  side text not null check (side in ('yes', 'no')),
  shares numeric(18, 6) not null default 0,
  avg_price numeric(5, 4) not null default 0,
  created_at timestamptz not null default now(),
  unique(user_id, market_id, side)
);

alter table public.positions enable row level security;

create policy "Usuário vê próprias posições" on public.positions
  for select using (auth.uid() = user_id);

create policy "Sistema insere/atualiza posições" on public.positions
  for all using (auth.uid() = user_id);

-- ==========================================
-- TABELA: orders
-- ==========================================
create table public.orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  market_id uuid not null references public.markets(id) on delete cascade,
  side text not null check (side in ('yes', 'no')),
  type text not null check (type in ('buy', 'sell')),
  shares numeric(18, 6) not null,
  price numeric(5, 4) not null,
  total_brl numeric(12, 2) not null,
  fee_brl numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "Usuário vê próprias ordens" on public.orders
  for select using (auth.uid() = user_id);

-- ==========================================
-- TABELA: transactions
-- ==========================================
create table public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('deposit', 'withdraw', 'buy', 'sell', 'payout')),
  amount_brl numeric(12, 2) not null,
  market_id uuid references public.markets(id),
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  external_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

create policy "Usuário vê próprias transações" on public.transactions
  for select using (auth.uid() = user_id);

-- ==========================================
-- TABELA: price_history
-- ==========================================
create table public.price_history (
  id uuid primary key default uuid_generate_v4(),
  market_id uuid not null references public.markets(id) on delete cascade,
  yes_price numeric(5, 4) not null,
  volume_brl numeric(14, 2) not null default 0,
  timestamp timestamptz not null default now()
);

alter table public.price_history enable row level security;

create policy "Qualquer um vê histórico de preços" on public.price_history
  for select using (true);

-- ==========================================
-- ÍNDICES para performance
-- ==========================================
create index idx_markets_status on public.markets(status);
create index idx_markets_category on public.markets(category);
create index idx_markets_closes_at on public.markets(closes_at);
create index idx_positions_user on public.positions(user_id);
create index idx_positions_market on public.positions(market_id);
create index idx_orders_user on public.orders(user_id);
create index idx_orders_market on public.orders(market_id);
create index idx_transactions_user on public.transactions(user_id);
create index idx_price_history_market on public.price_history(market_id, timestamp desc);

-- ==========================================
-- FUNÇÃO: executar aposta (transação atômica)
-- ==========================================
create or replace function public.execute_bet(
  p_user_id uuid,
  p_market_id uuid,
  p_side text,
  p_shares numeric,
  p_cost numeric,
  p_new_q_yes numeric,
  p_new_q_no numeric,
  p_new_yes_price numeric,
  p_new_no_price numeric
) returns void as $$
declare
  v_balance numeric;
begin
  -- Verifica saldo
  select balance_brl into v_balance from public.profiles where id = p_user_id for update;
  if v_balance < p_cost then
    raise exception 'Saldo insuficiente';
  end if;

  -- Debita saldo
  update public.profiles set balance_brl = balance_brl - p_cost where id = p_user_id;

  -- Atualiza mercado
  update public.markets set
    q_yes = p_new_q_yes,
    q_no = p_new_q_no,
    yes_price = p_new_yes_price,
    no_price = p_new_no_price,
    volume_brl = volume_brl + p_cost
  where id = p_market_id;

  -- Insere/atualiza posição
  insert into public.positions (user_id, market_id, side, shares, avg_price)
  values (p_user_id, p_market_id, p_side, p_shares, p_cost / p_shares)
  on conflict (user_id, market_id, side) do update set
    shares = positions.shares + excluded.shares,
    avg_price = (positions.shares * positions.avg_price + excluded.shares * excluded.avg_price)
                / (positions.shares + excluded.shares);

  -- Registra ordem
  insert into public.orders (user_id, market_id, side, type, shares, price, total_brl)
  values (p_user_id, p_market_id, p_side, 'buy', p_shares,
    case when p_side = 'yes' then p_new_yes_price else p_new_no_price end, p_cost);

  -- Registra transação
  insert into public.transactions (user_id, type, amount_brl, market_id, status)
  values (p_user_id, 'buy', p_cost, p_market_id, 'completed');

  -- Registra histórico de preço
  insert into public.price_history (market_id, yes_price, volume_brl)
  values (p_market_id, p_new_yes_price, p_cost);
end;
$$ language plpgsql security definer;

-- ==========================================
-- FUNÇÃO: resolver mercado e pagar vencedores
-- ==========================================
create or replace function public.resolve_market(
  p_market_id uuid,
  p_outcome text
) returns void as $$
declare
  v_position record;
  v_profit numeric;
  v_fee numeric;
  v_payout numeric;
begin
  -- Marca mercado como resolvido
  update public.markets set
    status = 'resolved',
    outcome = p_outcome
  where id = p_market_id;

  -- Paga vencedores
  for v_position in
    select * from public.positions
    where market_id = p_market_id and side = p_outcome and shares > 0
  loop
    v_profit := v_position.shares - (v_position.shares * v_position.avg_price);
    v_fee := greatest(0, v_profit * 0.05);
    v_payout := v_position.shares - v_fee;

    -- Credita payout
    update public.profiles set balance_brl = balance_brl + v_payout
    where id = v_position.user_id;

    -- Registra transação de payout
    insert into public.transactions (user_id, type, amount_brl, market_id, status)
    values (v_position.user_id, 'payout', v_payout, p_market_id, 'completed');
  end loop;
end;
$$ language plpgsql security definer;

-- ==========================================
-- DADOS INICIAIS: mercados de exemplo
-- ==========================================
-- (Execute após criar seu usuário admin e atualizar o UUID abaixo)
-- update public.profiles set is_admin = true where email = 'seu@email.com';
