import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';
import './MapEditView.css';
import config from './config.js';
import Toggle from './Toggle.js';
import RouterInputForm from './RouterInputForm';
import ScaleInputForm from './ScaleInputForm';

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

const EditMode = {
    DRAW: "DRAW",
    SELECT: "SELECT",
    ROUTERS: "ROUTERS",
    COLLECT: "COLLECT",
    SCALE: "SCALE",
};

const SNAP_THRESHOLD = 8;

class MapEditView extends Component {
    constructor() {
        super();

        this.state = {
            shouldRedirect: false,
            snapEnabled: true,
            editMode: null,
            floorplanUpload: null,
            routerInputVisible: false,
            routerInputX: 0,
            routerInputY: 0,
            routerInputWidth: 0,
            routerInputHeight: 0,
            routerInputBssid: '',
            routerInputSsid: '',
            selectedRouter: null,
            scaleInputVisible: false,
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
            routersPositions: [],
            collectedSamples: [],
            messageTimeout: null,
            scaleSegment: [],
            scaleX: 1,
            scaleY: 1,
        };
        this.drawClickEventHandler = this.drawClickEventHandler.bind(this);
        this.drawMoveEventHandler = this.drawMoveEventHandler.bind(this);
        this.drawDoubleClickHandler = this.drawDoubleClickHandler.bind(this);
        this.selectMoveEventHandler = this.selectMoveEventHandler.bind(this);
        this.selectMouseDownEventHandler = this.selectMouseDownEventHandler.bind(this);
        this.selectMouseUpEventHandler = this.selectMouseUpEventHandler.bind(this);
        this.selectKeyDownEventHandler = this.selectKeyDownEventHandler.bind(this);
        this.routersMoveEventHandler = this.routersMoveEventHandler.bind(this);
        this.routersClickEventHandler = this.routersClickEventHandler.bind(this);
        this.collectClickEventHandler = this.collectClickEventHandler.bind(this);
        this.scaleMouseDownEventHandler = this.scaleMouseDownEventHandler.bind(this);
        this.scaleMouseMoveEventHandler = this.scaleMouseMoveEventHandler.bind(this);
        this.scaleMouseUpEventHandler = this.scaleMouseUpEventHandler.bind(this);
        this.saveRouterInfo = this.saveRouterInfo.bind(this);
        this.cancelRouterInfo = this.cancelRouterInfo.bind(this);
        this.saveScale = this.saveScale.bind(this);
        this.cancelScale = this.cancelScale.bind(this);
        this.updateFloorplan = this.updateFloorplan.bind(this);
        this.importFloorplan = this.importFloorplan.bind(this);
        this.goBack = this.goBack.bind(this);
        this.save = this.save.bind(this);
        this.clear = this.clear.bind(this);
        this.redraw = this.redraw.bind(this);
        this.drawVerts = this.drawVerts.bind(this);
        this.loadPolygons = this.loadPolygons.bind(this);
        this.loadFloorplan = this.loadFloorplan.bind(this);
        this.loadRouters = this.loadRouters.bind(this);
        this.loadTraining = this.loadTraining.bind(this);
        this.toggleSnap = this.toggleSnap.bind(this);
        this.windowResize = this.windowResize.bind(this);
    }

    goBack() {
        this.setState({shouldRedirect: true});
    }

    save() {
        if(this.drawState.scaleSegment.length !== 2) {
            this.showMessage("You need to set a scale", 5000);
            return;
        }
        let updatePromise = null;
        if(this.drawState.polygons.length > 0) {
            const geofences = {"boundaries": this.drawState.polygons.map(poly => {
                return {
                    "vertices": poly.map(vert => {return {x: vert.x / this.drawState.canvas.offsetWidth, y: vert.y / this.drawState.canvas.offsetHeight};}),
                    "safetyLevel": "danger"
                };
            })};
            updatePromise = new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.onreadystatechange = () => {
                    if(xhr.readyState === 4) {
                        if(xhr.status === 200 || xhr.status === 201) {
                            resolve();
                        }
                        else {
                            const response = JSON.parse(xhr.responseText);
                            if(xhr.status === 404 && response.hasOwnProperty("message") && response["message"] === "No geofence in database") {
                                const addxhr = new XMLHttpRequest();
                                addxhr.onreadystatechange = () => {
                                    if(addxhr.readyState === 4) {
                                        if(addxhr.status === 200 || addxhr.status === 201) {
                                            resolve();
                                        }
                                        else {
                                            reject(addxhr.responseText);
                                        }
                                    }
                                };
                                addxhr.open('POST', config.api + "/geofence/add");
                                addxhr.setRequestHeader("Content-Type", "application/json");
                                addxhr.send(JSON.stringify(geofences));
                            }
                            else {
                                reject(xhr.responseText);
                            }
                        }
                    }
                };
                xhr.open('PUT', config.api + "/geofence/update");
                xhr.setRequestHeader("Content-Type", "application/json");
                xhr.send(JSON.stringify(geofences));
            });
        }
        else {
            updatePromise = new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.onreadystatechange = () => {
                    if(xhr.readyState === 4) {
                        const response = JSON.parse(xhr.responseText);
                        if(xhr.status === 200 || xhr.status === 201 ||
                            (xhr.status === 404 && response.hasOwnProperty("message") && response["message"] === "Could not find geofence")) {
                            resolve();
                        }
                        else {
                            console.log(xhr.responseText);
                            resolve();
                        }
                    }
                };
                xhr.open('DELETE', config.api + "/geofence/delete");
                xhr.send();
            });
        }
        const fileUpload = this.importFloorplan();
        // update routers
        const routerPromise = new Promise((resolve, reject) => {
            const deletePromises = [];
            for(let i=0; i<this.props.routers.length; i++) {
                deletePromises.push(new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.onreadystatechange = () => {
                        if(xhr.readyState === 4) {
                            if(xhr.status === 200) {
                                resolve();
                            }
                            else {
                                reject(xhr.responseText);
                            }
                        }
                    };
                    xhr.open('DELETE', config.api + "/router/delete/" + this.props.routers[i]["_id"]);
                    xhr.send();
                }));
            }
            Promise.all(deletePromises).then(() => {
                const addPromises = [];
                for(let i=0; i<this.drawState.routersPositions.length; i++) {
                    addPromises.push(new Promise((resolve, reject) => {
                        const xhr = new XMLHttpRequest();
                        xhr.onreadystatechange = () => {
                            if(xhr.readyState === 4) {
                                if(xhr.status === 200 || xhr.status === 201) {
                                    resolve();
                                }
                                else {
                                    reject(xhr.responseText);
                                }
                            }
                        };
                        xhr.open('POST', config.api + "/router/add");
                        xhr.setRequestHeader("Content-type", "application/json");
                        xhr.send(JSON.stringify({
                            x: this.drawState.routersPositions[i].x / this.drawState.canvas.offsetWidth,
                            y: this.drawState.routersPositions[i].y / this.drawState.canvas.offsetHeight,
                            ssid: this.drawState.routersPositions[i].ssid,
                            bssid: this.drawState.routersPositions[i].bssid,
                        }));
                    }));
                }
                Promise.all(addPromises).then(resolve).catch(reject);
            }).catch(reject);
        });

        Promise.all([updatePromise, fileUpload, routerPromise]).then(() => {
            this.props.updateFloorplan();
            this.goBack();
        });
    }

    windowResize(e) {
        const ds = this.drawState;
        const image = document.getElementById("floorplan");
        setTimeout(() => {
            ds.canvas.height = image.offsetHeight;
            ds.canvas.width = image.offsetWidth;
            this.setState({
                routerInputWidth: ds.canvas.width,
                routerInputHeight: ds.canvas.height
            });
        }, 10);
        this.loadPolygons(this.props);
        this.loadRouters(this.props);
        this.loadTraining(this.props);
    }

    toggleSnap() {
        this.setState({snapEnabled: !this.state.snapEnabled});
    }

    componentDidMount() {
        this.drawState.canvas = document.getElementsByClassName("mapEditCanvas")[0];
        setTimeout(() => {
            this.drawState.canvas.height = this.drawState.canvas.offsetHeight;
            this.drawState.canvas.width = this.drawState.canvas.offsetWidth;
            this.setState({
                routerInputWidth: this.drawState.canvas.width,
                routerInputHeight: this.drawState.canvas.height
            });
        }, 10);
        this.drawState.ctx = this.drawState.canvas.getContext('2d');
        this.loadPolygons(this.props);
        this.loadFloorplan(this.props);
        this.loadRouters(this.props);
        this.loadTraining(this.props);
        this.switchToMode(EditMode.DRAW);
        window.addEventListener("resize", this.windowResize);
    }

    componentWillUnmount() {
        this.switchToMode(null);
        clearTimeout(this.drawState.messageTimeout);
        this.drawState.messageTimeout = null;
        window.removeEventListener("resize", this.windowResize);
    }

    componentWillReceiveProps(newProps) {
        if(newProps.geofenceData !== this.props.geofenceData) {
            this.loadPolygons(newProps);
        }
        if(newProps.floorplan !== this.props.floorplan) {
            this.loadFloorplan(newProps);
        }
        if(newProps.routers !== this.props.routers) {
            this.loadRouters(newProps);
        }
        if(newProps.trainingData !== this.props.trainingData) {
            this.loadTraining(newProps);
        }
    }

    updateFloorplan() {
        const floorplan = document.getElementById("floorplan");
        const fu = document.getElementById("importFloorplan");
        if(fu.files.length === 1) {
            this.setState({floorplanUpload: fu.files[0]});
            floorplan.setAttribute('src', URL.createObjectURL(fu.files[0]));
            floorplan.onload = () => {
                const ds = this.drawState;
                ds.canvas.height = floorplan.offsetHeight;
                ds.canvas.width = floorplan.offsetWidth;
                this.setState({
                    routerInputWidth: this.drawState.canvas.width,
                    routerInputHeight: this.drawState.canvas.height
                });
                this.drawState.polygons = [];
                this.drawState.vertices = [];
                this.drawState.routersPositions = [];
                this.drawState.collectedSamples = [];
                this.selectedVerts = [];
                this.hoverVert = null;
                this.redraw();
            };
        }
    }
    
    importFloorplan() {
        if(!this.state.floorplanUpload && this.drawState.scaleX === this.props.floorplan.xScale && this.drawState.scaleY === this.props.floorplan.yScale) return new Promise(resolve => resolve());
        let fd = new FormData();
        if(this.state.floorplanUpload) {
            fd.append("floorplan", this.state.floorplanUpload);
        }
        fd.append("xScale", this.drawState.scaleX);
        fd.append("yScale", this.drawState.scaleY);
        const fileUpload = new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.onreadystatechange = () => {
                if(xhr.readyState === 4) {
                    if(xhr.status === 200 || xhr.status === 201) {
                        resolve(JSON.parse(xhr.responseText));
                    }
                    else {
                        const response = JSON.parse(xhr.responseText);
                        if(xhr.status === 404 && response.hasOwnProperty("message") && response["message"] === "No floorplan in database") {
                            const addxhr = new XMLHttpRequest();
                            addxhr.onreadystatechange = () => {
                                if(addxhr.readyState === 4) {
                                    if(addxhr.status === 200 || addxhr.status === 201) {
                                        resolve(JSON.parse(addxhr.responseText));
                                    }
                                    else {
                                        reject(addxhr.responseText);
                                    }
                                }
                            };
                            xhr.open('POST', config.api + "/floorplan/add");
                            xhr.send(fd);
                        }
                        else {
                            reject(xhr.responseText);
                        }
                    }
                }
            };
            xhr.open('PUT', config.api + "/floorplan/update");
            xhr.send(fd);
        });
        fileUpload.then(() => {
            this.props.updateFloorplan();
        });
        return fileUpload;
    }

    clear() {
        this.drawState.polygons = [];
        this.drawState.vertices = [];
        this.drawState.routersPositions = [];
        this.drawState.collectedSamples = [];
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
        for(let c=0; c<ds.collectedSamples.length; c++) {
            let CIRC_SIZE = 4;
            ds.ctx.beginPath();
            ds.ctx.arc(ds.collectedSamples[c].x, ds.collectedSamples[c].y, CIRC_SIZE/2, 0, 2*Math.PI);
            ds.ctx.fillStyle = "black";
            ds.ctx.fill();
        }
        if(this.state.editMode === EditMode.SELECT) {
            this.drawVerts();
        }
        else {
            for(let r=0; r<ds.routersPositions.length; r++) {
                let CIRC_SIZE = 6;
                if(ds.hoverVert === ds.routersPositions[r]) {
                    CIRC_SIZE = 8;
                }
                ds.ctx.beginPath();
                ds.ctx.arc(ds.routersPositions[r].x, ds.routersPositions[r].y, CIRC_SIZE/2, 0, 2*Math.PI);
                if(this.state.editMode === EditMode.DRAW) {
                    ds.ctx.fillStyle = "#B6465F44";
                }
                else {
                    ds.ctx.fillStyle = "#B6465F";
                }
                ds.ctx.fill();
            }
        }
        if(this.state.editMode === EditMode.SCALE && ds.scaleSegment.length === 2) {
            ds.ctx.beginPath();
            ds.ctx.moveTo(ds.scaleSegment[0].x, ds.scaleSegment[0].y);
            ds.ctx.lineTo(ds.scaleSegment[1].x, ds.scaleSegment[1].y);
            ds.ctx.strokeStyle = "#000";
            ds.ctx.stroke();
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
        for(let r=0; r<ds.routersPositions.length; r++) {
            ds.ctx.strokeStyle = "#B6465F";
            if(ds.selectedVerts.indexOf(ds.routersPositions[r]) !== -1) {
                ds.ctx.fillStyle = "#B6465F";
            }
            else {
                ds.ctx.fillStyle = "#fff";
            }
            let size = VERT_SIZE;
            if(ds.hoverVert === ds.routersPositions[r]) {
                size = SNAP_THRESHOLD;
            }
            ds.ctx.beginPath();
            ds.ctx.arc(ds.routersPositions[r].x, ds.routersPositions[r].y, size/2, 0, 2*Math.PI);
            ds.ctx.fill();
            ds.ctx.stroke();
        }
    }

    loadPolygons(props) {
        const ds = this.drawState;
        const polys = [];
        if(props.geofenceData === null) {
            ds.polygons = polys;
            return;
        }
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

    loadFloorplan(props) {
        if(!props.floorplan) return;
        const floorplan = document.getElementById("floorplan");
        floorplan.setAttribute('src', props.floorplan.imgData);
        floorplan.onload = () => {
            const ds = this.drawState;
            ds.canvas.height = floorplan.offsetHeight;
            ds.canvas.width = floorplan.offsetWidth;
            ds.scaleX = this.props.floorplan.xScale;
            ds.scaleY = this.props.floorplan.yScale;
            this.setState({
                routerInputWidth: this.drawState.canvas.width,
                routerInputHeight: this.drawState.canvas.height
            });
            this.drawState.polygons = [];
            this.drawState.vertices = [];
            this.drawState.routersPositions = [];
            this.drawState.collectedSamples = [];
            this.selectedVerts = [];
            this.hoverVert = null;
            this.loadPolygons(props);
            this.loadRouters(props);
            this.loadTraining(props);
        };
    }

    loadRouters(props) {
        const ds = this.drawState;
        ds.routersPositions = JSON.parse(JSON.stringify(props.routers));
        ds.routersPositions = ds.routersPositions.map(router => {
            return {
                bssid: router.bssid,
                ssid: router.ssid,
                x: router.x * ds.canvas.offsetWidth,
                y: router.y * ds.canvas.offsetHeight,
            };
        });
    }

    loadTraining(props) {
        const ds = this.drawState;
        ds.collectedSamples = JSON.parse(JSON.stringify(props.trainingData)).map(sample => {return {
            x: sample.x * ds.canvas.offsetWidth,
            y: sample.y * ds.canvas.offsetHeight,
            wifiScan: sample.wifiScan,
        };});
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
        const x = e.clientX - ds.canvas.offsetLeft - ds.canvas.parentElement.offsetLeft;
        const y = e.clientY - ds.canvas.offsetTop - ds.canvas.parentElement.offsetTop;
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
        for(let r=0; r<ds.routersPositions.length; r++) {
            const CIRC_SIZE = 6;
            ds.ctx.beginPath();
            ds.ctx.arc(ds.routersPositions[r].x, ds.routersPositions[r].y, CIRC_SIZE/2, 0, 2*Math.PI);
            if(this.state.editMode === EditMode.DRAW) {
                ds.ctx.fillStyle = "#B6465F44";
            }
            else {
                ds.ctx.fillStyle = "#B6465F";
            }
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
        const x = e.clientX - ds.canvas.offsetLeft - ds.canvas.parentElement.offsetLeft;
        const y = e.clientY - ds.canvas.offsetTop - ds.canvas.parentElement.offsetTop;
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
        const x = e.clientX - ds.canvas.offsetLeft - ds.canvas.parentElement.offsetLeft;
        const y = e.clientY - ds.canvas.offsetTop - ds.canvas.parentElement.offsetTop;
        let newHoverVert = null;
        if(!ds.mouseDown) {
            let hoverMinDist = SNAP_THRESHOLD * SNAP_THRESHOLD;
            const verts = ds.vertices.concat(ds.routersPositions);
            for(let i=0; i<verts.length; i++) {
                const dx = Math.abs(verts[i].x - x);
                const dy = Math.abs(verts[i].y - y);
                if(dx < SNAP_THRESHOLD && dy < SNAP_THRESHOLD) {
                    if(dx * dx + dy * dy < hoverMinDist) {
                        hoverMinDist = dx * dx + dy * dy;
                        newHoverVert = verts[i];
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
        const x = e.clientX - ds.canvas.offsetLeft - ds.canvas.parentElement.offsetLeft;
        const y = e.clientY - ds.canvas.offsetTop - ds.canvas.parentElement.offsetTop;
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
            console.log(ds.selectedVerts);
            for(let i=ds.selectedVerts.length-1; i>=0; i--) {
                if(ds.vertices.indexOf(ds.selectedVerts[i]) > -1) {
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
                else {
                    ds.routersPositions.splice(ds.routersPositions.indexOf(ds.selectedVerts[i]), 1);
                }
            }
            ds.selectedVerts = [];
            this.redraw();
        }
    }

    routersMoveEventHandler(e) {
        const ds = this.drawState;
        const x = e.clientX - ds.canvas.offsetLeft - ds.canvas.parentElement.offsetLeft;
        const y = e.clientY - ds.canvas.offsetTop - ds.canvas.parentElement.offsetTop;
        const point = this.state.snapEnabled ? this.snapToClosestVertex(new Point(x, y)) : new Point(x, y);
        const coords = e.shiftKey ? this.getAxisAlignedCoord(ds.lastPoint, point, 45) : point;
        let hovering = false;
        for(let i=0; i<ds.routersPositions.length; i++) {
            if(Math.abs(ds.routersPositions[i].x - coords.x) < SNAP_THRESHOLD &&
                Math.abs(ds.routersPositions[i].y - coords.y) < SNAP_THRESHOLD) {
                    ds.hoverVert = ds.routersPositions[i];
                    hovering = true;
                    break;
                }
        }
        this.redraw();
        if(hovering) return;
        ds.hoverVert = null;
        const CIRC_SIZE = 6;
        ds.ctx.beginPath();
        ds.ctx.arc(coords.x, coords.y, CIRC_SIZE/2, 0, 2*Math.PI);
        ds.ctx.fillStyle = "#B6465F";
        ds.ctx.fill();
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

    routersClickEventHandler(e) {
        const ds = this.drawState;
        const x = e.clientX - ds.canvas.offsetLeft - ds.canvas.parentElement.offsetLeft;
        const y = e.clientY - ds.canvas.offsetTop - ds.canvas.parentElement.offsetTop;
        const point = this.state.snapEnabled ? this.snapToClosestVertex(new Point(x, y)) : new Point(x, y);
        const coords = e.shiftKey ? this.getAxisAlignedCoord(ds.lastPoint, point, 45) : point;
        let clickedRouter = null;
        for(let i=0; i<ds.routersPositions.length; i++) {
            if(Math.abs(ds.routersPositions[i].x - coords.x) < SNAP_THRESHOLD &&
                Math.abs(ds.routersPositions[i].y - coords.y) < SNAP_THRESHOLD) {
                    clickedRouter = i;
                    break;
                }
        }
        if(clickedRouter === null) {
            ds.routersPositions.push({
                x: coords.x,
                y: coords.y,
                ssid: '',
                bssid: '',
            });
            this.redraw();
            this.setState({
                routerInputVisible: true,
                routerInputX: coords.x + ds.canvas.offsetLeft,
                routerInputY: coords.y + ds.canvas.offsetTop,
                selectedRouter: ds.routersPositions.length-1,
                routerInputBssid: ds.routersPositions[ds.routersPositions.length-1].bssid,
                routerInputSsid: ds.routersPositions[ds.routersPositions.length-1].ssid,
            });
            document.getElementById("ssid").focus();
        }
        else {
            this.setState({
                routerInputVisible: true,
                routerInputX: ds.routersPositions[clickedRouter].x + ds.canvas.offsetLeft,
                routerInputY: ds.routersPositions[clickedRouter].y + ds.canvas.offsetTop,
                selectedRouter: clickedRouter,
                routerInputBssid: ds.routersPositions[clickedRouter].bssid,
                routerInputSsid: ds.routersPositions[clickedRouter].ssid,
            });
            document.getElementById("ssid").focus();
        }
    }

    collectClickEventHandler(e) {
        const ds = this.drawState;
        const x = e.clientX - ds.canvas.offsetLeft - ds.canvas.parentElement.offsetLeft;
        const y = e.clientY - ds.canvas.offsetTop - ds.canvas.parentElement.offsetTop;
        
        this.showMessage("Collecting Data", 10000);
        new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.onreadystatechange = () => {
                if(xhr.readyState === 4) {
                    if(xhr.status === 200 || xhr.status === 201) {
                        resolve();
                    }
                    else {
                        reject(xhr.responseText);
                    }
                }
            };
            xhr.open('POST', config.api + "/training/add/label");
            xhr.setRequestHeader("Content-type", "application/json");
            xhr.send(JSON.stringify({x: x, y: y}));
        }).then(() => {
            this.showMessage("Data collected.", 1000);
            ds.collectedSamples.push({
                x: x,
                y: y,
                wifiScan: null,
            });
        }).catch(err => {
            this.showMessage(err, 5000);
        });
        
        this.redraw();
    }

    scaleMouseDownEventHandler(e) {
        const ds = this.drawState;
        const x = e.clientX - ds.canvas.offsetLeft - ds.canvas.parentElement.offsetLeft;
        const y = e.clientY - ds.canvas.offsetTop - ds.canvas.parentElement.offsetTop;
        
        ds.scaleSegment = [{x, y}];
    }

    scaleMouseMoveEventHandler(e) {
        const ds = this.drawState;
        const x = e.clientX - ds.canvas.offsetLeft - ds.canvas.parentElement.offsetLeft;
        const y = e.clientY - ds.canvas.offsetTop - ds.canvas.parentElement.offsetTop;

        if(ds.scaleSegment.length === 1) {
            this.redraw();
            ds.ctx.beginPath();
            ds.ctx.moveTo(ds.scaleSegment[0].x, ds.scaleSegment[0].y);
            ds.ctx.lineTo(x, y);
            ds.ctx.strokeStyle = "#000";
            ds.ctx.stroke();
        }
    }

    scaleMouseUpEventHandler(e) {
        const ds = this.drawState;
        const x = e.clientX - ds.canvas.offsetLeft - ds.canvas.parentElement.offsetLeft;
        const y = e.clientY - ds.canvas.offsetTop - ds.canvas.parentElement.offsetTop;

        if(ds.scaleSegment.length === 1) {
            ds.scaleSegment.push({x, y});
            this.setState({
                scaleInputVisible: true,
                routerInputX: x + ds.canvas.offsetLeft,
                routerInputY: y + ds.canvas.offsetTop,
                selectedRouter: ds.routersPositions.length-1,
            });
            document.getElementById("scale").focus();
        }
    }

    showMessage(msg, duration) {
        const messageBox = document.getElementsByClassName("message")[0];
        if(!messageBox) return;
        messageBox.textContent = msg;
        messageBox.className = "message";
        if(this.drawState.messageTimeout) {
            clearTimeout(this.drawState.messageTimeout);
        }
        this.drawState.messageTimeout = setTimeout(() => {
            messageBox.className = "message hidden";
            this.drawState.messageTimeout = null;
        }, duration);
    }

    saveRouterInfo(data) {
        const ds = this.drawState;
        const id = this.state.selectedRouter;
        for(let prop in data) {
            if(data.hasOwnProperty(prop)) {
                ds.routersPositions[id][prop] = data[prop];
            }
        }

        this.setState({
            routerInputVisible: false,
            selectedRouter: null,
        });
    }

    cancelRouterInfo() {
        const ds = this.drawState;
        const id = this.state.selectedRouter;
        if(!ds.routersPositions[id]["ssid"] || !ds.routersPositions[id]["bssid"]) {
            ds.routersPositions.splice(id, 1);
            this.redraw();
        }

        this.setState({
            routerInputVisible: false,
            selectedRouter: null,
        });
    }

    saveScale(data) {
        const ds = this.drawState;
        const pixelLength = Math.sqrt((ds.scaleSegment[0].x - ds.scaleSegment[1].x) ** 2 + (ds.scaleSegment[0].y - ds.scaleSegment[1].y) ** 2);
        const pixelScale = data.scale / pixelLength; // in meters per pixel
        ds.scaleX = pixelScale * ds.canvas.offsetWidth; // in meters per width
        ds.scaleY = pixelScale * ds.canvas.offsetHeight; // in meters per height
        console.log(ds.scaleX, ds.scaleY);
        this.setState({
            scaleInputVisible: false,
        });
    }

    cancelScale() {
        const ds = this.drawState;
        ds.scaleSegment = [];
        this.redraw();
        this.setState({
            scaleInputVisible: false,
        });
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
            case EditMode.ROUTERS:
                canvas.removeEventListener("mousemove", this.routersMoveEventHandler);
                canvas.removeEventListener("click", this.routersClickEventHandler);
                break;
            case EditMode.COLLECT:
                canvas.removeEventListener("click", this.collectClickEventHandler);
                break;
            case EditMode.SCALE:
                canvas.removeEventListener("mousedown", this.scaleMouseDownEventHandler);
                canvas.removeEventListener("mousemove", this.scaleMouseMoveEventHandler);
                canvas.removeEventListener("mouseup", this.scaleMouseUpEventHandler);
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
            case EditMode.ROUTERS:
                canvas.addEventListener("mousemove", this.routersMoveEventHandler);
                canvas.addEventListener("click", this.routersClickEventHandler);
                break;
            case EditMode.COLLECT:
                canvas.addEventListener("click", this.collectClickEventHandler);
                break;
            case EditMode.SCALE:
                canvas.addEventListener("mousedown", this.scaleMouseDownEventHandler);
                canvas.addEventListener("mousemove", this.scaleMouseMoveEventHandler);
                canvas.addEventListener("mouseup", this.scaleMouseUpEventHandler);
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
                <div className="message hidden">
                    Error Message
                </div>
                <div className="titleBar">
                    <h1>Indoor Positioning Monitor</h1>
                </div>
                <div className="toolBar">
                    <div className="toolbar-left">
                        <div className="link-button backButton" onClick={this.goBack}>
                            <img src="back.png" alt="Back"/>
                        </div>
                        <input
                            type="file"
                            id="importFloorplan"
                            className="hidden"
                            accept=".png, .jpg, .jpeg"
                            onChange={this.updateFloorplan}
                            />
                        <label
                            htmlFor="importFloorplan"
                            className="button-outline importButton"
                            >
                            <img src="upload.svg" alt="Draw" />
                            Import
                        </label>
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
                        <div
                            className={"button-toolbox" + (this.state.editMode === EditMode.ROUTERS ? " selected" : "")}
                            onClick={() => this.switchToMode(EditMode.ROUTERS)}
                            >
                            <img src="routers.svg" alt="Routers" />
                            Routers
                        </div>
                        <div
                            className={"button-toolbox" + (this.state.editMode === EditMode.COLLECT ? " selected" : "")}
                            onClick={() => this.switchToMode(EditMode.COLLECT)}
                            >
                            Train
                        </div>
                        <div
                            className={"button-toolbox" + (this.state.editMode === EditMode.SCALE ? " selected" : "")}
                            onClick={() => this.switchToMode(EditMode.SCALE)}
                            >
                            Set Scale
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
                        <img src={this.props.floorplan !== null ? this.props.floorplan.imgData : null} id="floorplan" alt="Floorplan" />
                        <canvas
                            className={"mapEditCanvas" + (this.state.editMode === EditMode.DRAW ? " draw" : " select")}
                            tabIndex="-1"
                            />
                        <RouterInputForm
                            x={this.state.routerInputX}
                            y={this.state.routerInputY}
                            width={this.state.routerInputWidth}
                            height={this.state.routerInputHeight}
                            visible={this.state.routerInputVisible}
                            ssid={this.state.routerInputSsid}
                            bssid={this.state.routerInputBssid}
                            save={this.saveRouterInfo}
                            cancel={this.cancelRouterInfo}
                            />
                        <ScaleInputForm
                            x={this.state.routerInputX}
                            y={this.state.routerInputY}
                            width={this.state.routerInputWidth}
                            height={this.state.routerInputHeight}
                            visible={this.state.scaleInputVisible}
                            save={this.saveScale}
                            cancel={this.cancelScale}
                            />
                    </div>
                    {
                        this.props.floorplan === null && this.state.floorplanUpload === null ?
                        <div className="mapPlaceholder">
                            <img src="map-missing.svg" alt="map-missing" />
                            You haven't uploaded a floorplan yet.
                            <label htmlFor="importFloorplan" className="button">Upload Floorplan</label>
                        </div>
                        : null
                    }
                </div>
            </div>
        );
    }
}

export default MapEditView;
