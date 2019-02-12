import React, { Component } from 'react';
import './App.css';
import SearchBar from './SearchBar.js';
import EmployeeTable from './EmployeeTable.js';
import Map from './Map.js';

var dummyEmployeeData = [];

for(let i=0; i<100; i++) {
  let newEmp = {
    "name": "EmployeeName" + i,
    "id": i
  };
  newEmp.hardhat = {
    "status": 1,
    "ousideBounds": 0,
    "coords": {"x": Math.random(), "y": Math.random()}
  };
  newEmp.leftBoot = {
    "status": 1,
    "ousideBounds": 0,
    "coords": {"x": Math.random(), "y": Math.random()}
  };
  newEmp.rightBoot = {
    "status": 1,
    "ousideBounds": 0,
    "coords": {"x": Math.random(), "y": Math.random()}
  };
  if(Math.random() < 0.05) {
    newEmp.hardhat.status = 0;
  }
  if(Math.random() < 0.05) {
    newEmp.hardhat.outsideBounds = 1;
  }
  if(Math.random() < 0.05) {
    newEmp.leftBoot.status = 0;
  }
  if(Math.random() < 0.05) {
    newEmp.leftBoot.outsideBounds = 1;
  }
  if(Math.random() < 0.05) {
    newEmp.rightBoot.status = 0;
  }
  if(Math.random() < 0.05) {
    newEmp.rightBoot.outsideBounds = 1;
  }
  dummyEmployeeData.push(newEmp);
}

class App extends Component {
  constructor() {
    super();
    this.state = {
      selectedId: null,
      filter: emp => true,
    };
    this.changeSelectedId = this.changeSelectedId.bind(this);
    this.updateFilter = this.updateFilter.bind(this);
  }

  changeSelectedId(id) {
    if(this.state.selectedId !== id) {
        // scroll to new user id?
        let container = document.getElementsByClassName("leftPane")[0];
        let selectedEmp = document.getElementById("employee" + id);
        let top = selectedEmp.offsetTop + selectedEmp.parentElement.offsetTop;
        let scrTop = container.scrollTop;
        let height = selectedEmp.offsetHeight;
        let containerHeight = container.offsetHeight;
        if(top - scrTop > containerHeight || top - scrTop + height < 0) {
          let finalScrollPos = top - containerHeight / 2;
          this.smoothScroll(container, scrTop, finalScrollPos, 200);
        }
    }

    this.setState({selectedId: id});
  }

  updateFilter(needle) {
    this.setState({
      filter: emp => emp.name.toLowerCase().indexOf(needle.toLowerCase()) !== -1,
    })
  }

  smoothScroll(element, from, to, duration) {
    const easeInOut = t => t<.5 ? 2*t*t : -1+(4-2*t)*t;
    const tfunc =(a, b, t) => a*(1-easeInOut(t)) + b*easeInOut(t);
    let start;
    const scroll = (time) => {
      if(!start) start = time;
      let progress = (time - start) / duration;
      if(progress >= 1) {
        element.scrollTo(0, to);
        return;
      }
      element.scrollTo(0, tfunc(from, to, progress));

      requestAnimationFrame(scroll);
    };
    requestAnimationFrame(scroll);
  }

  render() {
    return (
      <div className="App">
        <div className="header">
          <h1>Put a title here or something</h1>
        </div>
        <div className="content">
          <div className="leftPane">
            <SearchBar onChange={this.updateFilter}/>
            <EmployeeTable
              data={dummyEmployeeData.filter(this.state.filter)}
              selectedId={this.state.selectedId}
              onSelectedChange={this.changeSelectedId}
              />
          </div>
          <div className = "rightPane">
            <Map 
              data={dummyEmployeeData.filter(this.state.filter)}
              selectedId={this.state.selectedId}
              onSelectedChange={this.changeSelectedId}
              />
          </div>
        </div>
      </div>
    );
  }
}

export default App;
