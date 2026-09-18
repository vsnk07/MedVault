# MedValut — Bharat Unified Health Records Platform

A **Government of India** web application that links every citizen's medical records to their
12-digit **Aadhaar** identity so that in an emergency (e.g. an accident requiring immediate
surgery), any authorized hospital can instantly access the patient's blood group, allergies,
and full medical history.

## The Problem It Solves
When someone has an accident and needs immediate surgery, their medical reports are often not
available at that moment. Blood group, allergies, and pre-existing conditions are critical —
a wrong transfusion or an un-noted allergy can be fatal. MedValut fixes this:

- **Hospitals upload** reports/prescriptions to the patient's record after every treatment.
- **Any hospital** can look up a patient by Aadhaar and instantly see their history.
- **Patients** log in with Aadhaar to view all their own records.
- **Government** verifies registrations and keeps a full audit trail.

## Citizen Services (New)
- **Health Timeline** — every report and hospital visit merged into one chronological timeline
  (`/patient/timeline`).
- **Key Health Information** — a prominent emergency summary (blood group, allergies, critical
  conditions, emergency contacts) on the dashboard, hospital file view, and the public emergency page.
- **Health Record Comparison** — pick any two reports and compare them side-by-side; differing
  fields are highlighted automatically (`/patient/compare`).
- **Emergency QR Code** — a scannable code on the dashboard/profile carrying critical health data.
  Scanning it opens `/emergency/<aadhaar>` (public) so responders get the essentials instantly.
- **Checkup Reminders** — patients add/track hospital checkup, follow-up, and vaccination reminders
  (`/patient/reminders`); hospitals can schedule a follow-up reminder on the patient's behalf when
  uploading a report. Overdue reminders are flagged.

## Security Fixes
- Medical file attachments are no longer served from `public/` (they were previously public).
  Downloads now go through `/file/download/:id`, which requires an authenticated patient (owner),
  any hospital, or the government authority.
- A stale/undefined severity badge class and an admin-page password-hash leak were removed.
- Login now keeps your selected role on errors and honours the post-login redirect (`next`),
  an HTML 404/500 error page was added, and uploads are limited to 10 MB and safe file types.

## Roles / Portals
| Role | Login ID | Description |
|------|----------|-------------|
| Patient | Aadhaar number | View own medical records, health card, profile |
| Hospital | Hospital ID (e.g. `HOS-001`) | Emergency Aadhaar lookup, upload reports |
| Government | Username (`admin`) | Approve citizens, hospital registry, audit trail |

## Tech Stack
- **Node.js** (v22+ recommended, uses built-in `node:sqlite`)
- **Express** (web framework + sessions)
- **SQLite** via Node's experimental `node:sqlite` (no native compilation needed)
- **EJS** templates, custom government-themed CSS

## Run Locally

```bash
npm install       # install dependencies
node seed.js      # create & populate the demo database (optional, first run)
node server.js    # start server
```

Then open **http://localhost:3000**

(The database is created automatically by `server.js` if absent; run `node seed.js` to load demo data. To reset, delete the `data/medvalut.db` file and re-seed.)

## Demo Credentials
Seeded in `seed.js`:

| Role | ID | Password |
|------|----|----------|
| Patient (Ramesh Kumar) | `123456789012` | `pass123` |
| Patient (Priya Sharma) | `234567890123` | `pass123` |
| Patient (Amit Patel) | `345678901234` | `pass123` |
| Hospital (AIIMS Delhi) | `HOS-001` | `hos123` |
| Hospital (City Trauma Center) | `HOS-003` | `hos123` |
| Government Admin | `admin` | `admin123` |

## How to Demo the Emergency Flow
1. Log in as **Hospital** → `HOS-001` / `hos123`.
2. Go to **Patient Lookup**, enter Aadhaar `123456789012` (Ramesh — a road-accident fracture case).
3. Instantly see his **blood group (O+)**, **allergy (Penicillin)**, emergency contact, and past
   CT/X-Ray/surgery records — exactly what a surgeon needs before operating.
4. Click **View Full Medical File** or **Upload Report** to add a new record after treatment.
5. Log in as **Government** (`admin`/`admin123`) → **Audit Trail** to see every lookup/upload logged.

## Example Use Case (Seeded Data)
Ramesh Kumar was in a road accident and needed immediate surgery. The treating
**City Trauma Center** looked up his Aadhaar, found his blood group, penicillin allergy, and a
prior femur fracture X-ray — enabling safe, immediate surgery without waiting for physical records.

## Note
This is a **demonstration prototype** for educational purposes. In production it would integrate
with real Aadhaar authentication (UIDAI), encryption, HTTPS, and national health authority APIs.
