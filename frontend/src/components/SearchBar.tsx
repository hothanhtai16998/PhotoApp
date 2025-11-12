
import './SearchBar.css';

const SearchBar = () => {
  return (
    <div className="search-hero">
      <div className="search-content">
        <h1>The best free stock photos, royalty free images & videos shared by creators.</h1>
        <div className="search-input-wrapper">
          <input type="text" placeholder="Search for free photos" />
          <button type="submit">Search</button>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
