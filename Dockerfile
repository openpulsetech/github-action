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

# Conditional npm/yarn install
# RUN if [ -f /app/package.json ]; then \
#       echo "📦 Detected package.json, installing dependencies..."; \
#       npm install && yarn install; \
#     else \
#       echo "📦 No package.json found, skipping npm/yarn install."; \
#     fi

if [ -f /github/workspace/package.json ]; then
  echo "📦 Detected package.json in target repo, installing dependencies..."
  cd /github/workspace
  npm install && yarn install
else
  echo "📦 No package.json found in target repo, skipping install."
fi

# ✅ This now works because entrypoint.sh is already copied
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
