const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const db = require('../db');
const { requireAuth } = require('../midware');
const { buildTimeline, buildKeyInfo } = require('../helpers');

router.use(requireAuth(['patient']));

function getPatient(userId) {
  return db.prepare('SELECT * FROM patients WHERE user_id = ?').get(userId);
}

function getReminders(patientId) {
  return db.prepare(`
    SELECT * FROM reminders WHERE patient_id = ?
    ORDER BY done ASC, scheduled_date ASC, id DESC
  `).all(patientId);
}

async function qrData(patient, host) {
  const payload = [
    'MEDVALUT EMERGENCY ID',
    'Aadhaar: ' + (patient.aadhaar || ''),
    'Name: ' + (patient.name || ''),
    'Blood: ' + (patient.blood_group || 'Unknown'),
    'Allergies: ' + (patient.allergies || 'None'),
    'Emergency: ' + (patient.emergency_contact || '') + (patient.emergency_phone ? ' / ' + patient.emergency_phone : ''),
    'URL: ' + host + '/emergency/' + patient.aadhaar
  ].join('\n');
  return QRCode.toDataURL(payload, { width: 220, margin: 1, errorCorrectionLevel: 'M', color: { dark: '#12305a', light: '#ffffff' } });
}

router.get('/dashboard', async (req, res) => {
  const patient = getPatient(req.session.user.id);
  if (!patient) return res.redirect('/logout');

  const records = db.prepare(`
    SELECT mr.*, h.name AS hospital_name FROM medical_records mr
    LEFT JOIN hospitals h ON h.id = mr.hospital_id
    WHERE mr.patient_id = ? ORDER BY mr.uploaded_at DESC
  `).all(patient.id);
  const visits = db.prepare(`
    SELECT v.*, h.name AS hospital_name FROM visits v
    LEFT JOIN hospitals h ON h.id = v.hospital_id
    WHERE v.patient_id = ? ORDER BY v.visit_date DESC
  `).all(patient.id);

  const timeline = buildTimeline(patient.id).slice(0, 6);
  const reminders = getReminders(patient.id).filter(r => !r.done).slice(0, 4);
  const key = buildKeyInfo(patient, records);
  const host = req.protocol + '://' + req.get('host');
  const qrSrc = await qrData(patient, host);

  res.render('patient/dashboard', { user: req.session.user, patient, records, visits, timeline, reminders, key, qrSrc });
});

router.get('/records', (req, res) => {
  const patient = getPatient(req.session.user.id);
  const records = db.prepare(`
    SELECT mr.*, h.name AS hospital_name FROM medical_records mr
    LEFT JOIN hospitals h ON h.id = mr.hospital_id
    WHERE mr.patient_id = ? ORDER BY mr.uploaded_at DESC
  `).all(patient.id);
  res.render('patient/records', { user: req.session.user, patient, records });
});

router.get('/record/:id', (req, res) => {
  const patient = getPatient(req.session.user.id);
  const record = db.prepare(`
    SELECT mr.*, h.name AS hospital_name, h.city AS hospital_city, h.type AS hospital_type
    FROM medical_records mr
    LEFT JOIN hospitals h ON h.id = mr.hospital_id
    WHERE mr.id = ? AND mr.patient_id = ?
  `).get(req.params.id, patient.id);
  if (!record) return res.status(404).render('404');
  res.render('patient/record', { user: req.session.user, patient, record });
});

// ---------- Timeline ----------
router.get('/timeline', (req, res) => {
  const patient = getPatient(req.session.user.id);
  const timeline = buildTimeline(patient.id);
  res.render('patient/timeline', { user: req.session.user, patient, timeline });
});

// ---------- Health record comparison (side-by-side) ----------
router.get('/compare', (req, res) => {
  const patient = getPatient(req.session.user.id);
  const records = db.prepare(`
    SELECT mr.*, h.name AS hospital_name FROM medical_records mr
    LEFT JOIN hospitals h ON h.id = mr.hospital_id
    WHERE mr.patient_id = ? ORDER BY mr.uploaded_at DESC
  `).all(patient.id);

  let firstId = parseInt(req.query.a, 10) || null;
  let secondId = parseInt(req.query.b, 10) || null;
  if (records.length >= 2) {
    if (!firstId) firstId = records[records.length - 1].id; // oldest
    if (!secondId) secondId = records[0].id;                // newest
  }
  const pick = id => records.find(r => r.id === id) || null;
  const first = pick(firstId);
  const second = pick(secondId);

  res.render('patient/compare', { user: req.session.user, patient, records, first, second });
});

// ---------- Checkup reminders ----------
router.get('/reminders', (req, res) => {
  const patient = getPatient(req.session.user.id);
  const reminders = getReminders(patient.id);
  const message = req.query.added ? 'Reminder added successfully.' : (req.query.deleted ? 'Reminder deleted.' : null);
  res.render('patient/reminders', { user: req.session.user, patient, reminders, message, error: null });
});

router.post('/reminders', (req, res) => {
  const patient = getPatient(req.session.user.id);
  const { title, reminder_type, scheduled_date, notes } = req.body;
  if (!title || !scheduled_date) {
    const reminders = getReminders(patient.id);
    return res.render('patient/reminders', { user: req.session.user, patient, reminders, message: null, error: 'Title and scheduled date are required.' });
  }
  db.prepare(`INSERT INTO reminders (patient_id, title, reminder_type, scheduled_date, notes, done, created_by)
              VALUES (?,?,?,?,?,0,'Patient')`)
    .run(patient.id, title.trim(), reminder_type || 'checkup', scheduled_date, notes || null);
  res.redirect('/patient/reminders?added=1');
});

router.post('/reminders/:id/toggle', (req, res) => {
  const patient = getPatient(req.session.user.id);
  const rem = db.prepare('SELECT * FROM reminders WHERE id = ? AND patient_id = ?').get(req.params.id, patient.id);
  if (rem) {
    db.prepare('UPDATE reminders SET done = ? WHERE id = ?').run(rem.done ? 0 : 1, rem.id);
  }
  res.redirect('/patient/reminders');
});

router.post('/reminders/:id/delete', (req, res) => {
  const patient = getPatient(req.session.user.id);
  db.prepare('DELETE FROM reminders WHERE id = ? AND patient_id = ?').run(req.params.id, patient.id);
  res.redirect('/patient/reminders?deleted=1');
});

router.get('/profile', async (req, res) => {
  const patient = getPatient(req.session.user.id);
  const host = req.protocol + '://' + req.get('host');
  const qrSrc = await qrData(patient, host);
  const message = req.query.saved ? 'Profile updated successfully.' : null;
  res.render('patient/profile', { user: req.session.user, patient, message, qrSrc });
});

router.post('/profile', (req, res) => {
  const patient = getPatient(req.session.user.id);
  const { phone, address, allergies, emergency_contact, emergency_phone, blood_group } = req.body;
  db.prepare(`UPDATE patients SET phone=?, address=?, allergies=?, emergency_contact=?, emergency_phone=?, blood_group=?
              WHERE id=?`)
    .run(phone || null, address || null, allergies || null, emergency_contact || null, emergency_phone || null, blood_group || null, patient.id);
  res.redirect('/patient/profile?saved=1');
});

module.exports = router;