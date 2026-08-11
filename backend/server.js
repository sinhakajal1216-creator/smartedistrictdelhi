const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const sdmLocatorRoutes = require('./routes/sdmLocator');
const eligibilityRoutes = require('./routes/eligibility');

app.get("/", (req, res) => {
    res.json({
        message: "Smart e-District Delhi API is running"
    });
});

app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        message: "Server is running"
    });
});

app.use('/api/sdm', sdmLocatorRoutes);

app.use('/api/eligibility', eligibilityRoutes);
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "Server is running"
    });
});
