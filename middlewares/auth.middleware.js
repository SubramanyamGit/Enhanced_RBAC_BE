const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized. Token missing." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
    req.user = decoded;

    //  Allow set-new-password route even if must_change_password is true
    const bypassRoutes = ["/auth/set_password"];
    if (
      decoded.must_change_password &&
      !bypassRoutes.includes(req.originalUrl)
    ) {
      return res.status(403).json({
        error: "Please change your password before accessing the system.",
      });
    }
console.log("PASS");

    next();
  } catch (err) {
    res.status(401).json({ error: "Unauthorized. Invalid token." });
  }
};

module.exports = authenticate;
