import bcrypt
from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import create_access_token
from config.database import DB
from middleware.auth import require_auth

auth_bp = Blueprint("auth", __name__)


def _make_token(user_id):
    return create_access_token(identity=str(user_id))


@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    full_name = (data.get("full_name") or "").strip()

    if not email or not password or not full_name:
        return jsonify(error="email, password, and full_name are required"), 400
    if len(password) < 8:
        return jsonify(error="Password must be at least 8 characters"), 400
    if len(full_name) < 2:
        return jsonify(error="Full name must be at least 2 characters"), 400

    domain = email.split("@")[-1] if "@" in email else ""

    with DB() as db:
        school = db.fetchone("SELECT id, name FROM schools WHERE email_domain = %s", [domain])
        if not school:
            return jsonify(error="Email domain not associated with any registered school"), 400

        if db.fetchone("SELECT id FROM users WHERE email = %s", [email]):
            return jsonify(error="Email already registered"), 400

        password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(12)).decode()

        user = db.fetchone(
            """INSERT INTO users (school_id, email, password_hash, full_name)
               VALUES (%s, %s, %s, %s)
               RETURNING id, email, full_name, role, school_id, avatar_url""",
            [school["id"], email, password_hash, full_name],
        )

    token = _make_token(user["id"])
    return jsonify(token=token, user={
        **dict(user),
        "school_name": school["name"],
        "school_logo_url": school.get("logo_url"),
        "school_primary_color": school.get("primary_color", "#3B82F6"),
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify(error="email and password are required"), 400

    with DB() as db:
        user = db.fetchone(
            """SELECT u.id, u.email, u.password_hash, u.full_name, u.role, u.school_id,
                      u.avatar_url, u.is_active, s.name as school_name,
                      COALESCE(s.logo_url, NULL) as school_logo_url,
                      COALESCE(s.primary_color, '#3B82F6') as school_primary_color
               FROM users u JOIN schools s ON u.school_id = s.id
               WHERE u.email = %s""",
            [email],
        )

    if not user:
        return jsonify(error="Invalid email or password"), 401
    if not user["is_active"]:
        return jsonify(error="Account is deactivated"), 403
    if not bcrypt.checkpw(password.encode(), user["password_hash"].encode()):
        return jsonify(error="Invalid email or password"), 401

    token = _make_token(user["id"])
    user_out = {k: v for k, v in dict(user).items() if k != "password_hash"}
    return jsonify(token=token, user=user_out)


@auth_bp.route("/me", methods=["GET"])
@require_auth
def get_me():
    with DB() as db:
        user = db.fetchone(
            """SELECT u.id, u.email, u.full_name, u.role, u.school_id, u.avatar_url, u.created_at,
                      s.name as school_name, s.logo_url as school_logo_url,
                      s.primary_color as school_primary_color
               FROM users u JOIN schools s ON u.school_id = s.id
               WHERE u.id = %s""",
            [g.user["id"]],
        )
    return jsonify(user=dict(user))


@auth_bp.route("/change-password", methods=["PUT"])
@require_auth
def change_password():
    data = request.get_json() or {}
    current = data.get("current_password") or ""
    new_pwd = data.get("new_password") or ""

    if len(new_pwd) < 8:
        return jsonify(error="New password must be at least 8 characters"), 400

    with DB() as db:
        row = db.fetchone("SELECT password_hash FROM users WHERE id = %s", [g.user["id"]])
        if not bcrypt.checkpw(current.encode(), row["password_hash"].encode()):
            return jsonify(error="Current password is incorrect"), 400
        new_hash = bcrypt.hashpw(new_pwd.encode(), bcrypt.gensalt(12)).decode()
        db.execute("UPDATE users SET password_hash = %s WHERE id = %s", [new_hash, g.user["id"]])

    return jsonify(message="Password updated successfully")
