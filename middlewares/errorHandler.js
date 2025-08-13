module.exports = (err, req, res, next) => {
    console.error("❌ Error:", err);
  res.status(500).json({
    status: "Failure",
    message: err.message || "Internal Server Error",
  });
};
