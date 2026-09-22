export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="auth-atmosphere relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="auth-atmosphere-wash" aria-hidden />
      <div className="auth-atmosphere-noise" aria-hidden />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
