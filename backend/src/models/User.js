import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            index: true,
        },
        hashedPassword: {
            type: String,
            // Not required - OAuth users don't have passwords
        },
        isOAuthUser: {
            type: Boolean,
            default: false,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        displayName: {
            type: String,
            required: true,
        },
        avatarUrl: {
            type: String,
            default: ''
        },
        avatarId: {
            type: String,
        },
        bio: {
            type: String,
            maxlength: 500,
        },
        phone: {
            type: String,
            sparse: true,
        },
        isAdmin: {
            type: Boolean,
            default: false,
            index: true,
        },
        // For backward compatibility - will be determined by AdminRole
        isSuperAdmin: {
            type: Boolean,
            default: false,
            index: true,
        },
        // location: {
        //     type: String,
        // }
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model("User", userSchema);
export default User;
