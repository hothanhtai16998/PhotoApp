import { useEffect } from "react";
import Header from "../components/Header";
import ImageGrid from "@/components/ImageGrid";
import './HomePage.css';
import Slider from "@/components/Slider";
import { useImageStore } from "@/stores/useImageStore";

function HomePage() {
    const { currentSearch } = useImageStore();
    
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