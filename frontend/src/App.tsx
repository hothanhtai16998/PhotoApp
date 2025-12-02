import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AdminRoute from "./components/auth/AdminRoute";
import { Skeleton } from "./components/ui/skeleton";
import { PageViewTracker } from "./components/PageViewTracker";
import { ContactButton } from './components/ContactButton';


// Lazy load pages for code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const SignInPage = lazy(() => import("./pages/SignInPage"));
const SignUpPage = lazy(() => import("./pages/SignUpPage"));
const GoogleCallbackPage = lazy(() => import("./pages/GoogleCallbackPage"));
const EditProfilePage = lazy(() => import("./pages/EditProfilePage"));
const ProfilePage = lazy(() => import("./pages/profile/ProfilePage"));
const UploadPage = lazy(() => import("./pages/UploadPage"));
const AdminPage = lazy(() => import("./pages/admin/AdminPage"));
const FavoritesPage = lazy(() => import("./pages/FavoritesPage"));
const FavoriteCollectionsPage = lazy(() => import("./pages/FavoriteCollectionsPage"));
const ImagePage = lazy(() => import("./pages/ImagePage"));
const CollectionsPage = lazy(() => import("./pages/CollectionsPage"));
const CollectionDetailPage = lazy(() => import("./pages/collection/CollectionDetailPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const UnsplashGridTestPage = lazy(() => import("./pages/UnsplashGridTestPage"));


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
        <Route path="/UnsplashGridTestPage" element={<UnsplashGridTestPage />} />
        {/* <Route path="/UnsplashGrid" element={<UnsplashGrid />} /> */}


        {/**protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:username" element={<ProfilePage />} />
          <Route path="/profile/user/:userId" element={<ProfilePage />} />
          <Route path="/profile/edit" element={<EditProfilePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/favorite-collections" element={<FavoriteCollectionsPage />} />
          <Route path="/collections" element={<CollectionsPage />} />
          <Route path="/collections/:collectionId" element={<CollectionDetailPage />} />
        </Route>

        {/**admin routes */}
        <Route element={<AdminRoute />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Routes>

      {/* Floating Contact Button - appears on all pages */}
      <ContactButton />
    </Suspense>
  )
}

export default App