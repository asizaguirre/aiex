# Configuration for Render with WireGuard

Here's how to deploy on Render with WireGuard tunnel to local Ollama:

## Dashboard Configuration

### 1. Build Command
```bash
apt-get update && apt-get install -y wireguard wireguard-tools iproute2 && cd backend && mvn clean package -DskipTests
```

### 2. Start Command
```bash
java -jar backend/target/alex-platform-3.0.0.jar
```

### 3. Docker Configuration
- **Dockerfile Path:** `backend/Dockerfile` (current one works)
- OR use: `backend/Dockerfile.render` (has WireGuard built-in)

### 4. Environment Variables
Add in **Settings → Environment**:

| Variable | Value |
|----------|-------|
| `LOCAL_SERVER_IP` | `179.209.143.160` |
| `SERVER_PUBLIC_KEY` | `<configure-in-render>` |
| `CLIENT_PRIVATE_KEY` | `<configure-in-render>` |
| `OLLAMA_URL` | `http://10.0.0.1:11434` |
| `OLLAMA_MODEL` | `qwen2.5-coder:7b` |
| `PORT` | `8080` |
| `SPRING_PROFILES_ACTIVE` | `prod` |

### 5. Deploy Steps

**Option A: Using Render Docker (Recommended)**

1. Create `render.yaml` in root:
```yaml
services:
  - type: web
    name: alex-platform-v2
    runtime: docker
    dockerfilePath: backend/Dockerfile.render
    buildCommand: ''
    startCommand: ''
    healthCheckPath: /actuator/health
    envVars:
      - key: LOCAL_SERVER_IP
        value: 179.209.143.160
      - key: SERVER_PUBLIC_KEY
        value: <configure-in-render>
      - key: CLIENT_PRIVATE_KEY
        value: <configure-in-render>
      - key: OLLAMA_URL
        value: http://10.0.0.1:11434
      - key: OLLAMA_MODEL
        value: qwen2.5-coder:7b
      - key: PORT
        value: '8080'
```

2. Push to GitHub
3. Connect repo to Render
4. Render auto-deploys

**Option B: Manual Configuration in Dashboard**

1. Go to **Settings** → **Build & Deploy**
2. Change **Dockerfile path** to: `backend/Dockerfile.render`
3. Add all environment variables (see table above)
4. Click **Deploy**

---

## Testing After Deployment

### 1. Check WireGuard Connection (on your local machine)

```bash
sudo wg show
# Should show:
# peer: JXuwHZXoa0FJn9q/WcuUMmuEoDC7+vZH1MY50RwkDGM=
#   endpoint: 74.220.x.x:xxxxx  ← This appears when Render connects!
#   transfer: X B received, Y B sent
```

### 2. Test App Health

```bash
curl https://alex-platform-v2.onrender.com/actuator/health
# Expected: { "status": "UP" }
```

### 3. Test Ollama Connection

```bash
curl -X POST https://alex-platform-v2.onrender.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","model":"qwen2.5-coder:7b"}'
```

---

## Troubleshooting

### WireGuard not connecting

**Check logs:**
```
Dashboard → Logs → Look for:
- "WireGuard tunnel established"
- "Starting WireGuard client"
- "Running WITHOUT WireGuard tunnel"
```

**Common issues:**
- ❌ Environment variables not set → manually add in Dashboard
- ❌ Firewall blocking 51820/UDP → open on your machine
- ❌ Wrong IP → verify with `curl -s ifconfig.io`

### Ollama connection failed

**Test from your machine:**
```bash
# See if Render can reach Ollama
sudo wg show wg0
# If Render is NOT showing as endpoint, WireGuard didn't connect yet
```

**Solution:**
1. Check all 3 environment variables are set
2. Restart app: Dashboard → **Restart** (top right)
3. Wait 30 seconds for WireGuard to establish

### Check WireGuard module loaded

```bash
# In Render shell/logs, should see WireGuard load successfully
# If not, it's a Linux kernel limitation (rare on Render)
```

---

## Security Checklist

- ✅ Never commit `.env.wireguard` to repo
- ✅ Use Render's **Environment** section for secrets
- ✅ Rotate keys every 90 days
- ✅ Monitor: `sudo wg show` for active peers
- ✅ Firewall: Allow only 51820/UDP from Render IPs

---

## File Summary

| File | Purpose |
|------|---------|
| `backend/Dockerfile.render` | Docker image with WireGuard built-in |
| `backend/startup.sh` | Startup script that configures WireGuard + runs app |
| `alex.sh` | Local bootstrap and startup script |
| `.env.wireguard` | ⚠️ Local reference (don't commit!) |
| `wireguard-config/wg0.conf` | ⚠️ Local reference (don't commit!) |

---

## Next Steps

1. ✅ Push `Dockerfile.render` and `startup.sh` to GitHub
2. ✅ Configure environment variables in Render Dashboard
3. ✅ Trigger manual deploy
4. ⏳ Wait for build and WireGuard to connect (2-5 min)
5. ✅ Test with curl
6. ✅ Monitor `sudo wg show` to see Render peer connect

**Once Render endpoint appears in `wg show`, connection is working!** 🚀
