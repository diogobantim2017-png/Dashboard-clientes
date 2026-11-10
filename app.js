/*
 * Mapa de cruzamentos: clientes × eventos
 * Lê e grava no Supabase e se atualiza sozinho quando alguém sobe uma lista.
 * Sem o config.js preenchido, abre uma demonstração com dados fictícios (nada é salvo).
 */
(() => {
  'use strict';

  const R = window.Regras;
  const V = window.Visual;
  const cfg = window.CRUZ_CONFIG || {};
  const TABELA = 'cruz_interacoes';
  const TABELA_APELIDOS = 'cruz_apelidos';
  const COLUNAS = 'id,evento,data_evento,empresa,setor,nome,cargo,interacao,observacoes,lote,arquivo,enviado_por,criado_em';
  const ARQUIVO_EXEMPLO = 'Dados de exemplo (fictícios)';

  // Sugestões de eventos (o site também usa os que já estão no banco).
  const EVENTOS_SUGERIDOS = [
    ['FEBRABAN Tech 2026', '2026-08-24'], ['CONAREC 2026', '2026-09-23'], ['Arcos', '2026-10-26'], ['BBDW 2026', '2026-10-27'],
    ['Innovation Day (Databricks)', '2026-11-04'], ['Almoço CQCS', '2026-11-04'], ["Rec'n'Play 2026", '2026-11-11'],
    ['Insurance Day', '2026-11-25'], ['NRF 2027', '2027-01-10'], ['MS AI Tour SP 2027', '2027-03-24'],
    ['SAP Now 2026', ''], ['ServiceNow Summit 2026', ''],
  ];

  // Cor de cada setor (as etiquetas e os filtros usam).
  const CORES_SETOR = {
    Bancos: '#0070AD', Seguros: '#6A4C93', Varejo: '#C2185B', Telecom: '#00838F', 'Saúde': '#2E7D32', Energia: '#A66300',
    'Indústria': '#546E7A', Governo: '#795548', Tecnologia: '#1565C0', 'Serviços': '#00897B', Outro: '#607D8B', 'Sem setor': '#8A94A6',
  };
  const PALETA = ['#0070AD', '#6A4C93', '#C2185B', '#00838F', '#2E7D32', '#A66300', '#546E7A', '#795548'];
  const corDoSetor = (setor) => {
    if (CORES_SETOR[setor]) return CORES_SETOR[setor];
    let h = 0;
    for (const c of String(setor)) h = (h * 31 + c.charCodeAt(0)) % 997;
    return PALETA[h % PALETA.length];
  };

  // Dados fictícios para ver o mapa funcionando.
  const EXEMPLO = [
    ["FEBRABAN Tech 2026", "2026-08-24", "Banco Aurora", "Bancos", "Patrícia Lopes", "Diretora de Tecnologia", "Sala VIP"],
    ["FEBRABAN Tech 2026", "2026-08-24", "Banco Aurora", "Bancos", "Rafael Teixeira", "Head de Dados", "Reunião agendada"],
    ["FEBRABAN Tech 2026", "2026-08-24", "Banco Aurora", "Bancos", "Camila Duarte", "Gerente de CX", "Visita ao estande"],
    ["CONAREC 2026", "2026-09-23", "Banco Aurora", "Bancos", "Camila Duarte", "Gerente de CX", "Palestra ou painel"],
    ["BBDW 2026", "2026-10-27", "Banco Aurora", "Bancos", "Rafael Teixeira", "Head de Dados", "Palestra ou painel"],
    ["BBDW 2026", "2026-10-27", "Banco Aurora", "Bancos", "Henrique Sales", "Arquiteto de Soluções", "Visita ao estande"],
    ["Innovation Day (Databricks)", "2026-11-04", "Banco Aurora", "Bancos", "Patrícia Lopes", "Diretora de Tecnologia", "Convidado"],
    ["Innovation Day (Databricks)", "2026-11-04", "Banco Aurora", "Bancos", "Rafael Teixeira", "Head de Dados", "Convidado"],
    ["FEBRABAN Tech 2026", "2026-08-24", "Banco Meridiano", "Bancos", "Paulo Nogueira", "CIO", "Sala VIP"],
    ["FEBRABAN Tech 2026", "2026-08-24", "Banco Meridiano", "Bancos", "Fernanda Rocha", "Gerente de Inovação", "Visita ao estande"],
    ["Innovation Day (Databricks)", "2026-11-04", "Banco Meridiano", "Bancos", "Paulo Nogueira", "CIO", "Convidado"],
    ["FEBRABAN Tech 2026", "2026-08-24", "Cooperativa Raiz", "Bancos", "Tiago Moura", "Coordenador de TI", "Visita ao estande"],
    ["BBDW 2026", "2026-10-27", "Cooperativa Raiz", "Bancos", "Tiago Moura", "Coordenador de TI", "Reunião agendada"],
    ["BBDW 2026", "2026-10-27", "Cooperativa Raiz", "Bancos", "Luana Prado", "Analista de Dados", "Palestra ou painel"],
    ["FEBRABAN Tech 2026", "2026-08-24", "Fintech Prisma", "Bancos", "Gustavo Lima", "CTO", "Reunião agendada"],
    ["CONAREC 2026", "2026-09-23", "Seguradora Horizonte", "Seguros", "Beatriz Campos", "Superintendente de Atendimento", "Palestra ou painel"],
    ["Innovation Day (Databricks)", "2026-11-04", "Seguradora Horizonte", "Seguros", "Otávio Alves", "Diretor de Dados", "Convidado"],
    ["Almoço CQCS", "2026-11-04", "Seguradora Horizonte", "Seguros", "Beatriz Campos", "Superintendente de Atendimento", "Convidado"],
    ["Almoço CQCS", "2026-11-04", "Seguradora Horizonte", "Seguros", "Otávio Alves", "Diretor de Dados", "Convidado"],
    ["FEBRABAN Tech 2026", "2026-08-24", "Seguradora Vértice", "Seguros", "Helena Barros", "Gerente de TI", "Visita ao estande"],
    ["Almoço CQCS", "2026-11-04", "Seguradora Vértice", "Seguros", "Helena Barros", "Gerente de TI", "Convidado"],
    ["Almoço CQCS", "2026-11-04", "Seguradora Vértice", "Seguros", "Sérgio Mendes", "Diretor Comercial", "Convidado"],
    ["Almoço CQCS", "2026-11-04", "Previdência Atlas", "Seguros", "Juliana Ferraz", "CEO", "Convidado"],
    ["CONAREC 2026", "2026-09-23", "Lojas Cardeal", "Varejo", "Daniel Prates", "Head de CX", "Reunião agendada"],
    ["CONAREC 2026", "2026-09-23", "Lojas Cardeal", "Varejo", "Vanessa Rios", "Gerente de E-commerce", "Palestra ou painel"],
    ["Innovation Day (Databricks)", "2026-11-04", "Lojas Cardeal", "Varejo", "Daniel Prates", "Head de CX", "Convidado"],
    ["CONAREC 2026", "2026-09-23", "Varejo Nova Era", "Varejo", "Cláudio Reis", "Diretor de Operações", "Visita ao estande"],
    ["CONAREC 2026", "2026-09-23", "Telco Órbita", "Telecom", "Natália Freitas", "Head de Experiência do Cliente", "Palestra ou painel"],
    ["BBDW 2026", "2026-10-27", "Telco Órbita", "Telecom", "Natália Freitas", "Head de Experiência do Cliente", "Reunião agendada"],
    ["BBDW 2026", "2026-10-27", "Telco Órbita", "Telecom", "Igor Cardoso", "Gerente de Engenharia", "Visita ao estande"],
    ["CONAREC 2026", "2026-09-23", "Rede Vida Plena", "Saúde", "Simone Araújo", "Diretora de Relacionamento", "Visita ao estande"],
    ["Innovation Day (Databricks)", "2026-11-04", "Energia Solaris", "Energia", "Marcelo Viana", "Diretor de TI", "Convidado"],
  ];

  /* ---------- Utilidades ---------- */

  const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
  const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];
  const { el, fmtN, fmtData, plural, porNome } = V || {};
  const fmtQuando = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  const poucoMovimento = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const novoId = () => {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.floor(Math.random() * 16);
      return (c === 'x' ? r : (r % 4) + 8).toString(16);
    });
  };
  const preencheSelect = (sel, opcoes, valor) => {
    sel.replaceChildren(...opcoes.map(([v, t]) => new Option(t, v)));
    sel.value = opcoes.some(([v]) => v === valor) ? valor : (opcoes[0] ? opcoes[0][0] : '');
  };
  const abreJanela = (dlg) => { if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', ''); };
  const fechaJanela = (dlg) => { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); };

  let relogioAviso = 0;
  const avisa = (texto, tipo = 'ok') => {
    const a = $('#aviso');
    a.textContent = texto;
    a.dataset.tipo = tipo;
    a.hidden = false;
    clearTimeout(relogioAviso);
    relogioAviso = setTimeout(() => { a.hidden = true; }, tipo === 'erro' ? 10000 : 6000);
  };

  const traduzErro = (e) => {
    const m = String((e && (e.message || e.error_description || e.msg)) || e || '');
    if (/invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
    if (/email not confirmed/i.test(m)) return 'Este usuário ainda não foi confirmado no Supabase (marque “Auto Confirm User” ao criar).';
    if (/failed to fetch|networkerror|load failed|network request failed/i.test(m)) return 'Sem conexão com o Supabase. Verifique a internet e o endereço colado no config.js.';
    if (/does not exist|could not find the table|schema cache/i.test(m)) return 'As tabelas ainda não existem no Supabase. Rode o arquivo banco.sql no SQL Editor.';
    if (/row-level security|permission denied|not allowed|42501/i.test(m)) return 'Sem permissão. Saia, entre de novo e confira se o banco.sql foi rodado inteiro.';
    if (/invalid api key|no api key|apikey/i.test(m)) return 'A chave do config.js está errada. Copie de novo a chave publishable no Supabase.';
    if (/jwt|token/i.test(m)) return 'Sua sessão expirou. Saia e entre de novo.';
    return m || 'Erro desconhecido.';
  };

  /* ---------- Banco de demonstração (fica só no navegador) ---------- */

  function bancoLocal(linhasIniciais) {
    const banco = { [TABELA]: linhasIniciais, [TABELA_APELIDOS]: [] };
    let proximo = linhasIniciais.length + 1;
    const ouvintes = [];
    class Consulta {
      constructor(t) { this.t = t; this.op = 'select'; this.filtros = []; this.faixa = null; }
      select() { return this; }
      order() { return this; }
      range(a, b) { this.faixa = [a, b]; return this; }
      eq(c, v) { this.filtros.push((r) => r[c] === v); return this; }
      in(c, vs) { this.filtros.push((r) => vs.includes(r[c])); return this; }
      insert(d) { this.op = 'insert'; this.dados = [].concat(d); return this; }
      update(d) { this.op = 'update'; this.dados = d; return this; }
      delete() { this.op = 'delete'; return this; }
      upsert(d) { this.op = 'upsert'; this.dados = [].concat(d); return this; }
      executa() {
        const passa = (r) => this.filtros.every((f) => f(r));
        const tabela = banco[this.t];
        if (this.op === 'select') {
          const tudo = tabela.map((r) => ({ ...r }));
          return { data: this.faixa ? tudo.slice(this.faixa[0], this.faixa[1] + 1) : tudo, error: null };
        }
        if (this.op === 'insert') {
          for (const r of this.dados) tabela.push({ id: proximo++, criado_em: new Date().toISOString(), setor: R.SEM_SETOR, ...r });
        } else if (this.op === 'update') tabela.filter(passa).forEach((r) => Object.assign(r, this.dados));
        else if (this.op === 'delete') banco[this.t] = tabela.filter((r) => !passa(r));
        else if (this.op === 'upsert') {
          for (const r of this.dados) {
            const i = tabela.findIndex((x) => x.apelido === r.apelido);
            if (i >= 0) tabela[i] = { ...tabela[i], ...r }; else tabela.push(r);
          }
        }
        ouvintes.forEach((fn) => fn({ eventType: this.op.toUpperCase(), new: null }));
        return { data: null, error: null };
      }
      then(ok, falha) { return Promise.resolve().then(() => this.executa()).then(ok, falha); }
    }
    return {
      from: (t) => new Consulta(t),
      auth: { signOut: async () => ({ error: null }) },
      channel: () => {
        const canalFalso = {
          on: () => canalFalso,
          subscribe: (cb) => { setTimeout(() => cb('DEMO'), 0); return canalFalso; },
          track: async () => ({}),
          presenceState: () => ({}),
        };
        return canalFalso;
      },
      removeChannel: () => {},
    };
  }

  /* ---------- Estado ---------- */

  const estado = {
    demo: false,
    usuario: null,
    linhas: [],
    apelidos: [],
    calc: null,
    setor: 'Todos',
    evento: '',
    empresa: '',
    busca: '',
    aoVivo: 'conectando',
    online: 1,
  };
  let sb = null;
  let canal = null;

  const mostraTela = (nome) => { $$('.tela').forEach((t) => { t.hidden = t.id !== `tela-${nome}`; }); };

  /* ---------- Início, login e saída ---------- */

  function colocaIcones() {
    $$('[data-icone]').forEach((alvo) => {
      if (alvo.querySelector('svg')) return;
      alvo.prepend(V.icone(alvo.dataset.icone));
    });
  }

  async function iniciar() {
    if (!R || !V) { $('#erro-texto').textContent = 'Os arquivos regras.js e visual.js precisam estar na mesma pasta do site.'; mostraTela('erro'); return; }
    colocaIcones();
    ligaEventos();
    const logo = $('#logo');
    if (logo) {
      const mostraLogo = () => { if (logo.naturalWidth > 0) logo.hidden = false; };
      logo.addEventListener('load', mostraLogo);
      if (logo.complete) mostraLogo();
    }
    const url = String(cfg.supabaseUrl || '').trim().replace(/\/+$/, '');
    const chave = String(cfg.supabaseKey || '').trim();
    const configurado = /^https:\/\/[^/]+$/.test(url) && chave.length >= 20 && !/COLE_AQUI/.test(url + chave);
    if (!configurado) { iniciaDemo(); return; }
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      $('#erro-texto').textContent = 'O arquivo supabase.js precisa estar na mesma pasta do site. Confira se ele subiu para o GitHub e recarregue a página.';
      mostraTela('erro');
      return;
    }
    sb = window.supabase.createClient(url, chave);
    sb.auth.onAuthStateChange((evento) => { if (evento === 'SIGNED_OUT') setTimeout(saiu, 0); });
    try {
      const { data } = await sb.auth.getSession();
      if (data && data.session) await entrar(data.session.user);
      else mostraTela('login');
    } catch (e) {
      mostraTela('login');
    }
  }

  async function iniciaDemo() {
    estado.demo = true;
    const lote = novoId();
    const agora = new Date().toISOString();
    const linhas = EXEMPLO.map(([evento, dataEvento, empresa, setor, nome, cargo, interacao], i) => ({
      id: i + 1, evento, data_evento: dataEvento, empresa, setor, nome, cargo, interacao, observacoes: null,
      lote, arquivo: ARQUIVO_EXEMPLO, enviado_por: 'demonstração', criado_em: agora,
    }));
    sb = bancoLocal(linhas);
    $('#faixa-demo').hidden = false;
    $('#botao-sair').hidden = true;
    await entrar({ id: 'demo', email: '' });
  }

  async function entrar(usuario) {
    estado.usuario = usuario;
    $('#usuario-email').textContent = usuario.email || '';
    mostraTela('app');
    desenhaStatus();
    await recarregar();
    conectaTempoReal();
  }

  function saiu() {
    if (canal && sb) { sb.removeChannel(canal); canal = null; }
    estado.usuario = null;
    estado.linhas = [];
    estado.apelidos = [];
    estado.calc = null;
    mostraTela('login');
  }

  async function fazLogin(ev) {
    ev.preventDefault();
    const email = $('#login-email').value.trim();
    const senha = $('#login-senha').value;
    const erro = $('#login-erro');
    const botao = $('#botao-entrar');
    erro.hidden = true;
    if (!email || !senha) { erro.textContent = 'Preencha o e-mail e a senha.'; erro.hidden = false; return; }
    botao.disabled = true;
    botao.textContent = 'Entrando…';
    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;
      $('#login-senha').value = '';
      await entrar(data.user);
    } catch (e) {
      erro.textContent = traduzErro(e);
      erro.hidden = false;
    } finally {
      botao.disabled = false;
      botao.textContent = 'Entrar';
    }
  }

  /* ---------- Dados e tempo real ---------- */

  async function buscaTudo(tabela, colunas, ordem) {
    const passo = 1000;
    const todas = [];
    for (let de = 0; ; de += passo) {
      const { data, error } = await sb.from(tabela).select(colunas).order(ordem, { ascending: true }).range(de, de + passo - 1);
      if (error) throw error;
      todas.push(...(data || []));
      if (!data || data.length < passo) break;
    }
    return todas;
  }

  let recarregando = false;
  let recarregarDeNovo = false;
  async function recarregar() {
    if (!sb || !estado.usuario) return;
    if (recarregando) { recarregarDeNovo = true; return; }
    recarregando = true;
    try {
      const [linhas, apelidos] = await Promise.all([
        buscaTudo(TABELA, COLUNAS, 'id'),
        buscaTudo(TABELA_APELIDOS, 'apelido,empresa', 'apelido'),
      ]);
      estado.linhas = linhas;
      estado.apelidos = apelidos;
    } catch (e) {
      avisa(`Não deu para carregar os dados. ${traduzErro(e)}`, 'erro');
    } finally {
      calcula();
      desenhaTudo();
      recarregando = false;
      if (recarregarDeNovo) { recarregarDeNovo = false; recarregar(); }
    }
  }

  let relogioRecarga = 0;
  const agendaRecarga = () => { clearTimeout(relogioRecarga); relogioRecarga = setTimeout(recarregar, 700); };

  let novasDeOutros = [];
  let relogioNovas = 0;
  const avisaNovas = () => {
    clearTimeout(relogioNovas);
    relogioNovas = setTimeout(() => {
      if (!novasDeOutros.length) return;
      const eventos = [...new Set(novasDeOutros.map((l) => l.evento).filter(Boolean))];
      const quem = [...new Set(novasDeOutros.map((l) => l.enviado_por).filter(Boolean))];
      avisa(`Chegou lista nova: ${plural(novasDeOutros.length, 'pessoa', 'pessoas')} do ${eventos.join(', ')}${quem.length ? `, enviada por ${quem.join(', ')}` : ''}.`);
      novasDeOutros = [];
    }, 1500);
  };

  function conectaTempoReal() {
    if (canal) sb.removeChannel(canal);
    estado.aoVivo = estado.demo ? 'demo' : 'conectando';
    desenhaStatus();
    canal = sb.channel('cruzamentos-ao-vivo', { config: { presence: { key: estado.usuario.id } } });
    canal
      .on('postgres_changes', { event: '*', schema: 'public', table: TABELA }, (msg) => {
        if (msg && msg.eventType === 'INSERT' && msg.new && msg.new.enviado_por !== (estado.usuario && estado.usuario.email)) {
          novasDeOutros.push(msg.new);
          avisaNovas();
        }
        agendaRecarga();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: TABELA_APELIDOS }, agendaRecarga)
      .on('presence', { event: 'sync' }, () => {
        estado.online = Math.max(1, Object.keys(canal.presenceState()).length);
        desenhaStatus();
      })
      .subscribe(async (status) => {
        if (status === 'DEMO') return;
        if (status === 'SUBSCRIBED') {
          estado.aoVivo = 'ok';
          desenhaStatus();
          try { await canal.track({ email: estado.usuario.email, desde: new Date().toISOString() }); } catch (e) { /* presença é opcional */ }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          estado.aoVivo = 'falhou';
          desenhaStatus();
        }
      });
  }

  function desenhaStatus() {
    const caixa = $('#ao-vivo');
    const texto = $('#ao-vivo-texto');
    caixa.dataset.estado = estado.aoVivo;
    if (estado.aoVivo === 'demo') texto.textContent = 'Demonstração';
    else if (estado.aoVivo === 'ok') texto.textContent = estado.online > 1 ? `Ao vivo: ${plural(estado.online, 'pessoa', 'pessoas')} online` : 'Ao vivo';
    else if (estado.aoVivo === 'conectando') texto.textContent = 'Conectando…';
    else texto.textContent = 'Reconectando…';
  }

  /* ---------- Cálculos ---------- */

  function calcula() {
    const linhas = estado.linhas;
    const empresas = R.porEmpresa(linhas);
    const eventosPorEmpresa = new Map();
    for (const c of R.cruzamentos(linhas)) {
      if (!eventosPorEmpresa.has(c.empresa)) eventosPorEmpresa.set(c.empresa, []);
      eventosPorEmpresa.get(c.empresa).push({ evento: c.evento, data: c.data });
    }
    for (const lista of eventosPorEmpresa.values()) lista.sort((a, b) => String(a.data).localeCompare(String(b.data)) || porNome(a.evento, b.evento));
    estado.calc = { resumo: R.resumo(linhas), empresas, eventosPorEmpresa, porEvento: R.porEvento(linhas), lotes: R.lotes(linhas) };
    const setores = new Set(estado.calc.resumo.map((r) => r.setor));
    if (!setores.has(estado.setor)) estado.setor = 'Todos';
    if (estado.empresa && !empresas.some((e) => e.empresa === estado.empresa)) estado.empresa = '';
    if (estado.evento && !estado.calc.porEvento.some((e) => e.evento === estado.evento)) estado.evento = '';
  }

  const setorDaEmpresa = (empresa) => (estado.calc.empresas.find((e) => e.empresa === empresa) || {}).setor || R.SEM_SETOR;

  /* ---------- Desenho ---------- */

  function desenhaTudo() {
    if (!estado.calc) calcula();
    const temDados = estado.linhas.length > 0;
    $('#vazio').hidden = temDados;
    $('#painel').hidden = !temDados;
    $('#faixa-exemplo').hidden = estado.demo || !estado.linhas.some((l) => l.arquivo === ARQUIVO_EXEMPLO);
    if (!temDados) return;
    desenhaNumeros();
    desenhaEventos();
    desenhaEmpresasOuDetalhe();
  }

  function desenhaNumeros() {
    const r = estado.calc.resumo.find((x) => x.setor === estado.setor) || estado.calc.resumo[0];
    $('#num-empresas').textContent = fmtN(r.empresas);
    $('#num-recorrentes').textContent = fmtN(r.recorrentes);
    $('#num-pessoas').textContent = fmtN(r.pessoas);
    $('#num-eventos').textContent = fmtN(r.eventos);
  }

  function desenhaEventos() {
    const eventos = estado.calc.porEvento.filter((e) => e.setor === estado.setor);
    V.desenhaLinhaDoTempo($('#linha-eventos'), eventos, estado.evento, (evento) => {
      estado.evento = evento;
      estado.empresa = '';
      desenhaEventos();
      desenhaEmpresasOuDetalhe();
      if (evento) rolaPara('#empresas');
    });
    // Deixa o evento escolhido à vista na linha do tempo.
    const caixa = $('#linha-eventos');
    const ativo = caixa.querySelector('.cz-evento.is-ativo');
    if (ativo) caixa.scrollLeft = Math.max(0, ativo.parentElement.offsetLeft - caixa.clientWidth / 2 + ativo.offsetWidth / 2);
  }

  function empresasVisiveis() {
    const busca = R.chave(estado.busca);
    return estado.calc.empresas
      .filter((e) => estado.setor === 'Todos' || e.setor === estado.setor)
      .filter((e) => !estado.evento || (estado.calc.eventosPorEmpresa.get(e.empresa) || []).some((x) => x.evento === estado.evento))
      .filter((e) => !busca || R.chave(`${e.empresa} ${e.setor}`).includes(busca))
      .sort((a, b) => b.eventos - a.eventos || b.pessoas - a.pessoas || porNome(a.empresa, b.empresa));
  }

  function desenhaEmpresasOuDetalhe() {
    const grade = $('#grade-empresas');
    const detalhe = $('#detalhe-empresa');
    const filtros = $('#area-filtros');
    if (estado.empresa) {
      grade.hidden = true;
      filtros.hidden = true;
      detalhe.hidden = false;
      const info = estado.calc.empresas.find((e) => e.empresa === estado.empresa);
      const linhas = estado.linhas.filter((l) => l.empresa === estado.empresa);
      V.desenhaDetalhe(detalhe, info, linhas, { corDoSetor, aoVoltar: () => { estado.empresa = ''; desenhaEmpresasOuDetalhe(); rolaPara('#empresas'); } });
      return;
    }
    detalhe.hidden = true;
    grade.hidden = false;
    filtros.hidden = false;
    const contagem = estado.calc.resumo.map((r) => ({ setor: r.setor, empresas: r.empresas }));
    V.desenhaSetores($('#chips-setor'), contagem, estado.setor, (setor) => {
      estado.setor = setor;
      estado.evento = '';
      desenhaTudo();
    }, corDoSetor);
    const totalEventos = (estado.calc.resumo[0] || {}).eventos || 0;
    V.desenhaEmpresas(grade, empresasVisiveis(), {
      totalEventos,
      evento: estado.evento,
      corDoSetor,
      eventosDe: (empresa) => estado.calc.eventosPorEmpresa.get(empresa) || [],
      aoEscolher: (empresa) => { estado.empresa = empresa; desenhaEmpresasOuDetalhe(); rolaPara('#empresas'); },
      aoLimparEvento: () => { estado.evento = ''; desenhaEventos(); desenhaEmpresasOuDetalhe(); },
    });
  }

  const rolaPara = (seletor) => requestAnimationFrame(() => {
    const alvo = $(seletor);
    if (alvo && typeof alvo.scrollIntoView === 'function') alvo.scrollIntoView({ behavior: poucoMovimento() ? 'auto' : 'smooth', block: 'start' });
  });

  /* ---------- Gerenciar listas ---------- */

  function abreGerenciar() {
    desenhaGerenciar();
    abreJanela($('#dlg-gerenciar'));
  }

  function desenhaGerenciar() {
    if (!estado.calc) calcula();
    const lotes = estado.calc.lotes;
    const lista = $('#lista-lotes');
    if (!lotes.length) lista.replaceChildren(el('li', {}, el('span', { class: 'nota', text: 'Nenhuma lista enviada ainda.' })));
    else {
      lista.replaceChildren(...lotes.map((l) => {
        const quem = l.enviado_por && !estado.demo ? `por ${l.enviado_por}` : '';
        const quando = fmtQuando(l.criado_em);
        const botao = el('button', { type: 'button', class: 'botao botao-perigo', text: 'Excluir', 'data-lote': l.lote, 'aria-label': `Excluir a lista ${l.arquivo || ''}` });
        return el('li', {},
          el('span', { class: 'lote-texto' },
            el('b', { text: l.arquivo || 'Lista sem nome' }),
            el('span', { text: `${l.eventos.join(', ')}: ${plural(l.linhas, 'pessoa', 'pessoas')}` }),
            (quem || quando) ? el('span', { text: [quem, quando].filter(Boolean).join(', ') }) : null),
          botao);
      }));
    }
    const nomes = estado.calc.empresas.map((e) => e.empresa).sort(porNome);
    const opcoes = nomes.map((n) => [n, n]);
    preencheSelect($('#juntar-origem'), [['', 'Escolha…'], ...opcoes], $('#juntar-origem').value);
    preencheSelect($('#juntar-destino'), [['', 'Escolha…'], ...opcoes], $('#juntar-destino').value);
    preencheSelect($('#setor-empresa'), [['', 'Escolha…'], ...opcoes], $('#setor-empresa').value);
    const setores = [...new Set([...R.SETORES, R.SEM_SETOR, ...estado.calc.resumo.map((r) => r.setor).filter((s) => s !== 'Todos')])];
    const atual = $('#setor-empresa').value ? setorDaEmpresa($('#setor-empresa').value) : '';
    preencheSelect($('#setor-novo'), [['', 'Escolha…'], ...setores.map((s) => [s, s])], $('#setor-novo').dataset.tocado ? $('#setor-novo').value : atual);
    $('#botao-baixar').disabled = !estado.linhas.length;
  }

  async function excluirLote(lote) {
    const info = estado.calc.lotes.find((l) => l.lote === lote);
    if (!info) return;
    if (!window.confirm(`Excluir a lista “${info.arquivo || 'sem nome'}” (${plural(info.linhas, 'pessoa', 'pessoas')})? Ela some para todo mundo.`)) return;
    const { error } = await sb.from(TABELA).delete().eq('lote', lote);
    if (error) { avisa(`Não deu para excluir. ${traduzErro(error)}`, 'erro'); return; }
    avisa('Lista excluída.');
    await recarregar();
    desenhaGerenciar();
  }

  async function juntarEmpresas() {
    const origem = $('#juntar-origem').value;
    const destino = $('#juntar-destino').value;
    if (!origem || !destino) { avisa('Escolha as duas empresas.', 'erro'); return; }
    if (origem === destino) { avisa('Escolha duas empresas diferentes.', 'erro'); return; }
    if (!window.confirm(`Juntar “${origem}” em “${destino}”? Todos os encontros de ${origem} passam para ${destino}.`)) return;
    const setorDestino = setorDaEmpresa(destino);
    const setorFinal = setorDestino !== R.SEM_SETOR ? setorDestino : setorDaEmpresa(origem);
    const chavesDestino = new Set(estado.linhas.filter((l) => l.empresa === destino).map(R.chaveLinha));
    const repetidas = estado.linhas.filter((l) => l.empresa === origem && chavesDestino.has(R.chaveLinha({ ...l, empresa: destino }))).map((l) => l.id);
    try {
      for (let i = 0; i < repetidas.length; i += 200) {
        const { error } = await sb.from(TABELA).delete().in('id', repetidas.slice(i, i + 200));
        if (error) throw error;
      }
      let resposta = await sb.from(TABELA).update({ empresa: destino, setor: setorFinal }).eq('empresa', origem);
      if (resposta.error) throw resposta.error;
      if (setorFinal !== setorDestino) {
        resposta = await sb.from(TABELA).update({ setor: setorFinal }).eq('empresa', destino);
        if (resposta.error) throw resposta.error;
      }
      resposta = await sb.from(TABELA_APELIDOS).upsert({ apelido: R.chaveEmpresa(origem), empresa: destino });
      if (resposta.error) throw resposta.error;
      resposta = await sb.from(TABELA_APELIDOS).update({ empresa: destino }).eq('empresa', origem);
      if (resposta.error) throw resposta.error;
      if (estado.empresa === origem) estado.empresa = destino;
      $('#juntar-origem').value = '';
      avisa(`Pronto: ${origem} agora faz parte de ${destino}.`);
      await recarregar();
      desenhaGerenciar();
    } catch (e) {
      avisa(`Não deu para juntar. ${traduzErro(e)}`, 'erro');
      recarregar();
    }
  }

  async function mudarSetor() {
    const empresa = $('#setor-empresa').value;
    const setor = $('#setor-novo').value;
    if (!empresa || !setor) { avisa('Escolha a empresa e o setor certo.', 'erro'); return; }
    const { error } = await sb.from(TABELA).update({ setor }).eq('empresa', empresa);
    if (error) { avisa(`Não deu para mudar o setor. ${traduzErro(error)}`, 'erro'); return; }
    delete $('#setor-novo').dataset.tocado;
    avisa(`Setor de ${empresa} agora é ${setor}.`);
    await recarregar();
    desenhaGerenciar();
  }

  async function carregarExemplo() {
    const botao = $('#botao-exemplo');
    botao.disabled = true;
    const lote = novoId();
    const registros = EXEMPLO.map(([evento, dataEvento, empresa, setor, nome, cargo, interacao]) => ({
      evento, data_evento: dataEvento, empresa, setor, nome, cargo, interacao, observacoes: null,
      lote, arquivo: ARQUIVO_EXEMPLO, enviado_por: estado.usuario.email,
    }));
    const { error } = await sb.from(TABELA).insert(registros);
    botao.disabled = false;
    if (error) { avisa(`Não deu para carregar o exemplo. ${traduzErro(error)}`, 'erro'); return; }
    avisa('Exemplo carregado. Quando quiser, clique em “Apagar exemplo” lá em cima.');
    await recarregar();
  }

  async function apagarExemplo() {
    if (!window.confirm('Apagar os dados de exemplo? As listas reais continuam.')) return;
    const { error } = await sb.from(TABELA).delete().eq('arquivo', ARQUIVO_EXEMPLO);
    if (error) { avisa(`Não deu para apagar o exemplo. ${traduzErro(error)}`, 'erro'); return; }
    avisa('Exemplo apagado.');
    await recarregar();
  }

  // A biblioteca de Excel vem da internet e carrega em paralelo; espera um pouco por ela.
  const esperaXLSX = () => new Promise((pronto) => {
    const inicio = Date.now();
    const olha = () => { if (window.XLSX || Date.now() - inicio > 8000) pronto(); else setTimeout(olha, 250); };
    olha();
  });

  async function baixarDados() {
    if (!window.XLSX) await esperaXLSX();
    const cab = ['Evento', 'Data do evento', 'Empresa', 'Setor', 'Nome', 'Cargo', 'Tipo de interação', 'Observações', 'Arquivo de origem', 'Enviado por'];
    const linhas = [...estado.linhas]
      .sort((a, b) => String(a.data_evento).localeCompare(String(b.data_evento)) || porNome(a.evento, b.evento) || porNome(a.empresa, b.empresa))
      .map((l) => [l.evento, fmtData(l.data_evento), l.empresa, l.setor, l.nome || '', l.cargo || '', l.interacao || '', l.observacoes || '', l.arquivo || '', l.enviado_por || '']);
    const hoje = new Date().toISOString().slice(0, 10);
    if (window.XLSX) {
      const ws = window.XLSX.utils.aoa_to_sheet([cab, ...linhas]);
      ws['!cols'] = [28, 14, 26, 14, 24, 28, 22, 32, 28, 30].map((wch) => ({ wch }));
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'Lista');
      window.XLSX.writeFile(wb, `cruzamentos-${hoje}.xlsx`);
      return;
    }
    const seguro = (v) => { const s = String(v ?? ''); return /^[=+\-@]/.test(s) ? `'${s}` : s; };
    const csv = [cab, ...linhas].map((r) => r.map((c) => `"${seguro(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const a = el('a', { href: url, download: `cruzamentos-${hoje}.csv` });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  /* ---------- Subir lista ---------- */

  const envio = { nomeArquivo: '', cabecalho: [], tabela: [], mapa: {}, previa: null };

  function abreSubir() {
    Object.assign(envio, { nomeArquivo: '', cabecalho: [], tabela: [], mapa: {}, previa: null });
    $('#arquivo').value = '';
    $('#envio-resultado').hidden = true;
    $('#envio-falta-evento').hidden = true;
    $('#evento-padrao').value = '';
    $('#data-padrao').value = '';
    $('#envio-erro').hidden = true;
    $('.zona-titulo').textContent = 'Clique aqui e escolha a planilha do evento';
    const botao = $('#botao-enviar');
    botao.disabled = true;
    botao.textContent = 'Colocar no mapa';
    $('#lista-eventos').replaceChildren(...eventosConhecidos().map(([nome]) => el('option', { value: nome })));
    abreJanela($('#dlg-subir'));
  }

  function eventosConhecidos() {
    const mapa = new Map();
    for (const l of estado.linhas) {
      const k = R.chave(l.evento);
      if (!mapa.has(k)) mapa.set(k, [l.evento, String(l.data_evento || '').slice(0, 10)]);
    }
    for (const [nome, data] of EVENTOS_SUGERIDOS) if (!mapa.has(R.chave(nome))) mapa.set(R.chave(nome), [nome, data]);
    return [...mapa.values()].sort((a, b) => porNome(a[0], b[0]));
  }

  const decodifica = (bytes) => {
    try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch (e) { return new TextDecoder('windows-1252').decode(bytes); }
  };

  async function lePlanilha(arquivo) {
    const erro = $('#envio-erro');
    erro.hidden = true;
    envio.nomeArquivo = arquivo.name || 'planilha';
    const ext = (envio.nomeArquivo.split('.').pop() || '').toLowerCase();
    let tabela;
    if (ext === 'csv' || ext === 'txt') {
      tabela = R.lerCSV(decodifica(new Uint8Array(await arquivo.arrayBuffer())));
    } else {
      if (!window.XLSX) await esperaXLSX();
      if (!window.XLSX) {
        erro.textContent = 'A peça que lê Excel não carregou (a rede pode estar bloqueando cdn.sheetjs.com). No Excel, salve a planilha como CSV (Arquivo > Salvar como > CSV) e suba o CSV.';
        erro.hidden = false;
        return;
      }
      const livro = window.XLSX.read(await arquivo.arrayBuffer(), { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' });
      const comDados = livro.SheetNames.filter((n) => livro.Sheets[n] && livro.Sheets[n]['!ref']);
      const nomeAba = comDados.find((n) => R.chave(n) === 'lista') || comDados[0] || livro.SheetNames[0];
      tabela = window.XLSX.utils.sheet_to_json(livro.Sheets[nomeAba], { header: 1, raw: false, dateNF: 'yyyy-mm-dd', defval: '', blankrows: false });
    }
    tabela = (tabela || []).map((linha) => (Array.isArray(linha) ? linha.map((c) => (c === null || c === undefined ? '' : String(c))) : []));
    if (!tabela.length) { erro.textContent = 'A planilha está vazia.'; erro.hidden = false; return; }
    const i = R.achaCabecalho(tabela);
    envio.cabecalho = (tabela[i] || []).map((c) => R.limpa(c));
    envio.tabela = tabela.slice(i + 1);
    envio.mapa = R.mapeiaColunas(envio.cabecalho);
    $('.zona-titulo').textContent = 'Trocar de planilha';
    $('#envio-arquivo').textContent = `Planilha escolhida: ${envio.nomeArquivo}`;
    $('#envio-resultado').hidden = false;
    desenhaMapaColunas();
    atualizaPrevia();
  }

  function desenhaMapaColunas() {
    const exemplos = envio.cabecalho.map((c, i) => {
      const achado = envio.tabela.slice(0, 30).map((l) => R.limpa(l[i])).find(Boolean) || '';
      return achado.length > 28 ? `${achado.slice(0, 27)}…` : achado;
    });
    const opcoes = [['', '(não tem na planilha)'], ...envio.cabecalho.map((c, i) => [String(i), `${c || `Coluna ${i + 1}`}${exemplos[i] ? ` (ex.: ${exemplos[i]})` : ''}`])];
    $('#mapa-colunas').replaceChildren(...R.CAMPOS.map((campo) => {
      const sel = el('select', { 'data-campo': campo.id });
      opcoes.forEach(([v, t]) => sel.append(new Option(t, v)));
      sel.value = envio.mapa[campo.id] === undefined ? '' : String(envio.mapa[campo.id]);
      sel.addEventListener('change', () => {
        if (sel.value === '') delete envio.mapa[campo.id];
        else envio.mapa[campo.id] = Number(sel.value);
        atualizaPrevia();
      });
      return el('label', { class: 'campo' }, campo.id === 'empresa' ? `${campo.rotulo} (obrigatório)` : campo.rotulo, sel);
    }));
  }

  function atualizaPrevia() {
    if (!envio.tabela.length) return;
    envio.previa = R.preparaLinhas(envio.tabela, envio.mapa, {
      existentes: estado.linhas,
      apelidos: estado.apelidos,
      eventoPadrao: $('#evento-padrao').value,
      dataPadrao: $('#data-padrao').value,
      eventosExtras: EVENTOS_SUGERIDOS.map(([evento, data]) => ({ evento, data })),
    });
    desenhaResumoEnvio();
  }

  function desenhaResumoEnvio() {
    const p = envio.previa;
    const ig = p.ignoradas;
    const n = p.linhas.length;
    const faltaEvento = ig.semEvento > 0 || ig.semData > 0 || envio.mapa.evento === undefined || envio.mapa.data === undefined;
    $('#envio-falta-evento').hidden = !faltaEvento;
    const blocos = [];
    if (n) {
      const empresas = new Set(p.linhas.map((l) => l.empresa)).size;
      blocos.push(el('p', { class: 'resumo-grande' }, V.icone('participou'), el('span', { text: `${plural(n, 'pessoa', 'pessoas')} de ${plural(empresas, 'empresa', 'empresas')} vão entrar no mapa` })));
      blocos.push(el('p', { class: 'nota', text: `Evento: ${p.eventos.map((e) => `${e.evento} (${fmtData(e.data)})`).join(', ')}.` }));
      if (p.empresasNovas.length) blocos.push(el('p', { class: 'nota', text: `${plural(p.empresasNovas.length, 'empresa aparece', 'empresas aparecem')} pela primeira vez no mapa.` }));
    } else {
      let motivo = 'Nada para colocar no mapa ainda.';
      if (envio.mapa.empresa === undefined && envio.mapa.email === undefined) motivo = 'Não achamos a coluna com o nome da empresa. Abra “Ajustar colunas” e escolha qual é.';
      else if (ig.semEvento || ig.semData) motivo = 'Falta dizer de qual evento é esta lista (logo acima).';
      else if (ig.jaExistiam) motivo = 'Todas as pessoas desta planilha já estão no mapa.';
      blocos.push(el('p', { class: 'resumo-grande nada' }, V.icone('participou'), el('span', { text: motivo })));
    }
    const fora = [
      [ig.jaExistiam, 'já estava no mapa', 'já estavam no mapa'],
      [ig.repetidas, 'repetida na planilha', 'repetidas na planilha'],
      [ig.capgemini, 'da própria Capgemini', 'da própria Capgemini'],
      [ig.semEmpresa, 'sem empresa', 'sem empresa'],
      [ig.exemplo, 'linha de exemplo do modelo', 'linhas de exemplo do modelo'],
    ].filter(([q]) => q > 0).map(([q, um, varios]) => plural(q, um, varios));
    if (fora.length && n) blocos.push(el('p', { class: 'nota', text: `Ficam de fora: ${fora.join('; ')}.` }));
    $('#envio-resumo').replaceChildren(...blocos);
    $('#envio-amostra').replaceChildren(...p.linhas.slice(0, 5).map((l) => el('li', {},
      el('b', { text: l.empresa }),
      el('span', { text: [l.nome, l.cargo].filter(Boolean).join(', ') || 'Pessoa não informada' }))));
    const botao = $('#botao-enviar');
    botao.disabled = n === 0;
    botao.textContent = n ? `Colocar no mapa (${fmtN(n)})` : 'Colocar no mapa';
  }

  async function enviar() {
    atualizaPrevia();
    const p = envio.previa;
    if (!p || !p.linhas.length) return;
    const botao = $('#botao-enviar');
    const erro = $('#envio-erro');
    erro.hidden = true;
    botao.disabled = true;
    botao.textContent = 'Enviando…';
    const lote = novoId();
    const registros = p.linhas.map((l) => ({ ...l, lote, arquivo: envio.nomeArquivo, enviado_por: estado.usuario.email || 'demonstração' }));
    let enviados = 0;
    try {
      for (let i = 0; i < registros.length; i += 500) {
        const parte = registros.slice(i, i + 500);
        const { error } = await sb.from(TABELA).insert(parte);
        if (error) throw error;
        enviados += parte.length;
      }
      for (const s of p.setoresParaAtualizar) {
        await sb.from(TABELA).update({ setor: s.setor }).eq('empresa', s.empresa).eq('setor', R.SEM_SETOR);
      }
      fechaJanela($('#dlg-subir'));
      estado.evento = p.eventos.length === 1 ? p.eventos[0].evento : '';
      estado.empresa = '';
      avisa(estado.demo
        ? `Pronto: ${plural(enviados, 'pessoa entrou', 'pessoas entraram')} no mapa (só nesta demonstração).`
        : `Pronto: ${plural(enviados, 'pessoa entrou', 'pessoas entraram')} no mapa. Quem está com o site aberto já está vendo.`);
      await recarregar();
      rolaPara('#empresas');
    } catch (e) {
      erro.textContent = enviados
        ? `Entraram ${fmtN(enviados)} pessoas e o resto falhou: ${traduzErro(e)} Para tentar de novo, exclua esta lista em “Gerenciar listas” e suba outra vez.`
        : `Não deu para enviar. ${traduzErro(e)}`;
      erro.hidden = false;
      if (enviados) recarregar();
      desenhaResumoEnvio();
    }
  }

  /* ---------- Eventos da página ---------- */

  function ligaEventos() {
    $('#form-login').addEventListener('submit', fazLogin);
    $('#botao-sair').addEventListener('click', async () => {
      try { await sb.auth.signOut(); } finally { saiu(); }
    });
    $('#busca').addEventListener('input', (e) => { estado.busca = e.target.value; desenhaEmpresasOuDetalhe(); });

    $('#botao-subir').addEventListener('click', abreSubir);
    $$('[data-acao="subir"]').forEach((b) => b.addEventListener('click', abreSubir));
    $('#botao-gerenciar').addEventListener('click', abreGerenciar);
    $('#botao-exemplo').addEventListener('click', carregarExemplo);
    $('#botao-apagar-exemplo').addEventListener('click', apagarExemplo);

    $$('dialog [data-fechar]').forEach((b) => b.addEventListener('click', () => fechaJanela(b.closest('dialog'))));
    $('#arquivo').addEventListener('change', async (e) => {
      const arquivo = e.target.files && e.target.files[0];
      if (!arquivo) return;
      try { await lePlanilha(arquivo); } catch (err) {
        const erro = $('#envio-erro');
        erro.textContent = `Não deu para ler a planilha. Confira se o arquivo abre no Excel. (${err && err.message ? err.message : err})`;
        erro.hidden = false;
      }
    });
    $('#evento-padrao').addEventListener('input', () => {
      const escolhido = eventosConhecidos().find(([nome]) => R.chave(nome) === R.chave($('#evento-padrao').value));
      if (escolhido && escolhido[1] && !$('#data-padrao').value) $('#data-padrao').value = escolhido[1];
      atualizaPrevia();
    });
    $('#data-padrao').addEventListener('change', atualizaPrevia);
    $('#botao-enviar').addEventListener('click', enviar);

    $('#lista-lotes').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-lote]');
      if (b) excluirLote(b.dataset.lote);
    });
    $('#botao-juntar').addEventListener('click', juntarEmpresas);
    $('#botao-setor').addEventListener('click', mudarSetor);
    $('#setor-empresa').addEventListener('change', (e) => {
      delete $('#setor-novo').dataset.tocado;
      $('#setor-novo').value = e.target.value ? setorDaEmpresa(e.target.value) : '';
    });
    $('#setor-novo').addEventListener('change', (e) => { e.target.dataset.tocado = '1'; });
    $('#botao-baixar').addEventListener('click', baixarDados);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && estado.usuario && !estado.demo) agendaRecarga();
    });
  }

  iniciar();
})();
