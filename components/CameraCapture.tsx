
import React, { useRef, useEffect, useState } from 'react';
import { playCaptureSound } from '../services/audioService';

interface CameraCaptureProps {
    onCapture: (imageSrc: string) => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string>('');
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

    useEffect(() => {
        const startCamera = async () => {
            try {
                // Stop existing stream if any
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }

                // Try High Quality first
                const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                    video: { facingMode, width: { ideal: 1080 }, height: { ideal: 1080 } } 
                });
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                console.warn("HQ Camera failed, trying fallback...", err);
                try {
                    // Fallback to basic constraints
                    const fallbackStream = await navigator.mediaDevices.getUserMedia({ 
                        video: { facingMode } 
                    });
                    setStream(fallbackStream);
                    if (videoRef.current) {
                        videoRef.current.srcObject = fallbackStream;
                    }
                } catch (fallbackErr) {
                    setError("Cannot access camera. Please allow permissions.");
                    console.error(fallbackErr);
                }
            }
        };

        startCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [facingMode]);

    const toggleCamera = () => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    };

    const capture = () => {
        playCaptureSound();

        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            
            const size = Math.min(video.videoWidth, video.videoHeight);
            const x = (video.videoWidth - size) / 2;
            const y = (video.videoHeight - size) / 2;

            canvas.width = size;
            canvas.height = size;
            
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Only flip horizontally for front camera
                if (facingMode === 'user') {
                    ctx.translate(size, 0);
                    ctx.scale(-1, 1);
                }
                
                ctx.drawImage(video, x, y, size, size, 0, 0, size, size);
                const imageSrc = canvas.toDataURL('image/jpeg', 0.9);
                onCapture(imageSrc);
            }
        }
    };

    return (
        <div className="relative w-full max-w-md mx-auto aspect-square rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(217,119,6,0.3)] border-4 border-amber-500 bg-black group">
            {error && <div className="absolute inset-0 flex items-center justify-center text-red-500 p-4 text-center font-pixel text-xs">{error}</div>}
            
            <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className={`w-full h-full object-cover opacity-80 mix-blend-screen contrast-125 ${facingMode === 'user' ? 'transform -scale-x-100' : ''}`}
            />
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,150,0,0.06),_rgba(255,200,0,0.02),_rgba(255,100,0,0.06))] bg-[size:100%_2px,_3px_100%] opacity-40"></div>

            <div className="absolute inset-0 pointer-events-none p-4">
                <div className="absolute top-4 left-4 w-12 h-12 border-t-4 border-l-4 border-amber-400 rounded-tl-lg shadow-[0_0_10px_#f59e0b]"></div>
                <div className="absolute top-4 right-4 w-12 h-12 border-t-4 border-r-4 border-amber-400 rounded-tr-lg shadow-[0_0_10px_#f59e0b]"></div>
                <div className="absolute bottom-4 left-4 w-12 h-12 border-b-4 border-l-4 border-amber-400 rounded-bl-lg shadow-[0_0_10px_#f59e0b]"></div>
                <div className="absolute bottom-4 right-4 w-12 h-12 border-b-4 border-r-4 border-amber-400 rounded-br-lg shadow-[0_0_10px_#f59e0b]"></div>
                
                <div className="absolute inset-0 flex items-center justify-center opacity-50">
                    <div className="w-24 h-24 border border-amber-400/50 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
                    </div>
                    <div className="absolute w-full h-[1px] bg-amber-400/30"></div>
                    <div className="absolute h-full w-[1px] bg-amber-400/30"></div>
                </div>

                <div className="absolute left-0 right-0 h-1 bg-amber-400/50 blur-sm animate-scan-laser shadow-[0_0_15px_#f59e0b]"></div>

                <div className="absolute top-6 left-6 flex flex-col gap-1">
                    <span className="font-pixel text-[8px] text-amber-400 animate-pulse">REC ●</span>
                    <span className="font-mono text-[8px] text-amber-200/70">ISO 800</span>
                    <span className="font-mono text-[8px] text-amber-200/70">F/2.8</span>
                </div>
                
                <div className="absolute bottom-6 right-6 text-right">
                    <span className="font-pixel text-[8px] text-yellow-400 animate-pulse">TARGET LOCKED</span>
                </div>
            </div>

            <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-4 z-20 pointer-events-auto px-6">
                <button
                    onClick={toggleCamera}
                    className="w-12 h-12 bg-amber-700/80 hover:bg-amber-600 rounded-full border-2 border-amber-500 shadow-lg active:scale-95 transition-all flex items-center justify-center"
                    title="Switch Camera"
                >
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
                
                <button 
                    onClick={capture}
                    className="group relative w-20 h-20 active:scale-95 transition-transform"
                >
                    <div className="absolute inset-0 bg-gray-300 rounded-full shadow-[0_5px_0_#9ca3af,0_10px_10px_rgba(0,0,0,0.5)]"></div>
                    <div className="absolute inset-2 bg-gradient-to-br from-red-500 to-red-700 rounded-full border-4 border-red-800 shadow-[inset_0_2px_5px_rgba(255,255,255,0.4)] group-active:translate-y-1 transition-transform">
                        <div className="absolute top-2 left-3 w-4 h-2 bg-white/40 rounded-full transform -rotate-12"></div>
                    </div>
                </button>

                <div className="w-12 h-12"></div>
            </div>

            <style>{`
                @keyframes scan-laser {
                    0% { top: 5%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 95%; opacity: 0; }
                }
                .animate-scan-laser {
                    animation: scan-laser 2s linear infinite;
                }
            `}</style>
        </div>
    );
};

export default CameraCapture;
