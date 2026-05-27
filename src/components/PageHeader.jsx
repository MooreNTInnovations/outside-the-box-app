const PageHeader = ({ title, eyebrow, children }) => (
  <header className="page-header">
    {eyebrow && <p className="eyebrow">{eyebrow}</p>}
    <h1>{title}</h1>
    {children && <p>{children}</p>}
  </header>
);

export default PageHeader;
