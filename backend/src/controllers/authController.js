import bcrypt from "bcrypt";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Session from "../models/Session.js";
import { env } from "../libs/env.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { TOKEN } from "../utils/constants.js";

// Google OAuth configuration
const GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET || '';
// Backend callback URL - Google will redirect here with the code
const BACKEND_URL = env.CLIENT_URL || `http://localhost:${env.PORT || 3000}`;
const GOOGLE_REDIRECT_URI = env.GOOGLE_REDIRECT_URI || `${BACKEND_URL}/api/auth/google/callback`;

export const signUp = asyncHandler(async (req, res) => {
    const { username, password, email, firstName, lastName, phone, bio } = req.body;

    // Note: Input validation is handled by validationMiddleware
    // This is just for data extraction

    // Validate password is provided for regular signup
    if (!password) {
        return res.status(400).json({ message: "Mật khẩu không được để trống" });
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existingUser) {
        if (existingUser.username === username) {
            return res.status(409).json({ message: "Tên tài khoản đã tồn tại" });
        }
        // If email exists and user is OAuth user, provide helpful message
        if (existingUser.email === email.toLowerCase()) {
            if (existingUser.isOAuthUser) {
                return res.status(409).json({
                    message: "Email này đã đăng ký với tài khoản Google, xin vui lòng đăng nhập bằng Google."
                });
            }
            return res.status(409).json({ message: "Email đã tồn tại" });
        }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    await User.create({
        username,
        hashedPassword,
        email,
        displayName: `${firstName.trim()} ${lastName.trim()}`,
        isOAuthUser: false,
        phone: phone?.trim() || undefined,
        bio: bio?.trim() || undefined,
    });

    return res.status(201).json({
        message: "Tạo tài khoản thành công",
    });
});

export const signIn = asyncHandler(async (req, res) => {
    const { username, password } = req.body;

    // Note: Input validation is handled by validationMiddleware

    // Find user by username
    const user = await User.findOne({ username });

    if (!user) {
        return res.status(401).json({
            message: "Tên tài khoản hoặc mật khẩu không đúng",
        });
    }

    // Check if user is OAuth user (no password)
    if (user.isOAuthUser) {
        return res.status(401).json({
            message: "This account was created with social login. Please use social login to sign in.",
        });
    }

    // Verify password
    if (!user.hashedPassword) {
        return res.status(401).json({
            message: "Tên tài khoản hoặc mật khẩu không đúng",
        });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.hashedPassword);

    if (!isPasswordMatch) {
        return res.status(401).json({
            message: "Tên tài khoản hoặc mật khẩu không đúng",
        });
    }

    // Generate access token
    const accessToken = jwt.sign(
        { userId: user._id },
        env.ACCESS_TOKEN_SECRET,
        { expiresIn: TOKEN.ACCESS_TOKEN_TTL }
    );

    // Generate refresh token
    const refreshToken = crypto.randomBytes(64).toString("hex");

    // Create session
    await Session.create({
        userId: user._id,
        refreshToken,
        expiresAt: new Date(Date.now() + TOKEN.REFRESH_TOKEN_TTL),
    });

    // Set refresh token cookie
    const isProduction = env.NODE_ENV === "production";
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        maxAge: TOKEN.REFRESH_TOKEN_TTL,
    });

    return res.status(200).json({
        message: "Đăng nhập thành công",
        accessToken,
        user: {
            _id: user._id,
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
        },
    });
});

export const signOut = asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken;

    if (token) {
        await Session.deleteOne({ refreshToken: token });
    }

    const isProduction = env.NODE_ENV === "production";
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
    });

    return res.status(200).json({
        message: "Đăng xuất thành công",
    });
});

export const refreshToken = asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken;

    if (!token) {
        return res.status(401).json({
            message: "không tìm thấy Refresh token",
        });
    }

    // Find session
    const session = await Session.findOne({ refreshToken: token });

    if (!session) {
        return res.status(403).json({
            message: "Refresh token không hợp lệ hoặc đã hết hạn",
        });
    }

    // Check expiration
    if (session.expiresAt < new Date()) {
        await Session.deleteOne({ refreshToken: token });
        return res.status(403).json({
            message: "Refresh token đã hết hạn",
        });
    }

    // Generate new access token
    const accessToken = jwt.sign(
        { userId: session.userId },
        env.ACCESS_TOKEN_SECRET,
        { expiresIn: TOKEN.ACCESS_TOKEN_TTL }
    );

    return res.status(200).json({ accessToken });
});

// Google OAuth - Initiate login
export const googleAuth = asyncHandler(async (req, res) => {
    if (!GOOGLE_CLIENT_ID) {
        return res.status(500).json({
            message: "Google OAuth is not configured. Please set GOOGLE_CLIENT_ID in environment variables.",
            redirectUri: GOOGLE_REDIRECT_URI
        });
    }

    const state = crypto.randomBytes(32).toString('hex');
    // Store state in session or cookie for CSRF protection
    res.cookie('oauth_state', state, {
        httpOnly: true,
        secure: env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600000 // 10 minutes
    });

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&response_type=code&scope=openid email profile&state=${state}&access_type=offline&prompt=consent`;

    console.log('Google OAuth - Redirecting to:', googleAuthUrl);
    console.log('Redirect URI:', GOOGLE_REDIRECT_URI);

    res.redirect(googleAuthUrl);
});

// Google OAuth - Handle callback
export const googleCallback = asyncHandler(async (req, res) => {
    const { code, state, error, error_description } = req.query;

    // Handle Google OAuth errors
    if (error) {
        console.error('Google OAuth error:', error, error_description);
        const frontendUrl = env.CLIENT_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/signin?error=${encodeURIComponent(error_description || error)}`);
    }

    const storedState = req.cookies?.oauth_state;

    // Verify state to prevent CSRF attacks
    if (!state || state !== storedState) {
        console.error('State mismatch:', { state, storedState });
        const frontendUrl = env.CLIENT_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/signin?error=Invalid state parameter`);
    }

    if (!code) {
        console.error('No authorization code provided');
        const frontendUrl = env.CLIENT_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/signin?error=Authorization code not provided`);
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        console.error('Google OAuth not configured');
        const frontendUrl = env.CLIENT_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/signin?error=Google OAuth is not configured`);
    }

    try {
        // Exchange code for access token
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code',
            }),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenData.access_token) {
            console.error('Failed to get access token:', tokenData);
            const frontendUrl = env.CLIENT_URL || 'http://localhost:5173';
            return res.redirect(`${frontendUrl}/signin?error=Failed to get access token from Google`);
        }

        // Get user info from Google
        const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
            },
        });

        const googleUser = await userResponse.json();

        if (!googleUser.id) {
            console.error('Failed to get user info:', googleUser);
            const frontendUrl = env.CLIENT_URL || 'http://localhost:5173';
            return res.redirect(`${frontendUrl}/signin?error=Failed to get user info from Google`);
        }

        // Find or create user
        let user = await User.findOne({ email: googleUser.email });

        if (!user) {
            // Create new user from Google data
            const nameParts = (googleUser.name || 'User').split(' ');
            const firstName = nameParts[0] || 'User';
            const lastName = nameParts.slice(1).join(' ') || '';
            const username = `google_${googleUser.id}`;

            user = await User.create({
                username,
                email: googleUser.email || `${googleUser.id}@google.com`,
                displayName: googleUser.name || 'Google User',
                avatarUrl: googleUser.picture,
                isOAuthUser: true,
                // No password for OAuth users
            });
        } else {
            // User exists - check if they're trying to use Google login on a password account
            if (!user.isOAuthUser) {
                // User exists with password account, prevent Google login
                const frontendUrl = env.CLIENT_URL || 'http://localhost:5173';
                return res.redirect(`${frontendUrl}/signin?error=${encodeURIComponent('This email is already registered with email/password. Please sign in with your password instead.')}`);
            }

            // For existing OAuth users, always sync avatar from Google to keep it up to date
            if (googleUser.picture) {
                // Only update if it's different (to avoid unnecessary saves)
                if (user.avatarUrl !== googleUser.picture) {
                    user.avatarUrl = googleUser.picture;
                    // Clear avatarId since we're using Google's avatar, not Cloudinary
                    user.avatarId = undefined;
                    await user.save();
                }
            }
        }

        // Generate access token
        const accessToken = jwt.sign(
            { userId: user._id },
            env.ACCESS_TOKEN_SECRET,
            { expiresIn: TOKEN.ACCESS_TOKEN_TTL }
        );

        // Generate refresh token
        const refreshToken = crypto.randomBytes(64).toString("hex");

        // Create session
        await Session.create({
            userId: user._id,
            refreshToken,
            expiresAt: new Date(Date.now() + TOKEN.REFRESH_TOKEN_TTL),
        });

        // Set refresh token cookie
        const isProduction = env.NODE_ENV === "production";
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: TOKEN.REFRESH_TOKEN_TTL,
        });

        // Clear OAuth state cookie
        res.clearCookie('oauth_state');

        // Redirect to frontend with token
        const frontendUrl = env.CLIENT_URL || 'http://localhost:5173';
        console.log('Google OAuth success - redirecting to frontend with token');
        res.redirect(`${frontendUrl}/auth/google/callback?token=${accessToken}`);
    } catch (error) {
        console.error('Google OAuth error:', error);
        const frontendUrl = env.CLIENT_URL || 'http://localhost:5173';
        const errorMessage = error.message || "Failed to authenticate with Google";
        return res.redirect(`${frontendUrl}/signin?error=${encodeURIComponent(errorMessage)}`);
    }
});
