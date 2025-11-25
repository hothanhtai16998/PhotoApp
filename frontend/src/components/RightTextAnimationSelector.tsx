import { useState, useEffect } from "react";
import { Settings, Sparkles, Zap, Wind, Layers, RotateCw, Type, Scissors, Sparkle, List, FileText, AlignRight } from "lucide-react";
import "./RightTextAnimationSelector.css";

export type RightTextAnimationType = 
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
    | "glitch"
    | "split"
    | "stroke"
    | "wavy";

interface RightTextAnimationSelectorProps {
    currentAnimation: RightTextAnimationType;
    onAnimationChange: (animation: RightTextAnimationType) => void;
}

function RightTextAnimationSelector({ currentAnimation, onAnimationChange }: RightTextAnimationSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Load saved animation from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("rightTextAnimationType") as RightTextAnimationType | null;
        if (saved && [
            "slide", "fade", "bounce", "flip", "zoom", 
            "rotate", "glow", "wave", "elastic", "blur",
            "glitch", "split", "stroke", "wavy"
        ].includes(saved)) {
            onAnimationChange(saved);
        }
    }, [onAnimationChange]);

    const handleAnimationChange = (animation: RightTextAnimationType) => {
        onAnimationChange(animation);
        localStorage.setItem("rightTextAnimationType", animation);
        setIsOpen(false);
    };

    const animations = [
        { 
            value: "slide" as RightTextAnimationType, 
            label: "Slide In", 
            description: "Slides in from the right",
            icon: AlignRight,
            bestFor: "Classic & smooth",
            pros: ["Smooth", "Professional", "Familiar"]
        },
        { 
            value: "fade" as RightTextAnimationType, 
            label: "Fade In", 
            description: "Gentle fade with subtle movement",
            icon: Layers,
            bestFor: "Elegant transitions",
            pros: ["Subtle", "Elegant", "Smooth"]
        },
        { 
            value: "bounce" as RightTextAnimationType, 
            label: "Bounce", 
            description: "Playful bounce effect",
            icon: Zap,
            bestFor: "Energetic feel",
            pros: ["Playful", "Eye-catching", "Dynamic"]
        },
        { 
            value: "flip" as RightTextAnimationType, 
            label: "Flip", 
            description: "3D flip animation",
            icon: RotateCw,
            bestFor: "Modern & creative",
            pros: ["Modern", "Creative", "Unique"]
        },
        { 
            value: "zoom" as RightTextAnimationType, 
            label: "Zoom", 
            description: "Scale up from right",
            icon: Sparkles,
            bestFor: "Dramatic entrance",
            pros: ["Dramatic", "Attention-grabbing", "Smooth"]
        },
        { 
            value: "rotate" as RightTextAnimationType, 
            label: "Rotate", 
            description: "Rotate while fading in",
            icon: RotateCw,
            bestFor: "Dynamic feel",
            pros: ["Dynamic", "Modern", "Energetic"]
        },
        { 
            value: "glow" as RightTextAnimationType, 
            label: "Glow", 
            description: "Glowing entrance with pulse",
            icon: Sparkles,
            bestFor: "Magical effect",
            pros: ["Magical", "Eye-catching", "Smooth"]
        },
        { 
            value: "wave" as RightTextAnimationType, 
            label: "Wave", 
            description: "Wave-like motion",
            icon: Wind,
            bestFor: "Fluid motion",
            pros: ["Fluid", "Organic", "Smooth"]
        },
        { 
            value: "elastic" as RightTextAnimationType, 
            label: "Elastic", 
            description: "Elastic bounce effect",
            icon: Zap,
            bestFor: "Playful & bouncy",
            pros: ["Bouncy", "Playful", "Dynamic"]
        },
        { 
            value: "blur" as RightTextAnimationType, 
            label: "Blur Focus", 
            description: "Blur to focus transition",
            icon: Layers,
            bestFor: "Cinematic effect",
            pros: ["Cinematic", "Elegant", "Smooth"]
        },
        { 
            value: "glitch" as RightTextAnimationType, 
            label: "Glitch", 
            description: "Cyberpunk glitch effect",
            icon: Zap,
            bestFor: "Edgy & modern",
            pros: ["Edgy", "Modern", "Unique"]
        },
        { 
            value: "split" as RightTextAnimationType, 
            label: "Split Reveal", 
            description: "Splits and reveals from right",
            icon: Scissors,
            bestFor: "Bold entrance",
            pros: ["Bold", "Dynamic", "Eye-catching"]
        },
        { 
            value: "stroke" as RightTextAnimationType, 
            label: "Stroke", 
            description: "Animated stroke reveal",
            icon: Type,
            bestFor: "Minimal & modern",
            pros: ["Minimal", "Modern", "Clean"]
        },
        { 
            value: "wavy" as RightTextAnimationType, 
            label: "Wavy", 
            description: "Wavy text animation",
            icon: Wind,
            bestFor: "Playful & fluid",
            pros: ["Playful", "Fluid", "Dynamic"]
        },
    ];

    return (
        <div className="right-text-animation-selector">
            <button
                className="right-animation-selector-toggle"
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Select Right Text Animation Style"
                title="Change Right Text Animation"
            >
                <Settings size={18} />
                <span className="right-animation-selector-label">Right Text: {animations.find(a => a.value === currentAnimation)?.label || "Animation"}</span>
            </button>

            {isOpen && (
                <>
                    <div className="right-animation-selector-overlay" onClick={() => setIsOpen(false)} />
                    <div className="right-animation-selector-menu">
                        <div className="right-animation-selector-menu-header">
                            <h3>Select Right Text Animation</h3>
                            <p className="right-animation-selector-subtitle">Choose how info panel appears</p>
                        </div>
                        <div className="right-animation-selector-options">
                            {animations.map((animation) => {
                                const Icon = animation.icon;
                                return (
                                    <button
                                        key={animation.value}
                                        className={`right-animation-selector-option ${currentAnimation === animation.value ? "active" : ""}`}
                                        onClick={() => handleAnimationChange(animation.value)}
                                    >
                                        <div className="right-animation-option-header">
                                            <div className="right-animation-option-title-row">
                                                <Icon size={18} className="right-animation-option-icon" />
                                                <span className="right-animation-option-label">{animation.label}</span>
                                            </div>
                                            {currentAnimation === animation.value && (
                                                <span className="right-animation-option-badge">Active</span>
                                            )}
                                        </div>
                                        <span className="right-animation-option-description">{animation.description}</span>
                                        <div className="right-animation-option-meta">
                                            <span className="right-animation-option-best-for">Best for: {animation.bestFor}</span>
                                            <div className="right-animation-option-pros">
                                                {animation.pros.map((pro, idx) => (
                                                    <span key={idx} className="right-animation-pro-tag">{pro}</span>
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

export default RightTextAnimationSelector;

