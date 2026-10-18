import React from 'react';

export function FormDemo() {
  const [form, setForm] = React.useState({ name: '', room: '', note: '' });
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmed = {
      name: form.name.trim(),
      room: form.room.trim(),
      note: form.note.trim(),
    };

    if (!trimmed.name || !trimmed.room || !trimmed.note) {
      setError('Please complete all fields before submitting the request.');
      setSuccess('');
      return;
    }

    setSuccess(`Request submitted for ${trimmed.name} in room ${trimmed.room}.`);
    setError('');
    setForm({ name: '', room: '', note: '' });
  };

  return (
    <div className="form-card">
      <h3>Quick form example</h3>

      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          <span>Name</span>
          <input name="name" value={form.name} onChange={handleChange} placeholder="Student name" />
        </label>

        <label>
          <span>Room</span>
          <input name="room" value={form.room} onChange={handleChange} placeholder="A-204" />
        </label>

        <label className="full-width">
          <span>Message</span>
          <textarea
            name="note"
            value={form.note}
            onChange={handleChange}
            placeholder="Describe the issue or request"
            rows="4"
          />
        </label>

        {error ? <Alert variant="error" title="Validation error" message={error} /> : null}
        {success ? <Alert variant="success" title="Success" message={success} /> : null}

        <button type="submit" className="primary-button">
          Submit request
        </button>
      </form>
    </div>
  );
}

function Alert({ variant = 'info', title, message }) {
  return (
    <div className={`alert alert-${variant}`} role="alert">
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  );
}

export { Alert };
