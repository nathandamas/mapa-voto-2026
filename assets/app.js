/* Mapa do 1º e do 2º turno por local de votação — Eleições 2026 (1º turno: só na versão em português).
   Dados prontos em data/ (scripts/gerar_dados.py). O site é estático: nada é calculado no servidor.
   Ordem de carga: meta.json (sempre fresco) -> malha + resultado por município -> locais da UF sob demanda. */
"use strict";

const CONFIG = Object.assign({
  // mapa base: "esri" = Light Gray Canvas da Esri, o mesmo do Nexo (fundo cinza uniforme e nomes por cima dos pontos);
  // "carto" = Positron (CARTO), estilo vetorial; null = fundo liso
  fundo: "esri",
  estiloCarto: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  zoomSomeMunicipio: 9,                        // a partir daqui as áreas dos municípios somem: só o mapa base e os locais
  brasil: [[-74.0, -33.8], [-32.3, 5.3]],   // inclui Fernando de Noronha
  zoomLocais: 8,                              // a partir deste zoom, carrega e mostra os locais de votação
  faixasVencedor: [60, 70],                   // % do vencedor: 50–60, 60–70, 70+
  faixasVencedorGov: [60],                    // governador: 50–60 e 60+ (2 tons: só assim cabem 5 matizes distinguíveis, veja docs/fundamentacao.md)
  /* Escalas (fundamentação em docs/fundamentacao.md):
     - % de um candidato: divergente com ponto crítico em 50% (Brewer, 1996), nas cores dos dois candidatos;
     - variação desde o 1º turno: divergente PRGn do ColorBrewer (sem confundir sinal com partido), centro em 0;
     - brancos e nulos (RdPu) e abstenção (YlGnBu): sequenciais de 4 classes do ColorBrewer, quebras nos quartis
       dos municípios calculados pelo pipeline (META.escalas); estas são só o valor de reserva.
     Todas medidas com ΔE00 >= 10 entre classes vizinhas, também simulando deuteranomalia e protanomalia. */
  faixasCandidato: [30, 40, 50, 60, 70], faixasCandidatoGov: [40, 50, 60],
  faixasCandidato1: [10, 20, 40],             // 1º turno, % de um candidato: reserva, se o pipeline não mandar os quartis
  seqBrancosNulos: ["#fbb4b9", "#f768a1", "#c51b8a", "#7a0177"], faixasBrancosNulos: [2, 2.5, 3.5],
  seqAbstencao: ["#a1dab4", "#41b6c4", "#2c7fb8", "#253494"], faixasAbstencao: [15, 20, 25],
  filtrado: "#e6e4df",                        // o que o filtro "só onde teve" deixa de fora fica cinza (como no Nexo)
  faixasVariacao: [-10, -5, 0, 5, 10],        // variação de um candidato ou da vantagem, em pontos percentuais
  minVotosVariacao: 50,                       // locais com menos votos válidos comparáveis ficam esmaecidos (números pequenos)
  // valor por transparência (Roth et al., 2010): municípios com poucos eleitores ficam mais transparentes
  alfaEleitores: [5000, 20000, 100000], alfa: [0.3, 0.5, 0.75, 1],
  /* "Mais votado" e transparência (docs/fundamentacao.md, item 5). Para VOLTAR à legenda anterior (transparência ligada
     ao abrir, com as 3 faixas de margem por candidato), troque para transparenciaPadrao: true e transparenciaCorUnica: false. */
  transparenciaPadrao: false,     // o mapa abre sem transparência: as 6 cores do mapa são as 6 da legenda
  transparenciaCorUnica: true,    // com a transparência ligada, uma cor só por candidato: a claridade passa a mostrar só o eleitorado
  fundoMapa: "#e9e9e7",           // cor do fundo do mapa base, para a legenda em grade mostrar a cor que aparece de fato
  // cores de quem não está em config/candidatos.json: vermelho para o 1º número, azul para o 2º
  coresPadrao: [
    { cor: "#c21a22", tons: ["#f28b95", "#e34a5a", "#c21a22"] },
    { cor: "#22406f", tons: ["#8796db", "#3b64b0", "#22406f"] }],
  semDados: "#c9cfd0", empate: "#5c5c5c",     // empate: cinza escuro, ΔE00 >= 11 contra todos os tons de partido, também para daltônicos
  semEleicao: "#ebe9e4",                      // governador: estado sem 2º turno
  coresVariacao: ["#762a83", "#af8dc3", "#e7d4e8", "#d9f0d3", "#7fbf7b", "#1b7837"],   // PRGn-6 (ColorBrewer)
  esmaecido: 0.14,                            // opacidade relativa do que fica fora do destaque (como no Nexo)
  legendaTamanho: [200, 1000, 4000]
}, window.CONFIG_LOCAL || {});

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const sem = s => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
/* idioma da página (<html lang>): index.html é pt-BR; en/index.html é en-GB; es/index.html é es-ES. Textos em assets/textos.js */
const IDIOMA = ["en-GB", "es-ES"].includes(document.documentElement.lang) ? document.documentElement.lang : "pt-BR";
const TX = window.TEXTOS[IDIOMA];
const fmt = new Intl.NumberFormat(IDIOMA);
const num = (x, casas = 1) => x.toLocaleString(IDIOMA, { minimumFractionDigits: casas, maximumFractionDigits: casas });
const numL = x => x.toLocaleString(IDIOMA, { maximumFractionDigits: 2 });   // número de legenda (2,5 em pt; 2.5 em en)
const PCT = window.TEXTOS[IDIOMA].sinal_pct;   // "%" em pt e en; "\u00a0%" em es (51,79 %, como pede a RAE)
const pct = (x, casas = 1) => num(x * 100, casas) + PCT;
const VAZIO = { type: "FeatureCollection", features: [] };
const ESTILO_VAZIO = { version: 8, sources: {}, layers: [{ id: "fundo", type: "background", paint: { "background-color": "#eef1f1" } }] };
const ND = -9999;                     // "sem dado" nas propriedades das feições
const temMouse = matchMedia("(hover: hover) and (pointer: fine)").matches;

let META, CAND = [], NF = 2, I = {}, MODOS = {}, mapa, popup = null, dica;
let MUN = {}, MUNG = null, MALHA = null, EXT = [];        // EXT: cidades do exterior (data/exterior.json)
let cargo = "pres", GOV = {}, LEG = [];                     // cargo em tela; governador por UF; cores da legenda "mais votado"
const munInfo = new Map();                                  // código IBGE -> {nome, uf, bbox}
const UFS = new Map(), carregando = new Map();              // UF -> dados dos locais (presidente; nomes e coordenadas)
const GUF = new Map(), carregandoG = new Map();             // UF -> votos para governador de cada local
const NOME_UF = {};
let modo = "venc", destaque = null, fixo = null, limiar = 0;
/* transparência pelo eleitorado: ligada por padrão só no "mais votado". Medido (docs/fundamentacao.md): com alfa 0,3 o
   vencedor continua distinguível (ΔE00 13,5 entre os tons claros dos dois), mas as classes de margem se confundem
   (ΔE00 3 a 4); nas escalas sequenciais e de variação, em que a classe é a mensagem, ela fica desligada por padrão. */
const vba = { venc: CONFIG.transparenciaPadrao, seq: false };
/* com a transparência ligada no "mais votado", uma cor por candidato (sem faixas de margem): duas variáveis ordenadas não
   dividem a claridade (Bertin, 1967), e a legenda vira uma grade candidato × eleitorado */
const corUnica = () => vba.venc && CONFIG.transparenciaCorUnica;
const tomForte = c => c.tons[c.tons.length - 1];
/* cor que aparece no mapa: a da classe misturada com o fundo, na opacidade do zoom de país (0,92) vezes a transparência.
   A legenda usa essa cor (e não a cor pura da escala) para que a amostra seja idêntica ao que se vê no mapa. */
function misturar(hex, alfa, fundo = CONFIG.fundoMapa) {
  const n = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), a = n(hex), f = n(fundo), t = 0.92 * alfa;
  return "#" + a.map((x, i) => Math.round(t * x + (1 - t) * f[i]).toString(16).padStart(2, "0")).join("");
}

/* ---------- dados ---------- */
async function json(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.json();
}
const versao = rel => META.arquivos[rel] ? "?v=" + META.arquivos[rel] : "";

/* mistura uma cor com branco (t = 0 é a cor, t = 1 é branco): tons claros das faixas de partido */
function clarear(hex, t) {
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(x => Math.round(x + (255 - x) * t));
  return "#" + c.map(x => x.toString(16).padStart(2, "0")).join("");
}
function indices() {
  NF = META.candidatos.length;
  // vetor: [cand..., branco, nulo, outros, válidos 1t, cand 1t..., cand 2t comparável..., seções comparáveis, aptos]
  // ... e, nas seções com os dois turnos: comparecimento 1t e 2t, brancos+nulos 1t e 2t, aptos dessas seções
  I = { b: NF, n: NF + 1, x: NF + 2, v1: NF + 3, c1t: NF + 4, c2c: 2 * NF + 4, comp: 3 * NF + 4, apt: 3 * NF + 5,
        t1: 3 * NF + 6, t2c: 3 * NF + 7, bn1: 3 * NF + 8, bn2c: 3 * NF + 9, apc: 3 * NF + 10, tam: 3 * NF + 11 };
  CAND = META.candidatos.map((c, i) => ({ ...CONFIG.coresPadrao[i % 2], ...Object.fromEntries(Object.entries(c).filter(([, v]) => v != null)), k: i }));
  // governador: cada partido vira uma entrada de cor; os candidatos de cada UF apontam para ela (k)
  const partidos = [];
  for (const [uf, G] of Object.entries(META.governador || {})) {
    if (!G.segundo_turno) { GOV[uf] = G; continue; }
    const cands = G.candidatos.map(c => {
      let k = partidos.findIndex(p => p.chave === c.chave);
      // governador: 2 tons por partido (claro = 50–60%, escuro = 60%+); de uma rampa de 3, usa o claro e o escuro
      const t = c.tons ? (c.tons.length === 3 ? [c.tons[0], c.tons[2]] : c.tons) : [clarear(c.cor, 0.5), c.cor];
      if (k < 0) { k = partidos.length; partidos.push({ chave: c.chave, nome: c.partido || c.chave, cor: c.cor, tons: t }); }
      return { ...c, k, tons: partidos[k].tons };
    });
    const lider = G.v[0] >= G.v[1] ? 0 : 1;   // quem venceu no estado (para "variação do vencedor")
    GOV[uf] = { ...G, candidatos: cands, lider };
  }
  GOV._partidos = partidos;
}
const temGov = () => (GOV._partidos || []).length > 0;
/* candidatos que valem para uma UF no cargo em tela (null = governador sem 2º turno nessa UF) */
function candsDe(uf) {
  if (turno === 1) return T1C[cargo]?.escopos[escopo(uf)]?.candidatos || null;
  if (cargo === "pres") return CAND;
  const G = GOV[uf];
  return G && G.segundo_turno ? G.candidatos : null;
}

/* Propriedades usadas para colorir: total válido, vencedor e % do vencedor, % de cada candidato, brancos e nulos,
   abstenção, variação de cada candidato desde o 1º turno e variação da vantagem (todas em %/p.p.; ND = sem dado). */
function props(v, uf) {
  if (turno === 1) return props1(v, uf);
  const cands = candsDe(uf);
  const p = { val: 0, w: -2, ws: 0, bn: ND, ab: ND, dm: ND, apt: v?.[I.apt] || 0, vc: 0 };
  for (let i = 0; i < NF; i++) { p["p" + i] = ND; p["d" + i] = ND; }
  if (!cands || !v) { p.w = cands ? -2 : -3; return p; }   // -3: governador sem 2º turno nessa UF
  const val = v.slice(0, NF).reduce((a, b) => a + b, 0), total = val + v[I.b] + v[I.n] + v[I.x];
  p.val = val;
  if (val > 0) {
    const max = Math.max(...v.slice(0, NF)), quem = v.slice(0, NF).map((x, i) => x === max ? i : -1).filter(i => i >= 0);
    p.w = quem.length > 1 ? -1 : cands[quem[0]].k;   // w = entrada de cor (candidato no presidente, partido no governador)
    p.ws = max / val * 100;
    for (let i = 0; i < NF; i++) p["p" + i] = v[i] / val * 100;
  }
  if (total > 0) p.bn = (v[I.b] + v[I.n]) / total * 100;
  if (v[I.apt] > 0 && total > 0) p.ab = Math.max(0, (1 - total / v[I.apt]) * 100);
  const v1 = v[I.v1], c2 = cands.map((_, i) => v[I.c2c + i]), val2 = c2.reduce((a, b) => a + b, 0);
  p.vc = Math.min(v1, val2);   // votos válidos comparáveis (o menor dos dois turnos): base da variação
  if (v1 > 0 && val2 > 0) {
    const d = cands.map((_, i) => (c2[i] / val2 - v[I.c1t + i] / v1) * 100);
    d.forEach((x, i) => { p["d" + i] = x; });
    // diferença: no presidente, 1º número sobre o 2º; no governador, vencedor no estado sobre o 2º colocado
    if (NF === 2) { const a = cargo === "gov" ? GOV[uf].lider : 0; p.dm = d[a] - d[1 - a]; }
  }
  return p;
}

/* ---------- 1º turno (data/t1/, de scripts/gerar_1turno.py): presidente, governador e senador, todos os candidatos ----------
   Vetor de cada lugar, por cargo: [votos de cada candidato do escopo..., brancos, nulos, anulados, comparecimento, aptos]
   ("anulados": votos em candidaturas anuladas, que o TSE não conta como válidos). Escopo: o
   Brasil no presidente; o estado no governador e no senador. Os locais seguem a ordem de data/uf/<UF>.json (2º turno);
   os que só existiram no 1º turno vêm depois, em "extra". Nas três versões (português, inglês e espanhol). */
const TEM_T1 = true;   // false esconde o seletor de turno
let turno = 2, T1 = null, carregandoT1 = null, t1nl = false;
const T1C = {}, T1MUN = {}, T1NL = {}, T1UF = new Map(), carregandoT1UF = new Map();
function carregarT1Meta() {
  if (T1 || !TEM_T1) return Promise.resolve(T1);
  return carregandoT1 ||= json("data/t1/meta.json?t=" + Date.now()).then(M => {
    for (const [cg, C] of Object.entries(M.cargos)) {
      // "mais votado": uma entrada de cor por partido (no presidente, com o nome do candidato). Dois tons no presidente e
      // no governador (menos de 50% e 50% ou mais dos válidos: a maioria absoluta que elege no 1º turno); um tom no
      // senador, em que cada eleitor tem dois votos e ninguém chega perto de 50%
      // governador e senador: cor pela colocação no estado (1º, 2º, 3º; os demais em cinza), não pelo partido
      const L = C.legenda.map(e => ({ chave: e.chave, nome: C.cor_por === "colocacao" ? TX.colocado(e.chave) : e.chave, cor: e.cor,
        tons: cg === "sen" ? [e.tons[e.tons.length - 1]] : e.tons }));
      let nmax = 0;
      for (const E of Object.values(C.escopos)) {
        nmax = Math.max(nmax, E.candidatos.length);
        E.candidatos.forEach(c => {
          c.k = c.chave == null ? -4 : L.findIndex(e => e.chave === c.chave);
          if (cg === "pres" && c.k >= 0) L[c.k].nome = c.nome;
        });
      }
      T1C[cg] = { LEG: L, escopos: C.escopos, nmax, escalas: C.escalas || {} };
    }
    T1 = M;
    return M;
  }).catch(e => { carregandoT1 = null; console.error(e); return null; });
}
const versaoT1 = rel => T1?.arquivos?.[rel] ? "?v=" + T1.arquivos[rel] : "";
async function carregarT1Mun(cg) {
  if (!T1MUN[cg]) T1MUN[cg] = await json(`data/t1/municipios_${cg}.json${versaoT1(`municipios_${cg}.json`)}`);
  if (!t1nl) { Object.assign(T1NL, await json("data/t1/locais_por_municipio.json" + versaoT1("locais_por_municipio.json"))); t1nl = true; }
}
function carregarT1UF(uf) {
  if (!T1 || T1UF.has(uf)) return Promise.resolve(T1UF.get(uf));
  if (carregandoT1UF.has(uf)) return carregandoT1UF.get(uf);
  const pr = json(`data/t1/uf/${uf}.json${versaoT1(`uf/${uf}.json`)}`).then(D => { T1UF.set(uf, D); carregandoT1UF.delete(uf); return D; })
    .catch(e => { carregandoT1UF.delete(uf); console.error(e); });
  carregandoT1UF.set(uf, pr);
  return pr;
}
const escopo = uf => cargo === "pres" ? "BR" : uf;
function props1(v, uf) {
  const C = T1C[cargo], cands = C?.escopos[escopo(uf)]?.candidatos, n = cands?.length || 0;
  const p = { val: 0, w: -2, ws: 0, bn: ND, ab: ND, dm: ND, apt: 0, vc: 0 };
  for (let i = 0; i < (C?.nmax || 0); i++) p["p" + i] = ND;
  if (!cands) { p.w = -3; return p; }
  if (!v) return p;
  const val = soma(v, 0, n), tot = val + v[n] + v[n + 1] + v[n + 2], com = v[n + 3], apt = v[n + 4];
  p.val = val; p.apt = apt;
  if (val > 0) {
    const max = Math.max(...v.slice(0, n)), quem = [];
    for (let i = 0; i < n; i++) { if (v[i] === max) quem.push(i); p["p" + i] = v[i] / val * 100; }
    p.w = quem.length > 1 ? -1 : cands[quem[0]].k;
    p.ws = max / val * 100;
  }
  if (tot > 0) p.bn = (v[n] + v[n + 1]) / tot * 100;
  if (apt > 0 && com > 0) p.ab = Math.max(0, (1 - com / apt) * 100);   // comparecimento = votos para presidente
  return p;
}
function montarModos1() {
  const C = T1C[cargo], nome = c => c.partido ? `${c.nome} (${c.partido})` : c.nome;
  MODOS = { venc: { tipo: "venc", grupo: "", rotulo: TX.venc_rotulo, titulo: TX.venc_titulo,
    nota: [cargo === "pres" ? "" : TX.nota_colocacao, cargo === "sen" ? TX.sen_nota : ""].filter(Boolean).join(" ") } };
  LEG = C.LEG;
  const nmun = {};
  for (const m of munInfo.values()) nmun[m.uf] = (nmun[m.uf] || 0) + 1;
  const escs = Object.keys(C.escopos).sort((a, b) => (NOME_UF[a] || a).localeCompare(NOME_UF[b] || b, IDIOMA));
  for (const esc of escs) {
    C.escopos[esc].candidatos.forEach((c, i) => {
      const uf = esc === "BR" ? undefined : esc, q = c.q || CONFIG.faixasCandidato1;
      MODOS[`c1-${esc}-${i}`] = { tipo: "seq", grupo: uf ? `${TX.grupo_candidatos} · ${NOME_UF[uf] || uf}` : TX.grupo_candidatos,
        rotulo: uf ? `${nome(c)} · ${uf}` : nome(c), titulo: uf ? TX.cand_titulo_gov(c.nome, uf) : TX.cand_titulo(c.nome),
        chave: "p" + i, uf, faixas: q, cores: c.seq, un: "%", filtro: true, max: 100, passo: q[0] < 1 ? 0.1 : 0.5, cand: i,
        nota: [TX.cand1_nota(c.q ? (uf && nmun[uf] < 30 ? "l" : "m") : ""), cargo === "sen" ? TX.sen_nota : ""].filter(Boolean).join(" ") };
    });
  }
  modosOutros(cargo, C.escalas);
  MODOS.bn.titulo = TX.bn_titulo1(cargo);
}
/* resumo do painel no 1º turno */
function resumo1() {
  const C = T1C[cargo];
  if (cargo === "pres") {
    const E = C.escopos.BR, n = E.candidatos.length, val = soma(E.v, 0, n), mostra = 4;
    return TX.resumo_brasil + E.candidatos.slice(0, mostra).map((c, i) =>
      `<span style="color:${c.cor}">■</span> ${esc(c.nome)} <b>${pct(E.v[i] / val, 2)}</b>`).join(" · ") +
      (n > mostra ? ` · ${TX.e_outros(n - mostra)}` : "") + `<br><small>${TX.validos_exterior(fmt.format(val))}</small>`;
  }
  const escs = Object.entries(C.escopos);
  const eleitos = escs.reduce((a, [, E]) => a + E.candidatos.filter(c => c.sit === "eleito").length, 0);
  if (cargo === "sen") return TX.resumo_sen1(eleitos);
  const seg = escs.filter(([, E]) => E.candidatos.some(c => c.sit === "2t")).map(([u]) => u).sort();
  return TX.resumo_gov1(eleitos, seg.length, seg.join(", "));
}
/* selo ao lado do nome: eleito (E); no 1º turno, também quem foi ao 2º turno */
function seloDe(d, i) {
  if (turno === 1) {
    const s = d.cands?.[i]?.sit;
    return s === "eleito" ? " " + selo() : s === "2t" ? ` <abbr class="selo-eleito selo-2t" title="${TX.foi_2t}">${TX.foi_2t_letra}</abbr>` : "";
  }
  return i === eleitoIdx(d) ? " " + selo() : "";
}
/* troca de turno: o 1º turno baixa os seus arquivos na primeira vez */
async function trocarTurno(t, c = cargo, m = "venc") {
  if (t === 1 && !(await carregarT1Meta())) t = 2;
  turno = t === 1 ? 1 : 2;
  $("#turnos").querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(+b.dataset.t === turno)));
  await trocarCargo(c, m);
}
function opcoesCargo() {
  const cg = $("#cargo"), lista = turno === 1 ? ["pres", "gov", "sen"] : temGov() ? ["pres", "gov"] : ["pres"];
  cg.innerHTML = lista.map(c => `<option value="${c}">${TX.cargos[c]}</option>`).join("");
  cg.value = cargo;
  cg.hidden = lista.length < 2;
}

/* ---------- modos (o que o mapa mostra) ---------- */
function montarModos() {
  if (turno === 1) return montarModos1();
  const nome = c => c.partido ? `${c.nome} (${c.partido})` : c.nome;
  MODOS = { venc: { tipo: "venc", grupo: "", rotulo: TX.venc_rotulo, titulo: TX.venc_titulo } };
  if (cargo === "gov") return montarModosGov(nome);
  LEG = CAND;
  CAND.forEach((c, i) => { MODOS["c" + i] = modoCandidato(c, CAND[1 - i] || CONFIG.coresPadrao[1 - (i % 2)], nome(c), TX.cand_titulo(c.nome), i); });
  modosOutros("pres");
  CAND.forEach((c, i) => {
    MODOS["d" + i] = Object.assign(modoVariacao("d" + i, TX.var_rotulo(c.nome), TX.var_titulo(c.nome), TX.var_nota(c.nome)), { vcand: i });
  });
  if (NF === 2) {
    const [a, b] = CAND;
    MODOS.dm = modoVariacao("dm", TX.dm_rotulo, TX.dm_titulo(a.nome, b.nome), TX.dm_nota(a.nome, b.nome));
  }
}
/* % de um candidato: divergente centrada em 50% — abaixo, tons do adversário; acima, tons do próprio */
function modoCandidato(c, outro, rotulo, titulo, i, uf) {
  // 3 tons por lado no presidente (30/40/50/60/70); 2 no governador (40/50/60), que usa rampas de 2 tons
  const n = Math.min(c.tons.length, outro.tons.length), faixas = n === 3 ? CONFIG.faixasCandidato : CONFIG.faixasCandidatoGov;
  return { tipo: "seq", grupo: TX.grupo_candidatos, rotulo, titulo, chave: "p" + i, uf, faixas,
    cores: [...outro.tons.slice(0, n).reverse(), ...c.tons.slice(0, n)], un: "%", filtro: true, max: 100, passo: 1, cand: i,
    nota: TX.cand_nota(c.nome) };
}
/* brancos e nulos, abstenção: sequenciais do ColorBrewer, quebras nos quartis dos municípios (calculados no pipeline) */
function modosOutros(qual, E = META.escalas?.[qual] || {}) {
  MODOS.bn = { tipo: "seq", grupo: TX.grupo_outros, rotulo: TX.bn_rotulo, titulo: TX.bn_titulo(qual === "gov"),
    chave: "bn", faixas: E.bn || CONFIG.faixasBrancosNulos, cores: CONFIG.seqBrancosNulos, un: "%", filtro: true, max: 15, passo: 0.1,
    nota: E.bn ? TX.nota_quartis : "" };
  MODOS.ab = { tipo: "seq", grupo: TX.grupo_outros, rotulo: TX.ab_rotulo, titulo: TX.ab_titulo,
    chave: "ab", faixas: E.ab || CONFIG.faixasAbstencao, cores: CONFIG.seqAbstencao, un: "%", filtro: true, max: 60, passo: 0.5,
    nota: [E.ab ? TX.nota_quartis : "", META.aptos_por_secao || turno === 1 ? "" : TX.nota_aptos_mun].filter(Boolean).join(" ") };
}
function modoVariacao(chave, rotulo, titulo, nota) {
  return { tipo: "seq", grupo: TX.grupo_variacao, rotulo, titulo, chave, faixas: CONFIG.faixasVariacao,
    cores: CONFIG.coresVariacao, un: TX.pp, sinal: true, variacao: true,
    nota: `${nota} ${TX.var_base(CONFIG.minVotosVariacao)}` };
}
function montarModosGov(nome) {
  LEG = GOV._partidos;
  for (const uf of Object.keys(GOV).filter(u => u !== "_partidos" && GOV[u].segundo_turno).sort()) {
    const cs = GOV[uf].candidatos;
    cs.forEach((c, i) => {
      MODOS[`g-${uf}-${i}`] = modoCandidato(c, cs[1 - i], `${nome(c)} · ${uf}`, TX.cand_titulo_gov(c.nome, uf), i, uf);
    });
  }
  modosOutros("gov");
  // variação de cada candidato (só no estado dele, como o % do candidato) e da diferença entre os dois
  for (const uf of Object.keys(GOV).filter(u => u !== "_partidos" && GOV[u].segundo_turno).sort()) {
    GOV[uf].candidatos.forEach((c, i) => {
      MODOS[`gd-${uf}-${i}`] = Object.assign(modoVariacao("d" + i, TX.var_rotulo(`${nome(c)} · ${uf}`),
        TX.var_titulo_gov(c.nome, uf), TX.var_nota(c.nome)), { uf, vcand: i });
    });
  }
  MODOS.dm = modoVariacao("dm", TX.dm_rotulo, TX.dm_titulo_gov, TX.dm_nota_gov);
}

/* ---------- cores e destaque ---------- */
/* faixas de margem do "mais votado": 3 no presidente, 2 no governador */
const faixasVenc = () => turno === 1 ? (cargo === "sen" ? [] : [50]) : cargo === "gov" ? CONFIG.faixasVencedorGov : CONFIG.faixasVencedor;
const g = k => ["get", k];
function corDoModo() {
  const M = MODOS[modo];
  if (M.tipo === "venc") {
    const fx = faixasVenc(), ramos = [];
    // sem faixas (senador no 1º turno), um tom só: "step" exige pelo menos uma quebra
    LEG.forEach((c, i) => ramos.push(["==", g("w"), i], corUnica() || !fx.length ? tomForte(c) : ["step", g("ws"), c.tons[0], ...fx.flatMap((x, j) => [x, c.tons[j + 1]])]));
    return ["case", ["==", g("w"), -3], CONFIG.semEleicao, ["==", g("w"), -2], CONFIG.semDados, ["==", g("w"), -1], CONFIG.empate, ...ramos, CONFIG.semDados];
  }
  const passos = ["step", g(M.chave), M.cores[0]];
  M.faixas.forEach((x, j) => passos.push(x, M.cores[j + 1]));
  let cor = ["case", ["==", g("w"), -3], CONFIG.semEleicao, ["<", g(M.chave), ND + 1], CONFIG.semDados, passos];
  if (M.uf) cor = ["case", ["!=", g("uf"), M.uf], CONFIG.semEleicao, cor];   // candidato a governador: só o estado dele
  return cor;
}
/* condição do destaque da legenda (sob o mouse ou fixado): fora dele, a mesma cor esmaecida */
function condicao() {
  const M = MODOS[modo], hl = destaque || fixo, conds = [];
  if (hl) {
    if (hl.e === "se") conds.push(M.uf ? ["!=", g("uf"), M.uf] : ["==", g("w"), -3]);   // candidato de um estado: os outros estados
    else if (hl.e === "nd") conds.push(["all", ["!=", g("w"), -3], M.tipo === "venc" ? ["==", g("w"), -2] : ["<", g(M.chave), ND + 1]]);
    else if (hl.e === "empate") conds.push(["==", g("w"), -1]);
    else if (M.tipo === "venc") {
      const lim = [0, ...faixasVenc(), 101];
      conds.push(["==", g("w"), hl.c]);
      if (hl.k != null) conds.push([">=", g("ws"), lim[hl.k]], ["<", g("ws"), lim[hl.k + 1]]);
      if (hl.a != null) { const e = [0, ...CONFIG.alfaEleitores, 1e12]; conds.push([">=", g("apt"), e[hl.a]], ["<", g("apt"), e[hl.a + 1]]); }
    } else {
      const lim = [-1e9, ...M.faixas, 1e9];
      conds.push([">", g(M.chave), ND + 1], [">=", g(M.chave), lim[hl.k]], ["<", g(M.chave), lim[hl.k + 1]]);
    }
  }
  return conds.length ? ["all", ...conds] : null;
}
/* filtro "só onde teve X% ou mais": o que fica de fora vira cinza */
function comFiltro(cor) {
  const M = MODOS[modo];
  if (!(M.filtro && limiar > 0)) return cor;
  const passa = M.uf ? ["all", ["==", g("uf"), M.uf], [">=", g(M.chave), limiar]] : [">=", g(M.chave), limiar];
  return ["case", ["==", g("w"), -3], CONFIG.semEleicao, passa, cor, CONFIG.filtrado];
}
const vezes = (...xs) => { const f = xs.filter(x => x !== 1 && x != null); return f.length === 0 ? 1 : f.length === 1 ? f[0] : ["*", ...f]; };
/* paradas: [[zoom, opacidade], ...]. Fora do destaque da legenda, a mesma cor bem mais clara (como no Nexo).
   mult: multiplicador por feição (transparência por eleitorado, esmaecimento de números pequenos, pontos vazados). */
function opacidade(paradas, mult = 1) {
  const c = condicao();
  return ["interpolate", ["linear"], ["zoom"], ...paradas.flatMap(([z, o]) => [z, vezes(c ? ["case", c, o, o * CONFIG.esmaecido] : o, mult)])];
}
function pintar() {
  if (!mapa?.getLayer("mun-fill")) return;
  const M = MODOS[modo], cor = comFiltro(corDoModo()), zl = CONFIG.zoomLocais;
  // valor por transparência: o peso visual acompanha o número de eleitores do município (Roth, Woodruff e Johnson, 2010)
  const [e1, e2, e3] = CONFIG.alfaEleitores, [a0, a1, a2, a3] = CONFIG.alfa;
  const alfa = vba[M.tipo] ? ["step", g("apt"), a0, e1, a1, e2, a2, e3, a3] : 1;
  // variação: base pequena demais oscila muito por acaso (Gelman e Price, 1999) — esses locais ficam apagados
  const fraco = M.variacao ? ["<", g("vc"), CONFIG.minVotosVariacao] : false;
  const poucos = M.variacao ? ["case", fraco, 0.3, 1] : 1;
  // como no Nexo: ao aproximar, as áreas dos municípios somem e o fundo fica de uma cor só, com os locais por cima
  const zs = CONFIG.zoomSomeMunicipio, paradasMun = [[7, 0.92], [CONFIG.zoomLocais, 0.6], [zs, 0]];
  mapa.setPaintProperty("mun-fill", "fill-color", cor);
  mapa.setPaintProperty("mun-fill", "fill-opacity", opacidade(paradasMun, vezes(alfa, poucos)));
  // divisas municipais: somem junto com as áreas (a seleção e o contorno do mouse continuam)
  mapa.setPaintProperty("mun-linha", "line-opacity", ["interpolate", ["linear"], ["zoom"], 7, 0.7, zs, 0]);
  // posição aproximada (centro da localidade no CNEFE): círculo vazado, só o contorno na cor da classe
  const aprox = ["==", g("ap"), 1];
  mapa.setPaintProperty("locais", "circle-color", cor);
  // base pequena na variação: preenchimento apagado com contorno cinza (fica visível, mas sem peso)
  mapa.setPaintProperty("locais", "circle-stroke-color", ["case", aprox, cor, fraco, "#6b7b80", "#ffffff"]);
  mapa.setPaintProperty("locais", "circle-opacity", opacidade([[zl, 0], [zl + 0.8, 0.95]], vezes(poucos, ["case", aprox, 0, 1])));
  mapa.setPaintProperty("locais", "circle-stroke-opacity", opacidade([[zl, 0], [zl + 0.8, 1]]));
  mapa.setPaintProperty("ext", "circle-color", cor);
  mapa.setPaintProperty("ext", "circle-stroke-color", ["case", fraco, "#6b7b80", "#ffffff"]);
  mapa.setPaintProperty("ext", "circle-opacity", opacidade([[0, 0.95], [22, 0.95]], poucos));
  mapa.setPaintProperty("ext", "circle-stroke-opacity", opacidade([[0, 1], [22, 1]]));
  marcarLegenda();
}

/* ---------- legenda (passar o mouse destaca; clicar fixa o destaque) ---------- */
function legenda() {
  const M = MODOS[modo], box = $("#legenda");
  const faixa = (cor, hl, rot) => `<button type="button" class="faixa" style="background:${cor}" data-hl='${JSON.stringify(hl)}' title="${esc(rot)}" aria-label="${esc(rot)}"></button>`;
  const escala = (n, marcas) => `<div class="leg-escala">${marcas.map((t, j) => `<span style="left:${(j + 1) / n * 100}%">${t}</span>`).join("")}</div>`;
  let h = `<h2>${esc(M.titulo)}</h2>`;
  // governador: partidos de estados distantes podem dividir a mesma rampa de cor
  const repetidas = M.tipo === "venc" && cargo !== "pres" && turno === 2 && new Set(LEG.map(c => c.cor)).size < LEG.length;
  if (M.tipo === "venc" && corUnica()) {
    // grade candidato × eleitorado, com a cor que aparece de fato no mapa em cada célula
    h += `<p class="leg-sub">${TX.leg_grade}</p>` + LEG.map((c, i) => `<div class="leg-linha" data-c="${i}">
        <button type="button" class="leg-nome" data-hl='${JSON.stringify({ c: i })}'>${esc(c.nome)}</button>
        <span class="leg-barra">${CONFIG.alfa.map((a, k) => faixa(misturar(tomForte(c), a), { c: i, a: k }, TX.leg_celula(c.nome, TX.alfa_faixas[k]))).join("")}</span></div>`).join("") +
      `<div class="leg-linha"><span></span><span class="leg-barra leg-rotulos">${TX.alfa_faixas.map(r => `<span>${r}</span>`).join("")}</span></div>` +
      (repetidas ? `<p class="leg-nota">${TX.leg_partidos_nota}</p>` : "") + (M.nota ? `<p class="leg-nota">${esc(M.nota)}</p>` : "");
  } else if (M.tipo === "venc") {
    // 2º turno: o vencedor tem de 50% para cima; 1º turno: menos ou mais de 50% (maioria absoluta); senador: um tom só
    const fx = faixasVenc(), lims = [turno === 1 ? 0 : 50, ...fx];
    const rot = lims.map((x, k) => turno === 1 && !fx.length ? TX.venc_rotulo : k === fx.length ? TX.leg_ou_mais(x)
      : turno === 1 && k === 0 ? TX.leg_abaixo(numL(lims[1]) + PCT) : TX.leg_faixa_pct(x, lims[k + 1]));
    h += LEG.map((c, i) => `<div class="leg-linha" data-c="${i}">
        <button type="button" class="leg-nome" data-hl='${JSON.stringify({ c: i })}'>${esc(c.nome)}</button>
        <span class="leg-barra">${c.tons.map((t, k) => faixa(misturar(t, 1), { c: i, k }, `${c.nome}: ${rot[k]}`)).join("")}</span></div>`).join("") +
      `<div class="leg-linha"><span></span>${escala(fx.length + 1, fx.map(x => numL(x) + PCT))}</div>` +
      (repetidas ? `<p class="leg-nota">${TX.leg_partidos_nota}</p>` : "") + (M.nota ? `<p class="leg-nota">${esc(M.nota)}</p>` : "");
  } else {
    const n = M.cores.length, marca = x => (M.sinal && x > 0 ? "+" : "") + numL(x) + (M.un === "%" ? PCT : "");
    const rotulo = k => {
      const lo = M.faixas[k - 1], hi = M.faixas[k];
      return k === 0 ? TX.leg_abaixo(marca(hi)) : k === n - 1 ? TX.leg_mais(marca(lo)) : TX.leg_de_a(marca(lo), marca(hi));
    };
    h += `<div class="leg-seq"><span class="leg-barra">${M.cores.map((t, k) => faixa(misturar(t, 1), { k }, rotulo(k) + (M.un === "%" ? "" : TX.pp))).join("")}</span>
      ${escala(n, M.faixas.map(marca))}</div>`;
    if (M.nota) h += `<p class="leg-nota">${esc(M.nota)}</p>`;
  }
  h += `<div class="leg-extra">${M.tipo === "venc" ? `<button type="button" data-hl='{"e":"empate"}'><i style="background:${misturar(CONFIG.empate, 1)}"></i>${TX.empate}</button>` : ""}
    ${(cargo === "gov" && turno === 2) || (turno === 1 && M.uf) ? `<button type="button" data-hl='{"e":"se"}'><i style="background:${misturar(CONFIG.semEleicao, 1)}"></i>${M.uf ? TX.outros_estados : TX.sem_2t}</button>` : ""}
    <button type="button" data-hl='{"e":"nd"}'><i style="background:${misturar(CONFIG.semDados, 1)}"></i>${M.tipo === "venc" || M.chave.startsWith("p") ? TX.sem_bu : TX.sem_dado}</button>
    <span id="leg-tamanho" class="leg-tamanho" hidden></span></div>`;
  // valor por transparência: a legenda mostra a mesma cor nas quatro opacidades
  const ref = "#4e6268";   // cor neutra: a transparência vale para qualquer cor da escala
  const rot = TX.alfa_faixas;
  // na grade (cor única), as opacidades já estão nas células; nos outros casos, a barra cinza de referência
  h += `<div class="leg-alfa"><label><input type="checkbox" id="vba" ${vba[M.tipo] ? "checked" : ""}> ${TX.vba}</label>
    ${vba[M.tipo] && !(M.tipo === "venc" && corUnica()) ? `<div class="leg-alfa-barra">${CONFIG.alfa.map((a, k) => `<span><i style="background:${ref};opacity:${a}"></i>${rot[k]}</span>`).join("")}</div>` : ""}</div>
    <p class="leg-nota leg-zoom" id="leg-zoom" hidden>${TX.leg_zoom}</p>`;
  box.innerHTML = h;
  $("#vba").addEventListener("change", e => { vba[M.tipo] = e.target.checked; legenda(); pintar(); });
  box.querySelectorAll("[data-hl]").forEach(b => {
    const hl = JSON.parse(b.dataset.hl);
    b.addEventListener("mouseenter", () => { destaque = hl; pintar(); });
    b.addEventListener("mouseleave", () => { destaque = null; pintar(); });
    b.addEventListener("focus", () => { destaque = hl; pintar(); });
    b.addEventListener("blur", () => { destaque = null; pintar(); });
    b.addEventListener("click", () => { fixo = JSON.stringify(fixo) === b.dataset.hl ? null : hl; destaque = null; pintar(); });
  });
  $("#filtro").hidden = !M.filtro;
  legendaTamanho();
}
function marcarLegenda() {
  const hl = destaque || fixo, s = hl && JSON.stringify(hl);
  $("#legenda").classList.toggle("com-destaque", !!hl);
  $("#legenda").querySelectorAll("[data-hl]").forEach(b => {
    const h = JSON.parse(b.dataset.hl);
    const linha = x => x.k == null && x.a == null;   // o nome do candidato (a linha inteira)
    const ativo = !!hl && (b.dataset.hl === s || (hl.c != null && h.c === hl.c && (linha(hl) || linha(h))));
    b.classList.toggle("ativo", ativo);
    b.setAttribute("aria-pressed", String(JSON.stringify(fixo) === b.dataset.hl));
  });
  $("#legenda").querySelectorAll(".leg-linha[data-c]").forEach(l => l.classList.toggle("apagada", !!hl && hl.c != null && +l.dataset.c !== hl.c));
}
/* raio de um círculo no zoom atual: mesma conta da camada "locais" */
function raio(val, z) {
  const p = [[8, 1.5, 0.05], [12, 2.5, 0.16], [16, 4, 0.5]].map(([zz, min, f]) => [zz, Math.max(min, f * Math.sqrt(val))]);
  if (z <= p[0][0]) return p[0][1];
  for (let i = 1; i < p.length; i++) if (z <= p[i][0]) { const t = (z - p[i - 1][0]) / (p[i][0] - p[i - 1][0]); return p[i - 1][1] + t * (p[i][1] - p[i - 1][1]); }
  return p[p.length - 1][1];
}
function legendaTamanho() {
  // as áreas clareiam a partir do zoom 7 e somem no 9: as cores deixam de ser as da legenda
  const lz = $("#leg-zoom");
  if (lz && mapa) lz.hidden = mapa.getZoom() < 7 || mapa.getZoom() >= CONFIG.zoomSomeMunicipio;
  const el = $("#leg-tamanho");
  if (!el || !mapa) return;
  const z = mapa.getZoom();
  el.hidden = z < CONFIG.zoomLocais;
  if (el.hidden) return;
  const rs = CONFIG.legendaTamanho.map(v => raio(v, z)), H = Math.ceil(2 * Math.max(...rs)) + 2;
  let x = 0;
  const circ = CONFIG.legendaTamanho.map((v, i) => { const cx = x + Math.max(rs[i], 14); x += 2 * Math.max(rs[i], 14) + 4;
    return `<circle cx="${cx}" cy="${H - rs[i] - 1}" r="${rs[i]}" fill="none" style="stroke:var(--suave)"/><text x="${cx}" y="${H + 12}" text-anchor="middle">${fmt.format(v)}</text>`; }).join("");
  el.innerHTML = `<span>${TX.tam_votos}</span><svg width="${x}" height="${H + 14}" font-size="11" style="fill:var(--suave)" aria-hidden="true">${circ}</svg>` +
    (MODOS[modo]?.variacao ? `<span class="leg-aprox"><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="#4e6268" fill-opacity=".3" stroke="#6b7b80" stroke-width="1"/></svg>${TX.tam_apagado(CONFIG.minVotosVariacao)}</span>` : "") +
    (META.coordenadas?.contagem?.["4"] ? `<span class="leg-aprox"><svg width="14" height="14" aria-hidden="true"><circle cx="7" cy="7" r="5" fill="none" stroke="#4e6268" stroke-width="1.6"/></svg>${TX.tam_vazado}</span>` : "");
}

/* ---------- controles ---------- */
function opcoesModo() {
  const sel = $("#modo"), grupos = {};
  for (const [id, M] of Object.entries(MODOS)) (grupos[M.grupo] ||= []).push([id, M]);
  sel.innerHTML = Object.entries(grupos).map(([gr, ops]) => {
    const o = ops.map(([id, M]) => `<option value="${id}">${esc(M.rotulo)}</option>`).join("");
    return gr ? `<optgroup label="${esc(gr)}">${o}</optgroup>` : o;
  }).join("");
  sel.value = modo;
  // lista do menu com busca: grupos e opções; o texto de busca inclui o nome do estado (governador)
  $("#modo-lista").innerHTML = Object.entries(grupos).map(([gr, ops], k) => {
    const o = ops.map(([id, M]) => `<div role="option" id="mo-${esc(id)}" class="modo-op" data-v="${esc(id)}" aria-selected="false"
      data-busca="${esc(sem(`${M.rotulo} ${M.uf ? NOME_UF[M.uf] || "" : ""} ${gr}`))}">${esc(M.rotulo)}</div>`).join("");
    return gr ? `<div role="group" class="modo-grupo" aria-labelledby="mg-${k}"><div class="modo-grupo-nome" id="mg-${k}" role="presentation">${esc(gr)}</div>${o}</div>`
              : `<div role="group" class="modo-grupo" aria-label="${esc(TX.menu_geral)}">${o}</div>`;
  }).join("") + `<p class="modo-vazio" hidden>${TX.menu_vazio}</p>`;
  marcarModo();
}
/* ---------- menu "Colorir por" com busca (padrão de combobox com lista, WAI-ARIA APG) ---------- */
function marcarModo() {
  $("#modo-texto").textContent = MODOS[modo]?.rotulo || "";
  $("#modo-botao").title = MODOS[modo]?.rotulo || "";   // texto completo quando o rótulo é cortado
  $("#modo-lista").querySelectorAll(".modo-op").forEach(o => o.setAttribute("aria-selected", String(o.dataset.v === modo)));
}
const opsVisiveis = () => [...$("#modo-lista").querySelectorAll(".modo-op:not([hidden])")];
function ativarOp(o) {
  $("#modo-lista").querySelectorAll(".modo-op.ativa").forEach(x => x.classList.remove("ativa"));
  if (!o) { $("#modo-filtro").removeAttribute("aria-activedescendant"); return; }
  o.classList.add("ativa"); o.scrollIntoView({ block: "nearest" });
  $("#modo-filtro").setAttribute("aria-activedescendant", o.id);
}
function filtrarModo(q) {
  const t = sem(q).split(" ").filter(Boolean);
  $("#modo-lista").querySelectorAll(".modo-op").forEach(o => { o.hidden = !t.every(p => o.dataset.busca.includes(p)); });
  $("#modo-lista").querySelectorAll(".modo-grupo").forEach(g => { g.hidden = !g.querySelector(".modo-op:not([hidden])"); });
  const vis = opsVisiveis();
  $("#modo-lista").querySelector(".modo-vazio").hidden = vis.length > 0;
  ativarOp(t.length ? vis[0] : vis.find(o => o.dataset.v === modo));
}
function abrirMenu() {
  const pn = $("#modo-painel"), bt = $("#modo-botao"), r = bt.getBoundingClientRect();
  const abaixo = innerHeight - r.bottom - 12, acima = r.top - 12;
  const sobe = abaixo < 320 && acima > abaixo;           // no celular, a folha fica embaixo: abre para cima
  pn.classList.toggle("acima", sobe);
  pn.style.maxHeight = Math.min(460, sobe ? acima : abaixo) + "px";
  pn.hidden = false; bt.setAttribute("aria-expanded", "true");
  $("#modo-filtro").value = ""; filtrarModo("");
  // com mouse e teclado, o foco vai para a busca; no celular, não, para o teclado virtual não cobrir a lista
  if (temMouse) $("#modo-filtro").focus(); else $("#modo-lista").focus({ preventScroll: true });
}
function fecharMenu(foco = true) {
  if ($("#modo-painel").hidden) return;
  $("#modo-painel").hidden = true; $("#modo-botao").setAttribute("aria-expanded", "false");
  if (foco) $("#modo-botao").focus();
}
function montarMenu() {
  const bt = $("#modo-botao"), inp = $("#modo-filtro"), lista = $("#modo-lista");
  bt.addEventListener("click", () => $("#modo-painel").hidden ? abrirMenu() : fecharMenu());
  bt.addEventListener("keydown", e => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); abrirMenu(); } });
  inp.addEventListener("input", () => filtrarModo(inp.value));
  inp.addEventListener("keydown", e => {
    const vis = opsVisiveis(), i = vis.findIndex(o => o.classList.contains("ativa"));
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (vis.length) ativarOp(vis[(i + (e.key === "ArrowDown" ? 1 : -1) + vis.length) % vis.length]);
    } else if (e.key === "Home" || e.key === "End") {
      if (vis.length && !inp.value) { e.preventDefault(); ativarOp(vis[e.key === "Home" ? 0 : vis.length - 1]); }
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = vis[i] || vis[0];
      if (o) { fecharMenu(); trocarModo(o.dataset.v); }
    } else if (e.key === "Escape") { e.preventDefault(); fecharMenu(); }
    else if (e.key === "Tab") fecharMenu(false);
  });
  lista.addEventListener("mousedown", e => e.preventDefault());   // não tira o foco do campo de busca
  lista.addEventListener("click", e => { const o = e.target.closest(".modo-op"); if (o) { fecharMenu(); trocarModo(o.dataset.v); } });
  lista.addEventListener("mousemove", e => { const o = e.target.closest(".modo-op"); if (o && !o.classList.contains("ativa")) ativarOp(o); });
  document.addEventListener("mousedown", e => { if (!e.target.closest("#modo-painel, #modo-botao")) fecharMenu(false); });
}
function trocarModo(m) {
  modo = MODOS[m] ? m : "venc"; destaque = fixo = null; limiar = 0;
  $("#modo").value = modo; marcarModo();
  const M = MODOS[modo], r = $("#limiar");
  if (M.filtro) { r.max = M.max; r.step = M.passo; }
  r.value = 0; $("#limiar-txt").textContent = TX.limiar_todos; legenda(); pintar();
  reabrirPopup();   // o popup segue o modo
}
/* troca entre presidente e governador: novos modos, legenda e cores; baixa os dados do governador na primeira vez */
async function trocarCargo(c, m = "venc") {
  if (turno === 1) {
    cargo = ["pres", "gov", "sen"].includes(c) ? c : "pres";
    $("#resumo-brasil").textContent = TX.carregando;
    await carregarT1Mun(cargo);
    await Promise.all([...UFS.keys()].map(carregarT1UF));
  } else {
    cargo = c === "gov" && temGov() ? "gov" : "pres";
    if (cargo === "gov" && !MUNG) {
      $("#resumo-brasil").textContent = TX.carregando_gov;
      MUNG = await json("data/gov/municipios.json" + versao("gov/municipios.json"));
      await Promise.all([...UFS.keys()].map(carregarGov));
    }
  }
  opcoesCargo();
  modo = "venc";
  $("#selo").textContent = TX.selo_cargo(cargo, turno);
  montarModos(); opcoesModo(); resumoBrasil(); recalcular();
  trocarModo(m);
}
function montarControles() {
  const sel = $("#modo");
  opcoesModo(); montarMenu();
  sel.addEventListener("change", () => trocarModo(sel.value));
  const cg = $("#cargo");
  opcoesCargo();
  cg.addEventListener("change", () => trocarCargo(cg.value));
  $("#turnos").querySelectorAll("button").forEach(b => b.addEventListener("click", () => { if (+b.dataset.t !== turno) trocarTurno(+b.dataset.t); }));
  $("#limiar").addEventListener("input", e => {
    limiar = +e.target.value;
    $("#limiar-txt").textContent = limiar ? TX.limiar(num(limiar, limiar % 1 ? 1 : 0)) : TX.limiar_todos;
    pintar();
  });
  $("#recolher").addEventListener("click", () => {
    const rec = $("#painel").classList.toggle("recolhido");
    $("#recolher").setAttribute("aria-expanded", String(!rec));
  });
  // recolher tudo (fica só o título) e voltar ao estado de antes, com a parte de baixo aberta ou recolhida
  const minimizar = (sim = !$("#painel").classList.contains("minimizado")) => {
    $("#painel").classList.toggle("minimizado", sim);
    const b = $("#minimizar"), t = sim ? TX.abrir_painel : TX.recolher_painel;
    b.setAttribute("aria-expanded", String(!sim)); b.title = t; b.setAttribute("aria-label", t);
    if (sim) fecharMenu(false);
  };
  $("#minimizar").addEventListener("click", () => minimizar());
  $(".painel-cabeca h1").addEventListener("click", () => { if ($("#painel").classList.contains("minimizado")) minimizar(false); });
  if (matchMedia("(max-width: 719px)").matches) { $("#painel").classList.add("recolhido"); $("#recolher").setAttribute("aria-expanded", "false"); }
  legenda();
}

function resumoBrasil() {
  const v = META.brasil, val = v.slice(0, NF).reduce((a, b) => a + b, 0);
  if (turno === 1) $("#resumo-brasil").innerHTML = resumo1();
  else if (cargo === "gov") {
    const com = Object.keys(GOV).filter(u => u !== "_partidos" && GOV[u].segundo_turno).sort();
    $("#resumo-brasil").innerHTML = TX.resumo_gov(com.length, com.join(", "));
  } else
  $("#resumo-brasil").innerHTML = TX.resumo_brasil + CAND.map((c, i) =>
    `<span style="color:${c.cor}">■</span> ${esc(c.nome)} <b>${pct(v[i] / val, 2)}</b>`).join(" · ") +
    `<br><small>${TX.validos_exterior(fmt.format(val))}</small>`;
  if (META.sintetico) $("#aviso-sintetico").hidden = false;
  if (META.fonte_votos && META.fonte_votos !== "boletim de urna") $("#fonte-votos").textContent = TX.fonte_votos(TX.fontes_votos[META.fonte_votos] || META.fonte_votos);
  const a = META.avisos || {};
  const n = (a.sem_poligono || []).length + (a.sem_codigo_ibge || []).length;
  $("#avisos-malha").textContent = n ? TX.avisos_malha(fmt.format(n)) : "";
  const cc = META.coordenadas?.contagem || {}, tl = Object.values(cc).reduce((a, b) => a + b, 0);
  if (tl) {
    const n = k => cc[k] || 0;
    const comp = n("1") + n("2") + n("3") + n("4") ? { inep: fmt.format(n("1")), end: fmt.format(n("2")), nome: fmt.format(n("3")), loc: fmt.format(n("4")) } : null;
    $("#coord-txt").textContent = TX.coord_txt(fmt.format(tl), fmt.format(n("0")), comp, fmt.format(n("sem")));
  }
  $("#gerado").textContent = TX.gerado((META.gerado_tse || []).join(", ") || TX.data_nao_informada, new Date(META.gerado_em).toLocaleString(IDIOMA));
}

/* ---------- carga dos locais ---------- */
async function carregarUF(uf) {
  if (UFS.has(uf)) return UFS.get(uf);
  if (carregando.has(uf)) return carregando.get(uf);
  const pr = json(`data/uf/${uf}.json${versao(`uf/${uf}.json`)}`).then(async D => {
    UFS.set(uf, D); carregando.delete(uf);
    if (turno === 1) await carregarT1UF(uf);
    else if (cargo === "gov") await carregarGov(uf);
    atualizarLocais(); return D;
  }).catch(e => { carregando.delete(uf); console.error(e); });
  carregando.set(uf, pr);
  return pr;
}
async function carregarGov(uf) {
  if (GUF.has(uf) || !GOV[uf]?.segundo_turno) return GUF.get(uf);
  if (carregandoG.has(uf)) return carregandoG.get(uf);
  const pr = json(`data/gov/uf/${uf}.json${versao(`gov/uf/${uf}.json`)}`).then(G => { GUF.set(uf, G.v); carregandoG.delete(uf); return G.v; })
    .catch(e => { carregandoG.delete(uf); console.error(e); });
  carregandoG.set(uf, pr);
  return pr;
}
/* propriedades de um município; o eleitorado (transparência) vem sempre do vetor do presidente, que existe em todo o país */
const propsMun = (cod, uf) => turno === 1 ? props(vetorMun(cod), uf) : ({ ...props(vetorMun(cod), uf), apt: MUN[cod]?.[I.apt] || 0 });
/* Contorno detalhado (malha/mun/<código IBGE>.json, generalizado a 20 m): um arquivo por município, de poucos kB,
   baixado só para o município escolhido e, a partir do zoom Z_CONT, para o que fica sob o mouse. A fonte "mun-det"
   guarda no máximo esses dois. Quando o detalhado chega, o contorno da malha leve do mesmo município sai pelo FILTRO da
   camada, e não pela opacidade por zoom: expressões que misturam zoom e dado são calculadas no zoom inteiro do mosaico,
   e os dois contornos apareciam juntos. */
const Z_CONT = 7.5;
const CONT = new Map(), baixandoCont = new Map();   // código -> feição detalhada (guardada depois de baixada)
let detIds = [], esperaCont = 0;
function contorno(cod) {
  if (!cod || CONT.has(cod) || baixandoCont.has(cod)) return;
  const h = META.malha?.["mun/"];
  baixandoCont.set(cod, json(`malha/mun/${cod}.json${h ? "?v=" + h : ""}`).then(fc => {
    const f = fc.features ? fc.features[0] : fc;
    CONT.set(cod, { type: "Feature", geometry: f.geometry, properties: { id: cod } });
    baixandoCont.delete(cod); atualizarDet();
  }).catch(e => { baixandoCont.delete(cod); console.error(e); }));
}
function atualizarDet() {
  if (!mapa) return;
  const ids = [marcados["mun-sel"], marcados["mun-hover"]].filter((c, k, a) => c && CONT.has(c) && a.indexOf(c) === k);
  if (ids.join() !== detIds.join()) {
    detIds = ids;
    mapa.getSource("mun-det")?.setData({ type: "FeatureCollection", features: ids.map(c => CONT.get(c)) });
  }
  for (const camada of ["mun-sel", "mun-hover"]) {
    const cod = marcados[camada];
    if (mapa.getLayer(camada)) mapa.setFilter(camada, ["all", ["==", g("id"), cod], ["!", ["in", g("id"), ["literal", detIds]]]]);
    if (mapa.getLayer(camada + "-det")) mapa.setFilter(camada + "-det", ["==", g("id"), cod]);
  }
}
/* vetores do cargo em tela */
const vetorMun = cod => turno === 1 ? T1MUN[cargo]?.[cod] : cargo === "pres" ? MUN[cod] : MUNG?.[cod];
function vetorLocal(uf, i) {
  if (turno === 1) return T1UF.get(uf)?.[cargo]?.[i] || null;
  if (cargo === "pres") { const l = UFS.get(uf)?.locais[i]; return l && l.slice(6, 6 + I.tam); }
  return GUF.get(uf)?.[i];
}
/* recalcula as propriedades de cor de todos os municípios e locais (troca de cargo) */
function recalcular() {
  if (!MALHA) return;
  for (const f of MALHA.features) Object.assign(f.properties, propsMun(f.properties.id, f.properties.uf));
  mapa?.getSource("mun")?.setData(MALHA);
  atualizarLocais();
  atualizarExt();
}
function ufsNaTela() {
  if (!mapa || mapa.getZoom() < CONFIG.zoomLocais - 0.5) return;   // começa a baixar um pouco antes de mostrar
  const b = mapa.getBounds();
  for (const u of META.ufs) {
    if (!u.bbox || u.uf === "ZZ") continue;
    const [x0, y0, x1, y1] = u.bbox;
    if (x1 >= b.getWest() && x0 <= b.getEast() && y1 >= b.getSouth() && y0 <= b.getNorth()) {
      carregarUF(u.uf);
    }
  }
}
function atualizarLocais() {
  if (!mapa?.getSource("locais")) return;
  const feats = [];
  if (turno === 1) {   // 1º turno: os locais do 2º turno que tiveram seções no 1º, mais os que só existiram no 1º
    for (const [uf, D] of UFS) {
      const T = T1UF.get(uf), V = T?.[cargo], nb = D.locais.length;
      if (!V || !candsDe(uf)) continue;
      V.forEach((v, i) => {
        const l = i < nb ? D.locais[i] : T.extra[i - nb];
        if (!v || !l || l[0] == null) return;
        const ap = (i < nb ? D.fonte?.[i] : T.fonte_extra?.[i]) === 4 ? 1 : 0;
        feats.push({ type: "Feature", geometry: { type: "Point", coordinates: [l[1], l[0]] }, properties: { uf, i, ap, ...props(v, uf) } });
      });
    }
  } else
  for (const [uf, D] of UFS) {
    D.locais.forEach((l, i) => {
      if (l[0] == null) return;   // sem coordenada confiável: fora do mapa, mas conta no município
      if (!candsDe(uf)) return;   // governador: estado sem 2º turno não tem pontos
      feats.push({ type: "Feature", geometry: { type: "Point", coordinates: [l[1], l[0]] },
        properties: { uf, i, ap: D.fonte?.[i] === 4 ? 1 : 0, ...props(vetorLocal(uf, i), uf) } });
    });
  }
  feats.sort((a, b) => b.properties.val - a.properties.val);   // círculos grandes por baixo dos pequenos
  mapa.getSource("locais").setData({ type: "FeatureCollection", features: feats });
}

/* ---------- popup (clique) e etiqueta (mouse) ---------- */
/* cor da classe de um valor no modo atual (mesma regra do mapa) */
function corClasse(M, x) {
  if (x == null || x <= ND + 1) return CONFIG.semDados;
  let k = 0;
  while (k < M.faixas.length && x >= M.faixas[k]) k++;
  return M.cores[k];
}
/* barra empilhada horizontal: fatias [{f: fração, cor}], o resto em cinza. Comprimento numa escala comum é
   lido com mais precisão que ângulo ou arco (Cleveland e McGill, 1984), por isso substitui a rosca. */
function barra(fatias, meio = false) {
  let x = 0, r = "";
  for (const { f, cor } of fatias) { r += `<rect x="${x * 100}%" y="0" width="${f * 100}%" height="12" fill="${cor}"/>`; x += f; }
  const marca = meio ? `<line x1="50%" x2="50%" y1="-3" y2="15" style="stroke:var(--tinta)" stroke-width="1.5"/>` : "";
  return `<svg class="barra" width="100%" height="12" aria-hidden="true" overflow="visible"><rect width="100%" height="12" style="fill:var(--barra-resto)"/>${r}${marca}</svg>`;
}
const soma = (v, a, b) => v.slice(a, b).reduce((x, y) => x + y, 0);
/* números de um vetor de votos que a etiqueta e o popup usam */
function contas(v, n) {
  if (!v) return { val: 0, tot: 0, apt: 0, bn: 0, ab: null };
  if (turno === 1) {   // [candidatos..., brancos, nulos, anulados, comparecimento, aptos]
    const val = soma(v, 0, n), bn = v[n] + v[n + 1], anul = v[n + 2], com = v[n + 3], apt = v[n + 4];
    return { val, tot: val + bn + anul, apt, bn, anul, ab: apt ? Math.max(0, apt - com) : null, com };
  }
  const val = soma(v, 0, NF), tot = val + v[I.b] + v[I.n] + v[I.x], apt = v[I.apt];
  return { val, tot, apt, bn: v[I.b] + v[I.n], ab: apt ? Math.max(0, apt - tot) : null };
}
/* bloco principal: muda conforme o que o mapa está mostrando, como no Nexo. Devolve {html, borda}. */
function principal(v, d) {
  const CAND = d.cands, M0 = MODOS[modo];
  // candidato a governador de outro estado: mostra o resultado normal deste lugar
  const M = M0.uf && M0.uf !== d.uf ? MODOS.venc : M0, modo_ = M === M0 ? modo : "venc";
  if (!CAND) return { html: d.eleito ? `<p class="eleito">${TX.gov_eleito_1t(esc(d.eleito.nome), d.eleito.partido ? esc(d.eleito.partido) : "", d.eleito.pct ? pct(d.eleito.pct) : "")}</p>`
    : `<p class="sem">${TX.sem_2t_gov}</p>`, borda: CONFIG.semEleicao };
  const c = contas(v, CAND.length);
  const bloco = (fatias, quadrado, rotulo, grande, pequeno, meio = false) => `<div class="lider">
    <div><span class="rotulo-lider">${quadrado ? `<span class="cor" style="background:${quadrado}"></span>` : ""}${rotulo}</span>
    <b class="grande">${grande}</b><small>${pequeno}</small></div>${fatias ? barra(fatias, meio) : ""}</div>`;
  const nome = x => esc(x.nome) + (x.partido ? ` (${esc(x.partido)})` : "");
  if (!c.val && !c.tot) return { html: `<p class="sem">${TX.sem_bu}</p>`, borda: CONFIG.semDados };
  if (M.tipo === "venc") {
    const ordem = [...CAND.keys()].sort((a, b) => v[b] - v[a]), w = CAND[ordem[0]];
    const p = props(v, d.uf), meio = !(turno === 1 && cargo === "sen");   // linha dos 50%: não serve ao senador (2 votos)
    if (p.w === -1) return { html: bloco(ordem.map(i => ({ f: v[i] / c.val, cor: CAND[i].cor })), CONFIG.empate, TX.empate, pct(v[ordem[0]] / c.val), TX.votos_cada(fmt.format(v[ordem[0]])), meio), borda: CONFIG.empate };
    // borda: a cor da classe no mapa (1º turno: tom pela maioria absoluta; com transparência, o tom único)
    const L = LEG[p.w], borda = turno === 1 ? (L ? (corUnica() ? tomForte(L) : L.tons[faixasVenc().filter(x => p.ws >= x).length]) : CONFIG.semDados) : w.tons[0];
    return { html: bloco(ordem.map(i => ({ f: v[i] / c.val, cor: CAND[i].cor })), w.cor, nome(w) + seloDe(d, ordem[0]),
      pct(v[ordem[0]] / c.val), TX.votos(fmt.format(v[ordem[0]])), meio), borda };
  }
  if (M.cand != null) {
    // quadrado e barra na cor do próprio candidato (identidade); a borda leva a cor da classe no mapa
    const i = M.cand, f = c.val ? v[i] / c.val : 0, cor = corClasse(M, f * 100);
    return { html: bloco([{ f, cor: CAND[i].cor }], CAND[i].cor, nome(CAND[i]) + seloDe(d, i), pct(f), TX.de_validos(fmt.format(v[i]), fmt.format(c.val)), turno === 2), borda: cor };
  }
  if (modo_ === "bn") {
    const f = c.tot ? c.bn / c.tot : 0, cor = corClasse(M, f * 100);
    return { html: bloco([{ f, cor }], null, TX.bn_rotulo, pct(f), TX.de_totais(fmt.format(c.bn), fmt.format(c.tot))), borda: cor };
  }
  if (modo_ === "ab") {
    if (!c.apt) return { html: `<p class="sem">${TX.sem_eleitores}</p>`, borda: CONFIG.semDados };
    const f = c.ab / c.apt, cor = corClasse(M, f * 100);
    return { html: bloco([{ f, cor }], null, TX.ab_rotulo, pct(f), TX.de_eleitores(fmt.format(c.ab), fmt.format(c.apt))), borda: cor };
  }
  // variação desde o 1º turno
  const p = props(v, d.uf), x = p[M.chave];
  if (x <= ND + 1) return { html: `<p class="sem">${TX.sem_dois_turnos}</p>`, borda: CONFIG.semDados };
  const cor = corClasse(M, x), base = p.vc < CONFIG.minVotosVariacao
    ? TX.base_pequena(fmt.format(p.vc)) : "", sinal = y => (y > 0 ? "+" : y < 0 ? "−" : "") + num(Math.abs(y)) + TX.pp;
  const v1 = v[I.v1], vc = CAND.map((_, i) => v[I.c2c + i]), val2 = vc.reduce((a, b) => a + b, 0);
  const pc = i => [v[I.c1t + i] / v1, vc[i] / val2];
  if (M.chave === "dm") {
    const a = cargo === "gov" ? GOV[d.uf].lider : 0, [a1, a2] = pc(a), [b1, b2] = pc(1 - a);
    return { html: bloco(null, cor, TX.dm_rotulo, sinal(x),
      `${TX.vantagem_de(esc(CAND[a].nome), cargo === "gov")}: ${sinal((a1 - b1) * 100)} → ${sinal((a2 - b2) * 100)}${base}`), borda: cor };
  }
  const i = M.vcand, [q1, q2] = pc(i);
  return { html: bloco(null, cor, TX.var_rotulo(nome(CAND[i])), sinal(x), `${pct(q1)} → ${pct(q2)}${TX.mesmas_secoes}${base}`), borda: cor };
}
function cabecalho(titulo, sub) {
  return `<h3>${esc(titulo)}</h3><p class="sub">${esc(sub)}</p>`;
}
function dicaHtml(d) {
  const pr = principal(d.v, d);
  return { html: `<div class="pop curta">${cabecalho(d.titulo, d.sub)}${pr.html}</div>`, borda: pr.borda };
}
/* quem foi eleito no cargo em tela: no presidente, o mais votado no país; no governador, o mais votado no estado */
function eleitoIdx(d) {
  if (!d.cands) return -1;
  if (cargo === "gov") return GOV[d.uf]?.lider ?? -1;
  const b = META.brasil.slice(0, NF);
  return b.indexOf(Math.max(...b));
}
const selo = () => `<abbr class="selo-eleito" title="${TX.eleito}">${TX.eleito_letra}</abbr>`;
/* painel do clique, como no Nexo: resultado, tabela, "do 1º para o 2º turno" (candidatos, comparecimento,
   brancos e nulos, cada um com quantos votos a mais ou a menos) e totais */
function popupHtml(d) {
  const v = d.v, CAND = d.cands || [], c = contas(v, CAND.length), pr = principal(v, d);
  let h = `<div class="pop">${cabecalho(d.titulo, d.sub)}
    <button type="button" class="compartilhar" title="${TX.compartilhar}" aria-label="${TX.compartilhar_aria}">
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" stroke="currentColor" stroke-width="2" fill="none"/></svg></button>
    ${pr.html}`;
  if (c.val) {
    const ordem = [...CAND.keys()].sort((a, b) => v[b] - v[a]);
    h += `<table>${ordem.map(i => `<tr><td><span class="cor" style="background:${CAND[i].cor}"></span><b>${esc(CAND[i].nome)}</b>${CAND[i].partido ? ` <span class="partido">${esc(CAND[i].partido)}</span>` : ""}${seloDe(d, i)}</td>
      <td class="n"><b>${pct(v[i] / c.val)}</b></td><td class="n">${fmt.format(v[i])}</td></tr>`).join("")}</table>`;
    if (turno === 2) h += comparacao(v, CAND, d);
  }
  if (d.cands) h += `<p class="rodape totais">${TX.t_validos(fmt.format(c.val))}<br>${TX.t_totais(fmt.format(c.tot))}${c.anul ? `<br>${TX.t_anulados(fmt.format(c.anul))}` : ""}${c.apt ? `<br>${TX.t_eleitores(fmt.format(c.apt))}` : ""}${turno === 1 && cargo === "sen" ? `<br>${TX.sen_nota}` : ""}</p>`;
  if (d.extra) h += `<p class="rodape">${d.extra}</p>`;
  return { html: h + "</div>", borda: pr.borda };
}
/* "Do 1º para o 2º turno, nas mesmas seções": um haltere por linha, com eixo próprio para comparecimento e brancos e nulos */
function comparacao(v, CAND, d) {
  const v1 = v[I.v1], vc = CAND.map((_, i) => v[I.c2c + i]), valc = vc.reduce((a, b) => a + b, 0);
  if (!(v1 > 0 && valc > 0)) return "";
  const dif = (n, un = TX.un_votos) => n === 0 ? TX.dif_igual(un) : TX.dif(fmt.format(Math.abs(n)), un, n > 0);
  // candidatos: eixo simétrico em torno de 50%, linha tracejada em 50%, rótulos do eixo só embaixo do último
  const pares = CAND.map((x, i) => ({ a: v[I.c1t + i] / v1, b: vc[i] / valc }));
  const dist = Math.max(...pares.flatMap(p => [Math.abs(p.a - 0.5), Math.abs(p.b - 0.5)]));
  const meia = Math.min(0.5, Math.max(0.1, Math.ceil(dist * 10 + 1e-9) / 10));
  let h = `<h4>${TX.do1para2}</h4>`;
  CAND.forEach((x, i) => {
    h += haltere({ rotulo: x.nome, a: pares[i].a, b: pares[i].b, lo: 0.5 - meia, hi: 0.5 + meia, cor: x.cor, meio: 0.5,
      eixo: i === CAND.length - 1, texto: dif(vc[i] - v[I.c1t + i]) });
  });
  // comparecimento (% dos eleitores aptos) e brancos e nulos (% do comparecimento), nas mesmas seções
  const T1 = v[I.t1], T2 = v[I.t2c], BN1 = v[I.bn1], BN2 = v[I.bn2c], AP = v[I.apc];
  const faixa = (a, b, piso = 0) => { let lo = Math.floor(Math.min(a, b) * 10) / 10, hi = Math.ceil(Math.max(a, b) * 10) / 10;
    if (hi - lo < 0.1) hi = lo + 0.1; return [Math.max(piso, lo), Math.min(1, hi)]; };
  if (AP > 0 && T1 > 0 && T2 > 0) {
    const a = T1 / AP, b = T2 / AP, [lo, hi] = faixa(a, b);
    h += haltere({ rotulo: TX.comparecimento, a, b, lo, hi, cor: "var(--suave)", eixo: true, texto: dif(T2 - T1) });
  }
  if (T1 > 0 && T2 > 0) {
    const a = BN1 / T1, b = BN2 / T2, [, hi] = faixa(a, b);
    h += haltere({ rotulo: TX.bn_rotulo, a, b, lo: 0, hi, cor: "var(--suave)", eixo: true, texto: dif(BN2 - BN1) });
  }
  h += `<p class="hl-leg"><span class="b1"></span>${TX.turno1} <span class="b2"></span>${TX.turno2}</p>`;
  if (d.secoes && v[I.comp] < d.secoes) h += `<p class="rodape">${TX.secoes_comp(fmt.format(v[I.comp]), fmt.format(d.secoes))}</p>`;
  return h;
}
/* um haltere: nome à esquerda, "1º → 2º" à direita, círculo vazio no 1º turno e cheio no 2º */
function haltere({ rotulo, a, b, lo, hi, cor, meio, eixo, texto }) {
  const W = 300, x = t => 6 + (Math.min(hi, Math.max(lo, t)) - lo) / (hi - lo) * (W - 12), y = 10;
  const marcas = eixo ? (meio != null ? [lo, meio, hi] : [lo, hi]) : [];
  return `<div class="hl"><div class="hl-cab"><b>${esc(rotulo)}</b><span>${pct(a)} → <b>${pct(b)}</b></span></div>
    <svg viewBox="0 0 ${W} ${eixo ? 34 : 20}" width="100%" role="img" aria-label="${esc(TX.haltere_aria(rotulo, pct(a), pct(b)))}">
      <line x1="0" x2="${W}" y1="${y}" y2="${y}" style="stroke:var(--linha-suave)"/>
      ${meio != null ? `<line x1="${x(meio)}" x2="${x(meio)}" y1="0" y2="20" style="stroke:var(--tracejado)" stroke-dasharray="3 3"/>` : ""}
      <line x1="${x(a)}" x2="${x(b)}" y1="${y}" y2="${y}" style="stroke:${cor}" stroke-width="3"/>
      <circle cx="${x(a)}" cy="${y}" r="5" style="fill:var(--papel);stroke:${cor}" stroke-width="2"/>
      <circle cx="${x(b)}" cy="${y}" r="5" style="fill:${cor};stroke:var(--halo)" stroke-width="1"/>
      ${marcas.map((t, k) => `<text x="${x(t)}" y="32" font-size="12" style="fill:var(--suave)" text-anchor="${k === 0 ? "start" : k === marcas.length - 1 ? "end" : "middle"}">${Math.round(t * 100)}${PCT}</text>`).join("")}
    </svg><p class="hl-txt">${texto}</p></div>`;
}
const extraGov = uf => turno === 2 && cargo === "gov" && !GOV[uf]?.segundo_turno ? { eleito: GOV[uf]?.eleito } : {};
function dadosMunicipio(cod) {
  const info = munInfo.get(cod);
  if (!info) return null;
  const v = vetorMun(cod), nl = turno === 1 ? T1NL[cod] : MUN[cod]?.[I.tam], uf = NOME_UF[info.uf] || info.uf;
  return { v: v || new Array(turno === 1 ? (candsDe(info.uf)?.length || 0) + 5 : I.tam).fill(0), cod, uf: info.uf, cands: candsDe(info.uf), ...extraGov(info.uf),
    titulo: info.nome, sub: nl ? TX.mun_sub(uf, fmt.format(nl)) : uf };
}
function dadosLocal(uf, i) {
  const D = UFS.get(uf), T = turno === 1 ? T1UF.get(uf) : null, nb = D?.locais.length || 0;
  const l = i < nb ? D?.locais[i] : T?.extra[i - nb];
  if (!l) return null;
  const nsec = T ? T.s[i] : l[l.length - 1], fonte = i < nb ? D.fonte?.[i] : T?.fonte_extra?.[i];
  return { v: vetorLocal(uf, i) || new Array(T ? (candsDe(uf)?.length || 0) + 5 : I.tam).fill(0), uf, i, secoes: nsec, titulo: l[2], l, cands: candsDe(uf), ...extraGov(uf),
    sub: [l[3], `${D.municipios[l[5]]} (${uf})`].filter(Boolean).join(", "),
    extra: `${esc(l[4])} · ${TX.secoes(fmt.format(nsec), nsec)}` +
      (fonte ? `<br>${TX.loc_aprox(esc(TX.fontes_coord[fonte] || META.coordenadas?.fontes?.[fonte] || TX.outra_fonte))}` : "") };
}
/* exterior: um ponto por cidade onde o TSE instalou seções. Linha de data/exterior.json:
   [lat, lon, nome, país ISO, código TSE, ...vetor, seções, locais de votação] */
const X0 = 5;
/* votos de uma cidade do exterior no cargo e no turno em tela (só há voto para presidente fora do país) */
const vetorExt = i => turno === 1 ? T1?.exterior?.[EXT[i][4]] || null : EXT[i].slice(X0, X0 + I.tam);
const nomePais = (() => { let dn = null; try { dn = new Intl.DisplayNames([IDIOMA], { type: "region" }); } catch { /* navegador antigo */ }
  return iso => { try { return dn?.of(iso) || iso; } catch { return iso; } }; })();
function dadosExterior(i) {
  const x = EXT[i];
  if (!x) return null;
  const nsec = x[X0 + I.tam], nloc = x[X0 + I.tam + 1];
  // nome no idioma da página (data/exterior.json, depois das seções e locais: inglês e espanhol), quando o dado já o traz
  const k = { "en-GB": 2, "es-ES": 3 }[IDIOMA], nome = k && x[X0 + I.tam + k] ? x[X0 + I.tam + k] : x[2];
  return { v: vetorExt(i) || new Array(turno === 1 ? (candsDe("ZZ")?.length || 0) + 5 : I.tam).fill(0), uf: "ZZ", ext: i, codExt: x[4], secoes: nsec, titulo: nome, cands: candsDe("ZZ"),
    sub: TX.ext_sub(nomePais(x[3])),
    extra: TX.ext_secoes(fmt.format(nsec), nsec, fmt.format(nloc), nloc) + `<br>${TX.ext_nota}` };
}
function atualizarExt() {
  if (!mapa?.getSource("ext")) return;
  const feats = cargo === "pres" ? EXT.map((x, i) => ({ type: "Feature", geometry: { type: "Point", coordinates: [x[1], x[0]] },
    properties: { i, ...props(vetorExt(i), "ZZ") } })) : [];   // governador: não há voto no exterior
  feats.sort((a, b) => b.properties.val - a.properties.val);   // círculos grandes por baixo dos pequenos
  mapa.getSource("ext").setData({ type: "FeatureCollection", features: feats });
}
function popupExterior(i) {
  const d = dadosExterior(i);
  if (!d) return;
  dica?.remove();
  marcarMun("mun-sel", "");
  abrir([EXT[i][1], EXT[i][0]], d);
}
/* painel do clique: fixo à direita (como no Nexo); no celular, folha que sobe de baixo. Mesma interface do popup antigo. */
const painelDet = {
  aberto: false, _dados: null, _lngLat: null,
  isOpen() { return this.aberto; },
  getLngLat() { return this._lngLat; },
  remove() {
    if (!this.aberto) return;
    $("#detalhe").hidden = true; this.aberto = false; this._dados = null;
    if (mapa) marcarMun("mun-sel", "");
  }
};
/* o painel aberto acompanha troca de modo e de cargo */
function reabrirPopup() {
  if (!popup?.isOpen() || !popup._dados) return;
  const d = popup._dados, novo = d.cod ? dadosMunicipio(d.cod) : d.ext != null ? dadosExterior(d.ext) : dadosLocal(d.uf, d.i);
  if (novo) abrir(popup.getLngLat(), novo);
}
/* abre o painel e pinta a borda na cor do bloco principal */
function abrir(lngLat, d) {
  const r = popupHtml(d), el = $("#detalhe"), corpo = $("#detalhe-corpo");
  corpo.innerHTML = r.html;
  el.style.setProperty("--borda", r.borda);
  const novo = !popup.aberto || popup._dados?.cod !== d.cod || popup._dados?.i !== d.i || popup._dados?.ext !== d.ext;
  el.hidden = false; popup.aberto = true; popup._dados = d; popup._lngLat = lngLat;
  if (novo) el.scrollTop = 0;
  corpo.querySelector(".compartilhar")?.addEventListener("click", () => compartilhar(d));
}
function popupMunicipio(cod, lngLat) {
  const d = dadosMunicipio(cod);
  if (!d) return;
  dica?.remove();
  marcarMun("mun-sel", cod);
  abrir(lngLat, d);
}
function popupLocal(uf, i) {
  const d = dadosLocal(uf, i);
  if (!d) return;
  dica?.remove();
  abrir([d.l[1], d.l[0]], d);
}
/* compartilhar: link que reabre este município ou local, no modo atual */
function linkDe(d) {
  const u = new URL(location.href);
  u.search = "";
  if (d.cod) u.searchParams.set("m", d.cod); else if (d.codExt) u.searchParams.set("x", d.codExt); else u.searchParams.set("l", `${d.uf}-${d.i}`);
  if (turno === 1) u.searchParams.set("turno", "1");
  if (cargo !== "pres") u.searchParams.set("cargo", cargo);
  if (modo !== "venc") u.searchParams.set("ver", modo);
  return u.toString();
}
async function compartilhar(d) {
  const url = linkDe(d), titulo = TX.titulo_compartilhar(d.titulo);
  try {
    if (navigator.share) return await navigator.share({ title: titulo, url });
    await navigator.clipboard.writeText(url);
    avisar(TX.link_copiado);
  } catch { /* a pessoa cancelou ou o navegador bloqueou */ }
}
function avisar(txt) {
  let el = $("#aviso-rapido");
  if (!el) { el = document.createElement("div"); el.id = "aviso-rapido"; el.setAttribute("role", "status"); document.body.append(el); }
  el.textContent = txt; el.classList.add("visivel");
  clearTimeout(avisar._t); avisar._t = setTimeout(() => el.classList.remove("visivel"), 1800);
}
/* abre o que veio no link compartilhado (?m=código IBGE ou ?l=UF-índice, e ?ver=modo) */
async function abrirDoLink() {
  const q = new URLSearchParams(location.search);
  const ver = q.get("ver") === "dv" ? "dm" : q.get("ver");   // "dv" (versão anterior) virou "dm" no governador
  if (q.get("turno") === "1" && TEM_T1) await trocarTurno(1, q.get("cargo") || "pres", ver || "venc");
  else if (q.get("cargo") === "gov") await trocarCargo("gov", ver || "venc");
  else if (ver && MODOS[ver]) trocarModo(ver);
  const m = q.get("m"), l = q.get("l"), x = q.get("x");
  const ix = x ? EXT.findIndex(e => e[4] === x) : -1;
  if (m || l || x) mexeu = true;
  if (ix >= 0 && cargo === "pres") {
    mapa.jumpTo({ center: [EXT[ix][1], EXT[ix][0]], zoom: 5 });
    popupExterior(ix);
  } else if (m && munInfo.has(m)) {
    const b = munInfo.get(m).bbox;
    mapa.fitBounds(b, { padding: folga(40), maxZoom: 11, duration: 0 });
    popupMunicipio(m, [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]);
  } else if (l && /^[A-Z]{2}-\d+$/.test(l)) {
    const [uf, i] = l.split("-");
    const D = await carregarUF(uf), x = D?.locais[+i];
    if (x && x[0] != null) { mapa.jumpTo({ center: [x[1], x[0]], zoom: 15 }); popupLocal(uf, +i); }
  }
}

/* ---------- busca ---------- */
let opcoes = [], sel = -1, BUSCA = null, buscandoIndice = null;
/* índice de escolas do país inteiro (data/busca.json), baixado só na primeira vez que alguém digita */
function indiceEscolas() {
  if (BUSCA || buscandoIndice) return buscandoIndice;
  buscandoIndice = json("data/busca.json" + versao("busca.json")).then(B => {
    BUSCA = Object.entries(B).map(([uf, U]) => ({ uf, m: U.m, l: U.l, s: U.l.map(x => sem(x[0] + " " + x[1] + " " + U.m[x[2]])) }));
    if (sem($("#busca").value).length >= 3) buscar($("#busca").value);
  }).catch(e => { console.error(e); buscandoIndice = null; });
  return buscandoIndice;
}
function buscar(q) {
  const t = sem(q), lista = $("#sugestoes");
  if (t.length < 2) { lista.hidden = true; $("#busca").setAttribute("aria-expanded", "false"); return; }
  const r = [], palavras = t.split(" ");
  // 1º turno (quando já carregado): todos os candidatos a presidente, governador e senador
  if (T1) for (const [cg, C] of Object.entries(T1C)) for (const [e, E] of Object.entries(C.escopos)) E.candidatos.forEach((c, i) => {
    const uf = e === "BR" ? "" : e;
    if (sem(`${c.nome} ${c.partido} ${c.nr} ${uf} ${NOME_UF[uf] || ""}`).includes(t))
      r.push({ tipo: "c", turno: 1, cargo: cg, uf: uf || undefined, modo: `c1-${e}-${i}`, nome: c.nome, det: TX.busca_t1(TX.cargos[cg], NOME_UF[uf] || "", c.partido), ord: -1 });
  });
  CAND.forEach((c, i) => { if (sem(c.nome + " " + c.nome_tse + " " + c.partido + " " + c.nr).includes(t)) r.push({ tipo: "c", cargo: "pres", modo: "c" + i, nome: c.nome, det: TX.busca_pres(c.partido, c.nr), ord: -1 }); });
  for (const [uf, G] of Object.entries(GOV)) {
    if (uf === "_partidos" || !G.segundo_turno) continue;
    G.candidatos.forEach((c, i) => { if (sem(c.nome + " " + c.nome_tse + " " + c.partido + " " + uf).includes(t))
      r.push({ tipo: "c", cargo: "gov", uf, modo: `g-${uf}-${i}`, nome: c.nome, det: TX.busca_gov(NOME_UF[uf] || uf, c.partido), ord: -1 }); });
  }
  for (const [cod, m] of munInfo) {
    const s = m.s.indexOf(t);
    if (s >= 0) r.push({ tipo: "m", cod, nome: m.nome, det: NOME_UF[m.uf] || m.uf, ord: s === 0 ? 0 : 1 });
  }
  if (t.length >= 3) {
    if (!BUSCA) indiceEscolas();
    else for (const U of BUSCA) {
      U.s.forEach((s, i) => {
        if (palavras.every(p => s.includes(p))) {
          const [n, b, m] = U.l[i];
          r.push({ tipo: "l", uf: U.uf, i, nome: n, det: `${b ? b + ", " : ""}${U.m[m]} (${U.uf})`, ord: sem(n).startsWith(t) ? 2 : 3 });
        }
      });
    }
  }
  r.sort((a, b) => a.ord - b.ord || a.nome.localeCompare(b.nome, IDIOMA));
  opcoes = r.slice(0, 15); sel = -1;
  const tipo = TX.busca_tipo;
  lista.innerHTML = opcoes.length ? opcoes.map((o, k) => `<li role="option" id="op${k}" data-k="${k}">${esc(o.nome)}<small>${tipo[o.tipo]}${esc(o.det)}</small></li>`).join("")
    : `<li class="vazio">${t.length >= 3 && !BUSCA ? TX.busca_carregando : TX.busca_nada}</li>`;
  if (t.length >= 3 && !BUSCA && opcoes.length) lista.insertAdjacentHTML("beforeend", `<li class="vazio">${TX.busca_carregando}</li>`);
  lista.hidden = false; $("#busca").setAttribute("aria-expanded", "true");
}
function escolher(o) {
  mexeu = true;
  $("#sugestoes").hidden = true; $("#busca").setAttribute("aria-expanded", "false");
  if (!o) return;
  $("#busca").value = o.nome;
  if (matchMedia("(max-width: 719px)").matches) $("#painel").classList.add("recolhido");
  if (o.tipo === "c") {
    // como no Nexo: escolher um candidato mostra o mapa do percentual dele
    const ir = () => {
      if (o.uf) { const b = META.ufs.find(u => u.uf === o.uf)?.bbox; if (b) mapa.fitBounds(b, { padding: folga(30) }); }
      if (matchMedia("(max-width: 719px)").matches) $("#painel").classList.remove("recolhido");
    };
    if ((o.turno || 2) !== turno) trocarTurno(o.turno || 2, o.cargo, o.modo).then(ir);
    else if (o.cargo !== cargo) trocarCargo(o.cargo, o.modo).then(ir); else { trocarModo(o.modo); ir(); }
    return;
  }
  if (o.tipo === "m") {
    const m = munInfo.get(o.cod);
    carregarUF(m.uf);
    mapa.fitBounds(m.bbox, { padding: folga(40), maxZoom: 12 });
    mapa.once("moveend", () => popupMunicipio(o.cod, [(m.bbox[0] + m.bbox[2]) / 2, (m.bbox[1] + m.bbox[3]) / 2]));
  } else {
    carregarUF(o.uf).then(D => {
      const l = D?.locais[o.i];
      if (!l) return;
      if (l[0] == null) { alert(TX.alerta_sem_coord); return; }
      mapa.flyTo({ center: [l[1], l[0]], zoom: 15, padding: folga(0) });
      mapa.once("moveend", () => popupLocal(o.uf, o.i));
    });
  }
}
function montarBusca() {
  const inp = $("#busca"), lista = $("#sugestoes");
  inp.addEventListener("input", () => buscar(inp.value));
  inp.addEventListener("focus", () => { indiceEscolas(); carregarT1Meta(); }, { once: true });   // começa a baixar o índice quando a pessoa clica na busca
  inp.addEventListener("keydown", e => {
    if (lista.hidden || !opcoes.length) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + opcoes.length) % opcoes.length;
      lista.querySelectorAll("li").forEach((li, k) => li.setAttribute("aria-selected", String(k === sel)));
      inp.setAttribute("aria-activedescendant", "op" + sel);
    } else if (e.key === "Enter") { e.preventDefault(); escolher(opcoes[Math.max(sel, 0)]); }
    else if (e.key === "Escape") { lista.hidden = true; }
  });
  lista.addEventListener("mousedown", e => { const li = e.target.closest("li[data-k]"); if (li) { e.preventDefault(); escolher(opcoes[+li.dataset.k]); } });
  inp.addEventListener("blur", () => setTimeout(() => { lista.hidden = true; }, 150));
  $("#onde-estou").addEventListener("click", () => {
    if (!navigator.geolocation) return alert(TX.geoloc_nao);
    navigator.geolocation.getCurrentPosition(
      p => { mexeu = true; mapa.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 13 }); },
      () => alert(TX.geoloc_falhou), { enableHighAccuracy: false, timeout: 10000 });
  });
}

/* ---------- mapa ---------- */
/* botão "ver o Brasil inteiro": fecha o popup e volta ao enquadramento inicial */
class ControleBrasil {
  onAdd(m) {
    this._el = document.createElement("div");
    this._el.className = "maplibregl-ctrl maplibregl-ctrl-group";
    this._el.innerHTML = `<button type="button" class="ctrl-brasil" title="${TX.ver_brasil}" aria-label="${TX.ver_brasil}">
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 12a8 8 0 1 1-2.34-5.66"/><path d="M20 4v5h-5"/></svg></button>`;
    this._el.querySelector("button").addEventListener("click", () => {
      popup?.remove(); dica?.remove();
      enquadrarBrasil(600);
    });
    return this._el;
  }
  onRemove() { this._el.remove(); }
}
/* contorno de seleção ou de mouse: um só, o da malha detalhada se a UF dela já chegou; senão, o da generalizada */
const marcados = { "mun-sel": "", "mun-hover": "" };
function marcarMun(camada, cod) {
  if (DEPURAR && marcados[camada] !== cod) registrar({ ev: "contorno", camada, cod });
  marcados[camada] = cod;
  if (cod && camada === "mun-sel") contorno(cod);   // o escolhido: sempre o detalhado
  else if (cod && mapa.getZoom() >= Z_CONT) {        // sob o mouse: só se o mouse parar um pouco sobre ele
    clearTimeout(esperaCont);
    esperaCont = setTimeout(() => { if (marcados["mun-hover"] === cod) contorno(cod); }, 120);
  }
  atualizarDet();
}
/* Light Gray Canvas da Esri (serviços de mosaico públicos do ArcGIS Online; atribuição obrigatória). Os nomes de lugares
   ficam numa camada separada, que vai POR CIMA dos dados, como no Nexo. */
const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/";
const CREDITO_ESRI = TX.credito_esri;
const CREDITO_CARTO = '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> © <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>';
async function estiloBase() {
  if (CONFIG.fundo === "esri") {
    const fonte = nome => ({ type: "raster", tiles: [`${ESRI}${nome}/MapServer/tile/{z}/{y}/{x}`], tileSize: 256, maxzoom: 16 });
    return { credito: CREDITO_ESRI, estilo: { version: 8,
      sources: { "esri-base": fonte("World_Light_Gray_Base"), "esri-rotulos": fonte("World_Light_Gray_Reference") },
      layers: [{ id: "fundo", type: "background", paint: { "background-color": "#e9e9e7" } },
               { id: "fundo-base", type: "raster", source: "esri-base" },
               { id: "fundo-rotulos", type: "raster", source: "esri-rotulos", minzoom: CONFIG.zoomLocais }] } };
  }
  if (CONFIG.fundo !== "carto") return null;
  try {
    const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(CONFIG.estiloCarto, { signal: ctrl.signal }); clearTimeout(t);
    return r.ok ? { credito: CREDITO_CARTO, estilo: await r.json() } : null;
  } catch { return null; }
}
/* Enquadramento inicial: o Brasil inteiro, na parte da tela que o painel não cobre, em qualquer tamanho de tela.
   Enquanto a pessoa não mexe no mapa, ele se reenquadra quando a janela muda de tamanho (girar o celular, redimensionar
   a janela) ou quando o painel muda de altura (fontes chegando, painel recolhido). Depois do primeiro gesto, não mexe mais. */
let mexeu = false;
function enquadrarBrasil(duracao = 0) {
  if (!mapa) return;
  const c = mapa.getContainer(), W = c.clientWidth, H = c.clientHeight;
  let pad = folga();
  // se o painel deixa pouco espaço (janela estreita), ignora o painel: melhor o Brasil inteiro atrás dele que um país minúsculo
  if (W - pad.left - pad.right < 160 || H - pad.top - pad.bottom < 160) pad = { top: 20, right: 20, bottom: 20, left: 20 };
  mapa.fitBounds(CONFIG.brasil, { padding: pad, duration: duracao });
}
/* margem para o painel não cobrir o mapa: à esquerda no desktop, embaixo no celular */
function folga(extra = 20) {
  const p = $("#painel").getBoundingClientRect(), cel = matchMedia("(max-width: 719px)").matches;
  const det = popup?.isOpen() ? $("#detalhe").getBoundingClientRect() : null;   // painel do clique aberto, à direita
  if (cel) return { top: extra, right: extra, left: extra, bottom: Math.min(p.height, innerHeight * 0.6) + extra };
  const right = (det ? innerWidth - det.left : 40) + extra;
  // painel à esquerda: desconta a largura dele; se descontar a altura deixa um retângulo melhor (painel recolhido,
  // que vira uma faixa no alto), desconta a altura
  const lado = Math.min(innerWidth - p.right - extra - right, innerHeight - 2 * extra);
  const cima = Math.min(innerWidth - 2 * extra - right, innerHeight - p.bottom - 2 * extra);
  return cima > lado ? { top: p.bottom + extra, right, bottom: extra, left: extra }
                     : { top: extra, right, bottom: extra, left: p.right + extra };
}
function bboxGeom(geo) {
  let x0 = 180, y0 = 90, x1 = -180, y1 = -90;
  const anda = c => { if (typeof c[0] === "number") { x0 = Math.min(x0, c[0]); x1 = Math.max(x1, c[0]); y0 = Math.min(y0, c[1]); y1 = Math.max(y1, c[1]); } else c.forEach(anda); };
  anda(geo.coordinates);
  return [x0, y0, x1, y1];
}

/* ---------- etiqueta e contorno do mouse ----------
   Só responde a um MOUSE de verdade (PointerEvent.pointerType === "mouse", evento gerado pelo navegador, e não por
   script), e só quando ele de fato se move: toque e caneta não acendem nada, o mapa andando por baixo de um cursor
   parado não arrasta o contorno, e o contorno só aparece junto com a etiqueta (os dois saem e entram juntos).
   Com ?depurar=1 no endereço, cada mudança é registrada no console e numa caixa no canto da tela. */
const DEPURAR = new URLSearchParams(location.search).has("depurar");
const REG = [];
function registrar(o) {
  if (!DEPURAR) return;
  const r = { t: Math.round(performance.now()), ...o };
  REG.push(r); if (REG.length > 400) REG.shift();
  console.log("[mapa-voto]", JSON.stringify(r));
  let cx = $("#depurar");
  if (!cx) {
    cx = document.createElement("pre"); cx.id = "depurar";
    cx.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:99;max-width:min(560px,90vw);max-height:40vh;overflow:auto;margin:0;padding:6px 8px;font:11px/1.35 ui-monospace,monospace;background:rgba(19,38,43,.88);color:#fff;border-radius:6px;pointer-events:none;white-space:pre-wrap";
    document.body.append(cx);
  }
  cx.textContent = REG.slice(-14).map(x => JSON.stringify(x)).join("\n");
}
window.mapaVotoRegistro = () => JSON.stringify(REG);   // no console: copy(mapaVotoRegistro())
function ligarEtiqueta(achar) {
  const tela = mapa.getCanvasContainer(), canvas = mapa.getCanvas();
  const h = { quadro: 0, chave: "", x: null, y: null, cx: null, cy: null };
  const limpar = motivo => {
    cancelAnimationFrame(h.quadro); h.quadro = 0;
    if (h.chave || marcados["mun-hover"]) registrar({ ev: "limpa", motivo });
    dica.remove(); h.chave = ""; canvas.style.cursor = "";
    if (marcados["mun-hover"]) marcarMun("mun-hover", "");
  };
  const mostrar = () => {
    h.quadro = 0;
    if (h.x == null || mapa.isMoving()) return;
    const a = achar([h.x, h.y]);
    canvas.style.cursor = a ? "pointer" : "";
    if (!a) return limpar("fora de município ou local");
    const P = a.f.properties, chave = a.tipo === "l" ? `l${P.uf}-${P.i}` : a.tipo === "x" ? `x${P.i}` : `m${P.id}`;
    if (chave !== h.chave) {
      const d = a.tipo === "l" ? dadosLocal(P.uf, P.i) : a.tipo === "x" ? dadosExterior(P.i) : dadosMunicipio(P.id);
      if (!d) return limpar("sem dados para " + chave);
      const r = dicaHtml(d);
      dica.setHTML(r.html); dica._borda = r.borda;
    }
    dica.setLngLat(a.tipo === "m" ? mapa.unproject([h.x, h.y]) : a.f.geometry.coordinates).addTo(mapa);
    dica.getElement()?.style.setProperty("--borda", dica._borda);
    // o contorno só depois de a etiqueta estar na tela
    const cod = a.tipo === "m" ? a.f.properties.id : "";
    if (cod !== marcados["mun-hover"]) marcarMun("mun-hover", cod);
    if (chave !== h.chave) registrar({ ev: "mostra", chave, x: Math.round(h.x), y: Math.round(h.y), zoom: +mapa.getZoom().toFixed(2) });
    h.chave = chave;
  };
  tela.addEventListener("pointermove", e => {
    if (e.pointerType !== "mouse" || !e.isTrusted) {
      registrar({ ev: "ignorado", tipo: e.pointerType, confiavel: e.isTrusted, x: e.clientX, y: e.clientY });
      return limpar("ponteiro que não é mouse");
    }
    if (e.buttons) return;                                  // arrastando o mapa
    if (e.clientX === h.cx && e.clientY === h.cy) return;   // evento repetido sem o mouse sair do lugar
    h.cx = e.clientX; h.cy = e.clientY;
    const r = canvas.getBoundingClientRect();
    h.x = e.clientX - r.left; h.y = e.clientY - r.top;
    if (!h.quadro) h.quadro = requestAnimationFrame(mostrar);
  });
  tela.addEventListener("pointerleave", () => { h.x = null; limpar("mouse saiu do mapa"); });
  tela.addEventListener("pointercancel", () => { h.x = null; limpar("pointercancel"); });
  tela.addEventListener("pointerdown", e => { if (e.pointerType !== "mouse") { h.x = null; limpar("toque ou caneta"); } });
  // o mapa andou (arraste, roda do mouse, botão, link): apaga e espera o mouse se mexer de novo
  mapa.on("movestart", () => { h.cx = h.cy = null; limpar("mapa em movimento"); });
  addEventListener("blur", () => { h.x = null; limpar("janela perdeu o foco"); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) { h.x = null; limpar("aba escondida"); } });
  if (DEPURAR) {
    registrar({ ev: "inicio", navegador: navigator.userAgent, mouseFino: temMouse, toque: navigator.maxTouchPoints });
    // quem mais mexe nos contornos (seleção do clique, malha detalhada chegando)
    for (const tipo of ["click", "movestart", "moveend"]) mapa.on(tipo, e => registrar({ ev: "mapa:" + tipo, origem: e.originalEvent?.type || "programa" }));
  }
}

async function montarMapa(pronto) {
  if (/^#[\d.]+\/-?[\d.]+\/-?[\d.]+/.test(location.hash)) history.replaceState(null, "", location.pathname + location.search);
  const base = await estiloBase();
  mapa = new maplibregl.Map({
    container: "mapa", style: base?.estilo || ESTILO_VAZIO, bounds: CONFIG.brasil, fitBoundsOptions: { padding: folga() },
    // hash false: o mapa sempre abre no Brasil inteiro; para mostrar um lugar, o link de compartilhar usa ?m=, ?l= ou ?x=
    hash: false, attributionControl: false, maxZoom: 17, dragRotate: false, pitchWithRotate: false,
    locale: { "NavigationControl.ZoomIn": TX.zoom_mais, "NavigationControl.ZoomOut": TX.zoom_menos, "Popup.Close": TX.fechar,
              "AttributionControl.ToggleAttribution": TX.creditos, "Map.Title": TX.mapa_titulo }
  });
  mapa.touchZoomRotate.disableRotation();
  mapa.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
  mapa.addControl(new ControleBrasil(), "top-right");   // abaixo do "-", como no Nexo
  mapa.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution:
    (base ? base.credito + " · " : "") +
    TX.credito_dados }), "bottom-right");
  popup = painelDet;
  $("#detalhe-fechar").addEventListener("click", () => popup.remove());
  document.addEventListener("keydown", e => { if (e.key === "Escape" && popup.isOpen() && $("#modo-painel").hidden) popup.remove(); });
  dica = new maplibregl.Popup({ closeButton: false, closeOnClick: false, maxWidth: "260px", offset: 10, className: "dica-mapa" });

  enquadrarBrasil();
  for (const ev of ["pointerdown", "wheel", "keydown", "touchstart"]) mapa.getContainer().addEventListener(ev, () => { mexeu = true; }, { passive: true });
  let espera = 0;
  const reenquadrar = () => { clearTimeout(espera); espera = setTimeout(() => { if (!mexeu) enquadrarBrasil(); }, 120); };
  addEventListener("resize", reenquadrar);
  if (window.ResizeObserver) new ResizeObserver(reenquadrar).observe($("#painel"));
  document.fonts?.ready.then(reenquadrar);

  mapa.on("load", async () => {
    const estados = await pronto;
    // dados por baixo dos nomes de lugares (camada de rótulos da Esri ou a 1ª camada de texto do estilo vetorial)
    const rotulos = mapa.getLayer("fundo-rotulos") ? "fundo-rotulos" : mapa.getStyle().layers.find(l => l.type === "symbol")?.id;
    // desempenho (docs/fundamentacao.md, "Peso e velocidade"): as áreas somem no zoom 9, então a malha leve não precisa de
    // mosaicos acima disso (acima, o MapLibre amplia os do zoom 9); pontos não precisam de margem entre mosaicos
    mapa.addSource("mun", { type: "geojson", data: MALHA, promoteId: "id", maxzoom: 9, tolerance: 0.6 });
    mapa.addSource("uf", { type: "geojson", data: estados, maxzoom: 9, tolerance: 0.6 });
    mapa.addSource("locais", { type: "geojson", data: VAZIO, maxzoom: 14, buffer: 0 });
    mapa.addSource("mun-det", { type: "geojson", data: VAZIO, promoteId: "id", buffer: 16 });
    const largura = ["interpolate", ["linear"], ["zoom"], 4, 0.1, 7, 0.5, 11, 1.2];
    mapa.addLayer({ id: "mun-fill", type: "fill", source: "mun", paint: { "fill-color": CONFIG.semDados } }, rotulos);
    mapa.addLayer({ id: "mun-linha", type: "line", source: "mun",
      paint: { "line-color": "#ffffff", "line-opacity": 0.7, "line-width": largura } }, rotulos);
    mapa.addLayer({ id: "uf-linha", type: "line", source: "uf",
      paint: { "line-color": "#ffffff", "line-width": ["interpolate", ["linear"], ["zoom"], 4, 1, 8, 2.2],
               "line-opacity": ["interpolate", ["linear"], ["zoom"], 8, 1, CONFIG.zoomSomeMunicipio, 0] } }, rotulos);
    for (const [id, w] of [["mun-sel", 2], ["mun-hover", 1.5]]) {
      mapa.addLayer({ id, type: "line", source: "mun", filter: ["==", g("id"), ""], paint: { "line-color": "#13262b", "line-width": w } }, rotulos);
      mapa.addLayer({ id: id + "-det", type: "line", source: "mun-det", filter: ["==", g("id"), ""],
        paint: { "line-color": "#13262b", "line-width": w } }, rotulos);
    }
    mapa.addLayer({ id: "locais", type: "circle", source: "locais", minzoom: CONFIG.zoomLocais,
      paint: {
        "circle-color": CONFIG.semDados,
        "circle-radius": ["interpolate", ["linear"], ["zoom"],
          8, ["max", 1.5, ["*", 0.05, ["sqrt", g("val")]]],
          12, ["max", 2.5, ["*", 0.16, ["sqrt", g("val")]]],
          16, ["max", 4, ["*", 0.5, ["sqrt", g("val")]]]],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 9, ["case", ["==", g("ap"), 1], 1.2, 0], 12, ["case", ["==", g("ap"), 1], 2.2, 1]]
      } });
    // exterior: visível em qualquer zoom (no mapa-múndi, como no Nexo); área do círculo proporcional aos votos válidos
    mapa.addSource("ext", { type: "geojson", data: VAZIO, maxzoom: 10, buffer: 0 });
    mapa.addLayer({ id: "ext", type: "circle", source: "ext",
      paint: { "circle-color": CONFIG.semDados, "circle-stroke-color": "#ffffff",
        "circle-radius": ["interpolate", ["linear"], ["zoom"],
          1, ["max", 2.5, ["*", 0.03, ["sqrt", g("val")]]], 4, ["max", 3.5, ["*", 0.05, ["sqrt", g("val")]]],
          8, ["max", 4, ["*", 0.09, ["sqrt", g("val")]]]],
        "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 1, 0.6, 6, 1.2] } }, rotulos);
    atualizarExt();
    pintar();

    const achar = pt => {
      const ext = mapa.queryRenderedFeatures(pt, { layers: ["ext"] })[0];
      if (ext) return { tipo: "x", f: ext };
      const loc = mapa.getZoom() >= CONFIG.zoomLocais ? mapa.queryRenderedFeatures(pt, { layers: ["locais"] })[0] : null;
      if (loc) return { tipo: "l", f: loc };
      if (mapa.getZoom() >= CONFIG.zoomSomeMunicipio) return null;   // áreas invisíveis: só os locais respondem
      const m = mapa.queryRenderedFeatures(pt, { layers: ["mun-fill"] })[0];
      return m ? { tipo: "m", f: m } : null;
    };
    mapa.on("click", e => {
      const a = achar(e.point);
      if (!a) return;
      if (a.tipo === "l") return popupLocal(a.f.properties.uf, a.f.properties.i);
      if (a.tipo === "x") return popupExterior(a.f.properties.i);
      popupMunicipio(a.f.properties.id, e.lngLat);
    });

    ligarEtiqueta(achar);
    mapa.on("moveend", ufsNaTela);
    mapa.on("zoom", legendaTamanho);
    ufsNaTela();
    legendaTamanho();
    abrirDoLink();
    // o resto dos dados dos municípios: depois que o mapa terminou de desenhar (ou em 3 s, o que vier antes)
    if (!munCompleto) { let foi = false; const ir = () => { if (!foi) { foi = true; completarMun(); } }; mapa.once("idle", ir); setTimeout(ir, 3000); }
  });
}

/* municípios em duas partes (data/municipios_a.json e _b.json, índices em META.municipios_partes): cada vetor fica com o
   tamanho completo, com zeros no que ainda não chegou */
function juntarMun(parte, idx) {
  for (const [cod, vals] of Object.entries(parte)) {
    const v = MUN[cod] || (MUN[cod] = new Array(I.tam + 1).fill(0));
    idx.forEach((k, j) => { v[k] = vals[j]; });
  }
}
/* a parte "b" (1º turno, seções comparáveis...) chega depois do primeiro desenho; aí as cores e o painel aberto se refazem */
let munCompleto = true;
async function completarMun() {
  const P = META.municipios_partes;
  if (!P || !META.arquivos["municipios_b.json"]) return;
  try {
    juntarMun(await json("data/municipios_b.json" + versao("municipios_b.json")), P.b);
    munCompleto = true;
    const refazer = () => { if (cargo === "pres") recalcular(); reabrirPopup(); };
    if (window.requestIdleCallback) requestIdleCallback(refazer, { timeout: 1500 }); else setTimeout(refazer, 0);
  } catch (e) { console.error(e); }
}

async function iniciar() {
  const C = window.CARGA;   // downloads começados no index.html
  try {
    META = await C.meta;
  } catch (e) {
    $("#resumo-brasil").textContent = TX.sem_dados;
    console.error(e); return;
  }
  indices();
  for (const u of META.ufs) NOME_UF[u.uf] = u.nome;
  montarModos();
  montarControles();
  resumoBrasil();
  if (TEM_T1) carregarT1Meta().then(M => { if (M) $("#turnos").hidden = false; });
  if (!window.maplibregl || !window.topojson) { $("#mapa").innerHTML = `<p style="padding:16px">${TX.mapa_nao_carregou}</p>`; return; }
  // o mapa (e o mapa base) começa a ser montado já, enquanto a malha e os dados terminam de chegar
  const pronto = (async () => {
    const [topo, mun, ext] = await Promise.all([C.malha, C.mun, C.ext]);
    const P = META.municipios_partes;
    if (P && META.arquivos["municipios_a.json"]) { juntarMun(mun, P.a); munCompleto = false; } else MUN = mun;
    EXT = ext?.cidades || [];
    const malha = topojson.feature(topo, topo.objects.municipios), estados = topojson.feature(topo, topo.objects.estados);
    for (const f of malha.features) {
      const p = f.properties;
      munInfo.set(p.id, { nome: p.nome, uf: p.uf, bbox: bboxGeom(f.geometry), s: sem(p.nome) });
      Object.assign(p, propsMun(p.id, p.uf));
    }
    MALHA = malha;
    montarBusca();
    return estados;
  })();
  pronto.catch(e => { $("#resumo-brasil").textContent = TX.falha_dados; console.error(e); });
  await montarMapa(pronto);
}

iniciar();
