/*
 * Mapa de cruzamentos: clientes × eventos
 * Lê e grava no Supabase e se atualiza sozinho quando alguém sobe uma lista.
 * Sem o config.js preenchido, mostra como ligar o site ao Supabase.
 */
(() => {
  'use strict';

  const R = window.Regras;
  const V = window.Visual;
  const cfg = window.CRUZ_CONFIG || {};
  const TABELA = 'cruz_interacoes';
  const TABELA_APELIDOS = 'cruz_apelidos';
  const VERSAO = '7';
  const COLUNAS = 'id,evento,data_evento,empresa,setor,nome,cargo,interacao,observacoes,lote,arquivo,enviado_por,enviado_por_nome,enviado_por_id,criado_em,mu,grade,lista';

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

  /* ---------- Utilidades ---------- */

  const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
  const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];
  const { el, fmtN, fmtData, plural, porNome } = V || {};
  const corDe = (valor) => corDoSetor(valor);
  const fmtQuando = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  // "diogo.a.ribeiro@capgemini.com" vira "Diogo A. Ribeiro"
  const nomeDoEmail = (email) => {
    const partes = String(email || '').split('@')[0].split(/[._-]+/).filter(Boolean);
    if (!partes.length) return String(email || '');
    return partes.map((p) => (p.length === 1 ? `${p.toUpperCase()}.` : p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())).join(' ');
  };
  const nomeDoUsuario = (u) => R.limpa((u && u.user_metadata && u.user_metadata.nome) || '') || nomeDoEmail(u && u.email);
  const quemEnviou = (l) => l.enviado_por_nome || (l.enviado_por ? nomeDoEmail(l.enviado_por) : '');
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
    if (/enviado_por_nome|enviado_por_id|column .* does not exist/i.test(m)) return 'O banco do Supabase está numa versão antiga. Rode o arquivo banco.sql novo no SQL Editor do Supabase.';
    if (/does not exist|could not find the table|schema cache/i.test(m)) return 'As tabelas ainda não existem no Supabase. Rode o arquivo banco.sql no SQL Editor.';
    if (/row-level security|permission denied|not allowed|42501/i.test(m)) return 'Sem permissão. Saia, entre de novo e confira se o banco.sql foi rodado inteiro.';
    if (/invalid api key|no api key|apikey/i.test(m)) return 'A chave do config.js está errada. Copie de novo a chave publishable no Supabase.';
    if (/jwt|token/i.test(m)) return 'Sua sessão expirou. Saia e entre de novo.';
    return m || 'Erro desconhecido.';
  };

  /* ---------- Estado ---------- */

  const estado = {
    usuario: null,
    nome: '',
    linhas: [],
    apelidos: [],
    calc: null,
    ano: 'Todos',
    mu: 'Todas',
    setor: 'Todos',
    evento: '',
    aba: 'mapa',
    tabela: { sel: { empresa: '', grade: '' }, ordem: { campo: 'total', direcao: -1 }, busca: '' },
    visao: 'empresas',
    empresa: '',
    pessoa: '',
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

  const mostraErro = (texto) => {
    const alvo = $('#erro-texto');
    if (alvo) alvo.textContent = texto;
    mostraTela('erro');
  };

  async function iniciar() {
    const meta = document.querySelector('meta[name="versao-site"]');
    if (!R || !V) { mostraErro('Os arquivos regras.js e visual.js precisam estar na mesma pasta do site.'); return; }
    if (!meta || meta.content !== VERSAO || R.VERSAO !== VERSAO || V.VERSAO !== VERSAO) {
      mostraErro('Os arquivos do site estão misturados: alguns são de uma versão antiga. Suba de novo todos os arquivos do zip no GitHub (incluindo o index.html) e depois aperte Ctrl + F5 nesta página.');
      return;
    }
    colocaIcones();
    ligaEventos();
    if (window.location.hash === '#grades') estado.aba = 'grades';
    const logo = $('#logo');
    if (logo) {
      const mostraLogo = () => { if (logo.naturalWidth > 0) logo.hidden = false; };
      logo.addEventListener('load', mostraLogo);
      if (logo.complete) mostraLogo();
    }
    const url = String(cfg.supabaseUrl || '').trim().replace(/\/+$/, '');
    const chave = String(cfg.supabaseKey || '').trim();
    const configurado = /^https:\/\/[^/]+$/.test(url) && chave.length >= 20 && !/COLE_AQUI/.test(url + chave);
    if (!configurado) { mostraTela('config'); return; }
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

  async function entrar(usuario) {
    estado.usuario = usuario;
    estado.nome = nomeDoUsuario(usuario);
    $('#perfil-nome').textContent = estado.nome || 'Meu perfil';
    mostraTela('app');
    desenhaStatus();
    try { await recarregar(); } finally { conectaTempoReal(); }
  }

  function saiu() {
    if (canal && sb) { sb.removeChannel(canal); canal = null; }
    estado.usuario = null;
    estado.nome = '';
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
      try {
        calcula();
        desenhaTudo();
      } catch (e) {
        avisa('Algo deu errado ao montar a tela. Aperte Ctrl + F5 para recarregar.', 'erro');
      }
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
      const quem = [...new Set(novasDeOutros.map(quemEnviou).filter(Boolean))];
      avisa(`Chegou lista nova: ${plural(novasDeOutros.length, 'pessoa', 'pessoas')} do ${eventos.join(', ')}${quem.length ? `, enviada por ${quem.join(', ')}` : ''}.`);
      novasDeOutros = [];
    }, 1500);
  };

  function conectaTempoReal() {
    if (canal) sb.removeChannel(canal);
    estado.aoVivo = 'conectando';
    desenhaStatus();
    canal = sb.channel('cruzamentos-ao-vivo', { config: { presence: { key: estado.usuario.id } } });
    canal
      .on('postgres_changes', { event: '*', schema: 'public', table: TABELA }, (msg) => {
        if (msg && msg.eventType === 'INSERT' && msg.new && msg.new.enviado_por_id !== (estado.usuario && estado.usuario.id)) {
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
    if (estado.aoVivo === 'ok') texto.textContent = estado.online > 1 ? `Ao vivo: ${plural(estado.online, 'pessoa', 'pessoas')} online` : 'Ao vivo';
    else if (estado.aoVivo === 'conectando') texto.textContent = 'Conectando…';
    else texto.textContent = 'Reconectando…';
  }

  /* ---------- Filtros e cálculos ---------- */

  const anoDaLinha = (l) => R.anoDe(l.data_evento);
  const muDaLinha = (l) => R.limpa(l.mu) || R.SEM_MU;
  const setorDaLinha = (l) => l.setor || R.SEM_SETOR;

  // Linhas que passam pelos filtros. "ignorar" deixa um filtro de fora, para contar as opções dele.
  const filtradas = (ignorar = '') => estado.linhas.filter((l) => (ignorar === 'ano' || estado.ano === 'Todos' || anoDaLinha(l) === estado.ano)
    && (ignorar === 'mu' || estado.mu === 'Todas' || muDaLinha(l) === estado.mu)
    && (ignorar === 'setor' || estado.setor === 'Todos' || setorDaLinha(l) === estado.setor));

  const empresasPor = (linhas, chaveDe) => {
    const m = new Map();
    for (const l of linhas) {
      const k = chaveDe(l);
      if (!m.has(k)) m.set(k, new Set());
      m.get(k).add(l.empresa);
    }
    return m;
  };

  function calcula() {
    const todas = estado.linhas;
    const anos = [...new Set(todas.map(anoDaLinha))].filter(Boolean).sort();
    const temMU = todas.some((l) => R.limpa(l.mu));
    if (estado.ano !== 'Todos' && !anos.includes(estado.ano)) estado.ano = 'Todos';
    if (estado.mu !== 'Todas' && !todas.some((l) => muDaLinha(l) === estado.mu)) estado.mu = 'Todas';
    if (estado.setor !== 'Todos' && !todas.some((l) => setorDaLinha(l) === estado.setor)) estado.setor = 'Todos';
    const visiveis = filtradas();

    const anosEmpresa = new Map();
    const anosPessoa = new Map();
    for (const l of todas) {
      const ano = anoDaLinha(l);
      if (!anosEmpresa.has(l.empresa)) anosEmpresa.set(l.empresa, new Set());
      anosEmpresa.get(l.empresa).add(ano);
      if (!R.limpa(l.nome)) continue;
      const k = R.chavePessoa(l);
      if (!anosPessoa.has(k)) anosPessoa.set(k, new Set());
      anosPessoa.get(k).add(ano);
    }
    // Com um ano escolhido, mostra em quais outros anos a empresa ou a pessoa também interagiu.
    const outros = (mapa, k) => (estado.ano === 'Todos' ? [] : [...(mapa.get(k) || [])].filter((a) => a && a !== estado.ano).sort());

    const eventosPorEmpresa = new Map();
    const eventosPorPessoa = new Map();
    const nomesPorEmpresa = new Map();
    const guarda = (mapa, k, l) => {
      if (!mapa.has(k)) mapa.set(k, new Map());
      if (!mapa.get(k).has(l.evento)) mapa.get(k).set(l.evento, { evento: l.evento, data: String(l.data_evento || '').slice(0, 10) });
    };
    for (const l of visiveis) {
      guarda(eventosPorEmpresa, l.empresa, l);
      if (!R.limpa(l.nome)) continue;
      guarda(eventosPorPessoa, R.chavePessoa(l), l);
      nomesPorEmpresa.set(l.empresa, `${nomesPorEmpresa.get(l.empresa) || ''} ${l.nome}`);
    }
    const ordena = (mapa) => {
      for (const [k, m] of mapa) mapa.set(k, [...m.values()].sort((a, b) => a.data.localeCompare(b.data) || porNome(a.evento, b.evento)));
      return mapa;
    };

    const resumo = R.resumo(visiveis)[0] || { empresas: 0, recorrentes: 0, pessoas: 0, pessoas_recorrentes: 0, eventos: 0 };
    estado.calc = {
      anos,
      temMU,
      visiveis,
      resumo,
      totalEventos: new Set(visiveis.map((l) => l.evento)).size,
      empresas: R.porEmpresa(visiveis).map((e) => ({ ...e, outrosAnos: outros(anosEmpresa, e.empresa) })),
      pessoas: R.porPessoa(visiveis).map((p) => ({ ...p, outrosAnos: outros(anosPessoa, p.chave) })),
      eventosPorEmpresa: ordena(eventosPorEmpresa),
      eventosPorPessoa: ordena(eventosPorPessoa),
      nomesPorEmpresa,
      porEvento: R.porEvento(visiveis).filter((e) => e.setor === 'Todos'),
      grades: R.porGrade(visiveis),
      tabelaGrades: R.gradesPorEmpresa(visiveis),
      opAno: empresasPor(filtradas('ano'), anoDaLinha),
      opMu: empresasPor(filtradas('mu'), muDaLinha),
      opSetor: empresasPor(filtradas('setor'), setorDaLinha),
      empresasTodas: R.porEmpresa(todas),
      pessoasTodas: R.porPessoa(todas),
      lotes: R.lotes(todas),
      listas: R.listas(todas),
    };
    if (estado.empresa && !estado.calc.empresasTodas.some((e) => e.empresa === estado.empresa)) estado.empresa = '';
    if (estado.pessoa && !estado.calc.pessoasTodas.some((p) => p.chave === estado.pessoa)) estado.pessoa = '';
    if (estado.evento && !estado.calc.porEvento.some((e) => e.evento === estado.evento)) estado.evento = '';
  }

  const setorDaEmpresa = (empresa) => (estado.calc.empresasTodas.find((e) => e.empresa === empresa) || {}).setor || R.SEM_SETOR;
  const refaz = () => { calcula(); desenhaTudo(); };

  /* ---------- Desenho ---------- */

  function desenhaTudo() {
    if (!estado.calc) calcula();
    const temDados = estado.linhas.length > 0;
    $('#vazio').hidden = temDados;
    $('#painel').hidden = !temDados;
    if (!temDados) return;
    desenhaFiltros();
    desenhaNumeros();
    desenhaAbas();
    if (estado.aba === 'grades') desenhaAbaGrades();
    else {
      desenhaEventos();
      desenhaGrades();
      desenhaLista();
    }
  }

  /* ---------- Abas: mapa e grades por empresa ---------- */

  function desenhaAbas() {
    const grades = estado.aba === 'grades';
    $('#conteudo-mapa').hidden = grades;
    $('#conteudo-grades').hidden = !grades;
    $$('.aba').forEach((b) => {
      const ativa = b.dataset.aba === estado.aba;
      b.classList.toggle('is-ativa', ativa);
      b.setAttribute('aria-selected', String(ativa));
    });
  }

  function trocaAba(aba) {
    estado.aba = aba === 'grades' ? 'grades' : 'mapa';
    const hash = estado.aba === 'grades' ? '#grades' : '';
    if (window.location.hash !== hash) {
      try { window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`); } catch (e) { /* endereço sem histórico */ }
    }
    desenhaTudo();
  }

  const irParaPessoa = (chave) => { estado.aba = 'mapa'; trocaAba('mapa'); abrePessoa(chave); };
  const irParaEmpresa = (empresa) => { estado.aba = 'mapa'; trocaAba('mapa'); abreEmpresa(empresa); };

  function desenhaAbaGrades() {
    const t = estado.calc.tabelaGrades;
    const { sel, ordem } = estado.tabela;
    const busca = R.chave(estado.tabela.busca);
    if (sel.grade && !t.grades.includes(sel.grade)) sel.grade = '';
    if (sel.empresa && !t.empresas.some((e) => e.empresa === sel.empresa)) sel.empresa = '';
    const valor = (e) => {
      if (ordem.campo === 'empresa') return e.empresa;
      if (ordem.campo.startsWith('grade:')) return e.porGrade[ordem.campo.slice(6)] || 0;
      return e.total;
    };
    const empresas = t.empresas
      .filter((e) => !busca || R.chave(`${e.empresa} ${e.mu}`).includes(busca))
      .sort((a, b) => {
        const va = valor(a);
        const vb = valor(b);
        const c = typeof va === 'string' ? porNome(va, vb) : va - vb;
        return c * ordem.direcao || b.total - a.total || porNome(a.empresa, b.empresa);
      });
    V.desenhaTabelaGrades($('#tabela-grades'), { grades: t.grades, empresas, totais: t.totais }, {
      sel,
      ordem,
      corDe,
      aoOrdenar: (campo) => {
        ordem.direcao = ordem.campo === campo ? -ordem.direcao : (campo === 'empresa' ? 1 : -1);
        ordem.campo = campo;
        desenhaAbaGrades();
      },
      aoEscolher: (escolha) => {
        estado.tabela.sel = { empresa: escolha.empresa || '', grade: escolha.grade || '' };
        desenhaAbaGrades();
        rolaPara('#selecao-grades');
      },
      aoAbrirEmpresa: irParaEmpresa,
    });
    $('#tabela-grades-resumo').textContent = `${plural(empresas.length, 'empresa', 'empresas')} e ${plural(t.pessoas.length, 'pessoa', 'pessoas')} com esses filtros.`;

    const caixa = $('#pessoas-grade');
    const titulo = $('#selecao-titulo');
    if (!sel.grade && !sel.empresa) {
      titulo.textContent = 'Clique num número da tabela para ver quem são as pessoas.';
      caixa.replaceChildren();
      return;
    }
    const pessoas = t.pessoas
      .filter((p) => (!sel.grade || p.grade === sel.grade) && (!sel.empresa || p.empresa === sel.empresa))
      .sort((a, b) => R.posicaoGrade(a.grade) - R.posicaoGrade(b.grade) || b.eventos - a.eventos || porNome(a.nome, b.nome));
    const quantas = plural(pessoas.length, 'pessoa', 'pessoas');
    if (sel.grade && sel.empresa) titulo.textContent = `${sel.grade} em ${sel.empresa}: ${quantas}`;
    else if (sel.grade) titulo.textContent = `${sel.grade} em todas as empresas: ${quantas}`;
    else titulo.textContent = `Todas as pessoas de ${sel.empresa}: ${quantas}`;
    V.desenhaListaPessoas(caixa, pessoas, { aoEscolher: irParaPessoa });
  }

  async function baixarGrades() {
    if (!window.XLSX) await esperaXLSX();
    if (!window.XLSX) { avisa('A peça que gera Excel não carregou. Verifique a internet e tente de novo.', 'erro'); return; }
    const t = estado.calc.tabelaGrades;
    const cab = ['Empresa', 'MU', ...t.grades, 'Total'];
    const linhas = [...t.empresas].sort((a, b) => b.total - a.total || porNome(a.empresa, b.empresa))
      .map((e) => [e.empresa, e.mu || '', ...t.grades.map((g) => e.porGrade[g] || 0), e.total]);
    linhas.push(['Total', '', ...t.grades.map((g) => t.totais[g] || 0), t.pessoas.length]);
    const pessoas = [...t.pessoas].sort((a, b) => porNome(a.empresa, b.empresa) || R.posicaoGrade(a.grade) - R.posicaoGrade(b.grade) || porNome(a.nome, b.nome))
      .map((p) => [p.nome, p.cargo || '', p.empresa, p.mu || '', p.grade, p.eventos, p.vezes, R.semDia(p.ultimo_contato) ? R.anoDe(p.ultimo_contato) : fmtData(p.ultimo_contato)]);
    const wb = window.XLSX.utils.book_new();
    const ws1 = window.XLSX.utils.aoa_to_sheet([cab, ...linhas]);
    ws1['!cols'] = cab.map((c, i) => ({ wch: i === 0 ? 30 : 12 }));
    const ws2 = window.XLSX.utils.aoa_to_sheet([['Pessoa', 'Cargo', 'Empresa', 'MU', 'Grade', 'Eventos', 'Interações', 'Última interação'], ...pessoas]);
    ws2['!cols'] = [28, 30, 28, 8, 16, 9, 11, 16].map((wch) => ({ wch }));
    window.XLSX.utils.book_append_sheet(wb, ws1, 'Grades por empresa');
    window.XLSX.utils.book_append_sheet(wb, ws2, 'Pessoas');
    window.XLSX.writeFile(wb, `grades-por-empresa-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function desenhaFiltros() {
    const c = estado.calc;
    $('#linha-ano').hidden = c.anos.length < 2;
    V.desenhaChips($('#chips-ano'), [{ valor: 'Todos', rotulo: 'Todos os anos' },
      ...c.anos.map((a) => ({ valor: a, rotulo: a, n: (c.opAno.get(a) || new Set()).size }))], estado.ano,
    (ano) => { estado.ano = ano; estado.evento = ''; refaz(); });

    $('#linha-mu').hidden = !c.temMU;
    const mus = [...c.opMu.keys()].sort((a, b) => (a === R.SEM_MU) - (b === R.SEM_MU) || porNome(a, b));
    V.desenhaChips($('#chips-mu'), [{ valor: 'Todas', rotulo: 'Todas as MUs' },
      ...mus.map((m) => ({ valor: m, rotulo: m, n: c.opMu.get(m).size, cor: m === R.SEM_MU ? null : corDe(m) }))], estado.mu,
    (mu) => { estado.mu = mu; estado.evento = ''; refaz(); });

    $('#linha-setor').hidden = c.temMU;
    const setores = [...c.opSetor.keys()].sort((a, b) => (a === R.SEM_SETOR) - (b === R.SEM_SETOR) || porNome(a, b));
    V.desenhaChips($('#chips-setor'), [{ valor: 'Todos', rotulo: 'Todos os setores' },
      ...setores.map((x) => ({ valor: x, rotulo: x, n: c.opSetor.get(x).size, cor: x === R.SEM_SETOR ? null : corDe(x) }))], estado.setor,
    (setor) => { estado.setor = setor; estado.evento = ''; refaz(); });

  }

  function desenhaNumeros() {
    const r = estado.calc.resumo;
    $('#num-empresas').textContent = fmtN(r.empresas);
    $('#num-empresas-texto').textContent = r.recorrentes ? `empresas, ${fmtN(r.recorrentes)} em mais de um evento` : 'empresas encontraram a gente';
    $('#num-pessoas').textContent = fmtN(r.pessoas);
    $('#num-interacoes').textContent = fmtN(estado.calc.visiveis.length);
    $('#num-eventos').textContent = fmtN(r.eventos);
  }

  function desenhaEventos() {
    V.desenhaLinhaDoTempo($('#linha-eventos'), estado.calc.porEvento, estado.evento, (evento) => {
      estado.evento = evento;
      estado.empresa = '';
      estado.pessoa = '';
      desenhaEventos();
      desenhaLista();
      if (evento) rolaPara('#empresas');
    });
    const caixa = $('#linha-eventos');
    const ativo = caixa.querySelector('.cz-evento.is-ativo');
    if (ativo) caixa.scrollLeft = Math.max(0, ativo.parentElement.offsetLeft - caixa.clientWidth / 2 + ativo.offsetWidth / 2);
  }

  function desenhaGrades() {
    V.desenhaGrades($('#grades'), estado.calc.grades, '', (grade) => {
      estado.tabela.sel = { empresa: '', grade };
      trocaAba('grades');
      rolaPara('#selecao-grades');
    });
  }

  const foiAoEvento = (lista) => !estado.evento || (lista || []).some((x) => x.evento === estado.evento);

  function empresasVisiveis() {
    const busca = R.chave(estado.busca);
    return estado.calc.empresas
      .filter((e) => foiAoEvento(estado.calc.eventosPorEmpresa.get(e.empresa)))
      .filter((e) => !busca || R.chave(`${e.empresa} ${e.mu} ${e.setor} ${estado.calc.nomesPorEmpresa.get(e.empresa) || ''}`).includes(busca))
      .sort((a, b) => b.eventos - a.eventos || b.interacoes - a.interacoes || b.pessoas - a.pessoas || porNome(a.empresa, b.empresa));
  }

  function pessoasVisiveis() {
    const busca = R.chave(estado.busca);
    return estado.calc.pessoas
      .filter((p) => foiAoEvento(estado.calc.eventosPorPessoa.get(p.chave)))
      .filter((p) => !busca || R.chave(`${p.nome} ${p.empresa} ${p.cargo} ${p.grade} ${p.mu}`).includes(busca))
      .sort((a, b) => b.eventos - a.eventos || b.vezes - a.vezes || porNome(a.nome, b.nome));
  }

  const abrePessoa = (chave) => { estado.pessoa = chave; estado.empresa = ''; estado.visao = 'pessoas'; desenhaLista(); rolaPara('#empresas'); };
  const abreEmpresa = (empresa) => { estado.empresa = empresa; estado.pessoa = ''; estado.visao = 'empresas'; desenhaLista(); rolaPara('#empresas'); };

  function desenhaLista() {
    const mostrando = estado.pessoa ? 'pessoa' : (estado.empresa ? 'empresa' : estado.visao);
    $('#area-filtros').hidden = mostrando === 'pessoa' || mostrando === 'empresa';
    $('#grade-empresas').hidden = mostrando !== 'empresas';
    $('#grade-pessoas').hidden = mostrando !== 'pessoas';
    $('#detalhe-empresa').hidden = mostrando !== 'empresa';
    $('#detalhe-pessoa').hidden = mostrando !== 'pessoa';

    if (mostrando === 'pessoa') {
      const info = estado.calc.pessoasTodas.find((p) => p.chave === estado.pessoa);
      const linhas = estado.linhas.filter((l) => R.limpa(l.nome) && R.chavePessoa(l) === estado.pessoa);
      V.desenhaDetalhePessoa($('#detalhe-pessoa'), info, linhas, {
        corDe,
        aoVoltar: () => { estado.pessoa = ''; estado.visao = 'pessoas'; desenhaLista(); rolaPara('#empresas'); },
        aoVerEmpresa: abreEmpresa,
      });
      return;
    }
    if (mostrando === 'empresa') {
      const info = estado.calc.empresasTodas.find((e) => e.empresa === estado.empresa);
      const linhas = estado.linhas.filter((l) => l.empresa === estado.empresa);
      V.desenhaDetalhe($('#detalhe-empresa'), info, linhas, {
        corDe,
        aoVoltar: () => { estado.empresa = ''; estado.visao = 'empresas'; desenhaLista(); rolaPara('#empresas'); },
        aoEscolherPessoa: abrePessoa,
        chaveDaPessoa: R.chavePessoa,
      });
      return;
    }

    const r = estado.calc.resumo;
    V.desenhaAlternador($('#alternador'), estado.visao, { empresas: r.empresas, pessoas: r.pessoas }, (visao) => { estado.visao = visao; desenhaLista(); });
    const filtros = estado.evento ? [{ texto: `Quem foi ao ${estado.evento}`, aoLimpar: () => { estado.evento = ''; desenhaEventos(); desenhaLista(); } }] : [];
    const comum = {
      totalEventos: estado.calc.totalEventos,
      evento: estado.evento,
      corDe,
      filtros,
    };
    if (estado.visao === 'pessoas') {
      let resumo = `${plural(r.pessoas, 'pessoa', 'pessoas')} no mapa.`;
      if (r.pessoas > 1) resumo += r.pessoas_recorrentes ? ` ${fmtN(r.pessoas_recorrentes)} ${r.pessoas_recorrentes === 1 ? 'delas esteve' : 'delas estiveram'} em mais de um evento.` : ' Cada uma esteve em um evento até agora.';
      V.desenhaPessoas($('#grade-pessoas'), pessoasVisiveis(), { ...comum, resumo, eventosDe: (k) => estado.calc.eventosPorPessoa.get(k) || [], aoEscolher: abrePessoa });
    } else {
      V.desenhaEmpresas($('#grade-empresas'), empresasVisiveis(), { ...comum, eventosDe: (e) => estado.calc.eventosPorEmpresa.get(e) || [], aoEscolher: abreEmpresa });
    }
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
    const listas = estado.calc.listas;
    const caixa = $('#lista-lotes');
    if (!listas.length) caixa.replaceChildren(el('li', {}, el('span', { class: 'nota', text: 'Nenhuma lista enviada ainda.' })));
    else {
      caixa.replaceChildren(...listas.map((ls) => el('li', { class: 'lista-bloco' },
        el('div', { class: 'lista-topo' },
          el('span', { class: 'lote-texto' },
            el('b', { text: ls.lista }),
            el('span', { text: `${plural(ls.linhas, 'interação', 'interações')} de ${plural(ls.eventos.length, 'evento', 'eventos')}` })),
          el('button', { type: 'button', class: 'botao botao-perigo', text: 'Excluir a lista', 'data-lista': ls.lista, 'aria-label': `Excluir a lista ${ls.lista} inteira` })),
        el('ul', { class: 'envios' }, ...ls.envios.map((e) => {
          const nome = quemEnviou(e);
          const texto = [fmtQuando(e.criado_em), nome ? `por ${nome}` : '', e.arquivo].filter(Boolean).join(', ');
          return el('li', {},
            el('span', { class: 'lote-texto' },
              el('span', {}, el('span', { text: `${texto}: ${plural(e.linhas, 'interação', 'interações')}` }), ehMinha(e) ? el('span', { class: 'lote-voce', text: 'seu envio' }) : null)),
            el('button', { type: 'button', class: 'botao botao-perigo', text: 'Excluir envio', 'data-lote': e.lote, 'aria-label': `Excluir este envio de ${ls.lista}` }));
        })))));
    }
    const nomes = estado.calc.empresasTodas.map((e) => e.empresa).sort(porNome);
    const opcoes = nomes.map((n) => [n, n]);
    preencheSelect($('#juntar-origem'), [['', 'Escolha…'], ...opcoes], $('#juntar-origem').value);
    preencheSelect($('#juntar-destino'), [['', 'Escolha…'], ...opcoes], $('#juntar-destino').value);
    preencheSelect($('#setor-empresa'), [['', 'Escolha…'], ...opcoes], $('#setor-empresa').value);
    const setores = [...new Set([...R.SETORES, R.SEM_SETOR, ...estado.calc.empresasTodas.map((e) => e.setor)])];
    const atual = $('#setor-empresa').value ? setorDaEmpresa($('#setor-empresa').value) : '';
    preencheSelect($('#setor-novo'), [['', 'Escolha…'], ...setores.map((x) => [x, x])], $('#setor-novo').dataset.tocado ? $('#setor-novo').value : atual);
    $('#botao-baixar').disabled = !estado.linhas.length;
  }

  const ehMinha = (l) => Boolean(estado.usuario) && ((l.enviado_por_id && l.enviado_por_id === estado.usuario.id)
    || (!l.enviado_por_id && l.enviado_por && l.enviado_por === estado.usuario.email));

  function abrePerfil() {
    desenhaPerfil();
    abreJanela($('#dlg-perfil'));
  }

  function desenhaPerfil() {
    if (!estado.calc) calcula();
    $('#perfil-email').textContent = `Você entrou como ${estado.usuario.email}`;
    const campo = $('#perfil-campo-nome');
    if (document.activeElement !== campo) campo.value = estado.nome;
    const meus = estado.calc.lotes.filter(ehMinha);
    const interacoes = meus.reduce((t, l) => t + l.linhas, 0);
    const eventos = new Set(meus.flatMap((l) => l.eventos)).size;
    const resumo = $('#perfil-resumo');
    resumo.replaceChildren();
    if (!meus.length) resumo.append('Você ainda não subiu nenhuma lista. Quando subir, ela aparece aqui.');
    else resumo.append('Você fez ', el('b', { text: plural(meus.length, 'envio', 'envios') }), ', com ', el('b', { text: plural(interacoes, 'interação', 'interações') }), `, de ${plural(eventos, 'evento', 'eventos')}.`);
    $('#perfil-lotes').replaceChildren(...meus.map((l) => el('li', {},
      el('span', { class: 'lote-texto' },
        el('b', { text: l.lista || l.arquivo || 'Lista sem nome' }),
        el('span', { text: `${l.arquivo ? `${l.arquivo}: ` : ''}${plural(l.linhas, 'interação', 'interações')}` }),
        el('span', { text: fmtQuando(l.criado_em) })),
      el('button', { type: 'button', class: 'botao botao-perigo', text: 'Excluir', 'data-lote': l.lote, 'aria-label': `Excluir o envio ${l.arquivo || ''}` }))));
  }

  async function salvarNome() {
    const nome = R.limpa($('#perfil-campo-nome').value).slice(0, 80);
    if (!nome) { avisa('Escreva o seu nome.', 'erro'); return; }
    const botao = $('#botao-salvar-nome');
    botao.disabled = true;
    try {
      const { data, error } = await sb.auth.updateUser({ data: { nome } });
      if (error) throw error;
      if (data && data.user) estado.usuario = data.user;
      estado.nome = nome;
      $('#perfil-nome').textContent = nome;
      const resposta = await sb.from(TABELA).update({ enviado_por_nome: nome }).eq('enviado_por_id', estado.usuario.id);
      if (resposta.error) throw resposta.error;
      avisa('Nome salvo. As suas listas já aparecem com ele.');
      await recarregar();
      desenhaPerfil();
    } catch (e) {
      avisa(`Não deu para salvar o nome. ${traduzErro(e)}`, 'erro');
    } finally {
      botao.disabled = false;
    }
  }

  async function excluirLote(lote) {
    const info = estado.calc.lotes.find((l) => l.lote === lote);
    if (!info) return;
    if (!window.confirm(`Excluir este envio da lista “${info.lista}” (${plural(info.linhas, 'interação', 'interações')})? Ele some para todo mundo.`)) return;
    const { error } = await sb.from(TABELA).delete().eq('lote', lote);
    if (error) { avisa(`Não deu para excluir. ${traduzErro(error)}`, 'erro'); return; }
    avisa('Envio excluído.');
    await recarregar();
    desenhaGerenciar();
    desenhaPerfil();
  }

  async function apagaLotes(lotes) {
    for (let i = 0; i < lotes.length; i += 50) {
      const { error } = await sb.from(TABELA).delete().in('lote', lotes.slice(i, i + 50));
      if (error) throw error;
    }
  }

  async function excluirLista(nome) {
    const info = estado.calc.listas.find((l) => l.lista === nome);
    if (!info) return;
    if (!window.confirm(`Excluir a lista “${nome}” inteira (${plural(info.linhas, 'interação', 'interações')})? Ela some para todo mundo.`)) return;
    try {
      await apagaLotes(info.envios.map((e) => e.lote));
      avisa('Lista excluída.');
    } catch (e) {
      avisa(`Não deu para excluir. ${traduzErro(e)}`, 'erro');
    }
    await recarregar();
    desenhaGerenciar();
    desenhaPerfil();
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

  // A biblioteca de Excel vem da internet e carrega em paralelo; espera um pouco por ela.
  const esperaXLSX = () => new Promise((pronto) => {
    const inicio = Date.now();
    const olha = () => { if (window.XLSX || Date.now() - inicio > 8000) pronto(); else setTimeout(olha, 250); };
    olha();
  });

  async function baixarDados() {
    if (!window.XLSX) await esperaXLSX();
    const cab = ['Evento', 'Data do evento', 'Empresa', 'MU', 'Setor', 'Nome', 'Cargo', 'Grade', 'Tipo de interação', 'Observações', 'Lista', 'Arquivo de origem', 'Enviado por'];
    const linhas = [...estado.linhas]
      .sort((a, b) => String(a.data_evento).localeCompare(String(b.data_evento)) || porNome(a.evento, b.evento) || porNome(a.empresa, b.empresa))
      .map((l) => [l.evento, R.semDia(l.data_evento) ? R.anoDe(l.data_evento) : fmtData(l.data_evento), l.empresa, l.mu || '', l.setor, l.nome || '', l.cargo || '', l.grade || '',
        l.interacao || '', l.observacoes || '', R.nomeDaLista(l), l.arquivo || '', quemEnviou(l)]);
    const hoje = new Date().toISOString().slice(0, 10);
    if (window.XLSX) {
      const ws = window.XLSX.utils.aoa_to_sheet([cab, ...linhas]);
      ws['!cols'] = [28, 14, 26, 10, 14, 24, 28, 14, 22, 32, 28, 28, 24].map((wch) => ({ wch }));
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

  const envio = { nomeArquivo: '', cabecalho: [], tabela: [], mapa: {}, previa: null, config: null };
  const nomeBase = (arquivo) => R.limpa(String(arquivo || '').replace(/\.[a-z0-9]{2,5}$/i, ''));
  const marcado = (nome) => { const r = document.querySelector(`input[name="${nome}"]:checked`); return r ? r.value : ''; };
  const marca = (nome, valor) => $$(`input[name="${nome}"]`).forEach((r) => { r.checked = r.value === valor; });
  const ROTULO_CURTO = { evento: 'Evento', data: 'Data', empresa: 'Empresa', mu: 'MU', setor: 'Setor', nome: 'Nome', sobrenome: 'Sobrenome', cargo: 'Cargo',
    grade: 'Grade', email: 'E-mail', interacao: 'Tipo de interação', observacoes: 'Observações' };

  // Lista nova ou atualização de uma lista que já subiu (somando o que é novo ou trocando a versão inteira).
  function configEnvio() {
    const tipo = marcado('tipo-envio') === 'atualizar' && $('#lista-existente').value ? 'atualizar' : 'nova';
    const lista = tipo === 'atualizar' ? $('#lista-existente').value : (R.limpa($('#nome-lista').value) || nomeBase(envio.nomeArquivo) || 'Lista sem nome');
    const modo = tipo === 'atualizar' && marcado('modo-atualizar') === 'trocar' ? 'trocar' : 'somar';
    return { tipo, lista, modo };
  }

  function mostraTipo() {
    const tipo = marcado('tipo-envio');
    $('#campo-nome-lista').hidden = tipo === 'atualizar';
    $('#campos-atualizar').hidden = tipo !== 'atualizar';
  }

  function abreSubir() {
    if (!estado.calc) calcula();
    Object.assign(envio, { nomeArquivo: '', cabecalho: [], tabela: [], mapa: {}, previa: null, config: null });
    $('#arquivo').value = '';
    $('#envio-resultado').hidden = true;
    $('#envio-falta-evento').hidden = true;
    $('#evento-padrao').value = '';
    $('#data-padrao').value = '';
    $('#nome-lista').value = '';
    const ano = new Date().getFullYear();
    preencheSelect($('#ano-padrao'), [ano - 2, ano - 1, ano, ano + 1].map((a) => [String(a), String(a)]), String(ano));
    const listas = estado.calc.listas;
    preencheSelect($('#lista-existente'), listas.length ? listas.map((l) => [l.lista, `${l.lista} (${plural(l.linhas, 'interação', 'interações')})`]) : [['', 'Ainda não há listas no mapa']], '');
    $$('input[name="tipo-envio"]').forEach((r) => { if (r.value === 'atualizar') r.disabled = !listas.length; });
    marca('tipo-envio', 'nova');
    marca('modo-atualizar', 'somar');
    mostraTipo();
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
    // Se já existe uma lista com o mesmo nome do arquivo, sugere que é uma atualização dela.
    const base = nomeBase(envio.nomeArquivo);
    $('#nome-lista').value = base;
    const mesma = estado.calc.listas.find((l) => R.chave(l.lista) === R.chave(base));
    if (mesma) { marca('tipo-envio', 'atualizar'); $('#lista-existente').value = mesma.lista; }
    mostraTipo();
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
    const config = configEnvio();
    // Ao trocar uma lista inteira, a versão anterior dela não conta como "já está no mapa".
    const existentes = config.tipo === 'atualizar' && config.modo === 'trocar' ? estado.linhas.filter((l) => R.nomeDaLista(l) !== config.lista) : estado.linhas;
    envio.config = config;
    envio.previa = R.preparaLinhas(envio.tabela, envio.mapa, {
      existentes,
      apelidos: estado.apelidos,
      eventoPadrao: $('#evento-padrao').value,
      dataPadrao: $('#data-padrao').value,
      anoPadrao: $('#ano-padrao').value,
      eventosExtras: EVENTOS_SUGERIDOS.map(([evento, data]) => ({ evento, data })),
      lista: config.lista,
    });
    desenhaResumoEnvio();
  }

  const contagemTexto = (valores, limite = 6) => {
    const m = new Map();
    for (const v of valores) if (v) m.set(v, (m.get(v) || 0) + 1);
    const ordem = [...m.entries()].sort((a, b) => b[1] - a[1] || porNome(a[0], b[0]));
    const texto = ordem.slice(0, limite).map(([v, n]) => `${v} ${fmtN(n)}`).join(', ');
    return ordem.length > limite ? `${texto} e mais ${ordem.length - limite}` : texto;
  };

  function desenhaResumoEnvio() {
    const p = envio.previa;
    const config = envio.config;
    const ig = p.ignoradas;
    const n = p.linhas.length;
    const semColunaEvento = envio.mapa.evento === undefined;
    const semColunaData = envio.mapa.data === undefined;
    $('#envio-falta-evento').hidden = !(semColunaEvento || semColunaData || ig.semEvento || ig.semData);
    $('#campo-evento-padrao').hidden = !(semColunaEvento || ig.semEvento);
    $('#envio-pergunta-texto').textContent = (semColunaEvento || ig.semEvento)
      ? 'De qual evento é esta lista? A planilha não diz.'
      : 'A planilha não tem a data de todos os eventos. Sem data, a interação entra no ano escolhido; se souber o dia, escolha a data.';

    const blocos = [];
    if (n) {
      const pessoas = new Set(p.linhas.filter((l) => l.nome).map((l) => `${l.empresa}|${R.chave(l.nome)}`)).size;
      const empresas = new Set(p.linhas.map((l) => l.empresa)).size;
      blocos.push(el('p', { class: 'resumo-grande' }, V.icone('participou'),
        el('span', { text: `${plural(n, 'interação', 'interações')} de ${plural(pessoas, 'pessoa', 'pessoas')} e ${plural(empresas, 'empresa', 'empresas')} vão entrar no mapa` })));
      const anteriores = estado.linhas.filter((l) => R.nomeDaLista(l) === config.lista).length;
      let textoLista = `Lista nova: ${config.lista}.`;
      if (config.tipo === 'atualizar') {
        textoLista = config.modo === 'trocar'
          ? `Lista ${config.lista}: a versão anterior (${plural(anteriores, 'interação', 'interações')}) sai do mapa e entra esta.`
          : `Lista ${config.lista}: entram só as interações que ainda não estavam no mapa.`;
      }
      blocos.push(el('p', { class: 'nota nota-forte', text: textoLista }));
      blocos.push(el('p', { class: 'nota', text: `Eventos: ${p.eventos.map((e) => `${e.evento} (${fmtData(e.data)})`).join(', ')}.` }));
      blocos.push(el('p', { class: 'nota', text: `Tipos de interação: ${contagemTexto(p.linhas.map((l) => l.interacao))}.` }));
      if (p.linhas.some((l) => l.mu)) blocos.push(el('p', { class: 'nota', text: `MU: ${contagemTexto(p.linhas.map((l) => l.mu))}.` }));
      blocos.push(el('p', { class: 'nota', text: `Grade: ${contagemTexto(p.linhas.map((l) => l.grade))}.` }));
      for (const x of p.primeirasDoAno) {
        blocos.push(el('p', { class: 'nota', text: `Para ${plural(x.empresas, 'empresa', 'empresas')}, esta é a primeira interação de ${x.ano} no mapa.` }));
      }
    } else {
      let motivo = 'Nada para colocar no mapa ainda.';
      if (envio.mapa.empresa === undefined && envio.mapa.email === undefined) motivo = 'Não achamos a coluna com o nome da empresa. Abra “Ajustar colunas” e escolha qual é.';
      else if (ig.semEvento || ig.semData) motivo = 'Falta dizer de qual evento é esta lista (logo acima).';
      else if (ig.jaExistiam) motivo = 'Nada de novo: todas as interações desta planilha já estão no mapa.';
      blocos.push(el('p', { class: 'resumo-grande nada' }, V.icone('participou'), el('span', { text: motivo })));
    }
    const lidas = R.CAMPOS.filter((c) => envio.mapa[c.id] !== undefined).map((c) => ROTULO_CURTO[c.id] || c.rotulo);
    blocos.push(el('p', { class: 'nota', text: `Colunas lidas da planilha: ${lidas.join(', ') || 'nenhuma'}.` }));
    const fora = [
      [ig.jaExistiam, 'interação já estava no mapa', 'interações já estavam no mapa'],
      [ig.repetidas, 'linha exatamente igual a outra', 'linhas exatamente iguais a outras'],
      [ig.capgemini, 'pessoa da própria Capgemini', 'pessoas da própria Capgemini'],
      [ig.semEmpresa, 'linha sem empresa', 'linhas sem empresa'],
      [ig.exemplo, 'linha de exemplo do modelo', 'linhas de exemplo do modelo'],
    ].filter(([q]) => q > 0).map(([q, um, varios]) => plural(q, um, varios));
    if (fora.length) blocos.push(el('p', { class: 'nota', text: `Ficam de fora: ${fora.join('; ')}.` }));
    $('#envio-resumo').replaceChildren(...blocos);
    $('#envio-amostra').replaceChildren(...p.linhas.slice(0, 5).map((l) => el('li', {},
      el('b', { text: l.empresa }),
      el('span', { text: [l.nome, l.cargo, l.interacao].filter(Boolean).join(', ') || 'Pessoa não informada' }))));
    const botao = $('#botao-enviar');
    botao.disabled = n === 0;
    botao.textContent = n ? `Colocar no mapa (${fmtN(n)})` : 'Colocar no mapa';
  }

  async function enviar() {
    atualizaPrevia();
    const p = envio.previa;
    const config = envio.config;
    if (!p || !p.linhas.length) return;
    const botao = $('#botao-enviar');
    const erro = $('#envio-erro');
    erro.hidden = true;
    botao.disabled = true;
    botao.textContent = 'Enviando…';
    const lote = novoId();
    const anteriores = config.tipo === 'atualizar' && config.modo === 'trocar'
      ? ((estado.calc.listas.find((l) => l.lista === config.lista) || { envios: [] }).envios.map((e) => e.lote)) : [];
    const registros = p.linhas.map((l) => ({ ...l, lista: config.lista, lote, arquivo: envio.nomeArquivo, enviado_por: estado.usuario.email || '', enviado_por_nome: estado.nome }));
    let enviados = 0;
    try {
      for (let i = 0; i < registros.length; i += 500) {
        const parte = registros.slice(i, i + 500);
        const { error } = await sb.from(TABELA).insert(parte);
        if (error) throw error;
        enviados += parte.length;
      }
      for (const x of p.setoresParaAtualizar) {
        await sb.from(TABELA).update({ setor: x.setor }).eq('empresa', x.empresa).eq('setor', R.SEM_SETOR);
      }
      // Na troca, a versão anterior só sai depois que a nova entrou inteira.
      if (anteriores.length) await apagaLotes(anteriores);
      fechaJanela($('#dlg-subir'));
      estado.evento = p.eventos.length === 1 ? p.eventos[0].evento : '';
      estado.empresa = '';
      estado.pessoa = '';
      let texto = `Pronto: ${plural(enviados, 'interação entrou', 'interações entraram')} no mapa e o envio ficou salvo no seu perfil.`;
      if (config.tipo === 'atualizar') {
        texto = config.modo === 'trocar'
          ? `Pronto: a lista ${config.lista} foi trocada pela versão nova (${plural(enviados, 'interação', 'interações')}).`
          : `Pronto: ${plural(enviados, 'interação nova entrou', 'interações novas entraram')} na lista ${config.lista}.`;
      }
      avisa(`${texto} Quem está com o site aberto já está vendo.`);
      await recarregar();
      rolaPara('#empresas');
    } catch (e) {
      erro.textContent = enviados
        ? `Entraram ${fmtN(enviados)} interações e o resto falhou: ${traduzErro(e)} Para tentar de novo, exclua este envio em “Gerenciar listas” e suba outra vez.`
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
    $('#busca').addEventListener('input', (e) => { estado.busca = e.target.value; desenhaLista(); });

    $('#botao-subir').addEventListener('click', abreSubir);
    $$('[data-acao="subir"]').forEach((b) => b.addEventListener('click', abreSubir));
    $('#botao-gerenciar').addEventListener('click', abreGerenciar);
    $('#botao-perfil').addEventListener('click', abrePerfil);
    $('#botao-salvar-nome').addEventListener('click', salvarNome);
    $('#perfil-lotes').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-lote]');
      if (b) excluirLote(b.dataset.lote);
    });

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
    $('#ano-padrao').addEventListener('change', atualizaPrevia);
    $$('input[name="tipo-envio"], input[name="modo-atualizar"]').forEach((r) => r.addEventListener('change', () => { mostraTipo(); atualizaPrevia(); }));
    $('#lista-existente').addEventListener('change', atualizaPrevia);
    $('#nome-lista').addEventListener('input', atualizaPrevia);
    $('#botao-enviar').addEventListener('click', enviar);

    $('#lista-lotes').addEventListener('click', (e) => {
      const lista = e.target.closest('button[data-lista]');
      if (lista) { excluirLista(lista.dataset.lista); return; }
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
    $$('.aba').forEach((b) => b.addEventListener('click', () => trocaAba(b.dataset.aba)));
    $('#busca-grades').addEventListener('input', (e) => { estado.tabela.busca = e.target.value; desenhaAbaGrades(); });
    $('#botao-baixar-grades').addEventListener('click', baixarGrades);
    $('#botao-limpar-selecao').addEventListener('click', () => { estado.tabela.sel = { empresa: '', grade: '' }; desenhaAbaGrades(); });
    window.addEventListener('hashchange', () => { const aba = window.location.hash === '#grades' ? 'grades' : 'mapa'; if (aba !== estado.aba && estado.calc) trocaAba(aba); });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && estado.usuario) agendaRecarga();
    });
  }

  iniciar();
})();
