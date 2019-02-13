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
                            if(!employee.hardhat.status && !employee.hardhat.outsideBounds) {
                                items.push(
                                    <MapIndicator
                                        x={employee.hardhat.coords.x}
                                        y={employee.hardhat.coords.y}
                                        id={employee.id}
                                        desc={{name: employee.name, equipment: "Hardhat"}}
                                        selected={this.props.selectedId === employee.id}
                                        onSelected={id => this.props.onSelectedChange(id)}
                                        key={index + "0"}
                                        />
                                );
                            }
                            if(!employee.leftBoot.status && !employee.leftBoot.outsideBounds) {
                                items.push(
                                    <MapIndicator
                                        x={employee.leftBoot.coords.x}
                                        y={employee.leftBoot.coords.y}
                                        id={employee.id}
                                        desc={{name: employee.name, equipment: "Left Boot"}}
                                        selected={this.props.selectedId === employee.id}
                                        onSelected={id => this.props.onSelectedChange(id)}
                                        key={index + "1"}
                                        />
                                );
                            }
                            if(!employee.rightBoot.status && !employee.rightBoot.outsideBounds) {
                                items.push(
                                    <MapIndicator
                                        x={employee.rightBoot.coords.x}
                                        y={employee.rightBoot.coords.y}
                                        id={employee.id}
                                        desc={{name: employee.name, equipment: "Right Boot"}}
                                        selected={this.props.selectedId === employee.id}
                                        onSelected={id => this.props.onSelectedChange(id)}
                                        key={index + "2"}
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
