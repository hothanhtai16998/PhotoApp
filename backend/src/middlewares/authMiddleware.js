import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { env } from "../libs/env.js";
import { asyncHandler } from "./asyncHandler.js";

/**
 * Middleware to protect routes requiring authentication
 * Verifies JWT token and attaches user to request
 */
export const protectedRoute = asyncHandler(async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({
            message: "Access token not found",
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET);

        // Find user - using lean() for better performance since we only need data
        // Note: If you need to modify user later in the request, remove .lean()
        const user = await User.findById(decoded.userId).select("-hashedPassword").lean();

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        // Attach user to request
        req.user = user;
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(403).json({
                message: "Access token expired",
            });
        }

        if (error.name === "JsonWebTokenError") {
            return res.status(403).json({
                message: "Invalid access token",
            });
        }

        throw error;
    }
});
