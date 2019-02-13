import React, { Component } from 'react';
import './StatusIndicator.css';

class StatusIndicator extends Component {
    render() {
        return (
                <span className={"statusIndicator " + (this.props.status ? "true" : "false")}>
                    {this.props.status ? "ok" : "missing"}
                </span>
        );
    }
}

export default StatusIndicator;
