import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppRouter from '../src/AppRouter';

vi.mock('../src/App.jsx', () => ({ default: () => <div>Mock FSH Online</div> }));

test('Renders FSH Online App when visiting /FSHOnline', () => {
  const { getByText } = render(
    <MemoryRouter initialEntries={['/FSHOnline']}>
      <AppRouter />
    </MemoryRouter>
  );
  const linkElement = getByText(/Mock FSH Online/i);
  expect(linkElement).toBeInTheDocument();
});

test('Renders FSH Online App when visiting /FSHOnline/share/:text', () => {
  const { getByText } = render(
    <MemoryRouter initialEntries={['/FSHOnline/share/abcd']}>
      <AppRouter />
    </MemoryRouter>
  );
  const linkElement = getByText(/Mock FSH Online/i);
  expect(linkElement).toBeInTheDocument();
});

test('Renders FSH Online App when visiting /FSHOnline/gist/:id', () => {
  const { getByText } = render(
    <MemoryRouter initialEntries={['/FSHOnline/gist/123']}>
      <AppRouter />
    </MemoryRouter>
  );
  const linkElement = getByText(/Mock FSH Online/i);
  expect(linkElement).toBeInTheDocument();
});
