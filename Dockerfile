# Build stage for frontend
FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Build stage for Python backend
FROM python:3.11-slim AS backend

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install numpy first
RUN pip install numpy==1.24.0

# Copy Python requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

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

# Command to run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"] 