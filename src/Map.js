import React, { Component } from 'react';
import './Map.css';
import MapIndicator from './MapIndicator.js';

class Map extends Component {
    constructor(props) {
        super(props);

        this.state = {
            img: '',
        };
    };

    componentDidMount() {
        fetch('http://localhost:8080/api/v1/floorplan/get')
        .then(res => res.json())
        .then(data => {
            this.setState({
                img: data.imgData,
            });
        });
    }

    render() {
        const { img } = this.state;
        return (
            <div className="floorplanContainer">
                <img src={img}  alt="Floorplan" />
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
                                            id={employee.employeeId}
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
