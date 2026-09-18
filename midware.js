function hash(pw) {
  let h = 5381;
  for (let i = 0; i < String(pw).length; i++) {
    h = (h * 33) ^ String(pw).charCodeAt(i);
  }
  return 'h' + (h >>> 0).toString(16);
}

function requireAuth(roles) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
    }
    if (roles && !roles.includes(req.session.user.role)) {
      return res.status(403).render('403');
    }
    next();
  };
}

module.exports = { hash, requireAuth };
