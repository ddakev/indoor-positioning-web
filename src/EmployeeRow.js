import React, { Component } from 'react';
import './EmployeeRow.css';
import StatusIndicator from './StatusIndicator.js';

class EmployeeRow extends Component {
    render() {
        return (
                <label htmlFor={"row" + this.props.id} id={"employee" + this.props.id}>
                    <td>{this.props.name}</td>
                    <td>{this.props.id}</td>
                    <td>
                        <StatusIndicator status={this.props.hardhatStatus} />
                    </td>
                    <td>
                        <StatusIndicator status={this.props.leftBootStatus} />
                    </td>
                    <td>
                        <StatusIndicator status={this.props.rightBootStatus} />
                    </td>
                </label>
        );
    }
}

export default EmployeeRow;
