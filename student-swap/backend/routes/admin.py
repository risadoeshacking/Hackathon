import os
import uuid
from flask import Blueprint, request, jsonify, g
from werkzeug.utils import secure_filename
from config.database import DB
from middleware.auth import require_auth, require_admin

ALLOWED_LOGO_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "svg", "webp"}
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "..", os.environ.get("UPLOAD_FOLDER", "uploads"))


def _allowed_logo(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_LOGO_EXTENSIONS

admin_bp = Blueprint("admin", __name__)


@admin_bp.route("/stats", methods=["GET"])
@require_auth
@require_admin
def get_stats():
    school_id = g.user["school_id"]
    with DB() as db:
        users_count = db.fetchval("SELECT COUNT(*) FROM users WHERE school_id = %s", [school_id])
        listings = db.fetchall(
            "SELECT status, COUNT(*) as count FROM listings WHERE school_id = %s GROUP BY status", [school_id]
        )
        orders = db.fetchall(
            """SELECT o.status, COUNT(*) as count FROM orders o
               JOIN listings l ON o.listing_id = l.id
               WHERE l.school_id = %s GROUP BY o.status""",
            [school_id],
        )
        reports = db.fetchall(
            """SELECT mr.status, COUNT(*) as count FROM moderation_reports mr
               JOIN listings l ON mr.listing_id = l.id
               WHERE l.school_id = %s GROUP BY mr.status""",
            [school_id],
        )
    return jsonify(
        users=users_count,
        listings=[dict(r) for r in listings],
        orders=[dict(r) for r in orders],
        reports=[dict(r) for r in reports],
    )


@admin_bp.route("/listings", methods=["GET"])
@require_auth
@require_admin
def get_listings():
    status = request.args.get("status", "pending")
    page = max(1, int(request.args.get("page", 1)))
    limit = min(50, int(request.args.get("limit", 20)))
    offset = (page - 1) * limit

    with DB() as db:
        rows = db.fetchall(
            """SELECT l.*, c.name as category_name, u.full_name as seller_name, u.email as seller_email
               FROM listings l
               LEFT JOIN categories c ON l.category_id = c.id
               JOIN users u ON l.seller_id = u.id
               WHERE l.school_id = %s AND l.status = %s
               ORDER BY l.created_at ASC LIMIT %s OFFSET %s""",
            [g.user["school_id"], status, limit, offset],
        )
        total = db.fetchval(
            "SELECT COUNT(*) FROM listings WHERE school_id = %s AND status = %s",
            [g.user["school_id"], status],
        )
    return jsonify(listings=[dict(r) for r in rows], total=total)


@admin_bp.route("/listings/<int:listing_id>/approve", methods=["PATCH"])
@require_auth
@require_admin
def approve_listing(listing_id):
    with DB() as db:
        row = db.fetchone(
            "UPDATE listings SET status = 'active' WHERE id = %s AND school_id = %s RETURNING *",
            [listing_id, g.user["school_id"]],
        )
    if not row:
        return jsonify(error="Listing not found"), 404
    return jsonify(listing=dict(row), message="Listing approved and published")


@admin_bp.route("/listings/<int:listing_id>/remove", methods=["PATCH"])
@require_auth
@require_admin
def remove_listing(listing_id):
    with DB() as db:
        row = db.fetchone(
            "UPDATE listings SET status = 'removed' WHERE id = %s AND school_id = %s RETURNING id",
            [listing_id, g.user["school_id"]],
        )
    if not row:
        return jsonify(error="Listing not found"), 404
    return jsonify(message="Listing removed")


@admin_bp.route("/reports", methods=["GET"])
@require_auth
@require_admin
def get_reports():
    status = request.args.get("status", "pending")
    page = max(1, int(request.args.get("page", 1)))
    limit = min(50, int(request.args.get("limit", 20)))
    offset = (page - 1) * limit

    with DB() as db:
        rows = db.fetchall(
            """SELECT mr.id, mr.reason, mr.status, mr.admin_notes, mr.created_at, mr.reviewed_at,
                      l.id as listing_id, l.title as listing_title, l.status as listing_status,
                      reporter.full_name as reporter_name, reporter.email as reporter_email,
                      seller.full_name as seller_name,
                      reviewer.full_name as reviewed_by_name
               FROM moderation_reports mr
               JOIN listings l ON mr.listing_id = l.id
               JOIN users reporter ON mr.reporter_id = reporter.id
               JOIN users seller ON l.seller_id = seller.id
               LEFT JOIN users reviewer ON mr.reviewed_by = reviewer.id
               WHERE l.school_id = %s AND mr.status = %s
               ORDER BY mr.created_at DESC LIMIT %s OFFSET %s""",
            [g.user["school_id"], status, limit, offset],
        )
        total = db.fetchval(
            """SELECT COUNT(*) FROM moderation_reports mr
               JOIN listings l ON mr.listing_id = l.id
               WHERE l.school_id = %s AND mr.status = %s""",
            [g.user["school_id"], status],
        )
    return jsonify(reports=[dict(r) for r in rows], total=total)


@admin_bp.route("/reports/<int:report_id>", methods=["PATCH"])
@require_auth
@require_admin
def review_report(report_id):
    data = request.get_json() or {}
    status = data.get("status")
    if status not in ("reviewed", "dismissed", "actioned"):
        return jsonify(error="Invalid status"), 400

    with DB() as db:
        row = db.fetchone(
            """UPDATE moderation_reports
               SET status = %s, admin_notes = %s, reviewed_by = %s, reviewed_at = NOW()
               WHERE id = %s RETURNING listing_id""",
            [status, data.get("admin_notes"), g.user["id"], report_id],
        )
        if not row:
            return jsonify(error="Report not found"), 404

        if data.get("remove_listing"):
            db.execute("UPDATE listings SET status = 'removed' WHERE id = %s", [row["listing_id"]])

    return jsonify(message="Report updated")


@admin_bp.route("/users", methods=["GET"])
@require_auth
@require_admin
def get_users():
    search = request.args.get("search")
    page = max(1, int(request.args.get("page", 1)))
    limit = min(50, int(request.args.get("limit", 20)))
    offset = (page - 1) * limit

    params = [g.user["school_id"]]
    where = "school_id = %s"
    if search:
        where += " AND (full_name ILIKE %s OR email ILIKE %s)"
        params.extend([f"%{search}%", f"%{search}%"])

    with DB() as db:
        rows = db.fetchall(
            f"""SELECT id, email, full_name, role, is_active, created_at,
                       (SELECT COUNT(*) FROM listings WHERE seller_id = users.id) as listing_count
                FROM users WHERE {where}
                ORDER BY created_at DESC LIMIT %s OFFSET %s""",
            params + [limit, offset],
        )
        total = db.fetchval(f"SELECT COUNT(*) FROM users WHERE {where}", params)
    return jsonify(users=[dict(r) for r in rows], total=total)


@admin_bp.route("/users/<int:user_id>", methods=["PATCH"])
@require_auth
@require_admin
def update_user(user_id):
    if user_id == g.user["id"]:
        return jsonify(error="Cannot modify your own admin account"), 400

    data = request.get_json() or {}
    with DB() as db:
        row = db.fetchone(
            """UPDATE users SET
               role = COALESCE(%s, role),
               is_active = COALESCE(%s, is_active)
               WHERE id = %s AND school_id = %s
               RETURNING id, email, full_name, role, is_active""",
            [data.get("role"), data.get("is_active"), user_id, g.user["school_id"]],
        )
    if not row:
        return jsonify(error="User not found"), 404
    return jsonify(user=dict(row))


# ── School Settings ────────────────────────────────────────────────────────────

@admin_bp.route("/school", methods=["GET"])
@require_auth
@require_admin
def get_school():
    with DB() as db:
        school = db.fetchone("SELECT * FROM schools WHERE id = %s", [g.user["school_id"]])
    return jsonify(school=dict(school))


@admin_bp.route("/school", methods=["PUT"])
@require_auth
@require_admin
def update_school():
    data = request.get_json() or {}
    allowed = ["name", "email_domain", "logo_url", "primary_color", "secondary_color",
               "tagline", "website", "address", "phone", "announcement", "announcement_color"]

    updates = {k: data[k] for k in allowed if k in data}
    if not updates:
        return jsonify(error="No valid fields provided"), 400

    set_clause = ", ".join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [g.user["school_id"]]

    with DB() as db:
        school = db.fetchone(
            f"UPDATE schools SET {set_clause}, updated_at = NOW() WHERE id = %s RETURNING *",
            values,
        )
    return jsonify(school=dict(school), message="School settings saved")


@admin_bp.route("/school/logo", methods=["POST"])
@require_auth
@require_admin
def upload_logo():
    if "logo" not in request.files:
        return jsonify(error="No file provided"), 400

    file = request.files["logo"]
    if not file.filename or not _allowed_logo(file.filename):
        return jsonify(error="Invalid file type. Allowed: png, jpg, jpeg, gif, svg, webp"), 400

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    ext = file.filename.rsplit(".", 1)[1].lower()
    filename = f"school_{g.user['school_id']}_logo_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    logo_url = f"/uploads/{filename}"
    with DB() as db:
        db.execute("UPDATE schools SET logo_url = %s, updated_at = NOW() WHERE id = %s",
                   [logo_url, g.user["school_id"]])

    return jsonify(logo_url=logo_url, message="Logo uploaded")


# ── Categories ─────────────────────────────────────────────────────────────────

@admin_bp.route("/categories", methods=["GET"])
@require_auth
@require_admin
def list_categories():
    with DB() as db:
        cats = db.fetchall(
            """SELECT c.*, COUNT(l.id) as listing_count
               FROM categories c
               LEFT JOIN listings l ON l.category_id = c.id AND l.school_id = %s
               GROUP BY c.id ORDER BY c.name""",
            [g.user["school_id"]],
        )
    return jsonify(categories=[dict(c) for c in cats])


@admin_bp.route("/categories", methods=["POST"])
@require_auth
@require_admin
def create_category():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    icon = (data.get("icon") or "📦").strip()
    if not name:
        return jsonify(error="name is required"), 400

    slug = name.lower().replace(" ", "-").replace("&", "and")
    with DB() as db:
        existing = db.fetchone("SELECT id FROM categories WHERE slug = %s", [slug])
        if existing:
            return jsonify(error="A category with that name already exists"), 400
        cat = db.fetchone(
            "INSERT INTO categories (name, slug, icon) VALUES (%s, %s, %s) RETURNING *",
            [name, slug, icon],
        )
    return jsonify(category=dict(cat)), 201


@admin_bp.route("/categories/<int:cat_id>", methods=["PUT"])
@require_auth
@require_admin
def update_category(cat_id):
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    icon = (data.get("icon") or "").strip()
    if not name:
        return jsonify(error="name is required"), 400

    with DB() as db:
        cat = db.fetchone(
            "UPDATE categories SET name = %s, icon = %s WHERE id = %s RETURNING *",
            [name, icon, cat_id],
        )
    if not cat:
        return jsonify(error="Category not found"), 404
    return jsonify(category=dict(cat))


@admin_bp.route("/categories/<int:cat_id>", methods=["DELETE"])
@require_auth
@require_admin
def delete_category(cat_id):
    with DB() as db:
        in_use = db.fetchval(
            "SELECT COUNT(*) FROM listings WHERE category_id = %s AND status != 'removed'", [cat_id]
        )
        if in_use and in_use > 0:
            return jsonify(error=f"Cannot delete — {in_use} active listing(s) use this category"), 400
        db.execute("DELETE FROM categories WHERE id = %s", [cat_id])
    return jsonify(message="Category deleted")
