# 🚀 Render Deployment - Próximas Etapas

## ✅ O que foi feito

- ✅ WireGuard configurado localmente em `179.209.143.160:51820`
- ✅ Arquivos enviados para GitHub (alex-platform-v2)
- ✅ Configuração pronta para Render

---

## 📋 Arquivos Commitados

```
✓ .env.wireguard                 # Configuração WireGuard + Ollama
✓ docker-compose-render-wg.yml   # Docker Compose com WireGuard client
✓ wireguard-config/wg0.conf      # Config do cliente WireGuard
✓ alex.sh                        # Entrada única para execução local
```

---

## 🔧 Configuração Render (No Dashboard)

### Passo 1: Environment Variables

Dashboard → Your App → **Settings** → **Environment**

Adicione estas variáveis:

```bash
# WireGuard
LOCAL_SERVER_IP=179.209.143.160
SERVER_PUBLIC_KEY=<configure-in-render>
CLIENT_PRIVATE_KEY=<configure-in-render>

# Ollama via WireGuard tunnel
OLLAMA_URL=http://10.0.0.1:11434
OLLAMA_MODEL=qwen2.5-coder:7b

# App
PORT=8080
SPRING_PROFILES_ACTIVE=prod
```

### Passo 2: Build Command

Dashboard → **Settings** → **Build Command**

```bash
#!/bin/bash
# Install WireGuard
apt-get update && apt-get install -y wireguard wireguard-tools

# Build application
cd backend && mvn clean package
```

### Passo 3: Start Command

Dashboard → **Settings** → **Start Command**

```bash
java -jar backend/target/alex-platform-3.0.0.jar
```

### Passo 4: Deploy usando Docker Compose

Se preferir usar Docker Compose em Render:

1. Vá para **Settings**
2. Mude **Runtime** para **Docker**
3. Configure para usar `docker-compose-render-wg.yml`

---

## 🔄 Render vai fazer deploy automático

Quando você fez `git push`, Render recebeu notificação e começou a fazer build automático.

### Monitorar Deploy

1. Dashboard → Your App → **Logs**
2. Procure por:
   - `Building...` → App está fazendo build
   - `WireGuard setup complete` → VPN conectou
   - `Alex Platform started` → App rodando

---

## 🧪 Testar Conexão Após Deploy

### 1. Verificar status do WireGuard localmente

```bash
# No seu PC
sudo wg show

# Esperado:
# peer: JXuwHZXoa0FJn9q/WcuUMmuEoDC7+vZH1MY50RwkDGM=
#   endpoint: 74.220.x.x:xxxxx (IP do Render)
#   allowed ips: 10.0.0.2/32
#   latest handshake: X seconds ago
#   transfer: X B received, Y B sent
```

### 2. Testar curl da API local

```bash
# Render consegue atingir Ollama local via tunnel
curl https://<seu-app>.onrender.com/health

# Se retornar 200, app está rodando
```

### 3. Testar Chat API

```bash
curl -X POST https://<seu-app>.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Olá, qual é o seu nome?",
    "model": "qwen2.5-coder:7b"
  }'

# Esperado: Resposta do Ollama via WireGuard tunnel
```

---

## 📊 Monitorar Tráfego WireGuard

### Local (seu PC)

```bash
# Real-time monitoring
watch -n 1 'sudo wg show'

# Ver estatísticas
sudo wg show wg0 dump

# Ver transferência de dados
sudo wg show wg0 transfer
```

### Se Render desconectar

```bash
# Reconectar manualmente (SSH em Render)
wg-quick down wg0
wg-quick up wg0

# Ou via docker
docker restart wg-client
```

---

## 🆘 Troubleshooting Render

### Problema: Render em `Red` (erro de build/start)

```bash
# 1. Verificar logs
# Dashboard → Logs → procurar por ERROR

# 2. Problemas comuns:
# - Maven não achou java: Instalar JDK na build
# - WireGuard não conecta: Verificar firewall local
# - Ollama não responde: Verificar se WireGuard conectou
```

### Problema: WireGuard não conecta

```bash
# Render side - SSH/shell
docker exec wg-client wg show
# Deve mostrar: peer: a7t+jzOb...
#               endpoint: 179.209.143.160:51820

# Se não houver peer, reconectar:
docker exec wg-client wg-quick down wg0
docker exec wg-client wg-quick up wg0
```

### Problema: Ollama timeout

```bash
# Testar conectividade no tunnel
docker exec wg-client ping 10.0.0.1
# Esperado: 1 packets transmitted, 1 received

# Testar Ollama
docker exec wg-client curl http://10.0.0.1:11434/api/tags
# Esperado: HTTP 200
```

---

## 🔐 Segurança - Checklist

- ✅ WireGuard com criptografia Curve25519
- ✅ Chaves geradas localmente (nunca compartilhe)
- ✅ Firewall local bloqueando portas desnecessárias
- ✅ Render em HTTPS (`.onrender.com`)
- ✅ Variables não expostas (guardadas em Render)

⚠️ **IMPORTANTE:** Nunca commite chaves em git!
- `.env.wireguard` ← Nunca em repo público!
- `wireguard-config/wg0.conf` ← Adicionar a `.gitignore`

```bash
# Adicionar ao .gitignore
echo ".env.wireguard" >> .gitignore
echo "wireguard-config/wg0.conf" >> .gitignore
git add .gitignore
git commit -m "chore: Add sensitive files to .gitignore"
git push
```

---

## 📈 Próximos Passos

1. ✅ Aguardar Render fazer deploy (1-5 min)
2. ✅ Testar conexão com curl
3. ✅ Monitorar logs de WireGuard
4. ✅ Fazer primeira request ao chat API
5. ✅ Verificar status do wg show (deve ter peer + endpoint + transfer)
6. ✅ Rotacionar chaves mensalmente (opcional)

---

## 📞 Precisa de Help?

### Verificar tudo rápido

```bash
# Local
echo "=== Local ===" && \
sudo wg show && \
echo "" && \
echo "=== Remote Test ===" && \
curl -s https://<seu-app>.onrender.com/health

# Render SSH
echo "=== Render ===" && \
docker exec wg-client wg show && \
docker exec wg-client ping -c 1 10.0.0.1
```

### Logs úteis

```bash
# Local logs
sudo journalctl -u wg-quick@wg0 -f --lines=50

# Render logs
# Dashboard → Logs (em tempo real)
```

---

## ✨ Status Atual

| Item | Status | Details |
|------|--------|---------|
| **Local WireGuard** | ✅ Rodando | 10.0.0.1:51820, Key: a7t+... |
| **Client Config** | ✅ Pronto | 10.0.0.2, EP: 179.209.143.160 |
| **GitHub Commit** | ✅ Enviado | `d609130` |
| **Render Deploy** | ⏳ Em andamento | Verificar no dashboard |
| **Firewall** | ⚠️ Check | Porta 51820/UDP aberta? |

---

**Próximo passo:** Verifique o Render Dashboard para ver se o build terminou com sucesso! 🚀
