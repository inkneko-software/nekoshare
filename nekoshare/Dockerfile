FROM node:20

WORKDIR /nekoshare

COPY . /nekoshare

ARG NEXT_PUBLIC_PYSDK_HOST
ENV NEXT_PUBLIC_PYSDK_HOST=${NEXT_PUBLIC_PYSDK_HOST}

RUN npm install --registry=https://registry.npmmirror.com
RUN npm run build

CMD [ "npm", "run", "start" ]