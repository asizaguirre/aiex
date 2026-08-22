#!/bin/bash
# Render startup script - Configure WireGuard and start app

set -e

echo "🚀 [$(date)] Starting AlEx Platform with WireGuard..."

# Check environment variables
if [ -z "$LOCAL_SERVER_IP" ] || [ -z "$CLIENT_PRIVATE_KEY" ] || [ -z "$SERVER_PUBLIC_KEY" ]; then
    echo "⚠️  WireGuard environment variables not fully configured"
    echo "   LOCAL_SERVER_IP: ${LOCAL_SERVER_IP:-NOT SET}"
    echo "   CLIENT_PRIVATE_KEY: ${CLIENT_PRIVATE_KEY:+SET}"
    echo "   SERVER_PUBLIC_KEY: ${SERVER_PUBLIC_KEY:+SET}"
    echo ""
    echo "⚠️  Running WITHOUT WireGuard tunnel"
    echo "   Attempting to connect to: $OLLAMA_URL"
else
    echo "✅ WireGuard variables detected, configuring tunnel..."
    
    # Install WireGuard if not present
    if ! command -v wg &> /dev/null; then
        echo "📦 Installing WireGuard..."
        apt-get update > /dev/null 2>&1
        apt-get install -y wireguard wireguard-tools > /dev/null 2>&1
    fi
    
    # Enable IP forwarding
    echo 1 > /proc/sys/net/ipv4/ip_forward
    
    # Create WireGuard config
    mkdir -p /etc/wireguard
    chmod 700 /etc/wireguard
    
    cat > /etc/wireguard/wg0.conf << WGEOF
[Interface]
Address = 10.0.0.2/24
PrivateKey = ${CLIENT_PRIVATE_KEY}
SaveConfig = false
DNS = 8.8.8.8, 1.1.1.1

[Peer]
PublicKey = ${SERVER_PUBLIC_KEY}
Endpoint = ${LOCAL_SERVER_IP}:51820
AllowedIPs = 10.0.0.0/24, 127.0.0.1/32
PersistentKeepalive = 25
WGEOF
    
    chmod 600 /etc/wireguard/wg0.conf
    
    # Start WireGuard
    echo "🔗 Starting WireGuard client..."
    wg-quick up wg0 || echo "⚠️  WireGuard may already be running"
    
    # Wait for tunnel to establish
    sleep 2
    
    # Verify connection
    if ip addr show wg0 > /dev/null 2>&1; then
        WG_IP=$(ip addr show wg0 | grep "inet " | awk '{print $2}')
        echo "✅ WireGuard tunnel established: $WG_IP"
    else
        echo "❌ WireGuard tunnel failed to establish"
    fi
fi

echo ""
echo "📝 Application Configuration:"
echo "   OLLAMA_URL: $OLLAMA_URL"
echo "   OLLAMA_MODEL: $OLLAMA_MODEL"
echo "   PORT: $PORT"
echo ""
echo "🎯 Starting Spring Boot application..."
echo ""

# Start application
exec java -jar /app/app.jar
