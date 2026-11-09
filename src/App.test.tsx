import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';

const VIEWS = [
  { nav: 'Mixer', heading: 'Mixer' },
  { nav: 'Medidores', heading: 'Medidores e RTA' },
  { nav: 'Processamento', heading: 'Processamento de canal' },
  { nav: 'Routing', heading: 'Routing e I/O' },
  { nav: 'AutoMix', heading: 'AutoMix' },
  { nav: 'Presets', heading: 'Presets e cenas' },
  { nav: 'Sistema', heading: 'Sistema' },
  { nav: 'Conexão', heading: 'Conexão' },
];

async function openView(user: ReturnType<typeof userEvent.setup>, name: string) {
  const nav = screen.getByRole('navigation');
  await user.click(within(nav).getByRole('button', { name }));
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('App', () => {
  it('keeps the demo banner visible and reaches every view', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText('DEMO — nenhuma mesa conectada.')).toBeInTheDocument();

    for (const view of VIEWS) {
      await openView(user, view.nav);
      expect(screen.getByRole('heading', { level: 1, name: view.heading })).toBeInTheDocument();
      expect(screen.getByText('DEMO — nenhuma mesa conectada.')).toBeInTheDocument();
    }
  });

  it('requires confirmation before enabling 48V and cancel keeps it off', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openView(user, 'Processamento');
    await user.click(screen.getByRole('tab', { name: '48V' }));

    expect(screen.getByRole('switch', { name: '48V Canal 1' })).toHaveAttribute(
      'aria-checked',
      'false',
    );

    await user.click(screen.getByRole('switch', { name: '48V Canal 1' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('switch', { name: '48V Canal 1' })).toHaveAttribute(
      'aria-checked',
      'false',
    );

    await user.click(screen.getByRole('switch', { name: '48V Canal 1' }));
    await user.click(screen.getByRole('button', { name: 'Ativar 48V' }));
    expect(screen.getByRole('switch', { name: '48V Canal 1' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('does not offer 48V on a stereo pair', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Ir para canal' }),
      'ch-17-18',
    );
    await openView(user, 'Processamento');
    await user.click(screen.getByRole('tab', { name: '48V' }));

    expect(screen.getByText('Indisponível')).toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: /48V Canal 17\/18/ })).not.toBeInTheDocument();
  });

  it('cancels a scene recall without removing the scene', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openView(user, 'Presets');
    await user.click(screen.getByRole('button', { name: 'Recall' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveTextContent('Cena inicial');

    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Cena inicial')).toBeInTheDocument();
  });

  it('cancels preset deletion and only removes it after confirmation', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openView(user, 'Presets');
    await user.click(screen.getAllByRole('button', { name: 'Excluir' })[0]);

    let dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByText('Demo — Banda')).toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: 'Excluir' })[0]);
    dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Excluir' }));
    expect(screen.queryByText('Demo — Banda')).not.toBeInTheDocument();
  });

  it('keeps AutoMix participation when clearing is cancelled', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openView(user, 'AutoMix');
    await user.click(screen.getByRole('switch', { name: 'Participação Canal 1' }));
    expect(screen.getByRole('switch', { name: 'Participação Canal 1' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Limpar AutoMix' }));
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.getByRole('switch', { name: 'Participação Canal 1' })).toHaveAttribute(
      'aria-checked',
      'true',
    );

    await user.click(screen.getByRole('button', { name: 'Limpar AutoMix' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Limpar AutoMix' }));
    expect(screen.getByRole('switch', { name: 'Participação Canal 1' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('switches the interface language without leaving demo mode', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Idioma' }), 'en');

    expect(screen.getByRole('heading', { level: 1, name: 'Mixer' })).toBeInTheDocument();
    expect(screen.getByText('DEMO — no mixer connected.')).toBeInTheDocument();
  });

  it('keeps Windows-only memory actions disabled in the browser', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openView(user, 'Sistema');

    expect(screen.getByRole('button', { name: 'Exportar memória' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Importar memória' })).toBeDisabled();
    expect(screen.getByText('Somente Windows')).toBeInTheDocument();
  });
});
