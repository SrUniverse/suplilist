/**
 * ══════════════════════════════════════════════════════════════
 * js/performance.js — Suíte de Auditoria e Estresse (Task SL-30)
 * Especialista: Engenharia de Confiabilidade (SRE) & Web Vitals
 * ══════════════════════════════════════════════════════════════
 * Este módulo é injetado apenas para desenvolvimento/staging.
 * Fornece ferramentas para simular volume massivo de dados (5k+ itens).
 */

import { IT, CAT, PRIO } from './database.js';
import { S } from './state.js';
import { applyFilters } from './filter.js';
import { renderList } from './list.js';

/**
 * Gerador de dados sintéticos para simulação de escala.
 * @param {number} count - Quantidade de itens a gerar.
 * @returns {Array} Array de suplementos mockados.
 */
export function generateMassiveData(count = 1000) {
  const categories = Object.keys(CAT);
  const priorities = Object.keys(PRIO);
  const mockData = [];

  for (let i = 0; i < count; i++) {
    mockData.push({
      id: 10000 + i,
      name: `Mock Supplement ${i}`,
      cat: categories[i % categories.length],
      pr: priorities[i % priorities.length],
      sc: Math.floor(Math.random() * 6),
      pm: Math.floor(Math.random() * 300) + 10,
      doses: 30,
      goals: ['saude', 'energia'],
      desc: 'Descrição mockada para teste de estresse de memória e renderização.',
      tags: ['mock', 'stress-test']
    });
  }

  return mockData;
}

/**
 * Suite de Teste de Estresse (SL-30)
 * Executa sequencialmente operações pesadas e reporta métricas de performance.
 * @param {number} count - Volume de itens para o teste.
 */
export async function runStressTest(count = 2000) {
  console.group(`🚀 INICIANDO TESTE DE ESTRESSE: ${count} ITENS`);
  
  const metrics = [];
  const startTotal = performance.now();

  // 1. Geração de Dados
  const t0 = performance.now();
  const massiveIT = generateMassiveData(count);
  const t1 = performance.now();
  metrics.push({ Operação: 'Geração de Mock Data', Tempo: `${(t1 - t0).toFixed(2)}ms`, Status: '✅' });

  // 2. Teste de Filtragem (Lógica Pura / CPU Bound)
  const t2 = performance.now();
  const filtered = applyFilters(S, massiveIT);
  const t3 = performance.now();
  metrics.push({ Operação: 'Motor de Filtragem (applyFilters)', Tempo: `${(t3 - t2).toFixed(2)}ms`, Status: (t3 - t2) > 50 ? '⚠️ Lento' : '✅' });

  // 3. Teste de Ordenação Complexa
  const t4 = performance.now();
  const sorted = [...massiveIT].sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  const t5 = performance.now();
  metrics.push({ Operação: 'Ordenação Alfabética (Massiva)', Tempo: `${(t5 - t4).toFixed(2)}ms`, Status: '✅' });

  // 4. Teste de Renderização (DOM Bound / Layout)
  // Aqui testamos o impacto no Main Thread ao processar a renderização chunked
  const t6 = performance.now();
  
  // Simulamos o estado da lista para o renderList processar os dados massivos
  // Nota: renderList utiliza requestAnimationFrame internamente para chunking.
  // Medimos o tempo de setup da renderização.
  renderList(123, massiveIT); 
  
  const t7 = performance.now();
  const renderTime = t7 - t6;
  
  metrics.push({ 
    Operação: 'Setup de Renderização (DOM Injection)', 
    Tempo: `${renderTime.toFixed(2)}ms`, 
    Status: renderTime > 16.6 ? '🚨 JANK DETECTADO' : '✅ Smooth' 
  });

  const endTotal = performance.now();
  
  // Exibição do Relatório
  console.table(metrics);
  
  if (renderTime > 16.6) {
    console.error(`🚨 ALERTA DE PERFORMANCE: O tempo de renderização (${renderTime.toFixed(2)}ms) excede o orçamento de 1 frame (16.6ms). Isso causará travamentos visuais perceptíveis.`);
  }

  console.log(`⏱️ Tempo total da suíte: ${(endTotal - startTotal).toFixed(2)}ms`);
  console.groupEnd();

  return {
    success: true,
    itemCount: massiveIT.length,
    totalTime: endTotal - startTotal
  };
}

/**
 * Monitor de Saúde de Memória (Heap Analytics)
 */
export function logMemoryUsage() {
  if (performance.memory) {
    const used = (performance.memory.usedJSHeapSize / 1048576).toFixed(2);
    const total = (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2);
    console.log(`🧠 Uso de Memória: ${used}MB / ${total}MB`);
  } else {
    console.warn('API performance.memory não suportada neste navegador.');
  }
}

/**
 * Expõe as ferramentas globalmente para o console do desenvolvedor.
 * Restrito a ambientes de desenvolvimento (localhost / 127.0.0.1 / file://).
 */
if (typeof window !== 'undefined') {
  const isDev = (
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1' ||
    location.protocol === 'file:' ||
    location.port !== ''
  );

  if (isDev) {
    window._perfAudit = {
      run: runStressTest,
      gen: generateMassiveData,
      mem: logMemoryUsage,
      help: () => {
        console.log(`
🛠️ SUPLILIST PERFORMANCE AUDIT HELP
----------------------------------
window._perfAudit.run(count)  -> Executa teste de estresse (default: 2000 itens)
window._perfAudit.gen(count)  -> Retorna array de itens mockados
window._perfAudit.mem()       -> Exibe uso atual de Heap (Chrome/Edge)
        `);
      }
    };

    console.info('⚡ Performance Audit Module Loaded. Type "_perfAudit.help()" for instructions.');
  }
}