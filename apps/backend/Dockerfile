# Use an official Python runtime as a parent image
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Set the working directory in the container
WORKDIR /app

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files (see .dockerignore)
COPY . .

RUN useradd --create-home --uid 1000 app
USER app

# Expose the Flask port
EXPOSE 8080

# Run the app using Gunicorn
CMD sh -c "if [ \"$FLASK_ENV\" = \"development\" ]; then \
    gunicorn --bind 0.0.0.0:${PORT:-8080} --reload --workers 1 --threads 8 --timeout 0 app:app; \
  else \
    gunicorn --bind 0.0.0.0:${PORT:-8080} --workers 4 --threads 8 --timeout 300 --graceful-timeout 30 app:app; \
  fi"
