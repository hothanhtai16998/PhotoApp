import express from "express";
import cookieParser from 'cookie-parser';
import { CONNECT_DB } from "./config/mongodb.js";
import { env } from "./libs/environment.js";
import cors from "cors";

//import route
import authRoute from "./routes/authRoute.js";
import userRoute from "./routes/userRoute.js";


import { protectedRoute } from "./middlewares/authMiddleware.js";


const app = express();

const PORT = env.PORT || 4001;

//middlewares
app.use(express.json());
app.use(cookieParser()); // để lưu token vào cookie

//khi backend và frontend không cùng folder, phải enable CORS để truy cập từ client-side
const allowedOrigins = [env.CLIENT_URL, 'http://localhost:5173'];
app.use(cors({ 
    origin: (origin, callback) => {
        // allow requests with no origin (like mobile apps or curl requests)
        if(!origin) return callback(null, true);
        if(allowedOrigins.indexOf(origin) === -1){
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    }, 
    credentials: true 
}));

//public route: có thể truy cập mà không cần đăng nhập
app.use('/api/auth', authRoute); 

//private route: cần đăng nhập để truy cập
app.use(protectedRoute);
app.use('/api/users', userRoute); 


//kết nối database
CONNECT_DB().then(() => {
	app.listen(PORT, () => {
		console.log(`Server đang chạy trên port ${PORT}`);
	});
});
