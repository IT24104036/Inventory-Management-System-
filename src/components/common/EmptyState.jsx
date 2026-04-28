const EmptyState = ({
  icon: Icon,
  title,
  description,
  className = "",
  iconClassName = "text-[#007A5E]",
  iconBgClassName = "bg-[#007A5E]/10",
}) => (
  <div className={`flex flex-col items-center justify-center py-20 text-center ${className}`}>
    {Icon ? (
      <div className={`h-16 w-16 rounded-2xl flex items-center justify-center mb-4 ${iconBgClassName}`}>
        <Icon size={28} className={iconClassName} />
      </div>
    ) : null}
    <p className="font-black text-[#0F172A] text-lg">{title}</p>
    {description ? (
      <p className="text-sm font-bold text-[#0F172A]/40 mt-1">{description}</p>
    ) : null}
  </div>
);

export default EmptyState;
