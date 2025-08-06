// Provide props: attorneys = [{ name, role, imageUrl, profileLink }, ...]
const TeamGrid = ({ attorneys }) => (
  <section style={gridWrapper}>
    <h2>Our Team</h2>
    <div style={gridStyle}>
      {attorneys.map((a) => (
        <div key={a.name} style={cardStyle}>
          <img src={a.imageUrl} alt={a.name} style={imgStyle} />
          <h3>{a.name}</h3>
          <p>{a.role}</p>
          {a.profileLink && <a href={a.profileLink} style={linkStyle}>Bio & Contact</a>}
        </div>
      ))}
    </div>
  </section>
);

const gridWrapper = { padding: '3rem 1rem', textAlign: 'center' };
const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '1.5rem',
  marginTop: '1.5rem',
};
const cardStyle = { padding: '1rem', boxShadow: '0 0 8px rgba(0,0,0,0.1)' };
const imgStyle = { width: '100%', height: 'auto', objectFit: 'cover', marginBottom: '1rem' };
const linkStyle = { color: '#ef5b25', textDecoration: 'none', fontWeight: '500' };

export default TeamGrid;
