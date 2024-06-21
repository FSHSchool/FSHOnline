import React from 'react';
import { render } from '@testing-library/react';
import { unmountComponentAtNode } from 'react-dom';
import TopBar from '../../components/TopBar';

let container = null;
beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  unmountComponentAtNode(container);
  container.remove();
  container = null;
});

it('Renders with the proper heading as default', () => {
  const { getByText } = render(<TopBar />, container);
  const textElement = getByText(/FSH Online/i);

  expect(textElement).toBeInTheDocument();
});
