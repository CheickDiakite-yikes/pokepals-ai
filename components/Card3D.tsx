
import React, { useState } from 'react';
import { PokemonStats } from '../types';
import { playFlipSound } from '../services/audioService';

interface Card3DProps {
    image: string;
    stats: PokemonStats;
    cardBackImage?: string;
    isFlipped?: boolean;
    onClick?: () => void;
    className?: string;
}

const Card3D: React.FC<Card3DProps> = ({ image, stats, cardBackImage, isFlipped = false, onClick, className = "" }) => {
    const [internalFlip, setInternalFlip] = useState(false);
    
    const flippedState = isFlipped || internalFlip;

    const handleFlip = () => {
        playFlipSound();
        if (onClick) onClick();
        else setInternalFlip(!internalFlip);
    };

    // Rarity Color Logic for Outer Glow/Shadow only
    const getRarityStyles = (rarity: string) => {
        switch (rarity) {
            case 'Exotic':
                return { shadow: 'shadow-[0_0_30px_rgba(239,68,68,0.8)]' };
            case 'Legendary':
                return { shadow: 'shadow-[0_0_25px_rgba(234,179,8,0.7)]' };
            case 'Rare':
                return { shadow: 'shadow-[0_0_20px_rgba(59,130,246,0.6)]' };
            default: // Common
                return { shadow: 'shadow-[0_0_15px_rgba(255,255,255,0.3)]' };
        }
    };

    const styles = getRarityStyles(stats.rarity);

    return (
        <div 
            className={`relative w-full aspect-[3/4] perspective-1000 cursor-pointer group ${className} transition-all duration-300 rounded-[5%] hover:scale-[1.02] ${styles.shadow}`}
            onClick={handleFlip}
            style={{ perspective: '1000px' }}
        >
            <style>{`
                @keyframes shine {
                    to { background-position: 200% 0; }
                }
                .holo-shine {
                    background: linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.2) 30%, transparent 40%, transparent 60%, rgba(255,255,255,0.2) 70%, transparent 100%);
                    background-size: 200% 100%;
                    animation: shine 4s infinite linear;
                    pointer-events: none;
                }
                .exotic-glitch {
                    background: linear-gradient(115deg, transparent 0%, rgba(255,0,0,0.1) 20%, rgba(0,255,255,0.1) 40%, transparent 100%);
                    background-size: 200% 100%;
                    animation: shine 0.7s infinite linear;
                    pointer-events: none;
                }
                /* iOS Safari 3D Fixes */
                .transform-style-3d {
                    transform-style: preserve-3d;
                    -webkit-transform-style: preserve-3d;
                }
                .backface-hidden {
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                }
                .rotate-y-180 {
                    transform: rotateY(180deg);
                }
            `}</style>

            <div 
                className={`w-full h-full relative transform-style-3d transition-transform duration-700 ${flippedState ? 'rotate-y-180' : ''}`}
            >
                {/* FRONT OF CARD */}
                {/* iOS Fix: Separate the 3D face (backface-hidden) from the clipping container (overflow-hidden) */}
                <div 
                    className="absolute inset-0 w-full h-full backface-hidden"
                    style={{ WebkitBackfaceVisibility: 'hidden' }}
                >
                    <div className="w-full h-full rounded-[4.5%] overflow-hidden relative bg-black" style={{ transform: 'translateZ(0)' }}>
                        {/* The Full AI Generated Card Image */}
                        <img src={image} alt={stats.name} className="absolute inset-0 w-full h-full object-cover" />

                        {/* Holographic Overlays */}
                        {stats.rarity === 'Legendary' && (
                             <div className="absolute inset-0 holo-shine z-10 mix-blend-overlay opacity-50"></div>
                        )}
                        {stats.rarity === 'Exotic' && (
                             <div className="absolute inset-0 exotic-glitch z-10 mix-blend-color-dodge opacity-40"></div>
                        )}
                    </div>
                </div>

                {/* BACK OF CARD */}
                <div 
                    className="absolute inset-0 w-full h-full backface-hidden rotate-y-180"
                    style={{ WebkitBackfaceVisibility: 'hidden' }} 
                >
                     <div className="w-full h-full rounded-[4.5%] overflow-hidden bg-[#2a1d12] border border-[#453018] relative" style={{ transform: 'translateZ(0)' }}>
                         {cardBackImage ? (
                             <div className="relative w-full h-full">
                                {/* AI Generated Back Image */}
                                <img src={cardBackImage} alt="Card Data Back" className="absolute inset-0 w-full h-full object-cover" />
                                
                                {/* Optional Holo shine on back */}
                                {(stats.rarity === 'Legendary' || stats.rarity === 'Exotic') && (
                                    <div className="absolute inset-0 holo-shine z-10 mix-blend-overlay opacity-30"></div>
                                )}
                             </div>
                         ) : (
                             /* Fallback Back Design */
                            <div className="relative w-full h-full bg-[#2a1d12] flex flex-col items-center justify-center overflow-hidden">
                                 <div className="text-center p-4">
                                    <h2 className="font-pixel text-yellow-400">LOADING...</h2>
                                 </div>
                            </div>
                         )}
                     </div>
                </div>
            </div>
        </div>
    );
};

export default Card3D;
