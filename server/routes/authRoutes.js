const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const sendVerificationCode = require("../utils/smsSender");
const User = require("../models/User");
const { auth } = require("../middlewares/auth");

const tempCodes = {};

router.post("/send-code", async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ message: "Phone is required" });
    }

    const code =
        process.env.SMS_MOCK_MODE === "true"
            ? "123456"
            : Math.floor(100000 + Math.random() * 900000).toString();

    tempCodes[phone] = code;

    try {
        await sendVerificationCode(phone, code);
        res.json({ message: "Verification code sent" });
    } catch (err) {
        console.error("Error sending code:", err);
        res.status(500).json({ message: "Failed to send code" });
    }
});

router.post("/verify-code", async (req, res) => {
    const { phone, code } = req.body;

    if (!phone || !code) {
        return res.status(400).json({ message: "Phone and code are required" });
    }

    if (tempCodes[phone] !== code) {
        return res.status(401).json({ message: "Invalid code" });
    }

    delete tempCodes[phone];

    try {
        let user = await User.findOne({ phone });

        if (!user) {
            user = new User({ phone, role: "user", isVerified: true });
            await user.save();
        } else if (!user.isVerified) {
            user.isVerified = true;
            await user.save();
        }

        const token = jwt.sign(
            { id: user._id, phone: user.phone, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        res.json({ message: "Login successful", user });
    } catch (err) {
        console.error("Verification error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.get("/me", auth, (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;