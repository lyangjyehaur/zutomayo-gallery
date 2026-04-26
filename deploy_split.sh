mkdir -p /opt/rsshub /opt/imgproxy /opt/frps

cat << 'EOF' > /opt/rsshub/docker-compose.yml
version: '3.8'
services:
  rsshub:
    image: diygod/rsshub:latest
    restart: always
    ports:
      - '1200:1200'
    environment:
      NODE_ENV: production
      CACHE_TYPE: memory
      CACHE_EXPIRE: 3600
      TWITTER_COOKIE: 'auth_token=PLEASE_REPLACE_AUTH_TOKEN; ct0=PLEASE_REPLACE_CT0;'
      NO_LOGFILES: 'true'
      LOGGER_LEVEL: 'warn'
EOF

cat << 'EOF' > /opt/imgproxy/docker-compose.yml
version: '3.8'
services:
  imgproxy:
    image: darthsim/imgproxy:latest
    restart: always
    ports:
      - '8018:8080'
    environment:
      IMGPROXY_ALLOWED_SOURCES: 'https://pbs.twimg.com/,https://i.ytimg.com/,https://unavatar.io/'
      IMGPROXY_AUTO_WEBP: 'true'
      IMGPROXY_AUTO_AVIF: 'true'
      IMGPROXY_SKIP_PROCESSING_FORMATS: 'jpg,png,gif,webp,avif'
      # IMGPROXY_KEY: 'your_hex_key'
      # IMGPROXY_SALT: 'your_hex_salt'
EOF

cat << 'EOF' > /opt/frps/docker-compose.yml
version: '3.8'
services:
  frps:
    image: snowdreamtech/frps:latest
    restart: always
    network_mode: host
    volumes:
      - '/etc/frp/frps.toml:/etc/frp/frps.toml'
EOF

cd /opt/rsshub && docker-compose up -d
cd /opt/imgproxy && docker-compose up -d
cd /opt/frps && docker-compose up -d
