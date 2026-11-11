/*
 * Peças visuais do Mapa de cruzamentos: ícones, filtros, linha do tempo dos eventos,
 * pessoas por grade, cartões de empresas e pessoas, e a história de cada uma.
 * Só monta a tela a partir dos números; não busca nem grava nada.
 */
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.Visual = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const numeroBR = new Intl.NumberFormat('pt-BR');
  const fmtN = (n) => numeroBR.format(Number(n) || 0);
  const partes = (s) => String(s || '').slice(0, 10).split('-');
  const semDia = (s) => /-01-01$/.test(String(s || '').slice(0, 10));
  // Data cheia: 24/08/2026. Quando só se sabe o ano (guardado como 1º de janeiro): "2026, sem data".
  const fmtData = (s) => { const [a, m, d] = partes(s); if (!(a && m && d)) return ''; return semDia(s) ? `${a}, sem data` : `${d}/${m}/${a}`; };
  const fmtDataCurta = (s) => { const [a, m, d] = partes(s); if (!(a && m && d)) return ''; return semDia(s) ? `${a}, sem data` : `${Number(d)} ${MESES[Number(m) - 1] || m} ${a}`; };
  const plural = (n, um, varios) => `${fmtN(n)} ${Number(n) === 1 ? um : varios}`;
  const porNome = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), 'pt-BR');
  const juntaE = (lista) => (lista.length <= 1 ? lista.join('') : `${lista.slice(0, -1).join(', ')} e ${lista[lista.length - 1]}`);

  const el = (tag, props = {}, ...filhos) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('data-') || k.startsWith('aria-') || k === 'role') n.setAttribute(k, v);
      else n[k] = v;
    }
    n.append(...filhos.filter((f) => f !== null && f !== undefined && f !== false));
    return n;
  };

  /* ---------- Ícones (traço simples, 24×24) ---------- */

  const TRACOS = {
    empresa: ['M3 21h18', 'M5 21V4h9v17', 'M14 9h5v12', 'M8 8h3', 'M8 12h3', 'M8 16h3'],
    volta: ['M17 2l4 4-4 4', 'M3 11V9a3 3 0 0 1 3-3h15', 'M7 22l-4-4 4-4', 'M21 13v2a3 3 0 0 1-3 3H3'],
    pessoas: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 3a4 4 0 1 1 0 8a4 4 0 0 1 0-8z', 'M22 21v-2a4 4 0 0 0-3-3.87', 'M16 3.13a4 4 0 0 1 0 7.75'],
    calendario: ['M3 5h18v16H3z', 'M16 3v4', 'M8 3v4', 'M3 10h18'],
    estande: ['M3 9l1.5-5h15L21 9', 'M3 9h18', 'M4 9v11h16V9', 'M9 20v-6h6v6'],
    reuniao: ['M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12z'],
    palestra: ['M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z', 'M19 10v1a7 7 0 0 1-14 0v-1', 'M12 18v4', 'M8 22h8'],
    vip: ['M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z'],
    convidado: ['M3 6h18v12H3z', 'M3 7l9 6 9-6'],
    refeicao: ['M7 2v8', 'M4 2v5a3 3 0 0 0 6 0V2', 'M7 10v12', 'M17 2c-2 2-3 4-3 7a3 3 0 0 0 3 3v10'],
    taca: ['M7 3h10l-1 6a4 4 0 0 1-8 0L7 3z', 'M12 13v8', 'M8 21h8'],
    participou: ['M22 12a10 10 0 1 1-20 0a10 10 0 0 1 20 0z', 'M8 12l3 3 5-6'],
    interacoes: ['M4 5h16v11H8l-4 4z', 'M8 9h8', 'M8 12h5'],
    voltar: ['M19 12H5', 'M12 19l-7-7 7-7'],
    subir: ['M12 16V4', 'M7 9l5-5 5 5', 'M4 20h16'],
    lista: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
    fechar: ['M18 6L6 18', 'M6 6l12 12'],
    grade: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20H2'],
  };
  const icone = (nome, classe = 'cz-icone') => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('class', classe);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    for (const d of TRACOS[nome] || []) {
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d', d);
      svg.append(p);
    }
    return svg;
  };
  const ICONE_INTERACAO = {
    'Visita ao estande': 'estande',
    'Reunião agendada': 'reuniao',
    'Palestra ou painel': 'palestra',
    Workshop: 'palestra',
    'Sala VIP': 'vip',
    Convidado: 'convidado',
    'Almoço': 'refeicao',
    Jantar: 'refeicao',
    'Café da manhã': 'refeicao',
    Coquetel: 'taca',
    'Happy hour': 'taca',
  };
  const iconeDaInteracao = (tipo) => icone(ICONE_INTERACAO[tipo] || 'participou', 'cz-icone cz-icone-p');

  const tag = (texto, cor) => {
    const t = el('span', { class: 'cz-tag', text: texto });
    if (cor) t.style.setProperty('--tag', cor);
    return t;
  };

  /* ---------- Botões de filtro (ano, MU, setor) ---------- */

  // opcoes: [{ valor, rotulo, n, cor }]
  function desenhaChips(caixa, opcoes, ativo, aoEscolher) {
    caixa.replaceChildren(...opcoes.map((o) => {
      const escolhido = o.valor === ativo;
      const b = el('button', { type: 'button', class: `cz-filtro${escolhido ? ' is-ativo' : ''}`, 'aria-pressed': String(escolhido) },
        el('span', { text: o.rotulo }), o.n === undefined ? null : el('span', { class: 'cz-filtro-num', text: fmtN(o.n) }));
      if (o.cor) b.style.setProperty('--tag', o.cor);
      b.addEventListener('click', () => aoEscolher(o.valor));
      return b;
    }));
  }

  // Compatível com a versão anterior: setores [{ setor, empresas }], com 'Todos' primeiro.
  function desenhaSetores(caixa, setores, ativo, aoEscolher, corDoSetor) {
    desenhaChips(caixa, setores.map((s) => ({ valor: s.setor, rotulo: s.setor === 'Todos' ? 'Todos os setores' : s.setor, n: s.empresas,
      cor: s.setor !== 'Todos' && corDoSetor ? corDoSetor(s.setor) : null })), ativo, aoEscolher);
  }

  /* ---------- Linha do tempo dos eventos ---------- */

  // eventos: [{ evento, data, empresas, ja_no_ano, primeira_do_ano, pessoas, interacoes }]
  function desenhaLinhaDoTempo(caixa, eventos, ativo, aoEscolher) {
    caixa.replaceChildren();
    if (!eventos.length) { caixa.append(el('p', { class: 'cz-vazio', text: 'Nenhum evento com esses filtros.' })); return; }
    const lista = [...eventos].sort((a, b) => String(a.data).localeCompare(String(b.data)) || porNome(a.evento, b.evento));
    const anos = new Set(lista.map((e) => String(e.data).slice(0, 4)));
    const maior = Math.max(1, ...lista.map((e) => Number(e.empresas) || 0));
    const ol = el('ol', { class: 'cz-tempo' });
    let anoAtual = '';
    for (const e of lista) {
      const ano = String(e.data).slice(0, 4);
      if (anos.size > 1 && ano !== anoAtual) {
        ol.append(el('li', { class: 'cz-tempo-ano', 'aria-hidden': 'true' }, el('span', { text: ano })));
        anoAtual = ano;
      }
      const total = Number(e.empresas) || 0;
      const ja = Number(e.ja_no_ano ?? e.ja_conheciam) || 0;
      const primeira = Number(e.primeira_do_ano ?? e.primeira_vez) || 0;
      let frase;
      if (total === 1) frase = ja ? 'Já tinha interagido no ano' : 'Primeira interação do ano';
      else if (ja === 0) frase = 'Primeira interação do ano para todas';
      else if (primeira === 0) frase = 'Todas já tinham interagido no ano';
      else frase = `${fmtN(ja)} ${ja === 1 ? 'já tinha' : 'já tinham'} interagido no ano, ${fmtN(primeira)} na primeira do ano`;
      const barra = el('span', { class: 'cz-barra', 'aria-hidden': 'true' });
      const parteJa = el('span', { class: 'cz-barra-ja' });
      parteJa.style.width = `${(ja / maior) * 100}%`;
      const parteNova = el('span', { class: 'cz-barra-nova' });
      parteNova.style.width = `${(primeira / maior) * 100}%`;
      barra.append(parteJa, parteNova);
      const escolhido = ativo === e.evento;
      const interacoes = Number(e.interacoes) || 0;
      const botao = el('button', { type: 'button', class: `cz-evento${escolhido ? ' is-ativo' : ''}`, 'aria-pressed': String(escolhido) },
        el('span', { class: 'cz-evento-data' }, icone('calendario', 'cz-icone cz-icone-p'), el('span', { text: fmtDataCurta(e.data) })),
        el('span', { class: 'cz-evento-nome', text: e.evento }),
        el('span', { class: 'cz-evento-num' }, el('b', { text: fmtN(total) }), el('span', { text: total === 1 ? ' empresa' : ' empresas' })),
        barra,
        el('span', { class: 'cz-evento-frase', text: frase }),
        interacoes ? el('span', { class: 'cz-evento-frase', text: `${plural(e.pessoas, 'pessoa', 'pessoas')}, ${plural(interacoes, 'interação', 'interações')}` }) : null);
      botao.addEventListener('click', () => aoEscolher(escolhido ? '' : e.evento));
      ol.append(el('li', { class: 'cz-tempo-item' }, botao));
    }
    caixa.append(ol);
  }

  /* ---------- Pessoas por grade ---------- */

  // grades: [{ grade, pessoas }] já na ordem certa
  function desenhaGrades(caixa, grades, ativo, aoEscolher) {
    caixa.replaceChildren();
    if (!grades.length) { caixa.append(el('p', { class: 'cz-vazio', text: 'Ainda não há pessoas com nome nas listas.' })); return; }
    const maior = Math.max(1, ...grades.map((g) => g.pessoas));
    const ul = el('ul', { class: 'cz-niveis' });
    for (const g of grades) {
      const escolhido = ativo === g.grade;
      const preenchido = el('span', { class: 'cz-nivel-preench' });
      preenchido.style.width = `${(g.pessoas / maior) * 100}%`;
      const b = el('button', { type: 'button', class: `cz-nivel${escolhido ? ' is-ativo' : ''}`, 'aria-pressed': String(escolhido) },
        el('span', { class: 'cz-nivel-nome', text: g.grade }),
        el('span', { class: 'cz-nivel-barra', 'aria-hidden': 'true' }, preenchido),
        el('span', { class: 'cz-nivel-num', text: plural(g.pessoas, 'pessoa', 'pessoas') }));
      b.addEventListener('click', () => aoEscolher(escolhido ? '' : g.grade));
      ul.append(el('li', {}, b));
    }
    caixa.append(ul);
  }

  /* ---------- Tabela de grades por empresa ---------- */

  // dados: { grades, empresas: [{ empresa, mu, setor, total, porGrade }], totais }
  // opcoes: { sel: { empresa, grade }, ordem: { campo, direcao }, aoOrdenar, aoEscolher, aoAbrirEmpresa, corDe }
  function desenhaTabelaGrades(caixa, dados, opcoes) {
    const { sel = {}, ordem = {}, aoOrdenar, aoEscolher, aoAbrirEmpresa, corDe } = opcoes;
    caixa.replaceChildren();
    if (!dados.empresas.length) { caixa.append(el('p', { class: 'cz-vazio', text: 'Nenhuma empresa com pessoas com esses filtros.' })); return; }
    const maior = Math.max(1, ...dados.empresas.flatMap((e) => Object.values(e.porGrade)));
    const maiorTotal = Math.max(1, ...dados.empresas.map((e) => e.total));
    const seta = (campo) => (ordem.campo === campo ? (ordem.direcao === 1 ? ' ↑' : ' ↓') : '');
    const cabecalho = (campo, texto, classe) => {
      const b = el('button', { type: 'button', class: 'cz-ordenar', text: `${texto}${seta(campo)}`, title: 'Ordenar por esta coluna' });
      b.addEventListener('click', () => aoOrdenar(campo));
      return el('th', { scope: 'col', class: classe, 'aria-sort': ordem.campo === campo ? (ordem.direcao === 1 ? 'ascending' : 'descending') : 'none' }, b);
    };
    const numero = (n, escolha, ativo, rotulo, referencia = maior) => {
      if (!n) return el('span', { class: 'cz-zero', 'aria-label': 'nenhuma', text: '–' });
      const b = el('button', { type: 'button', class: `cz-celula${ativo ? ' is-ativo' : ''}`, text: fmtN(n), 'aria-label': rotulo });
      b.style.setProperty('--calor', `${Math.min(60, Math.round(8 + (52 * n) / referencia))}%`);
      b.addEventListener('click', () => aoEscolher(escolha));
      return b;
    };
    const thead = el('thead', {}, el('tr', {},
      cabecalho('empresa', 'Empresa', 'cz-col-empresa'),
      ...dados.grades.map((g) => cabecalho(`grade:${g}`, g, sel.grade === g && !sel.empresa ? 'is-coluna' : '')),
      cabecalho('total', 'Total', 'cz-col-total')));
    const tbody = el('tbody', {}, ...dados.empresas.map((e) => {
      const abrir = el('button', { type: 'button', class: 'cz-pessoa-link', text: e.empresa, title: 'Ver a história desta empresa' });
      abrir.addEventListener('click', () => aoAbrirEmpresa(e.empresa));
      const rotulo = e.mu || '';
      return el('tr', { class: sel.empresa === e.empresa ? 'is-linha' : '' },
        el('th', { scope: 'row', class: 'cz-col-empresa' }, el('div', { class: 'cz-celula-empresa' }, abrir, rotulo ? tag(rotulo, corDe && corDe(rotulo)) : null)),
        ...dados.grades.map((g) => el('td', {}, numero(e.porGrade[g] || 0, { empresa: e.empresa, grade: g },
          sel.empresa === e.empresa && sel.grade === g, `${plural(e.porGrade[g] || 0, 'pessoa', 'pessoas')} com grade ${g} em ${e.empresa}`))),
        el('td', { class: 'cz-col-total' }, numero(e.total, { empresa: e.empresa, grade: '' }, sel.empresa === e.empresa && !sel.grade, `Todas as ${fmtN(e.total)} pessoas de ${e.empresa}`, maiorTotal)));
    }));
    const totalGeral = Object.values(dados.totais).reduce((a, b) => a + b, 0);
    const tfoot = el('tfoot', {}, el('tr', {},
      el('th', { scope: 'row', class: 'cz-col-empresa', text: 'Total' }),
      ...dados.grades.map((g) => {
        const b = el('button', { type: 'button', class: `cz-total-grade${sel.grade === g && !sel.empresa ? ' is-ativo' : ''}`, text: fmtN(dados.totais[g] || 0), 'aria-label': `Todas as pessoas com grade ${g}` });
        b.addEventListener('click', () => aoEscolher({ empresa: '', grade: g }));
        return el('td', {}, b);
      }),
      el('td', { class: 'cz-col-total', text: fmtN(totalGeral) })));
    caixa.append(el('div', { class: 'cz-tabela-caixa' }, el('table', { class: 'cz-tabela-grades' }, thead, tbody, tfoot)));
  }

  // pessoas: [{ chave, nome, empresa, cargo, grade, eventos, vezes, ultimo_contato }]
  function desenhaListaPessoas(caixa, pessoas, opcoes) {
    const { aoEscolher } = opcoes;
    caixa.replaceChildren();
    if (!pessoas.length) { caixa.append(el('p', { class: 'cz-vazio', text: 'Ninguém aqui.' })); return; }
    const linhas = pessoas.map((p) => {
      const nome = el('button', { type: 'button', class: 'cz-pessoa-link', text: p.nome, title: 'Ver a história desta pessoa' });
      nome.addEventListener('click', () => aoEscolher(p.chave));
      return el('tr', {},
        el('td', {}, nome),
        el('td', { text: p.cargo || '' }),
        el('td', { text: p.empresa }),
        el('td', {}, el('span', { class: 'cz-grade-pilula', text: p.grade })),
        el('td', { class: 'cz-num', text: fmtN(p.eventos) }),
        el('td', { class: 'cz-num', text: fmtN(p.vezes) }),
        el('td', { text: fmtDataCurta(p.ultimo_contato) }));
    });
    caixa.append(el('div', { class: 'cz-tabela-caixa' }, el('table', { class: 'cz-tabela-pessoas' },
      el('thead', {}, el('tr', {}, ...['Pessoa', 'Cargo', 'Empresa', 'Grade', 'Eventos', 'Interações', 'Última interação'].map((t, i) => el('th', { scope: 'col', class: i === 4 || i === 5 ? 'cz-num' : '', text: t })))),
      el('tbody', {}, ...linhas))));
  }

  /* ---------- Empresas ou pessoas (botões de troca) ---------- */

  function desenhaAlternador(caixa, visao, contagens, aoTrocar) {
    const grupo = el('div', { class: 'cz-alternador', role: 'group', 'aria-label': 'Ver por empresa ou por pessoa' });
    for (const [id, rotulo, n, nomeIcone] of [['empresas', 'Empresas', contagens.empresas, 'empresa'], ['pessoas', 'Pessoas', contagens.pessoas, 'pessoas']]) {
      const ativo = visao === id;
      const b = el('button', { type: 'button', class: `cz-alternar${ativo ? ' is-ativo' : ''}`, 'aria-pressed': String(ativo) },
        icone(nomeIcone, 'cz-icone cz-icone-p'), el('span', { text: rotulo }), el('span', { class: 'cz-alternar-num', text: fmtN(n) }));
      b.addEventListener('click', () => { if (!ativo) aoTrocar(id); });
      grupo.append(b);
    }
    caixa.replaceChildren(grupo);
  }

  // filtros: [{ texto, aoLimpar }]
  const avisosFiltro = (filtros) => {
    if (!filtros || !filtros.length) return null;
    return el('div', { class: 'cz-filtro-evento' }, ...filtros.map((f) => {
      const limpar = el('button', { type: 'button', class: 'cz-link', 'aria-label': `Tirar o filtro ${f.texto}` }, icone('fechar', 'cz-icone cz-icone-p'));
      limpar.addEventListener('click', f.aoLimpar);
      return el('span', { class: 'cz-pilula' }, el('span', { text: f.texto }), limpar);
    }));
  };

  const bolinhasDe = (n, total) => {
    const bolinhas = el('span', { class: 'cz-bolinhas', 'aria-hidden': 'true' });
    if (total <= 12) for (let i = 0; i < total; i += 1) bolinhas.append(el('i', { class: i < n ? 'is-cheia' : '' }));
    return bolinhas;
  };
  const chipsDeEventos = (lista, evento) => el('span', { class: 'cz-chips' }, ...lista.map((x) => el('span', { class: `cz-chip${x.evento === evento ? ' is-ativo' : ''}`, text: x.evento })));
  const outrosAnos = (anos) => (anos && anos.length ? el('span', { class: 'cz-outros-anos' }, icone('volta', 'cz-icone cz-icone-p'), el('span', { text: `Também em ${juntaE(anos)}` })) : null);

  /* ---------- Cartões das empresas ---------- */

  // empresas: [{ empresa, setor, mu, eventos, pessoas, interacoes, outrosAnos }]
  function desenhaEmpresas(caixa, empresas, opcoes) {
    const { totalEventos, eventosDe, aoEscolher, corDe, evento, filtros } = opcoes;
    caixa.replaceChildren();
    const avisos = avisosFiltro(filtros);
    if (avisos) caixa.append(avisos);
    if (!empresas.length) { caixa.append(el('p', { class: 'cz-vazio', text: 'Nenhuma empresa encontrada.' })); return; }
    const ul = el('ul', { class: 'cz-grade' });
    for (const e of empresas) {
      const n = Number(e.eventos) || 0;
      const rotulo = e.mu || e.setor;
      const pessoasTexto = Number(e.pessoas) ? plural(e.pessoas, 'pessoa', 'pessoas') : 'Pessoa não informada';
      const interacoes = Number(e.interacoes) || 0;
      const botao = el('button', { type: 'button', class: 'cz-empresa' },
        el('span', { class: 'cz-empresa-topo' }, el('span', { class: 'cz-empresa-nome', text: e.empresa }), rotulo ? tag(rotulo, corDe && corDe(rotulo)) : null),
        el('span', { class: 'cz-empresa-medida' }, bolinhasDe(n, totalEventos), el('span', { text: `Esteve em ${fmtN(n)} de ${plural(totalEventos, 'evento', 'eventos')}` })),
        chipsDeEventos(eventosDe(e.empresa), evento),
        el('span', { class: 'cz-empresa-rodape' }, icone('pessoas', 'cz-icone cz-icone-p'),
          el('span', { text: interacoes > (Number(e.pessoas) || 0) ? `${pessoasTexto}, ${plural(interacoes, 'interação', 'interações')}` : pessoasTexto })),
        outrosAnos(e.outrosAnos));
      botao.addEventListener('click', () => aoEscolher(e.empresa));
      ul.append(el('li', {}, botao));
    }
    caixa.append(ul);
  }

  /* ---------- Cartões das pessoas ---------- */

  // pessoas: [{ chave, nome, empresa, setor, mu, cargo, grade, eventos, vezes, ultimo_contato, outrosAnos }]
  function desenhaPessoas(caixa, pessoas, opcoes) {
    const { totalEventos, eventosDe, aoEscolher, corDe, evento, filtros, resumo } = opcoes;
    caixa.replaceChildren();
    const avisos = avisosFiltro(filtros);
    if (avisos) caixa.append(avisos);
    if (resumo) caixa.append(el('p', { class: 'cz-resumo-lista', text: resumo }));
    if (!pessoas.length) { caixa.append(el('p', { class: 'cz-vazio', text: 'Nenhuma pessoa encontrada.' })); return; }
    const ul = el('ul', { class: 'cz-grade' });
    for (const p of pessoas) {
      const n = Number(p.eventos) || 0;
      const vezes = Number(p.vezes) || n;
      const rotulo = p.mu || p.setor;
      const ultimo = `Última interação: ${fmtDataCurta(p.ultimo_contato)}${vezes > n ? `, ${plural(vezes, 'interação', 'interações')} no total` : ''}`;
      const botao = el('button', { type: 'button', class: 'cz-empresa cz-cartao-pessoa' },
        el('span', { class: 'cz-empresa-topo' }, el('span', { class: 'cz-empresa-nome', text: p.nome }), rotulo ? tag(rotulo, corDe && corDe(rotulo)) : null),
        el('span', { class: 'cz-pessoa-onde' }, icone('empresa', 'cz-icone cz-icone-p'), el('span', { text: p.cargo ? `${p.cargo}, ${p.empresa}` : p.empresa })),
        p.grade ? el('span', { class: 'cz-grade-pilula' }, icone('grade', 'cz-icone cz-icone-p'), el('span', { text: p.grade })) : null,
        el('span', { class: 'cz-empresa-medida' }, bolinhasDe(n, totalEventos), el('span', { text: `Esteve em ${fmtN(n)} de ${plural(totalEventos, 'evento', 'eventos')}` })),
        chipsDeEventos(eventosDe(p.chave), evento),
        el('span', { class: 'cz-empresa-rodape' }, icone('calendario', 'cz-icone cz-icone-p'), el('span', { text: ultimo })),
        outrosAnos(p.outrosAnos));
      botao.addEventListener('click', () => aoEscolher(p.chave));
      ul.append(el('li', {}, botao));
    }
    caixa.append(ul);
  }

  /* ---------- Histórias (empresa e pessoa) ---------- */

  const agrupaPorEvento = (linhas) => {
    const grupos = new Map();
    for (const l of linhas) {
      const data = String(l.data_evento).slice(0, 10);
      const k = `${data}\u0000${l.evento}`;
      if (!grupos.has(k)) grupos.set(k, { evento: l.evento, data, itens: [] });
      grupos.get(k).itens.push(l);
    }
    return [...grupos.values()].sort((a, b) => a.data.localeCompare(b.data) || porNome(a.evento, b.evento));
  };

  // Frase de resumo: quantas interações, em quais anos e a primeira interação do ano mais recente.
  const fraseHistoria = (ordem, total, extra) => {
    const anos = [...new Set(ordem.map((g) => g.data.slice(0, 4)))].sort();
    const ultimoAno = anos[anos.length - 1];
    const primeiraDoAno = ordem.find((g) => g.data.slice(0, 4) === ultimoAno);
    let frase = `Teve ${plural(total, 'interação', 'interações')} com a Capgemini em ${plural(ordem.length, 'evento', 'eventos')}${extra || ''}.`;
    if (anos.length > 1) frase += ` Anos com interação: ${juntaE(anos)}.`;
    if (primeiraDoAno) frase += ` Primeira interação de ${ultimoAno}: ${fmtDataCurta(primeiraDoAno.data)}, no ${primeiraDoAno.evento}.`;
    return frase;
  };

  const linhaDoTempoAgrupada = (ordem, desenhaItem) => {
    const ol = el('ol', { class: 'cz-linha' });
    const anos = new Set(ordem.map((g) => g.data.slice(0, 4)));
    let anoAtual = '';
    for (const g of ordem) {
      const ano = g.data.slice(0, 4);
      if (anos.size > 1 && ano !== anoAtual) {
        ol.append(el('li', { class: 'cz-linha-ano' }, el('span', { text: ano })));
        anoAtual = ano;
      }
      ol.append(el('li', { class: 'cz-linha-item' },
        el('span', { class: 'cz-linha-ponto', 'aria-hidden': 'true' }),
        el('div', { class: 'cz-linha-cabeca' }, el('span', { class: 'cz-linha-data', text: fmtDataCurta(g.data) }), el('span', { class: 'cz-linha-evento', text: g.evento })),
        el('ul', { class: 'cz-pessoas' }, ...g.itens.map(desenhaItem))));
    }
    return ol;
  };

  // info: { empresa, setor, mu, eventos, pessoas }; linhas: todas as interações da empresa
  function desenhaDetalhe(caixa, info, linhas, opcoes) {
    const { aoVoltar, corDe, aoEscolherPessoa, chaveDaPessoa } = opcoes;
    caixa.replaceChildren();
    const voltar = el('button', { type: 'button', class: 'cz-voltar' }, icone('voltar', 'cz-icone cz-icone-p'), el('span', { text: 'Todas as empresas' }));
    voltar.addEventListener('click', aoVoltar);
    caixa.append(voltar);
    if (!info) { caixa.append(el('p', { class: 'cz-vazio', text: 'Esta empresa não está mais no mapa.' })); return; }
    const ordem = agrupaPorEvento(linhas);
    const nomes = new Set(linhas.filter((l) => l.nome).map((l) => String(l.nome).trim().toLowerCase()));
    const rotulo = info.mu || info.setor;
    caixa.append(
      el('div', { class: 'cz-detalhe-topo' }, el('h3', { class: 'cz-detalhe-nome', text: info.empresa }), rotulo ? tag(rotulo, corDe && corDe(rotulo)) : null),
      el('p', { class: 'cz-detalhe-frase', text: fraseHistoria(ordem, linhas.length, nomes.size ? `, com ${plural(nomes.size, 'pessoa diferente', 'pessoas diferentes')}` : '') }),
      linhaDoTempoAgrupada(ordem, (p) => {
        const tipo = p.interacao || 'Participou do evento';
        let nome;
        if (p.nome && aoEscolherPessoa && chaveDaPessoa) {
          nome = el('button', { type: 'button', class: 'cz-pessoa-nome cz-pessoa-link', text: p.nome, title: 'Ver todas as interações desta pessoa' });
          nome.addEventListener('click', () => aoEscolherPessoa(chaveDaPessoa(p)));
        } else nome = el('span', { class: 'cz-pessoa-nome', text: p.nome || 'Nome não informado' });
        return el('li', { class: 'cz-pessoa' },
          nome,
          p.cargo ? el('span', { class: 'cz-pessoa-cargo', text: p.cargo }) : null,
          el('span', { class: 'cz-interacao' }, iconeDaInteracao(tipo), el('span', { text: tipo })),
          p.observacoes ? el('span', { class: 'cz-pessoa-obs', text: p.observacoes }) : null);
      }));
  }

  // info: { chave, nome, empresa, setor, mu, cargo, grade }; linhas: todas as interações da pessoa
  function desenhaDetalhePessoa(caixa, info, linhas, opcoes) {
    const { aoVoltar, aoVerEmpresa, corDe } = opcoes;
    caixa.replaceChildren();
    const voltar = el('button', { type: 'button', class: 'cz-voltar' }, icone('voltar', 'cz-icone cz-icone-p'), el('span', { text: 'Todas as pessoas' }));
    voltar.addEventListener('click', aoVoltar);
    caixa.append(voltar);
    if (!info) { caixa.append(el('p', { class: 'cz-vazio', text: 'Esta pessoa não está mais no mapa.' })); return; }
    const ordem = agrupaPorEvento(linhas);
    const rotulo = info.mu || info.setor;
    const verEmpresa = el('button', { type: 'button', class: 'cz-link' }, icone('empresa', 'cz-icone cz-icone-p'), el('span', { text: `Ver a empresa ${info.empresa}` }));
    verEmpresa.addEventListener('click', () => aoVerEmpresa(info.empresa));
    caixa.append(
      el('div', { class: 'cz-detalhe-topo' }, el('h3', { class: 'cz-detalhe-nome', text: info.nome }), rotulo ? tag(rotulo, corDe && corDe(rotulo)) : null,
        info.grade ? el('span', { class: 'cz-grade-pilula' }, icone('grade', 'cz-icone cz-icone-p'), el('span', { text: info.grade })) : null),
      el('p', { class: 'cz-detalhe-sub', text: info.cargo ? `${info.cargo}, ${info.empresa}` : info.empresa }),
      el('p', { class: 'cz-detalhe-frase', text: fraseHistoria(ordem, linhas.length, '') }),
      verEmpresa,
      linhaDoTempoAgrupada(ordem, (item) => {
        const tipo = item.interacao || 'Participou do evento';
        const cargoDiferente = item.cargo && info.cargo && item.cargo !== info.cargo;
        return el('li', { class: 'cz-pessoa' },
          el('span', { class: 'cz-interacao' }, iconeDaInteracao(tipo), el('span', { text: tipo })),
          cargoDiferente ? el('span', { class: 'cz-pessoa-cargo', text: `Cargo na época: ${item.cargo}` }) : null,
          item.observacoes ? el('span', { class: 'cz-pessoa-obs', text: item.observacoes }) : null);
      }));
  }

  return {
    VERSAO: '7', MESES, fmtN, fmtData, fmtDataCurta, plural, porNome, juntaE, el, icone,
    desenhaChips, desenhaSetores, desenhaLinhaDoTempo, desenhaGrades, desenhaTabelaGrades, desenhaListaPessoas, desenhaAlternador, desenhaEmpresas, desenhaPessoas, desenhaDetalhe, desenhaDetalhePessoa,
  };
});
