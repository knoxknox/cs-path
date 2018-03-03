%start Program

%%

Program
    : Expression
        { console.log($1, '=', eval($1)); }
    ;

/*
 * by Anton Byrna with Dmitry Soshnikov
 *
 * Expression is a recursive rule that is represented as [OPERATOR, OPERAND, OPERAND, ...].
 * For example: [+, 1, 2] or [*, 1, 4, 5].
 * 
 * LSB - [, OPERATOR - one of - or +, COMMA, RSB - ] are tokens which are defined in "lexer.l" file.
 *
 * Every case of a production may have associated actions to be executed when the rule is match.
 * These actions are just a casual JavaScript code which we apply in order to process found rules.
 * In the code of an action we can refer the values of the matched cases of the rule via the
 * $<name_of_a_case> construction. In $$ variable we store the result of the action.
 */
Expression
    : LSB OPERATOR COMMA Arguments RSB
        { $$ = $Arguments.join($OPERATOR); }
    ;

/**
 * "1, 2" in our [+, 1, 2] example from above corresponds to the "Arguments" rule (see below). This rule
 * is also recursive but it has two case for matching. If the first rule doesn't match then the second one
 * is tried to match. When parser meets "1, 2" it matches the expression bu the first case of the
 * "Arguments" rule. Since "Arguments" rule is recursive, then "1" is matched as "Argument" —
 * i.e the second case of the "Arguments" production and so on.
 */
Arguments
    : Arguments COMMA Argument
        { $Arguments.push($Argument); $$ = $Arguments; }
    | Argument
        { $$ = [$Argument] }
    ;

Argument
    : Literal
    | Expression
    ;

Literal
    : Number
    ;

Number
    : INT
        { $$ = Number($1) }
    ;
