/*
 * Mapa de cruzamentos: clientes × eventos
 * Site que lê e grava no Supabase e se atualiza sozinho quando alguém sobe uma lista.
 */
(() => {
  'use strict';

  const R = window.Regras;
  const cfg = window.CRUZ_CONFIG || {};
  const TABELA = 'cruz_interacoes';
  const TABELA_APELIDOS = 'cruz_apelidos';
  const COLUNAS = 'id,evento,data_evento,empresa,setor,nome,cargo,interacao,observacoes,lote,arquivo,enviado_por,criado_em';
  const ARQUIVO_EXEMPLO = 'Dados de exemplo (fictícios)';
  const LIMITE_MAPA = 30;

  // Sugestões de eventos no campo "Evento" (o site também usa os que já estão no banco).
  const EVENTOS_SUGERIDOS = [
    ['FEBRABAN Tech 2026', '2026-08-24'], ['CONAREC 2026', '2026-09-23'], ['Arcos', '2026-10-26'], ['BBDW 2026', '2026-10-27'],
    ['Innovation Day (Databricks)', '2026-11-04'], ['Almoço CQCS', '2026-11-04'], ["Rec'n'Play 2026", '2026-11-11'],
    ['Insurance Day', '2026-11-25'], ['NRF 2027', '2027-01-10'], ['MS AI Tour SP 2027', '2027-03-24'],
    ['SAP Now 2026', ''], ['ServiceNow Summit 2026', ''],
  ];

  // Dados fictícios para ver o painel funcionando antes da primeira lista real.
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
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const numeroBR = new Intl.NumberFormat('pt-BR');
  const fmtN = (n) => numeroBR.format(Number(n) || 0);
  const partes = (s) => String(s || '').slice(0, 10).split('-');
  const fmtData = (s) => { const [a, m, d] = partes(s); return a && m && d ? `${d}/${m}/${a}` : ''; };
  const fmtDataCurta = (s) => { const [a, m, d] = partes(s); return a && m && d ? `${Number(d)} ${MESES[Number(m) - 1] || m} ${a}` : ''; };
  const fmtQuando = (iso) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  const plural = (n, um, varios) => `${fmtN(n)} ${Number(n) === 1 ? um : varios}`;
  const porNome = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), 'pt-BR');
  const poucoMovimento = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const novoId = () => {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.floor(Math.random() * 16);
      return (c === 'x' ? r : (r % 4) + 8).toString(16);
    });
  };
  const el = (tag, props = {}, ...filhos) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('data-') || k.startsWith('aria-')) n.setAttribute(k, v);
      else n[k] = v;
    }
    n.append(...filhos.filter((f) => f !== null && f !== undefined && f !== false));
    return n;
  };
  const celula = (texto, classe) => el('td', { class: classe, text: texto ?? '' });
  const preencheSelect = (sel, opcoes, valor) => {
    sel.replaceChildren(...opcoes.map(([v, t]) => new Option(t, v)));
    sel.value = opcoes.some(([v]) => v === valor) ? valor : (opcoes[0] ? opcoes[0][0] : '');
  };

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

  /* ---------- Estado ---------- */

  const estado = {
    usuario: null,
    linhas: [],
    apelidos: [],
    calc: null,
    setor: 'Todos',
    empresa: '',
    busca: '',
    ordem: { campo: 'eventos', direcao: -1 },
    mapaCompleto: false,
    aoVivo: 'conectando',
    online: 1,
  };
  let sb = null;
  let canal = null;

  const mostraTela = (nome) => { $$('.tela').forEach((t) => { t.hidden = t.id !== `tela-${nome}`; }); };

  /* ---------- Início, login e saída ---------- */

  async function iniciar() {
    ligaEventos();
    const logo = $('#logo');
    if (logo) {
      const mostraLogo = () => { if (logo.naturalWidth > 0) logo.hidden = false; };
      logo.addEventListener('load', mostraLogo);
      if (logo.complete) mostraLogo();
    }
    const url = String(cfg.supabaseUrl || '').trim().replace(/\/+$/, '');
    const chave = String(cfg.supabaseKey || '').trim();
    if (!/^https:\/\/[^/]+$/.test(url) || chave.length < 20 || /COLE_AQUI/.test(url + chave)) { mostraTela('config'); return; }
    if (!R || !window.supabase || typeof window.supabase.createClient !== 'function' || !window.d3) {
      $('#erro-texto').textContent = 'Os arquivos supabase.js e d3.min.js precisam estar na mesma pasta do site. Confira se eles subiram para o GitHub e recarregue a página.';
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
    document.body.classList.add('atualizando');
    try {
      const [linhas, apelidos] = await Promise.all([
        buscaTudo(TABELA, COLUNAS, 'id'),
        buscaTudo(TABELA_APELIDOS, 'apelido,empresa', 'apelido'),
      ]);
      estado.linhas = linhas;
      estado.apelidos = apelidos;
      calcula();
      desenhaTudo();
    } catch (e) {
      avisa(`Não deu para carregar os dados. ${traduzErro(e)}`, 'erro');
      calcula();
      desenhaTudo();
    } finally {
      recarregando = false;
      document.body.classList.remove('atualizando');
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
      avisa(`Chegou lista nova: ${plural(novasDeOutros.length, 'linha', 'linhas')} de ${eventos.join(', ')}${quem.length ? `, enviada por ${quem.join(', ')}` : ''}.`);
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
    if (estado.aoVivo === 'ok') {
      texto.textContent = estado.online > 1 ? `Ao vivo: ${plural(estado.online, 'pessoa', 'pessoas')} com o site aberto` : 'Ao vivo: só você com o site aberto agora';
    } else if (estado.aoVivo === 'conectando') texto.textContent = 'Conectando ao vivo…';
    else texto.textContent = 'Sem atualização ao vivo agora; tentando de novo';
  }

  /* ---------- Cálculos ---------- */

  function calcula() {
    const linhas = estado.linhas;
    estado.calc = {
      resumo: R.resumo(linhas),
      empresas: R.porEmpresa(linhas),
      cruzamentos: R.cruzamentos(linhas),
      porEvento: R.porEvento(linhas),
      lotes: R.lotes(linhas),
    };
    const setores = new Set(estado.calc.resumo.map((r) => r.setor));
    if (!setores.has(estado.setor)) estado.setor = 'Todos';
    if (estado.empresa && !estado.calc.empresas.some((e) => e.empresa === estado.empresa)) estado.empresa = '';
  }

  const setorDaEmpresa = (empresa) => (estado.calc.empresas.find((e) => e.empresa === empresa) || {}).setor || R.SEM_SETOR;

  /* ---------- Desenho do painel ---------- */

  function desenhaTudo() {
    if (!estado.calc) calcula();
    const temDados = estado.linhas.length > 0;
    $('#vazio').hidden = temDados;
    $('#painel').hidden = !temDados;
    $('#faixa-exemplo').hidden = !estado.linhas.some((l) => l.arquivo === ARQUIVO_EXEMPLO);
    $('#botao-baixar').disabled = !temDados;
    desenhaFiltros();
    if (!temDados) return;
    desenhaDestaque();
    desenhaKpis();
    desenhaMapa();
    desenhaJornada();
    desenhaEmpresas();
    desenhaEventos();
    desenhaLotes();
    desenhaAjustes();
  }

  function desenhaFiltros() {
    const setores = estado.calc.resumo.map((r) => r.setor).filter((s) => s !== 'Todos');
    preencheSelect($('#filtro-setor'), [['Todos', 'Todos os setores'], ...setores.map((s) => [s, s])], estado.setor);
    const empresas = estado.calc.empresas.map((e) => e.empresa).sort(porNome);
    preencheSelect($('#filtro-empresa'), [['', 'Escolha uma empresa'], ...empresas.map((e) => [e, e])], estado.empresa);
  }

  function desenhaDestaque() {
    const p = $('#destaque');
    const total = estado.calc.resumo[0];
    const top = [...estado.calc.empresas].sort((a, b) => b.eventos - a.eventos || b.pessoas - a.pessoas || porNome(a.empresa, b.empresa))[0];
    p.replaceChildren();
    if (!total || !top) return;
    if (total.empresas === 1) {
      p.append('Por enquanto, ', el('b', { text: top.empresa }), ` é a única empresa no painel, com ${plural(top.eventos, 'evento', 'eventos')}.`);
    } else if (total.recorrentes === 0) {
      p.append(el('b', { text: fmtN(total.empresas) }), ' empresas cruzaram com a Capgemini, cada uma em um evento até agora.');
    } else {
      p.append(el('b', { text: fmtN(total.recorrentes) }), ' das ', el('b', { text: fmtN(total.empresas) }),
        ' empresas cruzaram com a Capgemini em mais de um evento. Quem mais apareceu: ', el('b', { text: top.empresa }),
        `, em ${plural(top.eventos, 'evento', 'eventos')}.`);
    }
  }

  function desenhaKpis() {
    const r = estado.calc.resumo.find((x) => x.setor === estado.setor) || estado.calc.resumo[0];
    for (const campo of ['empresas', 'recorrentes', 'pessoas', 'eventos']) {
      const alvo = $(`#kpi-${campo}`);
      if (alvo) alvo.textContent = r ? fmtN(r[campo]) : '—';
    }
    const rotulo = $('#kpis-setor');
    if (rotulo) rotulo.textContent = estado.setor === 'Todos' ? 'Todos os setores' : `Setor: ${estado.setor}`;
  }

  const criaDica = (caixa) => {
    const dica = el('div', { class: 'dica', hidden: true });
    caixa.append(dica);
    let relogio = 0;
    const mostra = (evento, linhas) => {
      clearTimeout(relogio);
      dica.replaceChildren(...linhas.map(([texto, classe]) => el('div', { class: classe, text: texto })));
      dica.hidden = false;
      const r = caixa.getBoundingClientRect();
      const px = evento.clientX - r.left + caixa.scrollLeft;
      const py = evento.clientY - r.top + caixa.scrollTop;
      const lw = dica.offsetWidth;
      const lh = dica.offsetHeight;
      const minX = caixa.scrollLeft + 4;
      const maxX = caixa.scrollLeft + caixa.clientWidth - lw - 4;
      let x = px + 14;
      if (x > maxX) x = px - lw - 14;
      x = Math.max(minX, Math.min(maxX, x));
      let y = py - lh - 12;
      if (y < 4) y = py + 16;
      y = Math.max(4, Math.min(caixa.scrollHeight - lh - 4, y));
      dica.style.left = `${x}px`;
      dica.style.top = `${y}px`;
      if (evento.pointerType === 'touch') relogio = setTimeout(() => { dica.hidden = true; }, 3000);
    };
    const esconde = (evento) => {
      if (evento && evento.pointerType === 'touch') return;
      clearTimeout(relogio);
      dica.hidden = true;
    };
    return { mostra, esconde };
  };

  const medidor = (svg) => (texto, classe) => {
    const t = svg.append('text').attr('class', classe).text(texto);
    const w = t.node().getComputedTextLength();
    t.remove();
    return w;
  };

  const encurta = (sel, maximo) => {
    const node = sel.node();
    if (node.getComputedTextLength() <= maximo) return;
    let texto = node.textContent;
    while (texto.length > 1 && node.getComputedTextLength() > maximo) {
      texto = texto.slice(0, -1);
      node.textContent = `${texto.trimEnd()}…`;
    }
  };

  const abreJornada = (empresa) => {
    estado.empresa = empresa;
    desenhaTudo();
    requestAnimationFrame(() => {
      const alvo = $('#jornada');
      if (alvo) alvo.scrollIntoView({ behavior: poucoMovimento() ? 'auto' : 'smooth', block: 'start' });
    });
  };

  function desenhaMapa() {
    const caixa = $('#grafico-mapa');
    caixa.replaceChildren();
    const setor = estado.setor;
    const escolhida = estado.empresa;
    const todas = estado.calc.cruzamentos;
    const eventos = [...d3.group(todas, (r) => r.evento)].map(([evento, rs]) => ({ evento, data: d3.min(rs, (r) => r.data) }))
      .sort((a, b) => String(a.data).localeCompare(String(b.data)) || porNome(a.evento, b.evento));
    const linhas = todas.filter((r) => setor === 'Todos' || r.setor === setor);
    const ordenadas = d3.rollups(linhas, (rs) => ({ n: new Set(rs.map((r) => r.evento)).size, p: d3.sum(rs, (r) => r.pessoas) }), (r) => r.empresa)
      .sort((a, b) => b[1].n - a[1].n || b[1].p - a[1].p || porNome(a[0], b[0]))
      .map(([empresa]) => empresa);
    if (!ordenadas.length || !eventos.length) {
      caixa.append(el('p', { class: 'nota', text: 'Nenhuma empresa deste setor nos eventos registrados.' }));
      return;
    }
    const cortado = !estado.mapaCompleto && ordenadas.length > LIMITE_MAPA;
    const empresas = cortado ? ordenadas.slice(0, LIMITE_MAPA) : ordenadas.slice();
    if (cortado && escolhida && ordenadas.includes(escolhida) && !empresas.includes(escolhida)) empresas.push(escolhida);

    const W = Math.max(300, caixa.clientWidth);
    const svg = d3.select(caixa).append('svg').attr('class', 'svg').attr('role', 'img').attr('aria-label', 'Mapa de empresas por evento');
    const mede = medidor(svg);
    const larguraNomes = Math.min(W * 0.4, Math.max(...empresas.map((e) => mede(e, 'rotulo-linha clicavel'))) + 6);
    const xNomes = Math.ceil(larguraNomes) + 12;
    const largEventos = eventos.map((e) => mede(e.evento, 'rotulo-coluna'));
    const k = Math.SQRT1_2;
    const minCol = 44;
    let x0 = xNomes;
    let colW = Math.max(minCol, (W - x0 - 6) / eventos.length);
    const sobra = Math.max(0, ...largEventos.map((l, j) => l * k - (x0 + colW * (j + 0.5)) + 10));
    if (sobra > 0) {
      x0 += sobra;
      colW = Math.max(minCol, (W - x0 - 6) / eventos.length);
    }
    const topo = Math.ceil(Math.max(...largEventos) * k + 18);
    const linhaH = 34;
    const largura = Math.ceil(Math.max(W, x0 + colW * eventos.length + 6));
    const altura = topo + linhaH * empresas.length + 8;
    svg.attr('viewBox', `0 0 ${largura} ${altura}`).attr('width', largura <= W ? '100%' : largura);
    if (largura > W) svg.attr('height', altura);
    const cx = (j) => x0 + colW * (j + 0.5);
    const cy = (i) => topo + linhaH * i + linhaH / 2;

    const iEscolhida = empresas.indexOf(escolhida);
    if (iEscolhida >= 0) svg.append('rect').attr('class', 'faixa-escolhida').attr('x', 0).attr('y', topo + linhaH * iEscolhida).attr('width', largura).attr('height', linhaH).attr('rx', 6);

    const grade = svg.append('g');
    empresas.forEach((e, i) => grade.append('line').attr('class', 'grade').attr('x1', x0).attr('x2', x0 + colW * eventos.length).attr('y1', cy(i)).attr('y2', cy(i)));
    eventos.forEach((ev, j) => grade.append('line').attr('class', 'grade').attr('x1', cx(j)).attr('x2', cx(j)).attr('y1', topo - 2).attr('y2', altura - 6));
    eventos.forEach((ev, j) => svg.append('text').attr('class', 'rotulo-coluna').attr('text-anchor', 'end')
      .attr('transform', `translate(${cx(j) - 4},${topo - 7}) rotate(45)`).text(ev.evento));

    const porCelula = new Map(linhas.map((r) => [`${r.empresa}\u0000${r.evento}`, r]));
    const raioMax = Math.max(6, Math.min(colW, linhaH) / 2 - 3);
    const raio = d3.scaleSqrt([0, d3.max(linhas, (r) => r.pessoas) || 1], [0, raioMax]);
    const dica = criaDica(caixa);
    const celulas = svg.append('g');
    empresas.forEach((e, i) => eventos.forEach((ev, j) => {
      const r = porCelula.get(`${e}\u0000${ev.evento}`);
      if (!r) { celulas.append('circle').attr('class', 'vazio').attr('cx', cx(j)).attr('cy', cy(i)).attr('r', 2); return; }
      const texto = [[r.empresa, 'dica-titulo'], [r.evento, 'dica-sub'], [fmtDataCurta(r.data), 'dica-sub'], [plural(r.pessoas, 'pessoa', 'pessoas'), '']];
      if (r.interacoes && r.interacoes.length) texto.push([r.interacoes.join(', '), 'dica-sub']);
      const bolinha = celulas.append('circle').attr('class', e === escolhida ? 'bolinha escolhida' : 'bolinha').attr('cx', cx(j)).attr('cy', cy(i)).attr('r', Math.max(5, raio(r.pessoas)));
      bolinha
        .on('pointerenter pointermove', (event) => { bolinha.classed('em-foco', true); dica.mostra(event, texto); })
        .on('pointerleave', (event) => { bolinha.classed('em-foco', false); dica.esconde(event); });
    }));

    empresas.forEach((e, i) => {
      const rotulo = svg.append('text')
        .attr('class', e === escolhida ? 'rotulo-linha clicavel escolhida' : 'rotulo-linha clicavel')
        .attr('x', xNomes - 12).attr('y', cy(i)).attr('dy', '0.35em').attr('text-anchor', 'end')
        .attr('tabindex', 0).attr('role', 'button')
        .text(e);
      encurta(rotulo, larguraNomes);
      rotulo
        .on('click', () => abreJornada(e))
        .on('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); abreJornada(e); } });
    });

    if (ordenadas.length > LIMITE_MAPA) {
      const botao = el('button', {
        type: 'button',
        class: 'botao botao-fantasma mais',
        text: estado.mapaCompleto ? `Mostrar só as ${LIMITE_MAPA} com mais eventos` : `Mostrar todas as ${fmtN(ordenadas.length)} empresas`,
      });
      botao.addEventListener('click', () => { estado.mapaCompleto = !estado.mapaCompleto; desenhaMapa(); });
      caixa.append(botao);
    }
  }

  function desenhaJornada() {
    const empresa = estado.empresa;
    $('#jornada-dica').hidden = Boolean(empresa);
    $('#jornada-conteudo').hidden = !empresa;
    $('#botao-fechar-jornada').hidden = !empresa;
    if (!empresa) return;
    const info = estado.calc.empresas.find((e) => e.empresa === empresa);
    $('#jornada-nome').textContent = empresa;
    $('#j-setor').textContent = info ? info.setor : '';
    $('#j-eventos').textContent = info ? fmtN(info.eventos) : '';
    $('#j-pessoas').textContent = info ? fmtN(info.pessoas) : '';
    $('#j-primeiro').textContent = info ? fmtData(info.primeiro_contato) : '';
    $('#j-ultimo').textContent = info ? fmtData(info.ultimo_contato) : '';
    const linhas = estado.linhas.filter((l) => l.empresa === empresa)
      .sort((a, b) => String(a.data_evento).localeCompare(String(b.data_evento)) || porNome(a.evento, b.evento) || porNome(a.nome, b.nome));
    $('#jornada-linhas').replaceChildren(...linhas.map((l) => el('tr', {},
      celula(fmtData(l.data_evento)), celula(l.evento), celula(l.nome || 'Não informado'), celula(l.cargo || ''),
      celula(l.interacao || '', 'some-estreito'), celula(l.observacoes || '', 'some-estreito'))));
  }

  const NUMERICOS = new Set(['eventos', 'pessoas']);

  function desenhaEmpresas() {
    const { campo, direcao } = estado.ordem;
    const busca = R.chave(estado.busca);
    const maxEventos = d3.max(estado.calc.empresas, (e) => e.eventos) || 1;
    const linhas = estado.calc.empresas
      .filter((e) => (estado.setor === 'Todos' || e.setor === estado.setor) && (!busca || R.chave(`${e.empresa} ${e.setor}`).includes(busca)))
      .sort((a, b) => {
        const c = NUMERICOS.has(campo) ? a[campo] - b[campo] : porNome(a[campo], b[campo]);
        return c * direcao || b.eventos - a.eventos || porNome(a.empresa, b.empresa);
      });
    $$('#tabela-empresas th[data-campo]').forEach((th) => {
      th.setAttribute('aria-sort', th.dataset.campo === campo ? (direcao === 1 ? 'ascending' : 'descending') : 'none');
    });
    const corpo = $('#empresas-linhas');
    if (!linhas.length) {
      corpo.replaceChildren(el('tr', {}, el('td', { colSpan: 5, class: 'nota', text: 'Nenhuma empresa encontrada.' })));
      return;
    }
    corpo.replaceChildren(...linhas.map((e) => {
      const barra = el('span', { class: 'barra' });
      barra.style.width = `${(e.eventos / maxEventos) * 100}%`;
      const tr = el('tr', { tabIndex: 0, 'data-empresa': e.empresa, class: e.empresa === estado.empresa ? 'escolhida' : '' },
        celula(e.empresa),
        celula(e.setor, 'some-estreito'),
        el('td', { class: 'num' }, el('span', { class: 'celula-barra' }, el('span', { class: 'trilho' }, barra), el('span', { text: fmtN(e.eventos) }))),
        celula(fmtN(e.pessoas), 'num'),
        celula(fmtData(e.ultimo_contato), 'some-estreito'));
      return tr;
    }));
  }

  function desenhaEventos() {
    const caixa = $('#grafico-eventos');
    caixa.replaceChildren();
    const linhas = estado.calc.porEvento.filter((r) => r.setor === estado.setor)
      .sort((a, b) => String(a.data).localeCompare(String(b.data)) || porNome(a.evento, b.evento));
    if (!linhas.length) { caixa.append(el('p', { class: 'nota', text: 'Nenhum evento com empresas deste setor.' })); return; }
    const W = Math.max(280, caixa.clientWidth);
    const svg = d3.select(caixa).append('svg').attr('class', 'svg').attr('width', '100%').attr('role', 'img').attr('aria-label', 'Empresas em cada evento');
    const mede = medidor(svg);
    const larguraNomes = Math.min(W * 0.46, Math.max(...linhas.map((r) => Math.max(mede(r.evento, 'rotulo-linha'), mede(fmtDataCurta(r.data), 'rotulo-sub')))));
    const xb = Math.ceil(larguraNomes) + 14;
    const larguraValor = Math.max(...linhas.map((r) => mede(fmtN(r.empresas), 'valor'))) + 12;
    const linhaH = 48;
    const barraH = 22;
    const x = d3.scaleLinear([0, d3.max(linhas, (r) => r.empresas) || 1], [0, Math.max(40, W - xb - larguraValor)]);
    const altura = linhaH * linhas.length + 4;
    svg.attr('viewBox', `0 0 ${W} ${altura}`);
    const dica = criaDica(caixa);
    linhas.forEach((r, i) => {
      const y0 = i * linhaH;
      const yb = y0 + (linhaH - barraH) / 2;
      const g = svg.append('g');
      const nome = g.append('text').attr('class', 'rotulo-linha').attr('x', xb - 14).attr('y', y0 + linhaH / 2 - 4).attr('text-anchor', 'end').text(r.evento);
      encurta(nome, larguraNomes);
      g.append('text').attr('class', 'rotulo-sub').attr('x', xb - 14).attr('y', y0 + linhaH / 2 + 12).attr('text-anchor', 'end').text(fmtDataCurta(r.data));
      const wJa = x(r.ja_conheciam);
      const wNovas = x(r.primeira_vez);
      const vao = wJa > 0 && wNovas > 0 ? 2 : 0;
      if (wJa > 0) g.append('rect').attr('class', 'barra-volta').attr('x', xb).attr('y', yb).attr('width', wJa).attr('height', barraH).attr('rx', 4);
      if (wNovas > 0) g.append('rect').attr('class', 'barra-nova').attr('x', xb + wJa + vao).attr('y', yb).attr('width', Math.max(0, wNovas - vao)).attr('height', barraH).attr('rx', 4);
      if (wJa >= 20) g.append('text').attr('class', 'dentro-volta').attr('x', xb + wJa / 2).attr('y', yb + barraH / 2).attr('dy', '0.35em').attr('text-anchor', 'middle').text(fmtN(r.ja_conheciam));
      if (wNovas - vao >= 20) g.append('text').attr('class', 'dentro-nova').attr('x', xb + wJa + vao + (wNovas - vao) / 2).attr('y', yb + barraH / 2).attr('dy', '0.35em').attr('text-anchor', 'middle').text(fmtN(r.primeira_vez));
      g.append('text').attr('class', 'valor').attr('x', xb + wJa + wNovas + 8).attr('y', yb + barraH / 2).attr('dy', '0.35em').text(fmtN(r.empresas));
      const texto = [
        [r.evento, 'dica-titulo'],
        [fmtDataCurta(r.data), 'dica-sub'],
        [`${plural(r.empresas, 'empresa', 'empresas')} e ${plural(r.pessoas, 'pessoa', 'pessoas')}`, ''],
        [`${fmtN(r.ja_conheciam)} já tinham cruzado com a gente`, ''],
        [`${fmtN(r.primeira_vez)} no primeiro contato`, ''],
      ];
      g.append('rect').attr('class', 'alvo').attr('x', 0).attr('y', y0).attr('width', W).attr('height', linhaH)
        .on('pointerenter pointermove', (event) => dica.mostra(event, texto))
        .on('pointerleave', (event) => dica.esconde(event));
    });
  }

  function desenhaLotes() {
    const corpo = $('#lotes-linhas');
    const lotes = estado.calc.lotes;
    if (!lotes.length) { corpo.replaceChildren(el('tr', {}, el('td', { colSpan: 6, class: 'nota', text: 'Nenhuma lista enviada ainda.' }))); return; }
    corpo.replaceChildren(...lotes.map((l) => {
      const botao = el('button', { type: 'button', class: 'botao botao-perigo', text: 'Excluir', 'data-lote': l.lote, 'aria-label': `Excluir a lista ${l.arquivo || ''}` });
      return el('tr', {},
        celula(l.arquivo || 'Sem nome'),
        celula(l.eventos.join(', ')),
        celula(fmtN(l.linhas), 'num'),
        celula(l.enviado_por, 'some-estreito'),
        celula(fmtQuando(l.criado_em), 'some-estreito'),
        el('td', { class: 'acao' }, botao));
    }));
  }

  function desenhaAjustes() {
    const nomes = estado.calc.empresas.map((e) => e.empresa).sort(porNome);
    const opcoes = nomes.map((n) => [n, n]);
    const origem = $('#juntar-origem').value;
    const destino = $('#juntar-destino').value;
    preencheSelect($('#juntar-origem'), [['', 'Escolha…'], ...opcoes], origem);
    preencheSelect($('#juntar-destino'), [['', 'Escolha…'], ...opcoes], destino);
    const empresaSetor = $('#setor-empresa').value;
    preencheSelect($('#setor-empresa'), [['', 'Escolha…'], ...opcoes], empresaSetor);
    const setores = [...new Set([...R.SETORES, R.SEM_SETOR, ...estado.calc.resumo.map((r) => r.setor).filter((s) => s !== 'Todos')])];
    const atual = $('#setor-empresa').value ? setorDaEmpresa($('#setor-empresa').value) : '';
    preencheSelect($('#setor-novo'), [['', 'Escolha…'], ...setores.map((s) => [s, s])], $('#setor-novo').dataset.tocado ? $('#setor-novo').value : atual);
  }

  /* ---------- Ações que gravam no banco ---------- */

  async function excluirLote(lote) {
    const info = estado.calc.lotes.find((l) => l.lote === lote);
    if (!info) return;
    if (!window.confirm(`Excluir a lista “${info.arquivo || 'sem nome'}” (${plural(info.linhas, 'linha', 'linhas')})? Ela some para todo mundo.`)) return;
    const { error } = await sb.from(TABELA).delete().eq('lote', lote);
    if (error) { avisa(`Não deu para excluir. ${traduzErro(error)}`, 'erro'); return; }
    avisa('Lista excluída.');
    await recarregar();
  }

  async function juntarEmpresas() {
    const origem = $('#juntar-origem').value;
    const destino = $('#juntar-destino').value;
    if (!origem || !destino) { avisa('Escolha as duas empresas.', 'erro'); return; }
    if (origem === destino) { avisa('Escolha duas empresas diferentes.', 'erro'); return; }
    if (!window.confirm(`Juntar “${origem}” em “${destino}”? Todos os contatos de ${origem} passam para ${destino}.`)) return;
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
    } catch (e) {
      avisa(`Não deu para juntar. ${traduzErro(e)}`, 'erro');
      recarregar();
    }
  }

  async function mudarSetor() {
    const empresa = $('#setor-empresa').value;
    const setor = $('#setor-novo').value;
    if (!empresa || !setor) { avisa('Escolha a empresa e o novo setor.', 'erro'); return; }
    const { error } = await sb.from(TABELA).update({ setor }).eq('empresa', empresa);
    if (error) { avisa(`Não deu para mudar o setor. ${traduzErro(error)}`, 'erro'); return; }
    delete $('#setor-novo').dataset.tocado;
    avisa(`Setor de ${empresa} agora é ${setor}.`);
    await recarregar();
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

  async function baixarDados() {
    if (!window.XLSX) await esperaXLSX();
    const cab = ['Evento', 'Data do evento', 'Empresa', 'Setor', 'Nome', 'Cargo', 'Tipo de interação', 'Observações', 'Arquivo de origem', 'Enviado por'];
    const linhas = [...estado.linhas]
      .sort((a, b) => String(a.data_evento).localeCompare(String(b.data_evento)) || porNome(a.evento, b.evento) || porNome(a.empresa, b.empresa))
      .map((l) => [l.evento, fmtData(l.data_evento), l.empresa, l.setor, l.nome || '', l.cargo || '', l.interacao || '', l.observacoes || '', l.arquivo || '', l.enviado_por || '']);
    const hoje = new Date().toISOString().slice(0, 10);
    if (window.XLSX) {
      const ws = window.XLSX.utils.aoa_to_sheet([cab, ...linhas]);
      ws['!cols'] = cab.map((c, i) => ({ wch: [28, 14, 26, 14, 24, 28, 22, 32, 28, 30][i] || 20 }));
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
    envio.nomeArquivo = '';
    envio.cabecalho = [];
    envio.tabela = [];
    envio.mapa = {};
    envio.previa = null;
    $('#arquivo').value = '';
    $('#arquivo-info').hidden = true;
    $('#evento-padrao').value = '';
    $('#data-padrao').value = '';
    ['#passo-colunas', '#passo-evento', '#passo-resumo'].forEach((s) => { $(s).hidden = true; });
    $('#envio-erro').hidden = true;
    const botao = $('#botao-enviar');
    botao.disabled = true;
    botao.textContent = 'Enviar';
    preencheListaEventos();
    const dlg = $('#dlg-subir');
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  }

  function fechaSubir() {
    const dlg = $('#dlg-subir');
    if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
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

  function preencheListaEventos() {
    $('#lista-eventos').replaceChildren(...eventosConhecidos().map(([nome]) => el('option', { value: nome })));
  }

  const decodifica = (bytes) => {
    try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); } catch (e) { return new TextDecoder('windows-1252').decode(bytes); }
  };

  // A biblioteca de Excel vem da internet e carrega em paralelo; espera um pouco por ela.
  const esperaXLSX = () => new Promise((pronto) => {
    const inicio = Date.now();
    const olha = () => { if (window.XLSX || Date.now() - inicio > 8000) pronto(); else setTimeout(olha, 250); };
    olha();
  });

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
        erro.textContent = 'A peça que lê Excel não carregou (a rede pode estar bloqueando cdn.sheetjs.com). Salve a planilha como CSV no Excel (Arquivo > Salvar como > CSV) e suba o CSV.';
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
    const info = $('#arquivo-info');
    info.textContent = `${envio.nomeArquivo}: ${plural(envio.tabela.length, 'linha', 'linhas')} encontradas.`;
    info.hidden = false;
    desenhaMapaColunas();
    ['#passo-colunas', '#passo-evento', '#passo-resumo'].forEach((s) => { $(s).hidden = false; });
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
    const caixa = $('#resumo-envio');
    const botao = $('#botao-enviar');
    const blocos = [];
    const n = p.linhas.length;
    if (n) {
      const empresas = new Set(p.linhas.map((l) => l.empresa)).size;
      const eventos = p.eventos.map((e) => `${e.evento} (${fmtData(e.data)})`).join(', ');
      blocos.push(el('p', { class: 'ok' }, el('b', { text: `Prontas para entrar: ${plural(n, 'linha', 'linhas')}` }),
        ` de ${plural(empresas, 'empresa', 'empresas')}${p.empresasNovas.length ? ` (${plural(p.empresasNovas.length, 'nova', 'novas')} no painel)` : ''}, em ${eventos}.`));
    } else {
      blocos.push(el('p', { class: 'alerta', text: 'Nenhuma linha pronta para entrar ainda.' }));
    }
    const ig = p.ignoradas;
    const fora = [
      [ig.jaExistiam, 'já estava no painel', 'já estavam no painel'],
      [ig.repetidas, 'repetida na planilha', 'repetidas na planilha'],
      [ig.capgemini, 'da própria Capgemini', 'da própria Capgemini'],
      [ig.exemplo, 'linha de exemplo do modelo', 'linhas de exemplo do modelo'],
      [ig.semEmpresa, 'sem empresa', 'sem empresa'],
    ].filter(([q]) => q > 0).map(([q, um, varios]) => plural(q, um, varios));
    if (fora.length) blocos.push(el('p', { class: 'nota', text: `Ficam de fora: ${fora.join('; ')}.` }));
    if (ig.semEvento) blocos.push(el('p', { class: 'alerta', text: `${plural(ig.semEvento, 'linha está', 'linhas estão')} sem evento: preencha o nome do evento no passo 3.` }));
    if (ig.semData) blocos.push(el('p', { class: 'alerta', text: `${plural(ig.semData, 'linha está', 'linhas estão')} sem data: preencha a data no passo 3.` }));
    if (envio.mapa.empresa === undefined && envio.mapa.email === undefined) blocos.push(el('p', { class: 'alerta', text: 'Escolha no passo 2 qual coluna tem o nome da empresa.' }));
    caixa.replaceChildren(...blocos);
    $('#previa-linhas').replaceChildren(...p.linhas.slice(0, 8).map((l) => el('tr', {},
      celula(l.evento), celula(fmtData(l.data_evento)), celula(l.empresa), celula(l.setor), celula(l.nome || ''),
      celula(l.cargo || '', 'some-estreito'), celula(l.interacao, 'some-estreito'))));
    botao.disabled = n === 0;
    botao.textContent = n ? `Enviar ${plural(n, 'linha', 'linhas')}` : 'Enviar';
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
    const registros = p.linhas.map((l) => ({ ...l, lote, arquivo: envio.nomeArquivo, enviado_por: estado.usuario.email }));
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
      fechaSubir();
      avisa(`Pronto: ${plural(enviados, 'linha incluída', 'linhas incluídas')}. Quem está com o site aberto já está vendo.`);
      await recarregar();
    } catch (e) {
      erro.textContent = enviados
        ? `Entraram ${fmtN(enviados)} linhas e o resto falhou: ${traduzErro(e)} Para tentar de novo, exclua esta lista em “Listas enviadas” e suba outra vez.`
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

    $('#filtro-setor').addEventListener('change', (e) => { estado.setor = e.target.value || 'Todos'; desenhaTudo(); });
    $('#filtro-empresa').addEventListener('change', (e) => { estado.empresa = e.target.value; desenhaTudo(); });
    $('#botao-limpar').addEventListener('click', () => {
      estado.setor = 'Todos';
      estado.empresa = '';
      estado.busca = '';
      $('#busca').value = '';
      desenhaTudo();
    });
    $('#botao-fechar-jornada').addEventListener('click', () => { estado.empresa = ''; desenhaTudo(); });

    $('#busca').addEventListener('input', (e) => { estado.busca = e.target.value; desenhaEmpresas(); });
    $$('#tabela-empresas th[data-campo] button').forEach((b) => b.addEventListener('click', () => {
      const campo = b.closest('th').dataset.campo;
      const { ordem } = estado;
      ordem.direcao = ordem.campo === campo ? -ordem.direcao : (NUMERICOS.has(campo) || campo === 'ultimo_contato' ? -1 : 1);
      ordem.campo = campo;
      desenhaEmpresas();
    }));
    const tabela = $('#tabela-empresas');
    const escolhe = (alvo) => { const tr = alvo.closest('tr[data-empresa]'); if (tr) abreJornada(tr.dataset.empresa); };
    tabela.addEventListener('click', (e) => escolhe(e.target));
    tabela.addEventListener('keydown', (e) => { if (e.key === 'Enter') escolhe(e.target); });

    $('#lotes-linhas').addEventListener('click', (e) => {
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

    $('#botao-subir').addEventListener('click', abreSubir);
    $$('[data-acao="subir"]').forEach((b) => b.addEventListener('click', abreSubir));
    $('#botao-exemplo').addEventListener('click', carregarExemplo);
    $('#botao-apagar-exemplo').addEventListener('click', apagarExemplo);
    $('#botao-baixar').addEventListener('click', baixarDados);

    $$('#dlg-subir [data-fechar]').forEach((b) => b.addEventListener('click', fechaSubir));
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

    let relogioTamanho = 0;
    let larguraAntes = window.innerWidth;
    window.addEventListener('resize', () => {
      clearTimeout(relogioTamanho);
      relogioTamanho = setTimeout(() => {
        if (Math.abs(window.innerWidth - larguraAntes) < 8 || !estado.calc || !estado.linhas.length) return;
        larguraAntes = window.innerWidth;
        desenhaMapa();
        desenhaEventos();
      }, 200);
    });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && estado.usuario) agendaRecarga(); });
  }

  iniciar();
})();
