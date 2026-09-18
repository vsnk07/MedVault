const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAuth } = require('../midware');
const { buildTimeline, buildKeyInfo } = require('../helpers');

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safe = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safe);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ALLOWED_EXT.includes(ext)) return cb(null, true);
    cb(new Error('Unsupported file type: ' + (file.originalname || 'unknown')));
  }
});

function uploadSingle(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const hospital = getHospital(req.session.user.id);
      return res.render('hospital/upload', { user: req.session.user, hospital, error: err.message, success: null, aadhaar: (req.body && req.body.aadhaar) || '' });
    }
    next();
  });
}

router.use(requireAuth(['hospital']));

function getHospital(userId) {
  return db.prepare('SELECT * FROM hospitals WHERE user_id = ?').get(userId);
}

router.get('/dashboard', (req, res) => {
  const hospital = getHospital(req.session.user.id);
  const myUploads = db.prepare(`
    SELECT mr.*, p.name AS patient_name, p.aadhaar AS patient_aadhaar
    FROM medical_records mr
    JOIN patients p ON p.id = mr.patient_id
    WHERE mr.hospital_id = ?
    ORDER BY mr.uploaded_at DESC
  `).all(hospital.id);
  res.render('hospital/dashboard', { user: req.session.user, hospital, myUploads });
});

// Patient lookup by Aadhaar (emergency use case)
router.get('/lookup', (req, res) => {
  const hospital = getHospital(req.session.user.id);
  const q = (req.query.aadhaar || '').trim();
  let patient = null;
  let records = [];
  let error = null;
  if (q) {
    if (/^\d{12}$/.test(q)) {
      patient = db.prepare('SELECT * FROM patients WHERE aadhaar = ?').get(q);
      if (!patient) {
        error = 'No patient record found for this Aadhaar number.';
      } else {
        records = db.prepare(`
          SELECT mr.*, h.name AS hospital_name
          FROM medical_records mr
          LEFT JOIN hospitals h ON h.id = mr.hospital_id
          WHERE mr.patient_id = ?
          ORDER BY mr.uploaded_at DESC
        `).all(patient.id);
        db.prepare(`INSERT INTO audit_log (actor_id, action, details) VALUES (?, 'PATIENT_LOOKUP', ?)`)
          .run(req.session.user.id, 'Hospital looked up patient aadhaar ' + q);
      }
    } else {
      error = 'Please enter a valid 12-digit Aadhaar number.';
    }
  }
  res.render('hospital/lookup', { user: req.session.user, hospital, error, q, patient, records });
});

// Upload a new report for a patient (by aadhaar)
router.get('/upload', (req, res) => {
  const hospital = getHospital(req.session.user.id);
  const aadhaar = req.query.aadhaar || '';
  res.render('hospital/upload', { user: req.session.user, hospital, error: null, success: null, aadhaar });
});

router.post('/upload', uploadSingle, (req, res) => {
  const hospital = getHospital(req.session.user.id);
  const { aadhaar, title, description, record_type, doctor_name, department, severity, prescriptions, follow_up_date, follow_up_note } = req.body;

  const patient = db.prepare('SELECT * FROM patients WHERE aadhaar = ?').get((aadhaar || '').trim());
  if (!patient) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.render('hospital/upload', { user: req.session.user, hospital, error: 'No patient found for this Aadhaar number.', success: null, aadhaar });
  }
  if (!title || !/^\d{12}$/.test((aadhaar || '').trim())) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.render('hospital/upload', { user: req.session.user, hospital, error: !title ? 'Report title is required.' : 'Please enter a valid 12-digit Aadhaar number.', success: null, aadhaar });
  }

  db.prepare(`INSERT INTO medical_records
              (patient_id, hospital_id, title, description, record_type, doctor_name, department, severity, prescriptions, file_name)
              VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(patient.id, hospital.id, title, description || null, record_type || null, doctor_name || null, department || null, severity || null, prescriptions || null, req.file ? req.file.filename : null);

  db.prepare(`INSERT INTO visits (patient_id, hospital_id, reason, diagnosis, notes)
              VALUES (?,?,?,?,?)`)
    .run(patient.id, hospital.id, 'Medical treatment at ' + hospital.name, title, description || null);

  // Hospital schedules a follow-up checkup reminder for the patient
  if (follow_up_date) {
    const note = (follow_up_note || '').trim() || 'Follow-up after "' + title + '" at ' + hospital.name + (doctor_name ? ' with ' + doctor_name : '') + '.';
    db.prepare(`INSERT INTO reminders (patient_id, title, reminder_type, scheduled_date, notes, done, created_by)
                VALUES (?,?,?,?,?,0,?)`)
      .run(patient.id, 'Follow-up: ' + title, 'checkup', follow_up_date, note, hospital.name);
  }

  db.prepare(`INSERT INTO audit_log (actor_id, action, details) VALUES (?, 'RECORD_UPLOAD', ?)`)
    .run(req.session.user.id, 'Hospital uploaded "' + title + '" for aadhaar ' + patient.aadhaar);

  res.render('hospital/upload', { user: req.session.user, hospital, error: null, success: `Report "${title}" uploaded successfully for ${patient.name}.`, aadhaar: '' });
});

// View full patient file (emergency case - quick access)
router.get('/patient/:id', (req, res) => {
  const hospital = getHospital(req.session.user.id);
  const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
  if (!patient) return res.status(404).render('404');
  const records = db.prepare(`
    SELECT mr.*, h.name AS hospital_name
    FROM medical_records mr
    LEFT JOIN hospitals h ON h.id = mr.hospital_id
    WHERE mr.patient_id = ?
    ORDER BY mr.uploaded_at DESC
  `).all(patient.id);
  const timeline = buildTimeline(patient.id);
  const key = buildKeyInfo(patient, records);
  db.prepare(`INSERT INTO audit_log (actor_id, action, details) VALUES (?, 'PROFILE_VIEW', ?)`)
    .run(req.session.user.id, 'Hospital viewed full profile of aadhaar ' + patient.aadhaar);
  res.render('hospital/patient', { user: req.session.user, hospital, patient, records, timeline, key });
});

module.exports = router;
