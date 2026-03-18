import logo from "@/assets/invigo_logo.png";
/** Invigo logo – professional icon for navbar and title areas */
const InvigoLogo = ({ className = "", size = 36 }) => (<div style={{ width: size, height: size }} className={`relative flex items-center justify-center overflow-hidden rounded-lg ${className}`}>
    <img src={logo} alt="Invigo Logo" className="h-full w-full object-contain"/>
  </div>);
export default InvigoLogo;
