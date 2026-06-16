from flask import Blueprint, request, jsonify, g
from config.database import DB
from middleware.auth import require_auth

users_bp = Blueprint("users", __name__)


@users_bp.route("/profile", methods=["GET"])
@require_auth
def get_profile():
    with DB() as db:
        user = db.fetchone(
            """SELECT u.id, u.email, u.full_name, u.avatar_url, u.created_at, s.name as school_name,
                      (SELECT COUNT(*) FROM listings WHERE seller_id = u.id AND status = 'active') as active_listings,
                      (SELECT COUNT(*) FROM listings WHERE seller_id = u.id AND status = 'sold') as sold_listings,
                      (SELECT COUNT(*) FROM orders WHERE buyer_id = u.id AND status = 'completed') as purchases
               FROM users u JOIN schools s ON u.school_id = s.id
               WHERE u.id = %s""",
            [g.user["id"]],
        )
    return jsonify(user=dict(user))


@users_bp.route("/profile", methods=["PUT"])
@require_auth
def update_profile():
    data = request.get_json() or {}
    with DB() as db:
        row = db.fetchone(
            """UPDATE users SET
               full_name = COALESCE(%s, full_name),
               avatar_url = COALESCE(%s, avatar_url)
               WHERE id = %s
               RETURNING id, email, full_name, avatar_url, role""",
            [data.get("full_name"), data.get("avatar_url"), g.user["id"]],
        )
    return jsonify(user=dict(row))


@users_bp.route("/my-listings", methods=["GET"])
@require_auth
def get_my_listings():
    status = request.args.get("status")
    params = [g.user["id"]]
    where = "l.seller_id = %s"
    if status:
        where += " AND l.status = %s"
        params.append(status)

    with DB() as db:
        rows = db.fetchall(
            f"""SELECT l.*, c.name as category_name, c.slug as category_slug, c.icon as category_icon,
                       (SELECT COUNT(*) FROM orders WHERE listing_id = l.id) as order_count
                FROM listings l LEFT JOIN categories c ON l.category_id = c.id
                WHERE {where} ORDER BY l.created_at DESC""",
            params,
        )
    return jsonify(listings=[dict(r) for r in rows])


@users_bp.route("/liked", methods=["GET"])
@require_auth
def get_liked():
    with DB() as db:
        rows = db.fetchall(
            """SELECT l.id, l.title, l.price, l.condition, l.images, l.status, l.created_at,
                      c.name as category_name, c.slug as category_slug, c.icon as category_icon,
                      u.full_name as seller_name
               FROM user_behavior ub
               JOIN listings l ON ub.listing_id = l.id
               LEFT JOIN categories c ON l.category_id = c.id
               JOIN users u ON l.seller_id = u.id
               WHERE ub.user_id = %s AND ub.behavior_type = 'like' AND l.status = 'active'
               ORDER BY ub.created_at DESC""",
            [g.user["id"]],
        )
    return jsonify(listings=[dict(r) for r in rows])


@users_bp.route("/<int:user_id>", methods=["GET"])
@require_auth
def get_public_profile(user_id):
    with DB() as db:
        user = db.fetchone(
            """SELECT u.id, u.full_name, u.avatar_url, u.created_at, s.name as school_name,
                      (SELECT COUNT(*) FROM listings WHERE seller_id = u.id AND status = 'active') as active_listings,
                      (SELECT COUNT(*) FROM listings WHERE seller_id = u.id AND status = 'sold') as sold_listings
               FROM users u JOIN schools s ON u.school_id = s.id
               WHERE u.id = %s AND u.school_id = %s AND u.is_active = true""",
            [user_id, g.user["school_id"]],
        )
    if not user:
        return jsonify(error="User not found"), 404
    return jsonify(user=dict(user))


@users_bp.route("/<int:user_id>/listings", methods=["GET"])
@require_auth
def get_user_listings(user_id):
    with DB() as db:
        rows = db.fetchall(
            """SELECT l.id, l.title, l.price, l.condition, l.images, l.status, l.created_at,
                      c.name as category_name, c.slug as category_slug, c.icon as category_icon
               FROM listings l LEFT JOIN categories c ON l.category_id = c.id
               WHERE l.seller_id = %s AND l.school_id = %s AND l.status = 'active'
               ORDER BY l.created_at DESC""",
            [user_id, g.user["school_id"]],
        )
    return jsonify(listings=[dict(r) for r in rows])
