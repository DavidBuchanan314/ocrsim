# ocrsim
An assembler/disassembler/simulator for the microcontroller used in OCR A2 Electronics.

The A2 course specification does not define any of the binary opcodes, so I made them up as follows.

# Specification
```
8-bit registers:
	program counter (PC)
	stack pointer (SP)
	general purpose registers (S0...S7)

8-bit IO ports:
	input (I)
	output (Q)
	analogue (ADC) 

The system has a 256 byte memory and a clock speed of 1 MHz.
 
Instruction Set:
(Each instruction is encoded as two bytes)

MOVI Sd,n	-	00000DDD NNNNNNNN
	Copy the byte n into register Sd
	
MOV Sd,Ss	-	10000DDD xxxxxSSS
	Copy the byte from As to Sd
	
ADD Sd,Ss	-	01000DDD xxxxxSSS
	Add the byte in Ss to the byte in Sd and store the result in Sd 

SUB Sd,Ss	-	11000DDD xxxxxSSS
	Subtract the byte in Ss from the byte in Sd and store the result in Sd

AND Sd,Ss	-	00100DDD xxxxxSSS
	Logical AND the byte in Ss with the byte in Sd and store the result in Sd

EOR Sd,Ss	-	10100DDD xxxxxSSS
	Logical EOR the byte in Ss with the byte in Sd and store the result in Sd

INC Sd  	-	11000DDD xxxxxxxx
	Add 1 to Sd

DEC Sd  	-	11100DDD xxxxxxxx
	Subtract 1 from Sd

IN Sd,I 	-	00010DDD xxxxxxxx
	Copy the byte at the input port into Sd

OUT Q,Ss  -	10010xxx xxxxxSSS
	Copy the byte in Ss to the output port

JP e    	- 01010xxx EEEEEEEE
	Jump to label e 

JZ e     	- 11010xxx EEEEEEEE
	Jump to label e if the result of the last ADD, SUB, AND, EOR, INC, DEC, SHL or 
	SHR was zero

JNZ e    	- 00110xxx EEEEEEEE
	Jump to label e if the result of the last ADD, SUB, AND, EOR, INC, DEC SHL or 
	SHR was not zero 

RCALL s  	- 10110xxx SSSSSSSS
	Push the program counter onto the stack to store the return address and then
	jump to label s

RET     	-	01110xxx xxxxxxxx
	Pop the program counter from the stack to return to the place the subroutine was 
	called from

SHL Sd  	-	11110DDD xxxxxxxx
	Shift the byte in Sd one bit left putting a 0 into the lsb 

SHR Sd   	-	00001DDD xxxxxxxx
	Shift the byte in Sd one bit right putting a 0 into the msb

Extra instructions:

TAB Sd, n	-	10001DDD NNNNNNNN
	Based on the "readtable" subroutine. Sets Sd to the value pointed to by n + S7
	
ADC Sd  	- 01001DDD xxxxxxxx
	Based on the "readadc" subroutine. Sets Sd to the value of the analogue input.
```
