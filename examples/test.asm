MOVI S2, $5
MOV S1, S2

loop:
 RCALL decs1 ; Hello, I am a comment
 JNZ loop

JP end

decs1:
 RCALL incs2
 DEC S1
 RET

incs2:
 INC S2
 RET

end: JP end ; An endless loop
