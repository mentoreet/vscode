const electron = require('electron');
const ipc = electron.ipcRenderer;
let data = {};

let btnSome = getElem("btnSome");
btnSome.onclick = function () {
	ipc.send('control-someaction');
};
let txtFocused = getElem("txtFocused");

ipc.on("control-load-data", (evt, token) => {
	sendPostWithToken('http://localhost:5070/api/Exam',
		token,
		{"LectureId" : 306},
		function (result) { //성공시
			if (result.length > 0) {
				data = result;
				renderData(data);
			}
			else {
				//실패시 처리.
			}
		},
		function () { //실패시
	});
});

ipc.on("control-someaction-reply", (evt, args) => {
	let str = '';
	for(var i=0; i<args.length; i++)
	{
		str += args[i] + ', ';
	}
	alert(`어쩌고 저쩌고! , ${str}`);
});

ipc.on("vscode-focused-out", () => {
	txtFocused.innerHTML = '포커스 아웃 감지!';
});
ipc.on("vscode-focused-in", () => {
	txtFocused.innerHTML = '포커스 인 감지!';
});

let cmdLeftTop = getElem("cmdLeftTop");
cmdLeftTop.onclick = function () {
	ipc.send("command-controlwindow-lefttop");
};
let cmdLeftBottom = getElem("cmdLeftBottom");
cmdLeftBottom.onclick = function () {
	ipc.send("command-controlwindow-leftbottom");
};
let cmdRightTop = getElem("cmdRightTop");
cmdRightTop.onclick = function () {
	ipc.send("command-controlwindow-righttop");
};
let cmdRightBottom = getElem("cmdRightBottom");
cmdRightBottom.onclick = function () {
	ipc.send("command-controlwindow-rightbottom");
};

let recentLecturesCount = 1;
if(recentLecturesCount < 1) {
	let elems = getElemByClass("right_content");
	for(var i=0; i<elems.length; i++) {
		elems[i].setAttribute("style","height: 1px;");
	}

	let divNoRecentLectures = getElem("divNoRecentLectures");
	show(divNoRecentLectures);
}
else {
	let divRecentLectures = getElem("divRecentLectures");
	show(divRecentLectures);
}

let lblUsername = getElem("lblUsername");
let lblEmail = getElem("lblEmail");
lblUsername.innerHTML ="어쩌고 저쩌고";
lblEmail.innerHTML ="netscout82@naver.com";

let isExpert = true;
if(isExpert) {
	let divExpertSetting = getElem("divExpertSetting");
	show(divExpertSetting);
}

function examListTemplate(item){
	return `<tr>
		<td>${item.lessonId}<td>
		<td>${item.title}<td>
		<td>${item.alwaysOpen ? '수강 기간 내' : `${item.startDate}-${item.endDate}`}<td>
		<td>${item.score}<td>
		<td>${item.applyState}<td>
		<td><input id="btnShow${item.lessonId}" type="button" class="" onclick="showExam(${item.lessonId});" value="시험 응시하기" /><td>
	</tr>`;
 }

 function renderData(data)
{
	let templateString ="";

	data.forEach(function(item) {
		templateString += examListTemplate(item);
	});

	let tbodyExamList = getElem('tbodyExamList');
	tbodyExamList.innerHTML = templateString;
}

function showExam(id) {
	ipc.send('command-showexam', id);
}