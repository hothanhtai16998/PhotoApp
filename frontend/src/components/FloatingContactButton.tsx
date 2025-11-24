import { useState } from "react";
import { Mail, Phone, MapPin, Globe, Linkedin, Github, Facebook, Twitter, X, Info, ChevronUp, MessageCircle, Plus } from "lucide-react";
import "./FloatingContactButton.css";

// Author information - same as AboutPage
const authorInfo = {
    name: "PhotoApp Team",
    email: "contact@photoapp.com",
    phone: "+1 (555) 123-4567",
    address: "123 Photography Street, Creative City, CC 12345",
    website: "https://photoapp.com",
    bio: "Welcome to PhotoApp! We are passionate about photography and providing a platform for photographers and artists to share their beautiful work with the world.",
    social: {
        linkedin: "https://linkedin.com/company/photoapp",
        github: "https://github.com/photoapp",
        facebook: "https://facebook.com/photoapp",
        twitter: "https://twitter.com/photoapp"
    }
};

type ContactOption = "A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M" | "N";

interface FloatingContactButtonProps {
    option?: ContactOption;
}

function FloatingContactButton({ option = "A" }: FloatingContactButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const [menuExpanded, setMenuExpanded] = useState(false);
    const [showTab, setShowTab] = useState(false);

    // Option A: Simple Button → Modal
    if (option === "A") {
        return (
            <>
                <button 
                    className="floating-contact-btn floating-contact-btn-a"
                    onClick={() => setIsOpen(true)}
                    aria-label="Contact Information"
                >
                    <Mail size={24} />
                </button>

                {isOpen && (
                    <div className="contact-modal-overlay" onClick={() => setIsOpen(false)}>
                        <div className="contact-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="contact-modal-header">
                                <h2 className="contact-modal-title">Thông tin liên hệ</h2>
                                <button 
                                    className="contact-modal-close"
                                    onClick={() => setIsOpen(false)}
                                    aria-label="Close"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="contact-modal-content">
                                <ContactInfoContent />
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Option B: Button → Slide-in Drawer
    if (option === "B") {
        return (
            <>
                <button 
                    className="floating-contact-btn floating-contact-btn-b"
                    onClick={() => setIsOpen(true)}
                    aria-label="Contact Information"
                >
                    <Phone size={24} />
                </button>

                <div className={`contact-drawer-overlay ${isOpen ? "open" : ""}`} onClick={() => setIsOpen(false)}>
                    <div 
                        className={`contact-drawer ${isOpen ? "open" : ""}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="contact-drawer-header">
                            <h2 className="contact-drawer-title">Thông tin liên hệ</h2>
                            <button 
                                className="contact-drawer-close"
                                onClick={() => setIsOpen(false)}
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="contact-drawer-content">
                            <ContactInfoContent />
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // Option C: Expandable Button
    if (option === "C") {
        return (
            <>
                <div className={`floating-contact-expandable ${isExpanded ? "expanded" : ""}`}>
                    {isExpanded && (
                        <div className="expandable-quick-info">
                            <a href={`mailto:${authorInfo.email}`} className="quick-info-item">
                                <Mail size={18} />
                                <span>{authorInfo.email}</span>
                            </a>
                            <a href={`tel:${authorInfo.phone}`} className="quick-info-item">
                                <Phone size={18} />
                                <span>{authorInfo.phone}</span>
                            </a>
                        </div>
                    )}
                    <button 
                        className="floating-contact-btn floating-contact-btn-c"
                        onClick={() => {
                            if (isExpanded) {
                                setIsOpen(true);
                            } else {
                                setIsExpanded(true);
                            }
                        }}
                        aria-label="Contact Information"
                    >
                        {isExpanded ? <Info size={24} /> : <Mail size={24} />}
                    </button>
                </div>

                {isOpen && (
                    <div className="contact-modal-overlay" onClick={() => setIsOpen(false)}>
                        <div className="contact-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="contact-modal-header">
                                <h2 className="contact-modal-title">Thông tin liên hệ</h2>
                                <button 
                                    className="contact-modal-close"
                                    onClick={() => {
                                        setIsOpen(false);
                                        setIsExpanded(false);
                                    }}
                                    aria-label="Close"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="contact-modal-content">
                                <ContactInfoContent />
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Option D: Always-Visible Mini Panel
    if (option === "D") {
        return (
            <>
                <div className="floating-contact-panel">
                    <div className="panel-quick-info">
                        <a href={`mailto:${authorInfo.email}`} className="panel-info-item">
                            <Mail size={16} />
                            <span className="panel-info-text">{authorInfo.email}</span>
                        </a>
                        <a href={`tel:${authorInfo.phone}`} className="panel-info-item">
                            <Phone size={16} />
                            <span className="panel-info-text">{authorInfo.phone}</span>
                        </a>
                    </div>
                    <button 
                        className="panel-more-btn"
                        onClick={() => setIsOpen(true)}
                        aria-label="More Information"
                    >
                        <Info size={18} />
                        <span>Thêm</span>
                    </button>
                </div>

                {isOpen && (
                    <div className="contact-modal-overlay" onClick={() => setIsOpen(false)}>
                        <div className="contact-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="contact-modal-header">
                                <h2 className="contact-modal-title">Thông tin liên hệ</h2>
                                <button 
                                    className="contact-modal-close"
                                    onClick={() => setIsOpen(false)}
                                    aria-label="Close"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="contact-modal-content">
                                <ContactInfoContent />
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Option E: Multi-Button FAB (Material Design Style)
    if (option === "E") {
        return (
            <>
                <div className={`fab-menu ${menuExpanded ? "expanded" : ""}`}>
                    {menuExpanded && (
                        <div className="fab-menu-items">
                            <a href={`mailto:${authorInfo.email}`} className="fab-menu-item" title="Email">
                                <Mail size={20} />
                            </a>
                            <a href={`tel:${authorInfo.phone}`} className="fab-menu-item" title="Phone">
                                <Phone size={20} />
                            </a>
                            <a href={authorInfo.website} target="_blank" rel="noopener noreferrer" className="fab-menu-item" title="Website">
                                <Globe size={20} />
                            </a>
                            <button className="fab-menu-item" onClick={() => setIsOpen(true)} title="More Info">
                                <Info size={20} />
                            </button>
                        </div>
                    )}
                    <button 
                        className="floating-contact-btn floating-contact-btn-e"
                        onClick={() => setMenuExpanded(!menuExpanded)}
                        aria-label="Contact Menu"
                    >
                        {menuExpanded ? <X size={24} /> : <Plus size={24} />}
                    </button>
                </div>

                {isOpen && (
                    <div className="contact-modal-overlay" onClick={() => setIsOpen(false)}>
                        <div className="contact-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="contact-modal-header">
                                <h2 className="contact-modal-title">Thông tin liên hệ</h2>
                                <button 
                                    className="contact-modal-close"
                                    onClick={() => setIsOpen(false)}
                                    aria-label="Close"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="contact-modal-content">
                                <ContactInfoContent />
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Option F: Bottom Sheet (Mobile-First)
    if (option === "F") {
        return (
            <>
                <button 
                    className="floating-contact-btn floating-contact-btn-f"
                    onClick={() => setIsOpen(true)}
                    aria-label="Contact Information"
                >
                    <MessageCircle size={24} />
                </button>

                <div className={`bottom-sheet-overlay ${isOpen ? "open" : ""}`} onClick={() => setIsOpen(false)}>
                    <div 
                        className={`bottom-sheet ${isOpen ? "open" : ""}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bottom-sheet-handle" onClick={() => setIsOpen(false)} />
                        <div className="bottom-sheet-header">
                            <h2 className="bottom-sheet-title">Thông tin liên hệ</h2>
                            <button 
                                className="bottom-sheet-close"
                                onClick={() => setIsOpen(false)}
                                aria-label="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="bottom-sheet-content">
                            <ContactInfoContent />
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // Option G: Hover Tooltip + Click Modal
    if (option === "G") {
        return (
            <>
                <div 
                    className="floating-contact-tooltip-wrapper"
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                >
                    {showTooltip && (
                        <div className="contact-tooltip">
                            <div className="tooltip-item">
                                <Mail size={14} />
                                <span>{authorInfo.email}</span>
                            </div>
                            <div className="tooltip-item">
                                <Phone size={14} />
                                <span>{authorInfo.phone}</span>
                            </div>
                        </div>
                    )}
                    <button 
                        className="floating-contact-btn floating-contact-btn-g"
                        onClick={() => setIsOpen(true)}
                        aria-label="Contact Information"
                    >
                        <Info size={24} />
                    </button>
                </div>

                {isOpen && (
                    <div className="contact-modal-overlay" onClick={() => setIsOpen(false)}>
                        <div className="contact-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="contact-modal-header">
                                <h2 className="contact-modal-title">Thông tin liên hệ</h2>
                                <button 
                                    className="contact-modal-close"
                                    onClick={() => setIsOpen(false)}
                                    aria-label="Close"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="contact-modal-content">
                                <ContactInfoContent />
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Option H: Split Action Button
    if (option === "H") {
        return (
            <>
                <div className="split-action-button">
                    <a 
                        href={`tel:${authorInfo.phone}`}
                        className="split-action-top"
                        aria-label="Call Now"
                    >
                        <Phone size={18} />
                        <span>Gọi ngay</span>
                    </a>
                    <button 
                        className="split-action-bottom"
                        onClick={() => setIsOpen(true)}
                        aria-label="More Information"
                    >
                        <ChevronUp size={16} />
                    </button>
                </div>

                {isOpen && (
                    <div className="contact-modal-overlay" onClick={() => setIsOpen(false)}>
                        <div className="contact-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="contact-modal-header">
                                <h2 className="contact-modal-title">Thông tin liên hệ</h2>
                                <button 
                                    className="contact-modal-close"
                                    onClick={() => setIsOpen(false)}
                                    aria-label="Close"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="contact-modal-content">
                                <ContactInfoContent />
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Option I: Chat Bubble Style
    if (option === "I") {
        return (
            <>
                <button 
                    className="floating-contact-btn floating-contact-btn-i chat-bubble-btn"
                    onClick={() => setIsOpen(true)}
                    aria-label="Contact Information"
                >
                    <MessageCircle size={24} />
                </button>

                {isOpen && (
                    <div className="contact-modal-overlay" onClick={() => setIsOpen(false)}>
                        <div className="contact-modal contact-modal-chat" onClick={(e) => e.stopPropagation()}>
                            <div className="contact-modal-header">
                                <h2 className="contact-modal-title">Liên hệ với chúng tôi</h2>
                                <button 
                                    className="contact-modal-close"
                                    onClick={() => setIsOpen(false)}
                                    aria-label="Close"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="contact-modal-content">
                                <ContactInfoContent />
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Option J: Corner Ribbon/Banner
    if (option === "J") {
        return (
            <>
                <div className="corner-ribbon">
                    <div className="ribbon-content">
                        <a href={`mailto:${authorInfo.email}`} className="ribbon-item">
                            <Mail size={14} />
                            <span>{authorInfo.email}</span>
                        </a>
                        <a href={`tel:${authorInfo.phone}`} className="ribbon-item">
                            <Phone size={14} />
                            <span>{authorInfo.phone}</span>
                        </a>
                    </div>
                    <button 
                        className="ribbon-more-btn"
                        onClick={() => setIsOpen(true)}
                        aria-label="More Information"
                    >
                        Thêm
                    </button>
                </div>

                {isOpen && (
                    <div className="contact-modal-overlay" onClick={() => setIsOpen(false)}>
                        <div className="contact-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="contact-modal-header">
                                <h2 className="contact-modal-title">Thông tin liên hệ</h2>
                                <button 
                                    className="contact-modal-close"
                                    onClick={() => setIsOpen(false)}
                                    aria-label="Close"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="contact-modal-content">
                                <ContactInfoContent />
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Option K: Slide-out Tab
    if (option === "K") {
        return (
            <>
                <div className={`slide-out-tab-wrapper ${showTab ? "open" : ""}`}>
                    <button 
                        className="slide-out-tab-trigger"
                        onClick={() => setShowTab(!showTab)}
                        aria-label="Toggle Contact Info"
                    >
                        <Info size={18} />
                    </button>
                    <div className="slide-out-tab-panel">
                        <div className="tab-panel-header">
                            <h3>Thông tin liên hệ</h3>
                            <button onClick={() => setShowTab(false)} aria-label="Close">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="tab-panel-content">
                            <ContactInfoContent />
                        </div>
                    </div>
                </div>
            </>
        );
    }

    // Option L: Animated Pulsing Button
    if (option === "L") {
        return (
            <>
                <button 
                    className="floating-contact-btn floating-contact-btn-l pulsing-btn"
                    onClick={() => setIsOpen(true)}
                    aria-label="Contact Information"
                >
                    <Phone size={24} />
                </button>

                {isOpen && (
                    <div className="contact-modal-overlay" onClick={() => setIsOpen(false)}>
                        <div className="contact-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="contact-modal-header">
                                <h2 className="contact-modal-title">Thông tin liên hệ</h2>
                                <button 
                                    className="contact-modal-close"
                                    onClick={() => setIsOpen(false)}
                                    aria-label="Close"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="contact-modal-content">
                                <ContactInfoContent />
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Option M: Floating Menu (Multiple Options)
    if (option === "M") {
        return (
            <>
                <div className={`floating-menu-wrapper ${menuExpanded ? "expanded" : ""}`}>
                    {menuExpanded && (
                        <div className="floating-menu-items">
                            <a href={`mailto:${authorInfo.email}`} className="floating-menu-item">
                                <Mail size={18} />
                                <span>Email</span>
                            </a>
                            <a href={`tel:${authorInfo.phone}`} className="floating-menu-item">
                                <Phone size={18} />
                                <span>Phone</span>
                            </a>
                            <a href={authorInfo.website} target="_blank" rel="noopener noreferrer" className="floating-menu-item">
                                <Globe size={18} />
                                <span>Website</span>
                            </a>
                            <a href={authorInfo.social.linkedin} target="_blank" rel="noopener noreferrer" className="floating-menu-item">
                                <Linkedin size={18} />
                                <span>LinkedIn</span>
                            </a>
                            <button className="floating-menu-item" onClick={() => setIsOpen(true)}>
                                <Info size={18} />
                                <span>More</span>
                            </button>
                        </div>
                    )}
                    <button 
                        className="floating-contact-btn floating-contact-btn-m"
                        onClick={() => setMenuExpanded(!menuExpanded)}
                        aria-label="Contact Menu"
                    >
                        {menuExpanded ? <X size={24} /> : <Plus size={24} />}
                    </button>
                </div>

                {isOpen && (
                    <div className="contact-modal-overlay" onClick={() => setIsOpen(false)}>
                        <div className="contact-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="contact-modal-header">
                                <h2 className="contact-modal-title">Thông tin liên hệ</h2>
                                <button 
                                    className="contact-modal-close"
                                    onClick={() => setIsOpen(false)}
                                    aria-label="Close"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="contact-modal-content">
                                <ContactInfoContent />
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // Option N: Sticky Contact Bar
    if (option === "N") {
        return (
            <>
                <div className="sticky-contact-bar">
                    <div className="contact-bar-content">
                        <a href={`mailto:${authorInfo.email}`} className="bar-item">
                            <Mail size={16} />
                            <span>{authorInfo.email}</span>
                        </a>
                        <a href={`tel:${authorInfo.phone}`} className="bar-item">
                            <Phone size={16} />
                            <span>{authorInfo.phone}</span>
                        </a>
                        <div className="bar-social">
                            <a href={authorInfo.social.linkedin} target="_blank" rel="noopener noreferrer" className="bar-social-item">
                                <Linkedin size={16} />
                            </a>
                            <a href={authorInfo.social.github} target="_blank" rel="noopener noreferrer" className="bar-social-item">
                                <Github size={16} />
                            </a>
                            <a href={authorInfo.social.facebook} target="_blank" rel="noopener noreferrer" className="bar-social-item">
                                <Facebook size={16} />
                            </a>
                            <a href={authorInfo.social.twitter} target="_blank" rel="noopener noreferrer" className="bar-social-item">
                                <Twitter size={16} />
                            </a>
                        </div>
                        <button 
                            className="bar-more-btn"
                            onClick={() => setIsOpen(true)}
                            aria-label="More Information"
                        >
                            Thêm
                        </button>
                    </div>
                </div>

                {isOpen && (
                    <div className="contact-modal-overlay" onClick={() => setIsOpen(false)}>
                        <div className="contact-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="contact-modal-header">
                                <h2 className="contact-modal-title">Thông tin liên hệ</h2>
                                <button 
                                    className="contact-modal-close"
                                    onClick={() => setIsOpen(false)}
                                    aria-label="Close"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="contact-modal-content">
                                <ContactInfoContent />
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    return null;
}

// Shared contact info content component
function ContactInfoContent() {
    return (
        <>
            <div className="contact-info-section">
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

            <div className="contact-bio-section">
                <h3 className="contact-section-title">Giới thiệu</h3>
                <p className="contact-bio-text">{authorInfo.bio}</p>
            </div>

            <div className="contact-social-section">
                <h3 className="contact-section-title">Mạng xã hội</h3>
                <div className="contact-social-links">
                    {authorInfo.social.linkedin && (
                        <a 
                            href={authorInfo.social.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="contact-social-link"
                            aria-label="LinkedIn"
                        >
                            <Linkedin size={20} />
                            <span>LinkedIn</span>
                        </a>
                    )}
                    {authorInfo.social.github && (
                        <a 
                            href={authorInfo.social.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="contact-social-link"
                            aria-label="GitHub"
                        >
                            <Github size={20} />
                            <span>GitHub</span>
                        </a>
                    )}
                    {authorInfo.social.facebook && (
                        <a 
                            href={authorInfo.social.facebook}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="contact-social-link"
                            aria-label="Facebook"
                        >
                            <Facebook size={20} />
                            <span>Facebook</span>
                        </a>
                    )}
                    {authorInfo.social.twitter && (
                        <a 
                            href={authorInfo.social.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="contact-social-link"
                            aria-label="Twitter"
                        >
                            <Twitter size={20} />
                            <span>Twitter</span>
                        </a>
                    )}
                </div>
            </div>
        </>
    );
}

export default FloatingContactButton;

