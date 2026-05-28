import logo from '../assets/outside-the-box-logo.png';

const BrandMark = ({ compact = false }) => (
  <div className={compact ? 'brand brand-compact' : 'brand'}>
    <img className="brand-logo" src={logo} alt="Outside The Box logo" />
    <div className="brand-copy">
      <p className="brand-short">OTB</p>
      {!compact && <p className="brand-tagline">Where Bold Thinkers Build the Future.</p>}
    </div>
  </div>
);

export default BrandMark;
