// ============================================================
// StackRecommender AI Engine v4.1 — SupliList
// Clinical-grade personalized scoring and recommendation engine.
// Executes 100% locally on the device (Edge AI).
// ============================================================

import { eventBus } from '../../core/event-bus.js';
import { convertToGrams } from '../../ai/dosage-converter.js';
import { validateUserProfile, sanitizeUserProfile } from './profile-validator.js';

// ─── Supplements Clinical Database ──────────────────────────────────────────
export const SUPPLEMENTS_DB = [
  {
    id: 'creatina-monohidratada',
    image: '/assets/creatina.png',
    name: 'Creatina Monohidratada',
    category: 'Força & Performance',
    evidenceLevel: 'A',
    targets: { 'bulk': 1.0, 'strength': 1.0, 'cut': 0.8, 'endurance': 0.7, 'general': 0.6 },
    restrictions: [],
    dosage: { multiplier: 0.07, unit: 'g', maintenance: 5, upperLimit: 10, loading: 20, timing: 'Pós-treino ou a qualquer hora com carboidratos' },
    pricePerGram: 0.25, // R$/g
    safetyScore: 99,
    benefits: ['Aumento de força muscular', 'Melhora da performance em sprints', 'Aumento de volume celular', 'Aceleração da recuperação muscular'],
    warnings: ['Pode causar leve retenção de água intramuscular inicial', 'Beba pelo menos 3L de água por dia'],
    sideEffects: ['Desconforto gastrointestinal se consumido sem água suficiente'],
    interactions: []
  },
  {
    id: 'whey-protein',
    image: '/assets/whey_protein.png',
    name: 'Whey Protein',
    category: 'Proteínas',
    evidenceLevel: 'A',
    targets: { 'bulk': 1.0, 'strength': 0.9, 'cut': 0.9, 'endurance': 0.7, 'general': 0.8 },
    restrictions: ['lactose'], // Contém lactose
    dosage: { multiplier: 0.4, unit: 'g', maintenance: 30, upperLimit: 60, timing: 'Pós-treino ou como substituto de lanche' },
    pricePerGram: 0.15,
    safetyScore: 98,
    benefits: ['Apoio à síntese de proteína muscular', 'Aceleração da recuperação muscular', 'Altamente saciante para fases de queima de gordura'],
    warnings: ['Contém lactose e derivados de leite'],
    sideEffects: ['Gases ou estufamento em pessoas com leve intolerância à lactose'],
    interactions: []
  },
  {
    id: 'cafeina-teanina',
    image: '/assets/cafeina_teanina.png',
    name: 'Cafeína + L-Teanina',
    category: 'Energéticos & Foco',
    evidenceLevel: 'A',
    targets: { 'bulk': 0.6, 'strength': 0.9, 'cut': 1.0, 'endurance': 1.0, 'general': 0.5 },
    restrictions: [],
    dosage: { multiplier: 3, unit: 'mg', maintenance: 200, upperLimit: 400, timing: '30-45 minutos antes do treino' },
    pricePerGram: 0.005,
    safetyScore: 85,
    benefits: ['Foco e alerta mental sem a ansiedade da cafeína isolada', 'Sinergia comprovada: teanina suaviza os efeitos estimulantes da cafeína', 'Melhora de performance cognitiva e física pré-treino'],
    warnings: ['Evite consumir após as 18h para não prejudicar o sono', 'Não exceda a dose máxima de segurança'],
    sideEffects: ['Taquicardia', 'Ansiedade', 'Insônia se consumido tarde'],
    interactions: [
      { supplement: 'sinefrina', severity: 'HIGH', message: 'Associação pode elevar excessivamente a pressão arterial.' }
    ]
  },
  {
    id: 'vitamina-d3',
    image: '/assets/vitamina_d3_k2.png',
    name: 'Vitamina D3',
    category: 'Vitaminas & Minerais',
    evidenceLevel: 'A',
    targets: { 'bulk': 0.7, 'strength': 0.7, 'cut': 0.6, 'endurance': 0.6, 'general': 1.0 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 2000, unit: 'UI', upperLimit: 10000, timing: 'Com a maior refeição do dia (gorduras solúveis)' },
    pricePerGram: 0.0001,
    safetyScore: 95,
    benefits: ['Melhora na absorção de cálcio e saúde óssea', 'Suporte à síntese natural de testosterona', 'Fortalecimento da imunidade'],
    warnings: ['Faça exames periódicos de sangue para monitorar os níveis séricos'],
    sideEffects: ['Raríssima toxicidade se consumido em doses abusivas crônicas'],
    interactions: []
  },
  {
    id: 'omega-3',
    image: '/assets/omega_3.png',
    name: 'Ômega 3',
    category: 'Saúde Cardiovascular',
    evidenceLevel: 'A',
    targets: { 'bulk': 0.8, 'strength': 0.8, 'cut': 0.7, 'endurance': 0.7, 'general': 1.0 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 1000, unit: 'mg', upperLimit: 3000, timing: 'Com as principais refeições' },
    pricePerGram: 0.0005,
    safetyScore: 98,
    benefits: ['Poderosa ação anti-inflamatória sistêmica', 'Apoio à saúde do coração e cérebro', 'Redução do estresse oxidativo pós-treino'],
    warnings: ['Consuma com refeições gordurosas para otimizar a absorção'],
    sideEffects: ['Leve refluxo com retrogosto de peixe em algumas marcas'],
    interactions: []
  },
  {
    id: 'beta-alanina',
    image: '/assets/beta_alanina.png',
    name: 'Beta-Alanina',
    category: 'Força & Performance',
    evidenceLevel: 'A',
    targets: { 'bulk': 0.8, 'strength': 0.8, 'cut': 0.7, 'endurance': 1.0, 'general': 0.6 },
    restrictions: [],
    dosage: { multiplier: 0.05, unit: 'g', maintenance: 3.2, upperLimit: 6.4, timing: 'Fracionado ao longo do dia ou antes do treino' },
    pricePerGram: 0.20,
    safetyScore: 95,
    benefits: ['Aumento da carnosina muscular', 'Redução drástica da fadiga em treinos de alta intensidade', 'Aumento da capacidade de amortecimento de ácido lático'],
    warnings: ['Pode causar parestesia (formigamento inofensivo na pele). Divida a dose se incomodar.'],
    sideEffects: ['Parestesia temporária'],
    interactions: []
  },
  {
    id: 'l-carnitina',
    image: '/assets/l_carnitina.png',
    name: 'L-Carnitina Tartarato',
    category: 'Queima de Gordura & Recovery',
    evidenceLevel: 'B',
    targets: { 'bulk': 0.4, 'strength': 0.5, 'cut': 1.0, 'endurance': 0.8, 'general': 0.7 },
    restrictions: [],
    dosage: { multiplier: 0.02, unit: 'g', maintenance: 2.0, upperLimit: 4.0, timing: 'Pela manhã ou 30 minutos antes do treino com carboidratos' },
    pricePerGram: 0.22,
    safetyScore: 92,
    benefits: ['Acelera o transporte de ácidos graxos para as mitocôndrias', 'Apoio à queima de gorduras corporais', 'Melhora da oxigenação muscular durante o esforço'],
    warnings: ['Mais eficaz quando associada a uma refeição rica em carboidratos'],
    sideEffects: ['Pequenos desconfortos intestinais em doses mais elevadas'],
    interactions: []
  },
  {
    id: 'magnesio-bisglicinato',
    image: '/assets/magnesio_glicinato.png',
    name: 'Magnésio Bisglicinato',
    category: 'Vitaminas & Minerais',
    evidenceLevel: 'A',
    targets: { 'bulk': 0.7, 'strength': 0.8, 'cut': 0.7, 'endurance': 0.7, 'general': 1.0 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 350, unit: 'mg', upperLimit: 500, timing: '30-60 minutos antes de dormir' },
    pricePerGram: 0.001,
    safetyScore: 97,
    benefits: ['Melhora acentuada na qualidade do sono profundo', 'Relaxamento muscular e redução de cãibras', 'Regulação de mais de 300 reações enzimáticas fundamentais'],
    warnings: ['A versão em bisglicinato (quelato) é a de melhor absorção e menor impacto laxativo'],
    sideEffects: ['Leve sonolência matinal inicial se consumido muito tarde'],
    interactions: []
  },
  {
    id: 'vitamina-c',
    image: '/assets/vitamina_c.png',
    name: 'Vitamina C',
    category: 'Vitaminas & Minerais',
    evidenceLevel: 'A',
    targets: { 'bulk': 0.6, 'strength': 0.6, 'cut': 0.7, 'endurance': 0.7, 'general': 1.0 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 500, unit: 'mg', upperLimit: 2000, timing: 'Pela manhã com refeição' },
    pricePerGram: 0.0003,
    safetyScore: 98,
    benefits: ['Poderoso antioxidante protetor celular', 'Apoio essencial na síntese natural de colágeno', 'Melhora na absorção de ferro de origem vegetal'],
    warnings: ['Doses excessivas crônicas (acima de 2g) podem acelerar a formação de cálculos renais'],
    sideEffects: ['Desconforto gástrico leve em jejum se consumido na forma ácida pura'],
    interactions: []
  },
  {
    id: 'ashwagandha',
    image: '/assets/ashwagandha.png',
    name: 'Ashwagandha KSM-66',
    category: 'Adaptógenos & Foco',
    evidenceLevel: 'B',
    targets: { 'bulk': 0.8, 'strength': 0.8, 'cut': 0.7, 'endurance': 0.6, 'general': 1.0 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 600, unit: 'mg', upperLimit: 1000, timing: 'À noite com água ou refeição leve' },
    pricePerGram: 0.002,
    safetyScore: 90,
    benefits: ['Redução drástica nos níveis circulantes de cortisol (estresse)', 'Apoio na modulação natural de testosterona sérica', 'Aumento de foco e redução de ansiedade crônica'],
    warnings: ['Contraindicado para menores de 18 anos devido à falta de estudos em desenvolvimento hormonal.', 'Recomendável ciclar o consumo a cada 8-12 semanas de uso diário.'],
    sideEffects: ['Leve apatia emocional transitória em dosagens prolongadas descontroladas'],
    interactions: []
  },
  {
    id: 'alpha-gpc',
    image: '/assets/alpha_gpc.png',
    name: 'Alpha-GPC',
    category: 'Cognição & Neuroproteção',
    evidenceLevel: 'B',
    targets: { bulk: 0.7, strength: 0.8, cut: 0.6, endurance: 0.6, general: 0.8 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 300, upperLimit: 600, unit: 'mg', timing: '30-60 min antes do treino ou pela manhã' },
    pricePerGram: 0.8,
    safetyScore: 88,
    benefits: ['Aumento da síntese de acetilcolina cerebral', 'Melhora do foco e memória de trabalho', 'Potencializa força muscular aguda via eixo neuromuscular'],
    warnings: ['Evite à noite — pode causar insônia'],
    sideEffects: ['Dor de cabeça leve em doses iniciais'],
    interactions: []
  },
  {
    id: 'apigenina',
    image: '/assets/apigenina.png',
    name: 'Apigenina',
    category: 'Saúde Hormonal',
    evidenceLevel: 'C',
    targets: { bulk: 0.5, strength: 0.5, cut: 0.6, endurance: 0.4, general: 0.7 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 50, upperLimit: 120, unit: 'mg', timing: '30-60 min antes de dormir' },
    pricePerGram: 2.0,
    safetyScore: 85,
    benefits: ['Inibidor natural da aromatase (bloqueia conversão de testosterona em estrogênio)', 'Melhora da qualidade do sono', 'Ação ansiolítica suave'],
    warnings: ['Gestantes devem evitar — atividade estrogênica em doses altas'],
    sideEffects: ['Sonolência diurna se tomado fora do horário recomendado'],
    interactions: []
  },
  {
    id: 'bacopa-monnieri',
    image: '/assets/bacopa_monnieri.png',
    name: 'Bacopa Monnieri',
    category: 'Cognição & Neuroproteção',
    evidenceLevel: 'B',
    targets: { bulk: 0.4, strength: 0.4, cut: 0.5, endurance: 0.4, general: 0.8 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 300, upperLimit: 600, unit: 'mg', timing: 'Com refeição — efeitos acumulam em 4-6 semanas de uso contínuo' },
    pricePerGram: 0.15,
    safetyScore: 88,
    benefits: ['Melhora de memória e consolidação de aprendizado', 'Redução de ansiedade crônica', 'Neuroproteção por ação antioxidante (bacosídeos)'],
    warnings: ['Efeitos cognitivos demoram semanas para aparecer — seja consistente', 'Tome sempre com alimentos para evitar náusea'],
    sideEffects: ['Náusea leve se consumido com estômago vazio', 'Sonolência inicial nas primeiras semanas'],
    interactions: []
  },
  {
    id: 'berberina',
    image: '/assets/berberina.png',
    name: 'Berberina',
    category: 'Queima de Gordura & Recovery',
    evidenceLevel: 'B',
    targets: { bulk: 0.3, strength: 0.4, cut: 0.9, endurance: 0.5, general: 0.8 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 500, upperLimit: 1500, unit: 'mg', timing: 'Antes das principais refeições (fracionado 2-3x/dia)' },
    pricePerGram: 0.25,
    safetyScore: 82,
    benefits: ['Potente sensibilizador de insulina (ação similar à metformina)', 'Redução de glicemia pós-prandial', 'Apoio à perda de gordura visceral'],
    warnings: ['Interação com medicamentos para diabetes — consulte médico', 'Não use por mais de 8 semanas contínuas sem pausa'],
    sideEffects: ['Desconforto gastrointestinal (gases, constipação) no início'],
    interactions: [{ supplement: 'metformina', severity: 'HIGH', message: 'Potencialização de efeito hipoglicêmico — use com supervisão médica.' }]
  },
  {
    id: 'boro',
    image: '/assets/boro.png',
    name: 'Boro',
    category: 'Saúde Hormonal',
    evidenceLevel: 'C',
    targets: { bulk: 0.6, strength: 0.7, cut: 0.5, endurance: 0.5, general: 0.7 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 3, upperLimit: 10, unit: 'mg', timing: 'Com refeição, pela manhã' },
    pricePerGram: 1.5,
    safetyScore: 90,
    benefits: ['Aumento dos níveis livres de testosterona', 'Redução de SHBG (globulina ligadora de hormônios sexuais)', 'Suporte à saúde óssea e articular'],
    warnings: ['Não exceda 10mg/dia — toxicidade documentada acima de 20mg'],
    sideEffects: ['Incomum em doses terapêuticas'],
    interactions: []
  },
  {
    id: 'calcio-citrato-d3',
    image: '/assets/calcio_citrato_d3.png',
    name: 'Cálcio Citrato + D3',
    category: 'Vitaminas & Minerais',
    evidenceLevel: 'A',
    targets: { bulk: 0.6, strength: 0.6, cut: 0.5, endurance: 0.5, general: 0.9 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 500, upperLimit: 1000, unit: 'mg', timing: 'Com refeição — fracionado, máximo 500mg por dose' },
    pricePerGram: 0.003,
    safetyScore: 95,
    benefits: ['Formação e manutenção da massa óssea', 'Contração muscular e transmissão nervosa', 'Citrato tem melhor absorção que carbonato — sem precisar de ácido gástrico'],
    warnings: ['Fraccione em doses de máximo 500mg — absorção intestinal limitada por dose', 'Excesso crônico aumenta risco de cálculos renais'],
    sideEffects: ['Constipação leve em algumas pessoas'],
    interactions: []
  },
  {
    id: 'catuaba',
    image: '/assets/catuaba.png',
    name: 'Catuaba',
    category: 'Saúde Hormonal',
    evidenceLevel: 'C',
    targets: { bulk: 0.5, strength: 0.5, cut: 0.4, endurance: 0.5, general: 0.7 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 500, upperLimit: 1000, unit: 'mg', timing: 'Pela manhã ou 60 min antes de atividade física' },
    pricePerGram: 0.06,
    safetyScore: 85,
    benefits: ['Estímulo à libido e função sexual', 'Efeito energizante adaptogênico suave', 'Patrimônio da fitoterapia brasileira com uso tradicional consolidado'],
    warnings: ['Dados clínicos humanos ainda limitados — uso baseado em tradição e estudos pré-clínicos'],
    sideEffects: ['Estimulação leve — evite à noite'],
    interactions: []
  },
  {
    id: 'cha-verde',
    image: '/assets/cha_verde.png',
    name: 'Chá Verde (EGCG)',
    category: 'Queima de Gordura & Recovery',
    evidenceLevel: 'B',
    targets: { bulk: 0.4, strength: 0.5, cut: 0.9, endurance: 0.6, general: 0.7 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 400, upperLimit: 800, unit: 'mg', timing: '30 min antes do treino ou com refeições (forma extrato EGCG)' },
    pricePerGram: 0.05,
    safetyScore: 88,
    benefits: ['Aumento da oxidação de gordura durante exercício', 'Potente ação antioxidante por polifenóis EGCG', 'Suporte à saúde cardiovascular e metabólica'],
    warnings: ['Não exceda 800mg/dia de extrato — risco de estresse hepático em doses altas', 'Contém cafeína natural — atenção em sensíveis'],
    sideEffects: ['Náusea se consumido com estômago vazio'],
    interactions: [{ supplement: 'cafeina-teanina', severity: 'LOW', message: 'Soma de cafeína pode ultrapassar limite seguro diário.' }]
  },
  {
    id: 'coenzima-q10',
    image: '/assets/coenzima_q10.png',
    name: 'Coenzima Q10',
    category: 'Saúde Cardiovascular',
    evidenceLevel: 'B',
    targets: { bulk: 0.6, strength: 0.6, cut: 0.5, endurance: 0.8, general: 0.9 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 100, upperLimit: 300, unit: 'mg', timing: 'Com refeição rica em gorduras (lipossolúvel)' },
    pricePerGram: 2.0,
    safetyScore: 95,
    benefits: ['Cofator essencial na produção de ATP mitocondrial', 'Potente antioxidante lipofílico', 'Suporte cardíaco — especialmente para usuários de estatinas'],
    warnings: ['Essencial para usuários de estatinas — estas reduzem a síntese endógena de CoQ10', 'Prefira forma Ubiquinol (mais biodisponível que Ubiquinona)'],
    sideEffects: ['Leve desconforto GI ocasional'],
    interactions: []
  },
  {
    id: 'colageno',
    image: '/assets/colageno.png',
    name: 'Colágeno Hidrolisado',
    category: 'Saúde Articular & Pele',
    evidenceLevel: 'B',
    targets: { bulk: 0.5, strength: 0.5, cut: 0.6, endurance: 0.6, general: 0.8 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 10000, upperLimit: 15000, unit: 'mg', timing: '30-60 min antes do treino ou pela manhã com vitamina C' },
    pricePerGram: 0.05,
    safetyScore: 97,
    benefits: ['Síntese e reparo de cartilagem, tendões e ligamentos', 'Melhora na elasticidade e hidratação da pele', 'Redução de dores articulares em atletas de alta intensidade'],
    warnings: ['Combine com vitamina C para maximizar síntese de colágeno endógeno', 'Prefira colágeno hidrolisado tipo I e III'],
    sideEffects: ['Sabor forte em alguns produtos — use versão inodora/insípida'],
    interactions: []
  },
  {
    id: 'cranberry',
    image: '/assets/cranberry.png',
    name: 'Cranberry',
    category: 'Saúde Intestinal',
    evidenceLevel: 'B',
    targets: { bulk: 0.2, strength: 0.2, cut: 0.3, endurance: 0.3, general: 0.7 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 400, upperLimit: 1200, unit: 'mg', timing: 'Com água, preferencialmente com refeição' },
    pricePerGram: 0.1,
    safetyScore: 95,
    benefits: ['Prevenção de infecções do trato urinário (ITU)', 'Inibição da adesão de bactérias ao epitélio urinário', 'Ação antioxidante por proantocianidinas (PACs)'],
    warnings: ['Não substitui antibioticoterapia em infecções ativas'],
    sideEffects: ['Pode aumentar levemente a excreção de oxalato — cautela em predispostos a cálculos renais'],
    interactions: []
  },
  {
    id: 'cromo-picolinato',
    image: '/assets/cromo_picolinato.png',
    name: 'Cromo Picolinato',
    category: 'Queima de Gordura & Recovery',
    evidenceLevel: 'C',
    targets: { bulk: 0.4, strength: 0.5, cut: 0.8, endurance: 0.5, general: 0.7 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 200, upperLimit: 400, unit: 'mcg', timing: 'Com refeição principal do dia' },
    pricePerGram: 5.0,
    safetyScore: 88,
    benefits: ['Potencialização da sinalização de insulina', 'Redução do desejo por carboidratos e açúcar', 'Melhora da composição corporal em conjunto com dieta hipocalórica'],
    warnings: ['Evidências mistas — mais eficaz em pessoas com resistência à insulina'],
    sideEffects: ['Raro: náusea ocasional em doses mais altas'],
    interactions: []
  },
  {
    id: 'curcumina',
    image: '/assets/curcumina.png',
    name: 'Curcumina',
    category: 'Antioxidantes & Anti-inflamatórios',
    evidenceLevel: 'B',
    targets: { bulk: 0.6, strength: 0.6, cut: 0.6, endurance: 0.7, general: 0.9 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 500, upperLimit: 1500, unit: 'mg', timing: 'Com refeição gordurosa — combine com piperina para absorção' },
    pricePerGram: 0.3,
    safetyScore: 92,
    benefits: ['Potente anti-inflamatório sistêmico (inibidor de NF-kB)', 'Aceleração da recuperação muscular pós-treino', 'Proteção articular e neuroproteção'],
    warnings: ['Biodisponibilidade muito baixa sem adjuvante — use com piperina (BioPerine) ou forma lipossomal'],
    sideEffects: ['Desconforto GI em doses altas sem alimento'],
    interactions: []
  },
  {
    id: 'eaa',
    image: '/assets/eaa.png',
    name: 'EAA (Aminoácidos Essenciais)',
    category: 'Proteínas',
    evidenceLevel: 'A',
    targets: { bulk: 0.9, strength: 0.8, cut: 0.8, endurance: 0.7, general: 0.7 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 10000, upperLimit: 20000, unit: 'mg', timing: 'Durante ou imediatamente pós-treino' },
    pricePerGram: 0.12,
    safetyScore: 97,
    benefits: ['Estimulação máxima da síntese proteica muscular', 'Prevenção do catabolismo muscular em treinos longos', 'Superior ao BCAA: contém todos os 9 aminoácidos essenciais'],
    warnings: ['Prefira EAA a BCAA — EAA contém os 9 AA essenciais completos; BCAA contém apenas 3'],
    sideEffects: ['Desconforto GI em doses muito elevadas'],
    interactions: []
  },
  {
    id: 'ecdisterona',
    image: '/assets/ecdisterona.png',
    name: 'Ecdisterona',
    category: 'Força & Performance',
    evidenceLevel: 'C',
    targets: { bulk: 0.8, strength: 0.9, cut: 0.6, endurance: 0.6, general: 0.6 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 500, upperLimit: 1000, unit: 'mg', timing: 'Com refeição — pré ou pós-treino' },
    pricePerGram: 1.5,
    safetyScore: 88,
    benefits: ['Ação anabolizante via receptor de estrogênio beta sem efeitos androgênicos', 'Aumento de força e síntese proteica em estudos preliminares', 'Anabólico natural de origem vegetal (espinafre, quinoa)'],
    warnings: ['Evidências ainda preliminares em humanos — pesquisa em andamento', 'Produtos no mercado frequentemente subdosados — verifique a padronização'],
    sideEffects: ['Muito bem tolerada — sem efeitos androgênicos conhecidos'],
    interactions: []
  },
  {
    id: 'feno-grego',
    image: '/assets/feno_grego.png',
    name: 'Feno-Grego',
    category: 'Saúde Hormonal',
    evidenceLevel: 'C',
    targets: { bulk: 0.7, strength: 0.7, cut: 0.6, endurance: 0.5, general: 0.7 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 600, upperLimit: 1200, unit: 'mg', timing: 'Com refeição, pela manhã' },
    pricePerGram: 0.04,
    safetyScore: 87,
    benefits: ['Suporte à testosterona livre (inibição de aromatase e 5-alfa-redutase)', 'Melhora da sensibilidade à insulina', 'Redução de inflamação sistêmica'],
    warnings: ['Odor corporal característico (maple syrup) é efeito comum e normal', 'Gestantes devem evitar — pode estimular contrações uterinas'],
    sideEffects: ['Odor corporal de maple syrup', 'Leve desconforto GI inicial'],
    interactions: []
  },
  {
    id: 'ferro-bisglicinato',
    image: '/assets/ferro_bisglicinato.png',
    name: 'Ferro Bisglicinato',
    category: 'Vitaminas & Minerais',
    evidenceLevel: 'A',
    targets: { bulk: 0.5, strength: 0.6, cut: 0.5, endurance: 0.8, general: 0.8 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 30, upperLimit: 60, unit: 'mg', timing: 'Longe de café, chá e laticínios — idealmente com vitamina C' },
    pricePerGram: 0.2,
    safetyScore: 88,
    benefits: ['Formação de hemoglobina e transporte de oxigênio', 'Prevenção e tratamento de anemia ferropriva', 'Bisglicinato tem 4x menos efeito laxativo que sulfato ferroso'],
    warnings: ['Use apenas se exame de ferritina confirmar deficiência — excesso de ferro é tóxico', 'Afaste 2h de café, chá preto e laticínios — interferem na absorção'],
    sideEffects: ['Fezes escurecidas (normal e esperado)', 'Constipação leve'],
    interactions: []
  },
  {
    id: 'glicina',
    image: '/assets/glicina.png',
    name: 'Glicina',
    category: 'Sono & Recuperação',
    evidenceLevel: 'B',
    targets: { bulk: 0.6, strength: 0.6, cut: 0.5, endurance: 0.5, general: 0.8 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 3000, upperLimit: 5000, unit: 'mg', timing: '30-60 min antes de dormir' },
    pricePerGram: 0.02,
    safetyScore: 98,
    benefits: ['Melhora da qualidade do sono profundo (reduz temperatura corporal central)', 'Componente estrutural do colágeno e glutationa', 'Efeito ansiolítico suave sem sedação'],
    warnings: ['Aminoácido extremamente seguro — margem de segurança muito ampla'],
    sideEffects: ['Raro: leve sonolência diurna nas primeiras semanas'],
    interactions: []
  },
  {
    id: 'glucosamina-condroitina',
    image: '/assets/glucosamina_condroitina.png',
    name: 'Glucosamina + Condroitina',
    category: 'Saúde Articular & Pele',
    evidenceLevel: 'B',
    targets: { bulk: 0.4, strength: 0.5, cut: 0.4, endurance: 0.5, general: 0.7 },
    restrictions: ['shellfish'],
    dosage: { isFixed: true, maintenance: 1500, upperLimit: 3000, unit: 'mg', timing: 'Com refeição — efeitos levam 4-8 semanas para aparecer' },
    pricePerGram: 0.04,
    safetyScore: 90,
    benefits: ['Manutenção e regeneração da cartilagem articular', 'Redução de dor em osteoartrite leve a moderada', 'Suporte à viscosidade do líquido sinovial'],
    warnings: ['Efeitos são graduais — use por mínimo 3 meses para avaliar resposta', 'Glucosamina de origem marinha — cautela em alérgicos a frutos do mar'],
    sideEffects: ['Desconforto GI leve', 'Raro: reação alérgica em sensíveis a mariscos'],
    interactions: []
  },
  {
    id: 'hmb',
    image: '/assets/hmb.png',
    name: 'HMB',
    category: 'Força & Performance',
    evidenceLevel: 'B',
    targets: { bulk: 0.7, strength: 0.8, cut: 0.8, endurance: 0.6, general: 0.6 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 3000, upperLimit: 6000, unit: 'mg', timing: 'Distribuído ao longo do dia — incluindo pré e pós-treino' },
    pricePerGram: 0.5,
    safetyScore: 95,
    benefits: ['Redução do catabolismo muscular em treinos de alta carga', 'Acelera recuperação de lesões musculares', 'Preservação de massa magra em déficit calórico'],
    warnings: ['Mais eficaz em iniciantes e atletas em períodos de alta intensidade ou restrição calórica'],
    sideEffects: ['Praticamente nenhum efeito colateral reportado'],
    interactions: []
  },
  {
    id: 'inositol',
    image: '/assets/inositol.png',
    name: 'Inositol',
    category: 'Saúde Hormonal',
    evidenceLevel: 'B',
    targets: { bulk: 0.4, strength: 0.4, cut: 0.6, endurance: 0.4, general: 0.8 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 2000, upperLimit: 4000, unit: 'mg', timing: 'Pode ser dividido ao longo do dia' },
    pricePerGram: 0.02,
    safetyScore: 95,
    benefits: ['Melhora da resistência à insulina (especialmente em SOP)', 'Redução de ansiedade e sintomas de TOC em estudos', 'Regulação do ciclo hormonal feminino'],
    warnings: ['Gestantes devem consultar médico antes do uso'],
    sideEffects: ['Desconforto GI (gases, náusea) em doses acima de 12g'],
    interactions: []
  },
  {
    id: 'lions-mane',
    image: '/assets/lions_mane.png',
    name: "Lion's Mane (Juba de Leão)",
    category: 'Cognição & Neuroproteção',
    evidenceLevel: 'B',
    targets: { bulk: 0.4, strength: 0.4, cut: 0.4, endurance: 0.4, general: 0.9 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 500, upperLimit: 1000, unit: 'mg', timing: 'Pela manhã com refeição — efeitos cognitivos acumulam em semanas' },
    pricePerGram: 0.3,
    safetyScore: 92,
    benefits: ['Estimulação da producao de NGF (fator de crescimento nervoso)', 'Melhora de memória e cognição em estudos clínicos', 'Neuroproteção e potencial em prevenção neurodegenerativa'],
    warnings: ['Use extrato padronizado com >20% beta-glucanos', 'Efeitos cognitivos levam semanas para aparecer — seja consistente'],
    sideEffects: ['Muito bem tolerado — raro: desconforto GI'],
    interactions: []
  },
  {
    id: 'l-citrulina',
    image: '/assets/l_citrulina.png',
    name: 'L-Citrulina',
    category: 'Força & Performance',
    evidenceLevel: 'A',
    targets: { bulk: 0.8, strength: 0.9, cut: 0.7, endurance: 0.9, general: 0.6 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 6000, upperLimit: 8000, unit: 'mg', timing: '30-60 min antes do treino' },
    pricePerGram: 0.06,
    safetyScore: 96,
    benefits: ['Aumento de oxido nítrico e vasodilatação (pump muscular)', 'Redução de fadiga e aumento de repetições máximas', 'Superior à arginina em biodisponibilidade oral'],
    warnings: ['Use L-Citrulina pura — citrulina malato divide a dose com ácido málico'],
    sideEffects: ['Hipotensão leve em pessoas sensíveis'],
    interactions: []
  },
  {
    id: 'l-teanina',
    image: '/assets/l_teanina.png',
    name: 'L-Teanina',
    category: 'Cognição & Neuroproteção',
    evidenceLevel: 'A',
    targets: { bulk: 0.4, strength: 0.5, cut: 0.5, endurance: 0.5, general: 0.8 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 200, upperLimit: 400, unit: 'mg', timing: 'Pela manhã (sozinha ou com cafeína) ou antes de dormir' },
    pricePerGram: 0.25,
    safetyScore: 98,
    benefits: ['Relaxamento sem sedação — aumenta ondas alfa cerebrais', 'Sinergia comprovada com cafeína: foco sem ansiedade', 'Melhora da qualidade do sono em doses noturnas'],
    warnings: ['Pode potencializar efeitos sedativos — atenção ao combinar com ansiolíticos'],
    sideEffects: ['Sedação leve em doses altas'],
    interactions: []
  },
  {
    id: 'magnesio-treonato',
    image: '/assets/magnesio_treonato.png',
    name: 'Magnésio Treonato',
    category: 'Cognição & Neuroproteção',
    evidenceLevel: 'B',
    targets: { bulk: 0.5, strength: 0.6, cut: 0.5, endurance: 0.5, general: 0.9 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 144, upperLimit: 288, unit: 'mg', timing: '1-2h antes de dormir' },
    pricePerGram: 0.5,
    safetyScore: 95,
    benefits: ['Única forma de magnésio que atravessa eficientemente a barreira hematoencefálica', 'Melhora da plasticidade sináptica e cognição', 'Aprimoramento da qualidade do sono profundo'],
    warnings: ['Dose referida em mg de magnésio elementar — verifique o rótulo', 'Mais caro que outras formas — justificado pelo efeito cognitivo específico'],
    sideEffects: ['Sonolência — tome apenas à noite'],
    interactions: []
  },
  {
    id: 'marapuama',
    image: '/assets/marapuama.png',
    name: 'Marapuama',
    category: 'Saúde Hormonal',
    evidenceLevel: 'C',
    targets: { bulk: 0.5, strength: 0.5, cut: 0.4, endurance: 0.5, general: 0.7 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 1000, upperLimit: 2000, unit: 'mg', timing: 'Pela manhã ou antes de atividade física' },
    pricePerGram: 0.05,
    safetyScore: 84,
    benefits: ['Tonico sexual e afrodisiaco da medicina tradicional amazônica', 'Efeito adaptogênico para fadiga física e mental', 'Potencial neuroprotetor em estudos preliminares'],
    warnings: ['Base de evidências ainda limitada a estudos observacionais e animais'],
    sideEffects: ['Estimulação leve — evite à noite'],
    interactions: []
  },
  {
    id: 'melatonina',
    image: '/assets/melatonina.png',
    name: 'Melatonina',
    category: 'Sono & Recuperação',
    evidenceLevel: 'A',
    targets: { bulk: 0.6, strength: 0.5, cut: 0.5, endurance: 0.5, general: 0.8 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 0.5, upperLimit: 5, unit: 'mg', timing: '30-60 min antes de dormir no escuro total' },
    pricePerGram: 0.5,
    safetyScore: 92,
    benefits: ['Sincronização do ritmo circadiano', 'Redução do tempo para adormecer', 'Potente antioxidante mitocondrial em doses altas'],
    warnings: ['Menos e mais — 0.5-1mg são frequentemente mais eficazes que 5-10mg', 'Não use cronicamente sem necessidade — pode reduzir produção endógena'],
    sideEffects: ['Sonolência residual matinal se consumida tardiamente', 'Sonhos vívidos em algumas pessoas'],
    interactions: []
  },
  {
    id: 'mucuna-pruriens',
    image: '/assets/mucuna_pruriens.png',
    name: 'Mucuna Pruriens',
    category: 'Saúde Hormonal',
    evidenceLevel: 'C',
    targets: { bulk: 0.7, strength: 0.7, cut: 0.5, endurance: 0.5, general: 0.8 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 500, upperLimit: 1000, unit: 'mg', timing: 'Pela manhã com estômago vazio para máxima absorção de L-DOPA' },
    pricePerGram: 0.08,
    safetyScore: 82,
    benefits: ['Fonte natural de L-DOPA (precursor de dopamina)', 'Apoio aos níveis de testosterona e hormônio do crescimento', 'Melhora do humor e motivação'],
    warnings: ['Contraindicada com medicamentos para Parkinson (MAOIs) — interação grave', 'Use extrato padronizado em L-DOPA (15-20%)'],
    sideEffects: ['Náusea se tomada sem alimento em doses altas', 'Insônia se tomada à noite'],
    interactions: [{ supplement: 'maois', severity: 'HIGH', message: 'Interação grave com inibidores de MAO — contraindicado.' }]
  },
  {
    id: 'myco-defense-extra',
    image: '/assets/myco_defense_extra.png',
    name: 'Myco Defense Extra',
    category: 'Antioxidantes & Anti-inflamatórios',
    evidenceLevel: 'B',
    targets: { bulk: 0.5, strength: 0.5, cut: 0.4, endurance: 0.5, general: 0.9 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 500, upperLimit: 1000, unit: 'mg', timing: 'Pela manhã com refeição' },
    pricePerGram: 0.5,
    safetyScore: 90,
    benefits: ['Blend de cogumelos medicinais (Reishi, Chaga, Shiitake)', 'Imunomodulação por beta-glucanos', 'Suporte adaptogênico ao estresse e energia celular'],
    warnings: ['Verifique padronização em beta-glucanos (>30%) no produto'],
    sideEffects: ['Raramente: leve desconforto GI'],
    interactions: []
  },
  {
    id: 'nac',
    image: '/assets/nac.png',
    name: 'NAC (N-Acetil-Cisteína)',
    category: 'Antioxidantes & Anti-inflamatórios',
    evidenceLevel: 'B',
    targets: { bulk: 0.5, strength: 0.5, cut: 0.6, endurance: 0.6, general: 0.9 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 600, upperLimit: 1800, unit: 'mg', timing: 'Com refeição — longe do pré-treino imediato' },
    pricePerGram: 0.08,
    safetyScore: 90,
    benefits: ['Precursor de glutationa (principal antioxidante intracelular)', 'Proteção hepática e suporte à detoxificação', 'Suporte respiratório e imunológico'],
    warnings: ['Evite no pré-treino imediato — antioxidantes em excesso podem atenuar adaptações ao treinamento', 'Doses acima de 1800mg podem causar desconforto GI significativo'],
    sideEffects: ['Odor de enxofre na urina (normal)', 'Náusea em doses altas'],
    interactions: []
  },
  {
    id: 'oleo-de-primula',
    image: '/assets/oleo_de_primula.png',
    name: 'Óleo de Prímula',
    category: 'Saúde Hormonal',
    evidenceLevel: 'C',
    targets: { bulk: 0.3, strength: 0.3, cut: 0.4, endurance: 0.3, general: 0.7 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 1000, upperLimit: 3000, unit: 'mg', timing: 'Com refeição gordurosa' },
    pricePerGram: 0.05,
    safetyScore: 88,
    benefits: ['Rico em GLA (ácido gama-linolênico) — precursor de prostaglandinas anti-inflamatórias', 'Suporte ao equilíbrio hormonal feminino (TPM, menopausa)', 'Melhora da pele, cabelo e unhas'],
    warnings: ['Pode aumentar risco de sangramento em doses altas — cautela pré-cirurgia'],
    sideEffects: ['Leve refluxo ou náusea', 'Fezes amolecidas em doses altas'],
    interactions: []
  },
  {
    id: 'panax-ginseng',
    image: '/assets/panax_ginseng.png',
    name: 'Panax Ginseng',
    category: 'Adaptógenos & Foco',
    evidenceLevel: 'B',
    targets: { bulk: 0.7, strength: 0.7, cut: 0.6, endurance: 0.8, general: 0.9 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 400, upperLimit: 800, unit: 'mg', timing: 'Pela manhã — cicle 8 semanas on / 4 semanas off' },
    pricePerGram: 0.2,
    safetyScore: 87,
    benefits: ['Redução da fadiga física e mental (ginsenosídeos)', 'Modulação do eixo HPA (resposta ao estresse)', 'Suporte à função erétil e libido masculina'],
    warnings: ['Cicle o uso — tolerância desenvolve em uso contínuo acima de 3 meses', 'Evite à noite — pode causar insônia em sensíveis'],
    sideEffects: ['Insônia', 'Dor de cabeça em doses altas', 'Elevação de pressão em predispostos'],
    interactions: []
  },
  {
    id: 'probiotico',
    image: '/assets/probiotico.png',
    name: 'Probiótico',
    category: 'Saúde Intestinal',
    evidenceLevel: 'B',
    targets: { bulk: 0.5, strength: 0.5, cut: 0.6, endurance: 0.5, general: 0.9 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 10, upperLimit: 50, unit: 'bi UFC', timing: 'Em jejum ou 30 min antes do café da manhã' },
    pricePerGram: 5.0,
    safetyScore: 95,
    benefits: ['Modulação da microbiota intestinal', 'Fortalecimento da barreira e imunidade intestinal', 'Melhora da absorção de nutrientes e saúde metabólica'],
    warnings: ['Prefira produtos com múltiplas cepas e contagem de 10 bilhões UFC ou mais', 'Armazene conforme instrução — muitos requerem refrigeração'],
    sideEffects: ['Gases e distensão leve nas primeiras semanas (adaptação normal)'],
    interactions: []
  },
  {
    id: 'psyllium',
    image: '/assets/psyllium.png',
    name: 'Psyllium',
    category: 'Saúde Intestinal',
    evidenceLevel: 'A',
    targets: { bulk: 0.3, strength: 0.3, cut: 0.6, endurance: 0.3, general: 0.8 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 5000, upperLimit: 15000, unit: 'mg', timing: '30 min antes das refeições principais com bastante água (300ml ou mais)' },
    pricePerGram: 0.01,
    safetyScore: 97,
    benefits: ['Fibra solúvel que reduz glicemia pós-prandial', 'Controle de colesterol LDL', 'Regulação do trânsito intestinal (constipação e diarreias funcionais)'],
    warnings: ['SEMPRE consuma com muita água — risco de obstrução esofágica se engolido seco', 'Tome separado de medicamentos — pode reduzir a absorção de fármacos'],
    sideEffects: ['Gases e distensão nas primeiras semanas', 'Obstrução digestiva se consumido sem água suficiente'],
    interactions: []
  },
  {
    id: 'quercetina',
    image: '/assets/quercetina.png',
    name: 'Quercetina',
    category: 'Antioxidantes & Anti-inflamatórios',
    evidenceLevel: 'B',
    targets: { bulk: 0.5, strength: 0.5, cut: 0.5, endurance: 0.7, general: 0.9 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 500, upperLimit: 1000, unit: 'mg', timing: 'Com refeição e vitamina C (aumenta biodisponibilidade)' },
    pricePerGram: 0.3,
    safetyScore: 92,
    benefits: ['Potente antioxidante e anti-inflamatório (inibidor de histamina e mastócitos)', 'Redução de inflamação pós-exercício', 'Suporte imunológico e ação antiviral'],
    warnings: ['Combine com vitamina C ou bromelaína para maximizar absorção'],
    sideEffects: ['Raro: dor de cabeça, formigamento em doses altas'],
    interactions: []
  },
  {
    id: 'resveratrol',
    image: '/assets/resveratrol.png',
    name: 'Resveratrol',
    category: 'Antioxidantes & Anti-inflamatórios',
    evidenceLevel: 'C',
    targets: { bulk: 0.4, strength: 0.4, cut: 0.5, endurance: 0.5, general: 0.9 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 250, upperLimit: 500, unit: 'mg', timing: 'Com refeição' },
    pricePerGram: 1.0,
    safetyScore: 90,
    benefits: ['Ativação de sirtuínas (vias de longevidade celular)', 'Potente antioxidante e cardioprotetor', 'Mimetismo de restrição calórica em estudos animais'],
    warnings: ['Efeitos em humanos ainda menos robustos que em modelos animais', 'Use trans-resveratrol (forma biologicamente ativa)'],
    sideEffects: ['Raros em doses terapêuticas'],
    interactions: []
  },
  {
    id: 'rhodiola-rosea',
    image: '/assets/rhodiola_rosea.png',
    name: 'Rhodiola Rosea',
    category: 'Adaptógenos & Foco',
    evidenceLevel: 'B',
    targets: { bulk: 0.6, strength: 0.6, cut: 0.7, endurance: 0.8, general: 0.8 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 400, upperLimit: 600, unit: 'mg', timing: 'Pela manhã em jejum — 30 min antes do café' },
    pricePerGram: 0.25,
    safetyScore: 90,
    benefits: ['Redução de fadiga física e mental (rosavinas e salidrosida)', 'Melhora de performance em exercícios de resistência', 'Modulação do cortisol em situações de estresse agudo'],
    warnings: ['Tome em jejum para melhor absorção', 'Cicle 4-6 semanas on / 2 semanas off para manter eficácia'],
    sideEffects: ['Insônia se tomada à tarde ou à noite', 'Leve agitação nas primeiras semanas'],
    interactions: []
  },
  {
    id: 'saw-palmetto',
    image: '/assets/saw_palmetto.png',
    name: 'Saw Palmetto',
    category: 'Saúde Hormonal',
    evidenceLevel: 'B',
    targets: { bulk: 0.3, strength: 0.3, cut: 0.3, endurance: 0.3, general: 0.7 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 320, upperLimit: 640, unit: 'mg', timing: 'Com refeição principal do dia' },
    pricePerGram: 0.3,
    safetyScore: 90,
    benefits: ['Inibição da 5-alfa-redutase (conversão de testosterona em DHT)', 'Alívio de sintomas de HPB (hiperplasia prostática benigna)', 'Potencial proteção contra queda de cabelo androgenética'],
    warnings: ['Gestantes e mulheres que tentam engravidar devem evitar — atividade hormonal'],
    sideEffects: ['Leve desconforto GI', 'Raro: disfunção erétil reversível em doses altas'],
    interactions: []
  },
  {
    id: 'shatavari',
    image: '/assets/shatavari.png',
    name: 'Shatavari',
    category: 'Saúde Hormonal',
    evidenceLevel: 'C',
    targets: { bulk: 0.4, strength: 0.4, cut: 0.4, endurance: 0.4, general: 0.8 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 500, upperLimit: 1000, unit: 'mg', timing: 'Com refeição, 1-2x ao dia' },
    pricePerGram: 0.1,
    safetyScore: 88,
    benefits: ['Tonico reprodutivo feminino da medicina Ayurvedica', 'Modulação do sistema hormonal feminino (fase lútea)', 'Efeito adaptogênico geral e suporte imunológico'],
    warnings: ['Dados clínicos em humanos ainda limitados', 'Consulte médico se em uso de medicamentos hormonais'],
    sideEffects: ['Bem tolerada — raro: reação alérgica em sensíveis'],
    interactions: []
  },
  {
    id: 'spirulina',
    image: '/assets/spirulina.png',
    name: 'Spirulina',
    category: 'Antioxidantes & Anti-inflamatórios',
    evidenceLevel: 'B',
    targets: { bulk: 0.6, strength: 0.6, cut: 0.6, endurance: 0.7, general: 0.9 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 3000, upperLimit: 10000, unit: 'mg', timing: 'Com refeição ou batido pré-treino' },
    pricePerGram: 0.04,
    safetyScore: 92,
    benefits: ['Fonte densa de proteína vegetal (60-70% do peso seco)', 'Alto teor de ficocianina — potente antioxidante azul', 'Suporte de ferro e vitaminas do complexo B'],
    warnings: ['Contaminação por microcistinas em produtos de baixa qualidade — compre de fontes certificadas', 'Não e substituta de B12 para veganos — biodisponibilidade controversa'],
    sideEffects: ['Odor forte característico', 'Leve desconforto GI inicial'],
    interactions: []
  },
  {
    id: 'taurina',
    image: '/assets/taurina.png',
    name: 'Taurina',
    category: 'Saúde Cardiovascular',
    evidenceLevel: 'B',
    targets: { bulk: 0.6, strength: 0.7, cut: 0.6, endurance: 0.8, general: 0.7 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 1000, upperLimit: 3000, unit: 'mg', timing: '30-60 min antes do treino ou com refeição' },
    pricePerGram: 0.02,
    safetyScore: 97,
    benefits: ['Melhora da resistência muscular e redução de cãibras', 'Suporte à saúde cardiovascular e regulação da pressão arterial', 'Proteção osmótica celular em esforços intensos'],
    warnings: ['Muito bem tolerada em doses terapêuticas — excelente relação custo-benefício'],
    sideEffects: ['Praticamente nenhum em doses recomendadas'],
    interactions: []
  },
  {
    id: 'tirosina',
    image: '/assets/tirosina.png',
    name: 'Tirosina',
    category: 'Energéticos & Foco',
    evidenceLevel: 'B',
    targets: { bulk: 0.5, strength: 0.6, cut: 0.6, endurance: 0.7, general: 0.7 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 500, upperLimit: 2000, unit: 'mg', timing: '30-60 min antes do treino ou situações de alto estresse cognitivo' },
    pricePerGram: 0.05,
    safetyScore: 93,
    benefits: ['Precursor de dopamina, adrenalina e noradrenalina', 'Manutenção do foco cognitivo em estresse ou privação de sono', 'Redução do depletion de catecolaminas em exercícios prolongados'],
    warnings: ['Evite em uso de MAOIs ou medicamentos para tireoide — interação potencial', 'Eficácia maior em pessoas sob estresse — efeito menor em condições normais'],
    sideEffects: ['Raro: náusea, dor de cabeça em doses altas'],
    interactions: []
  },
  {
    id: 'tongkat-ali',
    image: '/assets/tongkat_ali.png',
    name: 'Tongkat Ali',
    category: 'Saúde Hormonal',
    evidenceLevel: 'B',
    targets: { bulk: 0.8, strength: 0.8, cut: 0.6, endurance: 0.7, general: 0.8 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 200, upperLimit: 400, unit: 'mg', timing: 'Pela manhã em jejum — use extrato 200:1' },
    pricePerGram: 2.0,
    safetyScore: 85,
    benefits: ['Aumento de testosterona livre via redução de SHBG', 'Melhora de libido, humor e composição corporal', 'Adaptogênico para estresse e fadiga crônica'],
    warnings: ['Use extrato padronizado 200:1 (Eurycomanone 1% ou mais)', 'Cicle 5 dias on / 2 dias off para preservar eficácia'],
    sideEffects: ['Insônia se tomado à tarde', 'Leve elevação de temperatura corporal'],
    interactions: []
  },
  {
    id: 'valeriana',
    image: '/assets/valeriana.png',
    name: 'Valeriana',
    category: 'Sono & Recuperação',
    evidenceLevel: 'B',
    targets: { bulk: 0.3, strength: 0.3, cut: 0.3, endurance: 0.3, general: 0.7 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 300, upperLimit: 600, unit: 'mg', timing: '30-60 min antes de dormir' },
    pricePerGram: 0.04,
    safetyScore: 88,
    benefits: ['Redução da latência do sono (tempo para adormecer)', 'Efeito ansiolítico suave por modulação GABAérgica', 'Melhora da qualidade geral do sono sem dependência química'],
    warnings: ['Efeitos acumulam com uso regular de 2-4 semanas', 'Não combine com benzodiazepínicos ou álcool'],
    sideEffects: ['Sonolência diurna leve nas primeiras semanas', 'Sonhos vívidos'],
    interactions: [{ supplement: 'benzodiazepinicos', severity: 'MEDIUM', message: 'Potencialização de efeito sedativo — evite combinação.' }]
  },
  {
    id: 'zinco-bisglicinato',
    image: '/assets/zinco_bisglicinato.png',
    name: 'Zinco Bisglicinato',
    category: 'Vitaminas & Minerais',
    evidenceLevel: 'A',
    targets: { bulk: 0.7, strength: 0.8, cut: 0.6, endurance: 0.6, general: 0.9 },
    restrictions: [],
    dosage: { isFixed: true, maintenance: 15, upperLimit: 40, unit: 'mg', timing: 'Longe de ferro e cálcio — à noite ou entre refeições' },
    pricePerGram: 0.5,
    safetyScore: 92,
    benefits: ['Cofator em mais de 300 enzimas do metabolismo', 'Suporte à síntese de testosterona e função reprodutiva', 'Essencial para imunidade, cicatrização e saúde da pele'],
    warnings: ['Suplementação crônica acima de 40mg pode causar deficiência de cobre — monitore', 'Afaste de ferro e cálcio — competem pela absorção intestinal'],
    sideEffects: ['Náusea se consumido com estômago vazio'],
    interactions: []
  },
];

// ─── StackRecommender Class ──────────────────────────────────────────────────
export class StackRecommender {
  /**
   * Generates a personalized supplement recommendation list.
   *
   * @param {Object} userProfile - User biometric and preference parameters
   * @param {number} [topN=8] - Maximum number of recommended items
   * @returns {Array<Object>} Sorted list of recommended supplements
   * @throws {TypeError|RangeError|Error} If userProfile validation fails
   */
  recommend(userProfile, topN = 8) {
    // PATCH 1: Validate input strictly
    validateUserProfile(userProfile);

    // Sanitize and apply defaults
    const profile = sanitizeUserProfile(userProfile);

    // Validate and clamp topN parameter
    if (typeof topN !== 'number' || isNaN(topN)) {
      topN = 8; // Safe fallback for invalid types
    } else {
      topN = Math.max(1, Math.min(50, Math.floor(topN))); // Clamp to [1, 50]
    }

    const results = [];
    const hash = StackRecommender.profileHash(profile);

    // PATCH 2: Add error resilience — process all supplements even if one fails
    for (const supplement of SUPPLEMENTS_DB) {
      try {
        if (this._isEligible(supplement, profile)) {
          const dosage = this._calculatePersonalDosage(supplement, profile);
          const score = this._calculateScore(supplement, profile, dosage.daily);
          const cost = this._estimateMonthlyCost(supplement, dosage.daily, profile);

          const formatted = this._formatResult(supplement, score, dosage, cost, profile);
          results.push(formatted);
        }
      } catch (error) {
        // Log error but continue processing remaining supplements (resilience)
        console.error(`[StackRecommender] Failed to process ${supplement.id}:`, error);

        // Emit tracking event for monitoring
        eventBus.emit('ai:supplementProcessingError', {
          supplementId: supplement.id,
          error: error.message,
          profileHash: hash
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Limit to topN
    const limited = results.slice(0, topN);

    // Emit event globally through EventBus
    eventBus.emit('ai:recommendationsReady', { items: limited, profileHash: hash });

    return limited;
  }

  /**
   * Computes a unique hash string representing the user profile parameters.
   */
  static profileHash(profile) {
    if (!profile) return '';
    const obj = {
      objective: profile.objective || '',
      restrictions: [...(profile.restrictions || [])].sort(),
      weight: profile.weight || 0,
      budget: profile.budget || 0,
      age: profile.age || 0,
      currentStack: [...(profile.currentStack || [])].sort()
    };
    return JSON.stringify(obj);
  }

  // ─── Private Algorithm Methods ─────────────────────────────────────────────

  /**
   * Filters out supplements based on user allergies, exclusions, age boundaries, or existing stack items.
   */
  _isEligible(supplement, userProfile) {
    const restrictions = userProfile.restrictions || [];
    for (const restriction of restrictions) {
      if (supplement.restrictions && supplement.restrictions.includes(restriction)) {
        return false;
      }
    }

    // Exclude if already inside currentStack to prevent recommending purchased items
    const currentStack = userProfile.currentStack || [];
    if (currentStack.includes(supplement.id)) {
      return false;
    }

    // Clinical Safety boundary: Ashwagandha is not recommended for minors under 18
    if (supplement.id === 'ashwagandha' && userProfile.age && userProfile.age < 18) {
      return false;
    }

    return true;
  }

  /**
   * Scoring formula combining objective relevance, evidence, compatibility, and cost-benefit.
   *
   * @param {Object} supplement - Supplement from SUPPLEMENTS_DB
   * @param {Object} userProfile - Validated user profile
   * @param {number} dailyDose - Pre-calculated daily dosage (avoids recalculation)
   * @returns {number} Normalized score [0-1]
   */
  _calculateScore(supplement, userProfile, dailyDose) {
    const r = this._scoreObjectiveRelevance(supplement, userProfile.objective);
    const e = this._scoreEvidenceLevel(supplement);
    const c = this._scoreCompatibility(supplement, userProfile);
    const cb = this._scoreCostBenefit(supplement, userProfile, dailyDose);

    const score = (r * 0.40) + (e * 0.30) + (c * 0.20) + (cb * 0.10);
    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Assesses target matching for the user's main objective.
   */
  _scoreObjectiveRelevance(supplement, objective) {
    if (!objective) return 0.5;
    return supplement.targets?.[objective] ?? 0.5;
  }

  /**
   * Maps qualitative clinical evidence grades to standardized values.
   */
  _scoreEvidenceLevel(supplement) {
    const levels = { 'A': 1.0, 'B': 0.8, 'C': 0.5, 'D': 0.2 };
    return levels[supplement.evidenceLevel] || 0.2;
  }

  /**
   * Assesses general compatibility based on safety scores.
   */
  _scoreCompatibility(supplement, userProfile) {
    return (supplement.safetyScore || 90) / 100;
  }

  /**
   * Checks cost against monthly budget limits, penalizing items exceeding budget capacity.
   *
   * @param {Object} supplement - Supplement from SUPPLEMENTS_DB
   * @param {Object} userProfile - Validated user profile
   * @param {number} dailyDose - Pre-calculated daily dosage (avoids recalculation)
   * @returns {number} Cost-benefit score [0.1-1.0]
   */
  _scoreCostBenefit(supplement, userProfile, dailyDose) {
    const budget = userProfile.budget || 200;
    const pricePerGram = supplement.pricePerGram || 0.05;

    // PATCH 3: Use centralized conversion function
    let dailyGrams;
    try {
      dailyGrams = convertToGrams(dailyDose, supplement.dosage.unit, supplement.id);
    } catch (error) {
      // Fallback: if conversion fails, treat as free (score = 1.0)
      console.warn(`[StackRecommender] Cost conversion failed for ${supplement.id}:`, error.message);
      return 1.0;
    }

    const monthlyCost = dailyGrams * 30 * pricePerGram;

    if (monthlyCost <= 0) return 1.0;
    if (monthlyCost <= budget) return 1.0;

    // PATCH 4: Clamp ratio to [0.1, 1.0] to prevent scores > 1.0
    const ratio = budget / monthlyCost;
    return Math.max(0.1, Math.min(1.0, ratio));
  }

  /**
   * Computes personalized dosages matching user body mass and objective constraints.
   */
  _calculatePersonalDosage(supplement, userProfile) {
    const weight = userProfile.weight || 70;
    const objective = userProfile.objective || 'general';
    const age = userProfile.age || 25;

    let daily = supplement.dosage.maintenance;
    
    // Body weight-based scaling
    if (supplement.dosage.multiplier) {
      const weightMultiplier = this._getWeightMultiplier(userProfile);
      daily = weight * supplement.dosage.multiplier * weightMultiplier;

      // Adjust based on objective
      if (objective === 'bulk' || objective === 'strength') {
        daily *= 1.2;
      } else if (objective === 'cut') {
        daily *= 0.9;
      }
    }

    // Safety check: bound by upper limit
    const upperLimit = supplement.dosage.upperLimit || daily * 2;
    let withinSafetyLimits = true;
    if (daily > upperLimit) {
      daily = upperLimit;
      withinSafetyLimits = false;
    }

    const unit = supplement.dosage.unit || 'g';
    const roundVal = unit === 'g' ? 1 : 0;
    daily = roundVal === 1 ? Math.round(daily * 10) / 10 : Math.round(daily);

    const weekly = daily * 7;
    const frequency = this._getDosageFrequency(supplement, objective);
    const timing = supplement.dosage.timing || 'A qualquer hora';

    // Rationale construction
    let rationale = `Dose diária sugerida de ${daily}${unit} calculada com base no peso corporal (${weight}kg) e no objetivo de ${objective}.`;
    if (supplement.dosage.isFixed) {
      rationale = `Dose fixa padrão de ${daily}${unit} recomendada independentemente de peso corporal.`;
    }

    // Initial loading protocol (if any)
    let loadingProtocol = null;
    if (supplement.dosage.loading) {
      loadingProtocol = {
        dose: supplement.dosage.loading,
        unit: supplement.dosage.unit,
        duration: '5-7 dias',
        frequency: 'Fracionado 4x ao dia',
        description: `Protocolo opcional de saturação inicial: tome ${supplement.dosage.loading}${supplement.dosage.unit} por dia durante 5-7 dias para saturar os estoques musculares rapidamente, depois retorne à dose de manutenção de ${daily}${unit}.`
      };
    }

    return {
      daily,
      unit,
      weekly,
      frequency,
      timing,
      withinSafetyLimits,
      upperLimit,
      rationale,
      loadingProtocol
    };
  }

  /**
   * Helper modifier based on general training intensity or age parameters.
   */
  _getWeightMultiplier(userProfile) {
    const freq = userProfile.trainingFrequency || 3;
    if (freq >= 5) return 1.1; // heavy training adjustment
    if (freq <= 2) return 0.9;
    return 1.0;
  }

  /**
   * Maps optimal intake frequency matching supplement profile.
   */
  _getDosageFrequency(supplement, objective) {
    if (supplement.id === 'cafeina-teanina') {
      return 'Somente nos dias de treino (pré-treino)';
    }
    return 'Diariamente';
  }

  /**
   * Computes individual monthly budget footprint.
   *
   * @param {Object} supplement - Supplement from SUPPLEMENTS_DB
   * @param {number} dailyDose - Pre-calculated daily dosage
   * @param {Object} userProfile - Validated user profile
   * @returns {Object} Cost breakdown with perMonth, perDose, withinBudget
   */
  _estimateMonthlyCost(supplement, dailyDose, userProfile) {
    const pricePerGram = supplement.pricePerGram || 0.05;

    // PATCH 5: Use centralized conversion function (replaces duplicated logic)
    let dailyGrams;
    try {
      dailyGrams = convertToGrams(dailyDose, supplement.dosage.unit, supplement.id);
    } catch (error) {
      // Fallback: if conversion fails, return zero cost
      console.warn(`[StackRecommender] Cost calculation failed for ${supplement.id}:`, error.message);
      return {
        perMonth: 0,
        perDose: 0,
        withinBudget: true
      };
    }

    const perDose = dailyGrams * pricePerGram;
    const perMonth = perDose * 30;
    const budget = userProfile.budget || 200;

    return {
      perMonth: Math.round(perMonth * 100) / 100,
      perDose: Math.round(perDose * 100) / 100,
      withinBudget: perMonth <= budget
    };
  }

  /**
   * Standardizes recommendation payloads matching strict schema requirements.
   */
  _formatResult(supplement, score, dosage, cost, userProfile) {
    const timing = dosage.timing;
    let priority = 'LOW';
    if (score >= 0.8) priority = 'HIGH';
    else if (score >= 0.6) priority = 'MEDIUM';

    return {
      id: supplement.id,
      name: supplement.name,
      category: supplement.category,
      score,
      evidenceLevel: supplement.evidenceLevel,
      dosage,
      cost,
      benefits: supplement.benefits || [],
      warnings: supplement.warnings || [],
      sideEffects: supplement.sideEffects || [],
      interactions: supplement.interactions || [],
      timing,
      priority
    };
  }
}

// Singleton export + named DB export
const recommender = new StackRecommender();
export default recommender;
