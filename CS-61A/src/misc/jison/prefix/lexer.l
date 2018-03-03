%%

\s+                   /* skip whitespace */
[0-9]+                return 'INT';
","                   return 'COMMA';
"["                   return 'LSB';
"]"                   return 'RSB';
[\+,\-]               return 'OPERATOR';