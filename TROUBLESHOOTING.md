# Guia de Troubleshooting — SupliList v2.0

Este guia aborda os problemas comuns enfrentados durante o desenvolvimento e execução do SupliList v2.0, oferecendo diagnósticos práticos e soluções passo a passo.

---

## 1. Erro: "State is undefined" ou "Invalid State Object"

### Sintoma
O aplicativo recusa a inicialização, falha no bootstrap e exibe uma tela vermelha de falha crítica ou emite um erro no console apontando que a árvore do `AppState` está corrompida ou é nula.

### Causa
- O estado armazenado no `localStorage` sob a chave ativa ficou corrompido devido a atualizações manuais no DevTools ou incompatibilidade de dados entre versões antigas.
- O validador estrito `StateSchema` recusou dados importados por estarem fora da conformidade de tipo obrigatória.

### Resolução
1. **Verifique `STORAGE_KEY`**: Abra `src/js/utils/constants.js` (ou o próprio `state-manager.js`) e certifique-se de que a chave usada para leitura/gravação é a canônica: `suplilist:state:v2`.
2. **Limpar Estado Corrompido**: Abra o console do desenvolvedor no seu navegador (F12 -> Application -> Local Storage) ou execute o comando abaixo diretamente no console do DevTools:
   ```javascript
   localStorage.clear();
   window.location.reload();
   ```
   Isso forçará a aplicação a recuperar e gravar de forma limpa a base padrão de resiliência declarada em `fallback-state.json`.

---

## 2. Suplementos Não Carregam na Tela ("Supplements not loading")

### Sintoma
A barra de pesquisa e filtros é exibida na tela, mas a listagem central permanece infinitamente em estado vazio ("Nenhum suplemento encontrado") mesmo sem nenhum filtro digitado.

### Causa
- O adaptador ESM falhou na leitura ou conversão dos metadados exportados pelo banco legado.
- O arquivo `database.js` está ausente, posicionado no caminho incorreto, ou contém metadados malformados que falham no processo de parsing de dados estruturados.

### Resolução
1. **Inspecione o Boot do Repositório**: Verifique se há erros no console lançados na linha de carregamento assíncrono em `supplementRepo.loadAll()`.
2. **Verifique a Raiz do Projeto**: Certifique-se de que o arquivo original `database.js` está localizado exatamente no diretório raiz do workspace (`C:\Users\User\Desktop\suplilist beta\database.js`) para que o import dinâmico ESM funcione.
3. **Verifique Caminhos Relativos**: Certifique-se de que o adaptador de dados (`src/js/data/adapters.js` ou repositório correspondente) aponta para o caminho correto relativo. No Vite, os arquivos da raiz são acessíveis via caminhos relativos puros (`/database.js`).
4. **Verifique o Formato dos Dados**: Confirme que as estruturas contidas em `database.js` expõem os suplementos em um array puro na constante `IT` e que ela está devidamente exportada ou anexada como módulo global seguro.

---

## 3. Os Eventos Não Estão Sendo Disparados ou Escutados ("Event not firing")

### Sintoma
Ao clicar em botões de ação ou alterar filtros na UI, o EventBus não notifica as outras áreas correspondentes (por exemplo, as abas de favoritos não atualizam em tempo real ao favoritar um item no catálogo).

### Causa
- O tipo de evento emitido pelo `eventBus.emit(...)` não está registrado ou é inconsistente com os nomes canônicos autorizados.
- O ouvinte (`eventBus.on(...)`) foi registrado tardiamente após o evento ter sido disparado no ciclo de inicialização.

### Resolução
1. **Verifique a Lista de Eventos Autorizados**: Verifique se o nome do evento que está sendo emitido é válido e compatível com as regras de payloads em `events.schema.js`. Todos os eventos legítimos do sistema devem estar listados para segurança e prevenção de bugs silenciosos.
2. **Ciclo de Vida de Inscrição**: Confirme que a inscrição nos ouvintes do EventBus em componentes como `SupplementListController` e `FavoritesPageController` ocorre no construtor do controlador. Desta forma, os componentes estarão totalmente aptos a ouvir eventos de forma reativa antes mesmo da chamada do método `.init()`.
3. **Validação de Payload**: Inspecione se o objeto transmitido no segundo argumento do `.emit()` obedece estritamente ao tipo de payload esperado para o evento. O EventBus do SupliList valida esquemas e silenciará emissões fora do padrão.

---

## 4. O Card Quebra e Impede a Renderização Completa ("Card not rendering")

### Sintoma
A tela quebra parcialmente ou apenas um bloco de suplemento deixa de ser desenhado na tela, enquanto o console exibe mensagens de erro capturadas.

### Causa
- Um determinado item da base de dados possui propriedades malformadas que geraram um erro em tempo de execução dentro da função `createCard()`.
- O protetor de falhas `ErrorBoundary` capturou a quebra do elemento no DOM.

### Resolução
1. **Verifique Alertas no Console**: Abra as ferramentas do DevTools e filtre mensagens pelo marcador `[ErrorBoundary]`. Quando um componente protegido falha, o protetor emite o log detalhado contendo a origem e a propriedade nula causadora.
2. **Confirme Propriedades Obrigatórias**: Inspecione o objeto de suplemento problemático e confirme se ele contém todos os campos mínimos válidos, especialmente:
   - `supplement.prices` (deve ser um dicionário/objeto contendo valores numéricos, nunca nulo).
   - `supplement.goals` (deve ser um array, mesmo que vazio).
   - `supplement.defaultDose` e `supplement.unit`.
3. **UI de Contingência**: Confirme se a interface apresenta o componente `ErrorCard` no lugar do card quebrado. Isso indica que a blindagem da aplicação está funcionando com sucesso e os outros 50+ suplementos continuam utilizáveis sem panes globais.

---

## 5. Performance Lenta ou Gargalos de Renderização

### Sintoma
Ao digitar rapidamente no campo de buscas, a aplicação apresenta engasgos visuais (lag) no redesenho dos cards de produtos na tela.

### Causa
- Inserções diretas de elementos no DOM ocorrendo em loops fechados (`appendChild` em loop no container físico), forçando múltiplos recálculos de layout e repaint pelo motor de renderização do navegador.
- Criação e anotação excessiva de event listeners individuais por card ou botão inserido, gerando consumo massivo de memória e vazamento de recursos.

### Resolução
1. **Valide a Renderização em Lote (`DocumentFragment`)**: Certifique-se de que as funções de render de listagem (`SupplementListController.render` e `FavoritesPageController.render`) criam uma instância de `document.createDocumentFragment()`. Os cards novos devem ser anexados temporariamente a este fragmento em memória para que o DOM sofra apenas **uma** alteração de injeção global ao final.
2. **Delegação de Eventos (`Event Delegation`)**: **Nunca** vincule `addEventListener` diretamente nos elementos de botão de cada card de suplemento. O app adota o padrão performático de delegação de eventos, onde um único ouvinte central é instalado no contêiner pai (`#supplement-list`) e intercepta as ações baseadas no atributo `data-action` dos alvos mais próximos (`e.target.closest('[data-action]')`).
3. **Certifique Limpeza nos Eventos**: Confirme que os controladores chamam o método `.destroy()` para remover assinaturas de eventos quando a página é re-renderizada ou destruída.
