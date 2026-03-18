import Navbar from "@/components/landing/Navbar";
import HeroSection from "@/components/landing/HeroSection";
import ProblemSection from "@/components/landing/ProblemSection";
import SmarterStoreFeatures from "@/components/landing/SmarterStoreFeatures";
import PredictiveModelingSection from "@/components/landing/PredictiveModelingSection";
import ProactiveResultsSection from "@/components/landing/ProactiveResultsSection";
import FinalCTA from "@/components/landing/FinalCTA";
import Footer from "@/components/landing/Footer";
const Index = () => {
    return (<div className="relative min-h-screen bg-background overflow-x-hidden">
      {/* Global Background Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden opacity-60">
        <div className="absolute top-[-10%] left-[-10%] w-[70vw] h-[70vh] bg-[#007A5E]/10 rounded-full blur-[120px] animate-blob"/>
        <div className="absolute bottom-[-10%] right-[-10%] w-[70vw] h-[70vh] bg-[#7C3AED]/10 rounded-full blur-[120px] animate-blob" style={{ animationDelay: "2s" }}/>
        <div className="absolute top-[20%] right-[10%] w-[40vw] h-[40vh] bg-[#9D1967]/5 rounded-full blur-[100px] animate-pulse"/>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] mix-blend-overlay"/>
      </div>

      {/* All content */}
      <div className="relative z-10">
        <Navbar />
        <HeroSection />
        <ProblemSection />
        <SmarterStoreFeatures />
        <PredictiveModelingSection />
        <ProactiveResultsSection />
        <FinalCTA />
        <Footer />
      </div>
    </div>);
};
export default Index;
