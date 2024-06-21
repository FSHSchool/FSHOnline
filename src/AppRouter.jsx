import React from 'react';
import { Route, Switch } from 'react-router-dom';
import App from './App';

export default function AppRouter() {
  return (
    <Switch>
      <Route path="/share/:text" component={App} />
      <Route path="/gist/:id" component={App} />
      <Route path="" exact component={App} />
    </Switch>
  );
}
