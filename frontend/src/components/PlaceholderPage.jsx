import PropTypes from 'prop-types';

export function PlaceholderPage({ title, description }) {
  return (
    <div className="placeholder-page">
      <div className="placeholder-badge">Placeholder</div>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="inline-note">This page is still under development.</div>
    </div>
  );
}

PlaceholderPage.propTypes = {
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
};
