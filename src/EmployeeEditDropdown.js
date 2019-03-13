import React, { Component } from 'react';
import './EmployeeEditDropdown.css';

class EmployeeEditDropdown extends Component {
    render() {
        return (
                <select
                    className="employeeEditDropdown"
                    id={this.props.name + "-" + this.props.row}
                    name={this.props.name + "-" + this.props.row}
                    onChange={this.props.inputChanged}
                    value={this.props.initialValue}
                    >
                    <option value=""></option>
                    {
                        this.props.options.map((opt) => {
                            return (
                                <option
                                    value={opt}
                                    key={opt}
                                    >
                                    {opt}
                                </option>
                            );
                        })
                    }
                </select>
        );
    }
}

export default EmployeeEditDropdown;
