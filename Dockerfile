# TODO update to newer version: Active LTS or Current
FROM node:14

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
