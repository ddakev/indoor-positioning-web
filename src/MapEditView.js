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

const EditMode = {
    DRAW: "DRAW",
    SELECT: "SELECT",
};

const SNAP_THRESHOLD = 8;

class MapEditView extends Component {
    constructor() {
        super();

        this.state = {
            shouldRedirect: false,
            snapEnabled: true,
            editMode: null,
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
            selectedVerts: [],
            hoverVert: null,
            mouseDown: false,
            dragged: false,
            dragSelectHandled: false,
            draggedVerts: [],
        };
        this.drawClickEventHandler = this.drawClickEventHandler.bind(this);
        this.drawMoveEventHandler = this.drawMoveEventHandler.bind(this);
        this.drawDoubleClickHandler = this.drawDoubleClickHandler.bind(this);
        this.selectMoveEventHandler = this.selectMoveEventHandler.bind(this);
        this.selectMouseDownEventHandler = this.selectMouseDownEventHandler.bind(this);
        this.selectMouseUpEventHandler = this.selectMouseUpEventHandler.bind(this);
        this.selectKeyDownEventHandler = this.selectKeyDownEventHandler.bind(this);
        this.goBack = this.goBack.bind(this);
        this.save = this.save.bind(this);
        this.clear = this.clear.bind(this);
        this.redraw = this.redraw.bind(this);
        this.drawVerts = this.drawVerts.bind(this);
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
        this.switchToMode(EditMode.DRAW);
    }

    componentWillUnmount() {
        this.switchToMode(null);
    }

    componentWillReceiveProps(newProps) {
        if(newProps.geofenceData !== this.props.geofenceData) {
            this.loadPolygons(newProps);
        }
    }

    clear() {
        this.drawState.polygons = [];
        this.drawState.vertices = [];
        this.redraw();
    }
    
    redraw() {
        console.log("redraw");
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
        if(this.state.editMode === EditMode.SELECT) {
            this.drawVerts();
        }
    }

    drawVerts() {
        const VERT_SIZE = 4;
        const ds = this.drawState;
        for(let i=0; i<ds.vertices.length; i++) {
            ds.ctx.strokeStyle = "#2480ff";
            if(ds.selectedVerts.indexOf(ds.vertices[i]) !== -1) {
                ds.ctx.fillStyle = "#2480ff";
            }
            else {
                ds.ctx.fillStyle = "#fff";
            }
            let size = VERT_SIZE;
            if(ds.hoverVert === ds.vertices[i]) {
                size = SNAP_THRESHOLD;
            }
            ds.ctx.fillRect(ds.vertices[i].x - size/2, ds.vertices[i].y - size/2, size, size);
            ds.ctx.strokeRect(ds.vertices[i].x - size/2, ds.vertices[i].y - size/2, size, size);
        }
    }

    loadPolygons(props) {
        const ds = this.drawState;
        const polys = [];
        for(let i=0; i<props.geofenceData.length; i++) {
            const source_poly = JSON.parse(JSON.stringify(props.geofenceData[i].vertices));
            polys.push([]);
            for(let j=0; j<source_poly.length; j++) {
                const newVert = new Point(source_poly[j].x * ds.canvas.offsetWidth, source_poly[j].y * ds.canvas.offsetHeight);
                polys[i].push(newVert);
                ds.vertices.push(newVert);
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
            if(ds.mouseDown && ds.selectedVerts.indexOf(verts[i]) !== -1) continue;
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

    drawDoubleClickHandler(e) {
        const ds = this.drawState;
        ds.preventClick = true;
        if(ds.lastPoint === null) {
            return;
        }
        ds.lastPoint = null;

        this.redraw();

        e.target.removeEventListener("mousemove", this.drawMoveEventHandler);
        e.target.removeEventListener("dblclick", this.drawDoubleClickHandler);
        ds.moveListener = null;
        ds.dblClickListener = null;
    }

    drawMoveEventHandler(e) {
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

    drawClickEventHandler(e) {
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
            else if(ds.lastPoint.x === coords.x && ds.lastPoint.y === coords.y) {
                return;
            }
            else if(coords.x === ds.polygons[ds.polygons.length-1][0].x && coords.y === ds.polygons[ds.polygons.length-1][0].y) {
                ds.lastPoint = null;
                this.redraw();
                e.target.removeEventListener("mousemove", this.drawMoveEventHandler);
                e.target.removeEventListener("dblclick", this.drawDoubleClickHandler);
                ds.moveListener = null;
                ds.dblClickListener = null;
                return;
            }

            ds.lastPoint = coords;
            ds.vertices.push(coords);
            ds.polygons[ds.polygons.length-1].push(coords);
            if(ds.moveListener === null) {
                target.addEventListener("mousemove", this.drawMoveEventHandler);
                target.addEventListener("dblclick", this.drawDoubleClickHandler);
                ds.moveListener = this.drawMoveEventHandler;
                ds.dblClickListener = this.drawDoubleClickHandler;
            }
        }, 100);
    }

    selectMoveEventHandler(e) {
        const ds = this.drawState;
        const x = e.clientX - ds.canvas.parentElement.offsetLeft;
        const y = e.clientY - ds.canvas.parentElement.offsetTop;
        let newHoverVert = null;
        if(!ds.mouseDown) {
            let hoverMinDist = SNAP_THRESHOLD * SNAP_THRESHOLD;
            for(let i=0; i<ds.vertices.length; i++) {
                const dx = Math.abs(ds.vertices[i].x - x);
                const dy = Math.abs(ds.vertices[i].y - y);
                if(dx < SNAP_THRESHOLD && dy < SNAP_THRESHOLD) {
                    if(dx * dx + dy * dy < hoverMinDist) {
                        hoverMinDist = dx * dx + dy * dy;
                        newHoverVert = ds.vertices[i];
                    }
                }
            }
            if(ds.hoverVert !== newHoverVert) {
                ds.hoverVert = newHoverVert;
                this.redraw();
            }
        }
        else {
            ds.dragged = true;
            const point = this.state.snapEnabled ? this.snapToClosestVertex(new Point(x, y)) : new Point(x, y);
            const coords = e.shiftKey ? this.getAxisAlignedCoord(ds.lastPoint, point, 45) : point;
            for(let i=0; i<ds.selectedVerts.length; i++) {
                ds.selectedVerts[i].x = ds.draggedVerts[i].x + coords.x - ds.lastPoint.x;
                ds.selectedVerts[i].y = ds.draggedVerts[i].y + coords.y - ds.lastPoint.y;
            }
            this.redraw();
            if(ds.draggedVerts.length > 0) {
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
        }
    }

    selectMouseDownEventHandler(e) {
        const ds = this.drawState;
        const x = e.clientX - ds.canvas.parentElement.offsetLeft;
        const y = e.clientY - ds.canvas.parentElement.offsetTop;
        if(ds.hoverVert) {
            if(ds.selectedVerts.indexOf(ds.hoverVert) === -1) {
                if(!e.shiftKey && !e.ctrlKey) {
                    ds.selectedVerts = [ds.hoverVert];
                }
                else {
                    ds.selectedVerts.push(ds.hoverVert);
                }
                ds.dragSelectHandled = true;
            }
            else {
                ds.dragSelectHandled = false;
            }
        }
        else {
            let selectedPoly = false;
            for(let i=ds.polygons.length-1; i>=0; i--) {
                if(this.isPointInsidePolygon(new Point(x, y), ds.polygons[i])) {
                    if(!e.shiftKey && !e.ctrlKey) {
                        ds.selectedVerts = ds.polygons[i];
                    }
                    else {
                        ds.selectedVerts = ds.selectedVerts.concat(ds.polygons[i]);
                    }
                    selectedPoly = true;
                    break;
                }
            }
            if(!selectedPoly && !e.shiftKey && !e.ctrlKey) {
                ds.selectedVerts = [];
            }
        }
        this.redraw();
        ds.mouseDown = true;
        ds.dragged = false;
        ds.lastPoint = ds.hoverVert ? {x: ds.hoverVert.x, y: ds.hoverVert.y} : new Point(x, y);
        ds.draggedVerts = JSON.parse(JSON.stringify(ds.selectedVerts));
    }

    selectMouseUpEventHandler(e) {
        const ds = this.drawState;
        if(!ds.dragged && !ds.dragSelectHandled && ds.hoverVert) {
            if(!e.shiftKey && !e.ctrlKey) {
                ds.selectedVerts = [ds.hoverVert];
            }
            else {
                ds.selectedVerts.splice(ds.selectedVerts.indexOf(ds.hoverVert), 1);
            }
        }
        this.redraw();
        ds.mouseDown = false;
        ds.lastPoint = null;
        ds.draggedVerts = [];
    }

    selectKeyDownEventHandler(e) {
        if(e.keyCode === 46) {
            // Delete pressed
            const ds = this.drawState;
            for(let i=ds.selectedVerts.length-1; i>=0; i--) {
                for(let p=0; p<ds.polygons.length; p++) {
                    const vertPos = ds.polygons[p].indexOf(ds.selectedVerts[i]);
                    if(vertPos !== -1) {
                        ds.polygons[p].splice(vertPos, 1);
                        if(ds.polygons[p].length === 0) {
                            ds.polygons.splice(p, 1);
                        }
                        break;
                    }
                }
                ds.vertices.splice(ds.vertices.indexOf(ds.selectedVerts[i]), 1);
            }
            ds.selectedVerts = [];
            this.redraw();
        }
    }

    isPointInsidePolygon(point, poly) {
        let countIntersects = 0;
        for(let i=0; i<poly.length; i++) {
            const vert1 = poly[i];
            const vert2 = poly[(i+1) % poly.length];
            if(Math.sign(vert1.y - point.y) === Math.sign(point.y - vert2.y)) {
                if(vert1.y !== vert2.y) {
                    const xint = (point.y - vert1.y) * (vert2.x - vert1.x) / (vert2.y - vert1.y) + vert1.x;
                    if(xint < point.x) {
                        countIntersects ++;
                    }
                }
                else {
                    if(vert1.x < point.x || vert2.x < point.x) {
                        countIntersects ++;
                    }
                }
            }
        }
        return countIntersects % 2 === 1;
    }

    switchToMode(newEditMode) {
        if(newEditMode === this.state.editMode) return;
        const ds = this.drawState;
        const canvas = ds.canvas;
        switch(this.state.editMode) {
            case EditMode.DRAW:
                canvas.removeEventListener("click", this.drawClickEventHandler);
                canvas.removeEventListener("mousemove", this.drawMoveEventHandler);
                canvas.removeEventListener("dblclick", this.drawDoubleClickHandler);
                ds.moveListener = null;
                ds.dblClickListener = null;
                ds.lastPoint = null;
                break;
            case EditMode.SELECT:
                canvas.removeEventListener("mousemove", this.selectMoveEventHandler);
                canvas.removeEventListener("mousedown", this.selectMouseDownEventHandler);
                canvas.removeEventListener("mouseup", this.selectMouseUpEventHandler);
                canvas.removeEventListener("keydown", this.selectKeyDownEventHandler);
                break;
            default:
                break;
        }
        this.setState({editMode: newEditMode});
        switch(newEditMode) {
            case EditMode.DRAW:
                canvas.addEventListener("click", this.drawClickEventHandler);
                break;
            case EditMode.SELECT:
                canvas.addEventListener("mousemove", this.selectMoveEventHandler);
                canvas.addEventListener("mousedown", this.selectMouseDownEventHandler);
                canvas.addEventListener("mouseup", this.selectMouseUpEventHandler);
                canvas.addEventListener("keydown", this.selectKeyDownEventHandler);
                break;
            default:
                break;
        }
        setTimeout(() => this.redraw(), 1);
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
                    <div className="toolbox">
                        <div
                            className={"button-toolbox" + (this.state.editMode === EditMode.SELECT ? " selected" : "")}
                            onClick={() => this.switchToMode(EditMode.SELECT)}
                            >
                            <img src="select.png" alt="Select" />
                            Select
                        </div>
                        <div
                            className={"button-toolbox" + (this.state.editMode === EditMode.DRAW ? " selected" : "")}
                            onClick={() => this.switchToMode(EditMode.DRAW)}
                            >
                            <img src="draw.svg" alt="Draw" />
                            Draw
                        </div>
                        <div className="toolbox-divider" />
                        <div
                            className="button-toolbox"
                            onClick={this.clear}
                            >
                            <img src="clear.png" alt="Clear" />
                            Clear
                        </div>
                    </div>
                    <div className="mapContainer">
                        <img src="floorplan.jpg" alt="Floorplan" />
                        <canvas
                            className={"mapEditCanvas" + (this.state.editMode === EditMode.DRAW ? " draw" : " select")}
                            tabIndex="-1"
                            />
                    </div>
                </div>
            </div>
        );
    }
}

export default MapEditView;
