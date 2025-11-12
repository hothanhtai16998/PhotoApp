import "./App.css";

import { Routes, Route } from "react-router";
import HomePage from "./pages/HomePage.tsx";
import Upload from "./pages/Upload.tsx";
import SignUpPage from "./pages/SignUpPage.tsx";
import SignInPage from "./pages/SignInPage.tsx";
import ProtectedRoute from "./components/auth/protectedRoute.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";



function App() {
	return (
		<>
			<Routes>
				{/**public routes */}
				<Route path="/" element={<HomePage />} />

				<Route path="/signup" element={<SignUpPage />} />
				<Route path="/signin" element={<SignInPage />} />

				{/**protected routes */}
				<Route element={<ProtectedRoute />}>
					<Route path="/upload" element={<Upload />} />
					<Route path="/profile" element={<ProfilePage />} />

				</Route>

			</Routes>
		</>
	);
}

export default App;
