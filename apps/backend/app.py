import os

from flask import Flask, jsonify
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.exceptions import HTTPException
from werkzeug.middleware.proxy_fix import ProxyFix

from common import log
from routes.admin import admin_bp
from routes.competitions import competitions_bp
from routes.misc import misc_bp
from routes.persons import persons_bp
from routes.social import social_bp
from sentry_setup import init_sentry

# Counted per gunicorn worker on each Cloud Run instance (in-memory storage), so this is a
# soft abuse cap rather than an exact per-client quota.
PUBLIC_RATE_LIMIT = os.environ.get("PUBLIC_RATE_LIMIT", "60 per minute")


def handle_unexpected_error(error: Exception):
    if isinstance(error, HTTPException):
        return error
    log.exception("Unhandled error")
    return jsonify({"success": False, "message": "Internal server error"}), 500


def handle_rate_limited(_error: HTTPException):
    return jsonify({"success": False, "message": "Too many requests"}), 429


def create_app():
    init_sentry()
    app = Flask(__name__)
    # Cloud Run appends the client address to X-Forwarded-For; trust only that last hop.
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1)

    limiter = Limiter(get_remote_address, storage_uri="memory://", headers_enabled=True)
    for public_bp in (competitions_bp, persons_bp, misc_bp):
        limiter.limit(PUBLIC_RATE_LIMIT)(public_bp)
    limiter.init_app(app)

    app.register_blueprint(admin_bp)
    app.register_blueprint(competitions_bp)
    app.register_blueprint(persons_bp)
    app.register_blueprint(misc_bp)
    app.register_blueprint(social_bp)
    app.register_error_handler(429, handle_rate_limited)
    app.register_error_handler(Exception, handle_unexpected_error)
    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
