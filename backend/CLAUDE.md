# Birdwatcher's Diary

## Project Scope

A personal web application where birders can digitally log every sighting—recording species, date, location, and observations—building a beautiful, sortable archive of their birdwatching journey over time.

## Tech Stack Requirements

- **Backend:** Python + Flask (configured as a REST API returning JSON responses, no server-side Jinja templates).
- **Database:** PostgreSQL (to be hosted on Render/AWS).
- **Frontend:** Vue.js (Single Page Application in the `/frontend` directory).

## Core Features (Full CRUD)

1. **Log Sightings:** Record species, date, location, and detailed notes.
2. **Browse History:** View a complete, filterable archive of sightings sorted by date or species.
3. **Manage Entries:** Full ability to add, edit, and delete logs.

## Required Third-Party API Integrations

- **Wikipedia API:** To automatically fetch descriptions and summaries of logged bird species for the history archive views.
- **Wikimedia Commons API:** To programmatically fetch high-quality, open-source photos of the bird species to display alongside user logs.

## Potential Future API Integrations

- **Google Maps API:** To keep automatic location tags of each sighting.
- **OpenAI API:** To get facts about each bird.
