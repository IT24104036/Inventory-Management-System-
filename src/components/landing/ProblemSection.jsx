import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { TrendingDown, Clock, XCircle } from "lucide-react";
const painPoints = [
    {
        icon: XCircle,
        title: "The Expiry Leak",
        description: "Up to 30% of perishables vanish before sale. It's not just waste; it's lost capital every single day.",
        color: "text-[#9D1967]",
        bg: "bg-[#9D1967]/10",
    },
    {
        icon: TrendingDown,
        title: "Inventory Blindness",
        description: "Ordering by 'gut feeling' leads to dead stock or empty shelves. Scaling becomes impossible without data.",
        color: "text-[#7C3AED]",
        bg: "bg-[#7C3AED]/10",
    },
    {
        icon: Clock,
        title: "The Digital Divide",
        hasAiBadge: true,
        description: "Outdated systems create barriers between you and your customers. Bridging the gap with smart technology is the key to staying competitive.",
        color: "text-[#007A5E]",
        bg: "bg-[#007A5E]/10",
    },
];
const ProblemSection = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    return (<section ref={ref} className="relative py-24 lg:py-32 bg-transparent">

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={isInView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.8 }}>
            <span className="text-xs font-black uppercase tracking-[0.3em] text-[#9D1967] mb-4 block">The Industry Crisis</span>
            <h2 className="font-display font-alice-bold text-4xl md:text-5xl lg:text-6xl text-[#0F172A] leading-tight mb-8">
              Retail is <span className="text-[#9D1967]">Bleeding Money</span>
              <br /> Every Single Day.
            </h2>
            <p className="text-xl text-[#0F172A]/70 leading-relaxed font-medium mb-10 max-w-lg">
              Small stores lose billions globally due to archaic tracking. Invigo was built to stop the leak
              and turn your inventory into an <span className="text-[#007A5E] font-bold">engine for growth</span>.
            </p>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-[#0F172A]/5 border border-[#0F172A]/10 w-fit">
              <div className="h-2 w-2 rounded-full bg-[#007A5E] animate-pulse"/>
              <span className="text-sm font-bold text-[#0F172A]/80">Invigo Gen3 is monitoring retail stores.</span>
            </div>
          </motion.div>

          <div className="grid gap-6">
            {painPoints.map((point, i) => (<motion.div key={point.title} initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.2, duration: 0.6 }} className={`group p-8 rounded-[2rem] flex gap-6 items-start hover:scale-[1.02] transition-all duration-300 relative bg-white border-2 hover:shadow-2xl ${point.hasAiBadge ? 'border-[#9D1967]/30 shadow-lg shadow-[#9D1967]/10 hover:border-[#9D1967]/50' : 'border-[#007A5E]/20 shadow-lg shadow-[#007A5E]/5'}`}>
                {/* Decorative edge line */}
                <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1/2 rounded-r-full transition-all duration-300 group-hover:h-[80%] ${point.hasAiBadge ? 'bg-[#9D1967]' : 'bg-[#007A5E]'}`}/>
                <div className={`shrink-0 h-14 w-14 rounded-2xl ${point.bg} ${point.color} flex items-center justify-center shadow-inner group-hover:rotate-12 transition-transform`}>
                  <point.icon size={28}/>
                </div>
                <div>
                  <h3 className="font-display text-xl font-black text-[#0F172A] mb-2 flex items-center gap-2">
                    {point.title}
                    {point.hasAiBadge && (<span className="text-[10px] font-black uppercase tracking-wider text-[#9D1967] bg-[#9D1967]/10 px-3 py-1 rounded-full border border-[#9D1967]/20 shadow-sm shadow-[#9D1967]/20">
                        AI Powered
                      </span>)}
                  </h3>
                  <p className="text-[#0F172A]/60 leading-relaxed font-medium">{point.description}</p>
                </div>
              </motion.div>))}
          </div>
        </div>
      </div>
    </section>);
};
export default ProblemSection;
