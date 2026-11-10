-- Mapa de cruzamentos: clientes × eventos
-- Copie tudo, cole no SQL Editor do Supabase e clique em Run.
-- Pode rodar de novo sem problema: nada é apagado. Se você rodou uma versão anterior, rode esta também.
-- Cada lista fica gravada com quem subiu (o próprio banco anota o usuário que fez login).

-- 1) Tabela com cada contato de uma empresa num evento
create table if not exists public.cruz_interacoes (
  id bigint generated always as identity primary key,
  evento text not null,
  data_evento date not null,
  empresa text not null,
  setor text not null default 'Sem setor',
  nome text,
  cargo text,
  interacao text not null default 'Participou do evento',
  observacoes text,
  lote uuid not null,
  arquivo text,
  enviado_por text,
  enviado_por_nome text,
  enviado_por_id uuid default auth.uid(),
  criado_em timestamptz not null default now()
);
-- Para quem já tinha rodado a versão anterior: acrescenta quem subiu cada lista
alter table public.cruz_interacoes add column if not exists enviado_por_nome text;
alter table public.cruz_interacoes add column if not exists enviado_por_id uuid default auth.uid();
create index if not exists cruz_interacoes_empresa_idx on public.cruz_interacoes (empresa);
create index if not exists cruz_interacoes_lote_idx on public.cruz_interacoes (lote);
create index if not exists cruz_interacoes_enviado_por_idx on public.cruz_interacoes (enviado_por_id);

-- 2) Nomes diferentes da mesma empresa (ex.: "Itaú" passa a ser "Itaú Unibanco")
create table if not exists public.cruz_apelidos (
  apelido text primary key,
  empresa text not null,
  criado_em timestamptz not null default now()
);

-- 3) Só quem fez login no site vê e mexe nos dados
alter table public.cruz_interacoes enable row level security;
alter table public.cruz_apelidos enable row level security;

grant usage on schema public to authenticated;
revoke all on public.cruz_interacoes from anon;
revoke all on public.cruz_apelidos from anon;
grant select, insert, update, delete on public.cruz_interacoes to authenticated;
grant select, insert, update, delete on public.cruz_apelidos to authenticated;
grant usage, select on sequence public.cruz_interacoes_id_seq to authenticated;

drop policy if exists "cruz_interacoes_ler" on public.cruz_interacoes;
create policy "cruz_interacoes_ler" on public.cruz_interacoes for select to authenticated using (true);
drop policy if exists "cruz_interacoes_incluir" on public.cruz_interacoes;
create policy "cruz_interacoes_incluir" on public.cruz_interacoes for insert to authenticated with check (enviado_por_id = auth.uid());
drop policy if exists "cruz_interacoes_alterar" on public.cruz_interacoes;
create policy "cruz_interacoes_alterar" on public.cruz_interacoes for update to authenticated using (true) with check (true);
drop policy if exists "cruz_interacoes_apagar" on public.cruz_interacoes;
create policy "cruz_interacoes_apagar" on public.cruz_interacoes for delete to authenticated using (true);

drop policy if exists "cruz_apelidos_ler" on public.cruz_apelidos;
create policy "cruz_apelidos_ler" on public.cruz_apelidos for select to authenticated using (true);
drop policy if exists "cruz_apelidos_incluir" on public.cruz_apelidos;
create policy "cruz_apelidos_incluir" on public.cruz_apelidos for insert to authenticated with check (true);
drop policy if exists "cruz_apelidos_alterar" on public.cruz_apelidos;
create policy "cruz_apelidos_alterar" on public.cruz_apelidos for update to authenticated using (true) with check (true);
drop policy if exists "cruz_apelidos_apagar" on public.cruz_apelidos;
create policy "cruz_apelidos_apagar" on public.cruz_apelidos for delete to authenticated using (true);

-- 4) Tempo real: avisa todos os sites abertos quando alguém sobe, muda ou apaga uma lista
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cruz_interacoes') then
    alter publication supabase_realtime add table public.cruz_interacoes;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'cruz_apelidos') then
    alter publication supabase_realtime add table public.cruz_apelidos;
  end if;
end $$;
