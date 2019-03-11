import React, { Component } from 'react';
import io from 'socket.io-client';
import './DashboardView.css';
import SearchBar from './SearchBar.js';
import EmployeeTable from './EmployeeTable.js';
import Map from './Map.js';
import config from './config.js';


class DashboardView extends Component {
  constructor() {
    super();
    this.changeSelectedId = this.changeSelectedId.bind(this);
    this.updateFilter = this.updateFilter.bind(this);

    this.state = {
      selectedId: null,
      filter: emp => true,
      employeeData: [],
    };
  }

  componentDidMount() {
    // Get current data from server
    const xhr = new XMLHttpRequest();
    xhr.onload = () => {
      this.setState({employeeData: JSON.parse(xhr.responseText)})
    };
    xhr.open('GET', config.href + ":" + config.port + "/employeeData");
    xhr.send();

    // Get updates on tag locations and statuses from server
    const socket = io(config.href + ":" + config.port);
    socket.on('tagLocationUpdate', (msg) => {
      let dummyEmployeeData = this.state.employeeData;
      dummyEmployeeData[msg.id][msg.name].coords = {x: msg.x, y: msg.y};
      this.setState({employeeData: dummyEmployeeData});
    });
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
      <div className="DashboardView">
        <div className="header">
          <h1>Put a title here or something</h1>
        </div>
        <div className="content">
          <div className="leftPane">
            <SearchBar onChange={this.updateFilter}/>
            <EmployeeTable
              data={this.state.employeeData.filter(this.state.filter)}
              selectedId={this.state.selectedId}
              onSelectedChange={this.changeSelectedId}
              />
          </div>
          <div className = "rightPane">
            <Map 
              data={this.state.employeeData.filter(this.state.filter)}
              selectedId={this.state.selectedId}
              onSelectedChange={this.changeSelectedId}
              />
          </div>
        </div>
      </div>
    );
  }
}

export default DashboardView;
