var canvas;
var ctx;
var w,h;

var img;
var img_data;

var img_history = [];
var img_history_index;

var fi, btnsDiv, prepDiv, prepOpt;
var showing = "none";
var confirm_btn;

//Lista de métodos para renderização na tela
var Methods = [
{'method':'Restore to Original', 'preparation': restoreImg},
{'method':'Download', 'preparation': downloadImg},
{'method':'', 'preparation': undefined },
{'method':'Threshold', 'preparation': thresholdPrep},
{'method':'Grayscale', 'preparation': grayscalePrep},
{'method':'Sharp', 'preparation': sharpPrep},
{'method':'High Boost', 'preparation': hbPrep},
{'method':'Blur', 'preparation': blurPrep},
{'method':'Median', 'preparation': medianPrep},
{'method':'Prewitt', 'preparation': prewittPrep},
{'method':'Sobel', 'preparation': sobelPrep},
{'method':'Histogram Eq.', 'preparation': hePrep},
{'method':'Adaptative Histogram Eq.', 'preparation': ahePrep},
{'method':'', 'preparation': undefined },
{'method':'Gaussian', 'preparation': gaussPrep},
{'method':'Laplacian', 'preparation': laplacePrep},
{'method':'Log', 'preparation': logPrep},
{'method':'Motion', 'preparation': motionPrep},
{'method':'', 'preparation': undefined },
{'method':'Normalize', 'preparation': normalizePrep},
{'method':'Gamma', 'preparation': gammaPrep},
{'method':'Pixelate', 'preparation': pixelatePrep},
{'method':'Negative', 'preparation': negativePrep},
{'method':'Contrast', 'preparation': contrastPrep},
{'method':'Brightness', 'preparation': brightnessPrep},
{'method':'Posterize', 'preparation': posterizePrep},
{'method':'Solarization', 'preparation': solarizationPrep},
{'method':'Dither - Floyd-Steinberg', 'preparation': ditherPrep},
];

/*
	Funções gerais
*/
//Obtém o velor mediano de um array
Array.prototype.median = function() {
	if(this.length == 0) return 0;

	this.sort(function(a,b){
		return a-b;
	});
	var half = Math.floor(this.length / 2);

	if (this.length % 2)
		return this[half];
	else
		return (this[half - 1] + this[half]) / 2.0;
};

//Define uma nova imagem para o histórico
function setHistory(img2set){
	if(img_history_index != img_history.length - 1){
		while(img_history.length - 1 > img_history_index) img_history.pop();
	}
	let aux = new ImageData(new Uint8ClampedArray(img2set.data),w,h);
	img_history.push(aux);
	img_history_index = img_history.length - 1;

	//Ignora caso os botões não estejam criados
	try{
		document.querySelector("#undo").disabled = false;
		document.querySelector("#redo").disabled = true;
	}
	catch(err){
		console.log(err);
	}
}

function setConfirmFunct(f){
	//Clona o botão de confirmação
	let old_btn = confirm_btn;
	let new_btn = old_btn.cloneNode(true);
	old_btn.parentNode.replaceChild(new_btn,old_btn);

	confirm_btn = document.querySelector("#confirm");

	//Seta novos eventos para o botão
	confirm_btn.addEventListener("click", f);
	confirm_btn.addEventListener("click", showBtns);
}

//Carega botões de acordo com a lista de métodos
function loadBotoes(){
	let htmlBtns = "";

	htmlBtns += "<div id=\"UndoRedo\">"
	htmlBtns += "<button class=\"btn\" id=\"undo\" onclick=\"undo()\"> Undo </button>"
	htmlBtns += "<button class=\"btn\" id=\"redo\" onclick=\"redo()\"> Redo </button>"
	htmlBtns += "</div>"

	Methods.forEach(function(item,index){
		if(item.preparation == undefined || item.method == undefined)
			htmlBtns += "<hr>"
		else
			htmlBtns += "<button class=\"btn\" onclick=\""+item.preparation.name+"()\">" + item.method + "</button>";
	})

	btnsDiv.innerHTML = htmlBtns;
	document.querySelector("#undo").disabled = true;
	document.querySelector("#redo").disabled = true;

}

//Exibe div de botões
function showBtns(){
	showing = "btns";
	btnsDiv.style.display = "flex";
	prepDiv.style.display = "none";
}
//Exibe div de preparation
function showPrep(){
	showing = "prep";
	btnsDiv.style.display = "none";
	prepDiv.style.display = "block";
}

//Inicializa
function initAll(){
	fi = document.querySelector('#file-input');
	btnsDiv = document.querySelector('#botoes');
	prepDiv = document.querySelector('#prep');
	prepOpt = document.querySelector('#prep-options');
	confirm_btn = document.querySelector("#confirm");

	canvas = document.getElementById("myCanvas");
	ctx = canvas.getContext("2d");

	//Atualiza tamanho da lista de botões
	updateHeight();

	document.querySelector("#cancel").addEventListener("click", function(){
		showBtns();
	})
}

//Baixa a imagem
function downloadImg(){
	var link = document.querySelector("#download_aux");
	link.setAttribute('download', 'Arquivo.png');
	link.setAttribute('href', canvas.toDataURL("image/png").replace("image/png", "image/octet-stream"));
	link.click();
}

//Obtem a célula de uma imagem
function getImageCell(row,col,img2get){
	img2get = img2get == undefined? img_data: img2get;
	row = row < 0? 0: row;
	col = col < 0? 0: col;
	
	row = row > h? h: row;
	col = col > w? w: col;
	let offset = col*4 + row*w*4;

	return [img2get.data[offset], img2get.data[offset+1] , img2get.data[offset+2]];
}

//Seta a célula de uma imagem
function setImageCell(row,col,data,img2set){
	img2set = img2set == undefined? img_data: img2set;
	let offset = col*4 + row*w*4;

	img2set.data[offset] = data[0];
	img2set.data[offset + 1] = data[1];
	img2set.data[offset + 2] = data[2];
}

//Trunca um valor para o formato rgb
function truncateRgb(x){
	if(x < 0) return 0;
	if(x > 255) return 255;
	return Math.trunc(x);
}

//Trunca valor decimal
function truncateDecimals(x,decimals){
	if(decimals == undefined || decimals < 0) return Math.trunc(x);
	let divisor = Math.pow(10,decimals);
	return Math.trunc(x*divisor)/divisor;
}

//Desfaz uma alteração
function undo(){
	if(img_history_index > 0){
		img_history_index--;
		img_data = new ImageData(new Uint8ClampedArray(img_history[img_history_index].data),w,h);;
		
		if(img_history_index == 0){
			document.querySelector("#undo").disabled = true;
		} 
		document.querySelector("#redo").disabled = false;

		renderImage(img_data,true);
	}
}

//Refaz uma alteração
function redo(){
	if(img_history_index != img_history.length-1){
		img_history_index++;
		img_data = new ImageData(new Uint8ClampedArray(img_history[img_history_index].data),w,h);;

		if(img_history_index == img_history.length-1){
			document.querySelector("#redo").disabled = true;
		}
		document.querySelector("#undo").disabled = false;
		
		renderImage(img_data,true);
	}
}

//Seta a imagem de volta a original
function restoreImg(){
	renderImage(img);
}

//Calcula a quantidade de pixeis brancos
function blackAmount(){
	let row, col;
	let total = h*w;
	let black = 0;
	for(row = 0; row < h; row++){
		for(col = 0; col < w; col++){
			let Cell = getImageCell(row,col);

			if(Cell[0] == 0)
				black++;

		}
	}

	let percentage = black*100/total; 
}

//Renderiza a imagem e se necessário seta o histórico se necessário
function renderImage(img2load, noSet){
	noSet = noSet == undefined? false: noSet;

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	w = img2load.width;
	h = img2load.height;

	canvas.width = w;
	canvas.height = h;
	
	if(img2load.constructor == ImageData){
		ctx.putImageData(img2load, 0, 0);
		img_data = img2load;
	}
	else{
		var img = new Image();
		ctx.drawImage(img2load,0,0);
		img_data = ctx.getImageData(0,0,w,h);
	}

	if(!noSet)
		setHistory(img_data);
}

//Obtém um array de pixels ao redor da célula
function getArrayAround(row,col,radius,channel){
	let n = 0;
	let x;
	if(channel == undefined) x = [[],[],[]];
	else x = [];

	for (var i = row-radius; i < row+radius+1; i++) {
		for (var j = col-radius; j < col+radius+1; j++) {
			if(j > 0 && j < w && i > 0 && i < h){
				let cell = getImageCell(i,j); 
				if(channel == undefined){
					x[0].push(cell[0]);
					x[1].push(cell[1]);
					x[2].push(cell[2]);
				}
				else
					x.push(cell[channel]);
			}
		}
	}
	return x;
}
//Obtém a média dos pixels ao redor da célula
function getAverageAround(row,col,radius){
	let sum0 = 0, sum1 = 0, sum2 = 0, n = 0;
	for (var i = row-radius; i < row+radius+1; i++) {
		for (var j = col-radius; j < col+radius+1; j++) {
			if(j > 0 && j < w && i > 0 && i < h){
				let cell = getImageCell(i,j); 
				sum0 += cell[0];
				sum1 += cell[1];
				sum2 += cell[2];
				n++;
			}
		}
	}
	return [Math.round(sum0/n),Math.round(sum1/n),Math.round(sum2/n)];
}

//Obtém a média dos pixeis apartir de uma posição
function getAverageForward(row,col,radius){
	let sum0 = 0, sum1 = 0, sum2 = 0, n = 0;
	for (var i = row; i < row+radius; i++) {
		for (var j = col; j < col+radius; j++) {
			if(j > 0 && j < w && i > 0 && i < h){
				let cell = getImageCell(i,j); 
				sum0 += cell[0];
				sum1 += cell[1];
				sum2 += cell[2];
				n++;
			}
		}
	}
	return [Math.round(sum0/n),Math.round(sum1/n),Math.round(sum2/n)];
}


/*
	Função de suporte - Jane.js
	Função de convolução disponível na biblioteca Jane.js
	Utilizada para aplicar mascaras
*/
function convolution(imgdata, weights) {
	var side = Math.round(Math.sqrt(weights.length)),
	halfSide = Math.floor(side/2),
	src = imgdata,
	canvasWidth = w,
	canvasHeight = h,
	temporaryCanvas = document.createElement('canvas'),
	temporaryCtx = temporaryCanvas.getContext('2d'),
	outputData = temporaryCtx.createImageData(canvasWidth, canvasHeight);

	for (var y = 0; y < canvasHeight; y++) {

		for (var x = 0; x < canvasWidth; x++) {

			var dstOff = (y * canvasWidth + x) * 4,
			sumReds = 0,
			sumGreens = 0,
			sumBlues = 0

			for (var kernelY = 0; kernelY < side; kernelY++) {
				for (var kernelX = 0; kernelX < side; kernelX++) {

					var currentKernelY = y + kernelY - halfSide,
					currentKernelX = x + kernelX - halfSide

					if (currentKernelY >= 0 && currentKernelY < canvasHeight && currentKernelX >= 0 && currentKernelX < canvasWidth) {
						var offset = (currentKernelY * canvasWidth + currentKernelX) * 4,
						weight = weights[kernelY * side + kernelX]

						sumReds += src[offset] * weight
						sumGreens += src[offset + 1] * weight
						sumBlues += src[offset + 2] * weight
					}
				}
			}

			outputData.data[dstOff] = sumReds
			outputData.data[dstOff+1] = sumGreens
			outputData.data[dstOff+2] = sumBlues
			outputData.data[dstOff+3] = 255
		}
	}
	return outputData;
}

/*
	Funções de opções
*/
//Prepara o input do filtro - Blur
function blurPrep(){

	preparation(function(){
		var x = eval(document.querySelector('#input1').value);
		if(x != ""){
			simpleBlur(x);
		}
	}, "<h2>Blur</h2><div class=\"form_row\"><div class=\"label\">Radius :</div><input id=\"input1\" type=\"number\" min=\"0\"></input></div>");

}
//Prepara o input do filtro - Sharp
function sharpPrep(){

	preparation(function(){
		var x = eval(document.querySelector('#input1').value);
		if(x != ""){
			simpleSharp(x);
		}
	}, "<h2>Sharp</h2><div class=\"form_row\"><div class=\"label\">Amount :</div><input id=\"input1\" type=\"number\" min=\"0\"></input></div>");

}
//Prepara o input do filtro - High
function hbPrep(){

	preparation(function(){
		var x = eval(document.querySelector('#input1').value);
		if(x != ""){
			hb(x);
		}
	}, "<h2>High Boost</h2><div class=\"form_row\"><div class=\"label\">Constant :</div><input id=\"input1\" type=\"number\" min=\"0\"></input></div>");

}
//Prepara o input do filtro - Contrast
function contrastPrep(){

	preparation(function(){
		var x = eval(document.querySelector('#input1').value);
		if(x != ""){
			contrast(x);
		}
	}, "<h2>Contrast</h2><div class=\"form_row\"><div class=\"label\">Contrast Amount :</div><input id=\"input1\" type=\"number\"></input></div>");

}
//Prepara o input do filtro - Brightness
function brightnessPrep(){

	preparation(function(){
		var x = eval(document.querySelector('#input1').value);
		if(x != ""){
			x;
			brightness(x);
		}
	}, "<h2>Brightness</h2><div class=\"form_row\"><div class=\"label\">Brightness Amount (-256 - 256):</div><input id=\"input1\" type=\"number\"></input></div>");

}
//Prepara o input do filtro - Posterize
function posterizePrep(){

	preparation(function(){
		var x = eval(document.querySelector('#input1').value);
		if(x != ""){
			posterize(x);
		}
	}, "<h2>Posterize</h2><div class=\"form_row\"><div class=\"label\">Colors per channel :</div><input id=\"input1\" type=\"number\" min=\"0\"></input></div>");

}
function negativePrep(){

	preparation(negative(),"");
	confirm_btn.click();

}
//Prepara o input do filtro - Pixelate
function pixelatePrep(){

	preparation(function(){
		var x = eval(document.querySelector('#input1').value);
		if(x != ""){
			pixelate(x);
		}
	}, "<h2>Pixelate</h2><div class=\"form_row\"><div class=\"label\">Radius :</div><input id=\"input1\" type=\"number\" min=\"0\"></input></div>");

}
function grayscalePrep(){

	preparation(grayscale(),"");
	confirm_btn.click();

}
//Prepara o input do filtro - Gamma
function gammaPrep(){

	preparation(function(){
		var x = eval(document.querySelector("#input1").value);
		if(x != ""){
			x /= 100;
			gamma(x);
		}
	}, "<h2>Gamma</h2><div class=\"form_row\"><div class=\"label\">Gamma % :</div><input id=\"input1\" type=\"number\" min=\"0\"></input></div>");

}
//Prepara o input do filtro - Solarization
function solarizationPrep(){

	preparation(function(){
		var x = eval(document.querySelector("#input1").value);
		if(x != ""){
			if(x == 100) x++;
			x /= 100;
			solarization(x);
		}
	}, "<h2>Solarization</h2><div class=\"form_row\"><div class=\"label\">Solarization % :</div><input id=\"input1\" type=\"number\" min=\"0\" max=\"100\"></input></div>");

}
function normalizePrep(){

	preparation(normalize(),"");
	confirm_btn.click();

}
//Prepara o input do filtro - Median
function medianPrep(){

	preparation(function(){
		var x = eval(document.querySelector('#input1').value);
		if(x != ""){
			median(x);
		}
	}, "<h2>Median</h2><div class=\"form_row\"><div class=\"label\">Radius :</div><input id=\"input1\" type=\"number\" min=\"0\"></input></div>");

}
function hePrep(){

	preparation(histogramEq(),"");
	confirm_btn.click();

}
//Prepara o input do filtro - Adaptative
function ahePrep(){

	preparation(function(){
		var x = eval(document.querySelector('#input1').value);
		if(x != ""){
			adaptativeHistogramEq(x);
		}
	}, "<h2>Adaptative Histogram Eq.</h2><div class=\"form_row\"><div class=\"label\">Radius :</div><input id=\"input1\" type=\"number\" min=\"0\"></input></div>");

}
//Prepara o input do filtro - Threshold
function thresholdPrep(){
	
	preparation(function(){
		var x = eval(document.querySelector("#input1").value);
		if(x != ""){
			x = 256*x/100;
			threshold(x);
		}
	}, "<h2>Threshold</h2><div class=\"form_row\"><div class=\"label\">Threshold % :</div><input id=\"input1\" type=\"number\" min=\"0\" max=\"100\"></input></div>");

}
//Prepara o input do filtro - Dither
function ditherPrep(){

	preparation(function(){
		var x = document.querySelector("#input1").checked;
		dither(x);
	}, "<h2>Dither</h2><div class=\"form_row\"><div class=\"label\">Grayscale before :</div><input id=\"input1\" class=\"checkbox\" type=\"checkbox\"></input></div>");

}
//Prepara o input do filtro - Prewitt
function prewittPrep(){

	preparation(function(){
		var x = document.querySelector("#input1").checked;//Vertical
		var y = document.querySelector("#input2").checked;//Horizontal
		var d = document.querySelector("#input3").value;
		if(x || y){
			prewitt(x,y,d);
		}
	}, "<h2>Prewitt</h2> <div class=\"form_row\"> <div class=\"label\">Vertical :</div> <input id=\"input1\" class=\"checkbox\" type=\"checkbox\"></input> </div> <div class=\"form_row\"> <div class=\"label\">Horizontal :</div> <input id=\"input2\" class=\"checkbox\" type=\"checkbox\"></input> </div> <div class=\"form_row\"> <div class=\"label\">Amount :</div> <input id=\"input3\" type=\"number\" min=\"0\"></input> </div>");

}
//Prepara o input do filtro - Sobel
function sobelPrep(){

	preparation(function(){
		var x = document.querySelector("#input1").checked;//Vertical
		var y = document.querySelector("#input2").checked;//Horizontal
		var d = document.querySelector("#input3").value;
		if(x || y){
			sobel(x,y,d);
		}
	}, "<h2>Sobel</h2> <div class=\"form_row\"> <div class=\"label\">Vertical :</div> <input id=\"input1\" class=\"checkbox\" type=\"checkbox\"></input> </div> <div class=\"form_row\"> <div class=\"label\">Horizontal :</div> <input id=\"input2\" class=\"checkbox\" type=\"checkbox\"></input> </div> <div class=\"form_row\"> <div class=\"label\">Amount :</div> <input id=\"input3\" type=\"number\" min=\"0\"></input> </div>");

}
//Prepara o input do filtro - Gaussian
function gaussPrep(){

	preparation(function(){
		var x = document.querySelector("#input1").value;
		gauss(x);
	}, "<h2>Gaussian</h2> <div class=\"form_row\"> <div class=\"label\">Amount :</div> <input id=\"input1\" type=\"number\" min=\"0\"></input> </div>");

}
//Prepara o input do filtro - Motion
function motionPrep(){

	preparation(function(){
		var x = document.querySelector("#input1").value;
		let arr = document.querySelectorAll("input[name=orientation]");
		let checked_v;

		for (var i = 0; i < arr.length; i++) {
			if(arr[i].checked == true){
				checked_v = arr[i].value;
				break;
			}
		}

		motion(x, checked_v);
	}, "<h2>Motion</h2> <div class=\"form_row\"> <div class=\"label\">Radius :</div> <input id=\"input1\" type=\"number\" min=\"0\"></input> </div> <div class=\"form_row\"> <div class=\"label\">Radius :</div> <div> <input type=\"radio\" class=\"radio\" name=\"orientation\" value=\"0\" checked>0°</input><br> <input type=\"radio\" class=\"radio\" name=\"orientation\" value=\"45\">45°</input><br> <input type=\"radio\" class=\"radio\" name=\"orientation\" value=\"90\">90°</input><br> <input type=\"radio\" class=\"radio\" name=\"orientation\" value=\"135\">135°</input> </div> </div>");

}
//Prepara o input do filtro - Gaussian
function logPrep(){

	preparation(function(){
		var r = document.querySelector("#input1").value;
		var s = document.querySelector("#input2").value;
		log(r,s);
	}, "<h2>Gaussian</h2> <div class=\"form_row\"> <div class=\"label\">Radius :</div> <input id=\"input1\" type=\"number\" min=\"0\"></input></div><div class=\"form_row\"> <div class=\"label\">Sigma :</div> <input id=\"input2\" type=\"number\" min=\"0\"></input></div>");

}
//Prepara o input do filtro - Laplaciano
function laplacePrep(){

	preparation(laplace(),"");
	confirm_btn.click();

}
//Função genérica para preparação de inputs
function preparation(f,html){
	showPrep();

	prepOpt.innerHTML = html;

	setConfirmFunct(f);
}



/*
	Filtros
*/
function median(x){
	let row, col;
	for(row = 0; row < h; row++){
		for(col = 0; col < w; col++){
			let Cell = getImageCell(row,col);
			//Obtém um array células ao redor da atual
			let Arr = getArrayAround(row,col,x);
			Cell[0] = truncateRgb(Arr[0].median()); 
			Cell[1] = truncateRgb(Arr[1].median()); 
			Cell[2] = truncateRgb(Arr[2].median()); 
			setImageCell(row,col,Cell);
		}
	}
	renderImage(img_data);
}

function posterizeMapValue(x, variable){
	return Math.round(x/(256/variable)) * (256/variable);
}
//Realiza a posterização com base no valor máximo de cores 
function posterize(x){
	let row, col;
	for(row = 0; row < h; row++){
		for(col = 0; col < w; col++){
			let Cell = getImageCell(row,col);
			Cell[0] = truncateRgb(posterizeMapValue(Cell[0], x)); 
			Cell[1] = truncateRgb(posterizeMapValue(Cell[1], x)); 
			Cell[2] = truncateRgb(posterizeMapValue(Cell[2], x)); 
			setImageCell(row,col,Cell);
		}
	}
	renderImage(img_data);
}

//Negativa as cores da imagem
function negative(){
	let row, col;
	for(row = 0; row < h; row++){
		for(col = 0; col < w; col++){
			let Cell = getImageCell(row,col);
			Cell[0] = truncateRgb(255 - Cell[0]); 
			Cell[1] = truncateRgb(255 - Cell[1]); 
			Cell[2] = truncateRgb(255 - Cell[2]); 
			setImageCell(row,col,Cell);
		}
	}
	renderImage(img_data);
}

//Soma um brilho a imagem
function brightness(x){
	let row, col;

	for(row = 0; row < h; row++){
		for(col = 0; col < w; col++){
			let Cell = getImageCell(row,col);
			Cell[0] = truncateRgb(Cell[0] + x);
			Cell[1] = truncateRgb(Cell[1] + x);
			Cell[2] = truncateRgb(Cell[2] + x);
			setImageCell(row,col,Cell);
		}
	}
	renderImage(img_data);
}
//Aplica o threshold de acordo com uma porcentagem
function threshold(x){
	let row, col;
	let f = (c,x) => c < x? 0: 255;

	for(row = 0; row < h; row++){
		for(col = 0; col < w; col++){
			let Cell = getImageCell(row,col);
			Cell[0] = Cell[1] = Cell[2] = f((Cell[0] + Cell[1] + Cell[2])/3, x);
			setImageCell(row,col,Cell);
		}
	}
	renderImage(img_data);
}

function solarizationMap(color, threshold){
	if(color < threshold) return 255 - color;
	else return color;
}
//Aplica a função de solarização
function solarization(x){
	let row, col;
	let threshold = x*255;

	for(row = 0; row < h; row++){
		for(col = 0; col < w; col++){
			let Cell = getImageCell(row,col);
			Cell[0] = truncateRgb(solarizationMap(Cell[0],threshold));
			Cell[1] = truncateRgb(solarizationMap(Cell[1],threshold));
			Cell[2] = truncateRgb(solarizationMap(Cell[2],threshold));
			setImageCell(row,col,Cell);
		}
	}
	renderImage(img_data);
}

//Aplica contraste na imagem
function contrast(x){
	let row, col;
	let f = (259*(x + 255)) / (255*(259 - x));

	for(row = 0; row < h; row++){
		for(col = 0; col < w; col++){
			let Cell = getImageCell(row,col);
			Cell[0] = truncateRgb(f * (Cell[0] - 128) + 128);
			Cell[1] = truncateRgb(f * (Cell[1] - 128) + 128);
			Cell[2] = truncateRgb(f * (Cell[2] - 128) + 128);
			setImageCell(row,col,Cell);
		}
	}
	renderImage(img_data);
}
//Aplica a função dither 
function dither(darker){
	darker = darker == undefined?true:darker;
	let row, col;
	let f = (color) => color < 150 ? 0 : 255;

	if(darker)
		grayscale();

	for(row = 0; row < h; row++){
		for(col = 0; col < w; col++){
			let Cell = getImageCell(row,col);
			let newPixel = f(Cell[0]);

			let quant_error = Math.floor((Cell[0] - newPixel)/23);
			Cell[0] = newPixel;
			Cell[1] = Cell[0];
			Cell[2] = Cell[0];
			
			setImageCell(row,col,Cell);

			Cell = getImageCell(row + 1, col);
			Cell[0] = truncateRgb(Cell[0] + quant_error*7);
			setImageCell(row + 1, col,Cell);

			Cell = getImageCell(row + 1, col - 1);
			Cell[0] = truncateRgb(Cell[0] + quant_error*3);
			setImageCell(row + 1, col - 1,Cell);

			Cell = getImageCell(row, col + 1);
			Cell[0] = truncateRgb(Cell[0] + quant_error*5);
			setImageCell(row, col + 1,Cell);

			Cell = getImageCell(row + 1, col + 1);
			Cell[0] = truncateRgb(Cell[0] + quant_error*1);
			setImageCell(row + 1, col + 1,Cell);


		}
	}

	renderImage(img_data);
}

//Aplica o histograma adaptativo
function adaptativeHistogramEq(radius){
	let row, col;

	grayscale();

	let new_img;

	for(row = 0; row < h; row++){
		for(col = 0; col < w; col++){
			let Cell = getImageCell(row,col);
			let rank = 0;

			let arr = getArrayAround(row, col, radius, 0);

			for (let i = 0; i < arr.length; i++) rank += (arr[i] > Cell[0]? 1: 0);

			Cell[0] = Cell[1] = Cell[2] = truncateRgb(rank * 255 / arr.length);

			setImageCell(row,col,Cell, new_img);
		}
	}

	renderImage(img_data);
}

//Aplica o histograma 
function histogramEq(){
	let row, col;
	let scale, sum, i = 0;
	let hist = Array(256).fill(0);
	let cumulative = Array(256).fill(0);

	grayscale();

	for(row = 0; row < h; row++){
		for(col = 0; col < w; col++){
			let Cell = getImageCell(row,col);
			hist[Cell[0]]++;
		}
	}

	while (hist[i] != 0) i++;
	//Trata se a imagem só tiver 1 tom de cinza
	if(hist[i] == w*h){
		for(row = 0; row < h; row++){
			for(col = 0; col < w; col++){
				let Cell = getImageCell(row,col);
				Cell[0] = Cell[1] = Cell[2] = i;
				setImageCell(row,col,Cell);
			}
		}
	}

	scale = 255 / (w*h - hist[i]);;

	sum = 0;
	for (i = 0; i < hist.length; i++) {
		sum += hist[i];

		cumulative[i] = truncateRgb(Math.round(sum*scale));
	}

	//Aplica equalização
	for(row = 0; row < h; row++){
		for(col = 0; col < w; col++){
			let Cell = getImageCell(row,col);
			Cell[0] = Cell[1] = Cell[2] = cumulative[Cell[0]];
			setImageCell(row,col,Cell);
		}
	}

	renderImage(img_data);
}

//Aplica o filtro de blur
function simpleBlur(radius){
	if(typeof radius != "number") radius = 3;
	
	radius = Math.round(radius);
	let row, col, new_img;
	new_img = img_data;
	for(row = 0; row < h; row++){
		for(col = 0; col < w; col++){
			let Cell = getImageCell(row,col);
			let Avg = getAverageAround(row,col,radius);
			Cell[0] = truncateRgb(Avg[0]);
			Cell[1] = truncateRgb(Avg[1]);
			Cell[2] = truncateRgb(Avg[2]);
			setImageCell(row,col,Cell,new_img);
		}
	}

	img_data = new_img;
	renderImage(img_data);
}

//Aplica o filtro de sharpening
function simpleSharp(amount){
	amount = amount == undefined || amount == ""? 1: amount;

	let operator = [
		 0        ,-1*amount, 0        ,
		-1*amount, 9*amount,-1*amount,
		 0        ,-1*amount, 0        ]

	let imgResult = img_data;

	imgResult = convolution(imgResult.data,operator);

	img_data = imgResult;
	renderImage(img_data)


}

//Aplica a pixelização da imagem
function pixelate(radius){
	if(typeof radius != "number") radius = 3;
	
	radius = Math.round(radius);
	let row, col, aux1, aux2;
	
	for(row = 0; row < h; row+=radius){
		for(col = 0; col < w; col+=radius){
			let Avg = getAverageForward(row,col,radius);
			for(aux1 = 0; aux1 < radius; aux1++){
				for(aux2 = 0; aux2 < radius; aux2++){

					if(row+aux1 > h || col+aux2 > w) continue;
					let CellN = getImageCell(row+aux1,col+aux2);
					CellN[0] = truncateRgb(Avg[0]);
					CellN[1] = truncateRgb(Avg[1]);
					CellN[2] = truncateRgb(Avg[2]);
					setImageCell(row+aux1,col+aux2,CellN);

				}
			}
		}
	}
	renderImage(img_data);
}

//Converte a imagem para escala de cinza
function grayscale(){
	let row, col;
	for(row = 0; row < h; row++){
		for(col = 0; col < w; col++){
			let Cell = getImageCell(row,col);
			let Avg = Cell[0]*0.299 + Cell[1]*0.587 + Cell[2]*0.114;
			Cell[0] = truncateRgb(Avg);
			Cell[1] = truncateRgb(Avg);
			Cell[2] = truncateRgb(Avg);
			setImageCell(row,col,Cell);
		}
	}
	renderImage(img_data);
}

//Aplica gamma a imagem
function gamma(x){
	let row, col;
	let gammaCorrection = 1/x;
	for(row = 0; row < h; row++){
		for(col = 0; col < w; col++){
			let Cell = getImageCell(row,col);
			Cell[0] = truncateRgb(255 * Math.pow((Cell[0] / 255), gammaCorrection));
			Cell[1] = truncateRgb(255 * Math.pow((Cell[1] / 255), gammaCorrection));
			Cell[2] = truncateRgb(255 * Math.pow((Cell[2] / 255), gammaCorrection));
			setImageCell(row,col,Cell);
		}
	}
	renderImage(img_data);
}

//Faz a normalização de uma imagem
function normalize(){
	let row, col;
	for(row = 0; row < h; row++){
		for(col = 0; col < w; col++){
			let Cell = getImageCell(row,col);
			let Sum = Cell[0] + Cell[1] + Cell[2];

			Cell[0] = truncateRgb(Cell[0]*255/Sum);
			Cell[1] = truncateRgb(Cell[1]*255/Sum);
			Cell[2] = truncateRgb(Cell[2]*255/Sum);
			setImageCell(row,col,Cell);
		}
	}
	renderImage(img_data);
}

//Aplica o filtro prewitt
function prewitt(vertical, horizontal, amount){

	amount = amount == undefined || amount == ""? 1: amount;

	let operatorH = [
	1*amount , 1*amount , 1*amount,
	0         , 0         , 0        ,
	-1*amount, -1*amount, -1*amount]

	let operatorV = [
	-1*amount, 0, 1*amount,
	-1*amount, 0, 1*amount,
	-1*amount, 0, 1*amount]

	let imgResult = img_data;

	if( vertical && !horizontal)
		imgResult = convolution(imgResult.data,operatorV);
	else if( horizontal && !vertical)
		imgResult = convolution(imgResult.data,operatorH);
	else if( vertical && horizontal){
		let imgA1 = img_data;		
		let imgA2 = img_data;		

		imgA1 = convolution(imgA1.data,operatorV);
		imgA2 = convolution(imgA2.data,operatorH);

		for (let i = 0; i < imgResult.data.length; i++) {
			imgResult.data[i] = Math.sqrt(imgA1.data[i]*imgA1.data[i] + imgA2.data[i]*imgA2.data[i]);
		}
	}

	img_data = imgResult;
	renderImage(img_data)

}

//Aplica o filtro sobel
function sobel(vertical, horizontal, amount){

	amount = amount == undefined || amount == ""? 1: amount;

	let operatorH = [ 
		1*amount , 2*amount , 1*amount ,
		0        , 0        , 0        ,
		-1*amount, -2*amount, -1*amount ]

	let operatorV = [ 
		1*amount, 0, -1*amount,
		2*amount, 0, -2*amount,
		1*amount, 0, -1*amount ]

	let imgResult = img_data;

	if( vertical && !horizontal)
		imgResult = convolution(imgResult.data,operatorV);
	else if( horizontal && !vertical)
		imgResult = convolution(imgResult.data,operatorH);
	else if( vertical && horizontal){
		let imgA1 = img_data;		
		let imgA2 = img_data;		

		imgA1 = convolution(imgA1.data,operatorV);
		imgA2 = convolution(imgA2.data,operatorH);

		for (let i = 0; i < imgResult.data.length; i++) {
			imgResult.data[i] = Math.sqrt(imgA1.data[i]*imgA1.data[i] + imgA2.data[i]*imgA2.data[i]);
		}
	}

	img_data = imgResult;
	renderImage(img_data)

}

//Aplica o filtro de gauss
function gauss(amount){

	amount = amount == undefined || amount == ""? 1: amount;

	let operator = [
		1*amount, 2*amount, 1*amount,
		2*amount, 4*amount, 2*amount,
		1*amount, 2*amount, 1*amount]


	let imgResult = img_data;

	imgResult = convolution(imgResult.data,operator);

	img_data = imgResult;
	renderImage(img_data)

}

//Aplica o borrão de movimento em 45 graus
function motion(radius, orientation){

	radius = radius == undefined || radius == ""? 1: eval(radius);

	let d = radius*2 + 1
	let operator = new Array(d*d).fill(0);

	//Gera matriz 0°
	if(orientation == "0"){
		for(let i = 0; i < d; i++){
			operator[radius*d + i] = 1/d;
		}
	}
	//Gera matriz 45°
	else if(orientation == "45"){
		for(let i = 0; i < d; i++){
			operator[i*d + d-i] = 1/d;
		}
	}
	//Gera matriz 90°
	else if(orientation == "90"){		for(let i = 0; i < d; i++){
			operator[(i*d) + radius] = 1/d;
		}
	}
	//Gera matriz 135°
	else if(orientation == "135"){
		for(let i = 0; i < d; i++){
			operator[i + i*d] = 1/d;
		}
	}

	console.log(operator);

	let imgResult = img_data;

	imgResult = convolution(imgResult.data,operator);

	img_data = imgResult;
	renderImage(img_data)

}

//Função para calcular a logaritma gaussiana
function log_funct(x,y,sigma){
	let c1 = ((x*x + y*y)/(2*sigma*sigma));
	return (-(1/Math.PI*sigma*sigma*sigma*sigma))*(1-c1)*(Math.exp(-c1));
}
//Função para aplicar a logaritma gaussiana
function log(radius, sigma){
	radius = radius == undefined || radius == ""? 1: Math.round(radius);
	sigma = sigma == undefined || sigma == ""? 1: sigma;

	let d = 1 + radius*2;

	let operator = new Array(d*d);
	let counter = 0;
	for (let i = -radius; i <= radius; i++) {
		for (let j = -radius; j <= radius; j++) {
			operator[counter] = log_funct(i,j,sigma);
			counter++;
		}
	}

	let imgResult = img_data;

	imgResult = convolution(imgResult.data,operator);

	img_data = imgResult;
	renderImage(img_data)
}

//Aplica a função laplaciana
function laplace(){

	let operator = [
		 0, -1,  0,
		-1,  4, -1,
		 0, -1,  0]


	let imgResult = img_data;

	imgResult = convolution(imgResult.data,operator);

	img_data = imgResult;
	renderImage(img_data)

}

//Aplica a função de high boost
function hb(constant){

	let operator = [
		 0       ,   -constant    ,  0       ,
		-constant,  4*constant + 1, -constant,
		 0       ,   -constant    ,  0       ]


	let imgResult = img_data;

	imgResult = convolution(imgResult.data,operator);

	img_data = imgResult;
	renderImage(img_data)

}

/*
	MANAGE FILE INPUT
*/
function handleImage(e){
	try{
		var reader = new FileReader();
		reader.onload = function(event){
			img = new Image();
			img.onload = function(){
				img_history_index = 0;
				img_history = [];
				renderImage(img);
				canvas.style.display = "block";
				loadBotoes();
				showBtns();
			};
			img.src = event.target.result;
		}
		reader.readAsDataURL(fi.files[0]);
	}
	catch(err){
		console.log("Erro na leitura da imagem");
		console.log(err);
	}
}

function uploadFile(){
	fi.click();
}

/*
	Estilo
*/
function updateHeight(){
	var size = window.innerHeight - document.querySelector("#input").clientHeight - 40;
	btnsDiv.style.minHeight = size+"px";
	prepDiv.style.minHeight = size+"px";
}