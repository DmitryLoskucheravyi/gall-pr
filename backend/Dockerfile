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

# Dev TLS cert (see main.ts) — opt-in, only makes the server listen over
# HTTPS if both files are present. Harmless to ship; it's a throwaway
# self-signed dev cert, not a secret.
COPY cert ./cert

# multer's diskStorage writes payment-proof/image uploads here before they go
# to Cloudinary — it doesn't create the directory itself, so it must exist
# before the app starts.
RUN mkdir -p temp

EXPOSE 3001
CMD ["node", "dist/main"]
