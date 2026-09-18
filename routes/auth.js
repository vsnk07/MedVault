const express = require('express');
const router = express.Router();
const db = require('../db');
const { hash } = require('../midware');

const safeNext = (next) => {
  if (!next) return null;
  if (next[0] !== '/') return null;
  if (next.startsWith('//')) return null;
  return next;
};

router.get('/home', (req, res) => res.render('home', { user: req.session.user }));

router.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/' + req.session.user.role + '/dashboard');
  const queryRole = ['patient', 'hospital', 'admin'].includes(req.query.role) ? req.query.role : 'patient';
  res.render('login', { error: null, role: queryRole, next: safeNext(req.query.next) });
});

router.post('/login', (req, res) => {
  const identifier = (req.body.aadhaar || '').trim();
  const password = req.body.password || '';
  const role = ['patient', 'hospital', 'admin'].includes(req.body.role) ? req.body.role : 'patient';
  const next = safeNext(req.body.next);

  let row;
  if (role === 'admin') {
    row = db.prepare('SELECT * FROM users WHERE username = ? AND role = ?')
      .get(identifier, role);
  } else if (role === 'hospital') {
    row = db.prepare('SELECT * FROM users WHERE hospital_id = ? AND role = ?')
      .get(identifier, role);
  } else {
    row = db.prepare('SELECT * FROM users WHERE aadhaar = ? AND role = ?')
      .get(identifier, role);
  }

  if (!row) return res.render('login', { error: 'Invalid credentials or role mismatch.', role, next });
  if (row.password !== hash(password)) return res.render('login', { error: 'Incorrect password.', role, next });
  if (!row.approved) return res.render('login', { error: 'Account not yet approved by authority.', role, next });

  req.session.user = {
    id: row.id,
    role: row.role,
    name: row.name,
    aadhaar: row.aadhaar,
    hospital_id: row.hospital_id
  };

  if (next) return res.redirect(next);
  res.redirect('/' + row.role + '/dashboard');
});

router.get('/register', (req, res) => res.render('register', { error: null, success: null }));

router.post('/register', (req, res) => {
  const { name, aadhaar, password, confirm, dob, gender, blood_group, phone, address } = req.body;
  if (!name || !aadhaar || !password) return res.render('register', { error: 'Please fill all required fields.', success: null });
  if (password !== confirm) return res.render('register', { error: 'Passwords do not match.', success: null });
  if (!/^\d{12}$/.test(aadhaar)) return res.render('register', { error: 'Aadhaar must be a 12-digit number.', success: null });

  const existing = db.prepare('SELECT id FROM users WHERE aadhaar = ?').get(aadhaar);
  if (existing) return res.render('register', { error: 'An account with this Aadhaar already exists.', success: null });

  const resu = db.prepare(`INSERT INTO users (role, aadhaar, password, name, phone, approved)
                           VALUES ('patient', ?, ?, ?, ?, 0)`).run(aadhaar, hash(password), name, phone || null);
  const userId = resu.lastInsertRowid;

  db.prepare(`INSERT INTO patients (user_id, aadhaar, name, dob, gender, blood_group, phone, address)
              VALUES (?,?,?,?,?,?,?,?)`).run(userId, aadhaar, name, dob || null, gender || null, blood_group || null, phone || null, address || null);

  db.prepare(`INSERT INTO audit_log (actor_id, action, details) VALUES (?, 'PATIENT_REGISTER', ?)`)
    .run(userId, 'New patient self-registered with aadhaar ' + aadhaar);

  res.render('register', { error: null, success: 'Registration successful. Please wait for Government approval before logging in.' });
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/home'));
});

// Public emergency QR landing page — scanned from the patient's health card.
// Shows ONLY critical emergency information to any authorized responder.
router.get('/emergency/:aadhaar', (req, res) => {
  const aadhaar = String(req.params.aadhaar || '').trim();
  const patient = db.prepare('SELECT * FROM patients WHERE aadhaar = ?').get(aadhaar);
  if (!patient) {
    return res.status(404).render('404');
  }
  const records = db.prepare(`
    SELECT mr.*, h.name AS hospital_name FROM medical_records mr
    LEFT JOIN hospitals h ON h.id = mr.hospital_id
    WHERE mr.patient_id = ? ORDER BY mr.uploaded_at DESC
  `).all(patient.id);
  const { buildKeyInfo } = require('../helpers');
  const key = buildKeyInfo(patient, records);
  res.render('emergency', { user: req.session.user, patient, key, records, host: req.protocol + '://' + req.get('host') });
});

module.exports = router;
