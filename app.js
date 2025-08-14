const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const routes = require("./routes/index");
const errorHandler = require("./middlewares/errorHandler");
const app = express();

// Load environment variables
dotenv.config();

app.use(express.json());

const allowedOrigins = [
  "http://localhost:5173",
  "https://enhanced-rbac-fe-1.onrender.com",
];

// Middleware
app.use(express.json());
app.use(
  cors({
    origin(origin, callback) {
      // allow mobile apps / curl (no origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Initialize Routes
routes.initialize(app);

// Error Handling Middleware
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`  Server running on http://127.0.0.1:${PORT}`);
});
