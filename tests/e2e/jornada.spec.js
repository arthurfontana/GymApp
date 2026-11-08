// Jornada completa no celular (ex-jor.mjs): migração, conjunto, treino, folhas, tema,
// sessão com prévia 3D (e ida e volta ao palco), séries, resumo, novo conjunto e biblioteca.
import { test, expect, dadosSeed, semear, abrir, semRolagemLateral, anexarPrint } from './fixtures.js';

test('jornada: do Início ao resumo, conjunto novo e biblioteca', async ({ page, tema }, testInfo) => {
  const { treinos, config } = dadosSeed();
  // sessão anterior do treino A, para testar "anterior" e sugestões
  const now = Date.now();
  const prevA = {
    id: 's0', treinoId: 'A', treinoNome: 'Treino A', letra: 'A', inicio: now - 3 * 864e5 - 3600e3, fim: now - 3 * 864e5,
    status: 'concluida', atual: 0, descansoFim: null, notas: '',
    itens: treinos.A.itens.map((it, i) => Object.assign(JSON.parse(JSON.stringify(it)), {
      sets: it.tipo === 'tempo' ? [{ reps: 30 }, { reps: 35 }]
        : Array.from({ length: it.series }, (_, k) => ({ carga: [100, 40, 45, 10, 6, 20][i], reps: i === 0 ? 12 : 10 - k, esforco: 'ideal' })),
    })),
  };
  await semear(page, { 'mt3d.treinos': treinos, 'mt3d.config': config, 'mt3d.sessoes': { s0: prevA } });
  const W = (ms = 300) => page.waitForTimeout(ms);
  const print = (n, full = true) => anexarPrint(page, testInfo, n, { fullPage: full });

  await abrir(page);
  await W();
  await print('home');

  await test.step('migração do programa antigo para o conjunto "academia"', async () => {
    expect(await page.evaluate(() => {
      const c = window.__S.conjuntos.academia;
      return c ? [c.nome, c.descricao, c.treinos.map((m) => m.id + ':' + m.dia).join(','), Object.values(window.__S.sessoes).map((s) => s.conjuntoId).join(',')] : null;
    })).toEqual(['Treino na academia', 'Full Body A/B · Recomposição corporal', 'A:Terça,B:Quinta', 'academia']);
  });

  await test.step('conjunto, treino e folhas de edição', async () => {
    await page.click('a.card.cj[href="#conjunto/academia"]');
    await expect(page.locator('#conjuntoView')).toBeVisible();
    await W(); await print('conj');
    await page.click('a.card.tr[href="#conjunto/academia/treino/A"]');
    await expect(page.locator('#treinoView')).toBeVisible();
    await W(); await print('treinoA');
    await page.click('[data-act="editItem"][data-i="0"]');
    await expect(page.locator('#sheetWrap')).toBeVisible();
    await W(); await print('sheetItem', false);
    await page.click('#sheet [data-act="close"]'); await W();
    await page.click('[data-act="addItem"]');
    await expect(page.locator('#sheetWrap')).toBeVisible();
    await W(); await print('sheetAdd', false);
    await page.click('#sheet [data-act="close"]'); await W();
  });

  await test.step('botão de tema alterna e volta', async () => {
    const outro = tema === 'light' ? 'dark' : 'light';
    const th = () => page.evaluate(() => document.documentElement.dataset.theme);
    expect(await th()).toBe(tema);
    await page.click('#treinoView .themebtn'); expect(await th()).toBe(outro);
    await page.click('#treinoView .themebtn'); expect(await th()).toBe(tema);
  });

  await test.step('sessão com prévia 3D, palco e volta', async () => {
    await page.click('.sticky-cta [data-act="start"]');
    await expect(page.locator('#sessaoView')).toBeVisible();
    await W(400); await print('sess1');
    await page.evaluate(() => document.querySelector('.howto').scrollIntoView({ block: 'end' }));
    await W(200); await print('howto', false);
    await expect(page.locator('#miniStage canvas')).toHaveCount(1);
    await page.click('.howto .btn.more');
    await expect(page.locator('#exView')).toBeVisible();
    await expect(page.locator('#stage canvas')).toHaveCount(1);
    await expect(page.locator('#exView .back')).toHaveAttribute('href', '#sessao');
    await W(500);
    await page.evaluate(() => window.__go(2.7, 'lateral'));
    await print('exFromMini', false);
    await page.click('#exView .back');
    await expect(page.locator('#sessaoView')).toBeVisible();
    await expect(page.locator('#miniStage canvas')).toHaveCount(1);
    expect(await page.evaluate(() => location.hash)).toBe('#sessao');
  });

  await test.step('séries, descanso e fim da sessão', async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.click('[data-act="step"][data-f="carga"][data-d="1"]');
    await page.click('[data-act="effort"][data-v="ideal"]');
    await page.click('[data-act="doneSet"]');
    await expect(page.locator('[data-act="skipRest"]').first()).toBeVisible();
    await W(300); await print('rest', false);
    // pula descanso e completa o resto rápido
    const cl = async (sel) => {
      try { const e = await page.$(sel); if (!e) return false; await e.click({ timeout: 3000 }); return true; } catch (err) { return 'retry'; }
    };
    for (let k = 0; k < 40; k++) {
      if (await cl('[data-act="skipRest"]')) await W(120);
      let r = await cl('[data-act="doneSet"]'); if (r) { await W(150); continue; }
      r = await cl('.entry [data-act="goEx"]'); if (r) { await W(150); continue; }
      break;
    }
    await page.evaluate(() => window.scrollTo(0, 0)); await W(200);
    await print('sessDone');
    await page.click('[data-act="finish"]');
    await expect(page.locator('#resumoView')).toBeVisible();
    await W(500); await print('resumo');
    const feitas = await page.evaluate(() => Object.values(window.__S.sessoes).filter((s) => s.status === 'concluida'));
    expect(feitas).toHaveLength(2);
    // todas as séries planejadas do Treino A foram registradas
    const nova = feitas.find((s) => s.id !== 's0');
    expect(nova.itens.map((it) => it.sets.length)).toEqual(treinos.A.itens.map((it) => it.series));
  });

  await test.step('novo conjunto reaproveitando o Treino B', async () => {
    await page.goto('/?test=1#'); await W(500);
    await print('home2');
    await page.click('#homeView [data-act="novoConjunto"]'); await W();
    await page.fill('#sheet input[data-k="nome"]', 'Treino em casa');
    await page.fill('#sheet input[data-k="descricao"]', 'Sem equipamento, 3x por semana');
    await page.click('#sheet [data-act="save"]'); await W(400);
    const hash = await page.evaluate(() => location.hash);
    expect(hash).toMatch(/^#conjunto\/[^/]+$/);
    await page.click('#conjuntoView .sec-h [data-act="addTreino"]'); await W();
    await print('addTreino', false);
    await page.click('#sheet [data-act="pickT"][data-id="B"]'); await W(200);
    await page.click('#sheet [data-act="close"]'); await W();
    await print('conj2');
    const hB = await page.evaluate(() => document.querySelector('#conjuntoView a.card.tr').getAttribute('href'));
    expect(hB).toBe(hash + '/treino/B');
    await page.click('#conjuntoView a.card.tr'); await W();
    await print('treinoShared');
    await expect(page.locator('#treinoView .note').first()).toContainText('Este treino também está em Treino na academia');
  });

  await test.step('treino novo sem equipamento', async () => {
    await page.click('#treinoView .back'); await W();
    await page.click('#conjuntoView .sec-h [data-act="addTreino"]'); await W();
    await page.click('#sheet [data-act="novo"]'); await W(500);
    await page.fill('#sheet input[data-k="dia"]', 'Sábado');
    await page.click('#sheet [data-act="save"]'); await W(400);
    await page.click('[data-act="addItem"]'); await W();
    await page.click('#sheet [data-act="eqf"][data-v="sem"]'); await W(200);
    await print('addSem', false);
    await page.click('#sheet [data-act="pick"][data-id="prancha"]'); await W(200);
    await page.click('#sheet [data-act="close"]'); await W();
    await print('treinoNovo');
    await expect(page.locator('#treinoView')).toContainText('Prancha');
    await page.click('#treinoView .back'); await W();
    await print('conj3');
  });

  await test.step('biblioteca de treinos e de exercícios', async () => {
    await page.goto('/?test=1#biblioteca/treinos'); await W(400);
    await expect(page.locator('#bibView')).toBeVisible();
    await print('bib');
    await page.goto('/?test=1#biblioteca'); await W();
    await expect(page.locator('#menuView')).toBeVisible();
    await print('libTodos');
    const todos = await page.locator('#menuView a.ex:visible').count();
    await page.click('.eqfilter [data-eqf="sem"]'); await W(200);
    const sem = await page.locator('#menuView a.ex:visible').count();
    expect(sem).toBeGreaterThan(0);
    expect(sem).toBeLessThan(todos);
    await print('libSem');
    await page.goto('/?test=1#'); await W(400);
    await print('home3');
    await semRolagemLateral(page);
  });
});
