from flask import Blueprint, request, jsonify, g
from config.database import DB
from middleware.auth import require_auth

recommendations_bp = Blueprint("recommendations", __name__)

WEIGHTS = {"view": 1, "like": 3, "purchase": 5}


@recommendations_bp.route("/", methods=["GET"])
@require_auth
def get_recommendations():
    limit = min(50, int(request.args.get("limit", 12)))
    user_id = g.user["id"]
    school_id = g.user["school_id"]

    with DB() as db:
        behavior_rows = db.fetchall(
            """SELECT category_id, behavior_type, COUNT(*) as count
               FROM user_behavior WHERE user_id = %s
               GROUP BY category_id, behavior_type""",
            [user_id],
        )

        category_scores = {}
        for row in behavior_rows:
            weight = WEIGHTS.get(row["behavior_type"], 0)
            cat_id = row["category_id"]
            category_scores[cat_id] = category_scores.get(cat_id, 0) + weight * int(row["count"])

        has_history = bool(category_scores)

        if has_history:
            interacted = db.fetchall(
                "SELECT DISTINCT listing_id FROM user_behavior WHERE user_id = %s", [user_id]
            )
            interacted_ids = [r["listing_id"] for r in interacted]

            top_cats = sorted(category_scores, key=category_scores.get, reverse=True)[:5]

            exclude_clause = ""
            exclude_params = []
            if interacted_ids:
                placeholders = ",".join(["%s"] * len(interacted_ids))
                exclude_clause = f"AND l.id NOT IN ({placeholders})"
                exclude_params = interacted_ids

            if top_cats:
                cat_placeholders = ",".join(["%s"] * len(top_cats))
                # Build CASE for relevance ordering
                case_parts = " ".join(
                    f"WHEN l.category_id = {cat_id} THEN {len(top_cats) - i}"
                    for i, cat_id in enumerate(top_cats)
                )

                rows = db.fetchall(
                    f"""SELECT l.id, l.title, l.price, l.condition, l.images, l.created_at, l.view_count,
                               c.name as category_name, c.slug as category_slug, c.icon as category_icon,
                               u.full_name as seller_name, u.avatar_url as seller_avatar,
                               CASE {case_parts} ELSE 0 END as relevance_score
                        FROM listings l
                        LEFT JOIN categories c ON l.category_id = c.id
                        JOIN users u ON l.seller_id = u.id
                        WHERE l.school_id = %s AND l.status = 'active' AND l.seller_id != %s
                          AND l.category_id IN ({cat_placeholders})
                          {exclude_clause}
                        ORDER BY relevance_score DESC, l.created_at DESC
                        LIMIT %s""",
                    [school_id, user_id] + top_cats + exclude_params + [limit],
                )
            else:
                rows = []

            listings = [dict(r) for r in rows]

            # Backfill if not enough
            if len(listings) < limit:
                existing_ids = interacted_ids + [l["id"] for l in listings]
                needed = limit - len(listings)
                backfill_exclude = ""
                bf_params = []
                if existing_ids:
                    ph = ",".join(["%s"] * len(existing_ids))
                    backfill_exclude = f"AND l.id NOT IN ({ph})"
                    bf_params = existing_ids

                bf_rows = db.fetchall(
                    f"""SELECT l.id, l.title, l.price, l.condition, l.images, l.created_at, l.view_count,
                               c.name as category_name, c.slug as category_slug, c.icon as category_icon,
                               u.full_name as seller_name, u.avatar_url as seller_avatar, 0 as relevance_score
                        FROM listings l
                        LEFT JOIN categories c ON l.category_id = c.id
                        JOIN users u ON l.seller_id = u.id
                        WHERE l.school_id = %s AND l.status = 'active' AND l.seller_id != %s
                          {backfill_exclude}
                        ORDER BY l.created_at DESC LIMIT %s""",
                    [school_id, user_id] + bf_params + [needed],
                )
                listings += [dict(r) for r in bf_rows]
        else:
            rows = db.fetchall(
                """SELECT l.id, l.title, l.price, l.condition, l.images, l.created_at, l.view_count,
                          c.name as category_name, c.slug as category_slug, c.icon as category_icon,
                          u.full_name as seller_name, u.avatar_url as seller_avatar, 0 as relevance_score
                   FROM listings l
                   LEFT JOIN categories c ON l.category_id = c.id
                   JOIN users u ON l.seller_id = u.id
                   WHERE l.school_id = %s AND l.status = 'active' AND l.seller_id != %s
                   ORDER BY l.created_at DESC LIMIT %s""",
                [school_id, user_id, limit],
            )
            listings = [dict(r) for r in rows]

    return jsonify(recommendations=listings, personalized=has_history)


@recommendations_bp.route("/stats", methods=["GET"])
@require_auth
def behavior_stats():
    with DB() as db:
        rows = db.fetchall(
            "SELECT behavior_type, COUNT(*) as count FROM user_behavior WHERE user_id = %s GROUP BY behavior_type",
            [g.user["id"]],
        )
    return jsonify(stats=[dict(r) for r in rows])
