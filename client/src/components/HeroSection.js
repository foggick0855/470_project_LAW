const HeroSection = ({ title, buttonText, onButtonClick }) => (
  <section style={heroStyle}>
    <h1 style={titleStyle}>{title}</h1>
    {buttonText && (
      <button style={ctaStyle} onClick={onButtonClick}>
        {buttonText}
      </button>
    )}
  </section>
);

const heroStyle = {
  background: '#fff',
  color: '#333',
  padding: '4rem 2rem',
  textAlign: 'center',
};

const titleStyle = {
  margin: '0 auto 1.5rem',
  maxWidth: '800px',
  fontSize: '2.5rem',
};

const ctaStyle = {
  backgroundColor: '#ef5b25',
  color: '#fff',
  border: 'none',
  padding: '0.75rem 1.5rem',
  fontSize: '1rem',
  cursor: 'pointer',
  borderRadius: '4px',
};

export default HeroSection;
