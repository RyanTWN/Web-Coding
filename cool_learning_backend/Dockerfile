# 使用輕量級的 Node.js 20 映像檔
FROM node:20-alpine

# 設定容器內部工作目錄
WORKDIR /app

# 複製 package.json 並安裝依賴套件
COPY package*.json ./
RUN npm install --production

# 複製後端所有程式碼 (包含 server.js)
COPY . .

# 開放 Port 4060
EXPOSE 4060

# 容器啟動指令
CMD ["node", "server.js"]