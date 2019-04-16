import React, { Component } from 'react';
import './EmployeeRow.css';
import StatusIndicator from './StatusIndicator.js';

class EmployeeRow extends Component {
    constructor(props) {
        super(props);

        this.state = {
            hardhat: null,
            leftBoot: null,
            rightBoot: null,
        };

        this.updateEquipments = this.updateEquipments.bind(this);
    }

    updateEquipments(props) {
        const updateObj = {
            hardhat: null,
            leftBoot: null,
            rightBoot: null,
        };
        for(let i=0; i<props.equipments.length; i++) {
            if(props.equipments[i].name === "Hard Hat") {
                updateObj.hardhat = props.equipments[i];
            }
            else if(props.equipments[i].name === "Left Boot") {
                updateObj.leftBoot = props.equipments[i];
            }
            else if(props.equipments[i].name === "Right Boot") {
                updateObj.rightBoot = props.equipments[i];
            }
        }
        this.setState({...updateObj});
    }

    componentDidMount() {
        this.updateEquipments(this.props);
    }

    componentWillReceiveProps(newProps) {
        if(newProps.equipments !== this.props.equipments) {
            this.updateEquipments(newProps);
        }
    }

    render() {
        return (
                <label htmlFor={"row" + this.props.id} id={"employee" + this.props.id}>
                    <td>{this.props.name}</td>
                    <td>{this.props.id}</td>
                    <td>
                        <StatusIndicator available={this.state.hardhat ? true : false} status={this.state.hardhat && this.state.hardhat.safetyStatus === "safe"} />
                    </td>
                    <td>
                        <StatusIndicator available={this.state.leftBoot ? true : false}  status={this.state.leftBoot && this.state.leftBoot.safetyStatus === "safe"} />
                    </td>
                    <td>
                        <StatusIndicator available={this.state.rightBoot ? true : false}  status={this.state.rightBoot && this.state.rightBoot.safetyStatus === "safe"} />
                    </td>
                </label>
        );
    }
}

export default EmployeeRow;
