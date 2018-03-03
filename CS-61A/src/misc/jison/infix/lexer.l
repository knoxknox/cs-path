%%

\s+                   /* skip whitespace */
[0-9]+                return 'INT';
[\+,\-]               return 'OPERATOR';