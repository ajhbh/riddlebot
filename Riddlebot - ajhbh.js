const request = require('request');

const urlroot = 'https://api.noopschallenge.com';
var urlcurrent = '/riddlebot/start';

// wrap a request in an promise so can run synchronously in order cos' javascript
function getRequest(url) {
    return new Promise((resolve, reject) => {
        request.get(url, (error, response, body) => {
            if (error) reject(error);
            if (response.statusCode != 200) {
                reject('Invalid status code <' + response.statusCode + '>');
            }
            var jsonRespnse = JSON.parse(body);
            resolve(jsonRespnse);
        });
    });
}

function postRequest(url, answer) {
    return new Promise((resolve, reject) => {
        var string = {
            "answer": answer
        };
        request.post(url, {
            json: string
        }, function (error, response, body) {
            if (error) reject(error);
            if (response.statusCode != 200) {
                reject('Invalid status code <' + response.statusCode + '>');
            }
            //var jsonRespnse = JSON.parse(body);
            resolve(body);
        });
    });
}
function postLoginRequest(url, answer) {
    return new Promise((resolve, reject) => {
        var string = {
            "login": answer
        };
        request.post(url, {
            json: string
        }, function (error, response, body) {
            if (error) reject(error);
            if (response.statusCode != 200) {
                reject('Invalid status code <' + response.statusCode + '>');
            }
            //var jsonRespnse = JSON.parse(body);
            resolve(body);
        });
    });
}

function processResponse(response) {
    return new Promise((resolve, reject) => {
        if (response.riddlePath != undefined && response.exampleResponse == undefined) {
            urlcurrent = response.riddlePath;
            resolve(null);
        } else if (response.nextRiddlePath != undefined && response.exampleResponse == undefined) {
            urlcurrent = response.nextRiddlePath;
            resolve(null);
        } else if (response.exampleResponse != undefined && response.exampleResponse.login != undefined) {
            resolve("ajhbh-login");
        } else if (response.result != undefined && response.result == "completed") {
            resolve("interview complete");
        }
        var output;
        if (response.riddleType == "reverse") {
            output = reverseText(response.riddleText);
        }
        else if (response.riddleType == "rot13") {
            var rotatePlaces = [13];
            output = rotateAlphabet(response.riddleText, rotatePlaces);
        } 
        else if (response.riddleType == "caesar" && response.riddleKey != undefined) {
            var rotatePlaces = [response.riddleKey];
            output = rotateAlphabet(response.riddleText, rotatePlaces);
        }
        else if (response.riddleType == "caesar") {
            for (var i = 0; i < 26; i++) {
                var possible = rotateAlphabet(response.riddleText, [i]);
                if (possible.includes("NOOPS")) {
                    output = possible;
                    break;
                }
            }
        }
        else if (response.riddleType == "vigenere" && response.riddleKey != undefined) {
            output = rotateAlphabet(response.riddleText, response.riddleKey);
        }
        else if (response.riddleType == "vigenere") {
            var result = crackVigenereNoKey(response.riddleText, 4);
            console.log(result);
            output = reverseText(result);
        }
        else {
            output = "Error: Unknown Question";
        }
        resolve(output);
    });
}

function crackVigenereNoKey(string, keyLength) {
    var stringStrip = string;
    stringStrip = stringStrip.replace(/\s/g, '').toUpperCase(); // remove spaces
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    var resultCount = {};
    for (let j = 0; j < 26; j++) {
        var stringTest = rotateAlphabet(stringStrip, [j]);
        var splitStrings = [];
        for (let i = 0; i < keyLength; i++) {
            splitStrings.push('');
        }
        for (let i = 0; i < stringTest.length; i++) {
            var offset = (i + keyLength) % keyLength;
            splitStrings[offset] = splitStrings[offset] + stringTest[i];
        }
        var output = {};
        for (let i = 0; i < splitStrings.length; i++) {
            var str = splitStrings[i];
            output[i] = fequencyScore(str);
        }
        resultCount[j] = output;
        var printout = alphabet[j].toString() + ' ' + JSON.stringify(output);
        console.log(printout);
    }
    var bestLetter = null;
    for (let key of Object.keys(resultCount)) {
        var letterObj = resultCount[key];
        var letterScore = 0; 
        for (let score of Object.values(letterObj)) {
            letterScore += score;
        }
        if (bestLetter == null) {
            bestLetter = {'letter': key, 'score': letterScore};
        } else if (bestLetter['score'] < letterScore) {
            bestLetter['letter'] = key;
            bestLetter['score'] = letterScore;
        }
    }
    console.log('BestLetter:', JSON.stringify(bestLetter));
    var useKey = [];
    for (let i = 0; i < keyLength; i++) {
        useKey.push(bestLetter['letter']) ;
    }
    var resultString = rotateAlphabet(string, useKey);
    return resultString;
}

function fequencyScore(string) {
    string = string.replace(/\s/g, '').toUpperCase();
    const ETAOIN = 'ETAOINSHRDLCUMWFGYPBVKJXQZ';
    //const mostfrequent = 'ETAOIN';
    //const leastfrequent = 'VKJXQZ';
    const mostfrequent = 'ETAOIN';
    const mostfrequentsecond = 'SHR';
    const leastfrequent = 'VKJXQZ';
    const leastfrequentsecond = 'YPB';
    var letterCount = {
        'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0, 'F': 0,
        'G': 0, 'H': 0, 'I': 0, 'J': 0, 'K': 0, 'L': 0,
        'M': 0, 'N': 0, 'O': 0, 'P': 0, 'Q': 0, 'R': 0,
        'S': 0, 'T': 0, 'U': 0, 'V': 0, 'W': 0, 'X': 0,
        'Y': 0, 'Z': 0
    };
    for (let letter of string) {
        letterCount[letter] += 1;
    }
    var sortedCount = Object.entries(letterCount).sort(([,a],[,b]) => b-a);
    //console.log(sortedCount);

    var score = 0;
    var limit = 6; 
    for (let i = 0; i < limit; i++) {
        var sortedLetterMost = sortedCount[i][0];
        if (mostfrequent.includes(sortedLetterMost)) {
            score +=1.0;
            if (sortedCount[i][1] == sortedCount[i + 1][1]) {
                limit++; //if tied 6th place then extend loop to include all 6th place letters.
            }
        } else if (mostfrequentsecond.includes(sortedLetterMost)) {
            //score +=0.5;
        }
    }
    limit = 6; 
    for (let i = 0; i < limit; i++) {
        var sortedLetterLeast = sortedCount[sortedCount.length - 1 - i][0];
        if (leastfrequent.includes(sortedLetterLeast)) {
            score +=1.0;
            if (sortedCount[sortedCount.length - 1 - i][1] == sortedCount[sortedCount.length - 2 - i][1]) {
                limit++; //if tied 6th place then extend loop to include all 6th place letters.
            }
        } else if (leastfrequentsecond.includes(sortedLetterLeast)) {
            //score +=0.5;
        }
    }
    //console.log(score);
    return score;
}

function reverseText(question) { 
        var splitstring = question.split("");
        var reverseArray = splitstring.reverse();
        var output = reverseArray.join("");
        console.log("reverseText Answer:", output);
        return output;
}

function rotateAlphabet(question, rotatePlaces) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var output = "";
    var numspaces = 0;
    for (var i = 0; i < question.length; i++) {
        var letter = question[i];
        var index = alphabet.indexOf(letter);
        if (index == -1) {
            if (letter == " ") {
                numspaces += 1;
                output += " ";
            } else {
                throw "Letter not in Alphabet";
            }
        } else {
            var offset = (i-numspaces+rotatePlaces.length) % rotatePlaces.length;
            //var rotateplacesreverse = (26 - rotatePlaces[offset]) % 26; //bug in the noopbot API says rotates forwards in message but after experimenting seems to rotate backwards hence this step
            var newindex = (index - rotatePlaces[offset] + alphabet.length) % alphabet.length; 
            output += alphabet[newindex];
        }
    }
    //console.log("rotateAlphabet Answer, keys "+rotatePlaces+":", output);
    return output;
}

// all you need to do is use async functions and await for functions returning promises
async function main() {
    while (true) {
        var urlrequest = urlroot + urlcurrent;
        console.log(urlrequest);

        try {
            var response = await getRequest(urlrequest)
            console.log(JSON.stringify(response));

            var answerString = await processResponse(response);
            if (answerString == null) {
                continue
            } 
            console.log(JSON.stringify(answerString));
            if (answerString == "ajhbh-login"){
                response = await postLoginRequest(urlrequest, "ajhbh");
            } else {
                response = await postRequest(urlrequest, answerString);
            }
            console.log(JSON.stringify(response));
            var finalanswerString = await processResponse(response)
            if (finalanswerString == "interview complete" || finalanswerString == "Error: Unknown Question") {
                break;
            }

        } catch (error) {
            console.error('ERROR:');
            console.error(error);
            break;
        }
    }
}

main();
