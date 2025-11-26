import Header from "@/components/Header";
import { Mail, Phone, MapPin, Globe, Linkedin, Github, Facebook, Twitter } from "lucide-react";
import "./AboutPage.css";

function AboutPage() {
    // Author information - you can customize these values
    const authorInfo = {
        name: "PhotoApp Team",
        email: "contact@photoapp.com",
        phone: "+1 (555) 123-4567",
        address: "123 Photography Street, Creative City, CC 12345",
        website: "https://photoapp.com",
        bio: "Welcome to PhotoApp! We are passionate about photography and providing a platform for photographers and artists to share their beautiful work with the world. Our mission is to inspire creativity and connect visual storytellers.",
        social: {
            linkedin: "https://linkedin.com/company/photoapp",
            github: "https://github.com/photoapp",
            facebook: "https://www.facebook.com/dominhhung2003",
            tiktok: "https://www.tiktok.com/@runtapchupanh?_r=1&_d=secCgYIASAHKAESPgo8CcNaTtIGK3YCOxlsy9ZE8XQCCg0%2BKdOX39i2rrLZzXsZHvN8IcPz1wc1odal1PBFmJ1pOysKCoAfiVZGGgA%3D&_svg=1&checksum=d4af0892724a5a3444770cbcead4ce81d1e1e7df1ba613d6a009c01d37c7956d&item_author_type=1&sec_uid=MS4wLjABAAAAF1E1KZIixKzT6AUFWtl7ol2e6UCPrznChrx74TWzjISsk7EBXbuDkMIaVaTiLiy3&sec_user_id=MS4wLjABAAAAF1E1KZIixKzT6AUFWtl7ol2e6UCPrznChrx74TWzjISsk7EBXbuDkMIaVaTiLiy3&share_app_id=1180&share_author_id=7122849835637031963&share_link_id=890DD61E-C177-4E91-A4B9-550251E5FA96&share_region=VN&share_scene=1&sharer_language=vi&social_share_type=4&source=h5_t&timestamp=1764128350&tt_from=copy&u_code=e30e992e2jm9i2&ug_btm=b8727%2Cb0&user_id=7122849835637031963&utm_campaign=client_share&utm_medium=ios&utm_source=copy"
        }
    };

    return (
        <div className="about-page">
            <Header />
            <div className="about-container">
                <div className="about-content">
                    <h1 className="about-title">Về chúng tôi</h1>
                    <p className="about-subtitle">Thông tin liên hệ và giới thiệu</p>

                    <div className="about-section">
                        <div className="about-card">
                            <h2 className="card-title">Thông tin liên hệ</h2>
                            <div className="contact-info">
                                <div className="contact-item">
                                    <div className="contact-icon">
                                        <Mail size={20} />
                                    </div>
                                    <div className="contact-details">
                                        <span className="contact-label">Email</span>
                                        <a href={`mailto:${authorInfo.email}`} className="contact-value">
                                            {authorInfo.email}
                                        </a>
                                    </div>
                                </div>

                                <div className="contact-item">
                                    <div className="contact-icon">
                                        <Phone size={20} />
                                    </div>
                                    <div className="contact-details">
                                        <span className="contact-label">Điện thoại</span>
                                        <a href={`tel:${authorInfo.phone}`} className="contact-value">
                                            {authorInfo.phone}
                                        </a>
                                    </div>
                                </div>

                                <div className="contact-item">
                                    <div className="contact-icon">
                                        <MapPin size={20} />
                                    </div>
                                    <div className="contact-details">
                                        <span className="contact-label">Địa chỉ</span>
                                        <span className="contact-value">{authorInfo.address}</span>
                                    </div>
                                </div>

                                <div className="contact-item">
                                    <div className="contact-icon">
                                        <Globe size={20} />
                                    </div>
                                    <div className="contact-details">
                                        <span className="contact-label">Website</span>
                                        <a
                                            href={authorInfo.website}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="contact-value"
                                        >
                                            {authorInfo.website}
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="about-card">
                            <h2 className="card-title">Giới thiệu</h2>
                            <p className="bio-text">{authorInfo.bio}</p>
                        </div>

                        <div className="about-card">
                            <h2 className="card-title">Mạng xã hội</h2>
                            <div className="social-links">
                                {authorInfo.social.linkedin && (
                                    <a
                                        href={authorInfo.social.linkedin}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="social-link"
                                        aria-label="LinkedIn"
                                    >
                                        <Linkedin size={24} />
                                        <span>LinkedIn</span>
                                    </a>
                                )}
                                {authorInfo.social.github && (
                                    <a
                                        href={authorInfo.social.github}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="social-link"
                                        aria-label="GitHub"
                                    >
                                        <Github size={24} />
                                        <span>GitHub</span>
                                    </a>
                                )}
                                {authorInfo.social.facebook && (
                                    <a
                                        href={authorInfo.social.facebook}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="social-link"
                                        aria-label="Facebook"
                                    >
                                        <Facebook size={24} />
                                        <span>Facebook</span>
                                    </a>
                                )}
                                {authorInfo.social.tiktok && (
                                    <a
                                        href={authorInfo.social.tiktok}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="social-link"
                                        aria-label="Twitter"
                                    >
                                        <Twitter size={24} />
                                        <span>Tiktok</span>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AboutPage;

