import Header from "@/components/Header.tsx";
import SearchBar from "@/components/SearchBar.tsx";
import ImageGrid from "@/components/ImageGrid.tsx";
import "./HomePage.css";

const HomePage = () => {
    return (
        <>
            <Header />
            <main className="homepage">
                <div className="content-wrapper">
                    <SearchBar />
                    <ImageGrid />
                </div>
            </main>
        </>
    );
};

export default HomePage;