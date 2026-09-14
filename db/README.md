# db/ — dados locais (NÃO versionados)

Este diretório guarda os JSONs de runtime (`users.json`, `public_pages.json`,
`database.json`, `access_requests.json`, `custom_agents.json`) e uploads em
`public_media/`.

- Estes arquivos estão no `.gitignore` e **não são commitados** (v3).
- Na primeira execução o backend cria/carrega listas vazias automaticamente.
- Para produção (Render/Docker), monte um volume persistente em `./db`.

Exemplo de seed mínimo (crie localmente, nunca commite dados reais):

```json
[]
```