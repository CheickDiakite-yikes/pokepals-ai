
import React, { useState, useEffect, useRef } from 'react';
import { AppState, FriendCard, PokemonStats, ImageSize, TrainerProfile } from './types';
import { generateCardFront, generateCardStats, generateCardBack, checkAndRequestApiKey } from './services/geminiService';
import { playSaveSound } from './services/audioService';
import { saveCardToDB, getAllCardsFromDB, deleteCardFromDB, saveProfileToDB, getProfileFromDB, migrateFromLocalStorage } from './services/dbService';
import { apiService } from './services/apiService';
import { useAuth } from './hooks/useAuth';
import CameraCapture from './components/CameraCapture';
import Card3D from './components/Card3D';
import { AuthForm } from './components/AuthForm';

// --- MOCK DATA FOR EXPLORE PAGE ---
const INITIAL_MOCK_FEED: Array<FriendCard & { user: string, likes: number }> = [
    {
        id: 'mock1',
        user: 'NeonNinja_99',
        likes: 1240,
        originalImage: '', 
        pokemonImage: 'https://placehold.co/600x800/1e1b4b/a5b4fc?text=Vortex+Viper',
        timestamp: Date.now() - 100000,
        stats: {
            name: "Vortex Viper",
            type: "Cosmic",
            hp: 120,
            attack: 95,
            defense: 60,
            description: "Born from a collapsing star, this entity weaves through dimensions.",
            moves: ["Star Dust", "Void Bite"],
            weakness: "Light",
            rarity: "Exotic"
        }
    },
    {
        id: 'mock2',
        user: 'SarahSnaps',
        likes: 856,
        originalImage: '',
        pokemonImage: 'https://placehold.co/600x800/064e3b/6ee7b7?text=Bloom+Guardian',
        timestamp: Date.now() - 200000,
        stats: {
            name: "Bloom Guardian",
            type: "Nature",
            hp: 150,
            attack: 40,
            defense: 100,
            description: "A gentle giant that protects ancient forests from digital decay.",
            moves: ["Root Wall", "Solar Beam"],
            weakness: "Fire",
            rarity: "Legendary"
        }
    },
    {
        id: 'mock3',
        user: 'Tech_Guru',
        likes: 432,
        originalImage: '',
        pokemonImage: 'https://placehold.co/600x800/312e81/818cf8?text=Cyber+Squirrel',
        timestamp: Date.now() - 300000,
        stats: {
            name: "Cyber Squirrel",
            type: "Digital",
            hp: 60,
            attack: 70,
            defense: 30,
            description: "Feeds on fiber optic cables and hoards data packets.",
            moves: ["Glitch Claw", "Byte Bite"],
            weakness: "Water",
            rarity: "Rare"
        }
    }
];

const TutorialOverlay: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
        <div className="bg-[#2a1d12] border-4 border-amber-500 rounded-lg p-6 max-w-sm w-full shadow-[0_0_50px_rgba(245,158,11,0.4)] relative animate-float">
            <button onClick={onClose} className="absolute top-2 right-2 text-amber-600 hover:text-amber-400 font-pixel text-[10px]">SKIP ✕</button>
            <h2 className="font-pixel text-center text-amber-400 text-lg mb-6 drop-shadow-[2px_2px_0_#000]">TRAINER GUIDE</h2>
            
            <div className="space-y-6 font-mono text-xs text-amber-100">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-700 rounded-full border-4 border-[#2a1d12] flex items-center justify-center shrink-0 shadow-lg">
                        <div className="w-4 h-4 bg-white rounded-full"></div>
                    </div>
                    <div>
                        <p className="text-amber-400 font-bold mb-1 font-pixel">1x TAP</p>
                        <p className="text-[10px]">Open your <span className="text-white">CARD DECK</span> to manage your collection.</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-red-700 rounded-full border-4 border-[#2a1d12] flex items-center justify-center shrink-0 relative shadow-lg">
                        <div className="w-4 h-4 bg-white rounded-full"></div>
                        <div className="absolute -top-2 -right-2 text-[10px] font-bold text-yellow-400 bg-black px-1 rounded animate-pulse">2x</div>
                    </div>
                    <div>
                        <p className="text-amber-400 font-bold mb-1 font-pixel">2x TAP</p>
                        <p className="text-[10px]">Activate <span className="text-white">CAMERA</span> to capture new friends.</p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#1f150b] rounded-full border-4 border-amber-700 flex items-center justify-center shrink-0 shadow-lg">
                        <span className="font-pixel text-[10px] text-amber-500">L/R</span>
                    </div>
                    <div>
                        <p className="text-amber-400 font-bold mb-1 font-pixel">NAVIGATION</p>
                        <p className="text-[10px]">Use side buttons to <span className="text-white">EXPLORE</span> feed or view <span className="text-white">PROFILE</span>.</p>
                    </div>
                </div>
            </div>

            <button 
                onClick={onClose}
                className="w-full mt-8 py-3 bg-amber-500 text-black font-pixel text-xs rounded border-b-4 border-amber-700 active:border-b-0 active:translate-y-1 transition-all hover:bg-amber-400 flex items-center justify-center gap-2"
            >
                <span>START ADVENTURE</span>
                <span className="animate-blink">▶</span>
            </button>
        </div>
    </div>
);

const App: React.FC = () => {
    const { user, loading: authLoading, isAuthenticated, login, signup } = useAuth();
    
    const [state, setState] = useState<AppState>(AppState.LANDING);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [generatedCard, setGeneratedCard] = useState<FriendCard | null>(null);
    const [collection, setCollection] = useState<FriendCard[]>([]);
    const [trainerProfile, setTrainerProfile] = useState<TrainerProfile>({ name: "ASH KETCHUM" });
    const [loadingText, setLoadingText] = useState<string>('');
    const [showTutorial, setShowTutorial] = useState(false);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'All' | 'Exotic' | 'Legendary' | 'Rare' | 'Common'>('All');
    
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    const [feed, setFeed] = useState(INITIAL_MOCK_FEED);
    const [likedCardIds, setLikedCardIds] = useState<Set<string>>(new Set());
    const [exploreTab, setExploreTab] = useState<'feed' | 'likes'>('feed');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Initial Data Load
    useEffect(() => {
        if (!isAuthenticated || authLoading) return;
        
        const initData = async () => {
            // 1. Load Cards from backend
            try {
                const cards = await apiService.getCards();
                setCollection(cards);
            } catch (e) {
                console.error("Failed to load cards from backend", e);
                // Fallback to local IndexedDB if backend fails
                try {
                    const dbCards = await getAllCardsFromDB();
                    setCollection(dbCards);
                } catch (dbError) {
                    console.error("Failed to load cards from local DB", dbError);
                }
            }

            // 2. Load Profile from user data
            if (user?.trainerName) {
                setTrainerProfile({ name: user.trainerName });
            }

            // 3. Load Likes (small data, keeping in localStorage for simplicity as it's just IDs)
            const savedLikes = localStorage.getItem('pokepals_likes');
            if (savedLikes) {
                try {
                    setLikedCardIds(new Set(JSON.parse(savedLikes)));
                } catch (e) { console.error(e); }
            }
        };

        initData();
    }, [isAuthenticated, authLoading, user]);

    const handleCloseTutorial = () => {
        localStorage.setItem('pokepals_tutorial_seen', 'true');
        setShowTutorial(false);
    };

    const handleStart = async () => {
        const hasKey = await checkAndRequestApiKey();
        if (hasKey) {
            const tutorialSeen = localStorage.getItem('pokepals_tutorial_seen');
            if (!tutorialSeen) {
                setShowTutorial(true);
            }
            setState(AppState.DECK);
        } else {
             alert("Please select a valid API key to continue.");
        }
    };

    const handlePokeBallClick = () => {
        if (clickTimerRef.current) {
            clearTimeout(clickTimerRef.current);
            clickTimerRef.current = null;
            setState(AppState.CAMERA);
        } else {
            clickTimerRef.current = setTimeout(() => {
                clickTimerRef.current = null;
                setState(AppState.DECK);
            }, 250);
        }
    };

    const handleCapture = async (imageSrc: string) => {
        setCapturedImage(imageSrc);
        setState(AppState.PROCESSING);
        
        try {
            setLoadingText("DECODING BIO-SIGNATURE...");
            const stats = await generateCardStats(imageSrc);

            setLoadingText(`SYNTHESIZING ${stats.rarity.toUpperCase()} ENTITY...`);
            
            const [frontImage, backImage] = await Promise.all([
                generateCardFront(imageSrc, stats, '1K'),
                generateCardBack(stats)
            ]);
            
            if (!frontImage) throw new Error("Failed to generate card art");

            const newCard: FriendCard = {
                id: Date.now().toString(),
                originalImage: imageSrc,
                pokemonImage: frontImage,
                cardBackImage: backImage || undefined,
                stats: stats,
                timestamp: Date.now(),
                isPublic: false
            };

            setGeneratedCard(newCard);
            setState(AppState.RESULT);
        } catch (error) {
            console.error(error);
            setLoadingText("DATA CORRUPTION DETECTED. RETRY.");
            setTimeout(() => setState(AppState.CAMERA), 2000);
        }
    };

    const handleKeep = async () => {
        if (generatedCard) {
            try {
                setLoadingText("UPLOADING TO STORAGE...");
                setState(AppState.PROCESSING);
                
                // Upload images to object storage
                const [originalPath, pokemonPath, backPath] = await Promise.all([
                    apiService.uploadImage(generatedCard.originalImage),
                    apiService.uploadImage(generatedCard.pokemonImage),
                    generatedCard.cardBackImage ? apiService.uploadImage(generatedCard.cardBackImage) : Promise.resolve(undefined)
                ]);
                
                // Save card with object storage paths
                const savedCard = await apiService.saveCard({
                    originalImage: originalPath,
                    pokemonImage: pokemonPath,
                    cardBackImage: backPath,
                    stats: generatedCard.stats,
                    timestamp: generatedCard.timestamp,
                    isPublic: generatedCard.isPublic,
                });
                
                setCollection(prev => [savedCard, ...prev]);
                playSaveSound();
                setState(AppState.DECK);
                setGeneratedCard(null);
                setSearchTerm(''); 
            } catch (e) {
                console.error("Save failed", e);
                alert("Could not save card. Please try again.");
                setState(AppState.RESULT);
            }
        }
    };

    const handleDiscard = () => {
        setGeneratedCard(null);
        setState(AppState.CAMERA);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (window.confirm("RELEASE ENTITY? This action cannot be undone.")) {
            try {
                await apiService.deleteCard(id);
                setCollection(prev => prev.filter(c => c.id !== id));
            } catch (err) {
                console.error("Delete failed", err);
                alert("Could not delete card. Please try again.");
            }
        }
    };

    const handleDownload = (e: React.MouseEvent, card: FriendCard) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = card.pokemonImage;
        link.download = `pokepals_${card.stats.name.replace(/\s+/g, '_')}_${card.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const togglePublic = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const cardToUpdate = collection.find(c => c.id === id);
        if (cardToUpdate) {
            const updatedCard = { ...cardToUpdate, isPublic: !cardToUpdate.isPublic };
            try {
                await saveCardToDB(updatedCard);
                setCollection(prev => prev.map(c => c.id === id ? updatedCard : c));
            } catch (err) {
                console.error("Update failed", err);
            }
        }
    };

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const newProfile = { ...trainerProfile, avatar: reader.result as string };
                try {
                    await saveProfileToDB(newProfile);
                    setTrainerProfile(newProfile);
                } catch (err) {
                    console.error("Profile save failed", err);
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const handleNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newName = e.target.value.toUpperCase();
        const newProfile = { ...trainerProfile, name: newName };
        setTrainerProfile(newProfile); // Optimistic UI
        try {
            await saveProfileToDB(newProfile);
        } catch (err) {
            console.error(err);
        }
    };

    const calculateLevelAndXP = () => {
        let totalXP = 0;
        collection.forEach(card => {
            // Defensive check: skip cards without proper stats
            if (!card || !card.stats || !card.stats.rarity) {
                console.warn('[calculateLevelAndXP] Card missing stats:', card);
                return;
            }
            
            switch(card.stats.rarity) {
                case 'Common': totalXP += 10; break;
                case 'Rare': totalXP += 50; break;
                case 'Legendary': totalXP += 200; break;
                case 'Exotic': totalXP += 500; break;
                default: totalXP += 10;
            }
        });
        
        const level = Math.floor(totalXP / 1000) + 1;
        const xpForCurrentLevel = totalXP % 1000;
        const xpToNextLevel = 1000;
        const progress = (xpForCurrentLevel / xpToNextLevel) * 100;
        
        return { level, totalXP, xpForCurrentLevel, progress };
    };

    const xpStats = calculateLevelAndXP();

    const toggleLike = (cardId: string) => {
        const isLiked = likedCardIds.has(cardId);
        const newLikedIds = new Set(likedCardIds);
        
        if (isLiked) {
            newLikedIds.delete(cardId);
        } else {
            newLikedIds.add(cardId);
        }
        
        setLikedCardIds(newLikedIds);
        localStorage.setItem('pokepals_likes', JSON.stringify(Array.from(newLikedIds)));

        setFeed(prevFeed => prevFeed.map(card => {
            if (card.id === cardId) {
                return {
                    ...card,
                    likes: isLiked ? card.likes - 1 : card.likes + 1
                };
            }
            return card;
        }));
    };

    const filteredCollection = collection.filter(card => {
        const matchesSearch = card.stats.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              card.stats.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              card.stats.type.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = activeFilter === 'All' || card.stats.rarity === activeFilter;
        return matchesSearch && matchesFilter;
    });

    const userPublicItems = collection
        .filter(c => c.isPublic)
        .map(c => ({
            ...c,
            user: trainerProfile.name,
            likes: 0
        }));
    
    const globalFeed = [...userPublicItems, ...feed].sort((a, b) => b.timestamp - a.timestamp);

    const displayedFeed = exploreTab === 'feed' 
        ? globalFeed 
        : globalFeed.filter(card => likedCardIds.has(card.id));

    const renderBottomNav = () => (
        <div className="fixed bottom-0 left-0 right-0 h-[90px] z-50 pointer-events-none">
            <div className="absolute inset-0 bg-[#2a1d12] border-t-4 border-[#453018] shadow-[0_-10px_30px_rgba(0,0,0,0.8)] pointer-events-auto flex items-center justify-between px-8 pb-4">
                
                <button 
                    className={`group flex flex-col items-center gap-1 transition-all active:scale-95 ${state === AppState.EXPLORE ? 'brightness-125' : 'brightness-75 hover:brightness-100'}`}
                    onClick={() => setState(AppState.EXPLORE)} 
                >
                     <div className="w-12 h-12 bg-[#1f150b] rounded-full border-b-4 border-black shadow-lg flex items-center justify-center relative">
                        <div className="w-8 h-3 bg-[#3e2c18] rounded-sm absolute"></div>
                        <div className="w-3 h-8 bg-[#3e2c18] rounded-sm absolute"></div>
                        {state === AppState.EXPLORE && <div className="w-2 h-2 bg-amber-400 rounded-full z-10 animate-pulse shadow-[0_0_5px_#f59e0b]"></div>}
                     </div>
                     <span className="font-pixel text-[8px] text-[#8a6a4b] mt-1">EXPLORE</span>
                </button>

                <div className="relative -top-8">
                    <button 
                        onClick={handlePokeBallClick}
                        className="w-20 h-20 bg-gradient-to-br from-red-600 to-red-800 rounded-full border-[6px] border-[#2a1d12] shadow-[0_5px_0_#1a120b,0_0_20px_rgba(220,38,38,0.3)] flex items-center justify-center group active:translate-y-1 active:shadow-none transition-all"
                    >
                        <div className="w-16 h-1 bg-[#2a1d12] absolute top-1/2 -translate-y-1/2 opacity-30"></div>
                        <div className="w-8 h-8 bg-white rounded-full border-4 border-[#2a1d12] z-10 shadow-inner group-hover:bg-amber-100"></div>
                    </button>
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 w-32 text-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                         <span className="text-[8px] font-mono text-amber-600 bg-black/80 px-1 rounded">2x TAP: CAMERA</span>
                    </div>
                </div>

                <button 
                    className={`group flex flex-col items-center gap-1 transition-all active:scale-95 ${state === AppState.PROFILE ? 'brightness-125' : 'brightness-75 hover:brightness-100'}`}
                    onClick={() => setState(AppState.PROFILE)}
                >
                    <div className="w-12 h-12 bg-[#1f150b] rounded-full border-b-4 border-black shadow-lg flex items-center justify-center relative">
                         <div className={`w-8 h-8 rounded-full border-2 ${state === AppState.PROFILE ? 'bg-amber-600 border-amber-400' : 'bg-[#3e2c18] border-[#5c4224]'} flex items-center justify-center`}>
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path></svg>
                         </div>
                    </div>
                    <span className="font-pixel text-[8px] text-[#8a6a4b] mt-1">TRAINER</span>
                </button>
            </div>
        </div>
    );

    // Show loading screen while checking authentication
    if (authLoading) {
        return (
            <div className="h-[100dvh] w-full bg-[#1c140d] flex flex-col items-center justify-center text-amber-400 font-fredoka">
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                    <div className="absolute bottom-0 w-[200%] h-[60%] bg-[linear-gradient(transparent_0%,_rgba(217,119,6,0.2)_1px,_transparent_1px),_linear-gradient(90deg,transparent_0%,_rgba(217,119,6,0.2)_1px,_transparent_1px)] bg-[size:40px_40px] [transform:perspective(500px)_rotateX(60deg)] animate-grid-move origin-bottom opacity-100"></div>
                </div>
                <div className="z-10 flex flex-col items-center gap-4">
                    <h1 className="font-pixel text-2xl text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-amber-600 tracking-widest animate-pulse">
                        POKEPALS
                    </h1>
                    <div className="font-mono text-xs text-amber-500">Authenticating...</div>
                </div>
            </div>
        );
    }

    // Show login screen if not authenticated
    if (!isAuthenticated) {
        return (
            <div className="h-[100dvh] w-full bg-[#1c140d] flex flex-col items-center justify-center text-amber-400 font-fredoka relative overflow-auto">
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                    <div className="absolute bottom-0 w-[200%] h-[60%] bg-[linear-gradient(transparent_0%,_rgba(217,119,6,0.2)_1px,_transparent_1px),_linear-gradient(90deg,transparent_0%,_rgba(217,119,6,0.2)_1px,_transparent_1px)] bg-[size:40px_40px] [transform:perspective(500px)_rotateX(60deg)] animate-grid-move origin-bottom opacity-100"></div>
                    <div className="absolute inset-0 opacity-40">
                        {[...Array(30)].map((_, i) => (
                            <div key={i} className="absolute w-[2px] h-[2px] bg-yellow-100 rounded-full animate-twinkle" style={{
                                top: `${Math.random() * 60}%`,
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 3}s`
                            }}></div>
                        ))}
                    </div>
                </div>
                <div className="z-10 flex flex-col items-center space-y-8 p-6 text-center w-full max-w-lg my-auto">
                    <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-gradient-to-b from-yellow-200 via-amber-500 to-amber-900 blur-2xl opacity-40 z-[-1]"></div>
                    <div className="relative animate-float">
                        <h1 className="font-pixel text-4xl md:text-5xl text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-amber-600 drop-shadow-[4px_4px_0_#451a03] tracking-widest leading-tight">
                            POKEPALS
                        </h1>
                        <p className="font-pixel text-[8px] md:text-[10px] text-amber-200 tracking-[0.4em] uppercase mt-4 text-glow">
                            Insert Coin to Collect Friends
                        </p>
                    </div>
                    <AuthForm onLogin={login} onSignup={signup} />
                    <p className="font-mono text-[8px] text-amber-700">V2.5.0 - NANO BANANA BUILD</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[100dvh] w-full bg-[#1c140d] flex flex-col overflow-hidden text-amber-400 font-fredoka relative">
            
            {/* --- GLOBAL RETRO BACKGROUND --- */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <div className={`absolute bottom-0 w-[200%] h-[60%] bg-[linear-gradient(transparent_0%,_rgba(217,119,6,0.2)_1px,_transparent_1px),_linear-gradient(90deg,transparent_0%,_rgba(217,119,6,0.2)_1px,_transparent_1px)] bg-[size:40px_40px] [transform:perspective(500px)_rotateX(60deg)] animate-grid-move origin-bottom ${state === AppState.LANDING ? 'opacity-100' : 'opacity-20'}`}></div>
                <div className="absolute inset-0 opacity-40">
                    {[...Array(30)].map((_, i) => (
                        <div key={i} className="absolute w-[2px] h-[2px] bg-yellow-100 rounded-full animate-twinkle" style={{
                            top: `${Math.random() * 60}%`,
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`
                        }}></div>
                    ))}
                </div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.1)_50%),_linear-gradient(90deg,_rgba(255,200,0,0.03),_rgba(255,100,0,0.02),_rgba(200,150,0,0.03))] bg-[size:100%_2px,_3px_100%] opacity-20 animate-crt-flicker pointer-events-none"></div>
            </div>

            {/* TUTORIAL OVERLAY */}
            {showTutorial && <TutorialOverlay onClose={handleCloseTutorial} />}

            {/* HEADER */}
            {(state === AppState.PROCESSING || state === AppState.CAMERA || state === AppState.RESULT) && (
                <header className="w-full p-4 flex justify-between items-center z-50 fixed top-0 left-0 right-0 pointer-events-none">
                    <div className="flex items-center gap-2 pointer-events-auto cursor-pointer group" onClick={() => setState(AppState.LANDING)}>
                        <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-800 rounded-full border-2 border-white shadow-[0_0_15px_rgba(220,38,38,0.6)] flex items-center justify-center group-hover:scale-110 transition-transform">
                            <div className="w-2 h-2 bg-white rounded-full opacity-80"></div>
                        </div>
                        <h1 className="text-sm font-pixel text-amber-100 tracking-widest drop-shadow-[2px_2px_0_#451a03]">POKEPALS</h1>
                    </div>
                </header>
            )}

            {/* LANDING PAGE */}
            {state === AppState.LANDING && (
                <main className="flex-1 flex flex-col items-center justify-center relative z-10">
                    <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-gradient-to-b from-yellow-200 via-amber-500 to-amber-900 blur-2xl opacity-40 z-[-1]"></div>
                    <div className="flex flex-col items-center space-y-12 p-6 text-center w-full max-w-lg">
                        <div className="relative animate-float">
                            <h1 className="font-pixel text-5xl md:text-6xl text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-amber-600 drop-shadow-[4px_4px_0_#451a03] tracking-widest leading-tight">
                                POKEPALS
                            </h1>
                            <p className="font-pixel text-[8px] md:text-[10px] text-amber-200 tracking-[0.4em] uppercase mt-4 text-glow">
                                Insert Coin to Collect Friends
                            </p>
                        </div>
                        <div className="relative group cursor-pointer" onClick={handleStart}>
                            <div className="absolute -inset-2 bg-red-600 rounded-lg blur-lg opacity-30 group-hover:opacity-60 transition-opacity animate-pulse"></div>
                            <button className="relative px-12 py-5 bg-[#b91c1c] text-white font-pixel text-xs rounded border-b-8 border-[#7f1d1d] active:border-b-0 active:translate-y-2 transition-all flex items-center gap-3 group-hover:brightness-110">
                                <span className="animate-blink">▶</span> PRESS START
                            </button>
                        </div>
                        <p className="font-mono text-[8px] text-amber-700">V2.5.0 - NANO BANANA BUILD</p>
                    </div>
                </main>
            )}

            {/* CAMERA PAGE */}
            {state === AppState.CAMERA && (
                <main className="flex-1 flex flex-col items-center justify-center p-4 z-10 space-y-6 pt-16">
                    <div className="text-center space-y-1">
                        <h2 className="font-pixel text-xs text-amber-300 text-glow">MISSION: ACQUIRE TARGET</h2>
                        <p className="font-mono text-[9px] text-amber-500/70 tracking-widest">ALIGN SUBJECT IN VIEWFINDER</p>
                    </div>
                    <div className="w-full max-w-md relative">
                        <CameraCapture onCapture={handleCapture} />
                    </div>
                    <div className="flex gap-4">
                         <button onClick={() => setState(AppState.DECK)} className="px-6 py-2 bg-[#2a1d12] border border-[#453018] text-[#8a6a4b] rounded font-pixel text-[8px] hover:bg-[#3e2c18] transition-all">
                            &lt; BACK TO DECK
                        </button>
                    </div>
                </main>
            )}

            {/* PROCESSING PAGE */}
            {state === AppState.PROCESSING && (
                <main className="flex-1 flex flex-col items-center justify-center z-10 space-y-8 bg-[#0f0803]/90 p-8">
                    <div className="w-full max-w-xs border-2 border-amber-500 p-1 rounded bg-[#1f150b] shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                        <div className="h-48 flex flex-col items-center justify-center border border-amber-500/30 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#f59e0b_2px,#f59e0b_4px)] bg-[size:100%_4px] opacity-80 relative overflow-hidden">
                             <div className="font-pixel text-4xl text-amber-500 animate-bounce">?</div>
                             <div className="absolute inset-0 bg-amber-500/10 animate-pulse"></div>
                        </div>
                    </div>
                    <div className="space-y-4 w-full max-w-xs">
                        <h3 className="font-pixel text-xs text-amber-400 text-center animate-pulse">{loadingText}</h3>
                        <div className="h-4 w-full bg-[#1f150b] border-2 border-amber-500 p-1">
                            <div className="h-full bg-amber-500 w-full animate-progress-fill"></div>
                        </div>
                    </div>
                </main>
            )}

            {/* RESULT PAGE */}
            {state === AppState.RESULT && generatedCard && (
                <main className="flex-1 flex flex-col items-center justify-start pt-24 p-4 z-10 overflow-y-auto w-full pb-20">
                    <div className="w-full max-w-md flex flex-col gap-6 mb-10">
                        <div className="flex items-center justify-between px-4 py-2 bg-[#2a1d12]/90 border-2 border-amber-600 shadow-[0_0_10px_#d97706]">
                            <h2 className="font-pixel text-xs text-amber-400 animate-pulse">NEW DATA ACQUIRED</h2>
                            <span className="text-[10px] font-mono text-amber-200">#{generatedCard.id.slice(-4)}</span>
                        </div>
                        <div className="w-full max-w-[320px] mx-auto relative group">
                            <Card3D image={generatedCard.pokemonImage} stats={generatedCard.stats} cardBackImage={generatedCard.cardBackImage}/>
                            <button onClick={(e) => handleDownload(e, generatedCard)} className="absolute -top-4 -right-4 w-12 h-12 bg-blue-700 border-b-4 border-blue-900 text-white rounded-lg flex items-center justify-center shadow-lg active:border-b-0 active:translate-y-1 transition-all z-20" title="Save to Disk">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-4">
                             <button onClick={handleDiscard} className="py-4 bg-[#2a1d12] border-b-4 border-[#1f150b] text-[#8a6a4b] font-pixel text-[10px] rounded active:border-b-0 active:translate-y-1 transition-all uppercase">TRASH</button>
                            <button onClick={handleKeep} className="py-4 bg-amber-500 border-b-4 border-amber-700 text-black font-pixel text-[10px] rounded shadow-[0_0_15px_rgba(245,158,11,0.4)] active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center gap-2 uppercase">SAVE TO DECK</button>
                        </div>
                    </div>
                </main>
            )}

            {/* --- TRAINER PROFILE PAGE --- */}
            {state === AppState.PROFILE && (
                <div className="flex flex-col h-full z-10 bg-[#1c140d]/95 overflow-y-auto scrollbar-hide pb-32">
                    <div className="p-4 pt-safe-top">
                        <h2 className="font-pixel text-xl text-amber-400 mb-6 text-center drop-shadow-[2px_2px_0_#000]">TRAINER PASSPORT</h2>
                        
                        <div className="w-full max-w-md mx-auto bg-[#2a1d12] border-4 border-[#f59e0b] rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.2)] p-6 relative overflow-hidden">
                             <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(245,158,11,0.05)_25%,rgba(245,158,11,0.05)_50%,transparent_50%,transparent_75%,rgba(245,158,11,0.05)_75%,rgba(245,158,11,0.05)_100%)] bg-[size:20px_20px] pointer-events-none"></div>

                             <div className="relative z-10 flex flex-col items-center">
                                {/* Avatar */}
                                <div 
                                    className="relative w-32 h-32 rounded-full border-4 border-amber-500 bg-[#1f150b] overflow-hidden cursor-pointer group mb-4 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                     {trainerProfile.avatar ? (
                                         <img src={trainerProfile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                     ) : (
                                         <div className="w-full h-full flex items-center justify-center text-amber-700 group-hover:text-amber-500">
                                             <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20"><path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" /><path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
                                         </div>
                                     )}
                                     <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-pixel transition-opacity">UPLOAD</div>
                                     <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
                                </div>

                                {/* Name & ID */}
                                <input 
                                    value={trainerProfile.name}
                                    onChange={handleNameChange}
                                    className="bg-transparent font-pixel text-2xl text-center text-amber-100 outline-none w-full placeholder-amber-800 mb-1"
                                    placeholder="ENTER NAME"
                                />
                                <div className="bg-[#1f150b] px-3 py-1 rounded-full border border-[#453018] mb-6">
                                     <p className="font-mono text-[10px] text-amber-600">ID: 8842-1920-5521</p>
                                </div>

                                {/* Stats Row */}
                                <div className="grid grid-cols-3 gap-3 w-full mb-6">
                                    <div className="bg-[#1f150b] border border-[#453018] rounded p-3 text-center">
                                         <span className="font-pixel text-[9px] text-amber-600 block mb-1">LEVEL</span>
                                         <span className="font-pixel text-xl text-yellow-400">{xpStats.level}</span>
                                    </div>
                                    <div className="bg-[#1f150b] border border-[#453018] rounded p-3 text-center">
                                         <span className="font-pixel text-[9px] text-orange-600 block mb-1">TOTAL XP</span>
                                         <span className="font-pixel text-xl text-orange-400">{xpStats.totalXP}</span>
                                    </div>
                                    <div className="bg-[#1f150b] border border-[#453018] rounded p-3 text-center">
                                         <span className="font-pixel text-[9px] text-pink-600 block mb-1">CARDS</span>
                                         <span className="font-pixel text-xl text-pink-400">{collection.length}</span>
                                    </div>
                                </div>

                                {/* XP Progress */}
                                <div className="w-full bg-[#1f150b] p-3 rounded border border-[#453018]">
                                    <div className="flex justify-between text-[9px] font-pixel text-amber-600 mb-2">
                                        <span>PROGRESS TO LVL {xpStats.level + 1}</span>
                                        <span>{Math.floor(xpStats.progress)}%</span>
                                    </div>
                                    <div className="h-4 w-full bg-black border border-[#453018] rounded-full overflow-hidden">
                                        <div className="h-full bg-[repeating-linear-gradient(45deg,#d97706,#d97706_5px,#f59e0b_5px,#f59e0b_10px)]" style={{ width: `${xpStats.progress}%` }}></div>
                                    </div>
                                    <p className="text-[8px] font-mono text-center mt-2 text-amber-700/80">{1000 - xpStats.xpForCurrentLevel} XP REMAINING</p>
                                </div>
                             </div>
                        </div>

                        {/* PUBLIC SHOWCASE SECTION */}
                        <div className="mt-8 w-full max-w-md mx-auto">
                             <h3 className="font-pixel text-sm text-amber-400 mb-4 border-b-2 border-[#453018] pb-2 flex items-center justify-between">
                                 <span>PUBLIC SHOWCASE</span>
                                 <span className="text-[9px] font-mono text-amber-600">{collection.filter(c => c.isPublic).length} VISIBLE</span>
                             </h3>
                             {collection.filter(c => c.isPublic).length === 0 ? (
                                 <div className="text-center p-8 border-2 border-dashed border-[#453018] rounded bg-[#1f150b] opacity-70">
                                     <p className="font-mono text-[10px] text-amber-700 mb-2">NO CARDS MARKED PUBLIC</p>
                                     <button onClick={() => setState(AppState.DECK)} className="text-[10px] text-amber-500 underline hover:text-amber-300">GO TO DECK TO MANAGE</button>
                                 </div>
                             ) : (
                                 <div className="grid grid-cols-2 gap-4">
                                     {collection.filter(c => c.isPublic).map(card => (
                                         <div key={card.id} className="relative group">
                                             <div className="scale-90">
                                                 <Card3D image={card.pokemonImage} stats={card.stats} cardBackImage={card.cardBackImage}/>
                                             </div>
                                             <div className="absolute top-0 right-0 p-1">
                                                 <button 
                                                    onClick={(e) => togglePublic(e, card.id)} 
                                                    className="bg-red-600 border-b-2 border-red-800 text-white text-[9px] px-2 py-1 rounded font-pixel shadow hover:bg-red-500 active:border-b-0 active:translate-y-0.5"
                                                 >
                                                    HIDE
                                                 </button>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             )}
                        </div>
                    </div>
                    {renderBottomNav()}
                </div>
            )}

            {/* --- DECK PAGE (Collection Grid) --- */}
            {state === AppState.DECK && (
                <div className="flex flex-col h-full z-10 bg-[#1c140d]/95">
                    <div className="sticky top-0 bg-[#1c140d] z-20 pt-safe-top pb-2 px-4 space-y-3 shadow-xl border-b border-[#2a1d12]">
                         <div className="flex justify-between items-end mb-2">
                            <h2 className="font-pixel text-lg text-amber-400">CARD DECK</h2>
                            <div className="text-[10px] font-mono text-amber-600">{filteredCollection.length} CARDS</div>
                         </div>
                        
                        <div className="flex gap-2 items-center">
                            <input 
                                type="text" 
                                placeholder="SEARCH CARDS..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-[#0f0803] border-2 border-[#453018] rounded p-2 text-xs text-amber-400 placeholder-amber-900 focus:border-amber-500 outline-none font-mono uppercase"
                            />
                            <button 
                                onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
                                className="p-2 bg-[#2a1d12] border-2 border-[#453018] rounded text-amber-400 hover:bg-[#3e2c18] active:bg-[#1f150b]"
                            >
                                {viewMode === 'list' ? '▦' : '☰'}
                            </button>
                        </div>
                        
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                            {['All', 'Exotic', 'Legendary', 'Rare', 'Common'].map(filter => (
                                <button 
                                    key={filter}
                                    onClick={() => setActiveFilter(filter as any)}
                                    className={`px-3 py-1 rounded text-[8px] font-pixel uppercase whitespace-nowrap border-b-2 transition-all active:border-b-0 active:translate-y-0.5 ${activeFilter === filter ? 'bg-amber-700 border-amber-600 text-yellow-100' : 'bg-[#2a1d12] border-[#3e2c18] text-[#8a6a4b]'}`}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto px-4 py-4 pb-32 scrollbar-hide">
                         {filteredCollection.length === 0 ? (
                             <div className="py-12 flex flex-col items-center justify-center text-center opacity-50 space-y-4">
                                 <div className="font-pixel text-4xl text-[#453018]">EMPTY</div>
                                 <p className="font-mono text-xs text-[#8a6a4b]">CAPTURE FRIENDS TO START</p>
                             </div>
                        ) : (
                            <div className={`grid ${viewMode === 'list' ? 'grid-cols-1 gap-8 max-w-sm' : 'grid-cols-3 gap-3 max-w-3xl'} w-full mx-auto transition-all duration-500`}>
                                {filteredCollection.map((card) => (
                                    <div key={card.id} className="relative group/card transform transition-all duration-300 hover:z-10 hover:scale-105">
                                        <Card3D 
                                            image={card.pokemonImage} 
                                            stats={card.stats} 
                                            cardBackImage={card.cardBackImage}
                                        />
                                        <div className="absolute -top-2 left-0 right-0 flex justify-between px-1 z-20">
                                            <button 
                                                onClick={(e) => handleDownload(e, card)}
                                                className="w-7 h-7 bg-blue-700 border-b-2 border-blue-900 text-white rounded flex items-center justify-center shadow active:border-b-0 active:translate-y-1"
                                            >
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                                            </button>
                                            <button 
                                                onClick={(e) => togglePublic(e, card.id)}
                                                className={`w-7 h-7 border-b-2 rounded flex items-center justify-center shadow active:border-b-0 active:translate-y-1 ${card.isPublic ? 'bg-green-600 border-green-800 text-white' : 'bg-gray-600 border-gray-800 text-gray-300'}`}
                                            >
                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd"></path></svg>
                                            </button>
                                            <button 
                                                onClick={(e) => handleDelete(e, card.id)}
                                                className="w-7 h-7 bg-red-600 border-b-2 border-red-800 text-white rounded flex items-center justify-center shadow active:border-b-0 active:translate-y-1"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {renderBottomNav()}
                </div>
            )}

            {/* EXPLORE PAGE */}
            {state === AppState.EXPLORE && (
                 <div className="flex flex-col h-full z-10 bg-[#1c140d]/95">
                    <div className="shrink-0 bg-[#2a1d12] border-b-4 border-[#1f150b] pt-safe-top z-30">
                         <div className="px-5 py-4 flex justify-between items-center">
                            <h2 className="font-pixel text-sm text-orange-400 drop-shadow-[2px_2px_0_#000]">NET_FEED</h2>
                            <div className="flex gap-2">
                                <div className="w-3 h-3 bg-red-500 rounded-full animate-blink"></div>
                                <span className="text-[10px] font-mono text-orange-200">LIVE</span>
                            </div>
                         </div>
                         <div className="px-5 pb-3 flex gap-2">
                            <button onClick={() => setExploreTab('feed')} className={`flex-1 py-2 font-pixel text-[8px] border-b-2 transition-all ${exploreTab === 'feed' ? 'border-amber-400 text-amber-400 bg-amber-900/20' : 'border-[#453018] text-[#8a6a4b]'}`}>GLOBAL</button>
                            <button onClick={() => setExploreTab('likes')} className={`flex-1 py-2 font-pixel text-[8px] border-b-2 transition-all ${exploreTab === 'likes' ? 'border-pink-400 text-pink-400 bg-pink-900/20' : 'border-[#453018] text-[#8a6a4b]'}`}>SAVED</button>
                         </div>
                    </div>
                    <div className="flex-1 overflow-y-auto px-4 py-6 pb-32 scrollbar-hide relative z-0 space-y-8">
                         {displayedFeed.length === 0 ? (
                             <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-2">
                                 <div className="font-pixel text-xl text-[#453018]">NO DATA</div>
                                 <p className="font-mono text-[10px] text-[#8a6a4b]">{exploreTab === 'likes' ? "NO CARDS SAVED" : "FEED EMPTY"}</p>
                             </div>
                         ) : displayedFeed.map((card, index) => (
                             <div key={card.id} className="w-full max-w-sm mx-auto bg-[#0f0803] border-2 border-[#453018] p-2 rounded shadow-[5px_5px_0_#000]">
                                <div className="flex items-center justify-between mb-2 px-1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-pixel text-yellow-500">{card.user}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => toggleLike(card.id)} className={`flex items-center gap-1 font-mono text-[10px] transition-colors ${likedCardIds.has(card.id) ? 'text-pink-500' : 'text-[#8a6a4b] hover:text-pink-400'}`}>
                                            <span className={`transform transition-transform ${likedCardIds.has(card.id) ? 'scale-125' : ''}`}>{likedCardIds.has(card.id) ? '♥' : '♡'}</span>
                                            {card.likes + (likedCardIds.has(card.id) && card.user === trainerProfile.name ? 1 : 0)}
                                        </button>
                                    </div>
                                </div>
                                <Card3D image={card.pokemonImage} stats={card.stats} cardBackImage={card.cardBackImage}/>
                             </div>
                         ))}
                    </div>
                    {renderBottomNav()}
                 </div>
            )}
            
            <style>{`
                @keyframes grid-move { 0% { transform: perspective(500px) rotateX(60deg) translateY(0); } 100% { transform: perspective(500px) rotateX(60deg) translateY(40px); } }
                .animate-grid-move { animation: grid-move 1s linear infinite; }
                @keyframes crt-flicker { 0% { opacity: 0.1; } 5% { opacity: 0.2; } 10% { opacity: 0.1; } 100% { opacity: 0.1; } }
                .animate-crt-flicker { animation: crt-flicker 4s infinite; }
                @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
                .animate-blink { animation: blink 1s step-end infinite; }
                @keyframes progress-fill { 0% { width: 0%; } 100% { width: 100%; } }
                .animate-progress-fill { animation: progress-fill 2s ease-out forwards; }
                @keyframes twinkle { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 1; transform: scale(1.5); } }
                .animate-twinkle { animation: twinkle 3s infinite; }
                @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                .animate-float { animation: float 4s ease-in-out infinite; }
                .text-glow { text-shadow: 0 0 10px currentColor; }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                .pb-safe { padding-bottom: env(safe-area-inset-bottom, 20px); }
                .pt-safe-top { padding-top: max(env(safe-area-inset-top), 20px); }
            `}</style>
        </div>
    );
};

export default App;
