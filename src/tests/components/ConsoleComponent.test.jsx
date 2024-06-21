import React from 'react';
import { render } from '@testing-library/react';
import { unmountComponentAtNode } from 'react-dom';
import ConsoleComponent from '../../components/ConsoleComponent';

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

it('Renders with the appropriate label', () => {
  const { getByText } = render(<ConsoleComponent consoleMessages={[]} problemMessages={[]} />, container);
  const textElement = getByText('Console');

  expect(textElement).toBeInTheDocument();
});

it('Renders with proper messages in the console', () => {
  const infoMessages = ['Hello', 'Goodbye', 'How are you?'];

  const { getByText, queryByText } = render(
    <ConsoleComponent consoleMessages={infoMessages} problemMessages={[]} />,
    container
  );
  const textElement1 = getByText(/Hello/i);
  const textElement2 = getByText(/Goodbye/i);
  const textElement3 = getByText(/How are you\?/i);
  const textElement4 = queryByText(/This shouldn't appear/i);

  expect(textElement1).toBeInTheDocument();
  expect(textElement2).toBeInTheDocument();
  expect(textElement3).toBeInTheDocument();
  expect(textElement4).not.toBeInTheDocument();
});

it('Renders error and warning labels when passed in as messages', () => {
  const infoMessages = ['info'];
  const problemMessages = ['error foo', 'error bar', 'warning foo', 'warning bar'];

  const { queryByText } = render(
    <ConsoleComponent consoleMessages={infoMessages} problemMessages={problemMessages} />,
    container
  );
  const successLabel = queryByText(/Success!/i);

  expect(successLabel).not.toBeInTheDocument();
});
