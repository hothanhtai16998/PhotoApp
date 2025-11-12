import mongoose from "mongoose";
import { env } from "../libs/environment.js";

export const CONNECT_DB = async () => {
	try {
		await mongoose.connect(env.MONGODB_URI);
        console.log("Kết nối thành công tới MongoDB");
	} catch (error) {
        console.error("Kết nối MongoDB thất bại", error);
        process.exit(1); //thoát hệ thống nếu kết nối thất bại
    }
}