import React, { Component } from 'react';
import './Map.css';
import MapIndicator from './MapIndicator.js';

class Map extends Component {
    render() {
        return (
            <div className="floorplanContainer">
                <img src="floorplan.jpg"  alt="Floorplan" />
                <div className="mapCoordArea">
                    {
                        this.props.data.map((employee, index) => {
                            let items = [];
                            for(let i=0; i<employee.equips.length; i++) {
                                if(!employee.equips[i].isWorn && !employee.equips[i].inSafeArea) {
                                    items.push(
                                        <MapIndicator
                                            x={employee.equips[i].latestX}
                                            y={employee.equips[i].latestY}
                                            id={employee.equips[i].employeeId}
                                            desc={{name: employee.firstName + " " + employee.lastName, equipment: employee.equips[i].name}}
                                            selected={this.props.selectedId === employee.employeeId}
                                            onSelected={id => this.props.onSelectedChange(id)}
                                            key={index + "" + i}
                                            />
                                    );
                                }
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
