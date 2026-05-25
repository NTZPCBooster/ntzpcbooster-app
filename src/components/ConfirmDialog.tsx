import { useState, useEffect } from 'react';
import { Icon } from './primitives';
import { useI18n } from '../i18n';

interface SelectableItem {
  label: string;
  value: string;
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  risk: string;
  selectableList?: SelectableItem[];
  onConfirm: (selectedValues?: string[]) => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open, title, description, risk, selectableList, onConfirm, onCancel,
}: ConfirmDialogProps) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // All checked by default when dialog opens
  useEffect(() => {
    if (open && selectableList) {
      setSelected(new Set(selectableList.map(i => i.value)));
    }
  }, [open, selectableList]);

  if (!open) return null;

  const toggleItem = (value: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const toggleAll = () => {
    if (!selectableList) return;
    if (selected.size === selectableList.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(selectableList.map(i => i.value)));
    }
  };

  const handleConfirm = () => {
    if (selectableList) {
      onConfirm(Array.from(selected));
    } else {
      onConfirm();
    }
  };

  const allChecked = selectableList ? selected.size === selectableList.length : false;
  const noneChecked = selected.size === 0;

  return (
    <div className="confirm-backdrop" onClick={onCancel}>
      <div
        className={`confirm-dialog${selectableList ? ' confirm-dialog--wide' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="confirm-dialog__icon">
          <Icon name="alert" size={28} />
        </div>
        <h3 className="confirm-dialog__title">{title}</h3>
        <p className="confirm-dialog__desc">{description}</p>

        {selectableList && selectableList.length > 0 && (
          <div className="confirm-dialog__list">
            <div className="confirm-dialog__list-header">
              <span className="confirm-dialog__list-label mono">
                {t('confirm.selected', { count: String(selected.size), total: String(selectableList.length) })}
              </span>
              <button
                type="button"
                className="confirm-dialog__list-toggle mono"
                onClick={toggleAll}
              >
                {allChecked ? t('confirm.uncheckAll') : t('confirm.checkAll')}
              </button>
            </div>
            <ul className="confirm-dialog__list-items mono">
              {selectableList.map(item => (
                <li
                  key={item.value}
                  className={`confirm-dialog__list-item${selected.has(item.value) ? ' is-checked' : ''}`}
                  onClick={() => toggleItem(item.value)}
                >
                  <span className={`confirm-dialog__checkbox${selected.has(item.value) ? ' is-checked' : ''}`}>
                    {selected.has(item.value) && <Icon name="check" size={10} />}
                  </span>
                  {item.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="confirm-dialog__meta mono">
          <span className={`badge badge--risk badge--risk-${risk}`}>{t('optlist.risk')}: {t(`risk.${risk}`)}</span>
          <span>{t('confirm.warning')}</span>
        </div>
        <div className="confirm-dialog__actions">
          <button className="btn btn--ghost" onClick={onCancel}>{t('common.cancel')}</button>
          <button
            className="btn btn--warning"
            onClick={handleConfirm}
            disabled={selectableList ? noneChecked : false}
          >
            <Icon name="alert" size={14} />
            {selectableList
              ? t('confirm.removeApps', { count: String(selected.size) })
              : t('confirm.confirmAnyway')}
          </button>
        </div>
      </div>
    </div>
  );
}
