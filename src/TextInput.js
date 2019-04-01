import React, { Component } from 'react';
import './TextInput.css';

class TextInput extends Component {
    constructor(props) {
        super(props);

        this.state = {
            value: '',
        };

        this.handleChange = this.handleChange.bind(this);
    }

    componentDidMount() {
        this.setState({value: this.props.value});
    }

    componentWillReceiveProps(newProps) {
        if(newProps.value !== this.state.value) {
            this.setState({value: newProps.value});
        }
    }

    handleChange(e) {
        this.setState({value: e.target.value});
    }

    render() {
        return (
            <div className="textInput">
                <label className="textInputLabel">
                    {this.props.label}
                </label>
                <input
                    type="text"
                    className="textInputField"
                    value={this.state.value}
                    id={this.props.name}
                    onChange={this.handleChange}
                    />
            </div>
        );
    }
}

export default TextInput;
