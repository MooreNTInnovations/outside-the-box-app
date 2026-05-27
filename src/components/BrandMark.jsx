const BrandMark = ({ compact = false }) => (
  <div className={compact ? 'brand brand-compact' : 'brand'}>
    <div className="brand-icon" aria-hidden="true">
      OB
    </div>
    <div>
      <p className="brand-name">OutSide the Box</p>
      {!compact && <p className="brand-tagline">Where Bold Thinkers Build the Future.</p>}
    </div>
  </div>
);

export default BrandMark;
