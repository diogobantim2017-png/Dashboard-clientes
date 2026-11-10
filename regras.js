/*
 * Regras do Mapa de cruzamentos.
 * Tudo aqui é cálculo puro: ler colunas da planilha, limpar nomes,
 * evitar linhas repetidas e montar os números do painel.
 */
(function (raiz, fabrica) {
  const api = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else raiz.Regras = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const VERSAO = '5';
  const SEM_SETOR = 'Sem setor';
  const SETORES = ['Bancos', 'Seguros', 'Varejo', 'Telecom', 'Saúde', 'Energia', 'Indústria', 'Governo', 'Tecnologia', 'Serviços', 'Outro'];
  const INTERACOES = ['Visita ao estande', 'Reunião agendada', 'Palestra ou painel', 'Sala VIP', 'Convidado'];
  const INTERACAO_PADRAO = 'Participou do evento';

  /* ---------- Texto ---------- */

  const semAcento = (t) => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const limpa = (t) => String(t ?? '').replace(/[\u200B-\u200D\uFEFF\u00A0\t\r\n]/g, ' ').replace(/\s+/g, ' ').trim();
  const chave = (t) => semAcento(limpa(t)).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const chaveCabecalho = (t) => semAcento(String(t ?? '')).toLowerCase().replace(/[^a-z0-9]/g, '');
  const temTermo = (texto, termo) => ` ${texto} `.includes(` ${termo} `);

  const ACRONIMOS = new Set(['CEO', 'CFO', 'CIO', 'CTO', 'COO', 'CMO', 'CDO', 'CISO', 'CRO', 'CHRO', 'CPO', 'CSO', 'VP', 'SVP', 'EVP',
    'TI', 'IT', 'RH', 'HR', 'CX', 'UX', 'UI', 'BI', 'AI', 'IA', 'ESG', 'PMO', 'SAP', 'CRM', 'ERP', 'B2B', 'B2C', 'BPO', 'LGPD',
    'DPO', 'TIM', 'XP', 'BTG', 'BV', 'BRB', 'BRF', 'JBS', 'WEG', 'CQCS', 'BB', 'CEF', 'SA']);
  const MINUSCULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'para', 'por', 'of', 'the', 'and', 'y', 'del', 'la', 'a', 'o']);
  const VOGAIS = /[aeiouáéíóúâêôãõàü]/i;

  // Só mexe em nomes escritos TODO EM MAIÚSCULAS ou todo em minúsculas.
  const capitaliza = (texto) => {
    const t = limpa(texto);
    const letras = t.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '');
    const tudoMaiusculo = letras.length > 3 && letras === letras.toUpperCase();
    const tudoMinusculo = letras.length > 0 && letras === letras.toLowerCase();
    if (!tudoMaiusculo && !tudoMinusculo) return t;
    const palavra = (p, primeira) => p.split('-').map((pedaco) => {
      const base = pedaco.toLowerCase();
      if (!base) return pedaco;
      if (!primeira && MINUSCULAS.has(base)) return base;
      if (ACRONIMOS.has(pedaco.toUpperCase())) return pedaco.toUpperCase();
      if (/\d/.test(pedaco) || (base.length <= 3 && !VOGAIS.test(base))) return pedaco.toUpperCase();
      return base.charAt(0).toUpperCase() + base.slice(1);
    }).join('-');
    return t.split(' ').map((p, i) => palavra(p, i === 0)).join(' ');
  };

  /* ---------- Empresas ---------- */

  const SUFIXO = /[\s,.-]+(s\.?\s*\/?\s*a\.?|ltda\.?|limitada|eireli|epp|inc\.?|llc|ltd\.?|limited|corp\.?|corporation|holding|participa[cç](?:[oõ]es|ao)|group)$/i;
  const tiraSufixos = (nome) => {
    let t = limpa(nome);
    let antes;
    do {
      antes = t;
      t = t.replace(SUFIXO, '').replace(/[\s,.;:-]+$/, '').trim();
    } while (t !== antes && t.length > 1);
    return t || limpa(nome);
  };
  const empresaExibicao = (nome) => capitaliza(tiraSufixos(nome));
  const chaveEmpresa = (nome) => chave(tiraSufixos(nome));
  const ehCapgemini = (nome, dominioEmail) => /\bcapgemini\b/.test(chaveEmpresa(nome)) || /(^|\.)capgemini\.com$/.test(dominioEmail || '');

  const GRATUITOS = new Set(['gmail.com', 'googlemail.com', 'hotmail.com', 'hotmail.com.br', 'outlook.com', 'outlook.com.br', 'live.com',
    'live.com.br', 'msn.com', 'yahoo.com', 'yahoo.com.br', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'bol.com.br', 'uol.com.br',
    'terra.com.br', 'ig.com.br', 'globo.com', 'globomail.com', 'r7.com', 'zipmail.com.br', 'protonmail.com', 'proton.me']);
  const IGNORAR_DOMINIO = new Set(['com', 'br', 'net', 'org', 'gov', 'edu', 'co', 'io', 'app', 'info', 'biz', 'adv', 'ind', 'emp', 'mail', 'email', 'corp']);
  const dominio = (email) => {
    const m = limpa(email).toLowerCase().match(/@([a-z0-9.-]+\.[a-z]{2,})$/);
    return m ? m[1] : '';
  };
  const dominioCorporativo = (email) => {
    const d = dominio(email);
    return d && !GRATUITOS.has(d) ? d : '';
  };
  const empresaDoDominio = (d) => {
    const partes = String(d || '').split('.');
    const nucleo = partes.filter((p) => p && !IGNORAR_DOMINIO.has(p));
    const base = nucleo.length ? nucleo[nucleo.length - 1] : partes[0] || '';
    return capitaliza(base.replace(/-/g, ' '));
  };

  /* ---------- Setor ---------- */

  const SETOR_SINONIMOS = [
    ['Bancos', ['banco', 'bancos', 'bank', 'banking', 'financeiro', 'financeira', 'financial', 'financial services', 'servicos financeiros',
      'fintech', 'cooperativa', 'credito', 'investimentos', 'meios de pagamento', 'pagamentos', 'bancos e financas', 'financas']],
    ['Seguros', ['seguro', 'seguros', 'seguradora', 'insurance', 'previdencia', 'resseguro', 'capitalizacao', 'corretora de seguros']],
    ['Varejo', ['varejo', 'retail', 'consumo', 'bens de consumo', 'cpg', 'e commerce', 'ecommerce', 'atacado', 'supermercado', 'moda', 'varejo e consumo']],
    ['Telecom', ['telecom', 'telecomunicacoes', 'telco', 'telecommunications', 'midia', 'media', 'tmt']],
    ['Saúde', ['saude', 'health', 'healthcare', 'hospital', 'farma', 'farmaceutica', 'pharma', 'life sciences', 'ciencias da vida']],
    ['Energia', ['energia', 'energy', 'utilities', 'utility', 'oleo e gas', 'oil gas', 'oil and gas', 'petroleo', 'mineracao', 'mining', 'saneamento']],
    ['Indústria', ['industria', 'manufatura', 'manufacturing', 'automotivo', 'automotive', 'quimica', 'siderurgia', 'agro', 'agronegocio', 'aeroespacial']],
    ['Governo', ['governo', 'government', 'setor publico', 'publico', 'public sector', 'prefeitura']],
    ['Tecnologia', ['tecnologia', 'technology', 'tech', 'ti', 'software', 'it']],
    ['Serviços', ['servicos', 'services', 'consultoria', 'logistica', 'transporte', 'educacao', 'turismo', 'aviacao']],
    ['Outro', ['outro', 'outros', 'other']],
  ];
  const normalizaSetor = (valor) => {
    const k = chave(valor);
    if (!k) return '';
    if (k === chave(SEM_SETOR)) return SEM_SETOR;
    for (const [setor, lista] of SETOR_SINONIMOS) if (k === chave(setor) || lista.includes(k)) return setor;
    for (const [setor, lista] of SETOR_SINONIMOS) if (lista.some((s) => s.length >= 5 && temTermo(k, s))) return setor;
    return capitaliza(limpa(valor));
  };

  const PISTAS_SETOR = [
    ['Seguros', ['seguro', 'seguros', 'seguradora', 'previdencia', 'capitalizacao', 'porto seguro', 'sulamerica', 'sul america', 'mapfre',
      'tokio marine', 'allianz', 'zurich', 'liberty', 'icatu', 'brasilprev', 'insurance']],
    ['Bancos', ['banco', 'bank', 'financeira', 'credito', 'cooperativa', 'fintech', 'investimentos', 'pagamentos', 'sicoob', 'sicredi',
      'nubank', 'itau', 'bradesco', 'santander', 'caixa economica', 'btg', 'safra', 'banrisul', 'xp', 'c6', 'cielo', 'stone', 'pagseguro']],
    ['Telecom', ['telecom', 'telco', 'telefonica', 'vivo', 'claro', 'tim', 'oi', 'algar', 'embratel']],
    ['Saúde', ['hospital', 'saude', 'health', 'farma', 'pharma', 'laboratorio', 'laboratorios', 'clinica', 'medicina', 'unimed', 'hapvida',
      'amil', 'dasa', 'fleury', 'einstein']],
    ['Energia', ['energia', 'eletrica', 'petrobras', 'petroleo', 'gas', 'power', 'enel', 'cemig', 'copel', 'eletrobras', 'raizen', 'vale',
      'sabesp', 'mineracao', 'energy']],
    ['Varejo', ['lojas', 'magazine', 'varejo', 'supermercado', 'supermercados', 'atacadista', 'atacadao', 'carrefour', 'americanas',
      'renner', 'riachuelo', 'casas bahia', 'mercado livre', 'boticario', 'natura', 'ambev', 'pao de acucar', 'assai', 'drogasil', 'retail']],
    ['Indústria', ['industria', 'industrias', 'metalurgica', 'siderurgica', 'automotiva', 'motors', 'quimica', 'gerdau', 'embraer', 'weg',
      'braskem', 'suzano', 'jbs', 'brf']],
    ['Governo', ['prefeitura', 'governo', 'ministerio', 'secretaria', 'tribunal', 'camara', 'senado', 'assembleia', 'autarquia', 'detran']],
    ['Tecnologia', ['software', 'tecnologia', 'technology', 'sistemas', 'cloud', 'totvs', 'microsoft', 'google', 'aws', 'oracle', 'sap',
      'salesforce', 'databricks', 'ibm', 'servicenow']],
  ];
  const inferirSetor = (empresa) => {
    const k = chave(empresa);
    for (const [setor, termos] of PISTAS_SETOR) if (termos.some((t) => temTermo(k, t))) return setor;
    return SEM_SETOR;
  };

  /* ---------- Tipo de interação ---------- */

  const PISTAS_INTERACAO = [
    ['Sala VIP', ['vip', 'lounge']],
    ['Reunião agendada', ['reuniao', 'reunioes', 'meeting', 'meetings', 'agenda', 'agendada', 'agendado']],
    ['Palestra ou painel', ['palestra', 'painel', 'talk', 'keynote', 'sessao', 'session', 'workshop', 'apresentacao', 'palestrante', 'painelista', 'speaker']],
    ['Visita ao estande', ['estande', 'stand', 'booth', 'visita', 'visitou', 'cracha', 'badge', 'scan', 'lead']],
    ['Convidado', ['convidado', 'convidada', 'convidados', 'convite', 'guest', 'almoco', 'jantar', 'cafe', 'encontro', 'coquetel', 'happy hour']],
  ];
  const normalizaInteracao = (valor) => {
    const k = chave(valor);
    if (!k) return INTERACAO_PADRAO;
    for (const [tipo, termos] of PISTAS_INTERACAO) if (k === chave(tipo) || termos.some((t) => temTermo(k, t))) return tipo;
    if (k === chave(INTERACAO_PADRAO)) return INTERACAO_PADRAO;
    const t = limpa(valor);
    return t.charAt(0).toUpperCase() + t.slice(1);
  };

  /* ---------- Datas ---------- */

  const MESES_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const MESES_EN = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const doisDigitos = (n) => String(n).padStart(2, '0');
  const dataValida = (ano, mes, dia) => {
    if (!(ano >= 2000 && ano <= 2100 && mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31)) return '';
    const d = new Date(Date.UTC(ano, mes - 1, dia));
    if (d.getUTCMonth() !== mes - 1) return '';
    return `${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}`;
  };
  const dataISO = (valor) => {
    if (valor === null || valor === undefined || valor === '') return '';
    if (valor instanceof Date) {
      if (Number.isNaN(valor.getTime())) return '';
      return dataValida(valor.getFullYear(), valor.getMonth() + 1, valor.getDate());
    }
    if (typeof valor === 'number') valor = String(valor);
    const t = limpa(valor);
    if (!t) return '';
    if (/^\d{5}(\.\d+)?$/.test(t)) {
      const serie = Math.floor(Number(t));
      if (serie > 36000 && serie < 75000) {
        const d = new Date(Date.UTC(1899, 11, 30) + serie * 86400000);
        return dataValida(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
      }
    }
    let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) return dataValida(+m[1], +m[2], +m[3]);
    m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
    if (m) {
      let ano = +m[3];
      if (ano < 100) ano += 2000;
      return dataValida(ano, +m[2], +m[1]);
    }
    m = semAcento(t).toLowerCase().match(/^(\d{1,2})\s*(?:de\s+)?([a-z]{3})[a-z]*\.?\s*(?:de\s+)?(\d{4})/);
    if (m) {
      let mes = MESES_PT.indexOf(m[2]);
      if (mes < 0) mes = MESES_EN.indexOf(m[2]);
      if (mes >= 0) return dataValida(+m[3], mes + 1, +m[1]);
    }
    return '';
  };

  /* ---------- Colunas da planilha ---------- */

  const CAMPOS = [
    { id: 'evento', rotulo: 'Evento', sinonimos: ['evento', 'nomedoevento', 'nomeevento', 'event', 'eventname', 'eventoparticipado'] },
    { id: 'data', rotulo: 'Data do evento', sinonimos: ['datadoevento', 'dataevento', 'data', 'date', 'eventdate', 'dia', 'datadeinicio', 'datainicio'] },
    { id: 'empresa', rotulo: 'Empresa', sinonimos: ['empresa', 'nomedaempresa', 'company', 'companyname', 'companhia', 'organizacao', 'organization',
      'organisation', 'instituicao', 'empresacliente', 'cliente', 'account', 'accountname', 'conta'] },
    { id: 'setor', rotulo: 'Setor', sinonimos: ['setor', 'setordaempresa', 'segmento', 'industry', 'industria', 'vertical', 'ramo', 'ramodeatividade'] },
    { id: 'nome', rotulo: 'Nome', sinonimos: ['nomecompleto', 'fullname', 'nome', 'name', 'participante', 'convidado', 'convidada', 'attendee',
      'attendeename', 'contato', 'primeironome', 'firstname', 'prenome'] },
    { id: 'sobrenome', rotulo: 'Sobrenome (se vier separado)', sinonimos: ['sobrenome', 'lastname', 'surname', 'ultimonome', 'familyname'] },
    { id: 'cargo', rotulo: 'Cargo', sinonimos: ['cargo', 'jobtitle', 'title', 'funcao', 'position', 'role', 'cargoatual', 'cargofuncao'] },
    { id: 'email', rotulo: 'E-mail (só para achar a empresa)', sinonimos: ['emailcorporativo', 'email', 'emailprofissional', 'emailaddress',
      'enderecodeemail', 'mail', 'ecorreio'] },
    { id: 'interacao', rotulo: 'Tipo de interação', sinonimos: ['tipodeinteracao', 'interacao', 'tipodecontato', 'tipodeparticipacao', 'touchpoint',
      'interaction', 'tipo'] },
    { id: 'observacoes', rotulo: 'Observações', sinonimos: ['observacoes', 'observacao', 'obs', 'notas', 'notes', 'comentarios', 'comentario', 'comments'] },
  ];

  // Liga cada campo a uma coluna. Primeiro nomes exatos, depois começos parecidos.
  const mapeiaColunas = (cabecalho) => {
    const chaves = cabecalho.map(chaveCabecalho);
    const usadas = new Set();
    const mapa = {};
    for (const campo of CAMPOS) {
      for (const s of campo.sinonimos) {
        const i = chaves.findIndex((k, j) => k === s && !usadas.has(j));
        if (i >= 0) { mapa[campo.id] = i; usadas.add(i); break; }
      }
    }
    for (const campo of CAMPOS) {
      if (mapa[campo.id] !== undefined) continue;
      for (const s of campo.sinonimos) {
        if (s.length < 4) continue;
        const i = chaves.findIndex((k, j) => k && k.startsWith(s) && !usadas.has(j));
        if (i >= 0) { mapa[campo.id] = i; usadas.add(i); break; }
      }
    }
    return mapa;
  };

  // Acha a linha de cabeçalho nas 15 primeiras (a planilha pode ter título em cima).
  const achaCabecalho = (tabela) => {
    let melhor = 0;
    let pontos = -1;
    const limite = Math.min(tabela.length, 15);
    for (let i = 0; i < limite; i += 1) {
      const linha = tabela[i] || [];
      const mapa = mapeiaColunas(linha.map((c) => String(c ?? '')));
      const p = Object.keys(mapa).length + (mapa.empresa !== undefined ? 2 : 0);
      if (p > pontos) { pontos = p; melhor = i; }
    }
    return melhor;
  };

  // Lê CSV separado por ; , tab ou |, com células entre aspas.
  const lerCSV = (texto) => {
    const t = String(texto ?? '').replace(/^\uFEFF/, '');
    const primeira = t.split(/\r?\n/).find((l) => l.trim()) || '';
    const conta = (ch) => primeira.split(ch).length - 1;
    const sep = [',', '\t', '|'].reduce((melhor, ch) => (conta(ch) > conta(melhor) ? ch : melhor), ';');
    const linhas = [];
    let linha = [];
    let campo = '';
    let aspas = false;
    for (let i = 0; i < t.length; i += 1) {
      const c = t[i];
      if (aspas) {
        if (c === '"') {
          if (t[i + 1] === '"') { campo += '"'; i += 1; } else aspas = false;
        } else campo += c;
      } else if (c === '"' && campo === '') aspas = true;
      else if (c === sep) { linha.push(campo); campo = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && t[i + 1] === '\n') i += 1;
        linha.push(campo);
        linhas.push(linha);
        linha = [];
        campo = '';
      } else campo += c;
    }
    if (campo !== '' || linha.length) { linha.push(campo); linhas.push(linha); }
    return linhas;
  };

  /* ---------- Linhas ---------- */

  const chaveLinha = (l) => [chave(l.evento), String(l.data_evento || '').slice(0, 10), chaveEmpresa(l.empresa), chave(l.nome), chave(l.interacao)].join('|');

  const ehLinhaExemplo = (empresa, observacoes) => /\(exemplo\)\s*$/i.test(limpa(empresa)) || chave(observacoes).includes('linha de exemplo');

  /*
   * Transforma as linhas da planilha em interações prontas para o banco.
   * tabela: linhas de dados (sem o cabeçalho), cada uma um array de células.
   * mapa: { campo: índice da coluna }.
   * contexto: { existentes, apelidos, eventoPadrao, dataPadrao, eventosExtras }.
   */
  const preparaLinhas = (tabela, mapa, contexto = {}) => {
    const existentes = contexto.existentes || [];
    const apelidos = new Map((contexto.apelidos || []).map((a) => [a.apelido, a.empresa]));
    const eventoPadrao = limpa(contexto.eventoPadrao);
    const dataPadrao = dataISO(contexto.dataPadrao);

    const eventosConhecidos = new Map();
    const empresasConhecidas = new Map();
    const chavesExistentes = new Set();
    for (const l of existentes) {
      const ke = chave(l.evento);
      if (!eventosConhecidos.has(ke)) eventosConhecidos.set(ke, { evento: l.evento, data: String(l.data_evento || '').slice(0, 10) });
      const kc = chaveEmpresa(l.empresa);
      const atual = empresasConhecidas.get(kc);
      if (!atual || (atual.setor === SEM_SETOR && l.setor && l.setor !== SEM_SETOR)) empresasConhecidas.set(kc, { empresa: l.empresa, setor: l.setor || SEM_SETOR });
      chavesExistentes.add(chaveLinha(l));
    }

    for (const e of contexto.eventosExtras || []) {
      const ke = chave(e.evento);
      if (ke && !eventosConhecidos.has(ke)) eventosConhecidos.set(ke, { evento: e.evento, data: dataISO(e.data) });
    }

    const celula = (linha, campo) => (mapa[campo] === undefined ? '' : linha[mapa[campo]]);
    const texto = (linha, campo) => limpa(celula(linha, campo));

    // 1ª passada: domínio de e-mail -> empresa, e setores informados por empresa.
    const empresaPorDominio = new Map();
    for (const linha of tabela) {
      const d = dominioCorporativo(texto(linha, 'email'));
      const e = texto(linha, 'empresa');
      if (d && e && !empresaPorDominio.has(d)) empresaPorDominio.set(d, e);
    }

    const resolveEmpresa = (bruta, doArquivo) => {
      const k = chaveEmpresa(bruta);
      if (apelidos.has(k)) return apelidos.get(k);
      if (empresasConhecidas.has(k)) return empresasConhecidas.get(k).empresa;
      if (doArquivo.has(k)) return doArquivo.get(k);
      const nome = empresaExibicao(bruta);
      doArquivo.set(k, nome);
      return nome;
    };

    const ignoradas = { vazias: 0, exemplo: 0, semEmpresa: 0, capgemini: 0, semEvento: 0, semData: 0, repetidas: 0, jaExistiam: 0 };
    const empresasDoArquivo = new Map();
    const eventosDoArquivo = new Map();
    const setorInformado = new Map();
    const brutas = [];

    for (const linha of tabela) {
      if (!linha || linha.every((c) => limpa(c) === '')) { ignoradas.vazias += 1; continue; }
      const obs = texto(linha, 'observacoes');
      let empresaBruta = texto(linha, 'empresa');
      if (ehLinhaExemplo(empresaBruta, obs)) { ignoradas.exemplo += 1; continue; }
      const dom = dominioCorporativo(texto(linha, 'email'));
      if (!empresaBruta && dom) empresaBruta = empresaPorDominio.get(dom) || empresaDoDominio(dom);
      if (!empresaBruta) { ignoradas.semEmpresa += 1; continue; }
      if (ehCapgemini(empresaBruta, dom)) { ignoradas.capgemini += 1; continue; }
      const empresa = resolveEmpresa(empresaBruta, empresasDoArquivo);

      const eventoBruto = texto(linha, 'evento') || eventoPadrao;
      if (!eventoBruto) { ignoradas.semEvento += 1; continue; }
      const ke = chave(eventoBruto);
      const conhecido = eventosConhecidos.get(ke);
      const evento = conhecido ? conhecido.evento : (eventosDoArquivo.get(ke) || limpa(eventoBruto));
      const data = dataISO(celula(linha, 'data')) || (conhecido && conhecido.data) || dataPadrao;
      if (!data) { ignoradas.semData += 1; continue; }
      if (!eventosDoArquivo.has(ke)) eventosDoArquivo.set(ke, evento);

      const setorBruto = normalizaSetor(texto(linha, 'setor'));
      const kc = chaveEmpresa(empresa);
      if (setorBruto && setorBruto !== SEM_SETOR && !setorInformado.has(kc)) setorInformado.set(kc, setorBruto);

      const nome = capitaliza([texto(linha, 'nome'), texto(linha, 'sobrenome')].filter(Boolean).join(' '));
      brutas.push({
        evento,
        data_evento: data,
        empresa,
        nome: nome || null,
        cargo: capitaliza(texto(linha, 'cargo')) || null,
        interacao: normalizaInteracao(texto(linha, 'interacao')),
        observacoes: obs ? obs.slice(0, 500) : null,
      });
    }

    // 2ª passada: setor de cada empresa (o informado, o que já existe ou um palpite pelo nome).
    const setorFinal = new Map();
    const setoresParaAtualizar = [];
    for (const l of brutas) {
      const kc = chaveEmpresa(l.empresa);
      if (setorFinal.has(kc)) continue;
      const conhecida = empresasConhecidas.get(kc);
      const informado = setorInformado.get(kc);
      let setor;
      if (conhecida && conhecida.setor && conhecida.setor !== SEM_SETOR) setor = conhecida.setor;
      else {
        setor = informado || inferirSetor(l.empresa);
        if (conhecida && setor !== SEM_SETOR) setoresParaAtualizar.push({ empresa: conhecida.empresa, setor });
      }
      setorFinal.set(kc, setor);
    }

    const vistas = new Set();
    const linhas = [];
    for (const l of brutas) {
      const pronta = { ...l, setor: setorFinal.get(chaveEmpresa(l.empresa)) || SEM_SETOR };
      const k = chaveLinha(pronta);
      if (chavesExistentes.has(k)) { ignoradas.jaExistiam += 1; continue; }
      if (vistas.has(k)) { ignoradas.repetidas += 1; continue; }
      vistas.add(k);
      linhas.push(pronta);
    }

    const empresasNovas = [...new Set(linhas.map((l) => l.empresa))].filter((e) => !empresasConhecidas.has(chaveEmpresa(e)));
    const eventos = [...new Set(linhas.map((l) => `${l.evento}\u0000${l.data_evento}`))].map((s) => {
      const [evento, data] = s.split('\u0000');
      return { evento, data, linhas: linhas.filter((l) => l.evento === evento && l.data_evento === data).length };
    });
    return { linhas, ignoradas, empresasNovas, eventos, setoresParaAtualizar };
  };

  /* ---------- Números do painel ---------- */

  const pessoa = (l) => `${chaveEmpresa(l.empresa)}|${chave(l.nome)}`;
  const dia = (l) => String(l.data_evento || '').slice(0, 10);

  const resumo = (linhas) => {
    const resumir = (setor, ls) => {
      const eventosPorEmpresa = new Map();
      for (const l of ls) {
        if (!eventosPorEmpresa.has(l.empresa)) eventosPorEmpresa.set(l.empresa, new Set());
        eventosPorEmpresa.get(l.empresa).add(l.evento);
      }
      const eventosPorPessoa = new Map();
      for (const l of ls) {
        if (!limpa(l.nome)) continue;
        const k = pessoa(l);
        if (!eventosPorPessoa.has(k)) eventosPorPessoa.set(k, new Set());
        eventosPorPessoa.get(k).add(l.evento);
      }
      return {
        setor,
        empresas: eventosPorEmpresa.size,
        recorrentes: [...eventosPorEmpresa.values()].filter((s) => s.size >= 2).length,
        pessoas: eventosPorPessoa.size,
        pessoas_recorrentes: [...eventosPorPessoa.values()].filter((s) => s.size >= 2).length,
        eventos: new Set(ls.map((l) => l.evento)).size,
      };
    };
    const setores = [...new Set(linhas.map((l) => l.setor || SEM_SETOR))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return [resumir('Todos', linhas), ...setores.map((s) => resumir(s, linhas.filter((l) => (l.setor || SEM_SETOR) === s)))];
  };

  const cruzamentos = (linhas) => {
    const m = new Map();
    for (const l of linhas) {
      const k = `${l.empresa}\u0000${l.evento}`;
      if (!m.has(k)) m.set(k, { empresa: l.empresa, setor: l.setor || SEM_SETOR, evento: l.evento, data: dia(l), pessoas: new Set(), interacoes: new Set() });
      const c = m.get(k);
      if (dia(l) < c.data) c.data = dia(l);
      c.pessoas.add(pessoa(l));
      if (l.interacao) c.interacoes.add(l.interacao);
    }
    return [...m.values()].map((c) => ({ ...c, pessoas: c.pessoas.size, interacoes: [...c.interacoes] }));
  };

  const porEmpresa = (linhas) => {
    const m = new Map();
    for (const l of linhas) {
      if (!m.has(l.empresa)) m.set(l.empresa, { empresa: l.empresa, setor: l.setor || SEM_SETOR, eventos: new Set(), pessoas: new Set(), datas: [] });
      const e = m.get(l.empresa);
      e.eventos.add(l.evento);
      if (limpa(l.nome)) e.pessoas.add(pessoa(l));
      e.datas.push(dia(l));
    }
    return [...m.values()].map((e) => {
      const datas = e.datas.sort();
      return { empresa: e.empresa, setor: e.setor, eventos: e.eventos.size, pessoas: e.pessoas.size, primeiro_contato: datas[0], ultimo_contato: datas[datas.length - 1] };
    });
  };

  const porEvento = (linhas) => {
    const estreia = new Map();
    for (const l of linhas) if (!estreia.has(l.empresa) || dia(l) < estreia.get(l.empresa)) estreia.set(l.empresa, dia(l));
    const grupos = new Map();
    for (const l of linhas) {
      for (const setor of ['Todos', l.setor || SEM_SETOR]) {
        const k = `${setor}\u0000${l.evento}`;
        if (!grupos.has(k)) grupos.set(k, { setor, evento: l.evento, data: dia(l), empresas: new Set(), pessoas: new Set() });
        const g = grupos.get(k);
        if (dia(l) < g.data) g.data = dia(l);
        g.empresas.add(l.empresa);
        g.pessoas.add(pessoa(l));
      }
    }
    return [...grupos.values()].map((g) => {
      const lista = [...g.empresas];
      const ja = lista.filter((e) => estreia.get(e) < g.data).length;
      return { setor: g.setor, evento: g.evento, data: g.data, empresas: lista.length, ja_conheciam: ja, primeira_vez: lista.length - ja, pessoas: g.pessoas.size };
    });
  };

  // Uma linha por pessoa (nome + empresa): em quantos eventos e quantas vezes cruzou com a gente.
  const porPessoa = (linhas) => {
    const m = new Map();
    for (const l of linhas) {
      if (!limpa(l.nome)) continue;
      const k = pessoa(l);
      if (!m.has(k)) m.set(k, { chave: k, nome: limpa(l.nome), empresa: l.empresa, setor: l.setor || SEM_SETOR, cargo: '', dataCargo: '', eventos: new Set(), vezes: 0, datas: [] });
      const p = m.get(k);
      p.eventos.add(l.evento);
      p.vezes += 1;
      p.datas.push(dia(l));
      if (limpa(l.cargo) && dia(l) >= p.dataCargo) { p.cargo = limpa(l.cargo); p.dataCargo = dia(l); }
    }
    return [...m.values()].map((p) => {
      const datas = p.datas.sort();
      return { chave: p.chave, nome: p.nome, empresa: p.empresa, setor: p.setor, cargo: p.cargo, eventos: p.eventos.size, vezes: p.vezes, primeiro_contato: datas[0], ultimo_contato: datas[datas.length - 1] };
    });
  };

  const lotes = (linhas) => {
    const m = new Map();
    for (const l of linhas) {
      if (!l.lote) continue;
      if (!m.has(l.lote)) {
        m.set(l.lote, {
          lote: l.lote, arquivo: l.arquivo || '', enviado_por: l.enviado_por || '', enviado_por_nome: l.enviado_por_nome || '',
          enviado_por_id: l.enviado_por_id || '', criado_em: l.criado_em || '', linhas: 0, eventos: new Set(),
        });
      }
      const g = m.get(l.lote);
      g.linhas += 1;
      g.eventos.add(l.evento);
      if (l.criado_em && l.criado_em < g.criado_em) g.criado_em = l.criado_em;
    }
    return [...m.values()].map((g) => ({ ...g, eventos: [...g.eventos] })).sort((a, b) => String(b.criado_em).localeCompare(String(a.criado_em)));
  };

  return {
    VERSAO, SEM_SETOR, SETORES, INTERACOES, INTERACAO_PADRAO, CAMPOS,
    semAcento, limpa, chave, capitaliza, tiraSufixos, empresaExibicao, chaveEmpresa, ehCapgemini,
    dominio, dominioCorporativo, empresaDoDominio, normalizaSetor, inferirSetor, normalizaInteracao, dataISO,
    mapeiaColunas, achaCabecalho, lerCSV, chaveLinha, preparaLinhas,
    resumo, cruzamentos, porEmpresa, porEvento, porPessoa, lotes, chavePessoa: pessoa,
  };
});
