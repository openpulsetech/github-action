FROM prabhushan/sbom-base:1.0.4

RUN apk add --no-cache nodejs npm jq

# Install yarn using npm
RUN npm install -g yarn

WORKDIR /app

COPY entrypoint.sh /entrypoint.sh
COPY main.js /app/main.js
COPY sbom.js /app/sbom.js
COPY secret-detector.js /app/secret-detector.js

COPY package.json package-lock.json /app/

RUN npm install

# Install project dependencies using yarn
# RUN yarn install

RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
