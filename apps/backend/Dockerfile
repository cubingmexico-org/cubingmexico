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

# Each worker holds its own DB pool (DB_POOL_MAX, default GUNICORN_THREADS), so an instance
# opens up to WEB_CONCURRENCY x DB_POOL_MAX connections.
ENV WEB_CONCURRENCY=4 \
    GUNICORN_THREADS=8

# Run the app using Gunicorn
CMD sh -c "if [ \"$FLASK_ENV\" = \"development\" ]; then \
    gunicorn --bind 0.0.0.0:${PORT:-8080} --reload --workers 1 --threads ${GUNICORN_THREADS} --timeout 0 app:app; \
  else \
    gunicorn --bind 0.0.0.0:${PORT:-8080} --workers ${WEB_CONCURRENCY} --threads ${GUNICORN_THREADS} --timeout 300 --graceful-timeout 30 app:app; \
  fi"
