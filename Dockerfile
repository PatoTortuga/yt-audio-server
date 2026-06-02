FROM node:20-bullseye-slim

# Install Python 3, FFmpeg, and yt-dlp binary
RUN apt-get update
RUN apt-get install -y --no-install-recommends --fix-missing python3 ffmpeg wget && \
    wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
