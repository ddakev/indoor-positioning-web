import React, { Component } from 'react';
import './Map.css';
import MapIndicator from './MapIndicator.js';

class Map extends Component {
    render() {
        return (
            <div className="floorplanContainer">
                <img src={this.props.floorplan}  alt="Floorplan" />
                <div className="mapCoordArea">
                    {
                        this.props.data.map((employee, index) => {
                            let items = [];
                            for(let i=0; i<employee.equips.length; i++) {
                                let safety = "safe";
                                if(!employee.equips[i].isWorn && !employee.equips[i].inSafeArea) {
                                    safety = "danger";
                                }
                                items.push(
                                    <MapIndicator
                                        x={employee.equips[i].latestX}
                                        y={employee.equips[i].latestY}
                                        id={employee.employeeId}
                                        desc={{name: employee.firstName + " " + employee.lastName, equipment: employee.equips[i].name}}
                                        selected={this.props.selectedId === employee.employeeId}
                                        onSelected={id => this.props.onSelectedChange(id)}
                                        key={index + "" + i}
                                        safety={safety}
                                        />
                                );
                            }
                            return items;
                        })
                    }
                </div>
            </div>
        );
    }
}

export default Map;
