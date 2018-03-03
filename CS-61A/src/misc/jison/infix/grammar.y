%start Program

%%

Program
    : Expression
        { console.log($Expression); }
    ;

Expression
    : Expression OPERATOR Literal
        { $$ = [$OPERATOR, $Expression, $Literal] }
    | Literal
    ;

Literal
    : Number
    ;

Number
    : INT { $$ = Number($1) }
    ;