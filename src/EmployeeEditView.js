import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';
import './EmployeeEditView.css';
import EmployeeEditTable from './EmployeeEditTable.js';
import config from './config.js';


class EmployeeEditView extends Component {
    constructor(props) {
        super(props);

        this.state = {
            shouldRedirect: false,
            key: props.objectProperties.find(p => p.key).name,
            data: JSON.parse(JSON.stringify(this.props.data)),
            focused: null,
        };

        for(let i=0; i<this.state.data.length; i++) {
            this.state.data[i].originalId = this.state.data[i][this.state.key];
        }
        
        this.goBack = this.goBack.bind(this);
        this.save = this.save.bind(this);
        this.getTableData = this.getTableData.bind(this);
        this.inputChanged = this.inputChanged.bind(this);
        this.deleteRow = this.deleteRow.bind(this);
    }

    componentWillReceiveProps(newProps) {
        if(newProps.data !== this.props.data) {
            const newData = JSON.parse(JSON.stringify(newProps.data));
            for(let i=0; i<newData.length; i++) {
                newData[i].originalId = newData[i][this.state.key];
            }
            
            this.setState({data: newData});
        }
    }

    goBack() {
        this.setState({shouldRedirect: true});
    }
    
    getTableData() {
        let data = [];
        for(let r = 0; r < this.state.data.length; r++) {
            const obj = {};
            for(let i = 0; i < this.props.objectProperties.length; i++) {
                obj[this.props.objectProperties[i].name] = this.state.data[r][this.props.objectProperties[i].name];
            }
            obj["originalId"] = this.state.data[r]["originalId"];
            data.push(obj);
        }
        return data;
    }

    deleteRow(rownum) {
        const data = this.state.data.slice();
        data.splice(rownum, 1);
        this.setState({data: data, focused: null});
    }

    inputChanged(e) {
        const data = this.state.data.slice();
        const field = e.target;
        const row = field.parentElement.parentElement.id.slice(8);
        const name = field.id.slice(0, field.id.indexOf("-"));
        if(row >= data.length) {
            data.push({});
        }
        data[row][name] = field.value;
        let hasprops = false;
        for(let prop in data[row]) {
            if(data[row].hasOwnProperty(prop) && data[row][prop]) {
                hasprops = true;
            }
        }
        if(!hasprops) {
            data.splice(row, 1);
        }
        this.setState({data: data, focused: {row, name}});
    }

    save() {
        const data = this.getTableData();
        let actions = [];
        for(let i=0; i<data.length; i++) {
            let emptyFields = false;
            for(let j=0; j<this.props.objectProperties.length; j++) {
                if(!data[i][this.props.objectProperties[j].name]) {
                    emptyFields = true;
                    break;
                }
            }
            if(emptyFields) continue;
            const emp = this.props.data.find(e => e[this.state.key] === data[i]["originalId"]);
            if(emp) {
                let allEqual = true;
                for(let j=0; j<this.props.objectProperties.length; j++) {
                    if(data[i][this.props.objectProperties[j].name] !== emp[this.props.objectProperties[j].name]) {
                        allEqual = false;
                        break;
                    }
                }
                if(!allEqual) {
                    // update
                    actions.push(new Promise((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        xhr.onreadystatechange = () => {
                            if(xhr.readyState === 4) {
                                if(xhr.status === 200) {
                                    resolve();
                                }
                                else {
                                    reject();
                                }
                            }
                        };
                        xhr.open('PUT', config.api + "/" + this.props.endpoint + "/update/" + emp[this.state.key]);
                        xhr.setRequestHeader("Content-Type", "application/json");
                        xhr.send(JSON.stringify(data[i]));
                    }));
                }
            }
            else if(!emp) {
                // create
                actions.push(new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.onreadystatechange = () => {
                        if(xhr.readyState === 4) {
                            if(xhr.status === 201) {
                                resolve();
                            }
                            else {
                                reject();
                            }
                        }
                    };
                    xhr.open('POST', config.api + "/"+ this.props.endpoint + "/add");
                    xhr.setRequestHeader("Content-Type", "application/json");
                    xhr.send(JSON.stringify(data[i]));
                }));
            }
        }
        
        const updatedIds = data.map(d => d["originalId"]);
        for(let i=0; i<this.props.data.length; i++) {
            if(!updatedIds.find(id => id === this.props.data[i][this.state.key])) {
                // delete
                actions.push(new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.onreadystatechange = () => {
                        if(xhr.readyState === 4) {
                            if(xhr.status === 200) {
                                resolve();
                            }
                            else {
                                reject();
                            }
                        }
                    };
                    xhr.open('DELETE', config.api + "/" + this.props.endpoint + "/delete/" + this.props.data[i][this.state.key]);
                    xhr.send();
                }));
            }
        }

        Promise.all(actions).then(() => {
            this.props.updateData();
            this.goBack();
        });
    }

    render() {
        return (
            <div className="employeeEditView">
                {this.state.shouldRedirect ? <Redirect to="/" /> : null}
                <div className="titleBar">
                    <h1>Indoor Positioning Monitor</h1>
                </div>
                <div className="toolBar">
                    <div className="toolbar-left">
                        <div className="link-button backButton" onClick={this.goBack}>
                            <img src="back.png" alt="Back"/>
                        </div>
                    </div>
                    <div className="toolbar-right">
                        <div className="button saveButton" onClick={this.save}>Save</div>
                        <div className="link-button cancelButton" onClick={this.goBack}>Cancel</div>
                    </div>
                </div>
                <div className="contents">
                    <EmployeeEditTable
                        data={this.state.data}
                        objectProps={this.props.objectProperties}
                        inputChanged={this.inputChanged}
                        deleteRow={this.deleteRow}
                        focused={this.state.focused}
                        />
                </div>
            </div>
        );
    }
}

export default EmployeeEditView;
