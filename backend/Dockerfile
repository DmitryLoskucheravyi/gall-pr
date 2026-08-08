FROM node:24-slim AS build
WORKDIR /app

# npm install rather than npm ci: the lock file is generated on Windows,
# which doesn't record the Linux-only optional native-binding variants some
# deps ship (npm ci refuses to run unless the lock file lists every platform
# variant). npm install resolves whatever the current platform actually
# needs instead of enforcing lock-file completeness across platforms.
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
