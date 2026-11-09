// Conjunto "Calistenia em casa" (ex-cal.mjs): ficha da semana, circuito, aquecimento guiado,
// contagem por lado, resumo e próximo treino.
import { test, expect, dadosSeed, semear, abrir, semRolagemLateral, anexarPrint } from './fixtures.js';

test('calistenia: ficha, aquecimento, circuito de 2 rodadas e resumo', async ({ page }, testInfo) => {
  const { treinos, conjuntos, config } = dadosSeed({ calistenia: true });
  conjuntos.academia = { id: 'academia', nome: 'Treino na academia', descricao: 'Full Body A/B · Recomposição corporal', ordem: 1, criado: 1, frequencia: '2x por semana', treinos: [{ id: 'A', dia: 'Terça' }, { id: 'B', dia: 'Quinta' }] };
  await semear(page, {
    'mt3d.treinos': treinos, 'mt3d.conjuntos': conjuntos,
    'mt3d.config': Object.assign({}, config, { migrado: true }), 'mt3d.sessoes': '{}',
  });
  const W = (ms = 300) => page.waitForTimeout(ms);
  const print = (n, full = true) => anexarPrint(page, testInfo, n, { fullPage: full });
  const txt = (fn) => page.evaluate(fn);

  await abrir(page); await W();
  await print('home');

  await test.step('ficha da semana', async () => {
    await page.click('a.card.cj[href="#conjunto/calistenia"]'); await W();
    await print('conj');
    expect(await txt(() => [...document.querySelectorAll('.ficha .chk b')].map((x) => x.textContent))).toEqual([
      'Treino A · Base de força', 'Treino B · Força e estabilidade', 'Caminhada 1', 'Caminhada 2', 'Caminhada 3', 'Registrei meu peso e cintura']);
    await expect(page.locator('.ficha-h .tr-m')).toHaveText('0/6 concluídos');
    await expect(page.locator('.fase')).toContainText('Aprender os movimentos');
    await page.click('.chk[data-k="cam1"]');
    await expect(page.locator('.ficha-h .tr-m')).toHaveText('1/6 concluídos');
    await page.evaluate(() => { document.querySelector('details.guide').open = true; }); await W();
    await print('conj_guia');
  });

  await test.step('treino A e folhas', async () => {
    await page.click('a.card.tr[href="#conjunto/calistenia/treino/cal-a"]'); await W();
    await print('treinoA');
    expect(await txt(() => [...document.querySelectorAll('.exr-m')].map((x) => x.textContent))).toEqual([
      '12 reps · pausa até 0:30', '8–10 reps · pausa até 0:30', '12 reps · pausa até 0:30', '6 reps por lado · depois 1:00 de descanso']);
    await page.click('[data-act="editItem"][data-i="3"]'); await W();
    await expect(page.locator('#sheetWrap')).toBeVisible();
    await print('sheetItem', false);
    await page.click('#sheet [data-act="close"]'); await W();
    await page.click('[data-act="editTreino"]'); await W();
    await print('sheetTreino', false);
    await page.click('#sheet [data-act="close"]'); await W();
  });

  await test.step('aquecimento guiado', async () => {
    await page.click('.sticky-cta [data-act="start"]'); await W(500);
    await print('sess0');
    await page.click('[data-act="aqStart"]'); await W(400);
    await print('aq1', false);
    // avança o aquecimento para o 3º movimento
    await page.evaluate(() => {
      const s = Object.values(window.__S.sessoes).find((x) => x.status === 'andamento');
      const x = JSON.parse(JSON.stringify(s)); x.descansoFim = Date.now() + 50000; window.__put('sessoes', x.id, x);
    });
    await W(600);
    await expect(page.locator('#restNext')).toHaveText(/^Agora: Mobilidade do quadril · 0:\d\dDepois: Agachamentos leves$/);
    expect(await txt(() => [...document.querySelectorAll('#restCard [data-aq]')].map((l) => l.className || '-').join(','))).toBe('ok,ok,cur,-');
    await print('aq2', false);
    await page.click('[data-act="skipRest"]'); await W(400);
  });

  await test.step('circuito: 2 rodadas de 4 exercícios', async () => {
    const ordem = [];
    for (let k = 0; k < 8; k++) {
      const nome = await txt(() => document.querySelector('.exnow h2').textContent);
      const eb = await txt(() => document.querySelector('.exnow .eyebrow').textContent);
      const cta = await txt(() => document.querySelector('[data-act="doneSet"]').textContent.trim());
      await page.click('[data-act="effort"][data-v="ideal"]');
      await page.click('[data-act="doneSet"]'); await W(450);
      const lbl = await txt(() => { const l = document.querySelector('#restLbl'); return l ? l.textContent + ' ' + document.querySelector('#restTime').textContent : '(sem descanso)'; });
      // o cronômetro já pode ter andado 1–2 s sob carga: arredonda para cima, em blocos de 30 s
      const lblN = lbl.replace(/(\d+):(\d\d)$/, (_, m, ss) => { const t = Math.ceil((+m * 60 + +ss) / 30) * 30; return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); });
      ordem.push(`${eb} :: ${nome} [${cta}] -> ${lblN}`);
      if (k === 0) await print('sess_pausa');
      if (k === 3) await print('sess_rodada');
      if (await page.$('#restCard [data-act="skipRest"]')) await page.click('#restCard [data-act="skipRest"]');
      await W(300);
    }
    expect(ordem).toEqual([
      'Rodada 1 de 2 · exercício 1 de 4 :: Agachamento livre [Concluir e seguir] -> Pausa 0:30',
      'Rodada 1 de 2 · exercício 2 de 4 :: Flexão inclinada na parede [Concluir e seguir] -> Pausa 0:30',
      'Rodada 1 de 2 · exercício 3 de 4 :: Ponte de glúteos [Concluir e seguir] -> Pausa 0:30',
      'Rodada 1 de 2 · exercício 4 de 4 :: Dead bug [Concluir rodada 1] -> Fim da rodada 1 1:00',
      'Rodada 2 de 2 · exercício 1 de 4 :: Agachamento livre [Concluir e seguir] -> Pausa 0:30',
      'Rodada 2 de 2 · exercício 2 de 4 :: Flexão inclinada na parede [Concluir e seguir] -> Pausa 0:30',
      'Rodada 2 de 2 · exercício 3 de 4 :: Ponte de glúteos [Concluir e seguir] -> Pausa 0:30',
      'Rodada 2 de 2 · exercício 4 de 4 :: Dead bug [Concluir último exercício] -> (sem descanso)',
    ]);
    await print('sess_fim');
  });

  await test.step('resumo, ficha atualizada e próximo treino', async () => {
    await page.click('.fin [data-act="finish"]'); await W(500);
    await print('resumo');
    const resumo = await txt(() => [...document.querySelectorAll('.sumr')].map((x) => x.innerText.replace(/\n/g, ' / ')));
    expect(resumo).toHaveLength(4);
    expect(resumo[0]).toContain('Agachamento livre / 1ª vez / 12 · 12');
    expect(resumo[3]).toContain('Dead bug / 1ª vez / 6 · 6 / Próxima vez: Fez 6 por lado em todas');
    await page.click('#resumoView a.btn.primary'); await W(400);
    await print('conj_depois');
    expect(await txt(() => [...document.querySelectorAll('.ficha .chk')].map((x) => (x.classList.contains('on') ? '✓' : '·') + x.querySelector('b').textContent))).toEqual([
      '✓Treino A · Base de força', '·Treino B · Força e estabilidade', '✓Caminhada 1', '·Caminhada 2', '·Caminhada 3', '·Registrei meu peso e cintura']);
    await expect(page.locator('.hero h2')).toHaveText('Força e estabilidade');
  });

  await page.goto('/?test=1#biblioteca/treinos'); await W(600);
  await print('bib');
  await semRolagemLateral(page);
});
