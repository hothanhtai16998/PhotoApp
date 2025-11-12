import bcrypt from "bcrypt";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Session from "../models/Session.js";

import { env } from "../libs/environment.js";

const ACCESS_TOKEN_TTL = "30m";
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000; //14 ngày

export const signUp = async (req, res) => {
	try {
		//lấy dữ liệu từ người dùng gửi lên
		const { username, password, email, firstName, lastName } = req.body;

		//validate dữ liệu đầu vào
		if (!username || !password || !email || !firstName || !lastName) {
			return res.status(400).json({
				message: "Không thể thiếu Tên người dùng, mật khẩu, họ và tên",
			});
		}

		//kiểm tra user có tồn tại chưa (ở đây kiểm tra username)
		const duplicateUser = await User.findOne({ username });
		if (duplicateUser) {
			return res.status(409).json({ message: "Tên người dùng đã tồn tại" });
		}

		//nếu user không tồn tại thì
		//mã hoá mật khẩu để tạo user mới
		const hashedPassword = await bcrypt.hash(password, 10);

		//tạo user mới (chú ý kiểm tra chính tả)
		await User.create({
			username,
			hashedPassword,
			email,
			displayName: `${firstName} ${lastName}`,
		});

		//return user đã đăng ký
		return res.sendStatus(204);
	} catch (error) {
		console.error("Lỗi khi gọi signup", error);
		return res.status(500).json({ message: error.message });
	}
};

export const signIn = async (req, res) => {
	try {
		//lấy input người dùng gửi lên (request)
		const { username, password } = req.body;

		//kiểm tra người dùng đã nhập username và password chưa
		if (!username || !password) {
			return res
				.status(400)
				.json({ message: "Thiếu Tên người dùng hoặc mật khẩu" });
		}

		//kiểm tra user có trong database không
		const user = await User.findOne({ username });
		if (!user) {
			return res
				.status(401)
				.json({ message: "Tên người dùng hoặc mật khẩu không chính xác" });
		}

		//kiểm tra mật khẩu người dùng nhập vào với hashedPassword từ db
		const passwordMatch = await bcrypt.compare(password, user.hashedPassword);
		if (!passwordMatch) {
			return res
				.status(401)
				.json({ message: "Tên người dùng hoặc mật khẩu không chính xác" });
		}

		//nếu khớp mật khẩu, tạo assessToken với jwt
		//jwt.sign() gồm 3 tham số:
		//payload: thông tin gửi vào access token
		//secret key:
		//thời gian hết hạn access token
		const accessToken = jwt.sign(
			{ userId: user._id },
			env.ACCESS_TOKEN_SECRET,
			{
				expiresIn: ACCESS_TOKEN_TTL,
			}
		);

		//tạo refresh token
		const refreshToken = crypto.randomBytes(64).toString("hex");

		//tạo session mới để lưu refresh token
		await Session.create({
			userId: user._id,
			refreshToken,
			expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
		});

		//trả refresh token về trong cookie
		// "refreshToken" là tên của cookie
		// refreshToken là giá trị của cookie
		// httpOnly: cookie này không thể bị truy cập bằng java script
		// secure: cookie này chỉ truyền qua https
		// sameSite: "none": backend và frontend ở 2 domain khác nhau thì dùng none
		// 					còn chung domain thì dùng strict
		// maxAge: thời gian hết hạn của cookie
		res.cookie("refreshToken", refreshToken, {
			httpOnly: true,
			secure: true,
			sameSite: "none",
			maxAge: REFRESH_TOKEN_TTL,
		});

		//trả access token về trong response
		return res
			.status(200)
			.json({ message: `User ${user.displayName} đã đăng nhập`, accessToken });
	} catch (error) {
		console.error("Lỗi khi gọi signin", error);
		return res.status(500).json({ message: error.message });
	}
};

export const signOut = async (req, res) => {
	try {
		//lấy refreshToken từ cookie
		const token = req.cookies?.refreshToken;

		if (token) {
			//xoá refresh token trong session
			await Session.deleteOne({ refreshToken: token });

			//xoá cookie
			res.clearCookie("refreshToken", {
				httpOnly: true,
				secure: true,
				sameSite: "none",
			});
		}
		return res.sendStatus(204);
	} catch (error) {
		console.error("Lỗi khi gọi signOut", error);
		return res.status(500).json({ message: "Lỗi hệ thống" });
	}
};

//
export const refreshToken = async (req, res) => {
	try {
		//lấy refreshToken từ cookie
		const token = req.cookies?.refreshToken;
		if (!token) {
			return res.status(401).json({ message: "Token không tồn tại" });
		}

		//so với refreshToken trong db
		const session = await Session.findOne({ refreshToken: token });
		if (!session) {
			return res
				.status(403)
				.json({ message: "Token không hợp lệ hoặc đã hết hạn" });
		}

		//tạo access token với mới
		if (session.expiresAt < new Date()) {
			return res.status(403).json({ message: "Token đã hết hạn" });
		}

		//.tạo access token mới
		const accessToken = jwt.sign(
			{ userId: session.userId },
			env.ACCESS_TOKEN_SECRET,
			{
				expiresIn: ACCESS_TOKEN_TTL,
			}
		);

		//return access token về trong response
		return res
			.status(200)
			.json({ message: "Token đã được cập nhật", accessToken });
	} catch (error) {
		console.error("Lỗi khi gọi refreshToken", error);
		return res.status(500).json({ message: "Lỗi hệ thống" });
	}
};
