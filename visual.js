/*
 * Peças visuais do Mapa de cruzamentos: ícones, filtros de setor,
 * linha do tempo dos eventos, cartões das empresas e o detalhe de uma empresa.
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
  const fmtData = (s) => { const [a, m, d] = partes(s); return a && m && d ? `${d}/${m}/${a}` : ''; };
  const fmtDataCurta = (s) => { const [a, m, d] = partes(s); return a && m && d ? `${Number(d)} ${MESES[Number(m) - 1] || m} ${a}` : ''; };
  const plural = (n, um, varios) => `${fmtN(n)} ${Number(n) === 1 ? um : varios}`;
  const porNome = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), 'pt-BR');

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
    participou: ['M22 12a10 10 0 1 1-20 0a10 10 0 0 1 20 0z', 'M8 12l3 3 5-6'],
    voltar: ['M19 12H5', 'M12 19l-7-7 7-7'],
    subir: ['M12 16V4', 'M7 9l5-5 5 5', 'M4 20h16'],
    lista: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
    fechar: ['M18 6L6 18', 'M6 6l12 12'],
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
    'Sala VIP': 'vip',
    Convidado: 'convidado',
  };

  const tag = (texto, cor) => {
    const t = el('span', { class: 'cz-tag', text: texto });
    if (cor) t.style.setProperty('--tag', cor);
    return t;
  };

  /* ---------- Filtro de setor (botões) ---------- */

  // setores: [{ setor, empresas }], com 'Todos' primeiro.
  function desenhaSetores(caixa, setores, ativo, aoEscolher, corDoSetor) {
    caixa.replaceChildren(...setores.map((s) => {
      const escolhido = s.setor === ativo;
      const rotulo = s.setor === 'Todos' ? 'Todos os setores' : s.setor;
      const b = el('button', { type: 'button', class: `cz-filtro${escolhido ? ' is-ativo' : ''}`, 'aria-pressed': String(escolhido) },
        el('span', { text: rotulo }), el('span', { class: 'cz-filtro-num', text: fmtN(s.empresas) }));
      if (s.setor !== 'Todos' && corDoSetor) b.style.setProperty('--tag', corDoSetor(s.setor));
      b.addEventListener('click', () => aoEscolher(s.setor));
      return b;
    }));
  }

  /* ---------- Linha do tempo dos eventos ---------- */

  // eventos: [{ evento, data, empresas, ja_conheciam, primeira_vez, pessoas }]
  function desenhaLinhaDoTempo(caixa, eventos, ativo, aoEscolher) {
    caixa.replaceChildren();
    if (!eventos.length) { caixa.append(el('p', { class: 'cz-vazio', text: 'Nenhum evento com empresas deste setor.' })); return; }
    const lista = [...eventos].sort((a, b) => String(a.data).localeCompare(String(b.data)) || porNome(a.evento, b.evento));
    const maior = Math.max(1, ...lista.map((e) => Number(e.empresas) || 0));
    const ol = el('ol', { class: 'cz-tempo' });
    for (const e of lista) {
      const total = Number(e.empresas) || 0;
      const ja = Number(e.ja_conheciam) || 0;
      const novas = Number(e.primeira_vez) || 0;
      let frase;
      if (total === 1) frase = ja ? 'Já conhecia a Capgemini' : 'Primeiro encontro com a Capgemini';
      else if (ja === 0) frase = 'Todas eram novas para a gente';
      else if (novas === 0) frase = 'Todas já conheciam a gente';
      else frase = `${fmtN(ja)} já conheciam, ${plural(novas, 'nova', 'novas')}`;
      const barra = el('span', { class: 'cz-barra', 'aria-hidden': 'true' });
      const parteJa = el('span', { class: 'cz-barra-ja' });
      parteJa.style.width = `${(ja / maior) * 100}%`;
      const parteNova = el('span', { class: 'cz-barra-nova' });
      parteNova.style.width = `${(novas / maior) * 100}%`;
      barra.append(parteJa, parteNova);
      const escolhido = ativo === e.evento;
      const botao = el('button', { type: 'button', class: `cz-evento${escolhido ? ' is-ativo' : ''}`, 'aria-pressed': String(escolhido) },
        el('span', { class: 'cz-evento-data' }, icone('calendario', 'cz-icone cz-icone-p'), el('span', { text: fmtDataCurta(e.data) })),
        el('span', { class: 'cz-evento-nome', text: e.evento }),
        el('span', { class: 'cz-evento-num' }, el('b', { text: fmtN(total) }), el('span', { text: total === 1 ? ' empresa' : ' empresas' })),
        barra,
        el('span', { class: 'cz-evento-frase', text: frase }));
      botao.addEventListener('click', () => aoEscolher(escolhido ? '' : e.evento));
      ol.append(el('li', {}, botao));
    }
    caixa.append(ol);
  }

  /* ---------- Cartões das empresas ---------- */

  // empresas: [{ empresa, setor, eventos, pessoas, ultimo_contato }]
  // eventosDe(empresa) -> [{ evento, data }] em ordem de data
  function desenhaEmpresas(caixa, empresas, opcoes) {
    const { totalEventos, eventosDe, aoEscolher, corDoSetor, evento, aoLimparEvento } = opcoes;
    caixa.replaceChildren();
    if (evento) {
      const aviso = el('p', { class: 'cz-filtro-evento' },
        el('span', { text: `Mostrando quem foi ao ${evento}: ${plural(empresas.length, 'empresa', 'empresas')}.` }));
      const limpar = el('button', { type: 'button', class: 'cz-link' }, icone('fechar', 'cz-icone cz-icone-p'), el('span', { text: 'Ver todas as empresas' }));
      limpar.addEventListener('click', aoLimparEvento);
      aviso.append(limpar);
      caixa.append(aviso);
    }
    if (!empresas.length) { caixa.append(el('p', { class: 'cz-vazio', text: 'Nenhuma empresa encontrada.' })); return; }
    const ul = el('ul', { class: 'cz-grade' });
    for (const e of empresas) {
      const lista = eventosDe(e.empresa);
      const n = Number(e.eventos) || 0;
      const bolinhas = el('span', { class: 'cz-bolinhas', 'aria-hidden': 'true' });
      if (totalEventos <= 12) for (let i = 0; i < totalEventos; i += 1) bolinhas.append(el('i', { class: i < n ? 'is-cheia' : '' }));
      const chips = el('span', { class: 'cz-chips' }, ...lista.map((x) => el('span', { class: `cz-chip${x.evento === evento ? ' is-ativo' : ''}`, text: x.evento })));
      const botao = el('button', { type: 'button', class: 'cz-empresa' },
        el('span', { class: 'cz-empresa-topo' }, el('span', { class: 'cz-empresa-nome', text: e.empresa }), tag(e.setor, corDoSetor && corDoSetor(e.setor))),
        el('span', { class: 'cz-empresa-medida' }, bolinhas, el('span', { text: `Esteve em ${fmtN(n)} de ${plural(totalEventos, 'evento', 'eventos')}` })),
        chips,
        el('span', { class: 'cz-empresa-rodape' }, icone('pessoas', 'cz-icone cz-icone-p'), el('span', { text: plural(e.pessoas, 'pessoa', 'pessoas') })));
      botao.addEventListener('click', () => aoEscolher(e.empresa));
      ul.append(el('li', {}, botao));
    }
    caixa.append(ul);
  }

  /* ---------- Detalhe de uma empresa ---------- */

  // info: { empresa, setor, eventos, pessoas, primeiro_contato, ultimo_contato }
  // linhas: interações da empresa [{ evento, data_evento, nome, cargo, interacao, observacoes }]
  function desenhaDetalhe(caixa, info, linhas, opcoes) {
    const { aoVoltar, corDoSetor } = opcoes;
    caixa.replaceChildren();
    const voltar = el('button', { type: 'button', class: 'cz-voltar' }, icone('voltar', 'cz-icone cz-icone-p'), el('span', { text: 'Todas as empresas' }));
    voltar.addEventListener('click', aoVoltar);
    caixa.append(voltar);
    if (!info) { caixa.append(el('p', { class: 'cz-vazio', text: 'Esta empresa não está mais no mapa.' })); return; }
    const grupos = new Map();
    for (const l of linhas) {
      const k = `${String(l.data_evento).slice(0, 10)}\u0000${l.evento}`;
      if (!grupos.has(k)) grupos.set(k, { evento: l.evento, data: String(l.data_evento).slice(0, 10), pessoas: [] });
      grupos.get(k).pessoas.push(l);
    }
    const ordem = [...grupos.values()].sort((a, b) => a.data.localeCompare(b.data) || porNome(a.evento, b.evento));
    const primeiro = ordem[0];
    caixa.append(
      el('div', { class: 'cz-detalhe-topo' }, el('h3', { class: 'cz-detalhe-nome', text: info.empresa }), tag(info.setor, corDoSetor && corDoSetor(info.setor))),
      el('p', { class: 'cz-detalhe-frase', text: `Esteve em ${plural(info.eventos, 'evento', 'eventos')}, com ${plural(info.pessoas, 'pessoa diferente', 'pessoas diferentes')}.${primeiro ? ` O primeiro encontro foi em ${fmtDataCurta(primeiro.data)}, no ${primeiro.evento}.` : ''}` }),
    );
    const ol = el('ol', { class: 'cz-linha' });
    for (const g of ordem) {
      const pessoas = g.pessoas.sort((a, b) => porNome(a.nome, b.nome));
      const ul = el('ul', { class: 'cz-pessoas' }, ...pessoas.map((p) => {
        const tipo = p.interacao || 'Participou do evento';
        return el('li', { class: 'cz-pessoa' },
          el('span', { class: 'cz-pessoa-nome', text: p.nome || 'Nome não informado' }),
          p.cargo ? el('span', { class: 'cz-pessoa-cargo', text: p.cargo }) : null,
          el('span', { class: 'cz-interacao' }, icone(ICONE_INTERACAO[tipo] || 'participou', 'cz-icone cz-icone-p'), el('span', { text: tipo })),
          p.observacoes ? el('span', { class: 'cz-pessoa-obs', text: p.observacoes }) : null);
      }));
      ol.append(el('li', { class: 'cz-linha-item' },
        el('span', { class: 'cz-linha-ponto', 'aria-hidden': 'true' }),
        el('div', { class: 'cz-linha-cabeca' }, el('span', { class: 'cz-linha-data', text: fmtDataCurta(g.data) }), el('span', { class: 'cz-linha-evento', text: g.evento })),
        ul));
    }
    caixa.append(ol);
  }

  return { MESES, fmtN, fmtData, fmtDataCurta, plural, porNome, el, icone, desenhaSetores, desenhaLinhaDoTempo, desenhaEmpresas, desenhaDetalhe };
});
