# Build stage for frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Build stage for Python backend
FROM python:3.9-slim

# Install system dependencies including Docker
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    curl \
    gnupg \
    lsb-release \
    && curl -fsSL https://get.docker.com | sh \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user and add to docker group
RUN useradd -m -u 1000 user && usermod -aG docker user
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Docker Model Runner
RUN curl -fsSL https://raw.githubusercontent.com/docker/model-runner/main/install.sh | sh

# Copy application files
COPY . .

# Create models directory for caching
RUN mkdir -p /app/models && chown -R user:user /app/models

# Switch to non-root user
USER user

# Copy the built frontend from the frontend-builder stage
COPY --from=frontend-builder /app/dist ./frontend/dist

# Copy the rest of the application
COPY main.py .
COPY ai_processor.py .
COPY questionnaire.db .
COPY test_questions.csv .
COPY templates ./templates

# Expose the port the app runs on
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 