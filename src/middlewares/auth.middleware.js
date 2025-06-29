const jwt = require("jsonwebtoken");
const jwtUtils = require("../utils/jwtToken.utils");
const db = require("../config/db");
const winston = require("../config/winston");
const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: 0, msg: "Unauthorized: No token provided" });
    }
    const token = authHeader.split(" ")[1];
    const resp = await db.getResults(`SELECT ujt.id FROM user_jwt_tokens ujt WHERE ujt.token = ?;`, [token]);

    if (resp && resp.length === 0) throw new Error('Invalid or Expired token');

    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.roleId !== 0 && decoded.policyId !== 0) {
      req.body.companyId = decoded.companyId;
    }
    req.user = decoded;

    next();
  } catch (error) {
    winston.error(error);
    res.status(403).json({ success: 0, msg: "Invalid or expired token" });
  }
};


const jwtMiddleware = (req, res, next) => {
  let tokendata = req.headers.authorization
  if (tokendata == undefined) {
    return res.json("we need token");
  }
  TokenArray = tokendata.split(" ");
  // console.log("TokenArray", tokendata)
  const decoded = jwt.verify(TokenArray[1], "@ccr*teP@$sw0rD");
  // console.log("decoded", decoded);
  if (!TokenArray[1]) {
    return res.json("we need token");
  } else {
    const { body, params } = req;
    const info = {
      userid : decoded.userid,
      email : decoded.email,
      roleid : decoded.roleid,
      role : decoded.role,
      designation : decoded.designation,
      phoneno : decoded.phoneno,
      queryData: req.query,
    };
    // console.log("this is log from jwt middleware ----", info);
    req.info = info;
    next();
  }

}

module.exports = { authMiddleware, jwtMiddleware };
