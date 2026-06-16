import os
from datetime import timedelta

from dotenv import load_dotenv
load_dotenv()

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from config.database import init_pool
from routes.auth import auth_bp
from routes.listings import listings_bp
from routes.orders import orders_bp
from routes.recommendations import recommendations_bp
from routes.users import users_bp
from routes.admin import admin_bp

app = Flask(__name__)
app.url_map.strict_slashes = False

# Config
app.config["JWT_SECRET_KEY"] = os.environ["JWT_SECRET_KEY"]
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(seconds=int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRES", 604800)))
app.config["MAX_CONTENT_LENGTH"] = int(os.environ.get("MAX_CONTENT_LENGTH", 5 * 1024 * 1024))
# Always use our JSON error handlers, even in debug mode
app.config["PROPAGATE_EXCEPTIONS"] = False

# Extensions
CORS(app, origins=["*"], supports_credentials=True)
JWTManager(app)

limiter = Limiter(get_remote_address, app=app, default_limits=[])
limiter.limit("30 per 15 minutes")(auth_bp)

# Blueprints
app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(listings_bp, url_prefix="/api/listings")
app.register_blueprint(orders_bp, url_prefix="/api/orders")
app.register_blueprint(recommendations_bp, url_prefix="/api/recommendations")
app.register_blueprint(users_bp, url_prefix="/api/users")
app.register_blueprint(admin_bp, url_prefix="/api/admin")

# Uploaded files
@app.route("/uploads/<path:filename>")
def uploaded_file(filename):
    upload_folder = os.path.join(os.path.dirname(__file__), os.environ.get("UPLOAD_FOLDER", "uploads"))
    return send_from_directory(upload_folder, filename)

# API endpoints
@app.route("/api/health")
def health():
    return jsonify(status="ok")

@app.route("/api/public/school")
def public_school():
    from config.database import DB
    with DB() as db:
        school = db.fetchone(
            """SELECT id, name, email_domain, logo_url, primary_color, secondary_color,
                      tagline, website, announcement, announcement_color
               FROM schools LIMIT 1"""
        )
    if not school:
        return jsonify(school=None)
    return jsonify(school=dict(school))

# Serve the built React frontend for every non-API route
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    # Let /api and /uploads routes handle themselves (registered above, won't reach here)
    full_path = os.path.join(FRONTEND_DIST, path)
    if path and os.path.exists(full_path):
        return send_from_directory(FRONTEND_DIST, path)
    index = os.path.join(FRONTEND_DIST, "index.html")
    if os.path.exists(index):
        return send_from_directory(FRONTEND_DIST, "index.html")
    return jsonify(error="Frontend not built. Run: cd frontend && npm run build"), 503

# Error handlers
@app.errorhandler(ConnectionError)
def db_unavailable(e):
    return jsonify(error=str(e)), 503

@app.errorhandler(413)
def too_large(e):
    return jsonify(error="File too large. Maximum size is 5MB"), 413

@app.errorhandler(429)
def rate_limited(e):
    return jsonify(error="Too many requests. Please wait a moment and try again"), 429

@app.errorhandler(500)
def server_error(e):
    import traceback
    print(traceback.format_exc())
    return jsonify(error="Internal server error"), 500

@app.errorhandler(Exception)
def unhandled(e):
    import traceback
    print(traceback.format_exc())
    return jsonify(error=str(e)), 500


if __name__ == "__main__":
    init_pool()
    port = int(os.environ.get("PORT", 3001))
    debug = os.environ.get("FLASK_ENV", "development") == "development"
    print(f"\n  StudentSwap → http://localhost:{port}\n")
    app.run(host="0.0.0.0", port=port, debug=debug)
