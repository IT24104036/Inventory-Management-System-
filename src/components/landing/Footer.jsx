import { Link } from "react-router-dom";
import { Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import InvigoLogo from "@/components/InvigoLogo";
const Footer = () => {
    return (<footer className="bg-[#0F172A] text-white py-12 relative overflow-hidden">
      <div className="container mx-auto px-6 relative z-10">
        {/* Top row */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 border-b border-white/10 pb-8 mb-8">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="h-8 w-8 glass p-1.5 rounded-lg bg-white/10 border-white/20">
              <InvigoLogo size={20}/>
            </div>
            <span className="font-brand text-3xl">
              Invigo<span className="text-[#007A5E]">.</span>
            </span>
          </Link>

          {/* Nav Links */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
            {["Features", "How it Works", "Security", "Privacy"].map((link) => (<a key={link} href={`#${link.toLowerCase().replace(/\s+/g, '-')}`} className="text-white/75 hover:text-[#007A5E] transition-colors text-sm font-semibold uppercase tracking-wider" style={{ fontFamily: "var(--font-footer)" }}>
                {link}
              </a>))}
          </div>

          {/* Social Icons */}
          <div className="flex gap-3 shrink-0">
            {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (<a key={i} href="#" className="h-8 w-8 rounded-lg glass flex items-center justify-center hover:bg-[#007A5E] hover:-translate-y-0.5 transition-all text-white">
                <Icon size={16}/>
              </a>))}
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
          <p className="text-white/70 text-xs uppercase tracking-widest font-semibold" style={{ fontFamily: "var(--font-footer)" }}>
            © {new Date().getFullYear()} Invigo AI. All Rights Reserved.
          </p>
          <div className="flex gap-6 text-white/60 text-xs uppercase tracking-widest font-semibold" style={{ fontFamily: "var(--font-footer)" }}>
            <span className="font-brand text-sm">Powered by Gen3 AI</span>
            <span className="text-[#007A5E]">Batch Tracking Active</span>
          </div>
        </div>
      </div>
    </footer>);
};
export default Footer;
