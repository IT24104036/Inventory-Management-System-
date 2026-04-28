import { motion, useInView } from "framer-motion";
import { useRef } from "react";
const stats = [
    { value: "75%", label: "Waste Reduction", color: "text-[#007A5E]", bg: "bg-[#007A5E]/10" },
    { value: "20+", label: "Hours Saved / Mo", color: "text-[#7C3AED]", bg: "bg-[#7C3AED]/10" },
    { value: "3x", label: "Inventory Speed", color: "text-[#9D1967]", bg: "bg-[#9D1967]/10" },
    { value: "98%", label: "AI Accuracy", color: "text-[#007A5E]", bg: "bg-[#007A5E]/10" },
];
const BenefitsStats = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    return (<section ref={ref} className="relative py-24 bg-[#0F172A] overflow-hidden">
      {/* Dark mode cinematic background */}
      <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-[#7C3AED]/10 rounded-full blur-[150px]"/>
      <div className="absolute bottom-0 left-0 w-[40%] h-[40%] bg-[#007A5E]/5 rounded-full blur-[150px]"/>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (<motion.div key={stat.label} initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.1, duration: 0.6 }} className="text-center group">
              <div className={`mx-auto mb-6 h-24 w-24 rounded-[2rem] ${stat.bg} flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform duration-500`}>
                <span className={`text-4xl md:text-5xl font-black ${stat.color} leading-none tracking-tighter`}>
                  {stat.value}
                </span>
              </div>
              <h4 className="text-white/50 text-xs font-black uppercase tracking-[0.2em]">
                {stat.label}
              </h4>
              <div className="mt-4 h-1 w-0 bg-white/10 mx-auto rounded-full group-hover:w-12 transition-all duration-700"/>
            </motion.div>))}
        </div>
      </div>
    </section>);
};
export default BenefitsStats;
