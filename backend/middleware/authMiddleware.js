const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization || "";
        const [scheme, token] = authHeader.split(" ");

        if (!token || scheme !== "Bearer") {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        req.user = decoded; // { id, nip, nama }
        return next();
    } catch (err) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
};

module.exports = { verifyToken };

