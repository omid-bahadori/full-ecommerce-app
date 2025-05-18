const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");

const sendVerificationCode = require("../utils/smsSender");

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

    await sendVerificationCode(phone, code);

    res.json({ message: "Verification code sent" });
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

    const User = require("../models/User");
    let user = await User.findOne({ phone });

    if (!user) {
        user = new User({ phone, role: "user" });
        await user.save();
    }
    user.isVerified = true;
    await user.save();

    const token = jwt.sign(
        { id: user._id, phone: user.phone, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );

    res.json({ token, user });
});


module.exports = router;
