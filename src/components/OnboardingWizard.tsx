import { useState } from "react";
import { Icon, Logo } from "./primitives";
import { useI18n } from "../i18n";

interface OnboardingWizardProps {
  onComplete: () => void;
}

const TOTAL_STEPS = 4;

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);

  const next = () => {
    if (step < TOTAL_STEPS - 1) setStep(step + 1);
    else onComplete();
  };
  const skip = () => onComplete();

  return (
    <div className="onboarding-backdrop">
      <div className="onboarding">
        {/* Progress dots */}
        <div className="onboarding__dots">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={`onboarding__dot ${i === step ? "onboarding__dot--active" : ""} ${i < step ? "onboarding__dot--done" : ""}`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="onboarding__body">
          {step === 0 && (
            <div className="onboarding__step">
              <div className="onboarding__icon-wrap">
                <Logo size={64} />
              </div>
              <h2 className="onboarding__title">{t("onboarding.welcome.title")}</h2>
              <p className="onboarding__desc">{t("onboarding.welcome.desc")}</p>
            </div>
          )}

          {step === 1 && (
            <div className="onboarding__step">
              <div className="onboarding__icon-wrap onboarding__icon-wrap--accent">
                <Icon name="rocket" size={40} weight="duotone" />
              </div>
              <h2 className="onboarding__title">{t("onboarding.whatItDoes.title")}</h2>
              <p className="onboarding__desc">{t("onboarding.whatItDoes.desc")}</p>
              <div className="onboarding__features">
                <div className="onboarding__feature">
                  <Icon name="gamepad" size={20} />
                  <span>{t("onboarding.whatItDoes.feat1")}</span>
                </div>
                <div className="onboarding__feature">
                  <Icon name="monitor" size={20} />
                  <span>{t("onboarding.whatItDoes.feat2")}</span>
                </div>
                <div className="onboarding__feature">
                  <Icon name="trash" size={20} />
                  <span>{t("onboarding.whatItDoes.feat3")}</span>
                </div>
                <div className="onboarding__feature">
                  <Icon name="gauge" size={20} />
                  <span>{t("onboarding.whatItDoes.feat4")}</span>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="onboarding__step">
              <div className="onboarding__icon-wrap onboarding__icon-wrap--warning">
                <Icon name="shield" size={40} weight="duotone" />
              </div>
              <h2 className="onboarding__title">{t("onboarding.admin.title")}</h2>
              <p className="onboarding__desc">{t("onboarding.admin.desc")}</p>
              <div className="onboarding__tip">
                <Icon name="info" size={16} />
                <span>{t("onboarding.admin.tip")}</span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="onboarding__step">
              <div className="onboarding__icon-wrap onboarding__icon-wrap--accent">
                <Icon name="check" size={40} weight="duotone" />
              </div>
              <h2 className="onboarding__title">{t("onboarding.ready.title")}</h2>
              <p className="onboarding__desc">{t("onboarding.ready.desc")}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="onboarding__actions">
          {step < TOTAL_STEPS - 1 && (
            <button className="onboarding__btn onboarding__btn--ghost" onClick={skip}>
              {t("onboarding.skip")}
            </button>
          )}
          <button className="onboarding__btn onboarding__btn--primary" onClick={next}>
            {step === TOTAL_STEPS - 1 ? t("onboarding.start") : t("onboarding.next")}
          </button>
        </div>
      </div>
    </div>
  );
}
