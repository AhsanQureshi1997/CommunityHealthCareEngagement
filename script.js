let currentData=[];

document.getElementById('fileInput').addEventListener('change', handleFile);

function loadDemo(){
currentData=[
["1","Heat Outreach","No Response",150,2],
["2","Mental Health","Engaged",30,0],
["3","Obesity Program","No Response",200,3],
["4","Screening","Partial",90,1],
["5","Suicide Prevention","No Response",300,4]
];
render(currentData);
}

function handleFile(e){
const file=e.target.files[0];
const reader=new FileReader();
reader.onload=function(ev){
const rows=ev.target.result.split("\n").map(r=>r.split(","));
currentData=rows.slice(1);
render(currentData);
};
reader.readAsText(file);
}

function calculate(row){
let days=parseInt(row[3])||0;
let attempts=parseInt(row[4])||0;

let score=0;
if(days>120) score+=2;
if(days>200) score+=2;
if(attempts>=2) score+=2;

let risk="Low";
if(score>=4) risk="High";
else if(score>=2) risk="Medium";

let action="Routine";
if(risk==="High") action="Immediate outreach + escalation";
if(risk==="Medium") action="Follow-up soon";

return {risk,action,score};
}

function render(data){
let tbody=document.querySelector("#table tbody");
tbody.innerHTML="";
let high=0,med=0,low=0;

data.forEach(r=>{
let res=calculate(r);

if(res.risk==="High") high++;
else if(res.risk==="Medium") med++;
else low++;

let tr=document.createElement("tr");
tr.innerHTML=`
<td>${r[0]}</td>
<td>${r[1]}</td>
<td>${r[2]}</td>
<td>${r[3]}</td>
<td>${r[4]}</td>
<td class="${res.risk.toLowerCase()}">${res.risk}</td>
<td>${res.action}</td>
`;
tbody.appendChild(tr);
});

document.getElementById("summary").innerHTML=
`High: ${high} | Medium: ${med} | Low: ${low}`;

drawChart(high,med,low);
}

function drawChart(h,m,l){
let c=document.getElementById("chart");
let ctx=c.getContext("2d");
ctx.clearRect(0,0,600,250);

let vals=[h,m,l];
let colors=["red","orange","green"];

vals.forEach((v,i)=>{
ctx.fillStyle=colors[i];
ctx.fillRect(50+i*150,200-v*20,50,v*20);
ctx.fillStyle="black";
ctx.fillText(v,50+i*150,190-v*20);
});
}

function filterHigh(){
render(currentData.filter(r=>calculate(r).risk==="High"));
}

function showAll(){
render(currentData);
}
