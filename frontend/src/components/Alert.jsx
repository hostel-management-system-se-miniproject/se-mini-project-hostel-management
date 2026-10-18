import PropTypes from 'prop-types';

export function Alert({ variant = 'info', title, message }) {
  return (
    <div className={`alert alert-${variant}`} role="alert">
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  );
}

Alert.propTypes = {
  variant: PropTypes.oneOf(['info', 'success', 'error', 'warning']),
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
};
