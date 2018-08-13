const electron = require('electron');
const ipc = electron.ipcRenderer;

ipc.on("login-retry", (evt) => {
	alert("다시 시도 하시옹!");
});

document.getElementById("btnLogin").onclick = function () {
	let _email = getValue("txtEmail");
	let _password = getValue("txtPassword");

	let _loginMsg = getElem("password-error");

	var param = { name: _email, password: _password };
	sendPost('http://localhost:3000/login',
		param,
		function (result) { //성공시
			if (result.result === 1) {
				let result = {
					userId: 1,
					email: 'netscout82@naver.com',
					name: '어쩌고저쩌고',
					roles: []};
				ipc.send('login-succeed', result);

				hide(_loginMsg);
			}
			else {
				ipc.send('login-failed');
				show(_loginMsg);
			}
		},
		function () { //실패시
			ipc.send('login-failed');
			show(_loginMsg);
		});
};