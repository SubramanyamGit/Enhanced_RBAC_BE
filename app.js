const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const routes = require("./routes/index");
const errorHandler = require("./middlewares/errorHandler");
const app = express();

// Load environment variables
dotenv.config();

app.use(express.json());


// Middleware
app.use(express.json());
app.use(cors({
  origin: "http://localhost:5173", // Frontend URL
  credentials: true
}));

// Initialize Routes
routes.initialize(app);

// Error Handling Middleware
app.use(errorHandler);

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, "127.0.0.1", () => {
   console.log(`  Server running on http://127.0.0.1:${PORT}`);
});
