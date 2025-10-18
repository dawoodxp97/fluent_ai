from flask import Flask
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from .config import Config
from .routes import bp as api_bp

redis_client = None


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config())

    # Security headers
    @app.after_request
    def add_headers(resp):
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("X-Frame-Options", "DENY")
        resp.headers.setdefault("Referrer-Policy", "no-referrer")
        return resp

    CORS(app, supports_credentials=True, origins=app.config.get("CORS_ORIGINS", ["*"]))

    storage_uri = app.config.get("REDIS_URL") or None
    limiter = Limiter(
        key_func=get_remote_address,
        app=app,
        default_limits=["60 per minute"],
        storage_uri=storage_uri,
    )

    app.register_blueprint(api_bp, url_prefix="/api")
    return app