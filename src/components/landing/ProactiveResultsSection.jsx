import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { TrendingDown, Zap, DollarSign, Smile } from "lucide-react";
const stats = [
    {
        icon: TrendingDown,
        value: "68%",
        title: "Less Food Waste",
        desc: "Average waste reduction across stores",
        color: "#007A5E",
        bgClass: "bg-[#007A5E]/10",
        textClass: "text-[#007A5E]",
        borderHover: "hover:border-[#007A5E]/40",
        shadowHover: "hover:shadow-[#007A5E]/10"
    },
    {
        icon: Zap,
        value: "45%",
        title: "Faster Decisions",
        desc: "Quicker stock management with AI insights",
        color: "#007A5E",
        bgClass: "bg-[#007A5E]/10",
        textClass: "text-[#007A5E]",
        borderHover: "hover:border-[#007A5E]/40",
        shadowHover: "hover:shadow-[#007A5E]/10"
    },
    {
        icon: DollarSign,
        value: "Rs120K+",
        title: "Monthly Savings",
        desc: "Average savings for small grocery stores",
        color: "#007A5E",
        bgClass: "bg-[#007A5E]/10",
        textClass: "text-[#007A5E]",
        borderHover: "hover:border-[#007A5E]/40",
        shadowHover: "hover:shadow-[#007A5E]/10"
    },
    {
        icon: Smile,
        value: "92%",
        title: "Prediction Accuracy",
        desc: "ML learns sales patterns to predict sell-through before expiry",
        color: "#9D1967",
        bgClass: "bg-[#9D1967]/10",
        textClass: "text-[#9D1967]",
        borderHover: "hover:border-[#9D1967]/40",
        shadowHover: "hover:shadow-[#9D1967]/10"
    },
];
export default function ProactiveResultsSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    return (<section ref={ref} className="relative py-24 bg-transparent">
            <div className="container mx-auto px-4 relative z-10">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }} className="text-center max-w-4xl mx-auto mb-16">
                    <h2 className="font-display font-alice-bold text-4xl md:text-5xl text-[#0F172A] leading-tight mb-6">
                        Proactive Results You Can Expect
                    </h2>
                    <p className="text-[#0F172A]/70 text-lg md:text-xl font-medium max-w-3xl mx-auto">
                        Our ML model learns your store's sales patterns to predict sell-through probability before expiry — helping you reduce waste and protect profits proactively.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                    {stats.map((stat, i) => (<motion.div key={i} initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.15, duration: 0.6 }} className={`relative bg-white rounded-[2.5rem] p-8 text-center border-2 border-[#0F172A]/10 shadow-lg group hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 overflow-hidden ${stat.borderHover} ${stat.shadowHover}`}>
                            {/* Accent line at the bottom */}
                            <div className="absolute bottom-0 left-0 right-0 h-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ backgroundColor: stat.color }}/>

                            <div className={`h-14 w-14 rounded-2xl mx-auto flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 ${stat.bgClass}`}>
                                <stat.icon size={28} className={stat.textClass} strokeWidth={2}/>
                            </div>

                            <h3 className="font-display text-4xl font-black text-[#0F172A] mb-3 tracking-tight">
                                {stat.value}
                            </h3>
                            <p className="font-bold text-[#0F172A] text-[15px] mb-3">
                                {stat.title}
                            </p>
                            <p className="text-[#0F172A]/60 font-medium text-[13px] leading-relaxed">
                                {stat.desc}
                            </p>
                        </motion.div>))}
                </div>
            </div>
        </section>);
}
