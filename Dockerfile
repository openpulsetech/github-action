FROM prabhushan/sbom-base:1.0.4

RUN apk add --no-cache nodejs npm jq
RUN npm install -g yarn

WORKDIR /app

# Copy files
COPY entrypoint.sh /entrypoint.sh
COPY main.js /app/main.js
COPY sbom.js /app/sbom.js
COPY secret-detector.js /app/secret-detector.js
COPY . /app/

# 👉 Just install required action modules, not the whole package
RUN npm install @actions/core

# ✅ This now works because entrypoint.sh is already copied
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
