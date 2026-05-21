import { Icon } from './primitives';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  risk: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, description, risk, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="confirm-backdrop" onClick={onCancel}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className="confirm-dialog__icon">
          <Icon name="alert" size={28} />
        </div>
        <h3 className="confirm-dialog__title">{title}</h3>
        <p className="confirm-dialog__desc">{description}</p>
        <div className="confirm-dialog__meta mono">
          <span className={`badge badge--risk badge--risk-${risk}`}>risco: {risk}</span>
          <span>Esta acao pode afetar seguranca ou estabilidade.</span>
        </div>
        <div className="confirm-dialog__actions">
          <button className="btn btn--ghost" onClick={onCancel}>Cancelar</button>
          <button className="btn btn--warning" onClick={onConfirm}>
            <Icon name="alert" size={14} /> Confirmar mesmo assim
          </button>
        </div>
      </div>
    </div>
  );
}
