# AlEx Platform v3 no Replit

Execução direta (sem Docker), em **modo reduzido**: a UI e os recursos com
persistência JSON funcionam; Ollama (chat IA) e Elasticsearch ficam desligados
e o app degrada com mensagens amigáveis.

## Como rodar

1. Importe este repositório no Replit.
2. Garanta um **JDK 25** no ambiente (o `replit-start.sh` detecta `JAVA_HOME`,
   `~/.jdk/jdk-25*`, `/usr/lib/jvm/*25*` ou o `java` do PATH).
3. Clique em **Run** (executa `bash replit-start.sh`) ou rode no Shell:
   ```bash
   bash replit-start.sh
   ```
4. Abra a Webview — a app escuta em `0.0.0.0:${PORT:-5000}`.

## Variáveis

| Variável | Padrão | Uso |
|---|---|---|
| `PORT` | `5000` | porta HTTP (a Webview do Replit usa a 5000) |
| `GOOGLE_CLIENT_ID` | — | login Google (configure em Secrets) |
| `ADMIN_EMAILS` | — | e-mails administradores |
| `OLLAMA_URL` / `OLLAMA_MODEL` | `http://localhost:11434` / `qwen2.5-coder:7b` | IA (requer Ollama acessível; senão, erro amigável) |
| `OLLAMA_WARMUP_ENABLED` | `false` | warmup do modelo no boot |
| `ELASTICSEARCH_ENABLED` | `false` | busca via ES (desligado → fallback JSON) |
| `REBUILD` | `false` | `true` força `mvn package` antes de subir |

## Persistência e segredos

- Dados locais em `db/*.json` e mídia em `db/public_media/` persistem no Repl.
  Nunca commite segredos: `.env`, `.env.wireguard` e chaves estão no `.gitignore`.
- Saúde: `/actuator/health` → `{"status":"UP"}` · `/api/health` · `/api/auth/config`.

## Notas

- O deploy de produção recomendado continua sendo o **Render** via `render.yaml`
  (ver `DEPLOY.md`); o Replit é ideal para demo/validação rápida.
