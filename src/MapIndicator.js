import React, { Component } from 'react';
import './MapIndicator.css';

class MapIndicator extends Component {
    render() {
        const inlineStyle = {
            bottom: this.props.y * 100 + "%",
            left: this.props.x * 100 + "%"
        };
        const hiddenClass = this.props.selected ? "" : " hidden";
        return (
                <div
                    className={"mapIndicator " + this.props.safety}
                    style={inlineStyle}
                    onClick={() => this.props.onSelected(this.props.id)}
                    >
                    <div className={"description" + hiddenClass}>
                        {this.props.desc.name}<br/>
                        {this.props.desc.equipment}
                    </div>
                </div>

        );
    }
}

export default MapIndicator;
