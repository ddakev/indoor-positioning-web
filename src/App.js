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
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onreadystatechange = () => {
        if(xhr.readyState === 4) {
          if(xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText));
          }
          else {
            reject(xhr.responseText);
          }
        }
      };
      xhr.open('GET', config.api + "/floorplan/get");
      xhr.send();
    }).then(response => {
      this.setState({floorplan: response.imgData});
    }).catch(err => {
      this.setState({floorplan: null});
      console.log(err);
    });
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

    // equipment
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onreadystatechange = () => {
        if(xhr.readyState === 4) {
          if(xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText));
          }
          else {
            reject(xhr.responseText);
          }
        }
      };
      xhr.open('GET', config.api + "/geofence/get");
      xhr.send();
    }).then(geofences => {
      this.setState({geofences: geofences.boundaries});
    }).catch(err => {
      this.setState({geofences: null});
      console.log(err);
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
              updateData={this.fetchData}
              updateFloorplan={this.fetchFloorplan}
              floorplan={this.state.floorplan}
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
