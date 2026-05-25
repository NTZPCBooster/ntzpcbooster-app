import { useState, useEffect, useCallback } from 'react';
import { Logo, Icon } from './primitives';
import { getMotherboardId, validateKey, storeLicense } from '../lib/license';
import type { LicenseInfo } from '../lib/license';
import { useI18n } from '../i18n';

interface ActivationPageProps {
  onActivated: (license: LicenseInfo) => void;
}

export function ActivationPage({ onActivated }: ActivationPageProps) {
  const { t } = useI18n();
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moboId, setMoboId] = useState<string | null>(null);
  const [moboLoading, setMoboLoading] = useState(true);

  // Read motherboard serial on mount
  useEffect(() => {
    getMotherboardId()
      .then(id => {
        setMoboId(id);
        setMoboLoading(false);
      })
      .catch(err => {
        setError(t('activation.hwError', { msg: err.message }));
        setMoboLoading(false);
      });
  }, [t]);

  // Format key as XXXXX-XXXXX-XXXXX-XXXXX
  const handleKeyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const parts = raw.match(/.{1,5}/g) || [];
    setKey(parts.join('-'));
    setError(null);
  }, []);

  const handleActivate = useCallback(async () => {
    if (!moboId) {
      setError(t('activation.waitHw'));
      return;
    }

    const clean = key.replace(/-/g, '');
    if (clean.length < 16) {
      setError(t('activation.tooShort'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await validateKey(key, moboId);
      if (result.valid && result.data) {
        storeLicense(result.data);
        onActivated(result.data);
      } else {
        setError(result.error || t('activation.invalid'));
      }
    } catch {
      setError(t('activation.unexpected'));
    } finally {
      setLoading(false);
    }
  }, [key, moboId, onActivated, t]);

  const openBuyPage = useCallback(async () => {
    const url = 'https://pcboost.com.br';
    try {
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(url);
    } catch {
      window.open(url, '_blank');
    }
  }, []);

  return (
    <div className="activation">
      <div className="activation__bg" />
      <div className="activation__card">
        <div className="activation__header">
          <Logo size={44} />
          <h1 className="activation__title">PCBOOST</h1>
          <p className="activation__sub">{t('activation.subtitle')}</p>
        </div>

        <div className="activation__field">
          <label className="activation__label mono">{t('activation.label')}</label>
          <input
            className="activation__input mono"
            type="text"
            placeholder="XXXXX-XXXXX-XXXXX-XXXXX"
            value={key}
            onChange={handleKeyChange}
            maxLength={23}
            disabled={loading}
            onKeyDown={e => e.key === 'Enter' && handleActivate()}
            autoFocus
          />
        </div>

        {error && (
          <div className="activation__error mono">
            <Icon name="alert" size={14} />
            <span>{error}</span>
          </div>
        )}

        <button
          className="btn btn--accent activation__btn"
          onClick={handleActivate}
          disabled={loading || moboLoading}
        >
          {loading ? (
            <>{t('activation.validating')}</>
          ) : (
            <>
              <Icon name="shield" size={16} />
              {t('activation.activate')}
            </>
          )}
        </button>

        <div className="activation__divider">
          <span>{t('activation.or')}</span>
        </div>

        <button className="btn btn--ghost activation__buy" onClick={openBuyPage}>
          {t('activation.buy')} <Icon name="external" size={14} />
        </button>

        {moboId && (
          <p className="activation__hw mono">
            Hardware ID: {moboId}
          </p>
        )}
      </div>

      <p className="activation__foot mono">
        {t('activation.footer')}
      </p>
    </div>
  );
}
