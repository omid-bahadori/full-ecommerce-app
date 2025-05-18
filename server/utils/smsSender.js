const axios = require("axios");

const sendVerificationCode = async (phone, code) => {
    if (process.env.SMS_MOCK_MODE === "true") {
        console.log(`[MOCK MODE] Sending code ${code} to ${phone}`);
        return;
    }

    try {
        await axios.post("https://api.sms.ir/v1/send/verify", {
            mobile: phone,
            templateId: 12345,
            parameters: [
                {
                    name: "code",
                    value: code,
                },
            ],
        }, {
            headers: {
                "Content-Type": "application/json",
                "x-api-key": process.env.SMS_API_KEY,
            },
        });
    } catch (err) {
        console.error("SMS send error:", err.message);
    }
};

module.exports = sendVerificationCode;
