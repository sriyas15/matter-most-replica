import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : null;

    if (!token)
      return res.status(401).json({ success: false, message: "Authentication required" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(payload.id).select("-password");
    if (!user || user.isDeactivated)
      return res.status(401).json({ success: false, message: "User not found or deactivated" });

    req.user = user;
    next();
  } catch (err) {
    const message =
      err.name === "TokenExpiredError" ? "Token expired" : "Invalid token";
      console.log("protect error")
    res.status(401).json({ success: false, message });
  }
};