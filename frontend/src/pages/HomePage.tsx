import Header from "../components/Header";
import ImageGrid from "@/components/ImageGrid";
import './HomePage.css';
import Slider from "@/components/Slider";

function HomePage() {
    return (
        <>
            <Header />
            <main className="homepage">
                <Slider />
                <ImageGrid />
            </main>
        </>
    );
}

export default HomePage;