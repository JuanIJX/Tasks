import { isNullable } from "@ijx/utils";

const states = ["STOPPED", "PROCESSING", "PAUSED", "STOPPING", "PAUSING"];
const NOOP = () => {};

class Action {
	constructor(config={}) {
		Object.defineProperty(this, '_ignoreCatch', { value: false, writable: true });
		Object.defineProperty(this, '_func', { value: NOOP, writable: true });

		this.setConfig(config);
	}

	get func() { return this._func; }
	get ignoreCatch() { return this._ignoreCatch; }

	setConfig(config) {
		if(isNullable(config))
			throw new Error(`Parameter required`);
		if(typeof config != "object")
			throw new TypeError(`Parameter should be a object`);

		this._ignoreCatch = (typeof config.ignoreCatch == "boolean") ?
			config.ignoreCatch :
			this._ignoreCatch;
	}

	setAction(action) {
		if(!(action instanceof Action))
			throw new TypeError(`Parameter should be instance of Action`);

		this._ignoreCatch = action.ignoreCatch;
		this._func = action.func;
	}

	setFunc(func) {
		if(typeof func != "function")
			throw new TypeError(`Parameter should be a function`);
		this._func = func;
	}
}

export default class Tasks {
	static {
		states.forEach((state, index) => Object.defineProperty(this, state, { value: index, enumerable: true }));
	}

	constructor(config={}) {
		// Auto process on add first element
		Object.defineProperty(this, '_auto', { value: config.auto ?? true, writable: true });
		// Actual processed task
		Object.defineProperty(this, '_processingTask', { value: null, writable: true });
		// Function executed when end event
		Object.defineProperty(this, '_endFunc', { value: NOOP });
		
		Object.defineProperty(this, '_state', { value: this.constructor.STOPPED, writable: true });
		Object.defineProperty(this, '_list', { value: [] });
	}

	get task() { return this._processingTask; }
	get auto() { return this._auto; }
	get size() { return this._list.length; }
	get state() { return this._state; }
	get stateName() { return states[this._state] ; }

	/**
	 * Set function to finish process all tasks
	 * 
	 * @param {function} func 
	 * @returns this instance
	 */
	onEnd(func) {
		if(typeof func != "function")
			throw new TypeError(`Parameter should be a function`);
		this._endFunc = func;
		return this;
	}

	/**
	 * Add task to list
	 * 
	 * @param {function|object|Action} action task
	 * @returns this instance
	 */
	add(action) {
		const ac = new Action();
		if(typeof action == "function")
			ac.setFunc(action)
		else if(!isNullable(action) && typeof action == "object" && typeof action.func == "function") {
			ac.setFunc(action.func);
			delete action.func;
			ac.setConfig(action);
		}
		else
			throw new Error(`Invalid action`);

		this._list.push(ac);
		if(this.auto && this.state != this.constructor.PAUSED)
			this.process();

		return this;
	}

	/**
	 * Start process the task list, unpause if process is paused
	 */
	process() {
		if(this.state == this.constructor.PROCESSING) return;
		if(this.state == this.constructor.STOPPING) return;

		if(this.state == this.constructor.PAUSING)
			this._state = this.constructor.PROCESSING;
		else // PAUSED o STOPPED
			this._process();
	}

	/**
	 * Pause/unpause the process
	 */
	pause() {
		switch (this.state) {
			case this.constructor.PROCESSING:
				this._state = this.constructor.PAUSING;
				break;
			case this.constructor.PAUSED:
				this.process();
				break;
			case this.constructor.PAUSING:
			case this.constructor.STOPPED:
			case this.constructor.STOPPING:
			default:
				break;
		}
	}

	/**
	 * Stop and clear task list
	 */
	reset() {
		this._list.splice(0, this.size);
		if(this.state == this.constructor.STOPPED) return;
		if(this.state == this.constructor.PAUSED) {
			this._state = this.constructor.STOPPED;
			this._onEnd();
		}
		else
			this._state = this.constructor.STOPPING;
	}


	// Private methods

	async _process() {
		this._state = this.constructor.PROCESSING;
		while(this.size > 0 && this.state == this.constructor.PROCESSING) {
			const action = this._processingTask = this._list.shift();
			await action.func().catch(err => {
				this._processingTask = null;
				if(!action.ignoreCatch)
					throw err;
			});
			this._processingTask = null;
		}
		if(this.size == 0) {
			this._state = this.constructor.STOPPED;
			this._onEnd();
		}
		else if (this.state == this.constructor.PAUSING)
			this._state = this.constructor.PAUSED;
		else
			throw new Error(`Unknown error`);
	}

	_onEnd() {
		this._endFunc();
	}
}