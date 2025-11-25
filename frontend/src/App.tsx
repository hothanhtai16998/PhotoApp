import { lazy, Suspense, useState, useEffect } from "react";
import { Route, Routes } from "react-router";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";
import { Skeleton } from "./components/ui/skeleton";
import FloatingContactButton from "./components/FloatingContactButton";
import ContactOptionSelector from "./components/ContactOptionSelector";
import { PageViewTracker } from "./components/PageViewTracker";
import { loadContactButtonOption } from "./utils/localStorage";

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const SignInPage = lazy(() => import("./pages/SignInPage"));
const SignUpPage = lazy(() => import("./pages/SignUpPage"));
const GoogleCallbackPage = lazy(() => import("./pages/GoogleCallbackPage"));
const EditProfilePage = lazy(() => import("./pages/EditProfilePage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const UploadPage = lazy(() => import("./pages/UploadPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const ImagePage = lazy(() => import("./pages/ImagePage"));
const CollectionsPage = lazy(() => import("./pages/CollectionsPage"));
const CollectionDetailPage = lazy(() => import("./pages/CollectionDetailPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));

// Loading fallback component
const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <Skeleton className="h-4 w-32" />
    </div>
  </div>
);


function App() {
  const [contactOption, setContactOption] = useState<"A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M" | "N">("A");

  // Load saved option from localStorage on mount
  useEffect(() => {
    const saved = loadContactButtonOption();
    setContactOption(saved);
  }, []);

  return (
    <Suspense fallback={<PageLoader />}>
      <PageViewTracker />
      <Routes>
        {/**public routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/photos/:slug" element={<ImagePage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
        <Route path="/about" element={<AboutPage />} />

        {/**protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/edit" element={<EditProfilePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/collections/:collectionId" element={<CollectionDetailPage />} />
        </Route>

        {/**admin routes */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Routes>
      
      {/* Floating Contact Button - appears on all pages */}
      <FloatingContactButton option={contactOption} />
      
      {/* Option Selector - for testing different designs */}
      <ContactOptionSelector 
        currentOption={contactOption} 
        onOptionChange={setContactOption} 
      />
    </Suspense>
  )
}

export default App