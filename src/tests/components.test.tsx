import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '../i18n';
import { Sidebar } from '../components/Sidebar';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { AppearancePanel } from '../components/AppearancePanel';
import { SettingsPage } from '../components/SettingsPage';
import { DEFAULT_SCHEDULER } from '../hooks/useScheduler';

// Wrapper with I18nProvider
function Wrapper({ children, locale = 'pt' }: { children: React.ReactNode; locale?: 'pt' | 'en' | 'es' }) {
  return <I18nProvider locale={locale}>{children}</I18nProvider>;
}

describe('Sidebar', () => {
  const defaultProps = {
    current: 'dashboard',
    onNav: vi.fn(),
    theme: 'dark' as const,
    onThemeChange: vi.fn(),
    onOpenAppearance: vi.fn(),
  };

  it('renders without crashing', () => {
    render(
      <Wrapper>
        <Sidebar {...defaultProps} />
      </Wrapper>,
    );
    expect(screen.getByText('PCBOOST')).toBeInTheDocument();
  });

  it('renders all navigation categories', () => {
    render(
      <Wrapper>
        <Sidebar {...defaultProps} />
      </Wrapper>,
    );
    expect(screen.getByText('Painel')).toBeInTheDocument();
    expect(screen.getByText('Gaming Boost')).toBeInTheDocument();
    expect(screen.getByText('Limpeza')).toBeInTheDocument();
    expect(screen.getByText('Tweaks')).toBeInTheDocument();
  });

  it('highlights the active category', () => {
    const { container } = render(
      <Wrapper>
        <Sidebar {...defaultProps} current="gaming" />
      </Wrapper>,
    );
    const activeBtn = container.querySelector('.navitem.is-active');
    expect(activeBtn).toBeInTheDocument();
    expect(activeBtn).toHaveTextContent('Gaming Boost');
  });

  it('calls onNav when a category is clicked', () => {
    render(
      <Wrapper>
        <Sidebar {...defaultProps} />
      </Wrapper>,
    );
    fireEvent.click(screen.getByText('Limpeza'));
    expect(defaultProps.onNav).toHaveBeenCalledWith('limpeza');
  });

  it('renders theme toggle buttons', () => {
    render(
      <Wrapper>
        <Sidebar {...defaultProps} />
      </Wrapper>,
    );
    expect(screen.getByText('Escuro')).toBeInTheDocument();
    expect(screen.getByText('Claro')).toBeInTheDocument();
  });

  it('calls onThemeChange when theme button clicked', () => {
    render(
      <Wrapper>
        <Sidebar {...defaultProps} />
      </Wrapper>,
    );
    fireEvent.click(screen.getByText('Claro'));
    expect(defaultProps.onThemeChange).toHaveBeenCalledWith('light');
  });

  it('renders navigation labels in English when locale is "en"', () => {
    render(
      <Wrapper locale="en">
        <Sidebar {...defaultProps} />
      </Wrapper>,
    );
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Gaming Boost')).toBeInTheDocument();
    expect(screen.getByText('Cleanup')).toBeInTheDocument();
  });
});

describe('ConfirmDialog', () => {
  const baseProps = {
    open: true,
    title: 'Confirm Action',
    description: 'Are you sure?',
    risk: 'baixo',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders when open', () => {
    render(
      <Wrapper>
        <ConfirmDialog {...baseProps} />
      </Wrapper>,
    );
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const { container } = render(
      <Wrapper>
        <ConfirmDialog {...baseProps} open={false} />
      </Wrapper>,
    );
    expect(container.querySelector('.confirm-dialog')).not.toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(
      <Wrapper>
        <ConfirmDialog {...baseProps} />
      </Wrapper>,
    );
    fireEvent.click(screen.getByText('Cancelar'));
    expect(baseProps.onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when confirm button is clicked', () => {
    render(
      <Wrapper>
        <ConfirmDialog {...baseProps} />
      </Wrapper>,
    );
    const confirmBtn = screen.getByText('Confirmar mesmo assim');
    fireEvent.click(confirmBtn);
    expect(baseProps.onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows risk badge', () => {
    render(
      <Wrapper>
        <ConfirmDialog {...baseProps} risk="medio" />
      </Wrapper>,
    );
    expect(screen.getByText(/medio/i)).toBeInTheDocument();
  });

  it('renders selectable list when provided', () => {
    const list = [
      { label: 'Xbox', value: 'xbox' },
      { label: 'Cortana', value: 'cortana' },
    ];
    render(
      <Wrapper>
        <ConfirmDialog {...baseProps} selectableList={list} />
      </Wrapper>,
    );
    expect(screen.getByText('Xbox')).toBeInTheDocument();
    expect(screen.getByText('Cortana')).toBeInTheDocument();
  });

  it('all items are checked by default in selectable list', () => {
    const list = [
      { label: 'Xbox', value: 'xbox' },
      { label: 'Cortana', value: 'cortana' },
    ];
    const { container } = render(
      <Wrapper>
        <ConfirmDialog {...baseProps} selectableList={list} />
      </Wrapper>,
    );
    const checkedItems = container.querySelectorAll('.confirm-dialog__list-item.is-checked');
    expect(checkedItems).toHaveLength(2);
  });

  it('unchecks item when clicked', () => {
    const list = [
      { label: 'Xbox', value: 'xbox' },
      { label: 'Cortana', value: 'cortana' },
    ];
    const { container } = render(
      <Wrapper>
        <ConfirmDialog {...baseProps} selectableList={list} />
      </Wrapper>,
    );
    fireEvent.click(screen.getByText('Xbox'));
    const checkedItems = container.querySelectorAll('.confirm-dialog__list-item.is-checked');
    expect(checkedItems).toHaveLength(1);
  });
});

describe('AppearancePanel', () => {
  const baseProps = {
    open: true,
    onClose: vi.fn(),
    theme: 'dark',
    onThemeChange: vi.fn(),
    accent: 'green',
    onAccentChange: vi.fn(),
    density: 'cozy',
    onDensityChange: vi.fn(),
    grid: true,
    onGridChange: vi.fn(),
  };

  it('renders when open', () => {
    render(
      <Wrapper>
        <AppearancePanel {...baseProps} />
      </Wrapper>,
    );
    expect(screen.getByText('Configuracoes')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    const { container } = render(
      <Wrapper>
        <AppearancePanel {...baseProps} open={false} />
      </Wrapper>,
    );
    expect(container.querySelector('.ap-panel')).not.toBeInTheDocument();
  });

  it('shows theme toggle buttons', () => {
    render(
      <Wrapper>
        <AppearancePanel {...baseProps} />
      </Wrapper>,
    );
    expect(screen.getByText('dark')).toBeInTheDocument();
    expect(screen.getByText('light')).toBeInTheDocument();
  });

  it('does not show language selector (moved to SettingsPage)', () => {
    const { container } = render(
      <Wrapper>
        <AppearancePanel {...baseProps} />
      </Wrapper>,
    );
    // Language buttons should NOT be in AppearancePanel anymore
    expect(container.textContent).not.toContain('Português');
    expect(container.textContent).not.toContain('English');
  });

  it('calls onThemeChange when theme button clicked', () => {
    render(
      <Wrapper>
        <AppearancePanel {...baseProps} />
      </Wrapper>,
    );
    fireEvent.click(screen.getByText('light'));
    expect(baseProps.onThemeChange).toHaveBeenCalledWith('light');
  });

  it('shows density toggle', () => {
    render(
      <Wrapper>
        <AppearancePanel {...baseProps} />
      </Wrapper>,
    );
    expect(screen.getByText('cozy')).toBeInTheDocument();
    expect(screen.getByText('compact')).toBeInTheDocument();
  });

  it('does not show export/import buttons (moved to SettingsPage)', () => {
    const { container } = render(
      <Wrapper>
        <AppearancePanel {...baseProps} />
      </Wrapper>,
    );
    const buttons = container.querySelectorAll('.btn--ghost.btn--small');
    expect(buttons).toHaveLength(0);
  });

  it('calls onClose when backdrop is clicked', () => {
    const { container } = render(
      <Wrapper>
        <AppearancePanel {...baseProps} />
      </Wrapper>,
    );
    const backdrop = container.querySelector('.ap-backdrop');
    expect(backdrop).toBeInTheDocument();
    fireEvent.click(backdrop!);
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });
});

describe('SettingsPage', () => {
  const baseProps = {
    locale: 'pt' as const,
    onLocaleChange: vi.fn(),
    minimizeToTray: false,
    onMinimizeToTrayChange: vi.fn(),
    scheduler: DEFAULT_SCHEDULER,
    onSchedulerChange: vi.fn(),
    lastScheduledRun: null,
    onExport: vi.fn(),
    onImport: vi.fn(),
  };

  it('shows language selector with all three locales', () => {
    render(
      <Wrapper>
        <SettingsPage {...baseProps} />
      </Wrapper>,
    );
    expect(screen.getByText('Português')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Español')).toBeInTheDocument();
  });

  it('calls onLocaleChange when language button clicked', () => {
    render(
      <Wrapper>
        <SettingsPage {...baseProps} />
      </Wrapper>,
    );
    fireEvent.click(screen.getByText('English'));
    expect(baseProps.onLocaleChange).toHaveBeenCalledWith('en');
  });

  it('shows export/import buttons', () => {
    const { container } = render(
      <Wrapper>
        <SettingsPage {...baseProps} />
      </Wrapper>,
    );
    const buttons = container.querySelectorAll('.btn--ghost.btn--small');
    const texts = Array.from(buttons).map(b => b.textContent?.trim());
    expect(texts.some(t => t?.includes('Exportar'))).toBe(true);
    expect(texts.some(t => t?.includes('Importar'))).toBe(true);
  });

  it('shows minimize to tray toggle', () => {
    render(
      <Wrapper>
        <SettingsPage {...baseProps} />
      </Wrapper>,
    );
    expect(screen.getByText('Minimizar pra bandeja ao fechar')).toBeInTheDocument();
  });

  it('shows scheduler toggle', () => {
    render(
      <Wrapper>
        <SettingsPage {...baseProps} />
      </Wrapper>,
    );
    expect(screen.getByText('Limpeza semanal automatica')).toBeInTheDocument();
  });
});
