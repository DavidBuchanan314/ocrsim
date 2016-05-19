"use strict";

var assembleButton = document.getElementById("assembleButton");
var stepButton = document.getElementById("stepButton");
var asmTextarea = document.getElementById("asmSource");
var memTextarea = document.getElementById("memory");
var regTextarea = document.getElementById("registers");

var memory;
var isInst;
var PC, SP, S, I, Q, ADC;
var ZF = false; // zero flag

var opMask = 0b11111000;
var error;
var lineNum;

var uz = function(sd) { // update zero flag
	ZF = S[sd] == 0;
}

var opcodes = {// opcode, [operand types], function // Sd = "d", Ss = "s", byte = "b", jump offset = "o"
	"movi":  [0b00000000, ["d", "b"], function(sd, ss, b){ S[sd] = b }],
	"mov":   [0b10000000, ["d", "s"], function(sd, ss, b){ S[sd] = S[ss] }],
	"add":   [0b01000000, ["d", "s"], function(sd, ss, b){ S[sd] += S[ss]; uz(sd) }],
	"sub":   [0b11000000, ["d", "s"], function(sd, ss, b){ S[sd] -= S[ss]; uz(sd) }],
	"and":   [0b00100000, ["d", "s"], function(sd, ss, b){ S[sd] &= S[ss]; uz(sd) }],
	"eor":   [0b10100000, ["d", "s"], function(sd, ss, b){ S[sd] ^= S[ss]; uz(sd) }],
	"inc":   [0b01100000, ["d"],      function(sd, ss, b){ S[sd]++; uz(sd) }],
	"dec":   [0b11100000, ["d"],      function(sd, ss, b){ S[sd]--; uz(sd) }],
	"in":    [0b00010000, ["d", "I"], function(sd, ss, b){ S[sd] = I[0]; uz(sd) }],
	"out":   [0b10010000, ["Q", "s"], function(sd, ss, b){ Q[0] = S[ss] }],
	"jp":    [0b01010000, ["o"],      function(sd, ss, b){ PC[0] += b }],
	"jz":    [0b11010000, ["o"],      function(sd, ss, b){ if (ZF) PC[0] += b }],
	"jnz":   [0b00110000, ["o"],      function(sd, ss, b){ if (!ZF) PC[0] += b }],
	"rcall": [0b10110000, ["o"],      function(sd, ss, b){ SP[0]--; memory[SP[0]] = PC[0]; PC[0] += b }],
	"ret":   [0b01110000, [],         function(sd, ss, b){ PC[0] = memory[SP[0]++] }],
	"shl":   [0b11110000, ["d"],      function(sd, ss, b){ S[sd] >>= 1; uz(sd) }],
	"shr":   [0b00001000, ["d"],      function(sd, ss, b){ S[sd] <<= 1; uz(sd) }]
};

var instructions = new Array(0x100); // This object maps binary opcodes back into their mnemonic

for (var op in opcodes) {
	var data = opcodes[op];
	instructions[data[0]] = [op.toUpperCase(), data[1], data[2]];
}

var isRegister = function(str) {
	return /^[sS][0-7]$/.test(str);
}

var getReg = function(str) {
	if (!isRegister(str)) error += "Line "+(lineNum+1)+": Operand is not a register!\n";
	return parseInt(str.slice(1));
}

var hexStr = function(val) {
	var output = val.toString(16);
	if (output.length == 1) output = "0" + output;
	return output;
}

var binStr = function(val) {
	var output = val.toString(2);
	output = "00000000".slice(output.length) + output;
	return output;
}

var getValue = function(word) {
	if (isRegister(word)) error += "Line "+(lineNum+1)+": Unexpected register!\n";
	var num = word.slice(1);
	if (word[0] == "%") {
		return parseInt(num, 2);
	} else if (word[0] == "$") {
		return parseInt(num, 16);
	} else {
		return parseInt(word);
	}
}

var assemble = function() {
	memory = new Uint8Array(0x100);
	PC = new Uint8Array(1);
	SP = new Uint8Array(1);
	S = new Uint8Array(8);
	I = new Uint8Array(1);
	Q = new Uint8Array(1);
	ADC = new Uint8Array(1);
	isInst = new Array(0x100);
	error = "";
	var labels = {};
	var labelRefs = [];
	var memPtr = 0;
	var lines = asmTextarea.value.split("\n");
	for (lineNum = 0; lineNum < lines.length; lineNum++) {
		var line = lines[lineNum].split(";")[0].split(":"); // strip comments
		
		if (line.length == 2) {
			labels[line[0]] = memPtr;
			line = line[1];
		} else {
			line = line[0];
		}
		
		var words = line.match(/[a-zA-Z0-9%$_-]+/g); // split into words
		
		if (words == null)
			continue;
		
		var instr = words.shift().toLowerCase();
			
		var data = opcodes[instr];
		
		if (data == undefined) {
			error += "Undefined instruction \""+instr+"\" on line "+(lineNum+1)+"\n";
			continue;
		}
		
		memory[memPtr] = data[0];
		memory[memPtr+1]  = 0;
		
		for (var operand of data[1]) {
			switch (operand) {
			case "b":
				var tmp = getValue(words.shift());
				memory[memPtr+1] = tmp;
				break;
			case "d":
				memory[memPtr] |= getReg(words.shift());
				break;
			case "s":
				memory[memPtr+1] |= getReg(words.shift());
				break;
			case "o":
				var labelTxt = words.shift();
				labelRefs.push([labelTxt, memPtr, lineNum]);
				break;
			default: // Should only be for I or Q
				words.shift();
			}
		}
		
		isInst[memPtr] = true;
		memPtr += 2;
		
	}
	
	for (var ref of labelRefs) {
		var destAddr = labels[ref[0]];
		if (destAddr == undefined) {
			error += "Undefined label \""+ref[0]+"\" on line "+(ref[2]+1)+"\n";
			continue;
		}
		memory[ref[1]+1] = destAddr - ref[1] - 2;
	}
	
	if (error) {
		memTextarea.value = error;
	} else {
		dumpMem();
	}
}

var disas = function(index) {
	var op = memory[index] & opMask;
	var data = instructions[op];
	
	var output = data[0] + "      ".slice(data[0].length);
	var operandArr = [];
	
	for (var optype of data[1]) {
		switch(optype) {
		case "b":
			operandArr.push("$" + hexStr(memory[index+1]) );
			break;
		case "d":
			operandArr.push("S" + (memory[index] & 0b111) );
			break;
		case "s":
			operandArr.push("S" + (memory[index+1] & 0b111) );
			break;
		case "o":
			operandArr.push("$" + hexStr(  (memory[index+1]+index+2) % 0x100  ) );
			break;
		case "Q":
			operandArr.push("Q");
			break;
		case "I":
			operandArr.push("I");
			break;
		}
	}
	
	output += operandArr.join(", ");
	
	return output;
}

var doStep = function() {
	var op = memory[PC[0]] & opMask;
	var b = memory[PC[0]+1];
	var sd = memory[PC[0]] & 0b111;
	var ss = b & 0b111;
	PC[0] += 2;
	instructions[op][2](sd, ss, b);
	dumpMem();
}

var dumpReg = function(val) {
	return " = %"+binStr(val)+" = $"+hexStr(val)+" = "+val+"\n"
}

var dumpMem = function() {
	var output = " Address:  Data:     Disassembly:\n";
	for (var i=0; i<memory.length; i+= 2) {
	
		if (i == PC[0]) {
			output += "PC -> ";
		} else if (i == SP[0]) {
			output += "SP -> ";
		} else if (i == SP[0]-1) { // ">>" points to the byte on the left
			output += "SP >> ";
		} else {
			output += "      ";
		}
		
		output += hexStr(i) + ":  " + hexStr(memory[i]) + " " + hexStr(memory[i+1]);
		if (isInst[i]) {
			output += "  ;  " + disas(i);
		}
		output += "\n";
	}
	memTextarea.value = output;
	
	output = "";
	
	output += "PC" + dumpReg(PC[0]);
	output += "SP" + dumpReg(SP[0]);
	output += "\n";
	
	for (var r=0; r<8; r++) {
		output += "S" + r + dumpReg(S[r]);
	}
	
	output += "\nI " + dumpReg(I[0]);
	output += "Q " + dumpReg(Q[0]);
	output += "AD" + dumpReg(ADC[0]);
	
	regTextarea.value = output;
}

assembleButton.onclick = assemble;
stepButton.onclick = doStep;
memTextarea.value = "";
regTextarea.value = "";
