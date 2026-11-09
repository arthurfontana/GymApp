// Gamificação (ex-gam.mjs): 6 semanas sintéticas → placar no Início → Minha jornada → regras →
// perfil → resumo com pontos → sessão ao vivo com recorde → biblioteca.
// Os números dependem do dia da semana em que roda; os asserts conferem a estrutura e os marcos.
import { test, expect, dadosSeed, semear, abrir, semRolagemLateral, anexarPrint } from './fixtures.js';

const PESO = 78.5;
const REF = { 'leg-press-45': 1.2, 'agachamento-goblet': .3, 'stiff-halteres': .5, 'elevacao-pelvica': 1, 'supino-inclinado': .45, 'supino-maquina': .6, 'remada-sentada': .7, 'puxada-alta': .7, 'mesa-flexora': .45, 'panturrilha-em-pe': 1, 'elevacao-lateral': .2, 'triceps-polia': .3, 'rosca-biceps': .25 };

function historico(treinos, conjuntos) {
  const DIA = 864e5, now = Date.now(), sessoes = {};
  let n = 0;
  const sess = (tid, cid, quando, sem) => {
    const t = treinos[tid], id = 's' + (n++);
    let ts = quando;
    const s = { id, conjuntoId: cid, conjuntoNome: conjuntos[cid].nome, treinoId: tid, treinoNome: t.nome, letra: t.letra, inicio: quando - 60000, status: 'concluida', atual: 0, notas: '', pesoCorp: PESO, itens: [] };
    if (t.formato) { s.formato = 'circuito'; s.rodadas = t.rodadas; s.descansoRodada = t.descansoRodada; s.aquecimento = t.aquecimento; s.aqGuiado = true; s.aqFeito = true; }
    s.itens = t.itens.map((it) => {
      const x = JSON.parse(JSON.stringify(it)); x.sets = []; const ref = REF[x.exId];
      for (let k = 0; k < x.series; k++) {
        ts += 150000; let carga = null, reps;
        if (x.tipo === 'tempo') reps = 30 + sem * 2; else reps = Math.min(x.max, x.min + sem);
        if (ref) { const tot = ref * PESO * (.85 + .04 * sem); carga = Math.round((x.porHalter ? tot / 2 : tot) / 2) * 2; }
        x.sets.push({ carga, reps, esforco: 'ideal', t: ts });
      }
      return x;
    });
    s.fim = ts + 60000; sessoes[id] = s;
  };
  for (let w = 6; w >= 1; w--) {
    const sem = 6 - w, base = now - w * 7 * DIA;
    sess('A', 'academia', base - 2 * DIA, sem); sess('B', 'academia', base, sem);
    if (w <= 2) sess('cal-a', 'calistenia', base + DIA, sem);
  }
  return sessoes;
}

test('gamificação: placar, jornada, resumo e recorde ao vivo', async ({ page }, testInfo) => {
  const { treinos, conjuntos, config } = dadosSeed({ calistenia: true });
  conjuntos.academia = { id: 'academia', nome: 'Treino na academia', descricao: 'Full Body A/B · Recomposição corporal', ordem: 1, criado: 1, frequencia: '2x por semana', treinos: [{ id: 'A', dia: 'Terça' }, { id: 'B', dia: 'Quinta' }], intervaloH: 48 };
  await semear(page, {
    'mt3d.treinos': treinos, 'mt3d.conjuntos': conjuntos,
    'mt3d.config': Object.assign({}, config, { migrado: true, perfil: { apelido: 'Arthur', peso: PESO, meta: 2 } }),
    'mt3d.sessoes': historico(treinos, conjuntos),
  });
  const W = (ms = 300) => page.waitForTimeout(ms);
  const print = (n, full = false) => anexarPrint(page, testInfo, n, { fullPage: full });
  const txt = (fn) => page.evaluate(fn);

  await abrir(page); await W(400);
  await print('home');

  await test.step('placar no Início', async () => {
    const placar = await txt(() => document.querySelector('.placar').innerText.replace(/\n/g, ' | '));
    expect(placar).toMatch(/NÍVEL/);
    expect(placar).toMatch(/\d[\d.]* XP · faltam [\d.]+ para o nível \d+/);
    expect(placar).toMatch(/pts · (Bronze|Prata|Ouro|Platina|Diamante)/);
    expect(placar).toMatch(/semanas/);
  });

  await test.step('Minha jornada: liga, sequência, desafios e conquistas', async () => {
    await page.click('a.placar'); await W(500);
    await expect(page.locator('#pontosView')).toBeVisible();
    await print('jornada', true);
    const stats = await txt(() => [...document.querySelectorAll('.gs')].map((x) => x.innerText.replace(/\n/g, ' ')));
    expect(stats.map((s) => s.split(' ')[0])).toEqual(expect.arrayContaining(['LIGA', 'SEQUÊNCIA', 'CALORIAS', 'TOTAL']));
    expect(await page.locator('.desf').count()).toBeGreaterThanOrEqual(3);
    const conq = await txt(() => [...document.querySelectorAll('.medalha.on b')].map((x) => x.textContent));
    expect(conq).toEqual(expect.arrayContaining(['Primeiro treino', 'Dez treinos', 'Uma tonelada', 'Dez toneladas', 'Mil repetições', 'Circuito fechado']));
    await page.click('.wc-col:nth-child(5)'); await W();
    await expect(page.locator('#wcTip')).toContainText(/Semana de \d+\/\d+: [\d.]+ pts · \d+ treinos?/);
    await page.evaluate(() => { document.querySelector('details.regras').open = true; }); await W();
    await print('regras', true);
    await page.click('[data-act="perfil"]'); await W(400);
    await expect(page.locator('#sheetWrap')).toBeVisible();
    await print('perfil');
    await page.click('#sheet [data-act="close"]'); await W();
  });

  await test.step('resumo da última sessão com pontos', async () => {
    const ult = await txt(() => Object.values(window.__S.sessoes).sort((a, b) => b.fim - a.fim)[0].id);
    await page.goto('/?test=1#resumo/' + ult); await W(1300);
    await print('resumo', true);
    const res = await txt(() => document.querySelector('.ptsres').innerText.replace(/\n/g, ' | '));
    expect(res).toMatch(/^PONTOS DO TREINO \| \+\d+/);
    expect(res).toContain('Circuito completo');
    expect(res).toContain('Aquecimento guiado');
  });

  await test.step('sessão ao vivo: recorde pessoal', async () => {
    await page.goto('/?test=1#conjunto/academia/treino/B'); await W(500);
    await print('treinoB');
    await page.click('.sticky-cta [data-act="start"]'); await W(600);
    await page.evaluate(() => {
      const i = document.querySelector('#sessaoView .stp input[data-f="carga"]');
      if (i) { i.value = '40'; i.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.click('[data-act="doneSet"]'); await W(250);
    await print('voa');
    await expect(page.locator('#toast')).toContainText('Recorde pessoal em Agachamento goblet: 40 kg × 10');
    await expect(page.locator('.sbar-t span').first()).toContainText('1/14 séries');
  });

  await page.goto('/?test=1#biblioteca'); await W(500);
  await print('bib');
  await semRolagemLateral(page);
});
