import Modal from './Modal';

interface ConfirmDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Modal labelledBy="reset-title" describedBy="reset-desc" onClose={onCancel}>
      <h2 id="reset-title" className="modal-title">Reset the demo?</h2>
      <p id="reset-desc">
        This erases everything you have typed, your recall answers, weak words and stats, and returns to the
        cover. Sound and motion settings are kept.
      </p>
      <div className="modal-actions">
        <button type="button" className="btn" onClick={onCancel}>Keep my progress</button>
        <button type="button" className="btn btn-primary" onClick={onConfirm}>Reset demo</button>
      </div>
    </Modal>
  );
}
