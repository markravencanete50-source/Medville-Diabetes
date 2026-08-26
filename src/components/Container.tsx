/* The single shared page container. Do not re-declare widths in pages. */
export default function Container({
  children,
  className = "",
  wide = false,
}: {
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div className={`mx-auto w-full ${wide ? "max-w-7xl" : "max-w-6xl"} px-5 sm:px-8 ${className}`}>
      {children}
    </div>
  );
}
