<p align="center">
  <img src="https://img.shields.io/badge/Platform-Web-2ea44f?style=for-the-badge" alt="Platform" />
  <img src="https://img.shields.io/badge/Node.js-22%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express" />
  <img src="https://img.shields.io/badge/SQLite-node%3A%3Asqlite-003B57?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
  <img src="https://img.shields.io/badge/Status-Demo/Prototype-yellow?style=for-the-badge" alt="Status" />
</p>

<h1 align="center">🩺 MedValut</h1>

<h3 align="center">Bharat Unified Health Records Platform</h3>

<p align="center">
  A <strong>Government of India</strong> style web application that links every citizen's medical
  records to their <strong>12-digit Aadhaar</strong> identity — so that in an emergency,
  any authorized hospital can instantly access the patient's blood group, allergies, and full
  medical history.
</p>

<p align="center">
  <code>🆘 Emergency lookup</code> &nbsp;•&nbsp;
  <code>📄 Unified health timeline</code> &nbsp;•&nbsp;
  <code>⚖️ Report comparison</code> &nbsp;•&nbsp;
  <code>📱 Scannable health QR</code> &nbsp;•&nbsp;
  <code>⏰ Checkup reminders</code> &nbsp;•&nbsp;
  <code>🛡️ Aadhaar-secured</code>
</p>

---

## 🚨 The Problem It Solves

When someone has an accident and needs immediate surgery, their medical reports are often not
available at that moment. **Blood group, allergies, and pre-existing conditions are critical** —
a wrong transfusion or an un-noted allergy can be fatal. **MedValut fixes this:**

- 🏥 **Hospitals upload** reports / prescriptions to the patient's record after every treatment.
- 🔎 **Any hospital** can look up a patient by Aadhaar and instantly see their history.
- 👤 **Patients** log in with Aadhaar to view all their own records.
- 🏛️ **Government** verifies registrations and keeps a full audit trail.

## ✨ Citizen Services

| Feature | Description |
|---|---|
| ⏳ **Health Timeline** | Every report and hospital visit merged into one chronological timeline (`/patient/timeline`). |
| ⚡ **Key Health Information** | A prominent emergency summary — blood group, allergies, critical conditions, emergency contacts — shown on the dashboard, hospital file view, and emergency page. |
| ⚖️ **Record Comparison** | Pick any two reports and compare them side-by-side; differing fields are highlighted automatically (`/patient/compare`). |
| 📱 **Emergency QR Code** | A scannable code on the dashboard/profile carrying critical health data. Scanning it opens `/emergency/<aadhaar>` so responders get the essentials instantly. |
| ⏰ **Checkup Reminders** | Track hospital checkups, follow-ups, and vaccinations (`/patient/reminders`). Hospitals can even schedule a follow-up on the patient's behalf. Overdue reminders are flagged. |

## 🔒 Security Highlights

- 🔐 Medical files are **no longer served publicly** — downloads go through `/file/download/:id`
  and require an authenticated **patient (owner)**, **hospital**, or **government authority**.
- ✅ A stale/undefined severity badge and an admin-page password-hash leak were removed.
- 🔁 Login keeps your selected role on errors and honours the post-login redirect (`next`).
- 🗄️ Custom HTML 404/500 error pages, plus uploads limited to **10 MB** and safe file types.

## 🎭 Roles / Portals

| Role | Login ID | Description |
|------|----------|-------------|
| 🧑‍⚕️ Patient | Aadhaar number | View own medical records, health card, profile |
| 🏥 Hospital | Hospital ID (e.g. `HOS-001`) | Emergency Aadhaar lookup, upload reports |
| 🏛️ Government | Username (`admin`) | Approve citizens, hospital registry, audit trail |

## 🧰 Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js v22+ (uses built-in `node:sqlite`) |
| **Web framework** | Express + sessions |
| **Database** | SQLite via `node:sqlite` — no native compilation needed |
| **Templates** | EJS + custom government-themed CSS |
| **Extras** | QR code generation, Multer file uploads |

## 🚀 Run Locally

```bash
# 1. Install dependencies
npm install

# 2. (Optional, first run) create & populate the demo database
node seed.js

# 3. Start the server
node server.js
```

Then open **http://localhost:3000** 🎉

> The database is created automatically by `server.js` if absent; run `node seed.js` to load demo
> data. To reset, delete the `data/medvalut.db` file and re-seed.

## 🔑 Demo Credentials

Seeded in `seed.js`:

| Role | ID | Password |
|------|----|----------|
| Patient (Ramesh Kumar) | `123456789012` | `pass123` |
| Patient (Priya Sharma) | `234567890123` | `pass123` |
| Patient (Amit Patel) | `345678901234` | `pass123` |
| Hospital (AIIMS Delhi) | `HOS-001` | `hos123` |
| Hospital (City Trauma Center) | `HOS-003` | `hos123` |
| Government Admin | `admin` | `admin123` |

## 🎬 How to Demo the Emergency Flow

1. 🔐 Log in as **Hospital** → `HOS-001` / `hos123`.
2. 🔎 Go to **Patient Lookup**, enter Aadhaar `123456789012` (Ramesh — a road-accident fracture case).
3. ⚡ Instantly see his **blood group (O+)**, **allergy (Penicillin)**, emergency contact, and past
   CT / X-Ray / surgery records — exactly what a surgeon needs before operating.
4. 📄 Click **View Full Medical File** or **Upload Report** to add a new record after treatment.
5. 🏛️ Log in as **Government** (`admin` / `admin123`) → **Audit Trail** to see every lookup/upload logged.

## 📖 Example Use Case (Seeded Data)

Ramesh Kumar was in a road accident and needed immediate surgery. The treating
**City Trauma Center** looked up his Aadhaar, found his blood group, penicillin allergy, and a
prior femur fracture X-ray — enabling safe, immediate surgery without waiting for physical records.

## ⚠️ Note

This is a **demonstration prototype** for educational purposes. In production it would integrate
with real Aadhaar authentication (UIDAI), encryption, HTTPS, and national health authority APIs.

---

<p align="center">
  Built with ❤️ for 🇮🇳 &nbsp;•&nbsp; <em>MedValut — Your health, one Aadhaar away.</em>
</p>