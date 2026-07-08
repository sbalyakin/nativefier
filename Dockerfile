FROM --platform=linux/amd64 node:lts-alpine
LABEL description="Alpine image to build Webholm apps"


# Install dependencies and cleanup extraneous files
RUN apk update \
    && apk add bash wine imagemagick dos2unix \
    && rm -rf /var/cache/apk/* \
    && mkdir /webholm && chown node:node /webholm

# Use node (1000) as default user not root
USER node

ENV NPM_PACKAGES="/home/node/npm-packages"
ENV PATH="$PATH:$NPM_PACKAGES/bin"
ENV MANPATH="$MANPATH:$NPM_PACKAGES/share/man"

# Setup a global packages location for "node" user so we can npm link
RUN mkdir $NPM_PACKAGES \
    && npm config set prefix $NPM_PACKAGES

WORKDIR /webholm

# Add sources with node as the owner so that it has the power it needs to build in /webholm
COPY --chown=node:node . .

# Fix line endings that may have gotten mangled in Windows
RUN find ./icon-scripts ./src ./app -type f -print0 | xargs -0 dos2unix

# Link (which will install and build)
# Run tests (to ensure we don't Docker build & publish broken stuff)
# Cleanup leftover files in this step to not waste Docker layer space
# Make sure webholm is executable
RUN npm i \
    && npm link \
    && npm run test:noplaywright \
    && rm -rf /tmp/webholm* ~/.npm/_cacache ~/.cache/electron \
    && chmod +x $NPM_PACKAGES/bin/webholm

# Run a {lin,mac,win} build
# 1. to check installation was sucessful
# 2. to cache electron distributables and avoid downloads at runtime
# Also delete generated apps so they don't get added to the Docker layer
# !Important! The `rm -rf` command must be in the same `RUN` command (using an `&&`), to not waste Docker layer space
RUN webholm https://github.com/nativefier/nativefier /tmp/webholm \
    && webholm -p osx https://github.com/nativefier/nativefier /tmp/webholm \
    && webholm -p windows https://github.com/nativefier/nativefier /tmp/webholm \
    && rm -rf /tmp/webholm


RUN echo Generated Electron cache size: $(du -sh ~/.cache/electron) \
    && echo Final image size: $(du -sh / 2>/dev/null)

ENTRYPOINT ["webholm"]
CMD ["--help"]
