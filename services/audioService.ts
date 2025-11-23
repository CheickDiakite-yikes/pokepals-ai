
// Simple Retro Synth Service using Web Audio API
// Generates 8-bit style arcade sounds without external files

let audioCtx: AudioContext | null = null;

const getCtx = () => {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtx = new AudioContextClass();
    }
    return audioCtx;
};

const createOscillator = (type: OscillatorType, freq: number, duration: number, startTime: number, ctx: AudioContext, vol: number = 0.1) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    
    gain.gain.setValueAtTime(vol, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(startTime);
    osc.stop(startTime + duration);
};

export const playCaptureSound = () => {
    try {
        const ctx = getCtx();
        if (ctx.state === 'suspended') ctx.resume();
        
        const t = ctx.currentTime;
        
        // Retro Laser/Shutter: Sawtooth wave dropping in pitch
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(880, t);
        osc.frequency.exponentialRampToValueAtTime(110, t + 0.2);
        
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.2);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.2);

        // Burst of white noise for mechanical shutter feel
        const bufferSize = ctx.sampleRate * 0.1;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.15, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
        noise.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(t);

    } catch (e) {
        console.error("Audio play failed", e);
    }
};

export const playSaveSound = () => {
    try {
        const ctx = getCtx();
        if (ctx.state === 'suspended') ctx.resume();
        const t = ctx.currentTime;

        // "Ka-ching" / Level Up: Ascending Arpeggio
        // C5, E5, G5, C6
        createOscillator('square', 523.25, 0.1, t, ctx, 0.1);
        createOscillator('square', 659.25, 0.1, t + 0.08, ctx, 0.1);
        createOscillator('square', 783.99, 0.1, t + 0.16, ctx, 0.1);
        createOscillator('square', 1046.50, 0.4, t + 0.24, ctx, 0.15); // Sustain last note

    } catch (e) {
         console.error("Audio play failed", e);
    }
};

export const playFlipSound = () => {
    try {
        const ctx = getCtx();
        if (ctx.state === 'suspended') ctx.resume();
        
        // Filtered noise for "swish" / card flip
        const bufferSize = ctx.sampleRate * 0.15;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        
        // Lowpass filter to make it sound like paper/cardboard
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1200;
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.15);
        
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        noise.start();
    } catch (e) {
         console.error("Audio play failed", e);
    }
};
