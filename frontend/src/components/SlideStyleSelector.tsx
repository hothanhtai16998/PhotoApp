import { useState, useEffect } from "react";
import { Settings, Sparkles, Zap, Wind, Layers, RotateCw, Move, Box, FlipHorizontal, Eye, Split, Grid3x3, DoorOpen, Orbit, Shapes, Shuffle, BookOpen, PanelLeft } from "lucide-react";
import "./SlideStyleSelector.css";
import { loadSlideStyle, saveSlideStyle } from "@/utils/localStorage";

export type SlideTransitionStyle = 
    | "fade"           // Classic fade
    | "slide"          // Horizontal slide
    | "slideVertical"  // Vertical slide
    | "cube"           // 3D cube rotation
    | "flip"           // 3D flip
    | "cover"          // Cover flow
    | "reveal"         // Reveal from side
    | "zoom"           // Zoom in/out
    | "blur"           // Blur transition
    | "glitch"         // Glitch effect
    | "split"          // Split reveal
    | "cards"          // Card stack
    | "parallax"       // Parallax effect
    | "wipe"           // Wipe transition
    | "dissolve"       // Dissolve effect
    | "push"           // Push effect
    | "doors"          // Doors opening
    | "orbit"          // Orbital rotation
    | "morph"          // Morphing transition
    | "swirl"          // Swirling effect
    | "pageTurn"       // Page turn effect
    | "accordion"      // Accordion fold
    | "shuffle";       // Shuffle effect

interface SlideStyleSelectorProps {
    currentStyle: SlideTransitionStyle;
    onStyleChange: (style: SlideTransitionStyle) => void;
}

function SlideStyleSelector({ currentStyle, onStyleChange }: SlideStyleSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Load saved style from localStorage
    useEffect(() => {
        const saved = loadSlideStyle();
        if (saved) {
            onStyleChange(saved);
        }
    }, [onStyleChange]);

    const handleStyleChange = (style: SlideTransitionStyle) => {
        onStyleChange(style);
        saveSlideStyle(style);
        setIsOpen(false);
    };

    const styles = [
        { 
            value: "fade" as SlideTransitionStyle, 
            label: "Fade", 
            description: "Smooth crossfade between slides",
            icon: Layers,
            bestFor: "Elegant & timeless",
            pros: ["Smooth", "Classic", "Professional"]
        },
        { 
            value: "slide" as SlideTransitionStyle, 
            label: "Slide", 
            description: "Horizontal sliding transition",
            icon: Move,
            bestFor: "Dynamic movement",
            pros: ["Dynamic", "Smooth", "Modern"]
        },
        { 
            value: "slideVertical" as SlideTransitionStyle, 
            label: "Slide Vertical", 
            description: "Vertical sliding transition",
            icon: Move,
            bestFor: "Vertical flow",
            pros: ["Unique", "Smooth", "Modern"]
        },
        { 
            value: "cube" as SlideTransitionStyle, 
            label: "Cube 3D", 
            description: "3D cube rotation effect",
            icon: Box,
            bestFor: "Modern & impressive",
            pros: ["3D", "Modern", "Eye-catching"]
        },
        { 
            value: "flip" as SlideTransitionStyle, 
            label: "Flip 3D", 
            description: "3D flip card effect",
            icon: FlipHorizontal,
            bestFor: "Creative presentations",
            pros: ["Creative", "3D", "Unique"]
        },
        { 
            value: "cover" as SlideTransitionStyle, 
            label: "Cover Flow", 
            description: "Cover flow style transition",
            icon: Eye,
            bestFor: "Showcase style",
            pros: ["Showcase", "Smooth", "Modern"]
        },
        { 
            value: "reveal" as SlideTransitionStyle, 
            label: "Reveal", 
            description: "Reveal from side with curtain effect",
            icon: Split,
            bestFor: "Dramatic reveals",
            pros: ["Dramatic", "Smooth", "Eye-catching"]
        },
        { 
            value: "zoom" as SlideTransitionStyle, 
            label: "Zoom", 
            description: "Zoom in/out transition",
            icon: Sparkles,
            bestFor: "Dramatic impact",
            pros: ["Dramatic", "Impactful", "Smooth"]
        },
        { 
            value: "blur" as SlideTransitionStyle, 
            label: "Blur", 
            description: "Blur to focus transition",
            icon: Layers,
            bestFor: "Cinematic feel",
            pros: ["Cinematic", "Elegant", "Smooth"]
        },
        { 
            value: "glitch" as SlideTransitionStyle, 
            label: "Glitch", 
            description: "Cyberpunk glitch transition",
            icon: Zap,
            bestFor: "Edgy & modern",
            pros: ["Edgy", "Modern", "Unique"]
        },
        { 
            value: "split" as SlideTransitionStyle, 
            label: "Split", 
            description: "Split reveal transition",
            icon: Split,
            bestFor: "Bold transitions",
            pros: ["Bold", "Dynamic", "Eye-catching"]
        },
        { 
            value: "cards" as SlideTransitionStyle, 
            label: "Cards", 
            description: "Card stack transition",
            icon: Grid3x3,
            bestFor: "Modern gallery",
            pros: ["Modern", "Smooth", "Elegant"]
        },
        { 
            value: "parallax" as SlideTransitionStyle, 
            label: "Parallax", 
            description: "Parallax scrolling effect",
            icon: Wind,
            bestFor: "Depth & dimension",
            pros: ["Depth", "Modern", "Smooth"]
        },
        { 
            value: "wipe" as SlideTransitionStyle, 
            label: "Wipe", 
            description: "Wipe transition effect",
            icon: Move,
            bestFor: "Clean transitions",
            pros: ["Clean", "Smooth", "Professional"]
        },
        { 
            value: "dissolve" as SlideTransitionStyle, 
            label: "Dissolve", 
            description: "Dissolve transition effect",
            icon: Layers,
            bestFor: "Soft transitions",
            pros: ["Soft", "Elegant", "Smooth"]
        },
        { 
            value: "push" as SlideTransitionStyle, 
            label: "Push", 
            description: "Push current slide off screen",
            icon: Move,
            bestFor: "Dynamic movement",
            pros: ["Dynamic", "Smooth", "Modern"]
        },
        { 
            value: "doors" as SlideTransitionStyle, 
            label: "Doors", 
            description: "Doors opening to reveal next slide",
            icon: DoorOpen,
            bestFor: "Dramatic reveals",
            pros: ["Dramatic", "Creative", "Eye-catching"]
        },
        { 
            value: "orbit" as SlideTransitionStyle, 
            label: "Orbit", 
            description: "Orbital rotation effect",
            icon: Orbit,
            bestFor: "Dynamic rotation",
            pros: ["Dynamic", "Modern", "Smooth"]
        },
        { 
            value: "morph" as SlideTransitionStyle, 
            label: "Morph", 
            description: "Morphing shape transition",
            icon: Shapes,
            bestFor: "Creative storytelling",
            pros: ["Creative", "Unique", "Smooth"]
        },
        { 
            value: "swirl" as SlideTransitionStyle, 
            label: "Swirl", 
            description: "Swirling vortex transition",
            icon: RotateCw,
            bestFor: "Energetic transitions",
            pros: ["Energetic", "Dynamic", "Eye-catching"]
        },
        { 
            value: "pageTurn" as SlideTransitionStyle, 
            label: "Page Turn", 
            description: "Book page turning effect",
            icon: BookOpen,
            bestFor: "Nostalgic feel",
            pros: ["Nostalgic", "Elegant", "Unique"]
        },
        { 
            value: "accordion" as SlideTransitionStyle, 
            label: "Accordion", 
            description: "Accordion fold transition",
            icon: PanelLeft,
            bestFor: "Creative folds",
            pros: ["Creative", "Unique", "Smooth"]
        },
        { 
            value: "shuffle" as SlideTransitionStyle, 
            label: "Shuffle", 
            description: "Shuffle card transition",
            icon: Shuffle,
            bestFor: "Playful transitions",
            pros: ["Playful", "Dynamic", "Modern"]
        },
    ];

    return (
        <div className="slide-style-selector">
            <button
                className="style-selector-toggle"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Select Slide Style"
                title="Change Slide Transition Style"
            >
                <Settings size={18} />
                <span className="style-selector-label">{styles.find(s => s.value === currentStyle)?.label || "Style"}</span>
            </button>

            {isOpen && (
                <>
                    <div className="style-selector-overlay" onClick={() => setIsOpen(false)} />
                    <div className="style-selector-menu">
                        <div className="style-selector-menu-header">
                            <h3>Select Slide Transition Style</h3>
                            <p className="style-selector-subtitle">Choose how slides transition</p>
                        </div>
                        <div className="style-selector-options">
                            {styles.map((style) => {
                                const Icon = style.icon;
                                return (
                                    <button
                                        key={style.value}
                                        className={`style-selector-option ${currentStyle === style.value ? "active" : ""}`}
                                        onClick={() => handleStyleChange(style.value)}
                                    >
                                        <div className="style-option-header">
                                            <div className="style-option-title-row">
                                                <Icon size={18} className="style-option-icon" />
                                                <span className="style-option-label">{style.label}</span>
                                            </div>
                                            {currentStyle === style.value && (
                                                <span className="style-option-badge">Active</span>
                                            )}
                                        </div>
                                        <span className="style-option-description">{style.description}</span>
                                        <div className="style-option-meta">
                                            <span className="style-option-best-for">Best for: {style.bestFor}</span>
                                            <div className="style-option-pros">
                                                {style.pros.map((pro, idx) => (
                                                    <span key={idx} className="style-pro-tag">{pro}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default SlideStyleSelector;

