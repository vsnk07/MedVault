const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/public/css', express.static(path.join(__dirname, 'public', 'css')));

app.use(session({
  secret: 'medvalut-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 } // 8 hours
}));

const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Routes
app.use('/', require('./routes/auth'));
app.use('/patient', require('./routes/patient'));
app.use('/hospital', require('./routes/hospital'));
app.use('/admin', require('./routes/admin'));
app.use('/file', require('./routes/file'));

app.get('/', (req, res) => res.redirect('/home'));

// Catch-all 404 (renders the styled page, keeps session intact)
app.use((req, res) => res.status(404).render('404'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Internal Server Error');
});

app.listen(PORT, () => {
  console.log(`MedValut server running at http://localhost:${PORT}`);
  console.log(`Seed with: node seed.js`);
});
