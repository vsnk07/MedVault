const db = require('./db');

function severityOf(rec) {
  return rec && rec.severity ? rec.severity : 'Normal';
}

function patientRecords(patientId) {
  return db.prepare(`
    SELECT mr.*, h.name AS hospital_name, h.city AS hospital_city, h.type AS hospital_type
    FROM medical_records mr
    LEFT JOIN hospitals h ON h.id = mr.hospital_id
    WHERE mr.patient_id = ?
    ORDER BY mr.uploaded_at DESC
  `).all(patientId);
}

function patientVisits(patientId) {
  return db.prepare(`
    SELECT v.*, h.name AS hospital_name
    FROM visits v
    LEFT JOIN hospitals h ON h.id = v.hospital_id
    WHERE v.patient_id = ?
    ORDER BY v.visit_date DESC
  `).all(patientId);
}

// Merged chronological health timeline from records + visits (newest first)
function buildTimeline(patientId) {
  const records = db.prepare(`
    SELECT mr.*, h.name AS hospital_name FROM medical_records mr
    LEFT JOIN hospitals h ON h.id = mr.hospital_id WHERE mr.patient_id = ?
  `).all(patientId);
  const visits = db.prepare(`
    SELECT v.*, h.name AS hospital_name FROM visits v
    LEFT JOIN hospitals h ON h.id = v.hospital_id WHERE v.patient_id = ?
  `).all(patientId);

  const events = [];
  for (const r of records) {
    events.push({
      date: r.uploaded_at,
      type: 'record',
      kind: r.record_type || 'Report',
      title: r.title,
      severity: severityOf(r),
      doctor: r.doctor_name,
      hospital: r.hospital_name,
      description: r.description,
      prescriptions: r.prescriptions,
      id: r.id
    });
  }
  for (const v of visits) {
    events.push({
      date: v.visit_date,
      type: 'visit',
      kind: 'Visit',
      title: v.reason || 'Hospital Visit',
      severity: '',
      doctor: '',
      hospital: v.hospital_name,
      description: v.diagnosis || '',
      prescriptions: v.notes || '',
      id: v.id
    });
  }
  events.sort((a, b) => new Date(b.date) - new Date(a.date));
  return events;
}

// Critical / active medical conditions derived from the patient's records
function buildConditions(records) {
  return (records || [])
    .filter(r => ['Critical', 'Moderate'].includes(severityOf(r)))
    .map(c => ({
      title: c.title,
      severity: severityOf(c),
      department: c.department,
      date: c.uploaded_at
    }));
}

// "Key Health Information" — the vital summary shown in emergencies
function buildKeyInfo(patient, records) {
  return {
    blood_group: patient.blood_group || 'Unknown',
    allergies: patient.allergies || 'None recorded',
    dob: patient.dob || null,
    gender: patient.gender || null,
    phone: patient.phone || null,
    emergency_contact: patient.emergency_contact || null,
    emergency_phone: patient.emergency_phone || null,
    conditions: buildConditions(records),
    recordCount: (records || []).length
  };
}

module.exports = { severityOf, patientRecords, patientVisits, buildTimeline, buildConditions, buildKeyInfo };