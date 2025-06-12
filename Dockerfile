# TODO update to newer version: Active LTS or Current
FROM node:20 as dev

# cache hack (very fragile): initially only copy list of project dependencies
COPY --chown=node:node package.json package-lock.json /opt/node/

# install node dependencies to parent directory of code
WORKDIR /opt/node
USER node
RUN npm install

# add node modules binary folder to system PATH
ENV PATH=/opt/node/node_modules/.bin/:$PATH

# copy source code, switch to code directory
COPY --chown=node:node . /opt/node/app
WORKDIR /opt/node/app

EXPOSE 3000
CMD ["npm", "start"]


FROM dev as node-prod
ENV NODE_ENV=production
RUN npm run build


FROM nginx as prod
ARG REACT_APP_VERSION_STRING
ENV REACT_APP_VERSION_STRING=$REACT_APP_VERSION_STRING
COPY docker-entrypoint-override.sh /usr/bin/docker-entrypoint-override.sh
# write environment variables to config file and start
ENTRYPOINT ["/usr/bin/docker-entrypoint-override.sh", "/docker-entrypoint.sh"]
CMD ["nginx","-g","daemon off;"]

COPY --from=node-prod /opt/node/app/dist /usr/share/nginx/html
