import mongoose from "mongoose";

//tạo schema
const userSchema = new mongoose.Schema(
	{
		username: {
			type: String,
			required: true,
			unique: true,
			trim: true,
			lowercase: true,
		},
		hashedPassword: { type: String, required: true },
		email: {
			type: String,
			required: true,
			unique: true,
			trim: true,
			lowercase: true,
		},
		displayName: { type: String, required: true, trim: true },
		avatarUrl: { type: String }, //Link CDN hiển thị hình ảnh
		avatarID: { type: String }, //cloudinary public_id để xoá hình
		bio: { type: String, maxlength: 500 },
		phone: { type: String, sparse: true },
	},
	{ timestamps: true }
);

//tạo model dựa trên schema
const User = mongoose.model("User", userSchema);

export default User;
