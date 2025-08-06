const JurisdictionBar = ({ jurisdictions }) => (
  <div style={barWrap}>
    {jurisdictions.join(' | ')}
  </div>
);

const barWrap = {
  backgroundColor: '#f2f2f2',
  padding: '1rem 0',
  textAlign: 'center',
  fontSize: '1rem',
  color: '#333',
};

export default JurisdictionBar;
