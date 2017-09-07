const nodehun = require ( 'nodehun' );

const fs      = require ( 'fs' );


const affbuff = fs.readFileSync ( './spellcheck/dic/he.aff' );
const dicbuff = fs.readFileSync ( './spellcheck/dic/he.dic' );


const dict = new nodehun ( affbuff, dicbuff );

module.exports = { dict };