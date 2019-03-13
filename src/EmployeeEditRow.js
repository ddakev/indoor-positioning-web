import React, { Component } from 'react';
import './EmployeeEditRow.css';
import EmployeeEditField from './EmployeeEditField.js';
import EmployeeEditDropdown from './EmployeeEditDropdown.js';

class EmployeeEditRow extends Component {
    render() {
        if(this.props.employee) {
            return (
                    <tr id={"employee" + this.props.rownum}>
                        {
                            this.props.objectProps.map((prop, index) => {
                                return (
                                    <td key={index}>
                                        {
                                            prop.type === "text" ?
                                            <EmployeeEditField
                                                name={prop.name}
                                                row={this.props.rownum}
                                                initialValue={this.props.employee[prop.name] || ""}
                                                inputChanged={this.props.inputChanged}
                                                />
                                            :
                                            <EmployeeEditDropdown
                                                name={prop.name}
                                                row={this.props.rownum}
                                                initialValue={this.props.employee[prop.name] || ""}
                                                inputChanged={this.props.inputChanged}
                                                options={prop.values}
                                                />
                                        }
                                    </td>
                                );
                            })
                        }
                        <td className="controlCell">
                            <div className="link-button deleteButton" onClick={() => this.props.deleteRow(this.props.rownum)}>
                                <img src="delete.png" alt="Delete"/>
                            </div>
                        </td>
                    </tr>
            );
        }
        else {
            return (
                <tr id={"employee" + this.props.rownum}>
                    {
                        this.props.objectProps.map((prop, index) => {
                            return (
                                <td key={index}>
                                    {
                                        prop.type === "text" ?
                                        <EmployeeEditField
                                            name={prop.name}
                                            row={this.props.rownum}
                                            initialValue={""}
                                            inputChanged={this.props.inputChanged}
                                            />
                                        :
                                        <EmployeeEditDropdown
                                            name={prop.name}
                                            row={this.props.rownum}
                                            initialValue={""}
                                            inputChanged={this.props.inputChanged}
                                            options={prop.values}
                                            />
                                    }
                                </td>
                            );
                        })
                    }
                </tr>
            );
        }
    }
}

export default EmployeeEditRow;
