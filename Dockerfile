FROM prabhushan/sbom-base:1.0.2

RUN apk add --no-cache nodejs npm jq

WORKDIR /app

COPY entrypoint.sh /entrypoint.sh
COPY main.js /app/main.js
COPY sbom.js /app/sbom.js
COPY package.json package-lock.json /app/

RUN npm install

RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

