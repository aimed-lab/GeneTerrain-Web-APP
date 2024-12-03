FROM --platform=linux/amd64 node:latest as BUILD
WORKDIR /GeneTerrain
COPY . /GeneTerrain/
RUN npm install 
EXPOSE 8080
CMD npm run start