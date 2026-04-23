mkdir -p /opt/rsshub /opt/imgproxy /opt/frps
cat << 'EOF' > /opt/rsshub/docker-compose.yml
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
services:
  imgproxy:
    image: darthsim/imgproxy:latest
    restart: always
    ports: cat << 'EOF' > /opt/rsshub/docker-compose.yml
  rsshub:
    imag/,echo  rsshub: >> ./do.s:/echo  image: diygod/rso.echo     restart: always
    echo  ports: >> ./do.sh
echo  O_echo       - '1200:120doecho environment:
