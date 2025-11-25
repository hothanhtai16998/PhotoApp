import { useState, useEffect } from "react";
import { Settings, Sparkles, Zap, Wind, Layers, RotateCw, Type, Scissors, Sparkle } from "lucide-react";
import "./SlideAnimationSelector.css";

export type SlideAnimationType = 
    | "slide" 
    | "fade" 
    | "bounce" 
    | "flip" 
    | "zoom" 
    | "rotate"
    | "glow"
    | "wave"
    | "elastic"
    | "blur"
    | "typewriter"
    | "letterReveal"
    | "gradient"
    | "shimmer"
    | "glitch"
    | "split"
    | "stroke"
    | "wavy";

interface SlideAnimationSelectorProps {
    currentAnimation: SlideAnimationType;
    onAnimationChange: (animation: SlideAnimationType) => void;
}

function SlideAnimationSelector({ currentAnimation, onAnimationChange }: SlideAnimationSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Load saved animation from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("slideAnimationType") as SlideAnimationType | null;
        if (saved && [
            "slide", "fade", "bounce", "flip", "zoom", 
            "rotate", "glow", "wave", "elastic", "blur",
            "typewriter", "letterReveal", "gradient", "shimmer",
            "glitch", "split", "stroke", "wavy"
        ].includes(saved)) {
            onAnimationChange(saved);
        }
    }, [onAnimationChange]);

    const handleAnimationChange = (animation: SlideAnimationType) => {
        onAnimationChange(animation);
        localStorage.setItem("slideAnimationType", animation);
        setIsOpen(false);
    };

    const animations = [
        { 
            value: "slide" as SlideAnimationType, 
            label: "Slide In", 
            description: "Panels slide in from sides",
            icon: Wind,
            bestFor: "Classic & smooth",
            pros: ["Smooth", "Professional", "Familiar"]
        },
        { 
            value: "fade" as SlideAnimationType, 
            label: "Fade In", 
            description: "Gentle fade with subtle movement",
            icon: Layers,
            bestFor: "Elegant transitions",
            pros: ["Subtle", "Elegant", "Smooth"]
        },
        { 
            value: "bounce" as SlideAnimationType, 
            label: "Bounce", 
            description: "Playful bounce effect",
            icon: Zap,
            bestFor: "Energetic feel",
            pros: ["Playful", "Eye-catching", "Dynamic"]
        },
        { 
            value: "flip" as SlideAnimationType, 
            label: "Flip", 
            description: "3D flip animation",
            icon: RotateCw,
            bestFor: "Modern & creative",
            pros: ["Modern", "Creative", "Unique"]
        },
        { 
            value: "zoom" as SlideAnimationType, 
            label: "Zoom", 
            description: "Scale up from center",
            icon: Sparkles,
            bestFor: "Dramatic entrance",
            pros: ["Dramatic", "Attention-grabbing", "Smooth"]
        },
        { 
            value: "rotate" as SlideAnimationType, 
            label: "Rotate", 
            description: "Rotate while fading in",
            icon: RotateCw,
            bestFor: "Dynamic feel",
            pros: ["Dynamic", "Modern", "Energetic"]
        },
        { 
            value: "glow" as SlideAnimationType, 
            label: "Glow", 
            description: "Glowing entrance with pulse",
            icon: Sparkles,
            bestFor: "Magical effect",
            pros: ["Magical", "Eye-catching", "Smooth"]
        },
        { 
            value: "wave" as SlideAnimationType, 
            label: "Wave", 
            description: "Wave-like motion",
            icon: Wind,
            bestFor: "Fluid motion",
            pros: ["Fluid", "Organic", "Smooth"]
        },
        { 
            value: "elastic" as SlideAnimationType, 
            label: "Elastic", 
            description: "Elastic bounce effect",
            icon: Zap,
            bestFor: "Playful & bouncy",
            pros: ["Bouncy", "Playful", "Dynamic"]
        },
        { 
            value: "blur" as SlideAnimationType, 
            label: "Blur Focus", 
            description: "Blur to focus transition",
            icon: Layers,
            bestFor: "Cinematic effect",
            pros: ["Cinematic", "Elegant", "Smooth"]
        },
        { 
            value: "typewriter" as SlideAnimationType, 
            label: "Typewriter", 
            description: "Text appears character by character",
            icon: Type,
            bestFor: "Retro & dramatic",
            pros: ["Dramatic", "Retro", "Eye-catching"]
        },
        { 
            value: "letterReveal" as SlideAnimationType, 
            label: "Letter Reveal", 
            description: "Letters reveal one by one",
            icon: Type,
            bestFor: "Modern reveal",
            pros: ["Modern", "Smooth", "Elegant"]
        },
        { 
            value: "gradient" as SlideAnimationType, 
            label: "Gradient Flow", 
            description: "Animated gradient text effect",
            icon: Sparkles,
            bestFor: "Colorful & vibrant",
            pros: ["Vibrant", "Colorful", "Dynamic"]
        },
        { 
            value: "shimmer" as SlideAnimationType, 
            label: "Shimmer", 
            description: "Shimmering shine effect",
            icon: Sparkle,
            bestFor: "Premium feel",
            pros: ["Premium", "Elegant", "Smooth"]
        },
        { 
            value: "glitch" as SlideAnimationType, 
            label: "Glitch", 
            description: "Cyberpunk glitch effect",
            icon: Zap,
            bestFor: "Edgy & modern",
            pros: ["Edgy", "Modern", "Unique"]
        },
        { 
            value: "split" as SlideAnimationType, 
            label: "Split Reveal", 
            description: "Text splits and reveals",
            icon: Scissors,
            bestFor: "Bold entrance",
            pros: ["Bold", "Dynamic", "Eye-catching"]
        },
        { 
            value: "stroke" as SlideAnimationType, 
            label: "Stroke", 
            description: "Animated text stroke",
            icon: Type,
            bestFor: "Minimal & modern",
            pros: ["Minimal", "Modern", "Clean"]
        },
        { 
            value: "wavy" as SlideAnimationType, 
            label: "Wavy", 
            description: "Wavy text animation",
            icon: Wind,
            bestFor: "Playful & fluid",
            pros: ["Playful", "Fluid", "Dynamic"]
        },
    ];

    return (
        <div className="slide-animation-selector">
            <button
                className="animation-selector-toggle"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Select Animation Style"
                title="Change Slide Animation"
            >
                <Settings size={18} />
                <span className="animation-selector-label">{animations.find(a => a.value === currentAnimation)?.label || "Animation"}</span>
            </button>

            {isOpen && (
                <>
                    <div className="animation-selector-overlay" onClick={() => setIsOpen(false)} />
                    <div className="animation-selector-menu">
                        <div className="animation-selector-menu-header">
                            <h3>Select Animation Style</h3>
                            <p className="animation-selector-subtitle">Choose how panels appear</p>
                        </div>
                        <div className="animation-selector-options">
                            {animations.map((animation) => {
                                const Icon = animation.icon;
                                return (
                                    <button
                                        key={animation.value}
                                        className={`animation-selector-option ${currentAnimation === animation.value ? "active" : ""}`}
                                        onClick={() => handleAnimationChange(animation.value)}
                                    >
                                        <div className="animation-option-header">
                                            <div className="animation-option-title-row">
                                                <Icon size={18} className="animation-option-icon" />
                                                <span className="animation-option-label">{animation.label}</span>
                                            </div>
                                            {currentAnimation === animation.value && (
                                                <span className="animation-option-badge">Active</span>
                                            )}
                                        </div>
                                        <span className="animation-option-description">{animation.description}</span>
                                        <div className="animation-option-meta">
                                            <span className="animation-option-best-for">Best for: {animation.bestFor}</span>
                                            <div className="animation-option-pros">
                                                {animation.pros.map((pro, idx) => (
                                                    <span key={idx} className="animation-pro-tag">{pro}</span>
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

export default SlideAnimationSelector;

