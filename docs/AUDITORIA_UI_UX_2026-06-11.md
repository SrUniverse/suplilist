# Auditoria UI/UX — 2026-06-11

Avaliação do estado pós-redesign (Fases 0-4 do plano "Dark Luxury Laboratorial" aplicadas). Verificado ao vivo em localhost:5173, dark e light, mais inspeção de DOM/CSS.

## O que já está bom
- Design system com tokens canônicos funcionando (dark `#0A0C10`, cards `#13161C`, brand `#8B5CF6`), aliases de compat, sistema de evidência tokenizado (`--ev-*`).
- Landing com tipografia editorial forte (H1 gigante, hierarquia clara, CTAs duplos, stats inline).
- Fotos de produto reais carregando em todos os cards do catálogo.
- Badges de evidência (EV. A/B/C) com cor semântica — diferencial científico visível.
- Sidebar com seções (Explorar / Meu Protocolo / Suporte) e CTA "Adicionar ao Stack".
- Sem overflow horizontal; Inter como fonte base.

## Problemas de UI encontrados

### ALTO
1. **Card PRO ilegível no tema light** — RESOLVIDO: o código atual já usa cores fixas (#F1F5F9 sobre gradiente escuro); o bug visível vinha do service worker servindo bundle antigo. Verificado legível em ambos os temas após limpar o SW.
1b. **NOVO CRÍTICO (descoberto e corrigido):** o app inteiro quebrava na montagem de rota quando o Firebase falhava ao inicializar (auth/invalid-api-key) — até páginas públicas. firebase-client.js agora degrada para modo guest com stub de auth.
2. **Badge de economia em TODOS os cards** — NUANCE após verificação: os dados de prices.json mostram spreads reais de 10-30% entre marketplaces (média 32%), então os badges são legítimos. Threshold de >5% implementado em getMaxSaving() como guarda contra badges triviais. Consideração futura de design: reservar destaque visual para os top-N maiores spreads.
3. ~~Animação contínua travando o compositor~~ **CORRIGIDO O DIAGNÓSTICO:** medição mostrou 0 chamadas de rAF — não há loop de animação. Os screenshots travados eram do tooling de preview. O problema real encontrado no lugar: **service worker registrado em dev servia bundle velho do cache**, mascarando mudanças de código (corrigido: SW não registra mais em dev).
4. **Token de API do Analytics logado no console** em produção (`API Token: 80a383b1-...`) + logs de debug verbosos. Remover/condicionar a DEV.

### MÉDIO
5. **Stat rings no topo do catálogo ocupam o espaço mais nobre** com dados de baixo valor ("0 favoritos", "55 total"). Comprimir em uma linha discreta ou mover.
6. **Filtros: 16 chips em 2 fileiras** (Categoria + Objetivo) competindo com o conteúdo. Colapsar Objetivo num dropdown ou scroll horizontal com fade.
7. **Cards da landing (preview à direita do hero)** usam gradiente cinza lavado, sem foto de produto — destoa do catálogo real. Usar o componente de card real com foto.
8. **Tema default é light** (`suplilist:theme: light`), mas toda a direção visual "Dark Luxury Laboratorial" foi pensada para dark. Decidir: dark como default (recomendado para a identidade) ou investir paridade total no light.
9. **Tema midnight ainda sem bloco de tokens** (pendência da Fase 5).

### UX / Fluxo
10. **Login wall em Check-in, Histórico e Favoritos.** O visitante não vê o valor antes de criar conta. Permitir modo guest com localStorage + prompt de conta na hora de sincronizar.
11. **Sem onboarding visível pós-cadastro** direcionando ao primeiro stack (momento "aha").
12. **Catálogo é a experiência central, mas o produto-Strava precisa que o CENTRO seja o protocolo do usuário** (check-in diário, streak, adesão), não a loja.

## Estratégia "Strava de suplementação" — o que torna viciante

O Strava funciona por 4 loops: registro sem fricção → feedback visual imediato → progresso acumulado (streaks/recordes) → camada social (kudos/comparação). Tradução para o SupliList:

1. **Check-in de 1 toque como ação central do app.** Abrir o app logado = tela "Protocolo de hoje" com os suplementos do dia e um botão grande de marcar tudo. FAB já existe — apontar para isso.
2. **Streak + heatmap de adesão** (estilo GitHub/Strava) no topo do home logado: "12 dias seguidos", calendário de bolinhas roxas. O dado já existe (taxa de adesão 92% no histórico).
3. **Recordes e marcos**: "30 dias de creatina contínua", "melhor mês", "R$ 142 economizados via arbitragem". Celebrar com micro-animação (uma vez, não loop).
4. **Recap semanal compartilhável**: card bonito gerado (adesão da semana, streak, economia) para Stories/WhatsApp — é o motor de aquisição orgânica do Strava.
5. **Stacks públicos**: permitir compartilhar o stack como página pública bonita ("Stack de cutting do João — 92% adesão"), com botão "Copiar stack". Vira loop de aquisição + prova social.
6. **Comparação anônima**: "Sua adesão está no top 18% dos usuários de creatina" — sem rede social completa, só benchmark.
7. **Notificação inteligente** no horário da dose (PWA push já é viável) — o gatilho diário do loop.

### Priorização sugerida
- Semana 1 (correções): itens 1-4 de UI (PRO card, badges de economia, rAF, console token).
- Semana 2 (núcleo do loop): home logado vira "Protocolo de hoje" + streak + heatmap.
- Semana 3-4: recap semanal compartilhável + stack público.
- Depois: benchmarks anônimos, push notifications.
