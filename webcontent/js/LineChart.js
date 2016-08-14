const React = require('react');
const ReactDOM = require('react-dom');
const Select = require('react-select');

// var options = [
//     { value: 'one', label: 'One' },
//     { value: 'two', label: 'Two' }
// ];

// function logChange(val) {
//     console.log("Selected: " + val);
// }

// <Select
//     name="form-field-name"
//     value="one"
//     options={options}
//     onChange={logChange}
// />

      // var ExampleApplication = React.createClass({
      //   render: function() {
      //     var elapsed = Math.round(this.props.elapsed  / 100);
      //     var seconds = elapsed / 10 + (elapsed % 10 ? '' : '.0' );
      //     var message =
      //       'React has been successfully running for ' + seconds + ' seconds.';

      //     return React.DOM.p(null, message);
      //   }
      // });

      // // Call React.createFactory instead of directly call ExampleApplication({...}) in React.render
      // var ExampleApplicationFactory = React.createFactory(ExampleApplication);

      // var start = new Date().getTime();
      // setInterval(function() {
      //   ReactDOM.render(
      //     ExampleApplicationFactory({elapsed: new Date().getTime() - start}),
      //     document.getElementById('lct-controls-container')
      //   );
      // }, 50);

// <Select
// 	name = "for-field-name"
// 	value = "one"
// 	options = {options}
// 	onChange = {addLineChart}
// />

// ReactDOM.render(
// 	// <div>
// 		<Select label="Choose" searchable/>,
// 	// </div>,
// 	document.getElementById('lct-controls-container')
// )