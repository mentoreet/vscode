Date.prototype.yyyymmdd = function() {
	var mm = (this.getMonth() + 1).toString(); // getMonth() is zero-based
	var dd = this.getDate().toString();

	return `${this.getFullYear()}-${mm.length===2 ? '' : '0'}${mm}-${dd.length===2 ? '' : '0'}${dd}`; // padding
  };

function getElem(elementId) {
	var elem = document.getElementById(elementId);

	return elem;
}

function getElemByClass(_class) {
	var elem = document.getElementsByClassName(_class);

	return elem;
}

function getValue(elementId) {
	var value = document.getElementById(elementId).value;
	return value;
}

// Show an element
function show (elem) {
	elem.style.display = 'block';
}

// Hide an element
function hide (elem) {
	elem.style.display = 'none';
}

// Toggle element visibility
function toggle (elem) {

	// If the element is visible, hide it
	if (window.getComputedStyle(elem).display === 'block') {
		hide(elem);
		return;
	}

	// Otherwise, show it
	show(elem);
}

function sendPost(url, jsonData, success, fail) {
	fetch(url, {
		method: 'post',
		headers: {
			'Accept': 'application/json, text/plain, */*',
			'Content-Type': 'application/json'
		},
  		body: JSON.stringify(jsonData)
	})
	.then(res => {
		if(!res.ok){
			throw Error(res.statusText);
		}

		return res.json();
	})
	.then(res => success(res))
	.catch(error => {
		console.log(error);
		fail();
	});
}

function sendPostWithToken(url, token, jsonData, success, fail) {
	fetch(url, {
		method: 'post',
		headers: {
			'Authorization' : `Bearer ${token}`,
			'Accept': 'application/json, text/plain, */*',
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(jsonData)
	})
	.then(res => {
		if(!res.ok){
			throw Error(res.statusText);
		}

		return res.json();
	})
	.then(res => success(res))
	.catch(error => {
		console.log(error);
		fail();
	});
}