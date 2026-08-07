Backend scaffold for Smart e-District Delhi

Quick start:
1. cd backend
2. copy .env.example -> .env and set MONGODB_URI and JWT_SECRET
3. npm install
4. npm run dev

This scaffold includes minimal auth routes, scheme model and a stubbed eligibility service. Expand controllers and services as implementation proceeds.

Promoting a user to admin (seed script)

A convenience script is provided to add the 'admin' role to an existing user or create a new admin user.

Usage (option A - CLI args):
  cd backend
  npm run seed-admin -- you@example.com yourPassword

Usage (option B - env vars):
  ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourPassword npm run seed-admin

Behavior:
- If a user with the given email exists, the script adds the 'admin' role (if not already present).
- If the user does not exist, the script creates a new user with the provided password and roles:['admin'].

Notes:
- Do NOT run this with a real production secret password in an untrusted environment.
- The script uses MONGODB_URI from your .env or environment.

Seeding schemes dataset

A seed script is provided to insert a JSON array of schemes into the existing `schemes` collection.
It is idempotent: schemes are inserted only if a document with the same `title` does not already exist.

Usage:
  cd backend
  npm run seed-schemes -- ./data/schemes.json

Or provide a full path to the JSON file:
  npm run seed-schemes -- /path/to/schemes.json

The dataset file must be a JSON array of objects. The script maps fields to the existing Scheme model:
  code, title, description, categories (array), department, eligibilityRules, requiredDocuments,
  steps (array of {title,description,link}), officialLink, published

Behavior and safety:
- The script WILL NOT update or delete existing records. It only inserts missing records by title.
- It preserves null or empty fields present in the JSON (e.g., eligibilityRules=null).
- If an item in the JSON has no `code`, the script will generate a URL-safe slug for `code`.

Verification:
- The script prints inserted and skipped titles and the final counts.
- Example: after running, the command shows `Seed complete. inserted=15, skipped=0`.

To verify via the API (requires server running):
  curl -s 'http://localhost:4000/api/schemes?limit=200' | jq '.schemes | length'

Or list inserted titles (server running):
  curl -s 'http://localhost:4000/api/schemes?limit=200' | jq '.schemes | map(.title)'

To verify directly in MongoDB (local):
  mongo 'mongodb://localhost:27017/smartedistrictdelhi' --eval "db.schemes.find({title: {
    $in: [/* paste titles from your JSON here as quoted strings */]
  }}).count()"
