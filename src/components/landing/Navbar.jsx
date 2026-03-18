import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ArrowRight } from "lucide-react";
import InvigoLogo from "@/components/InvigoLogo";
const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How it Works", href: "#how-it-works" },
];
const Navbar = () => {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);
    return (<nav className="fixed top-0 left-0 right-0 z-50 px-4 py-6 pointer-events-none">
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`mx-auto max-w-6xl pointer-events-auto transition-all duration-500 rounded-[2.5rem] border ${isScrolled
            ? "glass shadow-premium border-white/40 px-6 py-3"
            : "bg-transparent border-transparent px-2 py-4"}`}>
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 overflow-hidden rounded-xl border border-white/20 bg-white shadow-sm p-1.5 transition-transform group-hover:rotate-12">
              <InvigoLogo size={32}/>
            </div>
            <span className="font-brand text-3xl tracking-tight text-[#0F172A]">
              Invigo<span className="text-[#007A5E]">.</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (<a key={link.label} href={link.href} className="text-sm font-bold text-[#0F172A]/70 hover:text-[#007A5E] transition-colors relative group">
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#007A5E] transition-all group-hover:w-full"/>
              </a>))}
            <Link to="/login" className="px-6 py-2.5 rounded-xl bg-[#0F172A] text-white text-sm font-bold shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
              Login
              <ArrowRight size={16}/>
            </Link>
          </div>

          {/* Mobile Toggle */}
          <button className="md:hidden p-2 text-[#0F172A]" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={24}/> : <Menu size={24}/>}
          </button>
        </div>
      </motion.div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (<motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="md:hidden glass mt-4 rounded-3xl p-6 pointer-events-auto border-white/40 shadow-2xl mx-auto max-w-sm">
            <div className="flex flex-col gap-6">
              {navLinks.map((link) => (<a key={link.label} href={link.href} className="text-lg font-bold text-[#0F172A] hover:text-[#007A5E]" onClick={() => setMobileOpen(false)}>
                  {link.label}
                </a>))}
              <Link to="/login" onClick={() => setMobileOpen(false)} className="w-full py-4 text-center rounded-2xl bg-[#007A5E] text-white font-bold shadow-lg">
                Login to Portal
              </Link>
            </div>
          </motion.div>)}
      </AnimatePresence>
    </nav>);
};
export default Navbar;
