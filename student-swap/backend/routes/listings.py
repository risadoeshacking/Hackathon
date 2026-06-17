can import os
import uuid
from flask import Blueprint, request, jsonify, g, current_app
from werkzeug.utils import secure_filename
from config.database import DB
from middleware.auth import require_auth

listings_bp = Blueprint("listings", __name__)


@listings_bp.route("/categories", methods=["GET"])
@require_auth
def get_categories():
    with DB() as db:
        cats = db.fetchall("SELECT * FROM categories ORDER BY name")
    return jsonify(categories=[dict(c) for c in cats])


@listings_bp.route("/", methods=["GET"])
@require_auth
def get_listings():
    category = request.args.get("category")
    search = request.args.get("search")
    min_price = request.args.get("min_price")
    max_price = request.args.get("max_price")
    condition = request.args.get("condition")
    sort = request.args.get("sort", "newest")
    page = max(1, int(request.args.get("page", 1)))
    limit = min(50, int(request.args.get("limit", 20)))
    offset = (page - 1) * limit

    conditions = ["l.school_id = %s", "l.status = 'active'"]
    params = [g.user["school_id"]]

    if category:
        conditions.append("c.slug = %s")
        params.append(category)
    if search:
        conditions.append("(l.title ILIKE %s OR l.description ILIKE %s)")
        params.extend([f"%{search}%", f"%{search}%"])
    if min_price:
        conditions.append("l.price >= %s")
        params.append(float(min_price))
    if max_price:
        conditions.append("l.price <= %s")
        params.append(float(max_price))
    if condition:
        conditions.append("l.condition = %s")
        params.append(condition)

    where = " AND ".join(conditions)
    order_map = {
        "newest": "l.created_at DESC",
        "oldest": "l.created_at ASC",
        "price_asc": "l.price ASC",
        "price_desc": "l.price DESC",
        "popular": "l.view_count DESC",
    }
    order_by = order_map.get(sort, "l.created_at DESC")

    with DB() as db:
        total = db.fetchval(
            f"SELECT COUNT(*) FROM listings l LEFT JOIN categories c ON l.category_id = c.id WHERE {where}",
            params,
        )
        rows = db.fetchall(
            f"""SELECT l.id, l.title, l.price, l.condition, l.images, l.status, l.view_count, l.created_at,
                       c.name as category_name, c.slug as category_slug, c.icon as category_icon,
                       u.id as seller_id, u.full_name as seller_name, u.avatar_url as seller_avatar
                FROM listings l
                LEFT JOIN categories c ON l.category_id = c.id
                JOIN users u ON l.seller_id = u.id
                WHERE {where}
                ORDER BY {order_by}
                LIMIT %s OFFSET %s""",
            params + [limit, offset],
        )

    return jsonify(
        listings=[dict(r) for r in rows],
        total=total,
        page=page,
        totalPages=max(1, -(-total // limit)),
    )


@listings_bp.route("/upload-image", methods=["POST"])
@require_auth
def upload_listing_image():
    if 'image' not in request.files:
        return jsonify(error="No image file provided"), 400
    file = request.files['image']
    if not file.filename:
        return jsonify(error="No file selected"), 400
    ext = os.path.splitext(secure_filename(file.filename))[1].lower()
    if ext not in {'.jpg', '.jpeg', '.png', '.webp', '.gif'}:
        return jsonify(error="File must be jpg, png, webp, or gif"), 400
    filename = f"listing_{uuid.uuid4().hex}{ext}"
    upload_dir = os.path.join(
        current_app.root_path, current_app.config.get('UPLOAD_FOLDER', 'uploads'))
    os.makedirs(upload_dir, exist_ok=True)
    file.save(os.path.join(upload_dir, filename))
    base_url = request.host_url.rstrip('/')
    return jsonify(url=f"{base_url}/uploads/{filename}"), 201


@listings_bp.route("/<int:listing_id>", methods=["GET"])
@require_auth
def get_listing(listing_id):
    with DB() as db:
        row = db.fetchone(
            """SELECT l.*, c.name as category_name, c.slug as category_slug, c.icon as category_icon,
                      u.id as seller_id, u.full_name as seller_name, u.avatar_url as seller_avatar,
                      u.email as seller_email,
                      (SELECT COUNT(*) FROM user_behavior WHERE listing_id = l.id AND behavior_type = 'like') as like_count,
                      (SELECT behavior_type FROM user_behavior WHERE listing_id = l.id AND user_id = %s AND behavior_type = 'like' LIMIT 1) as user_liked,
                      EXISTS(SELECT 1 FROM watchlist WHERE user_id = %s AND listing_id = l.id) as user_watchlisted
               FROM listings l
               LEFT JOIN categories c ON l.category_id = c.id
               JOIN users u ON l.seller_id = u.id
               WHERE l.id = %s AND l.school_id = %s""",
            [g.user["id"], g.user["id"], listing_id, g.user["school_id"]],
        )

        if not row:
            return jsonify(error="Listing not found"), 404

        listing = dict(row)
        if listing["status"] != "active" and listing["seller_id"] != g.user["id"] and g.user["role"] != "admin":
            return jsonify(error="Listing not found"), 404

        if listing["seller_id"] != g.user["id"]:
            db.execute(
                """INSERT INTO user_behavior (user_id, listing_id, category_id, behavior_type)
                   VALUES (%s, %s, %s, 'view') ON CONFLICT DO NOTHING""",
                [g.user["id"], listing_id, listing["category_id"]],
            )
            db.execute(
                "UPDATE listings SET view_count = view_count + 1 WHERE id = %s", [listing_id])

    return jsonify(listing=listing)


@listings_bp.route("/", methods=["POST"])
@require_auth
def create_listing():
    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    price = data.get("price")
    category_id = data.get("category_id")

    if not title or price is None or not category_id:
        return jsonify(error="title, price, and category_id are required"), 400

    images = data.get("images", [])
    if isinstance(images, str):
        images = [images]
    images = [i for i in images if i]

    with DB() as db:
        row = db.fetchone(
            """INSERT INTO listings (seller_id, school_id, category_id, title, description, price, condition, images, status)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s::text[], 'pending')
               RETURNING *""",
            [g.user["id"], g.user["school_id"], category_id, title,
             data.get("description"), float(price), data.get("condition"), images],
        )

    return jsonify(listing=dict(row), message="Listing submitted for approval"), 201


@listings_bp.route("/<int:listing_id>", methods=["PUT"])
@require_auth
def update_listing(listing_id):
    data = request.get_json() or {}
    with DB() as db:
        existing = db.fetchone(
            "SELECT * FROM listings WHERE id = %s", [listing_id])
        if not existing:
            return jsonify(error="Listing not found"), 404
        if existing["seller_id"] != g.user["id"] and g.user["role"] != "admin":
            return jsonify(error="Not authorized"), 403

        images = data.get("images", existing["images"])
        if isinstance(images, str):
            images = [images]

        row = db.fetchone(
            """UPDATE listings SET
               title = COALESCE(%s, title),
               description = COALESCE(%s, description),
               price = COALESCE(%s, price),
               condition = COALESCE(%s, condition),
               category_id = COALESCE(%s, category_id),
               images = %s::text[]
               WHERE id = %s RETURNING *""",
            [data.get("title"), data.get("description"),
             float(data["price"]) if data.get("price") else None,
             data.get("condition"), data.get("category_id"), images, listing_id],
        )

    return jsonify(listing=dict(row))


@listings_bp.route("/<int:listing_id>", methods=["DELETE"])
@require_auth
def delete_listing(listing_id):
    with DB() as db:
        existing = db.fetchone(
            "SELECT seller_id FROM listings WHERE id = %s", [listing_id])
        if not existing:
            return jsonify(error="Listing not found"), 404
        if existing["seller_id"] != g.user["id"] and g.user["role"] != "admin":
            return jsonify(error="Not authorized"), 403
        db.execute(
            "UPDATE listings SET status = 'removed' WHERE id = %s", [listing_id])
    return jsonify(message="Listing removed")


@listings_bp.route("/<int:listing_id>/sold", methods=["PATCH"])
@require_auth
def mark_sold(listing_id):
    with DB() as db:
        row = db.fetchone(
            "SELECT seller_id FROM listings WHERE id = %s", [listing_id])
        if not row:
            return jsonify(error="Listing not found"), 404
        if row["seller_id"] != g.user["id"]:
            return jsonify(error="Not authorized"), 403
        db.execute(
            "UPDATE listings SET status = 'sold' WHERE id = %s", [listing_id])
    return jsonify(message="Listing marked as sold")


@listings_bp.route("/<int:listing_id>/like", methods=["POST"])
@require_auth
def toggle_like(listing_id):
    with DB() as db:
        listing = db.fetchone(
            "SELECT id, category_id FROM listings WHERE id = %s AND status = 'active'", [listing_id])
        if not listing:
            return jsonify(error="Listing not found"), 404

        existing = db.fetchone(
            "SELECT id FROM user_behavior WHERE user_id = %s AND listing_id = %s AND behavior_type = 'like'",
            [g.user["id"], listing_id],
        )
        if existing:
            db.execute(
                "DELETE FROM user_behavior WHERE user_id = %s AND listing_id = %s AND behavior_type = 'like'",
                [g.user["id"], listing_id],
            )
            return jsonify(liked=False)
        else:
            db.execute(
                "INSERT INTO user_behavior (user_id, listing_id, category_id, behavior_type) VALUES (%s, %s, %s, 'like') ON CONFLICT DO NOTHING",
                [g.user["id"], listing_id, listing["category_id"]],
            )
            return jsonify(liked=True)


@listings_bp.route("/<int:listing_id>/report", methods=["POST"])
@require_auth
def report_listing(listing_id):
    data = request.get_json() or {}
    reason = (data.get("reason") or "").strip()
    if not reason:
        return jsonify(error="Reason is required"), 400

    with DB() as db:
        if not db.fetchone("SELECT id FROM listings WHERE id = %s", [listing_id]):
            return jsonify(error="Listing not found"), 404
        db.execute(
            "INSERT INTO moderation_reports (listing_id, reporter_id, reason) VALUES (%s, %s, %s)",
            [listing_id, g.user["id"], reason],
        )
    return jsonify(message="Report submitted. Our team will review it."), 201


# ── Watchlist ──────────────────────────────────────────────────

@listings_bp.route("/watchlist", methods=["GET"])
@require_auth
def get_watchlist():
    with DB() as db:
        rows = db.fetchall(
            """SELECT l.id, l.title, l.price, l.condition, l.images, l.status, l.created_at,
                      c.name as category_name, c.slug as category_slug, c.icon as category_icon,
                      u.full_name as seller_name, u.avatar_url as seller_avatar,
                      w.created_at as watchlisted_at
               FROM watchlist w
               JOIN listings l ON w.listing_id = l.id
               LEFT JOIN categories c ON l.category_id = c.id
               JOIN users u ON l.seller_id = u.id
               WHERE w.user_id = %s AND l.status = 'active'
               ORDER BY w.created_at DESC""",
            [g.user["id"]],
        )
    return jsonify(listings=[dict(r) for r in rows])


@listings_bp.route("/<int:listing_id>/watchlist", methods=["POST"])
@require_auth
def toggle_watchlist(listing_id):
    with DB() as db:
        listing = db.fetchone(
            "SELECT id FROM listings WHERE id = %s AND status = 'active'",
            [listing_id],
        )
        if not listing:
            return jsonify(error="Listing not found"), 404

        existing = db.fetchone(
            "SELECT id FROM watchlist WHERE user_id = %s AND listing_id = %s",
            [g.user["id"], listing_id],
        )
        if existing:
            db.execute(
                "DELETE FROM watchlist WHERE user_id = %s AND listing_id = %s",
                [g.user["id"], listing_id],
            )
            return jsonify(watchlisted=False)
        else:
            db.execute(
                "INSERT INTO watchlist (user_id, listing_id) VALUES (%s, %s) ON CONFLICT DO NOTHING",
                [g.user["id"], listing_id],
            )
            return jsonify(watchlisted=True)
