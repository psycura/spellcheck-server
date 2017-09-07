const express     = require ( 'express' );
const cors        = require ( 'cors' );
const app         = express ();
const bodyParser  = require ( 'body-parser' );
const serveStatic = require ( 'serve-static' );

const { indexOf, cloneDeep, flatMap, words, forEach } = require ( 'lodash' );

const { dict } = require ( './spellcheck/spellcheck' );

const whitelist   = [
    'https://school-news-e08b9.firebaseapp.com',
    'http://localhost:3000/',
    'http://localhost:3000/editor',
    'http://localhost',
    'http://eton4u.dev.valigar.co.il',
    undefined
];
const corsOptions = {
    origin: function ( origin, callback ) {
        console.log ( '>>', origin );
        if ( whitelist.indexOf ( origin ) !== -1 ) {
            callback ( null, true )
        } else {
            callback ( new Error ( 'Not allowed by CORS' ) )
        }
    }
};

// app.use ( cors ( corsOptions ) );
app.use ( serveStatic ( '../public' ) );
app.use ( bodyParser.urlencoded ( { extended: true } ) );
app.use ( bodyParser.json ( { limit: '50mb' } ) );

app.get ( '/api', function ( req, res ) {
    res.send ( 'Ping' )
} );

app.get ( '/api/test', function ( req, res ) {
    res.send ( 'Test!' )
} );

// app.post ( '/api/pdf', ( req, res ) => {
//
//     wkhtmltopdf ( req.body.page, {
//         dpi          : '300',
//         'page-width' : '270',
//         'page-height': '370',
//         output       : '../public/pdf/' + req.body.name + '.pdf',
//         // output : '../dist/pdf/' + req.body.name +'.pdf',
//         T            : '14',
//         B            : '14',
//         L            : '11',
//         R            : '11',
//
//         'enable-javascript': true,
//         // 'javascript-delay': 5000,
//         // 'no-stop-slow-scripts': true,
//         // 'debug-javascript': true
//
//     }, function ( err ) {
//         if ( err === null ) {
//             res.send ( JSON.stringify ( {
//                 result: 'success'
//             } ) );
//         }
//         else {
//             throw new Error ( err );
//         }
//     } ).on ( 'error', function ( err ) {
//         res.send ( JSON.stringify ( {
//             result     : 'error',
//             description: err
//         } ) );
//     } );
//
// } );
// endregion

app.post ( '/api/spellcheck', ( req, res ) => {
    // console.log(req);
    const textArray = req.body.words;
    let errorsArray = [];
    
    const check = ( word ) => {
        return new Promise ( ( resolve, reject ) => {
            dict.isCorrect ( word, ( err, correct ) => {
                console.log ( '' ); // do not delete
                resolve ( { word, correct } );
            } );
        } )
    };
    
    const loop = ( textArray ) => {
        return textArray.reduce ( ( p, item ) => {
            return p.then ( ( result ) => {
                return check ( item, result )
                    .then ( ( data ) => {
                        if ( !data.correct && data.word !== 'br' ) {
                            if ( indexOf ( errorsArray, data.word ) < 0 ) {
                                errorsArray.push ( data.word );
                            }
                        }
                    } );
            } )
        }, Promise.resolve ( textArray ) )
            .then ( () => {
                res.send ( errorsArray );
            } );
    };
    
    loop ( textArray );
} );

app.post ( '/api/spellcheck-page', ( req, res ) => {
    
    const currentPage = req.body.page;
    let counter       = 0;
    
    setCounter ( currentPage );
    getWarnings ( currentPage );
    
    function setCounter ( page ) {
        forEach ( flatMap ( page.sections ), ( section ) => {
            if ( section && section.order > 1 ) {
                forEach ( section.blocks, ( block ) => {
                    incCounter ( block );
                } )
            }
        } );
    }
    
    function incCounter ( block ) {
        if ( block.type === 'blocks' ) {
            forEach ( flatMap ( block.content, ( innerBlock ) => {
                incCounter ( innerBlock )
            } ) )
        } else {
            counter++
        }
    }
    
    async function getWarnings ( page ) {
        forEach ( flatMap ( page.sections ), async ( section ) => {
            if ( section && section.order > 1 ) {
                forEach ( section.blocks, async ( block ) => {
                    await checkBlockWarnings ( block );
                } )
            }
        } );
    }
    
    async function checkBlockWarnings ( block ) {
        if ( block.type === 'blocks' ) {
            forEach ( flatMap ( block.content, async ( innerBlock ) => {
                await checkBlockWarnings ( innerBlock )
            } ) )
        } else {
            switch ( block.type ) {
                case 'text':
                    await spellCheck ( block );
                    counter--;
                    break;
                default:
                    counter--;
                    break;
            }
            if ( counter === 0 ) {
                res.send ( currentPage )
            }
        }
        
    }
    
    async function spellCheck ( block ) {
        const textArray = words ( block.value );
        let errorsArray = [];
        
        const check = ( word ) => {
            return new Promise ( ( resolve, reject ) => {
                dict.isCorrect ( word, ( err, correct ) => {
                    console.log ( '' ); // do not delete
                    resolve ( { word, correct } );
                } );
            } )
        };
        
        const loop = ( textArray ) => {
            return textArray.reduce ( ( p, item ) => {
                return p.then ( ( result ) => {
                    return check ( item, result )
                        .then ( ( data ) => {
                            if ( !data.correct && data.word !== 'br' ) {
                                if ( indexOf ( errorsArray, data.word ) < 0 ) {
                                    errorsArray.push ( data.word );
                                }
                            }
                        } );
                } )
            }, Promise.resolve ( textArray ) )
                .then ( () => {
                    block.errors = cloneDeep ( textArray );
                } );
        };
        
        await loop ( textArray )
    }
    
} );

app.listen ( 3080, function () {
    console.log ( 'Example app listening on port 3080!' )
} );