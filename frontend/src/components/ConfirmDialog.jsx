import React from 'react';
import PropTypes from 'prop-types';

export function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  busy = false,
}) {
  const dialogRef = React.useRef(null);
  const cancelRef = React.useRef(null);
  // Keep the latest callbacks in refs so the effect below runs only when the dialog opens or closes.
  // Otherwise every parent re-render would pull focus back into the dialog.
  const onCancelRef = React.useRef(onCancel);
  const busyRef = React.useRef(busy);
  React.useEffect(() => {
    onCancelRef.current = onCancel;
    busyRef.current = busy;
  });

  React.useEffect(() => {
    if (!isOpen) return undefined;
    const previouslyFocused = document.activeElement;
    // The safe choice gets the focus first, because this dialog confirms something destructive.
    (cancelRef.current ?? dialogRef.current)?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !busyRef.current) {
        onCancelRef.current();
        return;
      }
      if (event.key === 'Tab' && dialogRef.current) {
        // Keep Tab inside the dialog while it is open.
        const buttons = Array.from(dialogRef.current.querySelectorAll('button:not(:disabled)'));
        if (buttons.length === 0) {
          event.preventDefault();
          return;
        }
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="confirm-dialog-backdrop">
      <div
        ref={dialogRef}
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        tabIndex="-1"
      >
        <h2 id="confirm-dialog-title">{title}</h2>
        <p id="confirm-dialog-message">{message}</p>
        <div className="confirm-dialog-actions">
          <button type="button" className="primary-button" onClick={onConfirm} disabled={busy}>
            Yes, vacate
          </button>
          <button type="button" ref={cancelRef} onClick={onCancel} disabled={busy}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

ConfirmDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  title: PropTypes.string.isRequired,
  message: PropTypes.string.isRequired,
  onConfirm: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  busy: PropTypes.bool,
};
