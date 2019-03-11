import React, { Component } from 'react';
import './MainView.css';
import DashThumbnail from './DashThumbnail';


class MainView extends Component {

    render() {
        return (
            <div className="mainView">
                <div className="titleBar">
                    <h1>Indoor Positioning Monitor</h1>
                </div>
                <div className="toolBar">
                
                </div>
                <div className="contents">
                    <DashThumbnail />
                    <DashThumbnail />
                    <DashThumbnail />
                    <DashThumbnail />
                    <DashThumbnail />
                    <DashThumbnail />
                    <DashThumbnail />
                </div>
            </div>
        );
    }
}

export default MainView;
