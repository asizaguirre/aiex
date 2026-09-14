# Deploy AlEx AI Platform v3 - Render

> Guia rápido. O passo a passo completo e atualizado está em `DEPLOY.md`.

## Build

```bash
mvn -B -DskipTests package -f backend/pom.xml
```

## Start

```bash
java -jar backend/target/alex-platform-3.0.0.jar
```

## Variáveis Render

Configure no dashboard (nunca no repo):

- `PORT=8080`
- `GOOGLE_CLIENT_ID` (obrigatório p/ login Google)
- `ADMIN_EMAILS`
- `OLLAMA_URL` / `OLLAMA_MODEL=qwen2.5-coder:7b`
- WireGuard (só se Ollama remoto): `LOCAL_SERVER_IP`, `SERVER_PUBLIC_KEY`, `CLIENT_PRIVATE_KEY`

Health: `/actuator/health` → `{"status":"UP"}`
