# Use the official Node.js 20 image as the base image
FROM node:20-alpine

# Set environment variables for production
ENV NODE_ENV=production

# Set the working directory inside the container
WORKDIR /app

# Copy only package.json and package-lock.json first for dependency installation
COPY package*.json ./

# Install production dependencies only
RUN npm install --production

# Copy the rest of the project files to the container
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port configured for the app (default is 3000 for production)
EXPOSE 3000

# Start the Next.js application
CMD ["npm", "start"]