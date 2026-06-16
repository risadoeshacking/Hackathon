from functools import wraps
from flask import g, jsonify
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
from config.database import DB


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        try:
            verify_jwt_in_request()
        except Exception:
            return jsonify(error="No token provided or token is invalid"), 401

        user_id = int(get_jwt_identity())
        with DB() as db:
            user = db.fetchone(
                """SELECT id, email, full_name, role, school_id, avatar_url, is_active
                   FROM users WHERE id = %s""",
                [user_id],
            )

        if not user or not user["is_active"]:
            return jsonify(error="User not found or inactive"), 401

        g.user = dict(user)
        return f(*args, **kwargs)

    return decorated


def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if g.user.get("role") != "admin":
            return jsonify(error="Admin access required"), 403
        return f(*args, **kwargs)

    return decorated
