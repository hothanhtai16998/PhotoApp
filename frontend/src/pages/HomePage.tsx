import { useEffect, lazy, Suspense } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import ImageGrid from "@/components/ImageGrid";
import './HomePage.css';
import { useImageStore } from "@/stores/useImageStore";
import { useGlobalKeyboardShortcuts } from "@/hooks/useGlobalKeyboardShortcuts";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load Slider - conditionally rendered
const Slider = lazy(() => import("@/components/Slider"));

function HomePage() {
    const { currentSearch } = useImageStore();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
    // Check if modal is open (image param exists)
    const isModalOpen = !!searchParams.get('image');
    
    // Global keyboard shortcuts
    useGlobalKeyboardShortcuts({
        onFocusSearch: () => {
            // Find search input and focus it
            const searchInput = document.querySelector('.search-input') as HTMLInputElement;
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        },
        isModalOpen,
    });
    
    // If page is refreshed with ?image=slug, redirect to /photos/:slug to show as full page
    // This handles the refresh case (like Unsplash)
    useEffect(() => {
        const imageParam = searchParams.get('image');
        if (imageParam) {
            // Check if this is a page refresh by checking sessionStorage
            // If image param exists but we don't have the "fromGrid" flag, it's a refresh
            const fromGrid = sessionStorage.getItem('imagePage_fromGrid');
            if (!fromGrid) {
                // This is a refresh or direct access, redirect to /photos/:slug
                navigate(`/photos/${imageParam}`, { replace: true });
            } else {
                // Clear the flag after using it
                sessionStorage.removeItem('imagePage_fromGrid');
            }
        }
    }, [searchParams, navigate]);
    
    // Scroll to top when search is activated to show results immediately
    useEffect(() => {
        if (currentSearch) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [currentSearch]);
    
    return (
        <>
            <Header />
            <main className="homepage">
                {/* Hide Slider when user is searching to show ImageGrid immediately */}
                {!currentSearch && (
                    <Suspense fallback={
                        <div className="flex items-center justify-center py-8">
                            <Skeleton className="h-64 w-full max-w-6xl" />
                        </div>
                    }>
                        <Slider />
                    </Suspense>
                )}
                <ImageGrid />
            </main>
        </>
    );
}

export default HomePage;