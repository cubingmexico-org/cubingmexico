# Use an official Python runtime as a parent image
FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.13.5 /uv /bin/uv

# The venv lives outside /app so the docker-compose bind mount on /app doesn't hide it.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    UV_PYTHON_DOWNLOADS=never \
    UV_LINK_MODE=copy \
    PATH="/opt/venv/bin:$PATH"

# Set the working directory in the container
WORKDIR /app

# Install locked dependencies (no dev group)
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --locked --no-dev --no-cache

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
