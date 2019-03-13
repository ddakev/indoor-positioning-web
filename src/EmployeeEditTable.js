import React, { Component } from 'react';
import './EmployeeEditTable.css';
import EmployeeEditRow from './EmployeeEditRow.js';

class EmployeeEditTable extends Component {
    componentDidUpdate() {
        if(this.props.focused) {
            document.getElementById(this.props.focused.name + "-" + this.props.focused.row).focus();
        }
    }

    render() {
        return (
            <table className="employeeEditTable">
                <thead>
                    <tr className="employeeTableHeader">
                        {
                            this.props.objectProps.map((prop, index) => {
                                return <th key={index}>{prop.name}</th>
                            })
                        }
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                {
                    this.props.data.map((employee, index) => {
                        return (
                            <EmployeeEditRow
                                employee={employee}
                                rownum={index}
                                key={"row" + index}
                                deleteRow={this.props.deleteRow}
                                inputChanged={this.props.inputChanged}
                                objectProps={this.props.objectProps}
                                />
                        );
                    })
                }
                <EmployeeEditRow
                    employee={null}
                    rownum={this.props.data.length}
                    key={"row" + this.props.data.length}
                    inputChanged={this.props.inputChanged}
                    objectProps={this.props.objectProps}
                    />
                </tbody>
            </table>
        );
    }
}

export default EmployeeEditTable;
