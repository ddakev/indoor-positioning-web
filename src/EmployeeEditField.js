import React, { Component } from 'react';
import './EmployeeEditField.css';

class EmployeeEditField extends Component {
    render() {
        return (
                <input
                    type="text"
                    className="employeeEditField"
                    id={this.props.name + "-" + this.props.row}
                    name={this.props.name + "-" + this.props.row}
                    onChange={this.props.inputChanged}
                    value={this.props.initialValue}
                    />
        );
    }
}

export default EmployeeEditField;
