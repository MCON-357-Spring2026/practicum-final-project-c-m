import os
from datetime import date, datetime
from urllib.parse import quote

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash

from models import Sighting, User, db

load_dotenv()

app = Flask(__name__)
CORS(app)
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)

with app.app_context():
    db.create_all()


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "message": "Birdwatcher's Diary API is running",
    })


@app.route("/api/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not username or not email or not password:
        return jsonify({"error": "username, email, and password are required"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "username already taken"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "email already registered"}), 400

    user = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password),
    )
    db.session.add(user)
    db.session.commit()

    return jsonify(user.to_dict()), 201


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({"error": "username and password are required"}), 401

    user = User.query.filter_by(username=username).first()
    if user is None or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "invalid username or password"}), 401

    return jsonify({"message": "login successful", "user": user.to_dict()}), 200


def fetch_wikipedia_data(species_name):
    """Fetch a summary and image for a species from Wikipedia.

    Returns a (summary, image_url) tuple. Either or both may be None if the
    page isn't found, the request fails, or the fields are missing — the
    caller can save the sighting regardless.
    """
    url = (
        "https://en.wikipedia.org/api/rest_v1/page/summary/"
        f"{quote(species_name)}"
    )
    # Wikipedia requires a descriptive User-Agent or it responds with 403.
    headers = {
        "User-Agent": (
            "BirdwatchersDiary/1.0 "
            "(https://github.com/birdwatchers-diary; contact: admin@example.com)"
        )
    }
    try:
        response = requests.get(url, headers=headers, timeout=5)
        response.raise_for_status()
        data = response.json()
        summary = data.get("extract")
        image_url = (data.get("originalimage") or {}).get("source")
        return summary, image_url
    except (requests.RequestException, ValueError):
        # Network error, timeout, 404 (page not found), or invalid JSON.
        return None, None


def fetch_bird_audio(species_name):
    """Fetch an audio recording URL for a species from Xeno-Canto.

    Uses Xeno-Canto API v3, which requires a personal API key supplied via
    the XENO_CANTO_API_KEY environment variable (v2 was shut down in 2025).
    Returns the URL of the first available recording, or None if no key is
    configured, no recordings are found, or the request fails.
    """
    api_key = os.getenv("XENO_CANTO_API_KEY")
    if not api_key:
        # No key configured — skip enrichment rather than erroring out.
        return None

    # v3 only accepts tag-based queries. Users log common names, so search by
    # the English-name tag, e.g. en:"Northern Cardinal".
    query = f'en:"{species_name}"'
    url = (
        "https://xeno-canto.org/api/3/recordings"
        f"?query={quote(query)}&key={api_key}"
    )
    try:
        response = requests.get(url, timeout=8)
        response.raise_for_status()
        data = response.json()
        recordings = data.get("recordings") or []
        if not recordings:
            return None
        file_url = recordings[0].get("file")
        if not file_url:
            return None
        # Xeno-Canto sometimes returns protocol-relative URLs ("//...").
        if file_url.startswith("//"):
            file_url = "https:" + file_url
        return file_url
    except (requests.RequestException, ValueError):
        # Network error, timeout, bad status, or invalid JSON.
        return None


def _parse_date(value):
    if isinstance(value, date):
        return value
    if not isinstance(value, str) or not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


@app.route("/api/sightings", methods=["POST"])
def create_sighting():
    data = request.get_json(silent=True) or {}

    user_id = data.get("user_id")
    species = (data.get("species") or "").strip()
    location = (data.get("location") or "").strip()
    date_value = _parse_date(data.get("date"))
    notes = data.get("notes")

    if not user_id or not species or not location or date_value is None:
        return jsonify({
            "error": "user_id, species, location, and date (YYYY-MM-DD) are required",
        }), 400

    if User.query.get(user_id) is None:
        return jsonify({"error": "user not found"}), 404

    # Enrich the sighting with external data before saving.
    wikipedia_summary, image_url = fetch_wikipedia_data(species)
    audio_url = fetch_bird_audio(species)

    sighting = Sighting(
        user_id=user_id,
        species=species,
        location=location,
        date=date_value,
        notes=notes,
        wikipedia_summary=wikipedia_summary,
        image_url=image_url,
        audio_url=audio_url,
    )
    db.session.add(sighting)
    db.session.commit()

    return jsonify(sighting.to_dict()), 201


@app.route("/api/sightings/user/<int:user_id>", methods=["GET"])
def list_sightings(user_id):
    if User.query.get(user_id) is None:
        return jsonify({"error": "user not found"}), 404

    sightings = (
        Sighting.query.filter_by(user_id=user_id)
        .order_by(Sighting.date.desc(), Sighting.id.desc())
        .all()
    )
    return jsonify([s.to_dict() for s in sightings]), 200


@app.route("/api/sightings/<int:sighting_id>", methods=["PUT"])
def update_sighting(sighting_id):
    sighting = Sighting.query.get(sighting_id)
    if sighting is None:
        return jsonify({"error": "sighting not found"}), 404

    data = request.get_json(silent=True) or {}

    if "species" in data:
        species = (data.get("species") or "").strip()
        if not species:
            return jsonify({"error": "species cannot be empty"}), 400
        sighting.species = species

    if "location" in data:
        location = (data.get("location") or "").strip()
        if not location:
            return jsonify({"error": "location cannot be empty"}), 400
        sighting.location = location

    if "date" in data:
        parsed = _parse_date(data.get("date"))
        if parsed is None:
            return jsonify({"error": "date must be in YYYY-MM-DD format"}), 400
        sighting.date = parsed

    if "notes" in data:
        sighting.notes = data.get("notes")

    if "wikipedia_summary" in data:
        sighting.wikipedia_summary = data.get("wikipedia_summary")

    if "image_url" in data:
        sighting.image_url = data.get("image_url")

    db.session.commit()
    return jsonify(sighting.to_dict()), 200


@app.route("/api/sightings/<int:sighting_id>", methods=["DELETE"])
def delete_sighting(sighting_id):
    sighting = Sighting.query.get(sighting_id)
    if sighting is None:
        return jsonify({"error": "sighting not found"}), 404

    db.session.delete(sighting)
    db.session.commit()
    return jsonify({"message": "sighting deleted", "id": sighting_id}), 200


if __name__ == "__main__":
    app.run(debug=True)
