import { motion as Motion } from "framer-motion";
import { Settings } from "lucide-react";

const AdminSectionPlaceholder = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <Motion.div
      initial={{ opacity: 0, scale: 0.93, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-md"
    >
      <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-[#f7c69a]/40 to-[#fde8cc]/20 blur-2xl scale-110 pointer-events-none" />

      <div className="relative rounded-[2rem] border border-white/60 bg-white/35 backdrop-blur-2xl shadow-[0_8px_48px_rgba(200,121,65,0.14),0_2px_8px_rgba(200,121,65,0.08)] p-12 flex flex-col items-center text-center overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />

        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#f7c69a]/50 to-[#e8a55a]/30 blur-xl scale-150" />
          <div className="relative h-20 w-20 rounded-[1.5rem] bg-gradient-to-br from-[#fdf3e7] to-[#f5e0c8] border border-white/70 flex items-center justify-center shadow-[0_4px_20px_rgba(200,121,65,0.2)]">
            <Settings size={36} className="text-[#c87941]" strokeWidth={1.5} />
          </div>
        </div>

        <h2 className="text-2xl font-black text-[#1a1208] tracking-tight mb-3">Section Modules</h2>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#f7c69a]/60 to-[#fde8cc]/60 border border-[#c87941]/20 backdrop-blur-sm shadow-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-[#c87941] animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8a5a2e]">
            Expansion Module Coming Soon
          </span>
        </div>

        <div className="mt-8 flex gap-2">
          {[24, 40, 28, 16, 36].map((width, index) => (
            <div
              key={index}
              className="h-0.5 rounded-full bg-gradient-to-r from-[#c87941]/20 to-[#c87941]/5"
              style={{ width }}
            />
          ))}
        </div>
      </div>
    </Motion.div>
  </div>
);

export default AdminSectionPlaceholder;
