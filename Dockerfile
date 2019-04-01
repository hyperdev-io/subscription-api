FROM node:10-alpine

ADD . /app

WORKDIR /app

RUN npm i \
    && npm run build


CMD [ "npm", "start" ]
