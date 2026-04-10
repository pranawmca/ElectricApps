# Stage 1: Build
FROM node:20-alpine AS build
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install -g npm@latest && \
    npm install --legacy-peer-deps

# Copy source code and build the app
COPY . .
RUN npm run build -- --configuration production

# Stage 2: Serve
FROM nginx:alpine

# Copy built files from stage 1
# Note: For Angular 17/18/19+, the path is usually dist/<project-name>/browser
COPY --from=build /app/dist/EnterpriseERP/browser /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
