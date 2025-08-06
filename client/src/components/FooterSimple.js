const FooterSimple = ({ offices }) => (
  <footer style={footerStyle}>
    <div>{offices.join(' | ')}</div>
    <div>© {new Date().getFullYear()} Your Organization Name</div>
  </footer>
);

const footerStyle = {
  textAlign: 'center',
  padding: '2rem 1rem',
  color: '#777',
  fontSize: '0.9rem',
  borderTop: '1px solid #eee',
};

export default FooterSimple;
