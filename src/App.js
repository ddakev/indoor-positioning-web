import React, { Component } from 'react';
import { BrowserRouter, Route } from 'react-router-dom';
import './App.css';
import DashboardView from './DashboardView.js';
import MainView from './MainView.js';
import MapEditView from './MapEditView.js';


class App extends Component {
  constructor() {
    super();

    this.state = {
      // global app variables here
    };
  }

  render() {
    return (
      <BrowserRouter>
        <div className="App">
          <Route exact path="/" component={DashboardView} />
          <Route path="/main" component={MainView} />
          <Route path="/mapEdit" component={MapEditView} />
        </div>
      </BrowserRouter>
    );
  }
}

export default App;
