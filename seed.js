const db = require('./db');

function hash(pw) {
  let h = 5381;
  for (let i = 0; i < String(pw).length; i++) {
    h = (h * 33) ^ String(pw).charCodeAt(i);
  }
  return 'h' + (h >>> 0).toString(16);
}

function seed() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;

  // Admin
  if (db.prepare("SELECT COUNT(*) AS c FROM users WHERE role='admin'").get().c === 0) {
    db.prepare(`INSERT INTO users (role, username, password, name, email, approved)
                VALUES ('admin', 'admin', ?, 'Government Health Authority', 'admin@medvalut.gov.in', 1)`)
      .run(hash('admin123'));
  }

  // Patients
  const patients = [
    { aadhaar: '123456789012', password: 'pass123', name: 'Ramesh Kumar', dob: '1985-04-12', gender: 'Male', blood_group: 'O+', phone: '9876543210', address: '12 Gandhi Nagar, Delhi', allergies: 'Penicillin', emergency_contact: 'Sita Kumar', emergency_phone: '9876543211' },
    { aadhaar: '234567890123', password: 'pass123', name: 'Priya Sharma', dob: '1992-11-02', gender: 'Female', blood_group: 'A+', phone: '9876543212', address: '45 MG Road, Mumbai', allergies: 'None', emergency_contact: 'Anil Sharma', emergency_phone: '9876543213' },
    { aadhaar: '345678901234', password: 'pass123', name: 'Amit Patel', dob: '1978-07-21', gender: 'Male', blood_group: 'B+', phone: '9876543214', address: '88 Lake View, Pune', allergies: 'Dust', emergency_contact: 'Meena Patel', emergency_phone: '9876543215' },
    { aadhaar: '456789012345', password: 'pass123', name: 'John David', dob: '1989-09-30', gender: 'Male', blood_group: 'AB-', phone: '9876543216', address: '3 Church Road, Chennai', allergies: 'None', emergency_contact: 'Mary David', emergency_phone: '9876543217' }
  ];

  for (const p of patients) {
    if (db.prepare('SELECT id FROM patients WHERE aadhaar = ?').get(p.aadhaar)) continue;
    const userRes = db.prepare(`INSERT INTO users (role, aadhaar, password, name, phone, approved)
                                VALUES ('patient', ?, ?, ?, ?, 1)`).run(p.aadhaar, hash(p.password), p.name, p.phone);
    const userId = userRes.lastInsertRowid;
    db.prepare(`INSERT INTO patients (user_id, aadhaar, name, dob, gender, blood_group, phone, address, allergies, emergency_contact, emergency_phone)
                VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
      .run(userId, p.aadhaar, p.name, p.dob, p.gender, p.blood_group, p.phone, p.address, p.allergies, p.emergency_contact, p.emergency_phone);
  }

  // Hospitals
  const hospitals = [
    { hospital_id: 'HOS-001', name: 'AIIMS Delhi', city: 'New Delhi', state: 'Delhi', type: 'Government Hospital', password: 'hos123' },
    { hospital_id: 'HOS-002', name: 'KEM Hospital Mumbai', city: 'Mumbai', state: 'Maharashtra', type: 'Government Hospital', password: 'hos123' },
    { hospital_id: 'HOS-003', name: 'City Trauma Center', city: 'Pune', state: 'Maharashtra', type: 'Emergency Trauma Center', password: 'hos123' },
    { hospital_id: 'HOS-004', name: 'General Hospital Chennai', city: 'Chennai', state: 'Tamil Nadu', type: 'Government Hospital', password: 'hos123' }
  ];

  const hospitalIds = {};
  for (const h of hospitals) {
    if (db.prepare('SELECT id FROM hospitals WHERE hospital_id = ?').get(h.hospital_id)) {
      hospitalIds[h.hospital_id] = db.prepare('SELECT id FROM hospitals WHERE hospital_id = ?').get(h.hospital_id).id;
      continue;
    }
    const userRes = db.prepare(`INSERT INTO users (role, hospital_id, password, name, email, approved)
                                VALUES ('hospital', ?, ?, ?, ?, 1)`).run(h.hospital_id, hash(h.password), h.name, h.hospital_id.toLowerCase() + '@medvalut.gov.in');
    const userId = userRes.lastInsertRowid;
    const hres = db.prepare(`INSERT INTO hospitals (user_id, hospital_id, name, city, state, type)
                             VALUES (?,?,?,?,?,?)`).run(userId, h.hospital_id, h.name, h.city, h.state, h.type);
    hospitalIds[h.hospital_id] = hres.lastInsertRowid;
  }

  // Medical records sample
  const pRamesh = db.prepare("SELECT id FROM patients WHERE aadhaar='123456789012'").get();
  const pPriya = db.prepare("SELECT id FROM patients WHERE aadhaar='234567890123'").get();
  const pAmit = db.prepare("SELECT id FROM patients WHERE aadhaar='345678901234'").get();
  const hAIIMS = hospitalIds['HOS-001'];
  const hKEM = hospitalIds['HOS-002'];
  const hTrauma = hospitalIds['HOS-003'];

  if (db.prepare('SELECT COUNT(*) AS c FROM medical_records').get().c === 0) {
    const recs = [
      { pid: pRamesh.id, hid: hAIIMS, title: 'Full Blood Count (CBC)', desc: 'Routine blood test - no abnormality detected', type: 'Lab Report', doctor: 'Dr. N. Rao', dept: 'Pathology', severity: 'Normal', prescription: 'Continue balanced diet, stay hydrated', file: 'demo-cbc-ramesh.pdf', uploaded: '2025-06-10 09:15:00' },
      { pid: pRamesh.id, hid: hTrauma, title: 'X-Ray - Right Leg Fracture', desc: 'Emergency admission after road accident. Right femur fracture confirmed. Surgery performed.', type: 'Imaging', doctor: 'Dr. S. Verma', dept: 'Orthopedics', severity: 'Critical', prescription: 'Post-surgery care, physiotherapy in 4 weeks', file: null, uploaded: '2026-05-18 21:40:00' },
      { pid: pRamesh.id, hid: hAIIMS, title: 'Post-Surgery Follow-up', desc: 'Fracture healing well. Cast removal advised after 6 weeks.', type: 'Consultation', doctor: 'Dr. S. Verma', dept: 'Orthopedics', severity: 'Stable', prescription: 'Calcium supplements, vitamin D', file: null, uploaded: '2026-06-20 11:05:00' },
      { pid: pPriya.id, hid: hKEM, title: 'Lipid Profile', desc: 'Cholesterol slightly elevated.', type: 'Lab Report', doctor: 'Dr. L. Menon', dept: 'Cardiology', severity: 'Moderate', prescription: 'Reduce fatty food, regular exercise', file: 'demo-lipid-priya.pdf', uploaded: '2026-01-12 10:00:00' },
      { pid: pPriya.id, hid: hKEM, title: 'ECG Report', desc: 'Normal sinus rhythm.', type: 'Lab Report', doctor: 'Dr. L. Menon', dept: 'Cardiology', severity: 'Normal', prescription: 'None required', file: null, uploaded: '2026-03-05 14:30:00' },
      { pid: pAmit.id, hid: hTrauma, title: 'CT Scan - Head', desc: 'Mild concussion, no internal bleeding. Admitted for observation.', type: 'Imaging', doctor: 'Dr. K. Iyer', dept: 'Emergency', severity: 'Moderate', prescription: 'Rest, avoid strenuous activity for 2 weeks', file: null, uploaded: '2025-09-02 22:10:00' }
    ];

    for (const r of recs) {
      db.prepare(`INSERT INTO medical_records (patient_id, hospital_id, title, description, record_type, doctor_name, department, severity, prescriptions, file_name, uploaded_at)
                  VALUES (?,?,?,?,?,?,?,?,?,?,datetime(?))`).run(r.pid, r.hid, r.title, r.desc, r.type, r.doctor, r.dept, r.severity, r.prescription, r.file, r.uploaded);
    }
  }

  // Visits / hospital encounters (drive the timeline & visit stats)
  if (db.prepare('SELECT COUNT(*) AS c FROM visits').get().c === 0) {
    const visits = [
      { pid: pRamesh.id, hid: hAIIMS, date: '2025-06-10 09:15:00', reason: 'Annual health check-up', diagnosis: 'Fit, hemoglobin in normal range', notes: 'Routine vitals all normal.' },
      { pid: pRamesh.id, hid: hTrauma, date: '2026-05-18 21:40:00', reason: 'Road accident - severe right leg pain', diagnosis: 'Right femur fracture', notes: 'Admitted, emergency surgery performed.' },
      { pid: pRamesh.id, hid: hAIIMS, date: '2026-06-20 11:05:00', reason: 'Fracture follow-up', diagnosis: 'Healing progressing well', notes: 'Cast removal advised after 6 weeks.' },
      { pid: pPriya.id, hid: hKEM, date: '2026-01-12 10:00:00', reason: 'Routine lipid screening', diagnosis: 'Borderline high cholesterol', notes: 'Dietary counselling given.' },
      { pid: pPriya.id, hid: hKEM, date: '2026-03-05 14:30:00', reason: 'Chest discomfort check', diagnosis: 'Normal sinus rhythm', notes: 'No cardiac abnormality found.' },
      { pid: pAmit.id, hid: hTrauma, date: '2025-09-02 22:10:00', reason: 'Head injury from fall', diagnosis: 'Mild concussion', notes: 'Observed overnight, discharged.' }
    ];
    for (const v of visits) {
      db.prepare(`INSERT INTO visits (patient_id, hospital_id, visit_date, reason, diagnosis, notes)
                  VALUES (?,?,datetime(?),?,?,?)`).run(v.pid, v.hid, v.date, v.reason, v.diagnosis, v.notes);
    }
  }

  // Reminders (upcoming hospital checkups, follow-ups, vaccinations)
  if (db.prepare('SELECT COUNT(*) AS c FROM reminders').get().c === 0) {
    db.prepare(`INSERT INTO reminders (patient_id, title, reminder_type, scheduled_date, notes, done, created_by)
                VALUES (?,?,'checkup',date('now','+7 day'),'Dental check-up at City Dental Care',0,'System')`)
      .run(pRamesh.id, 'Dental Check-up');
    db.prepare(`INSERT INTO reminders (patient_id, title, reminder_type, scheduled_date, notes, done, created_by)
                VALUES (?,?,'checkup',date('now','+12 day'),'Ortho follow-up for fracture (Dr. S. Verma)',0,'System')`)
      .run(pRamesh.id, 'Ortho Follow-up');
    db.prepare(`INSERT INTO reminders (patient_id, title, reminder_type, scheduled_date, notes, done, created_by)
                VALUES (?,?,'checkup',date('now','-2 day'),'Lipid profile re-test at KEM (overdue)',0,'System')`)
      .run(pPriya.id, 'Lipid Profile Re-test');
    db.prepare(`INSERT INTO reminders (patient_id, title, reminder_type, scheduled_date, notes, done, created_by)
                VALUES (?,?,'vaccination',date('now','+20 day'),'Tetanus booster due',0,'System')`)
      .run(pAmit.id, 'Tetanus Booster');
  }
}

// Demo attachment stubs referenced by seeded records (served through the protected route)
function seedDemoFiles() {
  const dir = require('path').join(__dirname, 'public', 'uploads');
  const fs = require('fs');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const samples = {
    'demo-cbc-ramesh.pdf': 'DEMO FILE - MEDVALUT\r\nFull Blood Count (CBC) - Ramesh Kumar\r\nAll Hb, TLC, platelet values within normal limits.\r\nSample attachment for demonstration only.',
    'demo-lipid-priya.pdf': 'DEMO FILE - MEDVALUT\r\nLipid Profile - Priya Sharma\r\nTotal Cholesterol 218 mg/dL (borderline high).\r\nSample attachment for demonstration only.'
  };
  for (const [name, content] of Object.entries(samples)) {
    const fp = require('path').join(dir, name);
    if (!fs.existsSync(fp)) fs.writeFileSync(fp, content);
  }
}

seedDemoFiles();
seed();
module.exports = { hashMode: hash('') ? 'seeded' : 'none' };
console.log('Database seeded successfully.');
