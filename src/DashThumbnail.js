import React, { Component } from 'react';
import './DashThumbnail.css';


class DashThumbnail extends Component {

    render() {
        return (
            <div className="dashThumbnail">
                <div className="image">
                    <img src="/floorplan.jpg" alt="Floorplan" />
                </div>
                <div className="description">
                    <span className="name">
                        Dashboard 1
                    </span>
                    <span className="employeeCount">
                        85 employees
                    </span>
                </div>
            </div>
        );
    }
}

export default DashThumbnail;
