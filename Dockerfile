# Stage 1: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package*.json ./
RUN npm ci

# Copy project files and build the Next.js app
COPY . .
RUN npm run build

# Stage 2: Production image runner
FROM node:20-alpine AS runner
WORKDIR /app

# Hugging Face Spaces environment configurations
ENV NODE_ENV=production
ENV PORT=7860
ENV HOSTNAME="0.0.0.0"

# Copy built application and required production assets
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Expose the specific port Hugging Face demands
EXPOSE 7860

# Start the Next.js production server
CMD ["npm", "run", "start"]