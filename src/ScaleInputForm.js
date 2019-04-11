import React, { Component } from 'react';
import './ScaleInputForm.css';
import TextInput from './TextInput.js';

class ScaleInputForm extends Component {
    constructor(props) {
        super(props);

        this.state = {
            arrowOnTop: false,
            arrowX: 0,
            formX: 0,
            formY: 0,
        }

        this.save = this.save.bind(this);
        this.updateLocation = this.updateLocation.bind(this);
    }

    save() {
        const scale = document.getElementById("scale").value;
        this.props.save({scale});
    }

    componentDidMount() {
        this.setState({hidden: !this.props.visible});
        this.updateLocation(this.props);
    }

    componentWillReceiveProps(newProps) {
        if(newProps.visible !== this.props.visible) {
            this.setState({hidden: !newProps.visible});
            this.updateLocation(newProps);
        }
    }

    updateLocation(props) {
        const rif = document.getElementsByClassName("scaleInputForm")[0];
        const form = rif.getElementsByClassName("form")[0];
        const firstInput = form.getElementsByTagName("input")[0];
        if(this.state.visible) {
            firstInput.focus();
        }
        const containerWidth = props.width;
        const containerHeight = props.height;
        const formWidth = 176;
        const formHeight = 172;
        let fx = props.x - formWidth / 2;
        let fy = props.y + 15;
        let arrowX = formWidth / 2;
        let arrowOnTop = true;
        if(fx < 0) {
            fx = 0;
            arrowX = props.x;
        }
        else if(fx + formWidth > containerWidth) {
            arrowX += fx + formWidth - containerWidth;
            fx = containerWidth - formWidth;
        }
        if(fy + formHeight > containerHeight) {
            fy = props.y - 15 - formHeight;
            arrowOnTop = false;
        }

        this.setState({formX: fx, formY: fy, arrowX: arrowX, arrowOnTop: arrowOnTop});
    }

    render() {
        const formStyle = {
            top: this.state.formY + "px",
            left: this.state.formX + "px",
        };
        const arrowStyle = {
            left: this.state.arrowX + "px",
        }
        const arrowClass = this.state.arrowOnTop ? " up" : " down";
        const hiddenClass = this.props.visible ? "" : " hidden";
        return (
                <div
                    className={"scaleInputForm" + hiddenClass}
                    onClick={(e) => {
                        if(e.target === document.getElementsByClassName("scaleInputForm")[0]) {
                            this.props.cancel();
                        }
                    }}
                    >
                    <div
                        className="form"
                        style={formStyle}
                        >
                        <div
                            className={"arrow" + arrowClass}
                            style={arrowStyle}
                            />
                        <TextInput label="Scale (m)" name="scale" value={""} />
                        <button
                            className="button"
                            onClick={this.save}
                            tabIndex={0}
                            >
                            OK
                        </button>
                        <button
                            className="link-button cancelButton"
                            onClick={this.props.cancel}
                            tabIndex={0}
                            >
                            Cancel
                        </button>
                    </div>
                </div>

        );
    }
}

export default ScaleInputForm;
