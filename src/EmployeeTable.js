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
            const id = parseInt(e.target.id.substring(3));
            this.props.onSelectedChange(id);
        }
    }

    render() {
        return (
            <table className="employeeTable">
                <tr className="employeeTableHeader">
                    <th>Name</th>
                    <th>ID</th>
                    <th>Hardhat</th>
                    <th>Left Boot</th>
                    <th>Right Boot</th>
                </tr>
                <tbody>
                {
                    this.props.data.map((employee, index) => {
                        let items = [];
                        items.push(
                            <input
                                type="radio"
                                name="employeeRadio"
                                id={"row" + employee.id}
                                style={{display: 'none'}}
                                checked={this.props.selectedId === employee.id}
                                onChange={this.handleNewSelected}
                                />,
                            <EmployeeRow
                                name={employee.name}
                                id={employee.id}
                                hardhatStatus={employee.hardhat.status || employee.hardhat.outsideBounds}
                                leftBootStatus={employee.leftBoot.status || employee.leftBoot.outsideBounds}
                                rightBootStatus={employee.rightBoot.status || employee.rightBoot.outsideBounds}
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