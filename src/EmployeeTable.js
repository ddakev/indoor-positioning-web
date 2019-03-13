import React, { Component } from 'react';
import './EmployeeTable.css';
import EmployeeRow from './EmployeeRow.js';

class EmployeeTable extends Component {
    constructor(props) {
        super(props);
        this.handleNewSelected = this.handleNewSelected.bind(this);
    }

    handleNewSelected(e) {
        if(e.target.checked) {
            const id = e.target.id.substring(3);
            this.props.onSelectedChange(id);
        }
    }

    render() {
        return (
            <table className="employeeTable">
                <thead>
                    <tr className="employeeTableHeader">
                        <th>Name</th>
                        <th>ID</th>
                        <th>Hardhat</th>
                        <th>Left Boot</th>
                        <th>Right Boot</th>
                    </tr>
                </thead>
                <tbody>
                {
                    this.props.data.map((employee, index) => {
                        let items = [];
                        items.push(
                            <input
                                type="radio"
                                name="employeeRadio"
                                id={"row" + employee.employeeId}
                                style={{display: 'none'}}
                                checked={this.props.selectedId === employee.employeeId}
                                onChange={this.handleNewSelected}
                                key={"input" + index}
                                />,
                            <EmployeeRow
                                name={employee.firstName + " " + employee.lastName}
                                id={employee.employeeId}
                                equipments={employee.equips}
                                key={"row" + index}
                                />
                        );
                        return (
                            items
                        );
                    })
                }
                </tbody>
            </table>
        );
    }
}

export default EmployeeTable;
