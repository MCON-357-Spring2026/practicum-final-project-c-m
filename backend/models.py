from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)

    sightings = db.relationship(
        "Sighting",
        backref="user",
        lazy=True,
        cascade="all, delete-orphan",
    )

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
        }


class Sighting(db.Model):
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    species = db.Column(db.String(150), nullable=False)
    location = db.Column(db.String(250), nullable=False)
    date = db.Column(db.Date, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    wikipedia_summary = db.Column(db.Text, nullable=True)
    image_url = db.Column(db.String(500), nullable=True)
    audio_url = db.Column(db.String(500), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "species": self.species,
            "location": self.location,
            "date": self.date.isoformat() if self.date else None,
            "notes": self.notes,
            "wikipedia_summary": self.wikipedia_summary,
            "image_url": self.image_url,
            "audio_url": self.audio_url,
        }
