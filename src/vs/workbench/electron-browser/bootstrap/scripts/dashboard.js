const electron = require('electron');
const ipc = electron.ipcRenderer;

let btnSome = getElem("btnSome");
btnSome.onclick = function () {
	ipc.send('control-someaction');
};
let txtFocused = getElem("txtFocused");

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


let recentLecturesCount = 1;
if(recentLecturesCount < 1) {
	let elems = getElemByClass("right_content");
	for(var i=0; i<elems.length; i++) {
		elems[i].setAttribute("style", "height: 1px;");
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
lblUsername.innerHTML = "어쩌고 저쩌고";
lblEmail.innerHTML = "netscout82@naver.com";

let isExpert = true;
if(isExpert) {
	let divExpertSetting = getElem("divExpertSetting");
	show(divExpertSetting);
}

function recentLecturesTemplate(item){
	let leftDay = "--";
	if(item.AlwaysOpen === 1)
	{
		leftDay = "∞";
	}
	else if(item.EndDate !== null && item.AlwaysOpen === 0)
	{
		// var endDate = item.EndDate;
		// dayCalculate = endDate.Subtract(DateTime.Now);
		// if (dayCalculate < DateTime.Now.TimeOfDay)
		// {
		// 	leftDay = "--";
		// }
		// else
		// {
		// 	leftDay = DateTime.Now.Subtract(endDate).ToString("dd") + " 일";
		// }
	}

	return `<tr>
	<td>${item.CreateDate}</td>
	${item.Category === 3 ?
		`<td><a href="/live/@item.LectureId">${item.Title}</a></td>` :
		`<td><a href="/Vod/@item.LectureId">${item.Title}</a></td>`
	}
	<td class="idx_pro_bar">
		<span>나</span>
		<div class="ui aqua progress studentProgress privateProgress" data-value="${Math.trunc(item.StudentProgress)}" data-one="${item.MemberLessonCnt}" data-two="${item.LessonCnt}" data-total="100">
			<div class="bar">
				<div class="progress"></div>
			</div>
		</div>
		<div class="label"><span class="t-black">${item.MemberLessonCnt}</span> / ${item.LessonCnt}</div>
		<br />
		<span>평균</span>
		<div class="ui aqua avg progress studentProgress" data-value="${Math.trunc(item.AverageProgress)}" data-total="100">
			<div class="bar">
				<div class="progress"></div>
			</div>
		</div>
		<div class="label"><span class="t-black">${Math.floor(item.TotalAVGLessonCnt)}</span> / ${item.LessonCnt}</div>
	</td>
	${leftDay === "--" ?
		`<td>기한 만료</td><td>-</td>` :
		`<td class="count_down">${leftDay}</td>`
	}
	${(item.Category !== 3) ?
		`${item.LastLessonId === null ?
			`<td><a href="/Vod/${item.LectureId}" class="continue">이어서하기</a></td>` :
			`<td><a href="/Vod/${item.LectureId}/Lesson/${item.LastLessonId}" class="continue">이어서하기</a></td>`
		}` :
		`${item.LastLessonId === null ?//else
			`<td><a href="/live/${item.LectureId}" class="continue">이어서하기</a></td>` :
			`<td><a href="/live/${item.LectureId}/Lesson/${item.LastLessonId}" class="continue">이어서하기</a></td>`
		}`
	}
	</tr>`;
 }

 let tbodyRecentLectures = getElem('tbodyRecentLectures');
 tbodyRecentLectures.innerHTML = recentLecturesTemplate({Category:3,
		AlwaysOpen:1,
		Title:'그냥 과목과목',
		MemberLessonCnt:10,
		LessonCnt:20,
		AverageProgress:50,
		TotalAVGLessonCnt:10,
		CreateDate:new Date()});