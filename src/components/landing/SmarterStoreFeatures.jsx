import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { Package, CalendarClock, ShoppingCart, Percent, BarChart3, BrainCircuit } from "lucide-react";
const features = [
    {
        icon: Package,
        title: "Product Management",
        description: "Add, categorize, and manage all your products with barcode scanning and batch tracking.",
    },
    {
        icon: CalendarClock,
        title: "Inventory & Expiry Tracking",
        description: "Real-time stock levels with automatic expiry date monitoring and FIFO tracking.",
    },
    {
        icon: ShoppingCart,
        title: "Sales Recording",
        description: "Quick POS-style sales entry with daily summaries and product-level tracking.",
    },
    {
        icon: Percent,
        title: "Discount & Alerts",
        description: "Smart alerts for approaching expiry dates with automated discount suggestions.",
    },
    {
        icon: BarChart3,
        title: "Reports & Dashboard",
        description: "Beautiful analytics dashboard with waste reports, sales trends, and stock insights.",
    },
    {
        icon: BrainCircuit,
        title: "Predictive Modeling of Inventory Sell-Through using Sales Behavior Patterns",
        description: "Machine learning model predicts which products are most likely to expire unsold.",
        hasBadge: true,
    },
];
const SmarterStoreFeatures = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    return (<section ref={ref} className="relative py-24">
            <div className="container mx-auto px-4">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.8 }} className="text-center max-w-3xl mx-auto mb-16">
                    <h2 className="font-display font-alice-bold text-4xl md:text-5xl text-[#0F172A] leading-tight mb-6">
                        Everything you need to run a {" "}
                        <span className="text-[#007A5E]">smarter store</span>
                    </h2>
                    <p className="text-[#0F172A]/70 text-lg font-medium">
                        Six powerful features designed specifically for small grocery store owners.
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                    {features.map((feature, i) => (<motion.div key={feature.title} initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.1, duration: 0.6 }} className={`relative bg-white rounded-[2rem] p-8 hover:shadow-2xl hover:scale-[1.02] transition-all group ${feature.hasBadge
                ? "border-2 border-[#9D1967]/30 shadow-[#9D1967]/10"
                : "border-2 border-[#0F172A]/20 shadow-lg shadow-black/5"}`}>
                            {feature.hasBadge && (<div className="absolute top-6 right-6">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-[#9D1967] bg-[#9D1967]/10 px-3 py-1 rounded-full border border-[#9D1967]/20">
                                        Powered by AI
                                    </span>
                                </div>)}
                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${feature.hasBadge ? "bg-[#9D1967]/10" : "bg-[#007A5E]/10"}`}>
                                <feature.icon size={24} className={feature.hasBadge ? "text-[#9D1967]" : "text-[#007A5E]"} strokeWidth={2}/>
                            </div>
                            <h3 className="font-display text-xl font-black text-[#0F172A] mb-3 pr-8">
                                {feature.title}
                            </h3>
                            <p className="text-[#0F172A]/60 font-medium leading-relaxed text-sm">
                                {feature.description}
                            </p>
                        </motion.div>))}
                </div>
            </div>
        </section>);
};
export default SmarterStoreFeatures;
