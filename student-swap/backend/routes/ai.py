import os
import json
import re
import anthropic
from flask import Blueprint, jsonify
from config.database import DB
from middleware.auth import require_auth

ai_bp = Blueprint("ai", __name__)

_client = None


def _get_client():
    global _client
    if _client is None:
        key = os.environ.get("ANTHROPIC_API_KEY")
        if not key:
            return None
        _client = anthropic.Anthropic(api_key=key)
    return _client


@ai_bp.route("/listings/<int:listing_id>/compare", methods=["GET"])
@require_auth
def compare_listing(listing_id):
    ai_client = _get_client()
    if not ai_client:
        return jsonify(error="AI analysis is not configured on this server"), 503

    with DB() as db:
        listing = db.fetchone(
            """SELECT l.title, l.description, l.price, l.condition, c.name as category
               FROM listings l
               LEFT JOIN categories c ON l.category_id = c.id
               WHERE l.id = %s AND l.status = 'active'""",
            [listing_id],
        )

    if not listing:
        return jsonify(error="Listing not found"), 404

    listing = dict(listing)
    condition_labels = {"new": "Brand New", "like_new": "Like New", "good": "Good", "fair": "Fair", "poor": "Poor"}
    condition = condition_labels.get(listing.get("condition"), listing.get("condition") or "unknown")
    description = (listing.get("description") or "No description")[:400]

    prompt = f"""You are a market price analyst for a New Zealand school student marketplace.

Item listed for sale:
- Title: {listing['title']}
- Category: {listing.get('category') or 'General'}
- Condition: {condition}
- Listed price: NZD ${float(listing['price']):.2f}
- Description: {description}

Analyse this item's market value in New Zealand (consider TradeMe, retail stores, and typical second-hand prices).

Respond with ONLY a valid JSON object and nothing else:
{{
  "market_low": <lowest typical price as a number>,
  "market_high": <highest typical price as a number>,
  "verdict": "<exactly one of: Exceptional Deal | Great Deal | Good Value | Fair Price | Priced High>",
  "savings_percent": <integer 0-95, how much % cheaper than market mid-price, 0 if not cheaper>,
  "key_insight": "<one sentence comparing the listing price to market>",
  "condition_note": "<one sentence on how the condition affects this item's value>",
  "buy_local_benefit": "<one short sentence about a unique benefit of buying within your school community>"
}}"""

    response = ai_client.messages.create(
        model="claude-opus-4-8",
        max_tokens=2048,
        thinking={"type": "adaptive"},
        messages=[{"role": "user", "content": prompt}],
    )

    text = next((b.text for b in response.content if b.type == "text"), "")

    try:
        analysis = json.loads(text.strip())
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            try:
                analysis = json.loads(m.group())
            except json.JSONDecodeError:
                return jsonify(error="AI returned an unexpected response, please try again"), 500
        else:
            return jsonify(error="AI returned an unexpected response, please try again"), 500

    return jsonify(listing_price=float(listing["price"]), analysis=analysis)
