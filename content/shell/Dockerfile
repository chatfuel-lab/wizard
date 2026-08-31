# Chatfuel app — client bundle + the node server that proxies Chatfuel and
# (with Supabase env) gates every request on the caller's session.
#
# VITE_* values are BAKED INTO THE CLIENT AT BUILD TIME, so they are build
# args here; the same values must also be in the container's runtime env,
# where the proxy reads them. Everything the SERVER reads is runtime-only —
# never a build arg, never a layer: the secrets (CHATFUEL_TOKEN,
# SUPABASE_SERVICE_ROLE_KEY) and CHATFUEL_WORKSPACE_ID, which is not secret but
# is read at request time, when a new account needs a bot.
#
#   docker build -t chatfuel-app \
#     --build-arg VITE_CHATFUEL_WORKSPACE_ID=... \
#     --build-arg VITE_SUPABASE_URL=... \
#     --build-arg VITE_SUPABASE_ANON_KEY=... \
#     --build-arg VITE_APP_NAME=... \
#     --build-arg VITE_APP_LOGO=... .
#   docker run -p 3000:3000 --env-file .env chatfuel-app
#
# Serving the app under a sub-path needs the value in both places under two
# names: `--build-arg VITE_BASE_PATH=/app/` rewrites the asset URLs while the
# bundle is built, and `BASE_PATH=/app` in the runtime env tells the server
# what to serve them under. A build without the arg is a build pinned to `/`,
# whatever the runtime is later told.

FROM node:22-alpine AS builder
WORKDIR /app

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_APP_NAME
ARG VITE_APP_LOGO
ARG VITE_CHATFUEL_WORKSPACE_ID
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY \
    VITE_APP_NAME=$VITE_APP_NAME \
    VITE_APP_LOGO=$VITE_APP_LOGO \
    VITE_CHATFUEL_WORKSPACE_ID=$VITE_CHATFUEL_WORKSPACE_ID

# Not in the ENV block above, on purpose: a build arg reaches `npm run build`
# on its own, while `ENV X=$X` would define X as the empty string on a build
# that never passed one. `vite.config.ts` falls back to '/' only when the
# variable is absent, and an empty string is not absent — it would build every
# default image with a relative base.
ARG VITE_BASE_PATH

COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/dist ./server/dist

USER node
EXPOSE 3000
CMD ["node", "server/dist/entry.js"]
