# Regras do Projeto — Health Score Dashboard Bravvius

## Commits — Conventional Commits

Todo commit deve seguir o padrão [Conventional Commits](https://www.conventionalcommits.org/):

```
<tipo>(<escopo>): <descrição curta em português>
```

### Tipos obrigatórios

| Tipo | Quando usar |
|---|---|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `refactor` | Mudança de código sem nova funcionalidade nem correção |
| `style` | Ajustes visuais/CSS sem lógica (cores, espaçamento) |
| `chore` | Tarefas de manutenção (deps, configs, scripts) |
| `docs` | Alterações em documentação |
| `test` | Adição ou correção de testes |

### Escopos comuns deste projeto

`dashboard`, `health-score`, `customers`, `stats`, `api`, `ui`, `deps`

### Exemplos válidos

```
feat(health-score): adiciona cálculo de NRR por cliente
fix(customers): corrige filtro de status em PT-BR
refactor(api): separa cálculo de KPIs em utilitário próprio
style(dashboard): ajusta espaçamento dos StatsCards no mobile
chore(deps): atualiza lucide-react para v0.300.0
```

### Regras

- Descrição sempre em **português**, no imperativo (ex: "adiciona", "corrige", "remove")
- Máximo de 72 caracteres na primeira linha
- Sem ponto final na descrição curta
- Para mudanças que quebram compatibilidade, adicionar `!` após o escopo: `feat(api)!: altera contrato de getStats`

---

## Versionamento

Este projeto segue [Semantic Versioning](https://semver.org/):

- `MAJOR` (v**X**.0.0) — mudança que quebra compatibilidade
- `MINOR` (v1.**X**.0) — nova funcionalidade compatível com versão anterior
- `PATCH` (v1.0.**X**) — correção de bug

A versão atual é **v1.0.0**.
