const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { requireAuth } = require('../midware');

// Protected medical file download — only the owning patient, any logged-in
// hospital, or the government authority may fetch a record's attachment.
router.get('/download/:id', requireAuth(['patient', 'hospital', 'admin']), (req, res) => {
  const record = db.prepare(`
    SELECT mr.*, p.user_id AS patient_user_id
    FROM medical_records mr
    JOIN patients p ON p.id = mr.patient_id
    WHERE mr.id = ?
  `).get(req.params.id);

  if (!record || !record.file_name) return res.status(404).render('404');

  const isHospital = req.session.user.role === 'hospital';
  const isAdmin = req.session.user.role === 'admin';
  const isOwner = req.session.user.role === 'patient' && record.patient_user_id === req.session.user.id;
  if (!(isHospital || isAdmin || isOwner)) return res.status(403).render('403');

  const fp = path.join(__dirname, '..', 'public', 'uploads', record.file_name);
  if (!fs.existsSync(fp)) return res.status(404).render('404');
  res.download(fp, record.file_name);
});

module.exports = router;