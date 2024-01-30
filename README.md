# Tasks

Manager for task list

## Installation

Use the package manager npm to install Tasks.

```bash
npm install @ijx/tasks
```

## List of methods
- `constructor(config?: object)` Constructor
- `onEnd(func: function): Tasks` Execute function after end event
- `add(action: function|object): Tasks` Add new task to list
- `process(): void` Start to process task list
- `pause(): void` Pause task list
- `reset(): void` Clear task list and stop

## Example usage

```js
// Import module
import Tasks from "@ijx/tasks"

// Create variable and settings
const tasks = new Tasks({
    auto: true // Start process with add function, default true
});
tasks.onEnd(() => console.log("Finish all tasks!"));

// Add tasks
tasks.add(async () => {
    // Slow function 1
});
tasks.add(async () => {
    // Slow function 2
});
```