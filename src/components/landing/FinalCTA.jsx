import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
const FinalCTA = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    return (<section id="cta" ref={ref} className="relative py-24 lg:py-32 bg-transparent">

      <div className="container relative mx-auto px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={isInView ? { opacity: 1, scale: 1 } : {}} transition={{ duration: 0.8 }} className="mx-auto max-w-5xl bg-white border-4 border-[#0F172A]/10 p-12 md:p-24 rounded-[4rem] text-center relative overflow-hidden group hover:border-[#007A5E]/40 hover:shadow-2xl hover:shadow-[#007A5E]/10 transition-all duration-300">
          {/* Animated border/glow */}
          <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-r from-[#007A5E] via-[#7C3AED] to-[#9D1967] group-hover:h-8 transition-all duration-500 opacity-80"/>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.2 }} className="mb-8 inline-flex items-center gap-3 glass px-6 py-2 rounded-full border-white/40">
            <Sparkles size={16} className="text-[#007A5E]"/>
            <span className="text-xs font-black uppercase tracking-widest text-[#0F172A]/60">Unlock Peak Efficiency</span>
          </motion.div>

          <h2 className="font-display text-5xl md:text-7xl font-black text-[#0F172A] leading-tight mb-8 max-w-4xl mx-auto">
            Ready to make your grocery store <span className="gradient-text">smarter</span> and more <span className="gradient-text">profitable?</span>
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-[#0F172A]/70 text-lg md:text-xl font-medium leading-relaxed mb-12">
            Join the elite circle of retailers transforming waste into wealth with Invigo Gen3 AI.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <button onClick={() => window.location.href = '/login'} className="px-12 py-6 rounded-3xl bg-[#0F172A] text-white font-black text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 w-full sm:w-auto">
              Log In to Dashboard
              <ArrowRight size={24}/>
            </button>
          </div>
        </motion.div>
      </div>
    </section>);
};
export default FinalCTA;
