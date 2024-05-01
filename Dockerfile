FROM node:latest
WORKDIR /GeneTerrain
COPY . /GeneTerrain/
RUN npm install 
EXPOSE 8080
CMD npm run start
