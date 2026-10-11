create extension if not exists pgcrypto;

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_name text not null,
  bank_name text not null,
  account_number text not null default '',
  currency char(3) not null default 'IDR',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint bank_accounts_currency_format check (currency ~ '^[A-Z]{3}$')
);

create table if not exists public.bank_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid not null references public.bank_accounts(id) on delete restrict,
  transaction_date date not null,
  description text not null,
  reference text not null default '',
  direction text not null check (direction in ('debit', 'credit')),
  amount numeric(18, 2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.bank_statement_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  account_id uuid not null references public.bank_accounts(id) on delete restrict,
  transaction_date date not null,
  description text not null,
  reference text not null default '',
  direction text not null check (direction in ('debit', 'credit')),
  amount numeric(18, 2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.reconciliation_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  transaction_id uuid not null unique references public.bank_transactions(id) on delete cascade,
  statement_line_id uuid not null unique references public.bank_statement_lines(id) on delete cascade,
  matched_at timestamptz not null default now()
);

alter table public.bank_accounts add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.bank_transactions add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.bank_statement_lines add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;
alter table public.reconciliation_matches add column if not exists user_id uuid default auth.uid() references auth.users(id) on delete cascade;

create index if not exists bank_accounts_user_created_idx on public.bank_accounts (user_id, created_at desc);
create index if not exists bank_transactions_user_account_date_idx on public.bank_transactions (user_id, account_id, transaction_date desc);
create index if not exists bank_statement_lines_user_account_date_idx on public.bank_statement_lines (user_id, account_id, transaction_date desc);
create index if not exists reconciliation_matches_user_matched_idx on public.reconciliation_matches (user_id, matched_at desc);

alter table public.bank_accounts enable row level security;
alter table public.bank_transactions enable row level security;
alter table public.bank_statement_lines enable row level security;
alter table public.reconciliation_matches enable row level security;

revoke all on public.bank_accounts, public.bank_transactions, public.bank_statement_lines, public.reconciliation_matches from anon;
grant select, insert, delete on public.bank_accounts, public.bank_transactions, public.bank_statement_lines, public.reconciliation_matches to authenticated;

drop policy if exists "Users manage their own bank accounts" on public.bank_accounts;
create policy "Users manage their own bank accounts" on public.bank_accounts
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own bank transactions" on public.bank_transactions;
create policy "Users manage their own bank transactions" on public.bank_transactions
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own statement lines" on public.bank_statement_lines;
create policy "Users manage their own statement lines" on public.bank_statement_lines
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "Users manage their own reconciliation matches" on public.reconciliation_matches;
create policy "Users manage their own reconciliation matches" on public.reconciliation_matches
  for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.validate_transaction_account_owner()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  account_owner_id uuid;
begin
  select user_id into account_owner_id from public.bank_accounts where id = new.account_id;
  if account_owner_id is distinct from new.user_id then
    raise exception 'Rekening tidak ditemukan pada akun pengguna ini.';
  end if;
  return new;
end;
$$;

drop trigger if exists bank_transaction_account_owner on public.bank_transactions;
create trigger bank_transaction_account_owner
  before insert or update on public.bank_transactions
  for each row execute function public.validate_transaction_account_owner();

drop trigger if exists bank_statement_account_owner on public.bank_statement_lines;
create trigger bank_statement_account_owner
  before insert or update on public.bank_statement_lines
  for each row execute function public.validate_transaction_account_owner();

create or replace function public.validate_reconciliation_match()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  book_record public.bank_transactions%rowtype;
  bank_record public.bank_statement_lines%rowtype;
begin
  select * into book_record from public.bank_transactions where id = new.transaction_id;
  select * into bank_record from public.bank_statement_lines where id = new.statement_line_id;

  if book_record.id is null or bank_record.id is null
    or book_record.user_id is distinct from new.user_id
    or bank_record.user_id is distinct from new.user_id
    or book_record.account_id is distinct from bank_record.account_id
    or book_record.direction is distinct from bank_record.direction
    or book_record.amount is distinct from bank_record.amount then
    raise exception 'Pasangan harus milik pengguna dan rekening yang sama dengan nominal dan arah identik.';
  end if;

  return new;
end;
$$;

drop trigger if exists reconciliation_match_validation on public.reconciliation_matches;
create trigger reconciliation_match_validation
  before insert or update on public.reconciliation_matches
  for each row execute function public.validate_reconciliation_match();