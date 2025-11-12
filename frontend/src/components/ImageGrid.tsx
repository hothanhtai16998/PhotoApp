
import './ImageGrid.css';

// Placeholder data - we will replace this with an API call later
const images = [
  { id: 1, src: 'https://images.pexels.com/photos/3225517/pexels-photo-3225517.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { id: 2, src: 'https://images.pexels.com/photos/2440061/pexels-photo-2440061.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { id: 3, src: 'https://images.pexels.com/photos/167699/pexels-photo-167699.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { id: 4, src: 'https://images.pexels.com/photos/2662116/pexels-photo-2662116.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { id: 5, src: 'https://images.pexels.com/photos/3408744/pexels-photo-3408744.jpeg?auto=compress&cs=tinysrgb&w=400' },
  { id: 6, src: 'https://images.pexels.com/photos/417074/pexels-photo-417074.jpeg?auto=compress&cs=tinysrgb&w=400' },
];

const ImageGrid = () => {
  return (
    <div className="image-grid-container">
      <div className="image-grid">
        {images.map(image => (
          <div key={image.id} className="image-item">
            <img src={image.src} alt={`Stock photo ${image.id}`} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageGrid;
