import { useState, useEffect, useRef } from 'react';
import { imageService } from '@/services/imageService';
import { useImageStore } from '@/stores/useImageStore';
import type { Image } from '@/types/image';
import Header from '@/components/Header';
import './WondrousPage.css';

interface ImageSection {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  location?: string;
  category?: string;
}

function WondrousPage() {
  const { deletedImageIds } = useImageStore();
  const [sections, setSections] = useState<ImageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<(HTMLDivElement | null)[]>([]);

  // Fetch images
  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoading(true);
        const response = await imageService.fetchImages({
          limit: 12,
          page: 1,
          _refresh: true
        });

        if (response.images && response.images.length > 0) {
          const validImages = response.images.filter(
            (img: Image) => !deletedImageIds.includes(img._id)
          );

          const sectionsData: ImageSection[] = validImages.map((img: Image) => {
            const categoryName = typeof img.imageCategory === 'string' 
              ? img.imageCategory 
              : (img.imageCategory?.name || '');
            
            return {
              id: img._id,
              title: img.imageTitle || 'Untitled',
              description: img.location || categoryName || 'Beautiful image',
              imageUrl: img.regularUrl || img.imageUrl,
              location: img.location,
              category: categoryName
            };
          });

          setSections(sectionsData);
        }
      } catch (error) {
        console.error('Error fetching images:', error);
        setSections([]);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [deletedImageIds]);

  // Handle scroll for parallax effects
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Intersection Observer for scroll-triggered animations
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.15
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
          // Also trigger animations for child elements
          const animatedElements = entry.target.querySelectorAll('[data-animate]');
          animatedElements.forEach((el) => {
            const delayAttr = el.getAttribute('data-delay');
            const delay = delayAttr ? parseInt(delayAttr, 10) : 0;
            setTimeout(() => {
              el.classList.add('animate-in');
            }, delay);
          });
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all sections
    sectionsRef.current.forEach((ref) => {
      if (ref) {
        observer.observe(ref);
      }
    });

    // Also observe hero section for initial animations
    if (heroRef.current) {
      const heroObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const animatedElements = entry.target.querySelectorAll('[data-animate]');
              animatedElements.forEach((el) => {
                const delayAttr = el.getAttribute('data-delay');
                const delay = delayAttr ? parseInt(delayAttr, 10) : 0;
                setTimeout(() => {
                  el.classList.add('animate-in');
                }, delay);
              });
            }
          });
        },
        { threshold: 0.1 }
      );
      heroObserver.observe(heroRef.current);
      
      // Trigger hero animations immediately on mount (hero is always visible)
      setTimeout(() => {
        const animatedElements = heroRef.current?.querySelectorAll('[data-animate]');
        animatedElements?.forEach((el) => {
          const delayAttr = el.getAttribute('data-delay');
          const delay = delayAttr ? parseInt(delayAttr, 10) : 0;
          setTimeout(() => {
            el.classList.add('animate-in');
          }, delay);
        });
      }, 100);
    }

    return () => {
      sectionsRef.current.forEach((ref) => {
        if (ref) {
          observer.unobserve(ref);
        }
      });
    };
  }, [sections]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="wondrous-page">
          <div className="loading-state">Loading...</div>
        </div>
      </>
    );
  }

  if (sections.length === 0) {
    return (
      <>
        <Header />
        <div className="wondrous-page">
          <div className="empty-state">No images available</div>
        </div>
      </>
    );
  }

  const heroImage = sections[0];
  const parallaxOffset = scrollY * 0.5;

  return (
    <>
      <Header />
      <div className="wondrous-page">
        {/* Hero Section - Full Screen with Parallax */}
        <section 
          ref={heroRef}
          className="wondrous-hero"
          style={{
            backgroundImage: `url(${heroImage.imageUrl})`,
            transform: `translateY(${parallaxOffset}px)`
          }}
        >
          <div className="hero-overlay"></div>
          <div className="hero-content">
            <h1 className="hero-title" data-animate="fade-up">
              {heroImage.title}
            </h1>
            <p className="hero-subtitle" data-animate="fade-up" data-delay="200">
              {heroImage.description}
            </p>
            <div className="hero-scroll-indicator" data-animate="fade-up" data-delay="400">
              <span>Scroll to explore</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </section>

        {/* Image Sections with Scroll Animations */}
        <div className="wondrous-sections">
          {sections.slice(1).map((section, index) => (
            <section
              key={section.id}
              ref={(el) => {
                sectionsRef.current[index] = el;
              }}
              className="wondrous-section"
              data-section-type={index % 2 === 0 ? 'left' : 'right'}
            >
              <div className="section-image-container">
                <div
                  className="section-image"
                  style={{
                    backgroundImage: `url(${section.imageUrl})`,
                    transform: `translateY(${scrollY * (0.1 + index * 0.05)}px)`
                  }}
                ></div>
                <div className="section-overlay"></div>
              </div>
              <div className="section-content">
                <div className="section-number" data-animate="fade-in">
                  {String(index + 1).padStart(2, '0')}
                </div>
                <h2 className="section-title" data-animate="fade-up">
                  {section.title}
                </h2>
                <p className="section-description" data-animate="fade-up" data-delay="100">
                  {section.description}
                </p>
                {section.location && (
                  <div className="section-meta" data-animate="fade-up" data-delay="200">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <span>{section.location}</span>
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>

        {/* Footer Section */}
        <footer className="wondrous-footer">
          <div className="footer-content">
            <h3 className="footer-title">Explore More</h3>
            <p className="footer-text">
              Discover the beauty captured in every moment
            </p>
          </div>
        </footer>
      </div>
    </>
  );
}

export default WondrousPage;

