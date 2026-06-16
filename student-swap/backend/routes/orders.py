from flask import Blueprint, request, jsonify, g
from config.database import DB
from middleware.auth import require_auth

orders_bp = Blueprint("orders", __name__)


@orders_bp.route("/", methods=["POST"])
@require_auth
def create_order():
    data = request.get_json() or {}
    listing_id = data.get("listing_id")
    if not listing_id:
        return jsonify(error="listing_id is required"), 400

    with DB() as db:
        listing = db.fetchone("SELECT id, seller_id, school_id, status FROM listings WHERE id = %s", [listing_id])
        if not listing:
            return jsonify(error="Listing not found"), 404
        if listing["status"] != "active":
            return jsonify(error="Listing is not available"), 400
        if listing["seller_id"] == g.user["id"]:
            return jsonify(error="You cannot buy your own listing"), 400
        if listing["school_id"] != g.user["school_id"]:
            return jsonify(error="Cross-school purchases not allowed"), 403

        if db.fetchone(
            "SELECT id FROM orders WHERE listing_id = %s AND buyer_id = %s AND status = 'pending'",
            [listing_id, g.user["id"]],
        ):
            return jsonify(error="You already have a pending order for this item"), 400

        order = db.fetchone(
            "INSERT INTO orders (listing_id, buyer_id, seller_id, notes) VALUES (%s, %s, %s, %s) RETURNING *",
            [listing_id, g.user["id"], listing["seller_id"], data.get("notes")],
        )

        cat = db.fetchone("SELECT category_id FROM listings WHERE id = %s", [listing_id])
        db.execute(
            "INSERT INTO user_behavior (user_id, listing_id, category_id, behavior_type) VALUES (%s, %s, %s, 'purchase') ON CONFLICT DO NOTHING",
            [g.user["id"], listing_id, cat["category_id"] if cat else None],
        )

    return jsonify(order=dict(order)), 201


@orders_bp.route("/", methods=["GET"])
@require_auth
def get_my_orders():
    role = request.args.get("role", "buyer")
    field = "o.seller_id" if role == "seller" else "o.buyer_id"

    with DB() as db:
        rows = db.fetchall(
            f"""SELECT o.id, o.status, o.notes, o.created_at,
                       l.id as listing_id, l.title, l.price, l.images, l.condition,
                       buyer.full_name as buyer_name, buyer.email as buyer_email,
                       seller.full_name as seller_name, seller.email as seller_email
                FROM orders o
                JOIN listings l ON o.listing_id = l.id
                JOIN users buyer ON o.buyer_id = buyer.id
                JOIN users seller ON o.seller_id = seller.id
                WHERE {field} = %s
                ORDER BY o.created_at DESC""",
            [g.user["id"]],
        )
    return jsonify(orders=[dict(r) for r in rows])


@orders_bp.route("/<int:order_id>", methods=["GET"])
@require_auth
def get_order(order_id):
    with DB() as db:
        row = db.fetchone(
            """SELECT o.*, l.title, l.price, l.images, l.condition,
                      buyer.full_name as buyer_name, buyer.email as buyer_email,
                      seller.full_name as seller_name, seller.email as seller_email
               FROM orders o
               JOIN listings l ON o.listing_id = l.id
               JOIN users buyer ON o.buyer_id = buyer.id
               JOIN users seller ON o.seller_id = seller.id
               WHERE o.id = %s AND (o.buyer_id = %s OR o.seller_id = %s)""",
            [order_id, g.user["id"], g.user["id"]],
        )
    if not row:
        return jsonify(error="Order not found"), 404
    return jsonify(order=dict(row))


@orders_bp.route("/<int:order_id>/status", methods=["PATCH"])
@require_auth
def update_status(order_id):
    data = request.get_json() or {}
    new_status = data.get("status")

    valid_transitions = {
        "seller": {"pending": ["completed", "cancelled"]},
        "buyer": {"pending": ["cancelled"]},
    }

    with DB() as db:
        order = db.fetchone("SELECT * FROM orders WHERE id = %s", [order_id])
        if not order:
            return jsonify(error="Order not found"), 404

        is_seller = order["seller_id"] == g.user["id"]
        is_buyer = order["buyer_id"] == g.user["id"]
        if not is_seller and not is_buyer:
            return jsonify(error="Not authorized"), 403

        role = "seller" if is_seller else "buyer"
        allowed = valid_transitions[role].get(order["status"], [])
        if new_status not in allowed:
            return jsonify(error=f"Cannot transition from {order['status']} to {new_status}"), 400

        updated = db.fetchone(
            "UPDATE orders SET status = %s WHERE id = %s RETURNING *",
            [new_status, order_id],
        )

        if new_status == "completed":
            db.execute("UPDATE listings SET status = 'sold' WHERE id = %s", [order["listing_id"]])

    return jsonify(order=dict(updated))
