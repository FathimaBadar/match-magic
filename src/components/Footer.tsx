const Footer = () => {
  return (
    <footer className="h-12 flex items-center justify-center" style={{ backgroundColor: '#f47a20' }}>
      <p className="text-sm font-medium text-white">
        © {new Date().getFullYear()} ABMMC | All Rights Reserved | Powered by{' '}
        <a href="http://mindlabssolutions.com/" target="_blank" rel="noreferrer" className="underline hover:text-white/80">
          Mindlabs
        </a>
      </p>
    </footer>
  );
};

export default Footer;
