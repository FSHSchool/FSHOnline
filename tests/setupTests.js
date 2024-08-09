// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom/extend-expect';

// Updated test set up based on: https://github.com/jsdom/jsdom/issues/3002
document.createRange = () => {
  const range = new Range();
  range.getBoundingClientRect = () => ({ right: 0 });
  range.getClientRects = () => ({ left: 0 });
  return range;
};
