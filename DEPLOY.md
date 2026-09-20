# 🚀 DEPLOY — AlEx Platform v3 (guia único de publicação)

## 1. Pré-requisitos

- Java 25, Maven 3.9+, Docker + Compose
- Conta no Render (deploy nuvem) e/ou servidor com Docker
- Google OAuth Client ID (https://console.cloud.google.com/apis/credentials)
- (Opcional) ngrok p/ túnel público local; Ollama p/ IA local

## 2. Configurar ambiente

```bash
cp .env.example .env
# edite .env:
#   GOOGLE_CLIENT_ID=seu-client-id.apps.googleusercontent.com
#   ADMIN_EMAILS=voce@gmail.com
#   OLLAMA_URL=http://localhost:11434  (ou http://10.0.0.1:11434 via WireGuard)
#   OLLAMA_MODEL=qwen2.5-coder:7b
```

Nunca commite `.env`, `.env.wireguard` ou `wireguard-config/wg_confs/*.conf`.

## 3. Rodar local (Docker — recomendado)

```bash
docker compose up -d --build
curl http://localhost:8080/actuator/health   # {"status":"UP"}
curl http://localhost:8080/api/health
```

## 4. Rodar local (sem Docker)

```bash
export JAVA_HOME=$HOME/.jdk/jdk-25.0.2
export PATH="$JAVA_HOME/bin:$PATH"
mvn -B -DskipTests package -f backend/pom.xml
java -jar backend/target/alex-platform-3.0.0.jar
```

## 5. Publicar no Render (Blueprint)

1. Push da branch `master` (este release) para o GitHub.
2. Render → New → Blueprint → selecione o repo (usa `render.yaml`).
3. No dashboard, preencha as secrets (nunca no repo):
   `GOOGLE_CLIENT_ID`, `ADMIN_EMAILS`, `OLLAMA_URL`,
   `LOCAL_SERVER_IP`, `SERVER_PUBLIC_KEY`, `CLIENT_PRIVATE_KEY` (as 3 últimas só se usar WireGuard p/ Ollama remoto).
4. Deploy → valide:
   ```bash
   curl https://<seu-app>.onrender.com/actuator/health
   curl https://<seu-app>.onrender.com/api/health
   curl https://<seu-app>.onrender.com/api/auth/config
   ```

Sem WireGuard (Ollama indisponível), a UI e as páginas públicas funcionam; o chat IA responde erro amigável até `OLLAMA_URL` ser configurado.

## 7. Publicação automática (GitHub Actions)

Cada `push` para `main`/`master`, cada tag `v*` ou cada run manual:

1. `CI/CD - Build and Test Backend` — compila o JAR com Maven (JDK 25).
2. `Publish Docker image to GHCR` — constrói `backend/Dockerfile` e publica em:
   `ghcr.io/asizaguirre/aiex` com as tags:
   - `latest` + `sha-<commit>` — em todo push
   - `3.0.1`, `3.0` — quando o run parte de uma tag `v*`

Nada de PAT/tokens no repo: o publish usa `secrets.GITHUB_TOKEN`
(`packages: write`). Commits concorrentes são cancelados automaticamente
(`concurrency` por ref).

Ver runs:
`Actions` → `Publish Docker image to GHCR` · pacote:
`<repo>/pkgs/container/aiex`

```bash
docker pull ghcr.io/asizaguirre/aiex:latest
```

## 8. Pós-deploy

- Proteja a branch `main`/`master`, mantenha o repo **privado** (ver `SECURITY.md`).
- Rotacione chaves WireGuard/ngrok periodicamente.
- Persistência: `db/` e `rag/` via volumes — não versionar dados de clientes.
