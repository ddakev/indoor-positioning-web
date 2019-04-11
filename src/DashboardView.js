import React, { Component } from 'react';
import './DashboardView.css';
import { Link } from 'react-router-dom';
import SearchBar from './SearchBar.js';
import EmployeeTable from './EmployeeTable.js';
import Map from './Map.js';


class DashboardView extends Component {
  constructor(props) {
    super(props);
    this.changeSelectedId = this.changeSelectedId.bind(this);
    this.updateFilter = this.updateFilter.bind(this);

    this.state = {
      selectedId: null,
      filter: emp => true,
    };
  }

  changeSelectedId(id) {
    console.log(id);
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
      filter: emp => (emp.firstName + " " + emp.lastName).toLowerCase().indexOf(needle.toLowerCase()) !== -1,
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
        <div className="titleBar">
          <h1>Indoor Positioning Monitor</h1>
        </div>
        <div className="content">
          <div className="leftPane">
            <div className="controlsContainer">
              <div className="controls-left">
                <SearchBar onChange={this.updateFilter}/>
              </div>
              <div className="controls-right">
                <Link to="/employeeEdit" className="button-outline">Edit Employees</Link>
                <Link to="/equipmentEdit" className="button-outline">Edit Equipment</Link>
              </div>
            </div>
            <EmployeeTable
              data={this.props.employeeData.filter(this.state.filter)}
              selectedId={this.state.selectedId}
              onSelectedChange={this.changeSelectedId}
              />
          </div>
          <div className = "rightPane">
            <div className="controlsContainer">
              <div className="controls-left">
              </div>
              <div className="controls-right">
                <Link to="/mapEdit" className="button-outline">Edit Map</Link>
              </div>
            </div>
            {
              this.props.floorplan
                ? <Map 
                    data={this.props.employeeData.filter(this.state.filter)}
                    selectedId={this.state.selectedId}
                    onSelectedChange={this.changeSelectedId}
                    floorplan={this.props.floorplan.imgData}
                    />
                : <div
                    className="mapPlaceholder"
                    >
                    <img src="map-missing.svg" alt="map-missing" />
                    Nothing to see here
                    <Link to="/mapEdit" className="button">Add Map</Link>
                  </div>
            }
          </div>
        </div>
      </div>
    );
  }
}

export default DashboardView;
