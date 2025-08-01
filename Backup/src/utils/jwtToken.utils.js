const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

const generateToken = (data) => {
    return jwt.sign(data, "@ccr*teP@$sw0rD", { expiresIn: "7d" });
};

module.exports = { generateToken };
