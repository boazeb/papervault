import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

vi.mock('./pages/CreatePage', () => ({ default: () => <div>Create</div> }));
vi.mock('./pages/UnlockPage', () => ({ default: () => <div>Unlock</div> }));

test('renders app with PaperVault.xyz branding on landing', () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
  const heading = screen.getByRole('heading', { name: /PaperVault\.xyz/i });
  expect(heading).toBeInTheDocument();
});
