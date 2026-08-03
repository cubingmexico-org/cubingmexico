# Use an official Python runtime as a parent image
FROM python:3.12-slim

# Set the working directory in the container
WORKDIR /app

# Copy and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY app.py common.py utils.py ./
COPY routes ./routes

# Expose the Flask port
EXPOSE 8080

# Run the app using Gunicorn
CMD sh -c "if [ \"$FLASK_ENV\" = \"development\" ]; then \
    gunicorn --bind 0.0.0.0:${PORT:-8080} --reload --workers 1 --threads 8 --timeout 0 app:app; \
  else \
    gunicorn --bind 0.0.0.0:${PORT:-8080} --workers 4 --threads 8 --timeout 0 app:app; \
  fi"
