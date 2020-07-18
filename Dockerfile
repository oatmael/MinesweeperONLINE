FROM node:10-alpine
WORKDIR /usr/src/app
COPY express/package*.json ./
RUN npm install
COPY express/. ./
EXPOSE 80
EXPOSE 9898
CMD [ "node", "app.js" ]