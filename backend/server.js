const express = require("express");
const cors = require("cors");
require("dotenv").config();
const chatbotRoutes = require('./routes/chatbot');

const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

const sdmLocatorRoutes = require('./routes/sdmLocator');
const eligibilityRoutes = require('./routes/eligibility');
const schemeRoutes = require('./routes/schemes');
const authRoutes = require('./routes/auth');

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

app.use('/api/auth', authRoutes);
app.use('/api/sdm', sdmLocatorRoutes);

app.use('/api/eligibility', eligibilityRoutes);
app.use('/api/schemes', schemeRoutes);
app.use('/api/chatbot', chatbotRoutes);
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
