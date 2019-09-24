import React, { Component } from 'react'
import {
  Keyboard
} from '@material-ui/icons'

class appFooterNav extends Component {
	constructor(props) {
		super(props)

		this.initEvents = this.initEvents.bind(this)
	}

	componentDidMount() {
		this.initEvents()
	}

	componentWillUnmount() {
	}

	initEvents() {
	}

	/**
	* React Render
	*/
	render() {
    return (
      <div />
    )
	}
}

export default appFooterNav
