FROM node:24-slim AS build
WORKDIR /app

# npm install rather than npm ci, and the reason is specific enough to write
# down so nobody "fixes" it again.
#
# The lock file is generated on Windows. npm records only the optional native
# dependencies the generating platform needs, so the Linux build is missing
# transitive ones — @emnapi/core and @emnapi/runtime, pulled in by the wasm and
# musl variants of @unrs/resolver-binding. `npm ci` refuses outright when the
# lock file and package.json disagree like that:
#
#   npm error Missing: @emnapi/core@1.11.3 from lock file
#
# `npm ci --dry-run` passes on Windows, which makes this easy to get wrong —
# it only proves the lock file is complete for *this* platform.
#
# The proper fix, if reproducible builds become worth it, is to generate the
# lock file on Linux (run `npm install --package-lock-only` inside a
# node:24-slim container) and then switch both stages to `npm ci`.
COPY package.json package-lock.json ./
RUN npm install

COPY . .
RUN npm run build


FROM node:24-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm install --omit=dev

COPY --from=build /app/dist ./dist

# The TLS cert is deliberately NOT copied in. It used to be, back when it was
# a throwaway self-signed file; it is now a real Let's Encrypt certificate for
# this machine's tailnet name, and baking a private key into an image layer
# means it travels with the image everywhere the image goes.
#
# docker-compose mounts ./backend/cert at /app/cert instead, so the key stays
# on the host and the 90-day renewal needs no rebuild. main.ts falls back to
# plain HTTP when the directory isn't mounted, which is what production wants
# anyway — there, TLS is terminated by Caddy in front.

# multer's diskStorage writes payment-proof/image uploads here before they go
# to Cloudinary — it doesn't create the directory itself, so it must exist
# before the app starts.
RUN mkdir -p temp

EXPOSE 3001
CMD ["node", "dist/main"]
