const electron = require('electron');
const ipc = electron.ipcRenderer;

ipc.on("login-retry", (evt) => {
	alert("다시 시도 하시옹!");
});

document.getElementById("btnLogin").onclick = function () {
	let _email = getValue("txtEmail");
	let _password = getValue("txtPassword");

	let _loginMsg = getElem("password-error");

	var param = { email: _email, password: _password };
	sendPost('https://capi.moducoding.com/api/token',
		param,
		function (result) { //성공시
			if (result.token !== '') {
				let session = {
					userId: 1,
					email: _email,
					token: result.token,
					memberToken: result.memberToken
					//name: '어쩌고저쩌고',
					//roles: []};
				};
				ipc.send('login-succeed', session);

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