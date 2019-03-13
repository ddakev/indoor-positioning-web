import React, { Component } from 'react';
import './StatusIndicator.css';

class StatusIndicator extends Component {
    render() {
        return (
                <span className={"statusIndicator " + (this.props.available ? (this.props.status ? "true" : "false") : "not-available")}>
                    {this.props.available ? (this.props.status ? "ok" : "missing") : "N/A"}
                </span>
        );
    }
}

export default StatusIndicator;
