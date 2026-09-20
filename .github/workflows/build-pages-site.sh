#!/usr/bin/env bash
# Monta o site estático do GitHub Pages (demo da UI + docs).
# Chamado por .github/workflows/pages.yml — sem segredos, só copia arquivos.
set -euo pipefail

mkdir -p site/demo site/docs
cp backend/src/main/resources/static/index.html site/demo/
cp backend/src/main/resources/static/app.js site/demo/
cp backend/src/main/resources/static/styles.css site/demo/
cp docs/*.md site/docs/ 2>/dev/null || true
cp README.md site/docs/README-projeto.md 2>/dev/null || true

cat > site/index.html <<'EOF'
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AlEx Platform v3 — demo &amp; docs</title>
  <style>
    body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;margin:0;background:#0b0e14;color:#e6e9f0}
    .wrap{max-width:860px;margin:0 auto;padding:48px 24px}
    h1{font-size:28px;margin:0 0 8px}
    p{color:#9aa3b2;line-height:1.6}
    .cards{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:24px}
    a.card{display:block;background:#131826;border:1px solid #263048;border-radius:14px;padding:20px;color:#e6e9f0;text-decoration:none}
    a.card:hover{border-color:#3b82f6}
    a.card b{display:block;font-size:17px;margin-bottom:6px}
    a.card span{color:#9aa3b2;font-size:14px;line-height:1.5}
    code{background:#1b2334;padding:2px 6px;border-radius:6px;font-size:13px}
    @media(max-width:640px){.cards{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <div class="wrap">
    <h1>AlEx Platform v3</h1>
    <p><strong>Atenção:</strong> o GitHub Pages é estático — aqui vai a <b>demo da UI</b> e a <b>documentação</b>.
    O sistema completo (API Spring Boot + dados) roda no <b>backend</b> (Render/Replit/local) — conecte a demo a ele
    informando a URL no campo <code>ALEX_BACKEND_URL</code> da própria página de demo.</p>
    <div class="cards">
      <a class="card" href="./demo/"><b>Demo da UI</b><span>Interface estática com campo para apontar ao backend (Render/Replit/local).</span></a>
      <a class="card" href="./docs/"><b>Documentação</b><span>Guias do projeto (CQRS, páginas web, README).</span></a>
    </div>
  </div>
</body>
</html>
EOF

cat > site/docs/index.html <<'EOF'
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>AlEx Platform v3 — docs</title></head>
<body style="font-family:system-ui,sans-serif;max-width:860px;margin:0 auto;padding:32px 20px;line-height:1.6">
  <h1>Documentação</h1>
  <ul>
    <li><a href="./ARQUITETURA-CQRS.md">Arquitetura CQRS</a></li>
    <li><a href="./GUIA-PAGINA-WEB-PARA-LEIGOS.md">Guia de páginas web para leigos</a></li>
    <li><a href="./README-projeto.md">README do projeto</a></li>
  </ul>
  <p><a href="../">Voltar</a></p>
</body>
</html>
EOF

ls -R site | head -30
