import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

jest.mock('./pages/CreatePage', () => () => <div>Create</div>);
jest.mock('./pages/UnlockPage', () => () => <div>Unlock</div>);

test('renders app with PaperVault.xyz branding on landing', () => {
  render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
  const heading = screen.getByRole('heading', { name: /PaperVault\.xyz/i });
  expect(heading).toBeInTheDocument();
});
