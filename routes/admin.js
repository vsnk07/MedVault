const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../midware');

router.use(requireAuth(['admin']));

router.get('/dashboard', (req, res) => {
  const stats = {
    patients: db.prepare("SELECT COUNT(*) AS c FROM patients").get().c,
    hospitals: db.prepare("SELECT COUNT(*) AS c FROM hospitals").get().c,
    records: db.prepare("SELECT COUNT(*) AS c FROM medical_records").get().c,
    pending: db.prepare("SELECT COUNT(*) AS c FROM users WHERE approved=0 AND role='patient'").get().c
  };
  const recent = db.prepare(`
    SELECT p.name AS patient_name, p.aadhaar, h.name AS hospital_name, mr.title, mr.uploaded_at
    FROM medical_records mr
    JOIN patients p ON p.id = mr.patient_id
    LEFT JOIN hospitals h ON h.id = mr.hospital_id
    ORDER BY mr.uploaded_at DESC LIMIT 10
  `).all();
  res.render('admin/dashboard', { user: req.session.user, stats, recent });
});

router.get('/pending', (req, res) => {
  const pending = db.prepare("SELECT * FROM users WHERE approved=0 AND role='patient'").all();
  const rows = db.prepare(`
    SELECT u.*, p.dob, p.gender, p.phone AS pphone, p.address AS paddress
    FROM users u JOIN patients p ON p.user_id = u.id
    WHERE u.approved=0 AND u.role='patient'
  `).all();
  res.render('admin/pending', { user: req.session.user, rows });
});

router.post('/approve/:id', (req, res) => {
  db.prepare('UPDATE users SET approved=1 WHERE id=?').run(req.params.id);
  db.prepare(`INSERT INTO audit_log (actor_id, action, details) VALUES (?, 'PATIENT_APPROVE', ?)`)
    .run(req.session.user.id, 'Approved patient user id ' + req.params.id);
  res.redirect('/admin/pending');
});

router.post('/reject/:id', (req, res) => {
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (u) {
    db.prepare('DELETE FROM patients WHERE user_id=?').run(req.params.id);
    db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  }
  res.redirect('/admin/pending');
});

router.get('/hospitals', (req, res) => {
  const rows = db.prepare(`
    SELECT h.*,
      (SELECT COUNT(*) FROM medical_records mr WHERE mr.hospital_id=h.id) AS record_count
    FROM hospitals h JOIN users u ON u.id = h.user_id
  `).all();
  res.render('admin/hospitals', { user: req.session.user, rows });
});

router.get('/audit', (req, res) => {
  const logs = db.prepare(`
    SELECT al.*, u.name AS actor_name, u.role AS actor_role
    FROM audit_log al LEFT JOIN users u ON u.id = al.actor_id
    ORDER BY al.created_at DESC LIMIT 100
  `).all();
  res.render('admin/audit', { user: req.session.user, logs });
});

module.exports = router;
