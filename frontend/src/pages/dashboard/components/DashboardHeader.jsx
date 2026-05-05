/**
 * DashboardHeader
 * Page title + "ALL NODES NOMINAL" status indicator.
 */
function DashboardHeader() {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neon-cyan to-neon-purple">
        System Hub
      </h1>
      <p className="text-neon-cyan/50 mt-1.5 text-xs uppercase tracking-[0.2em] font-semibold flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
        ALL NODES NOMINAL
      </p>
    </div>
  );
}

export default DashboardHeader;
