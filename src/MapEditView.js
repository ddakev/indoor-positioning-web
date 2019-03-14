import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';
import './MapEditView.css';
import config from './config.js';
import Toggle from './Toggle.js';

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

const SNAP_THRESHOLD = 8;

class MapEditView extends Component {
    constructor() {
        super();

        this.state = {
            shouldRedirect: false,
            snapEnabled: true,
        };

        this.drawState = {
            lastPoint: null,
            canvas: null,
            ctx: null,
            moveListener: null,
            dblClickListener: null,
            preventClick: false,
            snapLineX: null,
            snapLineY: null,
            polygons: [],
            vertices: [],
        };
        this.clickEventHandler = this.clickEventHandler.bind(this);
        this.moveEventHandler = this.moveEventHandler.bind(this);
        this.doubleClickHandler = this.doubleClickHandler.bind(this);
        this.goBack = this.goBack.bind(this);
        this.save = this.save.bind(this);
        this.clear = this.clear.bind(this);
        this.redraw = this.redraw.bind(this);
        this.loadPolygons = this.loadPolygons.bind(this);
        this.toggleSnap = this.toggleSnap.bind(this);
    }

    goBack() {
        this.setState({shouldRedirect: true});
    }

    save() {
        let toDelete = [];
        let polyIds = this.props.geofenceData.map(gfd => gfd["_id"]);
        for(let i=0; i<polyIds.length; i++) {
            toDelete.push(new Promise((resolve, reject) => {
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
                xhr.open('DELETE', config.api + "/geofence/delete/" + polyIds[i]);
                xhr.send();
            }));
        }
        Promise.all(toDelete).then(() => {
            let actions = [];
            for(let i=0; i<this.drawState.polygons.length; i++) {
                let normVerts = JSON.parse(JSON.stringify(this.drawState.polygons[i]));
                for(let p=0; p<normVerts.length; p++) {
                    normVerts[p].x /= this.drawState.canvas.offsetWidth;
                    normVerts[p].y /= this.drawState.canvas.offsetHeight;
                }
                const submitObject = {
                    vertices: normVerts,
                    safetyLevel: "danger",
                }

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
                    xhr.open('POST', config.api + "/geofence/add");
                    xhr.setRequestHeader("Content-Type", "application/json");
                    xhr.send(JSON.stringify(submitObject));
                }));
            }
            Promise.all(actions).then(() => {
                this.props.updateData();
                this.goBack();
            });
        });
    }

    toggleSnap() {
        this.setState({snapEnabled: !this.state.snapEnabled});
    }

    componentDidMount() {
        this.drawState.canvas = document.getElementsByClassName("mapEditCanvas")[0];
        setTimeout(() => {
            this.drawState.canvas.height = this.drawState.canvas.offsetHeight;
            this.drawState.canvas.width = this.drawState.canvas.offsetWidth;
        }, 10);
        this.drawState.ctx = this.drawState.canvas.getContext('2d');
        this.loadPolygons(this.props);
    }

    componentWillReceiveProps(newProps) {
        if(newProps.geofenceData !== this.props.geofenceData) {
            this.loadPolygons(newProps);
        }
    }

    clear() {
        this.drawState.polygons = [];
        this.redraw();
    }
    
    redraw() {
        const ds = this.drawState;
        ds.ctx.clearRect(0, 0, ds.canvas.width, ds.canvas.height);
        for(let p=0; p<ds.polygons.length; p++) {
            let poly = ds.polygons[p];
            ds.ctx.beginPath();
            ds.ctx.moveTo(poly[0].x, poly[0].y);
            for(let i=1; i<poly.length; i++) {
                ds.ctx.lineTo(poly[i].x, poly[i].y);
            }
            ds.ctx.lineTo(poly[0].x, poly[0].y);
            ds.ctx.fillStyle = "#77bbff22";
            ds.ctx.strokeStyle = "black";
            ds.ctx.stroke();
            ds.ctx.fill();
        }
    }

    loadPolygons(props) {
        const ds = this.drawState;
        const polys = [];
        for(let i=0; i<props.geofenceData.length; i++) {
            polys.push(JSON.parse(JSON.stringify(props.geofenceData[i].vertices)));
            for(let j=0; j<polys[i].length; j++) {
                polys[i][j].x *= ds.canvas.offsetWidth;
                polys[i][j].y *= ds.canvas.offsetHeight;
            }
        }
        ds.polygons = polys;
        
        setTimeout(this.redraw, 10);
    }

    snapToClosestVertex(p) {
        const ds = this.drawState;
        const verts = ds.vertices;
        let closestX = null;
        let closestY = null;
        let cxdist = SNAP_THRESHOLD+1;
        let cydist = SNAP_THRESHOLD+1;
        for(let i=0; i<verts.length; i++) {
            const xdist = Math.abs(verts[i].x - p.x);
            const ydist = Math.abs(verts[i].y - p.y);
            if(xdist < SNAP_THRESHOLD) {
                if(cxdist > xdist) {
                    cxdist = xdist;
                    closestX = verts[i];
                }
            }
            if(ydist < SNAP_THRESHOLD) {
                if(cydist > ydist) {
                    cydist = ydist;
                    closestY = verts[i];
                }
            }
        }
        if(!closestX) {
            closestX = p;
            ds.snapLineX = null;
        }
        else {
            ds.snapLineX = closestX.x;
        }
        if(!closestY) {
            closestY = p;
            ds.snapLineY = null;
        }
        else {
            ds.snapLineY = closestY.y;
        }
        return new Point(closestX.x, closestY.y);
    }

    getAxisAlignedCoord(sp, fp, ang) {
        if(sp == null) return new Point(fp.x, fp.y);
        const ds = this.drawState;
        const dir = Math.round(Math.atan2((fp.y - sp.y), (fp.x - sp.x)) * 180 / (3.14 * ang)) * ang;
        let nx = Math.cos(dir * 3.14 / 180);
        let ny = Math.sin(dir * 3.14 / 180);
        if(ds.snapLineY) {
            const scale = fp.y - sp.y !== 0 ? (fp.y - sp.y) / ny : (fp.x - sp.x) / nx;
            nx = nx * scale + sp.x;
            ny = ny * scale + sp.y;
        }
        else if(ds.snapLineX) {
            const scale = fp.x - sp.x !== 0 ? (fp.x - sp.x) / nx : (fp.y - sp.y) / ny;
            nx = nx * scale + sp.x;
            ny = ny * scale + sp.y;
        }
        else {
            const dot = nx * (fp.x - sp.x) + ny * (fp.y - sp.y);
            nx = nx * dot + sp.x;
            ny = ny * dot + sp.y;
        }
        return new Point(nx, ny);
    }

    doubleClickHandler(e) {
        const ds = this.drawState;
        ds.preventClick = true;
        if(ds.lastPoint === null) {
            return;
        }
        ds.lastPoint = null;

        ds.ctx.clearRect(0, 0, ds.canvas.width, ds.canvas.height);
        for(let p=0; p<ds.polygons.length; p++) {
            let poly = ds.polygons[p];
            ds.ctx.beginPath();
            ds.ctx.moveTo(poly[0].x, poly[0].y);
            for(let i=1; i<poly.length; i++) {
                ds.ctx.lineTo(poly[i].x, poly[i].y);
            }
            ds.ctx.lineTo(poly[0].x, poly[0].y);
            ds.ctx.fillStyle = "#77bbff22";
            ds.ctx.strokeStyle = "black";
            ds.ctx.stroke();
            ds.ctx.fill();
        }

        e.target.removeEventListener("mousemove", this.moveEventHandler);
        e.target.removeEventListener("dblclick", this.doubleClickHandler);
        ds.moveListener = null;
        ds.dblClickListener = null;
    }

    moveEventHandler(e) {
        const ds = this.drawState;
        const x = e.clientX - ds.canvas.parentElement.offsetLeft;
        const y = e.clientY - ds.canvas.parentElement.offsetTop;
        const point = this.state.snapEnabled ? this.snapToClosestVertex(new Point(x, y)) : new Point(x, y);
        const coords = e.shiftKey ? this.getAxisAlignedCoord(ds.lastPoint, point, 45) : point;
        ds.ctx.clearRect(0, 0, ds.canvas.width, ds.canvas.height);
        for(let p=0; p<ds.polygons.length; p++) {
            let poly = ds.polygons[p];
            ds.ctx.beginPath();
            ds.ctx.moveTo(poly[0].x, poly[0].y);
            for(let i=1; i<poly.length; i++) {
                ds.ctx.lineTo(poly[i].x, poly[i].y);
            }
            if(p === ds.polygons.length - 1) {
                ds.ctx.lineTo(coords.x, coords.y);
            }
            else {
                ds.ctx.lineTo(poly[0].x, poly[0].y);
            }
            ds.ctx.fillStyle = "#77bbff22";
            ds.ctx.strokeStyle = "black";
            ds.ctx.stroke();
            ds.ctx.fill();
        }
        if(ds.snapLineX) {
            ds.ctx.strokeStyle = "#04F06A";
            ds.ctx.beginPath();
            ds.ctx.moveTo(ds.snapLineX, 0);
            ds.ctx.lineTo(ds.snapLineX, ds.canvas.height);
            ds.ctx.stroke();
        }
        if(ds.snapLineY) {
            ds.ctx.strokeStyle = "#FF445A";
            ds.ctx.beginPath();
            ds.ctx.moveTo(0, ds.snapLineY);
            ds.ctx.lineTo(ds.canvas.width, ds.snapLineY);
            ds.ctx.stroke();
        }
    }

    clickEventHandler(e) {
        const ds = this.drawState;
        const x = e.clientX - ds.canvas.parentElement.offsetLeft;
        const y = e.clientY - ds.canvas.parentElement.offsetTop;
        const target = e.target;
        const shiftKey = e.shiftKey;
        setTimeout(() => {
            if(ds.preventClick) {
                ds.preventClick = false;
                return;
            }
            const point = this.state.snapEnabled ? this.snapToClosestVertex(new Point(x, y)) : new Point(x, y);
            const coords = shiftKey ? this.getAxisAlignedCoord(ds.lastPoint, point, 45) : point;
            if(ds.lastPoint === null) {
                ds.polygons.push([]);
            }
            else if(ds.lastPoint.x === point.x && ds.lastPoint.y === point.y) {
                return;
            }
            ds.lastPoint = coords;
            ds.vertices.push(coords);
            ds.polygons[ds.polygons.length-1].push(coords);
            if(ds.moveListener === null) {
                target.addEventListener("mousemove", this.moveEventHandler);
                target.addEventListener("dblclick", this.doubleClickHandler);
                ds.moveListener = this.moveEventHandler;
                ds.dblClickListener = this.doubleClickHandler;
            }
        }, 100);
    }

    render() {
        return (
            <div className="mapEditView">
                {this.state.shouldRedirect ? <Redirect to="/" /> : null}
                <div className="titleBar">
                    <h1>Indoor Positioning Monitor</h1>
                </div>
                <div className="toolBar">
                    <div className="toolbar-left">
                        <div className="link-button backButton" onClick={this.goBack}>
                            <img src="back.png" alt="Back"/>
                        </div>
                        <div className="button-outline clearButton" onClick={this.clear}>Clear</div>
                        <Toggle
                            label="Snap"
                            on={this.state.snapEnabled}
                            onToggle={this.toggleSnap}
                            />
                    </div>
                    <div className="toolbar-right">
                        <div className="button saveButton" onClick={this.save}>Save</div>
                        <div className="link-button cancelButton" onClick={this.goBack}>Cancel</div>
                    </div>
                </div>
                <div className="contents">
                    <div className="mapContainer">
                        <img src="floorplan.jpg" alt="Floorplan" />
                        <canvas
                            className="mapEditCanvas"
                            onClick={this.clickEventHandler}
                            />
                    </div>
                </div>
            </div>
        );
    }
}

export default MapEditView;
