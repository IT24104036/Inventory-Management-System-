import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Package, Brain, Bell, BarChart3 } from "lucide-react";
const features = [
    {
        icon: Package,
        tag: "Tracking",
        title: "Precision Batch Tracking",
        description: "Every item, every batch, every expiry. Complete control over your perishables with zero guesswork.",
        color: "bg-[#007A5E]",
    },
    {
        icon: Brain,
        tag: "AI Engine",
        title: "Invigo AI Prediction",
        description: "Our proprietary ML models analyze sales velocity and shelf-life to stop waste before it happens.",
        color: "bg-[#7C3AED]",
    },
    {
        icon: Bell,
        tag: "Smart Actions",
        title: "Auto-Discount Guard",
        description: "AI-suggested price drops move aging stock faster, recovering revenue that would be lost to the bin.",
        color: "bg-[#9D1967]",
    },
    {
        icon: BarChart3,
        tag: "Analytics",
        title: "Pulse-Point Analytics",
        description: "Stunning visual reports on inventory health, reduction trends, and profit recovery metrics.",
        color: "bg-[#007A5E]",
    },
];
const FeatureCard = ({ feature, index }) => {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"],
    });
    const scale = useTransform(scrollYProgress, [0, 0.5], [0.8, 1]);
    const opacity = useTransform(scrollYProgress, [0, 0.3, 0.8, 1], [0, 1, 1, 0]);
    return (<motion.div ref={ref} style={{ scale, opacity }} className="sticky top-24 mb-12 w-full max-w-4xl mx-auto">
      <div className="card-premium p-8 md:p-12 rounded-[2.5rem] flex flex-col md:flex-row gap-8 items-center overflow-hidden relative group">
        <div className={`absolute top-0 left-0 w-2 h-full ${feature.color}`}/>
        <div className="flex-1 text-left">
          <span className="text-xs font-black uppercase tracking-widest text-[#0F172A]/40 mb-3 block">
            {feature.tag}
          </span>
          <h3 className="font-display text-3xl md:text-4xl font-black text-[#0F172A] mb-4">
            {feature.title}
          </h3>
          <p className="text-lg text-[#0F172A]/70 leading-relaxed max-w-md">
            {feature.description}
          </p>
        </div>
        <div className="relative">
          <div className={`w-40 h-40 md:w-56 md:h-56 rounded-3xl ${feature.color}/10 flex items-center justify-center relative shadow-inner group-hover:scale-110 transition-transform duration-700`}>
            <feature.icon size={80} className={`${feature.color.replace('bg-', 'text-')} opacity-80`}/>
            <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"/>
          </div>
          {/* Decorative index */}
          <span className="absolute -bottom-4 -right-4 font-display text-8xl font-black text-[#0F172A]/5 select-none tracking-tighter">
            0{index + 1}
          </span>
        </div>
      </div>
    </motion.div>);
};
const FeaturesSection = () => {
    const containerRef = useRef(null);
    return (<section id="features" ref={containerRef} className="relative py-24 bg-muted/50">
      <div className="container mx-auto px-4 text-center mb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <span className="text-xs font-black uppercase tracking-[0.3em] text-[#007A5E]">Engineered Excellence</span>
          <h2 className="mt-4 font-display text-4xl md:text-5xl lg:text-6xl font-black text-[#0F172A]">
            The <span className="gradient-text">Invigo Experience</span>
          </h2>
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto px-4 space-y-4">
        {features.map((feature, i) => (<FeatureCard key={i} feature={feature} index={i} />))}
      </div>
    </section>);
};
export default FeaturesSection;
