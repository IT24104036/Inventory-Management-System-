import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Database, BrainCircuit, Gauge, BellRing, ArrowRight } from "lucide-react";
export default function PredictiveModelingSection() {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    const steps = [
        { icon: Database, text: "Sales Data + Stock + Expiry Dates" },
        { icon: BrainCircuit, text: "Predictive Modeling of Inventory Sell-Through using Sales Behavior Patterns" },
        { icon: Gauge, text: "Risk Score Analysis" },
        { icon: BellRing, text: "Smart Alerts & Discounts" },
    ];
    return (<section ref={ref} className="relative py-32 bg-transparent">

            <div className="container mx-auto px-4 z-10 relative">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }} className="text-center max-w-4xl mx-auto mb-20">
                    <h2 className="font-display font-alice-bold text-4xl md:text-5xl lg:text-5xl text-[#0F172A] leading-tight mb-6">
                        Predictive Modeling of Inventory Sell-<br className="hidden md:block"/>Through Using <span className="text-[#007A5E]">Sales Behavior Patterns</span>
                    </h2>
                    <p className="text-[#0F172A]/70 text-lg md:text-xl font-medium max-w-3xl mx-auto">
                        Our machine learning model analyzes your sales patterns, stock levels, and expiry dates to predict risk — so you can act before it's too late.
                    </p>
                </motion.div>

                <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-6 max-w-7xl mx-auto">
                    {steps.map((step, index) => (<div key={index} className="flex flex-col lg:flex-row items-center gap-4 lg:gap-6 w-full lg:w-1/4">
                            <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={isInView ? { opacity: 1, scale: 1, y: 0 } : {}} transition={{ delay: index * 0.2, duration: 0.6 }} className={`relative w-full bg-white rounded-3xl p-6 lg:p-8 flex flex-col items-center justify-center text-center border-2 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group min-h-[220px] ${index === 1 ? "border-[#9D1967]/30 shadow-[#9D1967]/10" : "border-[#007A5E]/20 shadow-[#007A5E]/5"}`}>
                                <div className={`h-16 w-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 ${index === 1 ? "bg-[#9D1967]/10" : "bg-[#007A5E]/10"}`}>
                                    <step.icon size={32} className={index === 1 ? "text-[#9D1967]" : "text-[#007A5E]"} strokeWidth={1.5}/>
                                </div>
                                <p className="font-bold text-[#0F172A] text-[13px] md:text-sm leading-relaxed">
                                    {step.text}
                                </p>
                                {index === 1 && (<div className="absolute -top-3 -right-3">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-[#9D1967] bg-white px-3 py-1 rounded-full border border-[#9D1967]/20 shadow-sm shadow-[#9D1967]/20">
                                            AI Powered
                                        </span>
                                    </div>)}
                            </motion.div>

                            {index < steps.length - 1 && (<motion.div initial={{ opacity: 0, x: -20 }} animate={isInView ? { opacity: 1, x: 0 } : {}} transition={{ delay: index * 0.2 + 0.3, duration: 0.5 }} className="hidden lg:flex items-center justify-center shrink-0 w-12">
                                    <div className="relative flex items-center justify-center w-full h-12">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#007A5E]/20 to-transparent h-0.5 top-1/2 -translate-y-1/2 w-[150%] left-[-25%] -z-10"/>
                                        <ArrowRight size={28} className="text-[#007A5E]/50 animate-pulse" strokeWidth={2}/>
                                    </div>
                                </motion.div>)}
                            {index < steps.length - 1 && (<motion.div initial={{ opacity: 0, y: -20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: index * 0.2 + 0.3, duration: 0.5 }} className="lg:hidden flex items-center justify-center my-4 h-12 relative">
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#007A5E]/20 to-transparent w-0.5 left-1/2 -translate-x-1/2 h-[150%] top-[-25%] -z-10"/>
                                    <ArrowRight size={28} className="rotate-90 text-[#007A5E]/50 animate-pulse" strokeWidth={2}/>
                                </motion.div>)}
                        </div>))}
                </div>
            </div>
        </section>);
}
