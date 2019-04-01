import React, { Component } from 'react';
import io from 'socket.io-client';
import { BrowserRouter, Route } from 'react-router-dom';
import './App.css';
import DashboardView from './DashboardView.js';
import MainView from './MainView.js';
import MapEditView from './MapEditView.js';
import EmployeeEditView from './EmployeeEditView.js';
import config from './config.js';


class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      employeeData: [],
      employees: [],
      equipments: [],
      geofences: null,
      routers: [],
      floorplan: null,
    };

    this.fetchData = this.fetchData.bind(this);
    this.fetchFloorplan = this.fetchFloorplan.bind(this);
  }

  componentDidMount() {
    this.fetchData();
    this.fetchFloorplan();
    // Get current data from server

    // Get updates on tag locations and statuses from server
    /*const socket = io(config.href + ":" + config.port);
    socket.on('tagLocationUpdate', (msg) => {
      let dummyEmployeeData = this.state.employeeData;
      dummyEmployeeData[msg.id][msg.name].coords = {x: msg.x, y: msg.y};
      this.setState({employeeData: dummyEmployeeData});
    });*/
  }

  fetchFloorplan() {
    // floorplan image
    const floorxhr = new XMLHttpRequest();
    floorxhr.onreadystatechange = () => {
      if(floorxhr.readyState === 4) {
        if(floorxhr.status === 200) {
          this.setState({floorplan: JSON.parse(floorxhr.responseText).imgData});
        }
        else {
          this.setState({floorplan: null});
          console.log(floorxhr.responseText);
        }
      }
    };
    floorxhr.open('GET', config.api + "/floorplan/get");
    floorxhr.send();

    // geofences
    const fencexhr = new XMLHttpRequest();
    fencexhr.onreadystatechange = () => {
      if(fencexhr.readyState === 4) {
        if(fencexhr.status === 200) {
          this.setState({geofences: JSON.parse(fencexhr.responseText).boundaries});
        }
        else {
          this.setState({geofences: null});
          console.log(fencexhr.responseText);
        }
      }
    };
    fencexhr.open('GET', config.api + "/geofence/get");
    fencexhr.send();

    // routers
    const routexhr = new XMLHttpRequest();
    routexhr.onreadystatechange = () => {
      if(routexhr.readyState === 4) {
        if(routexhr.status === 200) {
          this.setState({routers: JSON.parse(routexhr.responseText)});
        }
        else {
          this.setState({routers: []});
          console.log(routexhr.responseText);
        }
      }
    };
    routexhr.open('GET', config.api + "/router/get/all");
    routexhr.send();
  }

  fetchData() {
    let employees = new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onreadystatechange = () => {
        if(xhr.readyState === 4) {
          if(xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText));
          }
          else {
            reject();
          }
        }
      };
      xhr.open('GET', config.api + "/employee/get/all");
      xhr.send();
    });
    let equipments = new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onreadystatechange = () => {
        if(xhr.readyState === 4) {
          if(xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText));
          }
          else {
            reject();
          }
        }
      };
      xhr.open('GET', config.api + "/equipment/get/all");
      xhr.send();
    });
    Promise.all([employees, equipments]).then((values) => {
      values[0].sort((a, b) => a.lastName < b.lastName);
      this.setState({employees: values[0], equipments: values[1]});
      let emps = values[0];
      let eqs = values[1];
      for(let i=0; i<emps.length; i++) {
        emps[i].equips = [];
      }
      for(let i=0; i<eqs.length; i++) {
        const emp = emps.find(e => e.employeeId === eqs[i].assignedEmployeeId);
        if(emp) {
          emp.equips.push(eqs[i]);
        }
      }
      this.setState({employeeData: emps});
    });
  }

  render() {
    return (
      <BrowserRouter>
        <div className="App">
          <Route exact path="/" render={() => (
            <DashboardView
              employeeData={this.state.employeeData}
              floorplan={this.state.floorplan}
              />
          )} />
          <Route path="/main" component={MainView} />
          <Route path="/mapEdit" render={() => (
            <MapEditView
              geofenceData={this.state.geofences}
              updateFloorplan={this.fetchFloorplan}
              floorplan={this.state.floorplan}
              routers={this.state.routers}
              />
          )} />
          <Route path="/employeeEdit" render={() => (
            <EmployeeEditView
              data={this.state.employeeData}
              updateData={this.fetchData}
              objectProperties={[
                {name: "employeeId", type: "text", key: true},
                {name: "firstName", type: "text"},
                {name: "lastName", type: "text"},
                {name: "role", type: "dropdown", values: ["admin", "manager", "worker"]}
              ]}
              endpoint="employee"
              />
           )} />
          <Route path="/equipmentEdit" render={() => (
            <EmployeeEditView
              data={this.state.equipments}
              updateData={this.fetchData}
              objectProperties={[
                {name: "equipId", type: "text", key: true},
                {name: "name", type: "dropdown", values: ["Hard Hat", "Left Boot", "Right Boot"]},
                {name: "mac", type: "text"},
                {name: "assignedEmployeeId", type: "text"}
              ]}
              endpoint="equipment"
              />
           )} />
        </div>
      </BrowserRouter>
    );
  }
}

export default App;
