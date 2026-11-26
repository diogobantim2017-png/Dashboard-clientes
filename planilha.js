/*
 * Planilha do Mapa de cruzamentos: a tabela onde o time inclui e corrige clientes direto no site.
 * Este arquivo só desenha a tabela e cuida da digitação; quem grava no banco é o app.js.
 */
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.Planilha = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSAO = '8';

  // Colunas na ordem da planilha. É também a ordem usada ao colar do Excel sem a linha de títulos.
  // O que mais se digita fica à esquerda; MU, setor e grade costumam vir preenchidos sozinhos.
  const COLUNAS = [
    { campo: 'evento', rotulo: 'Evento', obrigatorio: true, lista: 'pl-eventos', classe: 'pl-c-evento', dica: 'Ex.: SPARK 2026' },
    { campo: 'data_evento', rotulo: 'Data', obrigatorio: true, classe: 'pl-c-data', dica: 'Data ou ano' },
    { campo: 'empresa', rotulo: 'Empresa', obrigatorio: true, lista: 'pl-empresas', classe: 'pl-c-empresa', dica: 'Ex.: Banco Azul' },
    { campo: 'nome', rotulo: 'Nome', classe: 'pl-c-nome', dica: 'Nome completo' },
    { campo: 'cargo', rotulo: 'Cargo', classe: 'pl-c-cargo', dica: 'Ex.: Diretora de TI' },
    { campo: 'interacao', rotulo: 'Tipo de interação', lista: 'pl-interacoes', classe: 'pl-c-tipo', dica: 'Ex.: Almoço' },
    { campo: 'mu', rotulo: 'MU', lista: 'pl-mus', classe: 'pl-c-mu', dica: 'FS' },
    { campo: 'setor', rotulo: 'Setor', opcoes: 'setor', classe: 'pl-c-setor' },
    { campo: 'grade', rotulo: 'Grade', opcoes: 'grade', classe: 'pl-c-grade' },
    { campo: 'observacoes', rotulo: 'Observações', classe: 'pl-c-obs', dica: '' },
  ];
  const CAMPOS = COLUNAS.map((c) => c.campo);
  const coluna = (campo) => COLUNAS.find((c) => c.campo === campo);

  const el = (tag, props = {}, ...filhos) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k.startsWith('data-') || k.startsWith('aria-') || k === 'role' || k === 'list') n.setAttribute(k, v);
      else n[k] = v;
    }
    n.append(...filhos.filter((f) => f !== null && f !== undefined && f !== false));
    return n;
  };

  // Campo de digitação: lista de opções (setor, grade) ou caixa de texto com sugestões.
  function criaControle(campo, valor, opcoesDe, nova) {
    const c = coluna(campo);
    let controle;
    if (c.opcoes) {
      controle = el('select', { class: 'pl-controle' });
      for (const [v, t] of opcoesDe(c.opcoes, nova)) controle.append(new Option(t, v));
      // Um valor que não está na lista (ex.: um setor escrito à mão) continua aparecendo.
      if (valor && ![...controle.options].some((o) => o.value === valor)) controle.append(new Option(valor, valor));
      controle.value = valor || '';
    } else {
      controle = el('input', { type: 'text', class: 'pl-controle', autocomplete: 'off', size: 1, maxLength: campo === 'observacoes' ? 500 : 160 });
      controle.value = valor || '';
      if (c.lista) controle.setAttribute('list', c.lista);
      if (nova && c.dica) controle.placeholder = c.dica;
    }
    controle.dataset.campo = campo;
    controle.setAttribute('aria-label', c.rotulo);
    return controle;
  }

  /* ---------- Cabeçalho e linhas ---------- */

  // ordem: { campo, direcao }; aoOrdenar(campo)
  function desenhaCabecalho(tr, ordem, aoOrdenar) {
    const seta = (campo) => (ordem.campo === campo ? (ordem.direcao === 1 ? ' ↑' : ' ↓') : '');
    const th = (campo, texto, classe) => {
      const b = el('button', { type: 'button', class: 'pl-ordenar', text: `${texto}${seta(campo)}`, title: 'Ordenar por esta coluna' });
      b.addEventListener('click', () => aoOrdenar(campo));
      return el('th', { scope: 'col', class: classe || '', 'aria-sort': ordem.campo === campo ? (ordem.direcao === 1 ? 'ascending' : 'descending') : 'none' }, b);
    };
    tr.replaceChildren(
      ...COLUNAS.map((c) => th(c.campo, c.obrigatorio ? `${c.rotulo} *` : c.rotulo, c.classe)),
      th('criado_em', 'Origem', 'pl-origem'),
      el('th', { scope: 'col', class: 'pl-acoes' }, el('span', { class: 'so-leitor', text: 'Excluir' })));
  }

  // texto(linha, campo) -> { texto, apagado, titulo }; origem(linha) -> [nós]; icone(nome, classe) -> svg
  function desenhaLinhas(tbody, linhas, opcoes) {
    const { texto, origem, icone, vazio } = opcoes;
    if (!linhas.length) {
      tbody.replaceChildren(el('tr', {}, el('td', { class: 'pl-vazia', colSpan: COLUNAS.length + 2, text: vazio || 'Nenhuma linha.' })));
      return;
    }
    tbody.replaceChildren(...linhas.map((l) => {
      const tr = el('tr', { 'data-id': String(l.id) });
      for (const c of COLUNAS) {
        const t = texto(l, c.campo);
        tr.append(el('td', {
          class: `pl-celula ${c.classe}${t.apagado ? ' is-apagado' : ''}`, 'data-campo': c.campo, tabIndex: 0, title: t.titulo || '',
        }, t.texto || ''));
      }
      tr.append(el('td', { class: 'pl-origem' }, ...origem(l)));
      const excluir = el('button', { type: 'button', class: 'pl-excluir', title: 'Excluir esta linha', 'aria-label': `Excluir a linha de ${l.nome || l.empresa}` },
        icone ? icone('fechar', 'cz-icone cz-icone-p') : '×');
      tr.append(el('td', { class: 'pl-acoes' }, excluir));
      return tr;
    }));
  }

  /* ---------- Digitação nas células ---------- */

  /*
   * opcoes: { linhaDe(id), valorEdicao(linha, campo), textoDe(linha, campo), opcoesDe(tipo),
   *           aoSalvar(id, campo, valor) -> Promise<boolean>, aoExcluir(id), aoFechar() }
   * Clique numa célula para mudar. Enter salva, Tab salva e vai para a próxima, Esc desiste.
   */
  function ligaEdicao(corpo, opcoes) {
    let aberto = null;

    const celulaDe = (tr, campo) => (tr ? tr.querySelector(`td[data-campo="${campo}"]`) : null);
    const vizinha = (td, passo) => {
      const tr = td.closest('tr');
      const i = CAMPOS.indexOf(td.dataset.campo) + passo;
      if (i >= 0 && i < CAMPOS.length) return celulaDe(tr, CAMPOS[i]);
      const outra = passo > 0 ? tr.nextElementSibling : tr.previousElementSibling;
      return outra ? celulaDe(outra, passo > 0 ? CAMPOS[0] : CAMPOS[CAMPOS.length - 1]) : null;
    };
    const abaixo = (td, passo) => {
      const tr = td.closest('tr');
      const outra = passo > 0 ? tr.nextElementSibling : tr.previousElementSibling;
      return outra ? celulaDe(outra, td.dataset.campo) : null;
    };
    const mostraTexto = (td, linha, campo) => {
      const t = linha ? opcoes.textoDe(linha, campo) : { texto: '' };
      td.replaceChildren(document.createTextNode(t.texto || ''));
      td.classList.toggle('is-apagado', Boolean(t.apagado));
    };
    const avisaFechou = () => { if (!aberto && opcoes.aoFechar) opcoes.aoFechar(); };

    function segue(destino) {
      if (!destino || !destino.td || !destino.td.isConnected) return;
      if (destino.abrir) abre(destino.td);
      else destino.td.focus();
    }

    async function confirma(destino, silencioso) {
      if (!aberto) return;
      const a = aberto;
      aberto = null;
      const valor = a.controle.value;
      a.td.classList.remove('is-editando');
      if (valor === a.original) {
        mostraTexto(a.td, opcoes.linhaDe(a.id), a.campo);
        segue(destino);
        if (!silencioso) avisaFechou();
        return;
      }
      // Mostra o valor digitado na hora, enquanto salva.
      const rotulo = a.controle.tagName === 'SELECT' ? ((a.controle.selectedOptions && a.controle.selectedOptions[0]) || {}).text || valor : valor;
      a.td.replaceChildren(document.createTextNode(rotulo));
      a.td.classList.remove('is-apagado');
      a.td.classList.add('is-salvando');
      segue(destino);
      let certo = false;
      try { certo = await opcoes.aoSalvar(a.id, a.campo, valor); } catch (e) { certo = false; }
      a.td.classList.remove('is-salvando');
      if (!certo) {
        mostraTexto(a.td, opcoes.linhaDe(a.id), a.campo);
        a.td.classList.add('is-erro');
        setTimeout(() => a.td.classList.remove('is-erro'), 2500);
      }
      avisaFechou();
    }

    function cancela() {
      if (!aberto) return;
      const a = aberto;
      aberto = null;
      a.td.classList.remove('is-editando');
      mostraTexto(a.td, opcoes.linhaDe(a.id), a.campo);
      a.td.focus();
      avisaFechou();
    }

    function abre(td, inicial) {
      if (!td || !td.isConnected) return;
      if (aberto) {
        if (aberto.td === td) return;
        confirma(null, true);
      }
      const tr = td.closest('tr[data-id]');
      if (!tr) return;
      const id = Number(tr.dataset.id);
      const campo = td.dataset.campo;
      const linha = opcoes.linhaDe(id);
      if (!linha || !coluna(campo)) return;
      const original = opcoes.valorEdicao(linha, campo);
      const controle = criaControle(campo, inicial !== undefined ? inicial : original, opcoes.opcoesDe, false);
      td.replaceChildren(controle);
      td.classList.add('is-editando');
      aberto = { td, id, campo, original, controle };
      controle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); confirma({ td: abaixo(td, 1) || td }); }
        else if (e.key === 'Escape') { e.preventDefault(); cancela(); }
        else if (e.key === 'Tab') {
          e.preventDefault();
          const proxima = vizinha(td, e.shiftKey ? -1 : 1);
          confirma(proxima ? { td: proxima, abrir: true } : null);
        }
      });
      controle.addEventListener('blur', () => { if (aberto && aberto.controle === controle) confirma(null); });
      controle.focus();
      if (controle.tagName === 'INPUT') {
        if (inicial !== undefined) { const n = controle.value.length; controle.setSelectionRange(n, n); } else controle.select();
      }
    }

    corpo.addEventListener('click', (e) => {
      const excluir = e.target.closest('.pl-excluir');
      if (excluir) {
        const tr = excluir.closest('tr[data-id]');
        if (tr) opcoes.aoExcluir(Number(tr.dataset.id));
        return;
      }
      const td = e.target.closest('td.pl-celula');
      if (td && !td.classList.contains('is-editando')) abre(td);
    });

    corpo.addEventListener('keydown', (e) => {
      const td = e.target;
      if (!td.matches || !td.matches('td.pl-celula') || td.classList.contains('is-editando')) return;
      if (e.key === 'Enter' || e.key === 'F2') { e.preventDefault(); abre(td); return; }
      const destinos = { ArrowDown: () => abaixo(td, 1), ArrowUp: () => abaixo(td, -1), ArrowRight: () => vizinha(td, 1), ArrowLeft: () => vizinha(td, -1) };
      if (destinos[e.key]) {
        e.preventDefault();
        const outra = destinos[e.key]();
        if (outra) outra.focus();
        return;
      }
      // Começar a digitar numa célula já abre a edição, como no Excel.
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && !coluna(td.dataset.campo).opcoes) {
        e.preventDefault();
        abre(td, e.key);
      }
    });

    return { editando: () => Boolean(aberto), termina: () => confirma(null) };
  }

  /* ---------- Linha azul (incluir cliente novo) ---------- */

  function montaNovaLinha(tbody, opcoesDe) {
    const controles = {};
    const tr = el('tr', { class: 'pl-nova' });
    for (const c of COLUNAS) {
      const controle = criaControle(c.campo, '', opcoesDe, true);
      controles[c.campo] = controle;
      tr.append(el('td', { class: `pl-celula ${c.classe}` }, controle));
    }
    const botao = el('button', { type: 'button', class: 'botao botao-principal pl-incluir', text: 'Incluir' });
    tr.append(el('td', { class: 'pl-origem' }, botao), el('td', { class: 'pl-acoes' }));
    tbody.replaceChildren(tr);

    const valores = () => Object.fromEntries(CAMPOS.map((c) => [c, controles[c].value]));
    const limpa = (campos) => {
      for (const c of campos) {
        controles[c].value = '';
        delete controles[c].dataset.auto;
      }
    };
    const foca = (campo) => { if (controles[campo]) controles[campo].focus(); };
    const preenche = (campo, valor, automatico) => {
      const ctl = controles[campo];
      if (!ctl) return;
      if (ctl.tagName === 'SELECT' && valor && ![...ctl.options].some((o) => o.value === valor)) ctl.append(new Option(valor, valor));
      ctl.value = valor;
      if (automatico) ctl.dataset.auto = '1'; else delete ctl.dataset.auto;
    };
    // Quando a pessoa digita num campo, ele deixa de ser preenchido sozinho.
    for (const ctl of Object.values(controles)) {
      ctl.addEventListener(ctl.tagName === 'SELECT' ? 'change' : 'input', () => { delete ctl.dataset.auto; });
    }
    return { tr, controles, botao, valores, limpa, foca, preenche };
  }

  return { VERSAO, COLUNAS, CAMPOS, desenhaCabecalho, desenhaLinhas, ligaEdicao, montaNovaLinha };
});
