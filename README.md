

This is a minimal Electron application based on the [Quick Start Guide](http://electron.atom.io/docs/latest/tutorial/quick-start) within the Electron documentation.

**Use this app along with the [Electron API Demos](http://electron.atom.io/#get-started) app for API code examples to help you get started.**

A basic Electron application needs just these files:

- `package.json` - Points to the app's main file and lists its details and dependencies.
- `main.js` - Starts the app and creates a browser window to render HTML. This is the app's **main process**.
- `index.html` - A web page to render. This is the app's **renderer process**.

You can learn more about each of these components within the [Quick Start Guide](http://electron.atom.io/docs/latest/tutorial/quick-start).

Learn more about Electron and its API in the [documentation](http://electron.atom.io/docs/latest).


# Install the dependencies
$ npm install

# Start the electron application
$ npm start

This app requires the python library Pandas(ant its required lib such as numpy>1.7.1) and sklearn. So in the development mode before you compile it, you should first install Pandas in python 3.4
$ python -m pip install pandas
$ python -m pip install sklearn
$ python -m pip install numpy
