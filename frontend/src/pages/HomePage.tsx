import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Header from "../components/Header";
import ImageGrid from "@/components/ImageGrid";
import './HomePage.css';
import Slider from "@/components/Slider";
import { useImageStore } from "@/stores/useImageStore";

function HomePage() {
    const { currentSearch } = useImageStore();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    
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
                {!currentSearch && <Slider />}
                <ImageGrid />
            </main>
        </>
    );
}

export default HomePage;