const Header = () => {
  return (
    <header className="h-16 sticky top-0 z-50 flex items-center px-6 shadow-md" style={{ backgroundColor: 'rgb(0, 100, 162)' }}>
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="ABMMC Logo" className="h-10 w-auto" />
        <div>
          <span className="text-white text-xl font-bold tracking-tight">ABMMC</span>
          <p className="text-white/70 text-xs leading-none mt-0.5">Excel Reconciliation Tool</p>
        </div>
      </div>
    </header>
  );
};

export default Header;
