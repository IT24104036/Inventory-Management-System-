import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Star, Quote } from "lucide-react";
const testimonials = [
    {
        name: "Kumari Perera",
        role: "Owner, Perera Fresh Mart",
        location: "Colombo",
        quote: "Before Invigo, I was throwing away Rs. 15,000 worth of produce every week. Now my wastage is down 70%. This tool literally pays for itself.",
        rating: 5,
        initials: "KP",
        color: "from-[#007A5E] to-[#00A37E]",
    },
    {
        name: "Rajitha Fernando",
        role: "Manager, Fernando Groceries",
        location: "Kandy",
        quote: "The AI predicted that my yogurt stock would expire before the weekend rush. I ran a quick discount and sold everything. Pure magic!",
        rating: 5,
        initials: "RF",
        color: "from-[#7C3AED] to-[#A78BFA]",
    },
    {
        name: "Amara Silva",
        role: "Owner, Silva & Sons Store",
        location: "Galle",
        quote: "I used to spend 3 hours every night checking expiry dates. Now Invigo does it automatically. I finally get to sleep on time!",
        rating: 5,
        initials: "AS",
        color: "from-[#9D1967] to-[#D946EF]",
    },
];
const Testimonials = () => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-100px" });
    return (<section id="testimonials" ref={ref} className="relative py-24 lg:py-32 overflow-hidden bg-white/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-20">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}}>
            <span className="text-xs font-black uppercase tracking-[0.4em] text-[#007A5E] mb-4 block">Social Proof</span>
            <h2 className="font-display text-4xl md:text-5xl lg:text-6xl font-black text-[#0F172A]">
              Trusted by <span className="gradient-text">The Best</span>
            </h2>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (<motion.div key={t.name} initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * 0.2, duration: 0.6 }} className="card-premium group p-10 rounded-[2.5rem] relative flex flex-col h-full">
              <Quote className="absolute top-10 right-10 text-[#0F172A]/5 group-hover:text-[#007A5E]/10 transition-colors" size={60}/>

              <div className="flex gap-1 mb-8">
                {[...Array(t.rating)].map((_, j) => (<Star key={j} size={16} className="fill-[#007A5E] text-[#007A5E]"/>))}
              </div>

              <p className="text-lg font-medium leading-relaxed text-[#0F172A]/80 mb-10 flex-1">
                "{t.quote}"
              </p>

              <div className="flex items-center gap-4 pt-6 border-t border-[#0F172A]/5">
                <div className={`h-14 w-14 rounded-2xl bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-black shadow-lg`}>
                  {t.initials}
                </div>
                <div>
                  <h4 className="font-black text-[#0F172A] leading-none mb-1">{t.name}</h4>
                  <p className="text-xs font-bold text-[#0F172A]/40 uppercase tracking-widest">{t.role}</p>
                </div>
              </div>
            </motion.div>))}
        </div>
      </div>
    </section>);
};
export default Testimonials;
