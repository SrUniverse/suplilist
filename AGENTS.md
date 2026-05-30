# Multi-Agent System — SupliList Workspace

Este workspace tem um sistema de 3 agentes orquestrados para produção de conteúdo, pesquisa e revisão.

## Agentes

| Agente | Papel | Palavras-chave que ativam |
|---|---|---|
| **Researcher** | Coleta informações precisas, dados e fontes | `research`, `data`, `find`, `explain`, `what is` |
| **Writer** | Produz conteúdo estruturado a partir de inputs | `write`, `draft`, `create`, `compose`, `summarize` |
| **Reviewer** | Critica, corrige e melhora qualidade | `review`, `check`, `edit`, `improve`, `fix` |

## Como usar

```bash
node runner.js "sua tarefa aqui"
```

### Roteamento automático

- **Tarefa com palavra-chave reconhecida** → ativa apenas o agente mais relevante.
- **Tarefa sem palavra-chave** → encadeia os três agentes em sequência: Researcher → Writer → Reviewer.

### Exemplo de workflow completo

```bash
node runner.js "Explain quantum computing basics."
```

1. Nenhuma keyword match → encadeia os 3 agentes.
2. **Researcher** recebe o prompt e você cola a resposta no terminal.
3. A resposta do Researcher vira contexto para o **Writer**.
4. A saída do Writer é entregue ao **Reviewer** para refinamento.
5. Output final exibido e salvo em `agent-output-reviewer.txt`.

### Exemplos por agente único

```bash
# Aciona apenas o Researcher
node runner.js "Find data on PWA adoption rates in 2024"

# Aciona apenas o Writer
node runner.js "Write a product description for a supplement tracker app"

# Aciona apenas o Reviewer
node runner.js "Review and improve this paragraph about vitamins"
```

## Arquivos do sistema

| Arquivo | Descrição |
|---|---|
| `agent-profiles.json` | Definição dos agentes: nome, papel, keywords, promptTemplate |
| `runner.js` | CLI orquestradora — sem dependências externas |
| `AGENTS.md` | Este documento |
| `agent-output-*.txt` | Outputs salvos automaticamente por sessão |

## Customização

Para adicionar um novo agente, edite `agent-profiles.json` seguindo o schema:

```json
{
  "name": "NomeDoAgente",
  "role": "identificador-interno",
  "description": "O que ele faz",
  "keywords": ["palavra", "chave"],
  "promptTemplate": "Você é... {{task}} ... {{researchContext}}"
}
```

Variáveis disponíveis no `promptTemplate`:
- `{{task}}` — a tarefa original passada pelo usuário
- `{{researchContext}}` — output do agente anterior (Researcher)
- `{{writerContext}}` — output do agente anterior (Writer)
