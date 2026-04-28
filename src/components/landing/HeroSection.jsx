import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap, ShieldCheck } from "lucide-react";
// The generated supermarket images
const HERO_IMAGES = [
    "/supermarket_aisle.png",
    "/fresh_produce_display.png",
    "/smart_retail_checkout.png"
];
const HeroSection = () => {
    const [currentImage, setCurrentImage] = useState(0);
    // Auto-shuffle images every 4 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImage((prev) => (prev + 1) % HERO_IMAGES.length);
        }, 4000);
        return () => clearInterval(interval);
    }, []);
    return (<section className="relative min-h-screen flex items-center justify-center pt-20">

      <div className="container relative z-10 mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
        {/* Text Content */}
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, ease: "easeOut" }} className="text-left">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#007A5E]/20 bg-[#007A5E]/5 text-[#007A5E] text-xs font-bold uppercase tracking-widest mb-8 backdrop-blur-md">
            <Sparkles size={14} className="animate-pulse"/>
            Smart Inventory AI
          </motion.div>

          <h1 className="font-display font-alice-bold text-5xl md:text-6xl lg:text-7xl leading-[1.1] mb-6">
            Stop Expiry <br />
            <span className="gradient-text">Start Scaling</span>
          </h1>

          <p className="text-xl text-[#0F172A]/70 mb-10 max-w-lg leading-relaxed font-medium">
            Invigo uses high-performance analytics to predict risks, auto-discount stock, and
            <span className="text-[#007A5E] font-bold"> protect your profits</span> with zero effort.
          </p>


          <div className="mt-12 flex gap-8">
            <div className="flex flex-col">
              <span className="text-3xl font-black text-[#0F172A]">Built for</span>
              <span className="text-xs uppercase tracking-widest text-[#0F172A]/50 font-bold">Small Grocery Stores</span>
            </div>
            <div className="w-px h-12 bg-[#0F172A]/10"/>
            <div className="flex flex-col">
              <span className="text-3xl font-black text-[#007A5E] font-mono tracking-tighter">75%</span>
              <span className="text-xs uppercase tracking-widest text-[#0F172A]/50 font-bold">Waste Reduced</span>
            </div>
          </div>
        </motion.div>

        {/* Visual Content */}
        <motion.div initial={{ opacity: 0, scale: 0.8, rotate: -5 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ duration: 1, delay: 0.4, ease: "easeOut" }} className="relative hidden lg:block">
          <div className="relative z-10 rounded-[2.5rem] border-8 border-white/40 bg-white/10 backdrop-blur-2xl shadow-2xl p-4 overflow-hidden group aspect-[4/3]">
            <div className="absolute inset-0 bg-gradient-to-br from-[#007A5E]/20 to-[#7C3AED]/20 opacity-40 mix-blend-overlay group-hover:opacity-60 transition-opacity z-10 pointer-events-none"/>

            <AnimatePresence mode="popLayout">
              <motion.img key={currentImage} src={HERO_IMAGES[currentImage]} alt="Supermarket Environment" initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, transition: { duration: 1 } }} transition={{ duration: 1.5, ease: "easeInOut" }} className="absolute inset-0 w-full h-full object-cover rounded-[1.8rem] shadow-lg grayscale-[20%] group-hover:grayscale-0 transition-all duration-700 m-4" style={{ width: "calc(100% - 2rem)", height: "calc(100% - 2rem)" }}/>
            </AnimatePresence>

            {/* Floating UI Badges */}
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="absolute top-10 right-4 glass p-4 rounded-2xl shadow-xl flex items-center gap-3 border-[#007A5E]/30">
              <div className="p-2 bg-[#007A5E]/10 rounded-lg text-[#007A5E]">
                <Zap size={20}/>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-[#0F172A]/40 tracking-tighter">Live Analysis</p>
                <p className="text-sm font-black text-[#0F172A]">Real-time Pulse</p>
              </div>
            </motion.div>
            <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }} className="absolute bottom-10 left-4 glass p-4 rounded-2xl shadow-xl flex items-center gap-3 border-[#7C3AED]/30">
              <div className="p-2 bg-[#7C3AED]/10 rounded-lg text-[#7C3AED]">
                <ShieldCheck size={20}/>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-[#0F172A]/40 tracking-tighter">Protection</p>
                <p className="text-sm font-black text-[#0F172A]">Zero Waste Guard</p>
              </div>
            </motion.div>
          </div>
          {/* Decorative Circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#7C3AED]/20 rounded-full blur-3xl -z-10 animate-pulse"/>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#007A5E]/20 rounded-full blur-3xl -z-10 animate-pulse"/>
        </motion.div>
      </div>
    </section>);
};
export default HeroSection;
