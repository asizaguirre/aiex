# Changelog — AlEx Platform

## v3.0.0 (2026-09-14)

Release de publicação — "v3 de todo o sistema":

- Bump de versão `2.0.0` → `3.0.0` (`backend/pom.xml`, `/api/auth/config`, UI `v3.0`, scripts, docs).
- Remoção de segredos hardcoded do código/dados versionados:
  - `GOOGLE_CLIENT_ID` agora vem de variável de ambiente (sem fallback); frontend desabilita o botão Google com fallback quando ausente.
  - `config/.env.template` e `.env.example` sem tokens reais (placeholders).
  - Domínio ngrok padrão removido dos scripts (vêm do `.env` local).
- Higienização para publicação:
  - `db/*.json`, `db/public_media/*` e `rag/documents/*` fora do git (`.gitignore`); seeds locais zerados para `[]`.
  - Mantido apenas 1 asset de mídia de exemplo fora do versionamento.
- Deploy pronto:
  - `render.yaml` com `healthCheckPath: /actuator/health`, env não-secretas fixas e secrets como `sync: false`.
  - `RENDER_DEPLOY.md` apontando para `alex-platform-3.0.0.jar`.
  - CI (`ci.yml`) cobrindo `main`+`master`, actions v4, verificação do artefato `3.0.0`.
- Docs: `DEPLOY.md` (guia único de publicação), `db/README.md`, `VERSION`.
