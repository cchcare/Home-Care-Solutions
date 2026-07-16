FROM node:20-bookworm-slim

# pdf2pic shells out to these binaries to rasterize PDF pages.
RUN apt-get update && apt-get install -y --no-install-recommends \
    graphicsmagick ghostscript \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

ENV PORT=8080
EXPOSE 8080
CMD ["npm", "start"]
