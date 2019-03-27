import React, { Component } from 'react';
import './SearchBar.css';

class SearchBar extends Component {
    constructor(props) {
        super(props);

        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(e) {
        this.props.onChange(e.target.value);
    }

    render() {
        return (
            <div className="searchBar">
                <img src="search.png" alt="Search"/>
                <input
                    type="text"
                    className="searchBarInput"
                    placeholder="Search..."
                    onInput={this.handleChange}
                    />
            </div>
        );
    }
}

export default SearchBar;
