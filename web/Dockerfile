# ---------------------------------------------------------------------------
# Web image — build the React/Vite bundle, then serve it with nginx.
#
# Node.js is only used during the build stage.
# The final runtime image contains nginx and the compiled static files only.
# ---------------------------------------------------------------------------

# --- Stage 1: build --------------------------------------------------------
FROM node:22-alpine AS build

WORKDIR /usr/src/app

# Install dependencies first to improve Docker layer caching
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Copy application source and build the Vite production bundle
COPY . .
RUN npm run build

# --- Stage 2: runtime --------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY --from=build /usr/src/app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
