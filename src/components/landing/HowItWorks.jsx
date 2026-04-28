import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ScanBarcode, Brain, BellRing, TrendingUp, ChevronRight, ArrowRight } from "lucide-react";
const steps = [
    {
        icon: ScanBarcode,
        title: "Ingest",
        description: "Seamlessly add batch and expiry data in seconds. No manual sheets required.",
        color: "text-[#007A5E]",
        bg: "bg-[#007A5E]/10",
    },
    {
        icon: Brain,
        title: "Analyze",
        titleFull: "AI Risk Prediction",
        description: "Invigo's core engine identifies high-risk stock and predicts velocity gaps.",
        color: "text-[#7C3AED]",
        bg: "bg-[#7C3AED]/10",
    },
    {
        icon: BellRing,
        title: "Action",
        titleFull: "Smart Notifications",
        description: "Receive real-time alerts and auto-discount strategies to move stock fast.",
        color: "text-[#9D1967]",
        bg: "bg-[#9D1967]/10",
    },
    {
        icon: TrendingUp,
        title: "Optimize",
        titleFull: "Scale Profit",
        description: "Recover lost revenue and reinvest in growth with zero-waste operations.",
        color: "text-[#007A5E]",
        bg: "bg-[#007A5E]/10",
    },
];
const HowItWorks = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    return (<section id="how-it-works" ref={ref} className="relative py-24 lg:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-20">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={isInView ? { opacity: 1, scale: 1 } : {}}>
            <span className="text-xs font-black uppercase tracking-[0.4em] text-[#7C3AED] mb-4 block">Our Process</span>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-black text-[#0F172A]">
              Simple Steps. <span className="gradient-text">Genius Results.</span>
            </h2>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (<motion.div key={step.title} initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.15, duration: 0.6 }} className="relative group h-full">
              <div className="card-premium h-full p-8 rounded-[2.5rem] flex flex-col items-center text-center transition-all duration-500 group-hover:-translate-y-2">
                <div className={`mb-8 h-20 w-20 rounded-3xl ${step.bg} ${step.color} flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform`}>
                  <step.icon size={40}/>
                </div>

                <span className="text-[10px] font-black uppercase tracking-widest text-[#0F172A]/40 mb-2">Step 0{i + 1}</span>
                <h3 className="font-display text-2xl font-black text-[#0F172A] mb-4">{step.title}</h3>
                <p className="text-[#0F172A]/70 font-medium leading-relaxed mb-6">{step.description}</p>

                {i < steps.length - 1 && (<div className="hidden lg:block absolute top-1/2 -right-6 -translate-y-1/2 z-20">
                    <ChevronRight className="text-[#0F172A]/10 group-hover:text-[#007A5E]/40 transition-colors" size={48}/>
                  </div>)}
              </div>
            </motion.div>))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: 0.8 }} className="mt-20 flex justify-center">
          <button className="px-10 py-5 rounded-[2rem] bg-[#0F172A] text-white font-black text-xl hover:scale-105 transition-all shadow-2xl flex items-center gap-4">
            Deploy Invigo in 5 Minutes
            <ArrowRight size={24}/>
          </button>
        </motion.div>
      </div>
    </section>);
};
export default HowItWorks;
