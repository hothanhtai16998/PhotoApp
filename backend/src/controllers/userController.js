import User from "../models/User.js";
import bcrypt from "bcrypt";

export const authMe = async (req, res) => {
	try {
		// req.user is populated by the authMiddleware
		const user = req.user;
		return res.status(200).json({ user });
	} catch (error) {
		console.error("Error in authMe controller:", error);
		return res.status(500).json({ message: "Internal Server Error" });
	}
};

export const updateUser = async (req, res) => {
	try {
		const { id } = req.user;
		const { firstName, lastName, password, ...otherFields } = req.body;

		const updateData = { ...otherFields };

		// Handle special case: constructing displayName from firstName and lastName
		if (firstName && lastName) {
			updateData.displayName = `${firstName} ${lastName}`;
		}

		// Handle special case: hashing a new password if provided
		if (password) {
			const salt = await bcrypt.genSalt(10);
			updateData.hashedPassword = await bcrypt.hash(password, salt);
		}

		// Prevent an empty update request from hitting the database
		if (Object.keys(updateData).length === 0) {
			return res.status(400).json({ message: "Không có thông tin thay đổi." });
		}

		const updatedUser = await User.findByIdAndUpdate(id, updateData, {
			new: true, // Return the updated document
			runValidators: true, // Ensure model validations are run on update
		}).select("-hashedPassword"); // Exclude password hash from the response

		if (!updatedUser) {
			return res.status(404).json({ message: "Không tìm thấy người dùng" });
		}

		res.status(200).json({
			message: "Cập nhật thông tin thành công.",
			user: updatedUser,
		});
	} catch (error) {
		console.error("Lỗi khi gọi userController:", error);

		// Handle specific database errors, like a duplicate email
		if (error.code === 11000) {
			return res.status(409).json({ message: "Email đẫ được sử dụng." }); // 409 Conflict is more specific here
		}

		return res.status(500).json({ message: "Lỗi hệ thống" });
	}
};

export const deleteUser = async (req, res) => {
	try {
		const user = req.user;
		await User.findByIdAndDelete(user._id);
		return res.status(204).json(); // 204 No Content
	} catch (error) {
		console.error("Lỗi khi gọi userController:", error);
		return res.status(500).json({ message: "Lỗi hệ thống" });
	}
};
