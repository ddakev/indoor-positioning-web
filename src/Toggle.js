import React, { Component } from 'react';
import './Toggle.css';

class Toggle extends Component {
    render() {
        return (
                <div
                    className="toggle"
                    onClick={this.props.onToggle}
                    >
                    <div className="label">{this.props.label}</div>
                    <div className={"switch" + (this.props.on ? " on" : " off")}>
                        <div className="switchIndicator" />
                    </div>
                </div>

        );
    }
}

export default Toggle;
